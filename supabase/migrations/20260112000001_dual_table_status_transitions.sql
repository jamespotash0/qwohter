-- ============================================================================
-- DUAL TABLE SUPPORT FOR PROPOSAL STATUS TRANSITIONS
-- ============================================================================
-- This migration allows proposal_status_transitions to work with BOTH
-- the legacy `quotes` table and the new `proposals` table during migration.
-- ============================================================================

-- Step 1: Drop the existing foreign key constraint that ties to quotes only
ALTER TABLE proposal_status_transitions
  DROP CONSTRAINT IF EXISTS proposal_status_transitions_proposal_id_fkey;

-- Step 2: Create trigger function for the proposals table
-- (The trigger for quotes table already exists)
CREATE OR REPLACE FUNCTION public.track_proposal_status_change_new()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only proceed if status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN

    -- Log the status change to audit table
    INSERT INTO proposal_status_transitions (
      proposal_id,
      organization_id,
      from_status,
      to_status,
      transitioned_by,
      transitioned_at,
      notes
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      OLD.status,
      NEW.status,
      auth.uid(),
      NOW(),
      CASE
        WHEN OLD.status IS NULL THEN 'Proposal created (new system)'
        ELSE 'Status changed from ' || COALESCE(OLD.status, 'null') || ' to ' || NEW.status
      END
    );

    -- Update timestamp fields based on new status (CASE-INSENSITIVE)
    IF LOWER(COALESCE(NEW.status, '')) = 'submitted' AND NEW.submitted_at IS NULL THEN
      NEW.submitted_at = NOW();
    ELSIF LOWER(COALESCE(NEW.status, '')) = 'won' AND NEW.won_at IS NULL THEN
      NEW.won_at = NOW();
    ELSIF LOWER(COALESCE(NEW.status, '')) = 'rejected' AND NEW.rejected_at IS NULL THEN
      NEW.rejected_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Step 3: Create trigger on the proposals table
DROP TRIGGER IF EXISTS track_proposal_status_change ON public.proposals;

CREATE TRIGGER track_proposal_status_change
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.track_proposal_status_change_new();

-- Step 4: Also handle INSERT for initial status on proposals
CREATE OR REPLACE FUNCTION public.track_proposal_initial_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log initial status on creation if status is set
  IF NEW.status IS NOT NULL THEN
    INSERT INTO proposal_status_transitions (
      proposal_id,
      organization_id,
      from_status,
      to_status,
      transitioned_by,
      transitioned_at,
      notes
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      NULL,
      NEW.status,
      auth.uid(),
      NOW(),
      'Proposal created with initial status: ' || NEW.status
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS track_proposal_initial_status ON public.proposals;

CREATE TRIGGER track_proposal_initial_status
  AFTER INSERT ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.track_proposal_initial_status();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  -- Check triggers on proposals table
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'track_proposal_status_change'
    AND tgrelid = 'public.proposals'::regclass
  ) THEN
    RAISE NOTICE '✅ Trigger track_proposal_status_change attached to proposals table';
  ELSE
    RAISE WARNING '⚠️ Trigger track_proposal_status_change not found on proposals table';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'track_proposal_initial_status'
    AND tgrelid = 'public.proposals'::regclass
  ) THEN
    RAISE NOTICE '✅ Trigger track_proposal_initial_status attached to proposals table';
  ELSE
    RAISE WARNING '⚠️ Trigger track_proposal_initial_status not found on proposals table';
  END IF;

  -- Verify foreign key was dropped
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'proposal_status_transitions_proposal_id_fkey'
    AND table_name = 'proposal_status_transitions'
  ) THEN
    RAISE NOTICE '✅ Foreign key constraint removed - now supports both quotes and proposals';
  ELSE
    RAISE WARNING '⚠️ Foreign key constraint still exists';
  END IF;
END $$;

-- ============================================================================
-- CURRENT STATE: DUAL TABLE SUPPORT
-- ============================================================================
-- This migration enables status tracking for BOTH tables simultaneously:
--
-- QUOTES TABLE (legacy):
--   - Trigger: track_proposal_status_change (from migration 20251204000003)
--   - Function: track_proposal_status_change()
--   - Status: Active - continues to log status changes
--
-- PROPOSALS TABLE (new system):
--   - Trigger: track_proposal_status_change (UPDATE)
--   - Trigger: track_proposal_initial_status (INSERT)
--   - Function: track_proposal_status_change_new()
--   - Function: track_proposal_initial_status()
--   - Status: Active - logs status changes for new proposals
--
-- FOREIGN KEY:
--   - Removed to allow proposal_id from either table
--   - No referential integrity during migration period
--
-- ============================================================================
-- FUTURE: AFTER FULL MIGRATION TO PROPOSALS
-- ============================================================================
-- Once all quotes are migrated to proposals and quotes table is deprecated:
--
-- 1. Drop the trigger on quotes table:
--    DROP TRIGGER IF EXISTS track_proposal_status_change ON public.quotes;
--
-- 2. Drop the old trigger function:
--    DROP FUNCTION IF EXISTS public.track_proposal_status_change();
--
-- 3. Rename the new function to the standard name:
--    ALTER FUNCTION public.track_proposal_status_change_new()
--      RENAME TO track_proposal_status_change;
--
-- 4. Restore foreign key constraint to proposals only:
--    ALTER TABLE proposal_status_transitions
--      ADD CONSTRAINT proposal_status_transitions_proposal_id_fkey
--      FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE;
-- ============================================================================
