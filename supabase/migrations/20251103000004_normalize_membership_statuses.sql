-- Normalize membership statuses to ensure consistent capitalization
-- Database schema expects: 'Pending', 'Active', 'Suspended', 'Inactive'
-- This migration fixes any lowercase or mixed-case values

-- ============================================================================
-- 1. NORMALIZE EXISTING DATA
-- ============================================================================

-- Fix lowercase or mixed-case statuses
UPDATE memberships
SET status = 'Active'
WHERE LOWER(status) = 'active' AND status != 'Active';

UPDATE memberships
SET status = 'Pending'
WHERE LOWER(status) = 'pending' AND status != 'Pending';

UPDATE memberships
SET status = 'Suspended'
WHERE LOWER(status) = 'suspended' AND status != 'Suspended';

UPDATE memberships
SET status = 'Inactive'
WHERE LOWER(status) = 'inactive' AND status != 'Inactive';

-- ============================================================================
-- 2. ADD TRIGGER TO ENFORCE CAPITALIZATION ON INSERT/UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_membership_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize status to proper capitalization
  IF NEW.status IS NOT NULL THEN
    CASE LOWER(NEW.status)
      WHEN 'active' THEN NEW.status := 'Active';
      WHEN 'pending' THEN NEW.status := 'Pending';
      WHEN 'suspended' THEN NEW.status := 'Suspended';
      WHEN 'inactive' THEN NEW.status := 'Inactive';
      ELSE
        -- If status doesn't match any expected value, let constraint handle it
        NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS normalize_membership_status_trigger ON memberships;

CREATE TRIGGER normalize_membership_status_trigger
  BEFORE INSERT OR UPDATE OF status
  ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION normalize_membership_status();

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

-- Log results
DO $$
DECLARE
  active_count INTEGER;
  pending_count INTEGER;
  inactive_count INTEGER;
  suspended_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count FROM memberships WHERE status = 'Active';
  SELECT COUNT(*) INTO pending_count FROM memberships WHERE status = 'Pending';
  SELECT COUNT(*) INTO inactive_count FROM memberships WHERE status = 'Inactive';
  SELECT COUNT(*) INTO suspended_count FROM memberships WHERE status = 'Suspended';

  RAISE NOTICE '✅ Membership statuses normalized:';
  RAISE NOTICE '   Active: % members', active_count;
  RAISE NOTICE '   Pending: % members', pending_count;
  RAISE NOTICE '   Inactive: % members', inactive_count;
  RAISE NOTICE '   Suspended: % members', suspended_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Trigger added: All future inserts/updates will auto-capitalize status';
END $$;

COMMENT ON FUNCTION normalize_membership_status() IS 'Automatically normalizes membership status to proper capitalization (Active, Pending, Suspended, Inactive) regardless of input case';
