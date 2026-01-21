-- Migration: Add AI Conversations Support
-- Description: Adds tables for AI chat history and proactive analysis tracking
-- Date: 2026-01-22

-- ============================================================================
-- AI Messages Table (Chat History)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Optional link to a suggestion (for proactive messages)
  suggestion_id UUID REFERENCES ai_suggestions(id) ON DELETE SET NULL,

  -- Proactive flag (true if AI initiated, false if user initiated)
  is_proactive BOOLEAN DEFAULT false,

  -- Metadata
  model_used TEXT,
  tokens_used INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_messages_proposal ON ai_messages(proposal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_organization ON ai_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user ON ai_messages(user_id);

-- ============================================================================
-- Add AI Analysis Tracking to Proposals
-- ============================================================================

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS ai_last_analyzed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_pending_suggestions_count INTEGER DEFAULT 0;

-- ============================================================================
-- Row Level Security for AI Messages
-- ============================================================================

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages for proposals in their organization
CREATE POLICY "Users can view AI messages for their organization proposals"
  ON ai_messages
  FOR SELECT
  TO public
  USING (is_active_member((select auth.uid()), organization_id));

-- Policy: Users can insert messages for proposals in their organization
CREATE POLICY "Users can create AI messages for their organization proposals"
  ON ai_messages
  FOR INSERT
  TO public
  WITH CHECK (is_active_member((select auth.uid()), organization_id));

-- Policy: Service role can manage all messages (for Edge Functions)
CREATE POLICY "Service role can manage all AI messages"
  ON ai_messages
  FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- Function to Update Pending Suggestions Count
-- ============================================================================

CREATE OR REPLACE FUNCTION update_proposal_ai_suggestions_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the count on the proposal
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.proposals
    SET ai_pending_suggestions_count = (
      SELECT COUNT(*) FROM public.ai_suggestions
      WHERE proposal_id = NEW.proposal_id AND status = 'pending'
    )
    WHERE id = NEW.proposal_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.proposals
    SET ai_pending_suggestions_count = (
      SELECT COUNT(*) FROM public.ai_suggestions
      WHERE proposal_id = OLD.proposal_id AND status = 'pending'
    )
    WHERE id = OLD.proposal_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Trigger to keep count in sync
DROP TRIGGER IF EXISTS trigger_update_ai_suggestions_count ON ai_suggestions;
CREATE TRIGGER trigger_update_ai_suggestions_count
  AFTER INSERT OR UPDATE OR DELETE ON ai_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_proposal_ai_suggestions_count();

-- ============================================================================
-- Function to Get Total Pending Suggestions for Organization
-- ============================================================================

CREATE OR REPLACE FUNCTION get_organization_pending_ai_suggestions(org_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(ai_pending_suggestions_count), 0)::INTEGER
    FROM public.proposals
    WHERE organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- View for Proposals Needing AI Attention
-- ============================================================================

CREATE OR REPLACE VIEW proposals_needing_ai_attention
WITH (security_invoker = on) AS
SELECT
  p.id,
  p.proposal_number,
  p.project_name,
  p.client_name,
  p.status,
  p.total_value,
  p.organization_id,
  p.created_at,
  p.updated_at,
  p.ai_last_analyzed_at,
  p.ai_pending_suggestions_count,
  -- Calculate days since last activity
  EXTRACT(DAY FROM NOW() - p.updated_at) AS days_since_update,
  -- Calculate days since submission (if submitted)
  CASE
    WHEN p.status = 'Submitted' THEN EXTRACT(DAY FROM NOW() - p.updated_at)
    ELSE NULL
  END AS days_since_submission,
  -- Flag if needs analysis (not analyzed in last 24 hours or never analyzed)
  CASE
    WHEN p.ai_last_analyzed_at IS NULL THEN true
    WHEN p.ai_last_analyzed_at < NOW() - INTERVAL '24 hours' THEN true
    ELSE false
  END AS needs_analysis
FROM public.proposals p
WHERE p.status IN ('Draft', 'Submitted', 'Won');
