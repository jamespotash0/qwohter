-- ============================================================================
-- AI Workflow Automation Tables
--
-- Creates tables for AI-generated suggestions, agent run history, and user feedback.
-- Supports follow-up emails, smart reminders, and action recommendations.
-- ============================================================================

-- ============================================================================
-- Table: ai_suggestions
-- Stores AI-generated suggestions for proposals
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context references
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Suggestion content
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN (
    'follow_up_email',
    'status_reminder',
    'action_recommendation',
    'win_loss_insight',
    'pricing_suggestion'
  )),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  reasoning TEXT,

  -- Email-specific fields (for follow_up_email type)
  email_subject TEXT,
  email_recipient TEXT,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed', 'expired')),
  applied_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  dismissed_reason TEXT,

  -- AI metadata
  model_used TEXT DEFAULT 'gpt-4o-mini',
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Indexes for common query patterns
CREATE INDEX idx_ai_suggestions_proposal_status ON ai_suggestions(proposal_id, status);
CREATE INDEX idx_ai_suggestions_org_status ON ai_suggestions(organization_id, status);
CREATE INDEX idx_ai_suggestions_user_status ON ai_suggestions(user_id, status);
CREATE INDEX idx_ai_suggestions_type_status ON ai_suggestions(suggestion_type, status);
CREATE INDEX idx_ai_suggestions_created ON ai_suggestions(created_at DESC);

-- Enable RLS
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization's AI suggestions"
  ON ai_suggestions FOR SELECT TO authenticated
  USING (is_active_member((select auth.uid()), organization_id));

CREATE POLICY "Users can insert AI suggestions for their organization"
  ON ai_suggestions FOR INSERT TO authenticated
  WITH CHECK (is_active_member((select auth.uid()), organization_id));

CREATE POLICY "Users can update their own AI suggestions"
  ON ai_suggestions FOR UPDATE TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    has_org_role((select auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text])
  );

-- Service role can manage all AI suggestions (for Edge Functions)
CREATE POLICY "Service role can manage all AI suggestions"
  ON ai_suggestions FOR ALL TO service_role
  USING (true);

-- ============================================================================
-- Table: ai_agent_runs
-- Audit log for AI processing history
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Run details
  agent_type TEXT NOT NULL CHECK (agent_type IN (
    'follow_up_generator',
    'reminder_suggester',
    'win_loss_analyzer',
    'status_monitor',
    'recommendation_engine'
  )),
  trigger_event TEXT NOT NULL CHECK (trigger_event IN (
    'manual',
    'status_change',
    'scheduled',
    'proposal_age'
  )),

  -- Input context (sanitized)
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  input_data JSONB DEFAULT '{}',

  -- Output
  suggestions_generated INTEGER DEFAULT 0,
  output_data JSONB DEFAULT '{}',

  -- Performance tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,

  -- Cost tracking
  total_tokens INTEGER,
  estimated_cost_usd DECIMAL(10,6),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_agent_runs_org ON ai_agent_runs(organization_id, created_at DESC);
CREATE INDEX idx_ai_agent_runs_proposal ON ai_agent_runs(proposal_id);
CREATE INDEX idx_ai_agent_runs_status ON ai_agent_runs(status);
CREATE INDEX idx_ai_agent_runs_type ON ai_agent_runs(agent_type);

-- Enable RLS
ALTER TABLE ai_agent_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admins only for audit logs)
CREATE POLICY "Admins can view AI agent runs for their organization"
  ON ai_agent_runs FOR SELECT TO authenticated
  USING (has_org_role(auth.uid(), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

CREATE POLICY "Members can insert AI agent runs"
  ON ai_agent_runs FOR INSERT TO authenticated
  WITH CHECK (is_active_member(auth.uid(), organization_id));

CREATE POLICY "Members can update AI agent runs"
  ON ai_agent_runs FOR UPDATE TO authenticated
  USING (is_active_member(auth.uid(), organization_id));

-- Service role can manage all AI agent runs (for Edge Functions)
CREATE POLICY "Service role can manage all AI agent runs"
  ON ai_agent_runs FOR ALL TO service_role
  USING (true);

-- ============================================================================
-- Table: ai_user_feedback
-- Captures user feedback on AI suggestions for improvement
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  suggestion_id UUID NOT NULL REFERENCES ai_suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Feedback data
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_type TEXT CHECK (feedback_type IN ('helpful', 'not_helpful', 'incorrect', 'too_generic')),
  comment TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_feedback_suggestion ON ai_user_feedback(suggestion_id);
CREATE INDEX idx_ai_feedback_user ON ai_user_feedback(user_id);

-- Enable RLS
ALTER TABLE ai_user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own feedback"
  ON ai_user_feedback FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own feedback"
  ON ai_user_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));


-- Apply trigger to ai_suggestions
DROP TRIGGER IF EXISTS update_ai_suggestions_updated_at ON ai_suggestions;
CREATE TRIGGER update_ai_suggestions_updated_at
  BEFORE UPDATE ON ai_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE ai_suggestions IS 'Stores AI-generated suggestions for proposals including follow-up emails, reminders, and recommendations';
COMMENT ON TABLE ai_agent_runs IS 'Audit log tracking all AI agent executions for debugging and cost analysis';
COMMENT ON TABLE ai_user_feedback IS 'User feedback on AI suggestions to improve future recommendations';

COMMENT ON COLUMN ai_suggestions.suggestion_type IS 'Type of suggestion: follow_up_email, status_reminder, action_recommendation, win_loss_insight, pricing_suggestion';
COMMENT ON COLUMN ai_suggestions.confidence_score IS 'AI confidence in the suggestion (0.00-1.00)';
COMMENT ON COLUMN ai_agent_runs.estimated_cost_usd IS 'Estimated cost based on token usage';
