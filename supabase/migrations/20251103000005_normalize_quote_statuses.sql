-- Normalize quote statuses to ensure consistent capitalization
-- Expected statuses: 'Won', 'Rejected', 'Submitted', 'Draft', 'Incomplete'
-- This migration fixes any lowercase or mixed-case values

-- ============================================================================
-- 1. NORMALIZE EXISTING DATA
-- ============================================================================

-- Fix lowercase or mixed-case statuses
UPDATE quotes
SET status = 'Won'
WHERE LOWER(status) = 'won' AND status != 'Won';

UPDATE quotes
SET status = 'Rejected'
WHERE LOWER(status) = 'rejected' AND status != 'Rejected';

UPDATE quotes
SET status = 'Submitted'
WHERE LOWER(status) = 'submitted' AND status != 'Submitted';

UPDATE quotes
SET status = 'Draft'
WHERE LOWER(status) = 'draft' AND status != 'Draft';

UPDATE quotes
SET status = 'Incomplete'
WHERE LOWER(status) = 'incomplete' AND status != 'Incomplete';

UPDATE quotes
SET status = 'Pending'
WHERE LOWER(status) = 'pending' AND status != 'Pending';

-- ============================================================================
-- 2. ADD TRIGGER TO ENFORCE CAPITALIZATION ON INSERT/UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_quote_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize status to proper capitalization
  IF NEW.status IS NOT NULL THEN
    CASE LOWER(NEW.status)
      WHEN 'won' THEN NEW.status := 'Won';
      WHEN 'rejected' THEN NEW.status := 'Rejected';
      WHEN 'submitted' THEN NEW.status := 'Submitted';
      WHEN 'draft' THEN NEW.status := 'Draft';
      WHEN 'incomplete' THEN NEW.status := 'Incomplete';
      WHEN 'pending' THEN NEW.status := 'Pending';
      ELSE
        -- Keep original case for unknown statuses
        NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS normalize_quote_status_trigger ON quotes;

CREATE TRIGGER normalize_quote_status_trigger
  BEFORE INSERT OR UPDATE OF status
  ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION normalize_quote_status();

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

-- Log results
DO $$
DECLARE
  won_count INTEGER;
  rejected_count INTEGER;
  submitted_count INTEGER;
  draft_count INTEGER;
  incomplete_count INTEGER;
  pending_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO won_count FROM quotes WHERE status = 'Won';
  SELECT COUNT(*) INTO rejected_count FROM quotes WHERE status = 'Rejected';
  SELECT COUNT(*) INTO submitted_count FROM quotes WHERE status = 'Submitted';
  SELECT COUNT(*) INTO draft_count FROM quotes WHERE status = 'Draft';
  SELECT COUNT(*) INTO incomplete_count FROM quotes WHERE status = 'Incomplete';
  SELECT COUNT(*) INTO pending_count FROM quotes WHERE status = 'Pending';

  RAISE NOTICE '✅ Quote statuses normalized:';
  RAISE NOTICE '   Won: % quotes', won_count;
  RAISE NOTICE '   Rejected: % quotes', rejected_count;
  RAISE NOTICE '   Submitted: % quotes', submitted_count;
  RAISE NOTICE '   Draft: % quotes', draft_count;
  RAISE NOTICE '   Incomplete: % quotes', incomplete_count;
  RAISE NOTICE '   Pending: % quotes', pending_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Trigger added: All future inserts/updates will auto-capitalize status';
END $$;

COMMENT ON FUNCTION normalize_quote_status() IS 'Automatically normalizes quote status to proper capitalization (Won, Rejected, Submitted, Draft, Incomplete, Pending) regardless of input case';
