-- ============================================================================
-- Schema Fix: Update Foreign Keys to Reference profiles Instead of auth.users
-- ============================================================================
-- This fixes the "Could not find a relationship" errors in the admin panel
-- Run this in your Supabase SQL Editor

-- 1. Update user_assistant table to reference profiles
-- First, drop the old constraint
ALTER TABLE user_assistant
  DROP CONSTRAINT IF EXISTS user_assistant_user_id_fkey;

-- Add new constraint referencing profiles
ALTER TABLE user_assistant
  ADD CONSTRAINT user_assistant_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- 2. Update assigned_by to also reference profiles
ALTER TABLE user_assistant
  DROP CONSTRAINT IF EXISTS user_assistant_assigned_by_fkey;

ALTER TABLE user_assistant
  ADD CONSTRAINT user_assistant_assigned_by_fkey
  FOREIGN KEY (assigned_by)
  REFERENCES profiles(id)
  ON DELETE SET NULL;

-- 3. Update messages table to reference profiles
ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_user_id_fkey;

ALTER TABLE messages
  ADD CONSTRAINT messages_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- 4. Verify the new relationships
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('user_assistant', 'messages')
ORDER BY tc.table_name;

-- You should now see:
-- user_assistant.user_id -> profiles.id
-- user_assistant.assigned_by -> profiles.id
-- messages.user_id -> profiles.id
