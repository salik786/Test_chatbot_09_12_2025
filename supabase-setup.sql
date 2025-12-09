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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  openai_thread_id TEXT,  -- OpenAI Thread ID for this user's conversation
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
-- Setup Complete!
-- ============================================================================

-- Next steps:
-- 1. Copy your Supabase URL and keys to .env.local
-- 2. Add your OpenAI API key to .env.local
-- 3. Set ADMIN_EMAIL to your email in .env.local
-- 4. Run: npm install
-- 5. Run: npm run dev
-- 6. Visit: http://localhost:3000

-- Your database is now ready with your 3 OpenAI Assistants!
