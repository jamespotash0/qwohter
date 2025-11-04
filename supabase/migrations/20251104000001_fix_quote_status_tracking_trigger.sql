-- ============================================================================
-- FIX QUOTE STATUS TRACKING TRIGGER
-- ============================================================================
-- Fixes track_quote_status_change() to use the correct table name and columns
--
-- ISSUE:
-- The trigger was trying to insert into 'quote_status_history' which doesn't exist.
-- The actual table is 'quote_status_transitions' with different column names.
--
-- FIX:
-- - Change table name from quote_status_history → quote_status_transitions
-- - Map column names correctly:
--   old_status → from_status
--   new_status → to_status
--   changed_by → transitioned_by
--   changed_at → transitioned_at
-- - Add organization_id (required column)
--
-- BACKWARDS COMPATIBLE: Yes
-- This fixes a broken trigger without changing quotes table structure
-- ============================================================================

CREATE OR REPLACE FUNCTION public.track_quote_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only proceed if status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN

    -- Log the status change to audit table (CORRECT TABLE NAME)
    INSERT INTO quote_status_transitions (
      quote_id,
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
        WHEN OLD.status IS NULL THEN 'Quote created'
        ELSE 'Status changed from ' || OLD.status || ' to ' || NEW.status
      END
    );

    -- Update timestamp fields based on new status (CASE-INSENSITIVE)
    IF LOWER(NEW.status) = 'submitted' AND NEW.submitted_at IS NULL THEN
      NEW.submitted_at = NOW();
    ELSIF LOWER(NEW.status) = 'won' THEN
      NEW.won_at = NOW();
      NEW.closed_at = NOW();
    ELSIF LOWER(NEW.status) = 'rejected' THEN
      NEW.rejected_at = NOW();
      NEW.closed_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify function was updated
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'track_quote_status_change';

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.track_quote_status_change() IS
'Tracks quote status changes in quote_status_transitions table and updates timestamp fields.
Uses case-insensitive comparisons for defense in depth alongside normalization trigger.
FIXED: Now uses correct table name (quote_status_transitions) and column names.';

-- ============================================================================
-- TESTING
-- ============================================================================

/*
-- Test the trigger with a status update
UPDATE quotes
SET status = 'Submitted'
WHERE id = (SELECT id FROM quotes LIMIT 1);

-- Verify the transition was logged
SELECT * FROM quote_status_transitions
ORDER BY transitioned_at DESC
LIMIT 5;

-- Expected: Should see a new row in quote_status_transitions
-- with from_status and to_status correctly populated
*/
