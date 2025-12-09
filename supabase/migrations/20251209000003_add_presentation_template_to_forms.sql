-- Migration: Add presentation_template column to forms table
-- Date: 2025-12-09
-- Description: Stores the presentation/document template design for each form.
--              Proposals render dynamically from this template + their form_data.
--              NO snapshot approach - always live rendering from current template.

-- ============================================================================
-- ADD COLUMN
-- ============================================================================

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS presentation_template jsonb;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.forms.presentation_template IS
  'JSONB storing the presentation/document template design. Contains layout, styling, and {{placeholder}} references to form fields. Proposals render dynamically from this template combined with their form_data values.';

-- ============================================================================
-- DEFAULT VALUE FOR EXISTING FORMS
-- ============================================================================

-- Set a basic default template structure for any existing forms without one
UPDATE public.forms
SET presentation_template = jsonb_build_object(
  'version', 1,
  'layout', 'default',
  'sections', jsonb_build_array()
)
WHERE presentation_template IS NULL;
