-- Allow deletion of ANY workflow column (including default columns)
-- This aligns with the UI changes that removed the is_default restriction

-- Drop the trigger that prevents deletion of default columns
DROP TRIGGER IF EXISTS trigger_prevent_default_column_deletion ON project_workflow_columns;

-- Drop the function that was used by the trigger
DROP FUNCTION IF EXISTS prevent_default_column_deletion();

-- Drop the old DELETE policy
DROP POLICY IF EXISTS "Users can delete workflow columns in their organization" ON project_workflow_columns;

-- Recreate DELETE policy WITHOUT the is_default check
CREATE POLICY "Users can delete workflow columns in their organization"
  ON project_workflow_columns FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
    )
  );

-- Remove the constraint if it exists (it's a meaningless constraint anyway)
ALTER TABLE project_workflow_columns
  DROP CONSTRAINT IF EXISTS prevent_default_column_deletion;

COMMENT ON POLICY "Users can delete workflow columns in their organization" ON project_workflow_columns
  IS 'Allow any organization member to delete workflow columns. Users can now delete default columns.';
