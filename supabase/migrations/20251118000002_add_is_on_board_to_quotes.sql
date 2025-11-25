-- Add is_on_board field to quotes table for tracking project board status
-- This eliminates the need for separate queries to the projects table

-- Add the column
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS is_on_board BOOLEAN DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_quotes_is_on_board ON quotes(is_on_board);

-- Update existing quotes based on current projects table
UPDATE quotes
SET is_on_board = true
WHERE id IN (SELECT quote_id FROM projects);

-- Create trigger function to keep is_on_board in sync with projects table
CREATE OR REPLACE FUNCTION sync_quote_on_board_status()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- When project is created, set is_on_board to true
    UPDATE quotes SET is_on_board = true WHERE id = NEW.quote_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    -- When project is deleted, set is_on_board to false
    UPDATE quotes SET is_on_board = false WHERE id = OLD.quote_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on projects table to automatically sync is_on_board
DROP TRIGGER IF EXISTS sync_quote_on_board_after_project_changes ON projects;
CREATE TRIGGER sync_quote_on_board_after_project_changes
AFTER INSERT OR DELETE ON projects
FOR EACH ROW
EXECUTE FUNCTION sync_quote_on_board_status();

-- Create reverse trigger function to keep projects table in sync with is_on_board
CREATE OR REPLACE FUNCTION sync_projects_from_is_on_board()
RETURNS TRIGGER AS $$
DECLARE
  next_order INTEGER;
BEGIN
  -- When is_on_board changes from false to true, create project if it doesn't exist
  IF (NEW.is_on_board = true AND (OLD.is_on_board = false OR OLD.is_on_board IS NULL)) THEN
    -- Check if project already exists
    IF NOT EXISTS (SELECT 1 FROM projects WHERE quote_id = NEW.id) THEN
      -- Get the next board_order for the workflow_status
      SELECT COALESCE(MAX(board_order), 0) + 1 INTO next_order
      FROM projects
      WHERE organization_id = NEW.organization_id AND workflow_status = 'To Do';

      -- Insert project
      INSERT INTO projects (quote_id, organization_id, workflow_status, board_order, priority)
      VALUES (NEW.id, NEW.organization_id, 'To Do', next_order, NULL);
    END IF;
  -- When is_on_board changes from true to false, delete project if it exists
  ELSIF (NEW.is_on_board = false AND OLD.is_on_board = true) THEN
    DELETE FROM projects WHERE quote_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on quotes table to sync projects when is_on_board changes
DROP TRIGGER IF EXISTS sync_projects_on_is_on_board_change ON quotes;
CREATE TRIGGER sync_projects_on_is_on_board_change
AFTER UPDATE OF is_on_board ON quotes
FOR EACH ROW
WHEN (OLD.is_on_board IS DISTINCT FROM NEW.is_on_board)
EXECUTE FUNCTION sync_projects_from_is_on_board();

-- Add comment for documentation
COMMENT ON COLUMN quotes.is_on_board IS 'Tracks whether this quote is currently on the project board (has a row in projects table). Automatically synced bidirectionally via triggers.';
