-- ============================================================================
-- EMERGENCY FIX: Disable Broken Triggers
-- ============================================================================
-- Run this FIRST in your Supabase SQL Editor to allow signups to work
-- The signup route has fallback logic that will handle profile/assignment creation
-- ============================================================================

-- Disable the broken trigger that's blocking signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Disable the profile trigger too (signup route will handle assignment)
DROP TRIGGER IF EXISTS on_profile_created ON profiles;

-- Verify triggers are disabled
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('on_auth_user_created', 'on_profile_created')
ORDER BY trigger_name;

-- Should return 0 rows if successfully disabled

-- ============================================================================
-- DONE! Signups should now work
-- ============================================================================
-- The signup route (app/api/auth/signup/route.ts) has robust fallback logic that will:
-- 1. Create the user in auth.users
-- 2. Manually create the profile in profiles table
-- 3. Manually assign an assistant using round-robin
--
-- Try signing up again - it should work now!
-- ============================================================================
