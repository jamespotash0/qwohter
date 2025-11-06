-- Normalize membership roles to ensure consistent capitalization
-- Expected roles: 'Admin', 'Member', 'Owner'
-- This migration fixes any lowercase or mixed-case role values

-- ============================================================================
-- 1. NORMALIZE EXISTING DATA
-- ============================================================================

-- Fix lowercase or mixed-case roles
UPDATE memberships
SET role = 'Admin'
WHERE LOWER(role) = 'admin' AND role != 'Admin';

UPDATE memberships
SET role = 'Member'
WHERE LOWER(role) = 'member' AND role != 'Member';

UPDATE memberships
SET role = 'Owner'
WHERE LOWER(role) = 'owner' AND role != 'Owner';

-- ============================================================================
-- 2. ADD TRIGGER TO ENFORCE CAPITALIZATION ON INSERT/UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_membership_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize role to proper capitalization
  IF NEW.role IS NOT NULL THEN
    CASE LOWER(NEW.role)
      WHEN 'admin' THEN NEW.role := 'Admin';
      WHEN 'member' THEN NEW.role := 'Member';
      WHEN 'owner' THEN NEW.role := 'Owner';
      ELSE
        -- If role doesn't match any expected value, let constraint handle it
        NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS normalize_membership_role_trigger ON memberships;

CREATE TRIGGER normalize_membership_role_trigger
  BEFORE INSERT OR UPDATE OF role
  ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION normalize_membership_role();

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

-- Log results
DO $$
DECLARE
  admin_count INTEGER;
  member_count INTEGER;
  owner_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM memberships WHERE role = 'Admin';
  SELECT COUNT(*) INTO member_count FROM memberships WHERE role = 'Member';
  SELECT COUNT(*) INTO owner_count FROM memberships WHERE role = 'Owner';

  RAISE NOTICE '✅ Membership roles normalized:';
  RAISE NOTICE '   Admin: % members', admin_count;
  RAISE NOTICE '   Member: % members', member_count;
  RAISE NOTICE '   Owner: % members', owner_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Trigger added: All future inserts/updates will auto-capitalize role';
END $$;

COMMENT ON FUNCTION normalize_membership_role() IS 'Automatically normalizes membership role to proper capitalization (Admin, Member, Owner) regardless of input case';
