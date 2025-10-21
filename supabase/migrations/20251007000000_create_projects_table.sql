-- Create projects table for tracking project workflow (lightweight kanban tracker)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to quote (this is the only real data - everything else is from the quote)
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,

  -- Workflow status (which column it's in)
  workflow_status TEXT NOT NULL DEFAULT 'Unassigned',

  -- Organization
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Order for kanban board
  board_order INTEGER DEFAULT 0,

  -- Ensure one project per quote per organization
  UNIQUE(quote_id, organization_id)
);

-- Create workflow columns table (customizable workflow stages)
CREATE TABLE IF NOT EXISTS project_workflow_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  column_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique column names per organization
  UNIQUE(organization_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_organization ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_quote ON projects(quote_id);
CREATE INDEX IF NOT EXISTS idx_projects_workflow_status ON projects(workflow_status);
CREATE INDEX IF NOT EXISTS idx_project_workflow_columns_org ON project_workflow_columns(organization_id);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_workflow_columns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view projects in their organization"
  ON projects FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects in their organization"
  ON projects FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update projects in their organization"
  ON projects FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete projects in their organization"
  ON projects FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for workflow columns
CREATE POLICY "Users can view workflow columns in their organization"
  ON project_workflow_columns FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage workflow columns"
  ON project_workflow_columns FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND role IN ('Owner', 'Admin')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_workflow_columns_updated_at
  BEFORE UPDATE ON project_workflow_columns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create default workflow columns for an organization
CREATE OR REPLACE FUNCTION create_default_workflow_columns(org_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO project_workflow_columns (organization_id, name, color, column_order, is_default)
  VALUES
    (org_id, 'Unassigned', '#94A3B8', 0, true);
END;
$$ LANGUAGE plpgsql;

-- Insert default "Unassigned" column for all existing organizations
DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP
    PERFORM create_default_workflow_columns(org.id);
  END LOOP;
END $$;

-- Trigger to create default workflow columns when a new organization is created
CREATE OR REPLACE FUNCTION create_workflow_columns_for_new_org()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_workflow_columns(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_workflow_columns_for_new_org
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_workflow_columns_for_new_org();

-- Function to automatically create project when quote is won
CREATE OR REPLACE FUNCTION create_project_on_quote_won()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if status changed to 'Won'
  IF NEW.status = 'Won' AND (OLD.status IS NULL OR OLD.status != 'Won') THEN
    -- Create project in Unassigned column
    INSERT INTO projects (quote_id, workflow_status, organization_id)
    VALUES (NEW.id, 'Unassigned', NEW.organization_id)
    ON CONFLICT (quote_id, organization_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on quotes table to auto-create projects
CREATE TRIGGER trigger_create_project_on_quote_won
  AFTER INSERT OR UPDATE OF status ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION create_project_on_quote_won();
