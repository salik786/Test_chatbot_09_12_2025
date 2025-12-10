-- ============================================================================
-- COMPLETE TRIGGER RECREATION SCRIPT
-- This will drop and recreate all triggers and functions
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. Drop existing triggers and functions (clean slate)
-- ============================================================================

DROP TRIGGER IF EXISTS on_profile_created ON profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS auto_assign_assistant();
DROP FUNCTION IF EXISTS handle_new_user();

-- ============================================================================
-- 2. Create profile creation trigger and function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  admin_email TEXT;
  is_admin_user BOOLEAN;
BEGIN
  -- Get admin email from user metadata (set during signup)
  admin_email := NEW.raw_user_meta_data->>'admin_email';

  -- Check if this user is the admin
  is_admin_user := (admin_email IS NOT NULL AND NEW.email = admin_email);

  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, is_admin, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(is_admin_user, FALSE),
    NOW(),
    NOW()
  );

  -- Log for debugging
  RAISE NOTICE 'Profile created for user: % (admin: %)', NEW.email, COALESCE(is_admin_user, FALSE);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. Create assistant assignment trigger and function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_assign_assistant()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  random_assistant_id UUID;
  assistant_name TEXT;
BEGIN
  -- Log the attempt
  RAISE NOTICE 'Attempting to assign assistant to user: %', NEW.id;

  -- Get a random active assistant that's available for random assignment
  SELECT id, name INTO random_assistant_id, assistant_name
  FROM public.assistants
  WHERE active = TRUE
    AND available_for_random_assignment = TRUE
  ORDER BY RANDOM()
  LIMIT 1;

  -- Check if we found an assistant
  IF random_assistant_id IS NOT NULL THEN
    -- Insert the assignment
    INSERT INTO public.user_assistant (
      user_id,
      assistant_id,
      assigned_by,
      assigned_at
    )
    VALUES (
      NEW.id,
      random_assistant_id,
      NULL,
      NOW()
    );

    RAISE NOTICE 'Successfully assigned assistant % (%) to user %', assistant_name, random_assistant_id, NEW.id;
  ELSE
    RAISE WARNING 'No available assistants found for user %', NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in auto_assign_assistant for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_assistant();

-- ============================================================================
-- 4. Verify triggers were created
-- ============================================================================

SELECT
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgenabled AS enabled,
  proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname IN ('on_auth_user_created', 'on_profile_created')
ORDER BY tgname;

-- ============================================================================
-- 5. Test the assistant selection logic
-- ============================================================================

-- This should return one assistant
SELECT id, name
FROM assistants
WHERE active = TRUE
  AND available_for_random_assignment = TRUE
ORDER BY RANDOM()
LIMIT 1;

-- ============================================================================
-- 6. Check existing assignments
-- ============================================================================

SELECT
  COUNT(*) as total_profiles,
  COUNT(ua.id) as assigned_profiles,
  COUNT(*) - COUNT(ua.id) as unassigned_profiles
FROM profiles p
LEFT JOIN user_assistant ua ON p.id = ua.user_id;

-- ============================================================================
-- DONE!
-- ============================================================================

-- The triggers are now recreated with:
-- - SECURITY DEFINER to bypass RLS
-- - Explicit search_path for security
-- - Better error handling with RAISE NOTICE/WARNING
-- - Exception handling to prevent failures

-- To see the logs when you sign up, check Supabase logs or look for NOTICE messages
