-- Add completed_at column to proposals table
-- Tracks when a proposal was first marked as complete (all required fields filled)
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN proposals.completed_at IS 'Timestamp when proposal was first marked complete (all required fields filled)';

-- Create index for efficient querying of completion metrics
CREATE INDEX IF NOT EXISTS idx_proposals_completed_at ON proposals(completed_at)
WHERE completed_at IS NOT NULL;
