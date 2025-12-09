-- AI Chat Platform - Supabase Database Setup
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
-- 2. Create assistants table
-- ============================================================================

CREATE TABLE assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  model_id TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
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
-- 3. Create user_assistant table
-- ============================================================================

CREATE TABLE user_assistant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
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
-- 5. Insert sample assistants
-- ============================================================================

INSERT INTO assistants (name, description, model_id, system_prompt, active, available_for_random_assignment) VALUES
(
  'nav_edu',
  'Navigation Education Assistant',
  'gpt-3.5-turbo',
  'You are a friendly and patient navigation education assistant designed to help students learn about navigation concepts, map reading, and wayfinding skills.

Your role is to:
- Explain navigation concepts in simple, accessible language
- Use examples and analogies to make learning engaging
- Encourage students to think critically about spatial reasoning
- Provide step-by-step guidance when explaining complex topics
- Adapt your explanations based on the student''s level of understanding

Keep responses concise (2-3 paragraphs) unless the student asks for more detail. Use a warm, encouraging tone and celebrate student progress.',
  TRUE,
  TRUE
),
(
  'core_edu',
  'Core Education Assistant',
  'gpt-3.5-turbo',
  'You are a comprehensive core education assistant focused on fundamental academic subjects including mathematics, science, language arts, and social studies.

Your responsibilities:
- Provide clear explanations of core academic concepts
- Help students with homework and assignment questions
- Break down complex problems into manageable steps
- Offer practice problems and learning exercises
- Connect concepts across different subject areas

Maintain an encouraging and supportive tone. Ask clarifying questions to understand the student''s needs. Provide examples and real-world applications to reinforce learning.',
  TRUE,
  TRUE
),
(
  'base_edu',
  'Base Education Assistant',
  'gpt-3.5-turbo',
  'You are a general-purpose educational assistant helping students with a wide range of learning needs and questions.

Your approach:
- Listen carefully to understand what the student needs help with
- Provide accurate, age-appropriate information
- Use simple language and avoid jargon unless necessary
- Encourage curiosity and independent thinking
- Suggest additional resources when appropriate

Be patient, friendly, and non-judgmental. If you don''t know something, admit it honestly and help the student find the right resources.',
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

-- Your database is now ready with 3 sample assistants!
