-- ============================================================================
-- COMPLETE SIGNUP FIX SCRIPT
-- ============================================================================
-- This script will fix all common signup issues in one go
-- Run this entire file in your Supabase SQL Editor
-- ============================================================================

-- STEP 1: Drop and recreate triggers with better error handling
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created ON profiles;

-- Create profile creation trigger with enhanced error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_email TEXT;
  is_admin_user BOOLEAN;
BEGIN
  BEGIN
    -- Get admin email from user metadata
    admin_email := NEW.raw_user_meta_data->>'admin_email';

    -- Check if this user is the admin
    is_admin_user := (admin_email IS NOT NULL AND NEW.email = admin_email);

    -- Insert profile
    INSERT INTO public.profiles (id, email, is_admin)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(is_admin_user, FALSE)
    );

    RAISE NOTICE 'Profile created successfully for user: % (email: %)', NEW.id, NEW.email;

  EXCEPTION
    WHEN unique_violation THEN
      RAISE WARNING 'Profile already exists for user: %', NEW.id;
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating profile for user %: % (SQLSTATE: %)',
        NEW.email, SQLERRM, SQLSTATE;
      -- Don't fail the auth.users insert
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

RAISE NOTICE '✓ Profile creation trigger installed';

-- Create assistant assignment trigger with enhanced error handling
CREATE OR REPLACE FUNCTION public.auto_assign_assistant()
RETURNS TRIGGER AS $$
DECLARE
  random_assistant_id UUID;
  assistant_count INT;
BEGIN
  BEGIN
    -- First check if assistants exist
    SELECT COUNT(*) INTO assistant_count
    FROM assistants
    WHERE active = TRUE
      AND available_for_random_assignment = TRUE;

    IF assistant_count = 0 THEN
      RAISE WARNING 'No active assistants available for random assignment';
      RETURN NEW;
    END IF;

    -- Get a random active assistant
    SELECT id INTO random_assistant_id
    FROM assistants
    WHERE active = TRUE
      AND available_for_random_assignment = TRUE
    ORDER BY RANDOM()
    LIMIT 1;

    -- Assign assistant to user
    IF random_assistant_id IS NOT NULL THEN
      INSERT INTO user_assistant (user_id, assistant_id, assigned_by)
      VALUES (NEW.id, random_assistant_id, NULL);

      RAISE NOTICE 'Assistant % assigned to user %', random_assistant_id, NEW.id;
    ELSE
      RAISE WARNING 'Could not find assistant for user %', NEW.id;
    END IF;

  EXCEPTION
    WHEN unique_violation THEN
      RAISE WARNING 'Assistant already assigned to user: %', NEW.id;
    WHEN OTHERS THEN
      RAISE WARNING 'Error assigning assistant to user %: % (SQLSTATE: %)',
        NEW.id, SQLERRM, SQLSTATE;
      -- Don't fail the profile insert
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_assistant();

RAISE NOTICE '✓ Assistant assignment trigger installed';

-- ============================================================================
-- STEP 2: Verify and fix assistants table
-- ============================================================================

-- Check if assistants exist
DO $$
DECLARE
  assistant_count INT;
BEGIN
  SELECT COUNT(*) INTO assistant_count
  FROM assistants
  WHERE openai_assistant_id IS NOT NULL;

  IF assistant_count >= 3 THEN
    RAISE NOTICE '✓ Found % assistants with OpenAI IDs', assistant_count;
  ELSE
    RAISE NOTICE '⚠ Only % assistants found, expected 3+', assistant_count;
  END IF;
END $$;

-- Update or insert assistants (this is idempotent - safe to run multiple times)
INSERT INTO assistants (name, description, openai_assistant_id, active, available_for_random_assignment)
VALUES
  ('nav_edu', 'Navigation Education Assistant', 'asst_8U73byxV7wR65zuTiPUdDav7', TRUE, TRUE),
  ('core_edu', 'Core Education Assistant', 'asst_oxD6VwzWDq50mQMZPxtRs4MZ', TRUE, TRUE),
  ('base_edu', 'Base Education Assistant', 'asst_dqm6xw0NYdiIqu65rIQ2iGOW', TRUE, TRUE)
ON CONFLICT (name) DO UPDATE SET
  openai_assistant_id = EXCLUDED.openai_assistant_id,
  description = EXCLUDED.description,
  active = EXCLUDED.active,
  available_for_random_assignment = EXCLUDED.available_for_random_assignment,
  updated_at = NOW();

RAISE NOTICE '✓ Assistants configured';

-- ============================================================================
-- STEP 3: Fix any orphaned users (users without profiles)
-- ============================================================================

-- Show orphaned users
DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM auth.users u
  LEFT JOIN profiles p ON u.id = p.id
  WHERE p.id IS NULL;

  IF orphan_count > 0 THEN
    RAISE NOTICE '⚠ Found % orphaned users (will be cleaned up)', orphan_count;

    -- Create profiles for orphaned users
    INSERT INTO profiles (id, email, is_admin)
    SELECT u.id, u.email, FALSE
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE p.id IS NULL
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE '✓ Created profiles for orphaned users';
  ELSE
    RAISE NOTICE '✓ No orphaned users found';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Fix users without assistant assignments
