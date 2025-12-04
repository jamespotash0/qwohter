-- ============================================================================
-- REMOVE 'Pending' FROM QUOTE STATUSES
-- ============================================================================
-- This migration removes 'Pending' as a valid quote status.
-- Valid statuses are now: Won, Rejected, Submitted, Draft, Incomplete
-- ============================================================================

-- ============================================================================
-- 1. CONVERT ANY EXISTING 'Pending' QUOTES TO 'Draft'
-- ============================================================================

UPDATE quotes
SET status = 'Draft'
WHERE LOWER(status) = 'pending';

-- ============================================================================
-- 2. UPDATE TRIGGER FUNCTION TO REMOVE 'Pending' HANDLING
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_quote_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize status to proper capitalization
  -- Valid statuses: Won, Rejected, Submitted, Draft, Incomplete
  IF NEW.status IS NOT NULL THEN
    CASE LOWER(NEW.status)
      WHEN 'won' THEN NEW.status := 'Won';
      WHEN 'rejected' THEN NEW.status := 'Rejected';
      WHEN 'submitted' THEN NEW.status := 'Submitted';
      WHEN 'draft' THEN NEW.status := 'Draft';
      WHEN 'incomplete' THEN NEW.status := 'Incomplete';
      -- Convert any 'pending' to 'Draft' (legacy cleanup)
      WHEN 'pending' THEN NEW.status := 'Draft';
      ELSE
        -- Keep original case for unknown statuses
        NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  pending_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pending_count FROM quotes WHERE LOWER(status) = 'pending';

  IF pending_count > 0 THEN
    RAISE WARNING '⚠️ Found % quotes still with Pending status', pending_count;
  ELSE
    RAISE NOTICE '✅ No quotes with Pending status remain';
  END IF;
END $$;

COMMENT ON FUNCTION normalize_quote_status() IS 'Automatically normalizes quote status to proper capitalization (Won, Rejected, Submitted, Draft, Incomplete). Converts deprecated Pending status to Draft.';
