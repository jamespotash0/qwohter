-- Migration: Handle Deleted and Deactivated Users in Quotes
-- Created: 2025-10-24
--
-- This migration ensures that when users are deleted or deactivated,
-- their quotes remain intact with appropriate user labels:
-- - Deleted users: "Deleted User"
-- - Inactive members: "Deactivated User" (reverts to name if reactivated)
--
-- Strategy:
-- 1. Add created_by_name column to store user's display name
-- 2. Change FK constraint to SET NULL on delete
-- 3. Create triggers to update created_by_name based on membership status

BEGIN;

-- ============================================================================
-- 1. ADD created_by_name COLUMN TO QUOTES
-- ============================================================================

-- Add column to store the creator's name (denormalized for performance)
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS created_by_name text;

-- Backfill existing quotes with creator names from profiles
UPDATE public.quotes q
SET created_by_name = p.full_name
FROM public.profiles p
WHERE q.created_by = p.id
  AND q.created_by_name IS NULL
  AND p.full_name IS NOT NULL;


-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_quotes_created_by_name ON public.quotes(created_by_name);

COMMENT ON COLUMN public.quotes.created_by_name IS 'Display name of quote creator. Shows "Deleted User" if user deleted, "Deactivated User" if membership inactive, or actual name otherwise';

-- ============================================================================
-- 2. UPDATE FOREIGN KEY CONSTRAINT
-- ============================================================================

-- Drop existing FK constraint (if it exists with different name)
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find the constraint name for created_by -> profiles
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    INNER JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'quotes'
      AND con.contype = 'f'
      AND con.confrelid = (SELECT oid FROM pg_class WHERE relname = 'profiles')
      AND con.conkey @> ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = rel.oid AND attname = 'created_by')];

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END IF;
END $$;

-- Add new FK constraint with SET NULL on delete
ALTER TABLE public.quotes
ADD CONSTRAINT quotes_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- ============================================================================
-- 3. CREATE TRIGGER TO UPDATE created_by_name ON USER DELETION
-- ============================================================================

-- Function to set name to "Deleted User" when profile is deleted
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all quotes by this user to show "Deleted User"
    UPDATE public.quotes
    SET created_by_name = 'Deleted User'
    WHERE created_by = OLD.id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on profiles deletion
DROP TRIGGER IF EXISTS trigger_handle_user_deletion ON public.profiles;
CREATE TRIGGER trigger_handle_user_deletion
    BEFORE DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_deletion();

-- ============================================================================
-- 4. CREATE TRIGGER TO UPDATE created_by_name ON MEMBERSHIP STATUS CHANGE
-- ============================================================================

-- Function to update quote creator name based on membership status
CREATE OR REPLACE FUNCTION update_quote_creator_name_on_membership_change()
RETURNS TRIGGER AS $$
DECLARE
    user_full_name text;
    user_email text;
    display_name text;
BEGIN
    -- Get user's full name and email
    SELECT full_name, email INTO user_full_name, user_email
    FROM public.profiles
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);

    -- Determine display name based on new status
    IF TG_OP = 'DELETE' OR (NEW.status = 'Inactive') THEN
        display_name := 'Deactivated User';
    ELSE
        -- Use full_name if available, otherwise email
        display_name := COALESCE(user_full_name, user_email, 'Unknown User');
    END IF;

    -- Update all quotes created by this user in this organization
    UPDATE public.quotes
    SET created_by_name = display_name
    WHERE created_by = COALESCE(NEW.user_id, OLD.user_id)
      AND organization_id = COALESCE(NEW.organization_id, OLD.organization_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on memberships status changes
DROP TRIGGER IF EXISTS trigger_update_quote_creator_name ON public.memberships;
CREATE TRIGGER trigger_update_quote_creator_name
    AFTER INSERT OR UPDATE OF status OR DELETE ON public.memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_creator_name_on_membership_change();

-- ============================================================================
-- 5. CREATE TRIGGER TO UPDATE created_by_name ON PROFILE NAME CHANGE
-- ============================================================================

-- Function to update quote creator name when user changes their name
CREATE OR REPLACE FUNCTION update_quote_creator_name_on_profile_change()
RETURNS TRIGGER AS $$
DECLARE
    user_status text;
    display_name text;
BEGIN
    -- Check if user's membership is active
    SELECT status INTO user_status
    FROM public.memberships
    WHERE user_id = NEW.id
      AND status = 'Active'
    LIMIT 1;

    -- Only update if user has active membership (not inactive/deactivated)
    IF user_status = 'Active' THEN
        display_name := COALESCE(NEW.full_name, NEW.email, 'Unknown User');

        UPDATE public.quotes
        SET created_by_name = display_name
        WHERE created_by = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on profile full_name or email changes
DROP TRIGGER IF EXISTS trigger_update_quote_creator_name_on_profile ON public.profiles;
CREATE TRIGGER trigger_update_quote_creator_name_on_profile
    AFTER UPDATE OF full_name, email ON public.profiles
    FOR EACH ROW
    WHEN (OLD.full_name IS DISTINCT FROM NEW.full_name OR OLD.email IS DISTINCT FROM NEW.email)
    EXECUTE FUNCTION update_quote_creator_name_on_profile_change();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (commented out - run manually if needed)
-- ============================================================================

-- Check quotes with created_by_name populated
-- SELECT
--   created_by,
--   created_by_name,
--   COUNT(*) as quote_count
-- FROM public.quotes
-- GROUP BY created_by, created_by_name
-- ORDER BY quote_count DESC;

-- Check for quotes with NULL created_by (deleted users)
-- SELECT COUNT(*) as orphaned_quotes
-- FROM public.quotes
-- WHERE created_by IS NULL;

-- Test deactivation behavior
-- UPDATE public.memberships SET status = 'Inactive' WHERE user_id = '<some_user_id>';
-- SELECT created_by_name FROM public.quotes WHERE created_by = '<some_user_id>';

-- Test reactivation behavior
-- UPDATE public.memberships SET status = 'Active' WHERE user_id = '<some_user_id>';
-- SELECT created_by_name FROM public.quotes WHERE created_by = '<some_user_id>';
