-- Fix RLS policy for project_workflow_columns to allow all organization members to create columns
-- Previously only Owners and Admins could create columns, now any member can

-- Drop the old policies
DROP POLICY IF EXISTS "Admins can manage workflow columns" ON project_workflow_columns;
DROP POLICY IF EXISTS "Users can view workflow columns in their organization" ON project_workflow_columns;

-- Recreate SELECT policy (allow all members to view)
CREATE POLICY "Users can view workflow columns in their organization"
  ON project_workflow_columns FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
    )
  );

-- Allow all members to create workflow columns in their organization
CREATE POLICY "Users can create workflow columns in their organization"
  ON project_workflow_columns FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
    )
  );

-- Allow all members to update workflow columns in their organization
CREATE POLICY "Users can update workflow columns in their organization"
  ON project_workflow_columns FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
    )
  );

-- Allow all members to delete workflow columns in their organization
-- But prevent deletion of default columns (is_default = true)
CREATE POLICY "Users can delete workflow columns in their organization"
  ON project_workflow_columns FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
    )
    AND is_default = false  -- Cannot delete default columns
  );

-- Add a check constraint to prevent accidental deletion of default columns
ALTER TABLE project_workflow_columns
  ADD CONSTRAINT prevent_default_column_deletion
  CHECK (is_default = false OR id IS NOT NULL);

-- Create a function to prevent deletion of default columns via trigger
CREATE OR REPLACE FUNCTION prevent_default_column_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_default = true THEN
    RAISE EXCEPTION 'Cannot delete default workflow column. You can rename it instead.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent deletion of default columns
DROP TRIGGER IF EXISTS trigger_prevent_default_column_deletion ON project_workflow_columns;
CREATE TRIGGER trigger_prevent_default_column_deletion
  BEFORE DELETE ON project_workflow_columns
  FOR EACH ROW
  EXECUTE FUNCTION prevent_default_column_deletion();
