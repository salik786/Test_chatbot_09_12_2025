-- ============================================================================
-- Manual Test Script - Test if trigger logic works
-- Run this to manually test the assistant assignment logic
-- ============================================================================

-- 1. Test the query that the trigger uses
DO $$
DECLARE
  test_assistant_id UUID;
  test_assistant_name TEXT;
BEGIN
  -- This is exactly what the trigger does
  SELECT id, name INTO test_assistant_id, test_assistant_name
  FROM assistants
  WHERE active = TRUE
    AND available_for_random_assignment = TRUE
  ORDER BY RANDOM()
  LIMIT 1;

  IF test_assistant_id IS NOT NULL THEN
    RAISE NOTICE 'SUCCESS: Found assistant % with ID %', test_assistant_name, test_assistant_id;
  ELSE
    RAISE NOTICE 'FAILURE: No assistants found!';
  END IF;
END $$;

-- 2. Check if any users are missing assignments
SELECT
  p.id,
  p.email,
  p.created_at,
  CASE
    WHEN ua.id IS NULL THEN 'NO ASSIGNMENT ❌'
    ELSE 'HAS ASSIGNMENT ✅'
  END as status
FROM profiles p
LEFT JOIN user_assistant ua ON p.id = ua.user_id
ORDER BY p.created_at DESC
LIMIT 10;

-- 3. Manually assign an assistant to a specific user (replace USER_ID)
-- Uncomment and replace USER_ID with actual user ID who needs assignment

/*
DO $$
DECLARE
  target_user_id UUID := 'YOUR_USER_ID_HERE'; -- Replace this!
  random_assistant_id UUID;
BEGIN
  -- Get a random assistant
  SELECT id INTO random_assistant_id
  FROM assistants
  WHERE active = TRUE
    AND available_for_random_assignment = TRUE
  ORDER BY RANDOM()
  LIMIT 1;

  -- Insert assignment
  IF random_assistant_id IS NOT NULL THEN
    INSERT INTO user_assistant (user_id, assistant_id, assigned_by, assigned_at)
    VALUES (target_user_id, random_assistant_id, NULL, NOW())
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Assigned assistant to user %', target_user_id;
  END IF;
END $$;
*/

-- 4. Check trigger status
SELECT
  tgname,
  tgrelid::regclass as table_name,
  CASE tgenabled
    WHEN 'O' THEN 'ENABLED ✅'
    WHEN 'D' THEN 'DISABLED ❌'
    ELSE 'UNKNOWN'
  END as status
FROM pg_trigger
WHERE tgname IN ('on_auth_user_created', 'on_profile_created');
