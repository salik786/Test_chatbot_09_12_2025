-- ============================================================================
-- FOCUSED DIAGNOSTIC: Why is assistant assignment failing?
-- ============================================================================
-- Run this in Supabase SQL Editor to diagnose the assignment issue
-- ============================================================================

-- 1. Check if assistants exist and are available
SELECT
  'ASSISTANTS CHECK' as check_name,
  '=================' as details
UNION ALL
SELECT
  'Total assistants:',
  COUNT(*)::text
FROM assistants
UNION ALL
SELECT
  'Active assistants:',
  COUNT(*)::text
FROM assistants
WHERE active = TRUE
UNION ALL
SELECT
  'Available for assignment:',
  COUNT(*)::text
FROM assistants
WHERE active = TRUE AND available_for_random_assignment = TRUE;

-- Show assistant details
SELECT
  id,
  name,
  openai_assistant_id,
  active,
  available_for_random_assignment
FROM assistants
ORDER BY name;

-- ============================================================================
-- 2. Check if the trigger exists
SELECT
  '=================' as separator,
  'TRIGGER CHECK' as check_name
UNION ALL
SELECT
  trigger_name,
  event_object_table || ' (' || action_timing || ' ' || event_manipulation || ')'
FROM information_schema.triggers
WHERE trigger_name IN ('on_auth_user_created', 'on_profile_created')
  AND trigger_schema IN ('public', 'auth');

-- ============================================================================
-- 3. Check the specific user from the log
SELECT
  '=================' as separator,
  'USER CHECK' as check_name
UNION ALL
SELECT
  'Profile exists:',
  CASE WHEN EXISTS(SELECT 1 FROM profiles WHERE id = '1f3728ae-5733-4bb6-be67-021d8e8a6ab3')
    THEN 'YES' ELSE 'NO' END
UNION ALL
SELECT
  'Assignment exists:',
  CASE WHEN EXISTS(SELECT 1 FROM user_assistant WHERE user_id = '1f3728ae-5733-4bb6-be67-021d8e8a6ab3')
    THEN 'YES' ELSE 'NO' END;

-- Show assignment if it exists
SELECT
  '=================' as separator,
  'USER ASSIGNMENT' as info
UNION ALL
SELECT
  ua.user_id::text,
  COALESCE(a.name, 'NO ASSISTANT')
FROM user_assistant ua
LEFT JOIN assistants a ON a.id = ua.assistant_id
WHERE ua.user_id = '1f3728ae-5733-4bb6-be67-021d8e8a6ab3';

-- ============================================================================
-- 4. Check all users without assignments
SELECT
  '=================' as separator,
  'USERS WITHOUT ASSIGNMENTS' as info
UNION ALL
SELECT
  p.id::text,
  p.email
FROM profiles p
LEFT JOIN user_assistant ua ON ua.user_id = p.id
WHERE ua.user_id IS NULL;

-- ============================================================================
-- 5. Test the trigger function manually on the existing user
-- This will attempt to assign an assistant to your user right now
DO $$
DECLARE
  target_user_id UUID := '1f3728ae-5733-4bb6-be67-021d8e8a6ab3';
  random_assistant_id UUID;
  assistant_count INT;
BEGIN
  RAISE NOTICE '→ Attempting to assign assistant to user %', target_user_id;

  -- Check if assignment already exists
  IF EXISTS(SELECT 1 FROM user_assistant WHERE user_id = target_user_id) THEN
    RAISE NOTICE '⚠ User already has an assignment';
    RETURN;
  END IF;

  -- Check available assistants
  SELECT COUNT(*) INTO assistant_count
  FROM assistants
  WHERE active = TRUE AND available_for_random_assignment = TRUE;

  RAISE NOTICE '→ Found % available assistants', assistant_count;

  IF assistant_count = 0 THEN
    RAISE NOTICE '✗ ERROR: No assistants available for assignment';
    RETURN;
  END IF;

  -- Get random assistant
  SELECT id INTO random_assistant_id
  FROM assistants
  WHERE active = TRUE AND available_for_random_assignment = TRUE
  ORDER BY RANDOM()
  LIMIT 1;

  RAISE NOTICE '→ Selected assistant: %', random_assistant_id;

  -- Assign assistant
  INSERT INTO user_assistant (user_id, assistant_id, assigned_by)
  VALUES (target_user_id, random_assistant_id, NULL);

  RAISE NOTICE '✓ SUCCESS: Assistant assigned to user';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '✗ ERROR: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END $$;

-- ============================================================================
-- 6. Verify assignment was created
SELECT
  '=================' as separator,
  'VERIFICATION' as info
UNION ALL
SELECT
  'Assignment now exists:',
  CASE WHEN EXISTS(SELECT 1 FROM user_assistant WHERE user_id = '1f3728ae-5733-4bb6-be67-021d8e8a6ab3')
    THEN 'YES ✓' ELSE 'NO ✗' END;

-- Show the assignment details
SELECT
  p.email,
  a.name as assistant_name,
  a.openai_assistant_id,
  ua.assigned_at
FROM profiles p
LEFT JOIN user_assistant ua ON ua.user_id = p.id
LEFT JOIN assistants a ON a.id = ua.assistant_id
WHERE p.id = '1f3728ae-5733-4bb6-be67-021d8e8a6ab3';
