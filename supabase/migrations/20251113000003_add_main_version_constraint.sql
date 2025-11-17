/**
 * Add constraint to ensure projects are only linked to main version quotes
 *
 * This prevents creating projects for quote versions that aren't the main version.
 * This constraint ensures data integrity at the database level.
 */

BEGIN;

-- ============================================================================
-- Add check constraint
-- ============================================================================

-- This constraint checks that the linked quote has BOTH:
-- 1. is_main_version = true
-- 2. status = 'Won'
-- We use a function because CHECK constraints can't directly reference other tables

CREATE OR REPLACE FUNCTION check_quote_is_main_version_and_won(quote_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_main BOOLEAN;
  quote_status TEXT;
BEGIN
  SELECT is_main_version, status INTO is_main, quote_status
  FROM public.quotes
  WHERE id = quote_id_param;

  -- Return true only if the quote is the main version AND has Won status
  RETURN COALESCE(is_main, false) AND COALESCE(quote_status, '') = 'Won';
END;
$$ LANGUAGE plpgsql STABLE;

-- Add constraint using the function
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_must_link_to_main_version_and_won;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_must_link_to_main_version_and_won
  CHECK (check_quote_is_main_version_and_won(quote_id));

COMMENT ON CONSTRAINT projects_must_link_to_main_version_and_won ON public.projects IS
  'Ensures projects are only created for main version quotes that have Won status';

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
/*
 * If you need to rollback this migration:
 *
 * BEGIN;
 *
 * ALTER TABLE public.projects
 *   DROP CONSTRAINT IF EXISTS projects_must_link_to_main_version_and_won;
 *
 * DROP FUNCTION IF EXISTS check_quote_is_main_version_and_won(UUID);
 *
 * COMMIT;
 */
