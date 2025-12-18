-- Migration Update for Public Chat Sessions Feature
-- This adds permanent shareable links for assistants
-- Each link creates a NEW session for EVERY visitor

-- Add public_link_token to assistants table (permanent shareable token)
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS public_link_token TEXT UNIQUE;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_assistants_public_link_token ON assistants(public_link_token);

-- Add master_link_token to public_sessions to track which link created the session
ALTER TABLE public_sessions ADD COLUMN IF NOT EXISTS master_link_token TEXT;
CREATE INDEX IF NOT EXISTS idx_public_sessions_master_link_token ON public_sessions(master_link_token);

-- Update comments
COMMENT ON COLUMN assistants.public_link_token IS 'Permanent shareable token for public chat links - one per assistant';
COMMENT ON COLUMN public_sessions.master_link_token IS 'The master link token that created this session';
COMMENT ON COLUMN public_sessions.session_token IS 'Unique token for this specific session instance';
