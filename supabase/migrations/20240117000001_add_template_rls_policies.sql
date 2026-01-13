-- =====================================================
-- Migration: RLS Policies for Template Library
-- =====================================================
-- Description:
--   Updates RLS policies to support the template library system.
--   - All authenticated users can read system templates (org_id = NULL)
--   - Regular forms maintain existing org-based security
--   - Only admins can create/modify system templates
--   - Users can copy templates to their organization
--
-- Security Model:
--   System Templates (org_id = NULL):
--     - SELECT: All authenticated users
--     - INSERT/UPDATE/DELETE: Super admins only
--
--   Regular Forms (org_id NOT NULL):
--     - All operations: Existing org-based policies
-- =====================================================

-- Step 1: Drop existing forms SELECT policy to recreate with template support
DROP POLICY IF EXISTS "forms_select_policy" ON public.forms;

-- Step 2: Create new SELECT policy that allows:
--   a) Organization members to see their org's forms
--   b) All authenticated users to see system templates
CREATE POLICY "forms_select_policy" ON public.forms
  FOR SELECT
  USING (
    -- Allow organization members to see their forms
    (
      organization_id IS NOT NULL
      AND is_active_member(auth.uid(), organization_id)
    )
    OR
    -- Allow all authenticated users to see system templates
    (
      organization_id IS NULL
      AND is_template = true
      AND auth.uid() IS NOT NULL
    )
  );

COMMENT ON POLICY "forms_select_policy" ON public.forms IS
  'Allows org members to view their forms and all authenticated users to view system templates';

-- Step 3: Ensure INSERT policy allows copying templates to organizations
-- Regular users can only create forms for their organization, NOT system templates
-- System templates must be created via direct SQL by database administrators
DROP POLICY IF EXISTS "forms_insert_policy" ON public.forms;

CREATE POLICY "forms_insert_policy" ON public.forms
  FOR INSERT
  WITH CHECK (
    -- Regular forms: must be org member and created_by must be current user
    organization_id IS NOT NULL
    AND is_active_member(auth.uid(), organization_id)
    AND created_by = auth.uid()
    AND is_template = false
  );

COMMENT ON POLICY "forms_insert_policy" ON public.forms IS
  'Allows org members to create forms. System templates must be created via SQL by database admins.';

-- Step 4: UPDATE policy - only allow updating organization forms, not system templates
DROP POLICY IF EXISTS "forms_update_policy" ON public.forms;

CREATE POLICY "forms_update_policy" ON public.forms
  FOR UPDATE
  USING (
    -- Regular forms: org members can update
    organization_id IS NOT NULL
    AND is_active_member(auth.uid(), organization_id)
    AND is_template = false
  )
  WITH CHECK (
    -- Ensure updates maintain the same security rules
    organization_id IS NOT NULL
    AND is_active_member(auth.uid(), organization_id)
    AND is_template = false
  );

COMMENT ON POLICY "forms_update_policy" ON public.forms IS
  'Allows org members to update their forms. System templates cannot be updated via app.';

-- Step 5: DELETE policy - only allow deleting organization forms, not system templates
DROP POLICY IF EXISTS "forms_delete_policy" ON public.forms;

CREATE POLICY "forms_delete_policy" ON public.forms
  FOR DELETE
  USING (
    -- Regular forms: org members can delete (soft delete via is_archived)
    organization_id IS NOT NULL
    AND is_active_member(auth.uid(), organization_id)
    AND is_template = false
  );

COMMENT ON POLICY "forms_delete_policy" ON public.forms IS
  'Allows org members to delete their forms. System templates cannot be deleted via app.';

-- =====================================================
-- Note: System Template Management
-- =====================================================
-- System templates (organization_id = NULL, is_template = true) can only be
-- created, updated, or deleted via direct SQL by database administrators.
--
-- Regular users can:
-- - View system templates (SELECT)
-- - Copy templates to their organization (INSERT with organization_id)
-- - Manage their organization's forms (INSERT/UPDATE/DELETE)
--
-- Regular users CANNOT:
-- - Create new system templates
-- - Modify existing system templates
-- - Delete system templates

-- =====================================================
-- Verification Queries (run manually to verify)
-- =====================================================

-- Query to check all policies on forms table:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'forms'
-- ORDER BY policyname;

-- Test query to verify template visibility:
-- SELECT id, name, is_template, organization_id, template_category
-- FROM forms
-- WHERE is_template = true;
