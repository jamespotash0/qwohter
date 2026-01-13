-- =====================================================
-- Migration: Complete RLS Policies for Document Templates
-- =====================================================
-- Description:
--   Complete RLS setup for document_templates and form_document_templates tables.
--   Includes CASCADE delete behavior for form links when templates are deleted.
-- =====================================================

-- =====================================================
-- DOCUMENT_TEMPLATES TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "document_templates_select_policy" ON public.document_templates;
DROP POLICY IF EXISTS "document_templates_insert_policy" ON public.document_templates;
DROP POLICY IF EXISTS "document_templates_update_policy" ON public.document_templates;
DROP POLICY IF EXISTS "document_templates_delete_policy" ON public.document_templates;

-- SELECT: Org members see their templates + all users see system templates
CREATE POLICY "document_templates_select_policy" ON public.document_templates
  FOR SELECT
  USING (
    (organization_id IS NOT NULL AND is_active_member(auth.uid(), organization_id))
    OR
    (organization_id IS NULL AND auth.uid() IS NOT NULL)
  );

-- INSERT: Org members can create templates
CREATE POLICY "document_templates_insert_policy" ON public.document_templates
  FOR INSERT
  WITH CHECK (
    organization_id IS NOT NULL
    AND is_active_member(auth.uid(), organization_id)
    AND created_by = auth.uid()
  );

-- UPDATE: Org members can update their templates (including soft delete)
CREATE POLICY "document_templates_update_policy" ON public.document_templates
  FOR UPDATE
  USING (
    organization_id IS NOT NULL
    AND is_active_member(auth.uid(), organization_id)
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND is_active_member(auth.uid(), organization_id)
  );

-- DELETE: Org members can hard delete their templates
CREATE POLICY "document_templates_delete_policy" ON public.document_templates
  FOR DELETE
  USING (
    organization_id IS NOT NULL
    AND is_active_member(auth.uid(), organization_id)
  );

-- =====================================================
-- FORM_DOCUMENT_TEMPLATES JUNCTION TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE public.form_document_templates ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "form_document_templates_select_policy" ON public.form_document_templates;
DROP POLICY IF EXISTS "form_document_templates_insert_policy" ON public.form_document_templates;
DROP POLICY IF EXISTS "form_document_templates_update_policy" ON public.form_document_templates;
DROP POLICY IF EXISTS "form_document_templates_delete_policy" ON public.form_document_templates;

-- SELECT: Users can see links for their org's forms
CREATE POLICY "form_document_templates_select_policy" ON public.form_document_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_document_templates.form_id
      AND f.organization_id IS NOT NULL
      AND is_active_member(auth.uid(), f.organization_id)
    )
  );

-- INSERT: Users can link templates to their org's forms
CREATE POLICY "form_document_templates_insert_policy" ON public.form_document_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_document_templates.form_id
      AND f.organization_id IS NOT NULL
      AND is_active_member(auth.uid(), f.organization_id)
    )
  );

-- DELETE: Users can unlink templates from their org's forms
CREATE POLICY "form_document_templates_delete_policy" ON public.form_document_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_document_templates.form_id
      AND f.organization_id IS NOT NULL
      AND is_active_member(auth.uid(), f.organization_id)
    )
  );

-- =====================================================
-- CASCADE DELETE: Remove junction rows when form OR template is deleted
-- =====================================================

-- CASCADE for document_template_id FK
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'form_document_templates_document_template_id_fkey'
    AND table_name = 'form_document_templates'
  ) THEN
    ALTER TABLE public.form_document_templates
    DROP CONSTRAINT form_document_templates_document_template_id_fkey;
  END IF;

  ALTER TABLE public.form_document_templates
  ADD CONSTRAINT form_document_templates_document_template_id_fkey
  FOREIGN KEY (document_template_id)
  REFERENCES public.document_templates(id)
  ON DELETE CASCADE;

  RAISE NOTICE 'Added CASCADE delete to document_template_id FK';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'document_template_id FK update skipped: %', SQLERRM;
END $$;

-- CASCADE for form_id FK (when form is deleted, remove the link)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'form_document_templates_form_id_fkey'
    AND table_name = 'form_document_templates'
  ) THEN
    ALTER TABLE public.form_document_templates
    DROP CONSTRAINT form_document_templates_form_id_fkey;
  END IF;

  ALTER TABLE public.form_document_templates
  ADD CONSTRAINT form_document_templates_form_id_fkey
  FOREIGN KEY (form_id)
  REFERENCES public.forms(id)
  ON DELETE CASCADE;

  RAISE NOTICE 'Added CASCADE delete to form_id FK';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'form_id FK update skipped: %', SQLERRM;
END $$;

-- =====================================================
-- Verification Query
-- =====================================================
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN ('document_templates', 'form_document_templates')
-- ORDER BY tablename, cmd;
