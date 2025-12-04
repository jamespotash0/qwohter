-- ============================================================================
-- FIX STATUS TRANSITION TRIGGER TO USE RENAMED TABLE
-- ============================================================================
-- The table was renamed from quote_status_transitions to proposal_status_transitions
-- but the trigger function still references the old table name.
-- ============================================================================

-- Update the trigger function to use the new table name
CREATE OR REPLACE FUNCTION public.track_proposal_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only proceed if status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN

    -- Log the status change to audit table (renamed from quote_status_transitions)
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
    ELSIF LOWER(NEW.status) = 'won' THEN
      NEW.won_at = NOW();
    ELSIF LOWER(NEW.status) = 'rejected' THEN
      NEW.rejected_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Also update the old function name if it exists (for backwards compatibility)
-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.track_quote_status_change() CASCADE;

-- Ensure the trigger is attached to the quotes table with the correct function
DROP TRIGGER IF EXISTS track_proposal_status_change ON public.quotes;
DROP TRIGGER IF EXISTS track_quote_status_change ON public.quotes;

CREATE TRIGGER track_proposal_status_change
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.track_proposal_status_change();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  -- Check if trigger exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'track_proposal_status_change'
  ) THEN
    RAISE NOTICE '✅ Trigger track_proposal_status_change is attached to quotes table';
  ELSE
    RAISE WARNING '⚠️ Trigger track_proposal_status_change not found';
  END IF;

  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'proposal_status_transitions'
  ) THEN
    RAISE NOTICE '✅ Table proposal_status_transitions exists';
  ELSE
    RAISE WARNING '⚠️ Table proposal_status_transitions not found - you may need to rename quote_status_transitions first';
  END IF;
END $$;