-- ============================================================================

DO $$
DECLARE
  unassigned_count INT;
  random_assistant UUID;
BEGIN
  SELECT COUNT(*) INTO unassigned_count
  FROM profiles p
  LEFT JOIN user_assistant ua ON p.id = ua.user_id
  WHERE ua.user_id IS NULL;

  IF unassigned_count > 0 THEN
    RAISE NOTICE '⚠ Found % users without assistant assignments', unassigned_count;

    -- Assign assistants to unassigned users
    FOR random_assistant IN
      SELECT p.id
      FROM profiles p
      LEFT JOIN user_assistant ua ON p.id = ua.user_id
      WHERE ua.user_id IS NULL
    LOOP
      INSERT INTO user_assistant (user_id, assistant_id, assigned_by)
      SELECT random_assistant, id, NULL
      FROM assistants
      WHERE active = TRUE AND available_for_random_assignment = TRUE
      ORDER BY RANDOM()
      LIMIT 1
      ON CONFLICT DO NOTHING;
    END LOOP;

    RAISE NOTICE '✓ Assigned assistants to all users';
  ELSE
    RAISE NOTICE '✓ All users have assistant assignments';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Verify RLS policies exist
-- ============================================================================

DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename IN ('profiles', 'assistants', 'user_assistant', 'messages');

  IF policy_count > 0 THEN
    RAISE NOTICE '✓ Found % RLS policies', policy_count;
  ELSE
    RAISE NOTICE '⚠ Warning: No RLS policies found. Run supabase-setup.sql';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Test the triggers
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'trigger-test-' || gen_random_uuid()::text || '@example.com';
  profile_exists BOOLEAN;
  assignment_exists BOOLEAN;
BEGIN
  RAISE NOTICE '→ Testing triggers with test user...';

  -- Simulate trigger execution
  BEGIN
    -- Create profile
    INSERT INTO profiles (id, email, is_admin)
    VALUES (test_user_id, test_email, FALSE);

    -- Check if profile was created
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = test_user_id) INTO profile_exists;

    -- Wait for assignment trigger
    PERFORM pg_sleep(0.5);

    -- Check if assignment was created
    SELECT EXISTS(SELECT 1 FROM user_assistant WHERE user_id = test_user_id) INTO assignment_exists;

    IF profile_exists AND assignment_exists THEN
      RAISE NOTICE '✓ Trigger test PASSED - Both profile and assignment created';
    ELSIF profile_exists AND NOT assignment_exists THEN
      RAISE NOTICE '⚠ Trigger test PARTIAL - Profile created but no assignment';
    ELSE
      RAISE NOTICE '✗ Trigger test FAILED - Profile not created';
    END IF;

    -- Clean up test data
    DELETE FROM user_assistant WHERE user_id = test_user_id;
    DELETE FROM profiles WHERE id = test_user_id;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '✗ Trigger test ERROR: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
      -- Clean up
      DELETE FROM user_assistant WHERE user_id = test_user_id;
      DELETE FROM profiles WHERE id = test_user_id;
  END;
END $$;

-- ============================================================================
-- STEP 7: Final health check
-- ============================================================================

SELECT
  'FINAL HEALTH CHECK' as check_name,
  '==================' as status
UNION ALL
SELECT
  '1. Triggers',
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.triggers
          WHERE trigger_name IN ('on_auth_user_created', 'on_profile_created')) = 2
    THEN '✓ OK (2 triggers installed)'
    ELSE '✗ FAILED (triggers missing)'
  END
UNION ALL
SELECT
  '2. Assistants',
  CASE
    WHEN (SELECT COUNT(*) FROM assistants WHERE active = TRUE AND available_for_random_assignment = TRUE) >= 3
    THEN '✓ OK (' || (SELECT COUNT(*)::text FROM assistants WHERE active = TRUE) || ' active)'
    ELSE '✗ FAILED (not enough assistants)'
  END
UNION ALL
SELECT
  '3. Users & Profiles',
  CASE
    WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM profiles)
    THEN '✓ OK (all users have profiles)'
    ELSE '⚠ WARNING (orphaned users detected)'
  END
UNION ALL
SELECT
  '4. Assignments',
  CASE
    WHEN (SELECT COUNT(*) FROM profiles) = (SELECT COUNT(*) FROM user_assistant)
    THEN '✓ OK (all users assigned)'
    ELSE '⚠ WARNING (unassigned users detected)'
  END;

-- ============================================================================
-- DONE!
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '=============================================================';
RAISE NOTICE 'Signup fix script completed!';
RAISE NOTICE 'Check the output above for any warnings or errors.';
RAISE NOTICE '';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Verify "Email confirmation" is DISABLED in Supabase Dashboard';
RAISE NOTICE '2. Restart your Next.js dev server';
RAISE NOTICE '3. Clear browser cookies for localhost:3000';
RAISE NOTICE '4. Try signing up with a new email';
RAISE NOTICE '5. Check server logs for detailed signup flow';
RAISE NOTICE '=============================================================';
