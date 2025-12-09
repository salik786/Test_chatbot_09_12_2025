-- Migration Script: Update existing database to use OpenAI Assistants API
-- Run this if you already have an existing database with the old schema
-- ============================================================================

-- Step 1: Add new column to assistants table
ALTER TABLE assistants
  ADD COLUMN IF NOT EXISTS openai_assistant_id TEXT;

-- Step 2: Update existing assistants with your OpenAI Assistant IDs
UPDATE assistants SET openai_assistant_id = 'asst_8U73byxV7wR65zuTiPUdDav7' WHERE name = 'nav_edu';
UPDATE assistants SET openai_assistant_id = 'asst_oxD6VwzWDq50mQMZPxtRs4MZ' WHERE name = 'core_edu';
UPDATE assistants SET openai_assistant_id = 'asst_dqm6xw0NYdiIqu65rIQ2iGOW' WHERE name = 'base_edu';

-- Step 3: Make openai_assistant_id NOT NULL and UNIQUE
-- (Only after all assistants have been updated)
ALTER TABLE assistants
  ALTER COLUMN openai_assistant_id SET NOT NULL,
  ADD CONSTRAINT assistants_openai_assistant_id_key UNIQUE (openai_assistant_id);

-- Step 4: Drop old columns (optional - only if you're sure you don't need them)
-- ALTER TABLE assistants DROP COLUMN IF EXISTS model_id;
-- ALTER TABLE assistants DROP COLUMN IF EXISTS system_prompt;

-- Step 5: Add thread tracking column to user_assistant table
ALTER TABLE user_assistant
  ADD COLUMN IF NOT EXISTS openai_thread_id TEXT;

-- Step 6: Update RLS policy for thread updates
DROP POLICY IF EXISTS "Users can update own thread" ON user_assistant;
CREATE POLICY "Users can update own thread"
  ON user_assistant FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Verification queries - run these to check your data
-- ============================================================================

-- Check assistants table
SELECT id, name, openai_assistant_id, active FROM assistants;

-- Check user assignments
SELECT
  ua.user_id,
  p.email,
  a.name as assistant_name,
  a.openai_assistant_id,
  ua.openai_thread_id
FROM user_assistant ua
JOIN profiles p ON p.id = ua.user_id
JOIN assistants a ON a.id = ua.assistant_id;

-- ============================================================================
-- Done! Your database is now ready for OpenAI Assistants API
-- ============================================================================
