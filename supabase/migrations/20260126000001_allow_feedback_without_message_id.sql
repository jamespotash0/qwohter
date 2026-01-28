-- ============================================================================
-- Allow AI Feedback Without Message ID Reference
-- ============================================================================
-- For global chat, messages are stored locally (not in ai_messages table).
-- This migration allows feedback to be submitted with just the message content.
-- ============================================================================

-- Step 1: Add message_content column to store the response text directly
ALTER TABLE ai_user_feedback
  ADD COLUMN IF NOT EXISTS message_content TEXT;

-- Step 2: Drop the old constraint that required suggestion_id OR message_id
ALTER TABLE ai_user_feedback
  DROP CONSTRAINT IF EXISTS feedback_requires_reference;

-- Step 3: Add new constraint - must have suggestion_id, message_id, OR message_content
ALTER TABLE ai_user_feedback
  ADD CONSTRAINT feedback_requires_reference
  CHECK (
    suggestion_id IS NOT NULL
    OR message_id IS NOT NULL
    OR message_content IS NOT NULL
  );

-- Step 4: Add index for message_content queries (partial index for non-null values)
CREATE INDEX IF NOT EXISTS idx_ai_feedback_has_content
  ON ai_user_feedback(organization_id, created_at DESC)
  WHERE message_content IS NOT NULL;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN ai_user_feedback.message_content IS 'Message text for feedback on local/global chat messages that are not stored in ai_messages table';
