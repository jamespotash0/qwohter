-- Create reminders table for general and quote-linked reminders
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  reminder_type TEXT NOT NULL DEFAULT 'General' CHECK (reminder_type IN ('Quote_Follow_Up', 'General', 'Meeting', 'Deadline', 'Task')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Dismissed')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_reminders_organization ON reminders(organization_id);
CREATE INDEX idx_reminders_created_by ON reminders(created_by);
CREATE INDEX idx_reminders_quote ON reminders(quote_id);
CREATE INDEX idx_reminders_due_date ON reminders(due_date);
CREATE INDEX idx_reminders_status ON reminders(status);

-- Enable RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reminders
-- Users can view reminders in their organization
CREATE POLICY "Users can view organization reminders"
  ON reminders FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM memberships
      WHERE user_id = auth.uid()
    )
  );

-- Users can create reminders in their organization
CREATE POLICY "Users can create organization reminders"
  ON reminders FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM memberships
      WHERE user_id = auth.uid()
    )
  );

-- Users can update reminders in their organization
CREATE POLICY "Users can update organization reminders"
  ON reminders FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM memberships
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete reminders in their organization
CREATE POLICY "Users can delete organization reminders"
  ON reminders FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM memberships
      WHERE user_id = auth.uid()
    )
  );

-- Update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_reminders_updated_at();
