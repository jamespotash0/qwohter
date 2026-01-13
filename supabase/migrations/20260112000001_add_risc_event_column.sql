-- ============================================================================
-- Add RISC (Cross-Account Protection) Event Tracking Column
-- ============================================================================
-- Stores information about Google security events received via RISC
-- This helps with debugging and audit trails

-- Add last_risc_event column to store security event details
ALTER TABLE google_oauth_tokens
ADD COLUMN IF NOT EXISTS last_risc_event JSONB DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN google_oauth_tokens.last_risc_event IS
  'Stores the last RISC security event received from Google. Contains event_type, reason, and received_at.';

-- Create index for efficient querying of tokens affected by security events
CREATE INDEX IF NOT EXISTS idx_google_oauth_tokens_risc_event
ON google_oauth_tokens ((last_risc_event->>'event_type'))
WHERE last_risc_event IS NOT NULL;
