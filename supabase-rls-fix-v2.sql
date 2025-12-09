-- Fix for infinite recursion in RLS policy
-- Run this SQL in your Supabase SQL Editor

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Verify the policy is removed
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- Note: The admin panel uses createServiceClient() which bypasses RLS entirely,
-- so we don't need this policy. The service role key has full access to all tables.
