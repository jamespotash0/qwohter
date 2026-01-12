-- ============================================================================
-- FIX: PROJECT CONSTRAINT FOR PROPOSALS ONLY
-- ============================================================================
-- The projects table uses proposal_id to link to proposals.
-- The old constraint checked quote_id against the quotes table.
-- This migration updates the constraint to check proposal_id against proposals.
-- ============================================================================

-- Drop the old constraint function and constraint
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_must_link_to_main_version_and_won;

DROP FUNCTION IF EXISTS check_quote_is_main_version_and_won(UUID);
DROP FUNCTION IF EXISTS check_project_linked_to_main_version_and_won(UUID, UUID);

-- Create new function that checks proposal_id
CREATE OR REPLACE FUNCTION check_proposal_is_main_version_and_won(p_proposal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_main BOOLEAN;
  proposal_status TEXT;
BEGIN
  -- proposal_id must be provided
  IF p_proposal_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check proposal
  SELECT is_main_version, status INTO is_main, proposal_status
  FROM public.proposals
  WHERE id = p_proposal_id;

  -- Return true only if the proposal is the main version AND has Won status
  RETURN COALESCE(is_main, false) AND COALESCE(proposal_status, '') = 'Won';
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_proposal_is_main_version_and_won(UUID) IS
'Checks that a proposal has is_main_version=true AND status=Won';

-- Add the new constraint
ALTER TABLE public.projects
  ADD CONSTRAINT projects_must_link_to_main_version_and_won
  CHECK (check_proposal_is_main_version_and_won(proposal_id));

COMMENT ON CONSTRAINT projects_must_link_to_main_version_and_won ON public.projects IS
  'Ensures projects are only created for main version proposals that have Won status';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Project constraint updated to check proposal_id only';
  RAISE NOTICE '   - Projects must be linked to proposals with is_main_version=true AND status=Won';
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
/*
 * If you need to rollback this migration:
 *
 * ALTER TABLE public.projects
 *   DROP CONSTRAINT IF EXISTS projects_must_link_to_main_version_and_won;
 *
 * DROP FUNCTION IF EXISTS check_proposal_is_main_version_and_won(UUID);
 */
