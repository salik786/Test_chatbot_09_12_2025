-- FIX: Remove the problematic RLS policy that causes infinite recursion
-- Run this SQL in your Supabase SQL Editor

-- Drop the policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Verify the policy is removed
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- Note: Admin panel now uses createServiceClient() with service role key
-- which bypasses ALL RLS policies, so we don't need a separate admin policy.
-- The service role client has full database access.
