-- Fix: Project Board default column handling
-- Default columns: Active, Completed (user can rename/delete any)
-- When sending to board: use first column, or create "Active" if none exist

-- Update the sync function to dynamically use the first column
CREATE OR REPLACE FUNCTION public.sync_projects_from_is_on_board()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  next_order INTEGER;
  first_column_name TEXT;
BEGIN
  -- When is_on_board changes from false to true, create project if it doesn't exist
  IF (NEW.is_on_board = true AND (OLD.is_on_board = false OR OLD.is_on_board IS NULL)) THEN
    -- Check if project already exists
    IF NOT EXISTS (SELECT 1 FROM projects WHERE quote_id = NEW.id) THEN

      -- Get the first column name (by order) for this organization
      SELECT name INTO first_column_name
      FROM project_workflow_columns
      WHERE organization_id = NEW.organization_id
      ORDER BY column_order ASC
      LIMIT 1;

      -- If no columns exist, create just the "Active" column
      IF first_column_name IS NULL THEN
        INSERT INTO project_workflow_columns (organization_id, name, color, column_order, is_default)
        VALUES (NEW.organization_id, 'Active', '#3B82F6', 0, true);

        first_column_name := 'Active';
      END IF;

      -- Get the next board_order for the target column
      SELECT COALESCE(MAX(board_order), 0) + 1 INTO next_order
      FROM projects
      WHERE organization_id = NEW.organization_id
        AND workflow_status = first_column_name;

      -- Insert project into the first column
      INSERT INTO projects (quote_id, organization_id, workflow_status, board_order, priority)
      VALUES (NEW.id, NEW.organization_id, first_column_name, next_order, NULL);
    END IF;

  -- When is_on_board changes from true to false, delete the project
  ELSIF (NEW.is_on_board = false AND OLD.is_on_board = true) THEN
    DELETE FROM projects WHERE quote_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Update default columns function: Active and Completed
CREATE OR REPLACE FUNCTION public.create_default_workflow_columns(org_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO project_workflow_columns (organization_id, name, color, column_order, is_default)
  VALUES
    (org_id, 'Active', '#3B82F6', 0, true),     -- Blue
    (org_id, 'Completed', '#10B981', 1, true)   -- Green
  ON CONFLICT (organization_id, name) DO NOTHING;
END;
$function$;

-- Create default columns for ALL organizations (including those with no columns)
DO $$
DECLARE
  org RECORD;
BEGIN
  -- Loop through ALL organizations
  FOR org IN SELECT id FROM public.organizations LOOP
    -- Create default columns (Active and Completed) for each org
    PERFORM create_default_workflow_columns(org.id);
  END LOOP;
END $$;

COMMENT ON FUNCTION public.sync_projects_from_is_on_board IS 'Creates/deletes project when quote is_on_board changes. Uses first column, creates Active if none exist.';
