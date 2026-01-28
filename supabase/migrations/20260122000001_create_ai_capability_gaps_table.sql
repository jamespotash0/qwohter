-- Create AI Capability Gaps table
-- Tracks user requests that the AI agent couldn't fulfill
-- Used to identify what new features/tools users need

CREATE TABLE IF NOT EXISTS ai_capability_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_request TEXT NOT NULL,
  reason TEXT NOT NULL,
  suggested_workaround TEXT,
  category TEXT DEFAULT 'missing_tool' CHECK (category IN ('missing_tool', 'permission_denied', 'integration_needed', 'out_of_scope')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- For analytics
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

-- Create index for querying by organization
CREATE INDEX IF NOT EXISTS idx_ai_capability_gaps_org_id ON ai_capability_gaps(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_capability_gaps_category ON ai_capability_gaps(category);
CREATE INDEX IF NOT EXISTS idx_ai_capability_gaps_created_at ON ai_capability_gaps(created_at DESC);

-- RLS Policies
ALTER TABLE ai_capability_gaps ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access to ai_capability_gaps"
  ON ai_capability_gaps
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can view capability gaps for their organization
CREATE POLICY "Admins can view ai_capability_gaps"
  ON ai_capability_gaps
  FOR SELECT
  TO authenticated
  USING (
    has_org_role((select auth.uid()), organization_id, ARRAY['Owner', 'Admin'])
  );

-- Add helpful comment
COMMENT ON TABLE ai_capability_gaps IS 'Tracks user requests that the AI agent could not fulfill, helping identify needed features';
