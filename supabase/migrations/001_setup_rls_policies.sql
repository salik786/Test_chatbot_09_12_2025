-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assistant ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Note: Profile creation is handled via service role in signup API
-- This ensures proper validation and assistant assignment

-- Assistants Policies
-- Allow all authenticated users to read assistants
CREATE POLICY "Authenticated users can read assistants"
  ON assistants FOR SELECT
  TO authenticated
  USING (active = true);

-- Allow admins to manage assistants
CREATE POLICY "Admins can manage assistants"
  ON assistants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- User Assistant Assignments Policies
-- Allow users to read their own assistant assignments
CREATE POLICY "Users can read own assignments"
  ON user_assistant FOR SELECT
  USING (auth.uid() = user_id);

-- Allow admins to manage all assignments
CREATE POLICY "Admins can manage assignments"
  ON user_assistant FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Messages Policies
-- Allow users to read messages in their conversations
CREATE POLICY "Users can read own messages"
  ON messages FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert messages in their conversations
CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to read all messages
CREATE POLICY "Admins can read all messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow system to insert assistant messages (via service role)
-- This is handled in the API routes using the service client
