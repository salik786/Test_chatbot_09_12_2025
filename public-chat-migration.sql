-- Migration for Public Chat Sessions Feature
-- This allows anonymous users to chat with assistants via shareable links

-- Create public_sessions table
CREATE TABLE IF NOT EXISTS public_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  openai_thread_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  CONSTRAINT unique_session_token UNIQUE(session_token)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_public_sessions_assistant_id ON public_sessions(assistant_id);
CREATE INDEX IF NOT EXISTS idx_public_sessions_token ON public_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_public_sessions_created_at ON public_sessions(created_at DESC);

-- Alter messages table to support public sessions
-- Make user_id nullable to support public/anonymous messages
ALTER TABLE messages ALTER COLUMN user_id DROP NOT NULL;

-- Add session_id column to link messages to public sessions
ALTER TABLE messages ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public_sessions(id) ON DELETE CASCADE;

-- Add is_public flag to easily filter public vs authenticated messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Add index for filtering public messages
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_public ON messages(is_public);

-- Add comments for documentation
COMMENT ON TABLE public_sessions IS 'Stores anonymous chat sessions created via shareable links';
COMMENT ON COLUMN public_sessions.session_token IS 'Unique token used in the shareable link URL';
COMMENT ON COLUMN public_sessions.ended_at IS 'Timestamp when the session was closed/ended';
COMMENT ON COLUMN public_sessions.message_count IS 'Cached count of messages in this session';
COMMENT ON COLUMN messages.session_id IS 'Links message to a public session if applicable';
COMMENT ON COLUMN messages.is_public IS 'TRUE if message is from a public/anonymous session';

-- Function to automatically update last_activity_at
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    UPDATE public_sessions
    SET
      last_activity_at = NOW(),
      message_count = message_count + 1
    WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session activity when messages are added
DROP TRIGGER IF EXISTS on_public_message_created ON messages;
CREATE TRIGGER on_public_message_created
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.is_public = TRUE)
  EXECUTE FUNCTION update_session_activity();

-- Enable Row Level Security
ALTER TABLE public_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Public sessions are readable by everyone (for the public chat interface)
CREATE POLICY "Public sessions are readable by token" ON public_sessions
  FOR SELECT
  USING (true);

-- Policy: Only service role can insert/update public sessions
CREATE POLICY "Service role can manage public sessions" ON public_sessions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Update messages RLS to allow public messages
DROP POLICY IF EXISTS "Users can read their own messages" ON messages;
CREATE POLICY "Users can read their own or public messages" ON messages
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_public = TRUE
  );

-- Allow service role to insert public messages
CREATE POLICY "Service role can insert public messages" ON messages
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR (auth.uid() = user_id AND is_public = FALSE)
  );
