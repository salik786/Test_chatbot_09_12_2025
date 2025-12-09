-- Diagnostic Queries for Signup Issue
-- Run these in Supabase SQL Editor to diagnose the problem
-- ============================================================================

-- 1. Check if triggers exist and are enabled
SELECT
  trigger_name,
  event_object_table as table_name,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema IN ('public', 'auth')
  AND trigger_name IN ('on_auth_user_created', 'on_profile_created')
ORDER BY event_object_table;

-- Expected output:
-- on_auth_user_created | auth.users | EXECUTE FUNCTION public.handle_new_user() | AFTER | INSERT
-- on_profile_created   | profiles   | EXECUTE FUNCTION public.auto_assign_assistant() | AFTER | INSERT

-- ============================================================================
-- 2. Check if trigger functions exist
SELECT
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('handle_new_user', 'auto_assign_assistant');

-- ============================================================================
-- 3. Verify assistants are available for assignment
SELECT
  id,
  name,
  openai_assistant_id,
  active,
  available_for_random_assignment
FROM assistants
WHERE active = TRUE
  AND available_for_random_assignment = TRUE;

-- Expected: Should show 3 assistants (nav_edu, core_edu, base_edu)

-- ============================================================================
-- 4. Check for any orphaned auth.users without profiles
SELECT
  u.id,
  u.email,
  u.created_at,
  p.id as profile_id
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;

-- If there are orphaned users, they need cleanup

-- ============================================================================
-- 5. Check RLS policies on profiles table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- ============================================================================
-- 6. Test trigger function manually
-- This will show if the trigger itself has any errors
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test@example.com';
BEGIN
  -- Simulate what the trigger does
  RAISE NOTICE 'Testing profile creation...';

  INSERT INTO public.profiles (id, email, is_admin)
  VALUES (test_user_id, test_email, FALSE);

  RAISE NOTICE 'Profile created successfully: %', test_user_id;

  -- Clean up test data
  DELETE FROM profiles WHERE id = test_user_id;

  RAISE NOTICE 'Test completed and cleaned up';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: % %', SQLERRM, SQLSTATE;
    -- Try to clean up even if there was an error
    DELETE FROM profiles WHERE id = test_user_id;
END $$;

-- ============================================================================
-- 7. Check Supabase Auth settings
-- Run this to see current auth configuration
SELECT
  (current_setting('app.settings.auth.enable_signup'))::boolean as signup_enabled,
  (current_setting('app.settings.auth.email_confirm_enabled', true))::boolean as email_confirm_enabled;

-- ============================================================================
-- 8. View recent error logs (if available)
-- Note: This might not work depending on your Supabase plan
SELECT
  timestamp,
  level,
  message
FROM postgres_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
  AND (message ILIKE '%trigger%' OR message ILIKE '%profile%' OR message ILIKE '%error%')
ORDER BY timestamp DESC
LIMIT 20;

-- ============================================================================
-- CLEANUP SCRIPT (if needed)
-- ============================================================================

-- If you find orphaned users without profiles, run this:
-- (Uncomment when ready to use)

/*
-- Delete auth users that don't have profiles (failed signups)
DELETE FROM auth.users
WHERE id IN (
  SELECT u.id
  FROM auth.users u
  LEFT JOIN profiles p ON u.id = p.id
  WHERE p.id IS NULL
  AND u.created_at > NOW() - INTERVAL '1 day'  -- Only recent failed signups
);
*/

-- ============================================================================
-- FIX SCRIPT - Recreate triggers if they're missing
-- ============================================================================

-- Run this if triggers are missing or broken:
/*
-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created ON profiles;

-- Recreate trigger function for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_email TEXT;
  is_admin_user BOOLEAN;
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

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth.users insert
    RAISE WARNING 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recreate assistant assignment function
CREATE OR REPLACE FUNCTION public.auto_assign_assistant()
RETURNS TRIGGER AS $$
DECLARE
  random_assistant_id UUID;
BEGIN
  -- Get a random active assistant
  SELECT id INTO random_assistant_id
  FROM assistants
  WHERE active = TRUE
    AND available_for_random_assignment = TRUE
  ORDER BY RANDOM()
  LIMIT 1;

  -- Only assign if we found an assistant
  IF random_assistant_id IS NOT NULL THEN
    INSERT INTO user_assistant (user_id, assistant_id, assigned_by)
    VALUES (NEW.id, random_assistant_id, NULL);
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the profile insert
    RAISE WARNING 'Error in auto_assign_assistant: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_assistant();
*/
