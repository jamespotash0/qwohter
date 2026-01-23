-- ============================================================================
-- Extend AI Feedback to Support Chat Messages
-- ============================================================================
-- Previously, feedback was only for ai_suggestions.
-- Now it can also be for ai_messages (general chat responses).
-- ============================================================================

-- Step 1: Make suggestion_id optional (was required)
ALTER TABLE ai_user_feedback
  ALTER COLUMN suggestion_id DROP NOT NULL;

-- Step 2: Add message_id column for chat message feedback
ALTER TABLE ai_user_feedback
  ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES ai_messages(id) ON DELETE CASCADE;

-- Step 3: Add organization_id for easier querying
ALTER TABLE ai_user_feedback
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Step 4: Add constraint - must have either suggestion_id OR message_id
ALTER TABLE ai_user_feedback
  ADD CONSTRAINT feedback_requires_reference
  CHECK (suggestion_id IS NOT NULL OR message_id IS NOT NULL);

-- Step 5: Add index for message_id lookups
CREATE INDEX IF NOT EXISTS idx_ai_feedback_message ON ai_user_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_org ON ai_user_feedback(organization_id);

-- Step 6: Add feedback context type
ALTER TABLE ai_user_feedback
  ADD COLUMN IF NOT EXISTS context_type TEXT DEFAULT 'suggestion'
  CHECK (context_type IN ('suggestion', 'chat_message', 'tool_action'));

-- Step 7: Add user correction field (for training data)
ALTER TABLE ai_user_feedback
  ADD COLUMN IF NOT EXISTS user_correction TEXT;

-- Step 8: Update RLS policies to include organization-based access
DROP POLICY IF EXISTS "Users can view their own feedback" ON ai_user_feedback;
DROP POLICY IF EXISTS "Users can insert their own feedback" ON ai_user_feedback;

-- Users can view feedback in their organization
CREATE POLICY "Users can view feedback in their organization"
  ON ai_user_feedback FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = (select auth.uid()) AND status = 'Active'
    )
  );

-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
  ON ai_user_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Service role full access (for edge functions)
CREATE POLICY "Service role can manage all feedback"
  ON ai_user_feedback FOR ALL TO service_role
  USING (true);

-- ============================================================================
-- Create View for Feedback Analytics
-- ============================================================================

CREATE OR REPLACE VIEW ai_feedback_analytics AS
SELECT
  f.organization_id,
  f.context_type,
  f.feedback_type,
  f.rating,
  COUNT(*) as count,
  AVG(f.rating) as avg_rating,
  COUNT(CASE WHEN f.feedback_type = 'helpful' THEN 1 END) as helpful_count,
  COUNT(CASE WHEN f.feedback_type = 'not_helpful' THEN 1 END) as not_helpful_count,
  COUNT(CASE WHEN f.feedback_type = 'incorrect' THEN 1 END) as incorrect_count,
  COUNT(CASE WHEN f.user_correction IS NOT NULL THEN 1 END) as corrections_count,
  DATE_TRUNC('day', f.created_at) as feedback_date
FROM ai_user_feedback f
GROUP BY f.organization_id, f.context_type, f.feedback_type, f.rating, DATE_TRUNC('day', f.created_at);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN ai_user_feedback.message_id IS 'Reference to ai_messages for chat feedback (alternative to suggestion_id)';
COMMENT ON COLUMN ai_user_feedback.context_type IS 'Type of content being rated: suggestion, chat_message, or tool_action';
COMMENT ON COLUMN ai_user_feedback.user_correction IS 'User-provided correction text for training data collection';
COMMENT ON COLUMN ai_user_feedback.organization_id IS 'Organization for easier querying and analytics';
