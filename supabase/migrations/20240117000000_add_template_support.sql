-- =====================================================
-- Migration: Add Template Library Support to Forms
-- =====================================================
-- Description:
--   Extends the forms table to support a template library system.
--   - System templates (organization_id = NULL) can be browsed by all users
--   - Users can copy templates to create their own customized forms
--   - Tracks template lineage using existing form metadata
--
-- Changes:
--   1. Add is_template column (default false)
--   2. Add copied_from_form_id to track template lineage
--   3. Modify constraints to allow NULL organization_id for system templates
--
-- Note: Uses existing columns for template metadata:
--   - name: Template name
--   - description: Template description
--   - form_type: Template category (e.g., "Kwik-Wall", "Commercial")
-- =====================================================

-- Step 1: Add new columns to forms table
ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS copied_from_form_id uuid REFERENCES forms(id) ON DELETE SET NULL;

-- Step 2: Add comments for documentation
COMMENT ON COLUMN public.forms.is_template IS 'Identifies if this form is a system template (true) or regular form (false)';
COMMENT ON COLUMN public.forms.copied_from_form_id IS 'References the form/template this form was copied from (tracks lineage)';

-- Step 3: Create indexes for template queries
CREATE INDEX IF NOT EXISTS idx_forms_is_template
  ON public.forms(is_template)
  WHERE is_template = true;

CREATE INDEX IF NOT EXISTS idx_forms_copied_from_form
  ON public.forms(copied_from_form_id)
  WHERE copied_from_form_id IS NOT NULL;

-- Step 4: Modify organization_id constraint to allow NULL for system templates
-- Drop existing NOT NULL constraint if it exists
DO $
BEGIN
  -- Check if organization_id has NOT NULL constraint
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'forms'
      AND column_name = 'organization_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.forms
      ALTER COLUMN organization_id DROP NOT NULL;

    RAISE NOTICE 'organization_id constraint modified to allow NULL for system templates';
  END IF;
END $;

-- Step 5: Add check constraint to ensure templates have NULL organization_id
ALTER TABLE public.forms
  DROP CONSTRAINT IF EXISTS forms_template_organization_check;

ALTER TABLE public.forms
  ADD CONSTRAINT forms_template_organization_check
  CHECK (
    (is_template = true AND organization_id IS NULL) OR
    (is_template = false AND organization_id IS NOT NULL)
  );

-- =====================================================
-- Verification Queries (run manually to verify)
-- =====================================================

-- Query to check new columns were added:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'forms' AND column_name IN (
--   'is_template', 'copied_from_form_id'
-- );

-- Query to check indexes were created:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'forms' AND indexname IN (
--   'idx_forms_is_template', 'idx_forms_copied_from_form'
-- );

-- Query to check constraints:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.forms'::regclass
--   AND conname = 'forms_template_organization_check';

-- Query to view system templates:
-- SELECT id, name, form_type, description, is_template, organization_id
-- FROM forms
-- WHERE is_template = true AND organization_id IS NULL;
