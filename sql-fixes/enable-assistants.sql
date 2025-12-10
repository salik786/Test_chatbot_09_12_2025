-- Enable all active assistants for random assignment
-- Run this in Supabase SQL Editor

-- Check current status
SELECT
  name,
  active,
  available_for_random_assignment,
  openai_assistant_id
FROM assistants
ORDER BY name;

-- Enable all active assistants for random assignment
UPDATE assistants
SET available_for_random_assignment = TRUE
WHERE active = TRUE;

-- Verify the update
SELECT
  name,
  active,
  available_for_random_assignment
FROM assistants
ORDER BY name;

-- You should now see available_for_random_assignment = true for all active assistants
