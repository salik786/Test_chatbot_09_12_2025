-- Verify that triggers exist and are enabled
-- Run this in Supabase SQL Editor

-- 1. Check if triggers exist
SELECT
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgenabled AS enabled,
  proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname IN ('on_auth_user_created', 'on_profile_created')
ORDER BY tgname;

-- Expected output:
-- on_auth_user_created | auth.users | O | handle_new_user
-- on_profile_created   | profiles   | O | auto_assign_assistant
-- (O means enabled)

-- 2. Check if trigger functions exist
SELECT
  proname AS function_name,
  prosrc AS function_code
FROM pg_proc
WHERE proname IN ('handle_new_user', 'auto_assign_assistant');

-- If no rows are returned, the triggers/functions don't exist!
-- You need to run supabase-setup.sql

-- 3. Test the trigger logic manually (to verify it would work)
SELECT id, name FROM assistants
WHERE active = TRUE
  AND available_for_random_assignment = TRUE
ORDER BY RANDOM()
LIMIT 1;

-- This should return one assistant. If it doesn't, check:
-- UPDATE assistants SET available_for_random_assignment = TRUE WHERE active = TRUE;
