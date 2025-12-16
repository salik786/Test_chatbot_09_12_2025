-- ============================================================================
-- FIX DATABASE TRIGGERS
-- ============================================================================
-- Run this in your Supabase SQL Editor if signup is not creating profiles
-- This will reinstall the triggers that automatically create profiles and
-- assign assistants when new users sign up
-- ============================================================================

-- ============================================================================
-- 1. Fix Profile Creation Trigger
-- ============================================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_email TEXT;
  is_admin_user BOOLEAN;
BEGIN
  -- Get admin email from user metadata (set during signup)
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. Fix Auto-Assign Assistant Trigger (Round-Robin)
-- ============================================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
DROP FUNCTION IF EXISTS public.auto_assign_assistant();

-- Recreate the function with round-robin logic
CREATE OR REPLACE FUNCTION public.auto_assign_assistant()
RETURNS TRIGGER AS $$
DECLARE
  selected_assistant_id UUID;
BEGIN
  -- Get the assistant with the FEWEST assigned users (round-robin)
  -- This ensures even distribution for research studies
  SELECT a.id INTO selected_assistant_id
  FROM assistants a
  LEFT JOIN user_assistant ua ON ua.assistant_id = a.id
  WHERE a.active = TRUE
    AND a.available_for_random_assignment = TRUE
  GROUP BY a.id
  ORDER BY COUNT(ua.id) ASC, a.id ASC
  LIMIT 1;

  -- Only assign if we found an assistant
  IF selected_assistant_id IS NOT NULL THEN
    INSERT INTO user_assistant (user_id, assistant_id, assigned_by)
    VALUES (NEW.id, selected_assistant_id, NULL);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_assistant();

-- ============================================================================
-- 3. Verify Everything is Set Up Correctly
-- ============================================================================

-- Check if triggers exist
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('on_auth_user_created', 'on_profile_created')
ORDER BY trigger_name;

-- Check if functions exist
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN ('handle_new_user', 'auto_assign_assistant')
  AND routine_schema = 'public'
ORDER BY routine_name;

-- ============================================================================
-- 4. Test the Triggers (Optional)
-- ============================================================================

-- You can test by signing up a new user through the app
-- Then check if the profile and assignment were created:

-- Check latest profiles (should include your new signup)
SELECT id, email, is_admin, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- Check latest assignments (should match new signups)
SELECT
  ua.user_id,
  p.email,
  a.name as assistant_name,
  ua.assigned_at
FROM user_assistant ua
JOIN profiles p ON p.id = ua.user_id
JOIN assistants a ON a.id = ua.assistant_id
ORDER BY ua.assigned_at DESC
LIMIT 5;

-- Check assistant distribution (should be balanced for research)
SELECT
  a.name,
  COUNT(ua.id) as user_count
FROM assistants a
LEFT JOIN user_assistant ua ON ua.assistant_id = a.id
WHERE a.active = TRUE
GROUP BY a.id, a.name
ORDER BY user_count ASC;

-- ============================================================================
-- DONE!
-- ============================================================================
-- The triggers are now reinstalled. Try signing up a new user and check:
-- 1. Profile is created in profiles table
-- 2. Assistant is assigned in user_assistant table
-- 3. User can log in and start conversations
-- ============================================================================
