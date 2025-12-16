-- Migration: Drop tabs column from forms table
-- Date: 2025-12-16
-- Description: Remove legacy tabs column, form builder data now stored in metadata
-- ============================================================================

-- Drop the tabs column (it has a default so this is safe)
ALTER TABLE public.forms DROP COLUMN IF EXISTS tabs;

-- Add comment documenting the change
COMMENT ON TABLE public.forms IS 'Form templates. Structure data stored in metadata JSONB field.';
