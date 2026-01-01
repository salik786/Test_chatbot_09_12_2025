-- Add prolific_id column to public_sessions table
ALTER TABLE public_sessions
ADD COLUMN prolific_id TEXT;

-- Add index for faster lookups
CREATE INDEX idx_public_sessions_prolific_id ON public_sessions(prolific_id);

-- Add comment to document the field
COMMENT ON COLUMN public_sessions.prolific_id IS 'Prolific participant ID for research study tracking';
