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

-- Step 7: Add automatic profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_email TEXT;
  is_admin_user BOOLEAN;
BEGIN
  -- Get admin email from user metadata (set during signup)
  admin_email := NEW.raw_user_meta_data->>'admin_email';

  -- Check if this user is the admin
  is_admin_user := (admin_email IS NOT NULL AND NEW.email = admin_email);

  INSERT INTO public.profiles (id, email, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(is_admin_user, FALSE)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Add automatic assistant assignment trigger
CREATE OR REPLACE FUNCTION public.auto_assign_assistant()
RETURNS TRIGGER AS $$
DECLARE
  random_assistant_id UUID;
BEGIN
  -- Get a random active assistant that's available for random assignment
  SELECT id INTO random_assistant_id
  FROM assistants
  WHERE active = TRUE
    AND available_for_random_assignment = TRUE
  ORDER BY RANDOM()
  LIMIT 1;

  -- Only assign if we found an assistant
  IF random_assistant_id IS NOT NULL THEN
    INSERT INTO user_assistant (user_id, assistant_id, assigned_by)
    VALUES (NEW.id, random_assistant_id, NULL);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_assistant();

-- ============================================================================
-- Done! Your database is now ready for OpenAI Assistants API
-- ============================================================================

-- Features enabled:
-- ✓ OpenAI Assistant IDs configured
-- ✓ Thread tracking per user
-- ✓ Automatic profile creation on signup
-- ✓ Automatic assistant assignment
-- ✓ All data preserved
