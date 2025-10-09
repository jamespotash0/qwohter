-- Create table to track quote status changes for analytics
CREATE TABLE quote_status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) NOT NULL,

  -- Status tracking
  from_status TEXT,
  to_status TEXT NOT NULL,
  transitioned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Who made the change
  transitioned_by UUID REFERENCES auth.users(id),

  -- Optional metadata
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Performance indexes for analytics queries
CREATE INDEX idx_transitions_quote ON quote_status_transitions(quote_id);
CREATE INDEX idx_transitions_org_date ON quote_status_transitions(organization_id, transitioned_at DESC);
CREATE INDEX idx_transitions_status_date ON quote_status_transitions(to_status, transitioned_at DESC);

-- Specialized indexes for conversion metrics
CREATE INDEX idx_transitions_won ON quote_status_transitions(organization_id, transitioned_at DESC)
  WHERE to_status = 'Won';
CREATE INDEX idx_transitions_rejected ON quote_status_transitions(organization_id, transitioned_at DESC)
  WHERE to_status = 'Rejected';
CREATE INDEX idx_transitions_submitted ON quote_status_transitions(organization_id, transitioned_at DESC)
  WHERE to_status = 'Submitted';

-- Enable RLS
ALTER TABLE quote_status_transitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view transitions in their org" ON quote_status_transitions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

CREATE POLICY "System can insert transitions" ON quote_status_transitions
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

COMMENT ON TABLE quote_status_transitions IS 'Tracks every status change for quotes - enables timeline analytics, conversion tracking, and time-to-close metrics';
