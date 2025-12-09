-- RLS Policy Fix for Admin Access
-- Run this SQL in your Supabase SQL Editor

-- This adds a policy to allow admins to view all profiles
-- The existing policy only allows users to view their own profile

CREATE POLICY IF NOT EXISTS "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.is_admin = TRUE
    )
  );

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';
