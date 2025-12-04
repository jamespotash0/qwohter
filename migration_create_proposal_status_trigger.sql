-- ============================================================================
-- CREATE PROPOSAL STATUS TRACKING TRIGGER
-- ============================================================================
-- Creates trigger to automatically track proposal status changes
-- Mirrors the quote_status_transitions trigger functionality
--
-- This trigger:
-- 1. Automatically logs status changes to proposal_status_transitions table
-- 2. Updates timestamp fields (submitted_at, won_at, rejected_at, paid_at)
-- 3. Uses case-insensitive status comparisons
-- ============================================================================

-- ============================================================================
-- TRIGGER FUNCTION: track_proposal_status_change()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.track_proposal_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
        WHEN OLD.status IS NULL THEN 'Proposal created'
        ELSE 'Status changed from ' || OLD.status || ' to ' || NEW.status
      END
    );

    -- Update timestamp fields based on new status (CASE-INSENSITIVE)
    IF LOWER(NEW.status) = 'submitted' AND NEW.submitted_at IS NULL THEN
      NEW.submitted_at = NOW();
    ELSIF LOWER(NEW.status) = 'accepted' THEN
      NEW.won_at = NOW();
    ELSIF LOWER(NEW.status) = 'rejected' THEN
      NEW.rejected_at = NOW();
    ELSIF LOWER(NEW.status) = 'paid' THEN
      NEW.paid_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- CREATE TRIGGER ON PROPOSALS TABLE
-- ============================================================================

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_proposal_status_change ON public.proposals;

-- Create trigger that fires before UPDATE of status column
CREATE TRIGGER on_proposal_status_change
  BEFORE UPDATE OF status ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION track_proposal_status_change();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.track_proposal_status_change() IS
'Automatically tracks proposal status changes in proposal_status_transitions table and updates timestamp fields.
Uses case-insensitive comparisons for status values.
Mirrors track_quote_status_change() functionality for proposals.';

COMMENT ON TRIGGER on_proposal_status_change ON public.proposals IS
'Automatically logs status changes and updates timestamp fields when status changes';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify function was created
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'track_proposal_status_change';

-- Verify trigger was created
SELECT
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgenabled AS enabled
FROM pg_trigger
WHERE tgname = 'on_proposal_status_change';

-- ============================================================================
-- TESTING
-- ============================================================================

/*
-- Test the trigger with a status update
UPDATE proposals
SET proposal_status = 'Submitted'
WHERE id = (SELECT id FROM proposals LIMIT 1);

-- Verify the transition was logged
SELECT * FROM proposal_status_transitions
ORDER BY transitioned_at DESC
LIMIT 5;

-- Expected: Should see a new row in proposal_status_transitions
-- with from_status and to_status correctly populated
-- AND submitted_at should be set on the proposal
*/

-- ============================================================================
-- STATUS VALUES HANDLED
-- ============================================================================
/*
The trigger automatically sets timestamp fields when status changes to:
- 'submitted' / 'Submitted' → Sets submitted_at
- 'accepted' / 'Accepted'   → Sets won_at
- 'rejected' / 'Rejected'   → Sets rejected_at
- 'paid' / 'Paid'           → Sets paid_at

All comparisons are case-insensitive for robustness.
*/
