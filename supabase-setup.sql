-- AI Chat Platform - Supabase Database Setup with OpenAI Assistants
-- Run this SQL in your Supabase SQL Editor to set up the database

-- ============================================================================
-- 1. Create profiles table
-- ============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Note: Admin access is handled via service role client which bypasses RLS
-- Do NOT create a policy that queries profiles table from within profiles policy
-- as it causes infinite recursion

-- Trigger function to auto-create profile on signup
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

-- Trigger to call the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. Create assistants table (with OpenAI Assistant ID)
-- ============================================================================

CREATE TABLE assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  openai_assistant_id TEXT NOT NULL UNIQUE,  -- OpenAI Assistant ID (asst_xxx)
  active BOOLEAN DEFAULT TRUE,
  available_for_random_assignment BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active assistants"
  ON assistants FOR SELECT
  USING (active = TRUE);

CREATE POLICY "Admins can manage assistants"
  ON assistants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- ============================================================================
-- 3. Create user_assistant table (with OpenAI thread tracking)
-- ============================================================================

CREATE TABLE user_assistant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  openai_thread_id TEXT,  -- OpenAI Thread ID for this user's conversation
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_assistant ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own assignment"
  ON user_assistant FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own thread"
  ON user_assistant FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage assignments"
  ON user_assistant FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- ============================================================================
-- 4. Create messages table
-- ============================================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- ============================================================================
-- 5. Insert your OpenAI Assistants
-- ============================================================================

-- Replace with YOUR actual OpenAI Assistant IDs from Playground
INSERT INTO assistants (name, description, openai_assistant_id, active, available_for_random_assignment) VALUES
(
  'nav_edu',
  'Navigation Education Assistant',
  'asst_8U73byxV7wR65zuTiPUdDav7',  -- Your NEV assistant
  TRUE,
  TRUE
),
(
  'core_edu',
  'Core Education Assistant',
  'asst_oxD6VwzWDq50mQMZPxtRs4MZ',  -- Your Core assistant
  TRUE,
  TRUE
),
(
  'base_edu',
  'Base Education Assistant',
  'asst_dqm6xw0NYdiIqu65rIQ2iGOW',  -- Your base assistant
  TRUE,
  TRUE
);

-- ============================================================================
-- 6. Auto-assign assistant on profile creation
-- ============================================================================

-- Function to randomly assign an assistant to new users
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

-- Trigger to auto-assign assistant when profile is created
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_assistant();

-- ============================================================================
-- Setup Complete!
-- ============================================================================

-- Next steps:
-- 1. Copy your Supabase URL and keys to .env.local
-- 2. Add your OpenAI API key to .env.local
-- 3. Set ADMIN_EMAIL to your email in .env.local (for admin detection)
-- 4. Run: npm install
-- 5. Run: npm run dev
-- 6. Visit: http://localhost:3000

-- Your database is now ready with:
-- ✓ Automatic profile creation on signup
-- ✓ Automatic assistant assignment
-- ✓ Your 3 OpenAI Assistants configured
-- ✓ All RLS policies in place
