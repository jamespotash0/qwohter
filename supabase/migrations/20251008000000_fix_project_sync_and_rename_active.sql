-- First, update any old or lowercase priority values
UPDATE projects SET priority = NULL WHERE LOWER(priority) IN ('normal', 'medium') AND priority NOT IN ('Medium');
UPDATE projects SET priority = 'Highest' WHERE LOWER(priority) = 'highest';
UPDATE projects SET priority = 'High' WHERE LOWER(priority) = 'high';
UPDATE projects SET priority = 'Medium' WHERE LOWER(priority) = 'medium' AND priority != 'Medium';
UPDATE projects SET priority = 'Low' WHERE LOWER(priority) = 'low';
UPDATE projects SET priority = 'Lowest' WHERE LOWER(priority) = 'lowest';

-- Drop old constraint (it may have various generated names)
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'projects'::regclass
    AND conname LIKE '%priority%'
    LIMIT 1;

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE projects DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- Add new constraint with proper NULL handling
ALTER TABLE projects
ADD CONSTRAINT projects_priority_check
CHECK (priority IS NULL OR priority = ANY (ARRAY['Highest', 'High', 'Medium', 'Low', 'Lowest']));

-- Ensure priority defaults to NULL
ALTER TABLE projects
ALTER COLUMN priority SET DEFAULT NULL;

-- Update the trigger to handle project creation AND deletion based on quote status
-- Only "Won" status creates projects. Changing FROM "Won" to anything else removes the project.
CREATE OR REPLACE FUNCTION sync_project_on_quote_status_change()
RETURNS TRIGGER AS $$
DECLARE
  next_board_order INTEGER;
BEGIN
  -- If status changed TO 'Won', create project
  IF NEW.status = 'Won' AND (OLD.status IS NULL OR OLD.status != 'Won') THEN
    -- Get the next board_order for the Active column (1-based indexing)
    SELECT COALESCE(MAX(board_order), 0) + 1 INTO next_board_order
    FROM projects
    WHERE workflow_status = 'Active' AND organization_id = NEW.organization_id;

    INSERT INTO projects (quote_id, workflow_status, organization_id, board_order)
    VALUES (NEW.id, 'Active', NEW.organization_id, next_board_order)
    ON CONFLICT (quote_id, organization_id) DO NOTHING;

  -- If status changed FROM 'Won' to anything else, delete project and reorder remaining
  ELSIF OLD.status = 'Won' AND NEW.status != 'Won' THEN
    -- Store the workflow_status before deletion for reordering
    DECLARE
      deleted_status TEXT;
      deleted_order INTEGER;
    BEGIN
      SELECT workflow_status, board_order INTO deleted_status, deleted_order
      FROM projects
      WHERE quote_id = NEW.id AND organization_id = NEW.organization_id;

      -- Delete the project
      DELETE FROM projects
      WHERE quote_id = NEW.id AND organization_id = NEW.organization_id;

      -- Reorder remaining projects in that column
      UPDATE projects
      SET board_order = board_order - 1
      WHERE workflow_status = deleted_status
        AND organization_id = NEW.organization_id
        AND board_order > deleted_order;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS trigger_create_project_on_quote_won ON quotes;

CREATE TRIGGER trigger_sync_project_on_quote_status_change
  AFTER INSERT OR UPDATE OF status ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_on_quote_status_change();

-- Rename "Unassigned" column to "Active" for all organizations
UPDATE project_workflow_columns
SET name = 'Active'
WHERE name = 'Unassigned';

-- Update existing projects with "Unassigned" status to "Active"
UPDATE projects
SET workflow_status = 'Active'
WHERE workflow_status = 'Unassigned';

-- Update the default workflow column creation function
CREATE OR REPLACE FUNCTION create_default_workflow_columns(org_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO project_workflow_columns (organization_id, name, color, column_order, is_default)
  VALUES
    (org_id, 'Active', '#94A3B8', 0, true)
  ON CONFLICT (organization_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Update default workflow_status in projects table
ALTER TABLE projects
ALTER COLUMN workflow_status SET DEFAULT 'Active';

-- Set proper board_order values for existing projects (grouped by workflow_status)
-- Using 1-based indexing (1, 2, 3...)
WITH numbered_projects AS (
  SELECT
    id,
    workflow_status,
    ROW_NUMBER() OVER (PARTITION BY workflow_status ORDER BY created_at ASC) AS new_order
  FROM projects
)
UPDATE projects
SET board_order = numbered_projects.new_order
FROM numbered_projects
WHERE projects.id = numbered_projects.id;

COMMENT ON TABLE projects IS 'Kanban board for tracking won quotes through project workflow stages';
COMMENT ON COLUMN projects.workflow_status IS 'Current workflow stage (e.g., Active, In Progress, Review, Complete)';
COMMENT ON COLUMN projects.priority IS 'Project priority level: Highest, High, Medium, Low, Lowest (NULL for no priority - default)';
COMMENT ON COLUMN projects.board_order IS 'Order of the card within its workflow column (1-based index: 1, 2, 3...)';
