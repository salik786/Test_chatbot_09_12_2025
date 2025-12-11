-- Migration: Add conversations table for multiple chat threads
-- This allows users to have multiple separate conversations with their assistant

-- ============================================================================
-- 1. Create conversations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  openai_thread_id TEXT,  -- OpenAI Thread ID for this conversation
  title TEXT,  -- Auto-generated or user-set conversation title
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. Add conversation_id to messages table
-- ============================================================================

-- Add the conversation_id column (nullable for now to support existing data)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- ============================================================================
-- 3. Migrate existing messages to a default conversation
-- ============================================================================

-- For each user, create a default conversation and link their existing messages to it
DO $$
DECLARE
  user_record RECORD;
  conversation_record RECORD;
  assignment_record RECORD;
BEGIN
  -- For each user who has messages
  FOR user_record IN
    SELECT DISTINCT user_id FROM messages WHERE conversation_id IS NULL
  LOOP
    -- Get the user's assistant assignment
    SELECT * INTO assignment_record
    FROM user_assistant
    WHERE user_id = user_record.user_id
    LIMIT 1;

    IF assignment_record.assistant_id IS NOT NULL THEN
      -- Create a default conversation for this user
      INSERT INTO conversations (user_id, assistant_id, openai_thread_id, title, created_at)
      VALUES (
        user_record.user_id,
        assignment_record.assistant_id,
        assignment_record.openai_thread_id,
        'Previous Conversation',
        (SELECT MIN(timestamp) FROM messages WHERE user_id = user_record.user_id)
      )
      RETURNING * INTO conversation_record;

      -- Link all existing messages to this conversation
      UPDATE messages
      SET conversation_id = conversation_record.id
      WHERE user_id = user_record.user_id
        AND conversation_id IS NULL;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 4. Update updated_at timestamp on conversations when messages are added
-- ============================================================================

CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_message_created ON messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.conversation_id IS NOT NULL)
  EXECUTE FUNCTION update_conversation_timestamp();

-- ============================================================================
-- 5. Function to auto-generate conversation titles based on first message
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_conversation_title()
RETURNS TRIGGER AS $$
BEGIN
  -- If title is not set, use first 50 chars of first user message
  IF NEW.title IS NULL OR NEW.title = '' THEN
    NEW.title := COALESCE(
      (
        SELECT SUBSTRING(content FROM 1 FOR 50) ||
          CASE WHEN LENGTH(content) > 50 THEN '...' ELSE '' END
        FROM messages
        WHERE conversation_id = NEW.id AND role = 'user'
        ORDER BY timestamp ASC
        LIMIT 1
      ),
      'New Conversation'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_conversation_title_generate ON conversations;
CREATE TRIGGER on_conversation_title_generate
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  WHEN (NEW.title IS NULL OR NEW.title = '')
  EXECUTE FUNCTION generate_conversation_title();
