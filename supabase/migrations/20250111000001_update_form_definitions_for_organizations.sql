-- Update form_definitions to support organization-scoped forms
-- Add organization_id column and update RLS policies

-- Add organization_id column
ALTER TABLE form_definitions
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for organization_id
CREATE INDEX IF NOT EXISTS idx_form_definitions_organization_id ON form_definitions(organization_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view their own forms" ON form_definitions;
DROP POLICY IF EXISTS "Users can create their own forms" ON form_definitions;
DROP POLICY IF EXISTS "Users can update their own forms" ON form_definitions;
DROP POLICY IF EXISTS "Users can delete their own forms" ON form_definitions;

-- Create new organization-scoped RLS policies
CREATE POLICY "Users can view forms in their organization"
  ON form_definitions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create forms in their organization"
  ON form_definitions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update forms in their organization"
  ON form_definitions FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete forms in their organization"
  ON form_definitions FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );

-- Update form_submissions for organization support
ALTER TABLE form_submissions
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_form_submissions_organization_id ON form_submissions(organization_id);

-- Drop old submission policies
DROP POLICY IF EXISTS "Users can view their own submissions" ON form_submissions;
DROP POLICY IF EXISTS "Users can create their own submissions" ON form_submissions;
DROP POLICY IF EXISTS "Users can update their own submissions" ON form_submissions;
DROP POLICY IF EXISTS "Users can delete their own submissions" ON form_submissions;

-- Create new organization-scoped submission policies
CREATE POLICY "Users can view submissions in their organization"
  ON form_submissions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create submissions in their organization"
  ON form_submissions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update submissions in their organization"
  ON form_submissions FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete submissions in their organization"
  ON form_submissions FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );
