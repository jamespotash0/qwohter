-- Add revoked_at column to invite_tokens table
-- This allows tracking revoked invitations without deleting them

BEGIN;

-- Add revoked_at column (nullable timestamp)
ALTER TABLE invite_tokens
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- Create index for filtering active/revoked invites
CREATE INDEX IF NOT EXISTS idx_invite_tokens_revoked
ON invite_tokens(organization_id, revoked_at)
WHERE revoked_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN invite_tokens.revoked_at IS 'Timestamp when the invitation was revoked. NULL means invitation is still active.';

RAISE NOTICE 'Successfully added revoked_at column to invite_tokens table';

COMMIT;
