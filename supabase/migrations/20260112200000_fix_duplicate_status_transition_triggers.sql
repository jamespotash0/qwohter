-- ============================================================================
-- CONSOLIDATE STATUS TRANSITION TRIGGERS - BOTH TABLES
-- ============================================================================
-- This migration:
-- 1. Drops ALL duplicate triggers from both quotes and proposals tables
-- 2. Creates single, clean trigger function for each table
-- 3. Creates exactly ONE trigger on each table
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING TRIGGERS FROM QUOTES TABLE (clean slate)
-- ============================================================================
DROP TRIGGER IF EXISTS track_proposal_status_change ON public.quotes;
DROP TRIGGER IF EXISTS track_quote_status_change ON public.quotes;
DROP TRIGGER IF EXISTS track_quote_status_changes ON public.quotes;
DROP TRIGGER IF EXISTS on_quote_status_change ON public.quotes;

-- ============================================================================
-- STEP 2: DROP ALL EXISTING TRIGGERS FROM PROPOSALS TABLE (clean slate)
-- ============================================================================
DROP TRIGGER IF EXISTS track_proposal_status_change ON public.proposals;
DROP TRIGGER IF EXISTS track_proposal_status_changes ON public.proposals;
DROP TRIGGER IF EXISTS track_quote_status_change ON public.proposals;
DROP TRIGGER IF EXISTS log_proposal_status_change ON public.proposals;
DROP TRIGGER IF EXISTS on_proposal_status_change ON public.proposals;

-- ============================================================================
-- STEP 3: DROP ALL OLD/DUPLICATE TRIGGER FUNCTIONS
-- ============================================================================
DROP FUNCTION IF EXISTS public.track_quote_status_change() CASCADE;
DROP FUNCTION IF EXISTS public.track_proposal_status_change() CASCADE;
DROP FUNCTION IF EXISTS public.track_proposal_status_change_new() CASCADE;
DROP FUNCTION IF EXISTS public.track_proposal_status_change_on_update() CASCADE;

-- ============================================================================
-- STEP 4: CREATE TRIGGER FUNCTION FOR QUOTES TABLE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_quote_status_change()
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
        WHEN OLD.status IS NULL THEN 'Quote created'
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

-- ============================================================================
-- STEP 5: CREATE TRIGGER FUNCTION FOR PROPOSALS TABLE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_proposal_status_change()
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
        WHEN OLD.status IS NULL THEN 'Proposal created'
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

-- ============================================================================
-- STEP 6: CREATE SINGLE TRIGGER ON QUOTES TABLE
-- ============================================================================
CREATE TRIGGER on_quote_status_update
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_quote_status_change();

-- ============================================================================
-- STEP 7: CREATE SINGLE TRIGGER ON PROPOSALS TABLE
-- ============================================================================
CREATE TRIGGER on_proposal_status_update
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_proposal_status_change();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  quotes_trigger_count INTEGER;
  proposals_trigger_count INTEGER;
BEGIN
  -- Count status triggers on quotes table
  SELECT COUNT(*) INTO quotes_trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND c.relname = 'quotes'
    AND t.tgname LIKE '%status%'
    AND NOT t.tgisinternal;

  -- Count status triggers on proposals table
  SELECT COUNT(*) INTO proposals_trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND c.relname = 'proposals'
    AND t.tgname LIKE '%status%'
    AND NOT t.tgisinternal;

  -- Verify quotes table
  IF quotes_trigger_count = 1 THEN
    RAISE NOTICE '✅ SUCCESS: Exactly 1 status trigger on quotes table';
  ELSE
    RAISE WARNING '⚠️ WARNING: Found % status triggers on quotes table (expected 1)', quotes_trigger_count;
  END IF;

  -- Verify proposals table
  IF proposals_trigger_count = 1 THEN
    RAISE NOTICE '✅ SUCCESS: Exactly 1 status trigger on proposals table';
  ELSE
    RAISE WARNING '⚠️ WARNING: Found % status triggers on proposals table (expected 1)', proposals_trigger_count;
  END IF;
END $$;

-- Show final trigger state for both tables
SELECT
  c.relname AS table_name,
  t.tgname AS trigger_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname IN ('quotes', 'proposals')
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- ============================================================================
-- NOTE: The INSERT trigger (track_proposal_initial_status) for proposals is
-- separate and should remain untouched as it only fires on INSERT, not UPDATE.
-- ============================================================================

-- ============================================================================
-- CURRENT STATE: DUAL TABLE SUPPORT
-- ============================================================================
-- Both tables now have exactly ONE status trigger each:
--
-- QUOTES TABLE:
--   - Trigger: on_quote_status_update (BEFORE UPDATE)
--   - Function: handle_quote_status_change()
--
-- PROPOSALS TABLE:
--   - Trigger: on_proposal_status_update (BEFORE UPDATE)
--   - Function: handle_proposal_status_change()
--   - Also has: track_proposal_initial_status (AFTER INSERT) - unchanged
--
-- Both log to proposal_status_transitions table (no FK constraint)
-- ============================================================================
