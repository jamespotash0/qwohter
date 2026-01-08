-- Migration: Fix contacts.created_by constraint conflict
-- Created: 2026-01-08
--
-- Problem: contacts table has:
--   - created_by UUID NOT NULL (cannot be null)
--   - ON DELETE SET NULL (tries to set null when profile deleted)
-- These are incompatible, causing deletion errors.
--
-- Solution: Follow the same pattern as quotes table:
--   1. Add created_by_name column to preserve creator name
--   2. Make created_by nullable
--   3. Update triggers to handle deleted/deactivated users

BEGIN;

-- ============================================================================
-- 1. ADD created_by_name COLUMN TO CONTACTS
-- ============================================================================

-- Add column to store the creator's name (denormalized for display)
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- Backfill existing contacts with creator names from profiles
UPDATE public.contacts c
SET created_by_name = p.full_name
FROM public.profiles p
WHERE c.created_by = p.id
  AND c.created_by_name IS NULL
  AND p.full_name IS NOT NULL;

-- For any remaining nulls, try email as fallback
UPDATE public.contacts c
SET created_by_name = p.email
FROM public.profiles p
WHERE c.created_by = p.id
  AND c.created_by_name IS NULL
  AND p.email IS NOT NULL;

COMMENT ON COLUMN public.contacts.created_by_name IS 'Display name of contact creator. Shows "Deleted User" if user deleted, or actual name otherwise';

-- ============================================================================
-- 2. MAKE created_by NULLABLE
-- ============================================================================

-- Remove NOT NULL constraint from created_by
ALTER TABLE public.contacts
ALTER COLUMN created_by DROP NOT NULL;

-- ============================================================================
-- 3. UPDATE handle_user_deletion FUNCTION TO INCLUDE CONTACTS
-- ============================================================================

-- Update the function to also handle contacts when profile is deleted
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all quotes by this user to show "Deleted User"
    UPDATE public.quotes
    SET created_by_name = 'Deleted User'
    WHERE created_by = OLD.id;

    -- Update all contacts created by this user to show "Deleted User"
    UPDATE public.contacts
    SET created_by_name = 'Deleted User'
    WHERE created_by = OLD.id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. CREATE TRIGGER FOR CONTACT CREATOR NAME ON PROFILE CHANGES
-- ============================================================================

-- Function to update contact creator name when user changes their name
CREATE OR REPLACE FUNCTION update_contact_creator_name_on_profile_change()
RETURNS TRIGGER AS $$
DECLARE
    user_status TEXT;
    display_name TEXT;
BEGIN
    -- Check if user's membership is active
    SELECT status INTO user_status
    FROM public.memberships
    WHERE user_id = NEW.id
      AND status = 'Active'
    LIMIT 1;

    -- Only update if user has active membership
    IF user_status = 'Active' THEN
        display_name := COALESCE(NEW.full_name, NEW.email, 'Unknown User');

        UPDATE public.contacts
        SET created_by_name = display_name
        WHERE created_by = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on profile full_name or email changes for contacts
DROP TRIGGER IF EXISTS trigger_update_contact_creator_name_on_profile ON public.profiles;
CREATE TRIGGER trigger_update_contact_creator_name_on_profile
    AFTER UPDATE OF full_name, email ON public.profiles
    FOR EACH ROW
    WHEN (OLD.full_name IS DISTINCT FROM NEW.full_name OR OLD.email IS DISTINCT FROM NEW.email)
    EXECUTE FUNCTION update_contact_creator_name_on_profile_change();

-- ============================================================================
-- 5. SET created_by_name ON INSERT
-- ============================================================================

-- Function to automatically set created_by_name when contact is created
CREATE OR REPLACE FUNCTION set_contact_created_by_name()
RETURNS TRIGGER AS $$
BEGIN
    -- Set created_by_name from the creator's profile
    IF NEW.created_by IS NOT NULL AND NEW.created_by_name IS NULL THEN
        SELECT COALESCE(full_name, email, 'Unknown User')
        INTO NEW.created_by_name
        FROM public.profiles
        WHERE id = NEW.created_by;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to set created_by_name on insert
DROP TRIGGER IF EXISTS trigger_set_contact_created_by_name ON public.contacts;
CREATE TRIGGER trigger_set_contact_created_by_name
    BEFORE INSERT ON public.contacts
    FOR EACH ROW
    EXECUTE FUNCTION set_contact_created_by_name();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run manually if needed)
-- ============================================================================

-- Check contacts with created_by_name populated
-- SELECT created_by, created_by_name, COUNT(*) as contact_count
-- FROM public.contacts
-- GROUP BY created_by, created_by_name
-- ORDER BY contact_count DESC;

-- Check for contacts with NULL created_by (deleted users)
-- SELECT COUNT(*) as orphaned_contacts FROM public.contacts WHERE created_by IS NULL;
