-- Remove automatic project creation on Won status
-- Keep automatic project deletion when status changes FROM Won to anything else

CREATE OR REPLACE FUNCTION sync_project_on_quote_status_change()
RETURNS TRIGGER AS $$
DECLARE
  deleted_status TEXT;
  deleted_order INTEGER;
BEGIN
  -- Only handle deletion: If status changed FROM 'Won' to anything else, delete project
  IF OLD.status = 'Won' AND NEW.status != 'Won' THEN
    -- Store the workflow_status before deletion for reordering
    SELECT workflow_status, board_order INTO deleted_status, deleted_order
    FROM projects
    WHERE quote_id = NEW.id AND organization_id = NEW.organization_id;

    -- Delete the project
    DELETE FROM projects
    WHERE quote_id = NEW.id AND organization_id = NEW.organization_id;

    -- Reorder remaining projects in that column
    IF deleted_status IS NOT NULL THEN
      UPDATE projects
      SET board_order = board_order - 1
      WHERE workflow_status = deleted_status
        AND organization_id = NEW.organization_id
        AND board_order > deleted_order;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_project_on_quote_status_change() IS 'Automatically removes projects from board when quote status changes FROM Won to anything else. Does NOT auto-create projects.';
