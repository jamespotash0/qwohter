-- ============================================================================
-- MAKE QUOTE STATUS TRACKING CASE-INSENSITIVE
-- ============================================================================
-- Updates track_quote_status_change() to use case-insensitive comparisons
--
-- CONTEXT:
-- While we have a normalization trigger (normalize_quote_status) that ensures
-- statuses are always capitalized, we're adding case-insensitive comparisons
-- for defense in depth. This provides an extra safety layer.
--
-- CHANGES:
-- - Updates IF/ELSIF conditions to use LOWER(NEW.status)
-- - Compares against lowercase strings ('submitted', 'won', 'rejected')
-- - Maintains all existing functionality
--
-- BACKWARDS COMPATIBLE: Yes
-- This is a pure improvement with no breaking changes
-- ============================================================================

-- ============================================================================
-- UPDATE TRIGGER FUNCTION
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

    -- Log the status change to audit table
    INSERT INTO quote_status_history (
      quote_id,
      old_status,
      new_status,
      changed_by,
      changed_at,
      notes
    ) VALUES (
      NEW.id,
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
'Tracks quote status changes in audit table and updates timestamp fields.
Uses case-insensitive comparisons for defense in depth alongside normalization trigger.';

-- ============================================================================
-- NOTES
-- ============================================================================

/*
DEFENSE IN DEPTH STRATEGY:

Layer 1: Normalization Trigger (normalize_quote_status)
- Executes BEFORE UPDATE
- Ensures status is always capitalized ('Won', 'Rejected', etc.)
- Runs alphabetically before track_quote_status_change

Layer 2: Case-Insensitive Comparisons (this migration)
- Uses LOWER(NEW.status) in all comparisons
- Protects against edge cases or future code changes
- Ensures robustness even if normalization somehow fails

TRIGGER EXECUTION ORDER:
1. normalize_quote_status (BEFORE UPDATE) - capitalizes status
2. track_quote_status_change (BEFORE UPDATE) - logs and sets timestamps

STATUS VALUES HANDLED:
- 'Submitted' / 'submitted' → Sets submitted_at
- 'Won' / 'won' → Sets won_at and closed_at
- 'Rejected' / 'rejected' → Sets rejected_at and closed_at

AUDIT TRAIL:
All status changes are logged to quote_status_history table with:
- Previous status (old_status)
- New status (new_status)
- Who made the change (changed_by = auth.uid())
- When it changed (changed_at = NOW())
- Human-readable notes

TESTING:
-- Test case-insensitive handling
UPDATE quotes SET status = 'won' WHERE id = 'test-quote-id';
-- Should work even though normalization will capitalize it

-- Test normal capitalized status
UPDATE quotes SET status = 'Won' WHERE id = 'test-quote-id';
-- Should work as before

-- Test mixed case
UPDATE quotes SET status = 'WoN' WHERE id = 'test-quote-id';
-- Should work (normalization capitalizes, then case-insensitive comparison)
*/
