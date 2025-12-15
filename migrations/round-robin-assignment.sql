-- Migration: Replace random assistant assignment with round-robin
-- This ensures equal distribution of students across assistants
-- For research studies with multiple assistant conditions

-- ============================================================================
-- Drop old function and create new round-robin assignment function
-- ============================================================================

-- Function to assign assistant using round-robin (equal distribution)
CREATE OR REPLACE FUNCTION public.auto_assign_assistant()
RETURNS TRIGGER AS $$
DECLARE
  selected_assistant_id UUID;
BEGIN
  -- Get the assistant with the FEWEST assigned users
  -- This ensures even distribution (round-robin)
  -- If tie, use the assistant with lowest ID (consistent ordering)
  SELECT a.id INTO selected_assistant_id
  FROM assistants a
  LEFT JOIN user_assistant ua ON ua.assistant_id = a.id
  WHERE a.active = TRUE
    AND a.available_for_random_assignment = TRUE
  GROUP BY a.id
  ORDER BY COUNT(ua.id) ASC, a.id ASC
  LIMIT 1;

  -- Only assign if we found an assistant
  IF selected_assistant_id IS NOT NULL THEN
    INSERT INTO user_assistant (user_id, assistant_id, assigned_by)
    VALUES (NEW.id, selected_assistant_id, NULL);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger is already created, but let's recreate it to be sure
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_assistant();

-- ============================================================================
-- Verification Query
-- ============================================================================

-- After users sign up, run this to verify even distribution:
-- SELECT
--   a.name as assistant_name,
--   COUNT(ua.id) as user_count
-- FROM assistants a
-- LEFT JOIN user_assistant ua ON ua.assistant_id = a.id
-- WHERE a.active = TRUE
-- GROUP BY a.id, a.name
-- ORDER BY a.id;

-- Expected result with 3 assistants and 120 students:
-- Assistant 1: 40 users
-- Assistant 2: 40 users
-- Assistant 3: 40 users
