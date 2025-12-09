-- ============================================================================
-- QUICK FIX: Assign assistant to current user
-- ============================================================================
-- This will immediately assign an assistant to user: saleemsalik786@gmail.com
-- Run this now so you can test chat functionality while we debug the trigger
-- ============================================================================

-- Assign assistant to the user from your logs
DO $$
DECLARE
  target_user_id UUID := '1f3728ae-5733-4bb6-be67-021d8e8a6ab3';
  random_assistant_id UUID;
BEGIN
  -- Check if already assigned
  IF EXISTS(SELECT 1 FROM user_assistant WHERE user_id = target_user_id) THEN
    RAISE NOTICE '✓ User already has an assistant assigned';
    RETURN;
  END IF;

  -- Get random assistant
  SELECT id INTO random_assistant_id
  FROM assistants
  WHERE active = TRUE AND available_for_random_assignment = TRUE
  ORDER BY RANDOM()
  LIMIT 1;

  IF random_assistant_id IS NULL THEN
    RAISE EXCEPTION 'No assistants available! Run fix-signup-complete.sql first';
  END IF;

  -- Assign
  INSERT INTO user_assistant (user_id, assistant_id, assigned_by)
  VALUES (target_user_id, random_assistant_id, NULL);

  RAISE NOTICE '✓ Assistant assigned successfully!';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to assign assistant: %', SQLERRM;
END $$;

-- Show what was assigned
SELECT
  p.email,
  a.name as assistant,
  a.openai_assistant_id as openai_id
FROM profiles p
JOIN user_assistant ua ON ua.user_id = p.id
JOIN assistants a ON a.id = ua.assistant_id
WHERE p.id = '1f3728ae-5733-4bb6-be67-021d8e8a6ab3';
