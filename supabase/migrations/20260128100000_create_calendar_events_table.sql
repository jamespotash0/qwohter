-- =============================================================================
-- Calendar Events Table
-- =============================================================================
-- Stores user-created calendar events (meetings, site visits, follow-ups, etc.)
-- Aggregation with proposals, tasks, and reminders happens at the service layer.

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core fields
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT false,

  -- Classification
  event_type TEXT NOT NULL DEFAULT 'Custom'
    CHECK (event_type IN ('Custom', 'Meeting', 'Site Visit', 'Follow Up', 'Deadline', 'Milestone', 'Delivery', 'Installation')),
  color TEXT DEFAULT '#3B82F6',

  -- Linked entities (nullable — only populated when event is linked)
  linked_proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  linked_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  linked_task_id UUID REFERENCES project_tasks(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_calendar_events_organization ON calendar_events(organization_id);
CREATE INDEX idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX idx_calendar_events_start_date ON calendar_events(start_date);
CREATE INDEX idx_calendar_events_date_range ON calendar_events(organization_id, start_date);
CREATE INDEX idx_calendar_events_event_type ON calendar_events(event_type);
CREATE INDEX idx_calendar_events_linked_proposal ON calendar_events(linked_proposal_id) WHERE linked_proposal_id IS NOT NULL;
CREATE INDEX idx_calendar_events_linked_task ON calendar_events(linked_task_id) WHERE linked_task_id IS NOT NULL;

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view organization calendar events"
  ON calendar_events FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create organization calendar events"
  ON calendar_events FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update organization calendar events"
  ON calendar_events FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete organization calendar events"
  ON calendar_events FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- Updated_at Trigger
-- =============================================================================

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Enable Realtime
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;
