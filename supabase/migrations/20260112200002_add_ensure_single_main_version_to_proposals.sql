-- ============================================================================
-- ADD ENSURE SINGLE MAIN VERSION TRIGGER TO PROPOSALS TABLE
-- ============================================================================
-- This migration adds the same main version enforcement trigger that exists
-- on the quotes table to the proposals table.
--
-- Ensures only one proposal per base proposal number can have is_main_version = true
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE TRIGGER FUNCTION FOR PROPOSALS
-- ============================================================================
-- This function is specific to proposals table (cannot reuse quotes version
-- because it references the quotes table directly)

CREATE OR REPLACE FUNCTION public.ensure_single_main_version_for_proposals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    base_num TEXT;
BEGIN
    -- Only proceed if is_main_version is being set to true
    IF NEW.is_main_version = true THEN
        -- Extract base proposal number (e.g., "P1001" from "P1001.2")
        base_num := CASE
            WHEN NEW.proposal_number ~ '\.' THEN split_part(NEW.proposal_number, '.', 1)
            ELSE NEW.proposal_number
        END;

        -- Set all other versions with the same base number to false
        UPDATE public.proposals
        SET is_main_version = false
        WHERE organization_id = NEW.organization_id
        AND id != NEW.id
        AND is_main_version = true
        AND (
            proposal_number = base_num
            OR proposal_number LIKE base_num || '.%'
        );
    END IF;

    RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.ensure_single_main_version_for_proposals() IS
'Ensures only one proposal per base proposal number can have is_main_version = true. When setting a proposal as main version, all other versions in the same group are automatically set to false.';

-- ============================================================================
-- STEP 2: DROP EXISTING TRIGGER IF EXISTS (clean slate)
-- ============================================================================

DROP TRIGGER IF EXISTS ensure_single_main_version_trigger ON public.proposals;

-- ============================================================================
-- STEP 3: CREATE TRIGGER ON PROPOSALS TABLE
-- ============================================================================

CREATE TRIGGER ensure_single_main_version_trigger
    BEFORE UPDATE OF is_main_version ON public.proposals
    FOR EACH ROW
    WHEN (NEW.is_main_version = true)
    EXECUTE FUNCTION public.ensure_single_main_version_for_proposals();

-- ============================================================================
-- STEP 4: ALSO HANDLE INSERT (for initial proposal creation)
-- ============================================================================
-- When a new proposal is inserted with is_main_version = true,
-- ensure other versions are set to false

CREATE OR REPLACE FUNCTION public.ensure_single_main_version_for_proposals_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    base_num TEXT;
BEGIN
    -- Only proceed if is_main_version is being set to true on insert
    IF NEW.is_main_version = true AND NEW.proposal_number IS NOT NULL THEN
        -- Extract base proposal number (e.g., "P1001" from "P1001.2")
        base_num := CASE
            WHEN NEW.proposal_number ~ '\.' THEN split_part(NEW.proposal_number, '.', 1)
            ELSE NEW.proposal_number
        END;

        -- Set all other versions with the same base number to false
        UPDATE public.proposals
        SET is_main_version = false
        WHERE organization_id = NEW.organization_id
        AND id != NEW.id
        AND is_main_version = true
        AND (
            proposal_number = base_num
            OR proposal_number LIKE base_num || '.%'
        );
    END IF;

    RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.ensure_single_main_version_for_proposals_on_insert() IS
'Handles INSERT case: ensures only one proposal per base proposal number can have is_main_version = true when a new proposal is created.';

-- Drop and create trigger for INSERT
DROP TRIGGER IF EXISTS ensure_single_main_version_on_insert_trigger ON public.proposals;

CREATE TRIGGER ensure_single_main_version_on_insert_trigger
    AFTER INSERT ON public.proposals
    FOR EACH ROW
    WHEN (NEW.is_main_version = true)
    EXECUTE FUNCTION public.ensure_single_main_version_for_proposals_on_insert();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    -- Count main version triggers on proposals table
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'proposals'
      AND t.tgname LIKE '%main_version%'
      AND NOT t.tgisinternal;

    IF trigger_count >= 2 THEN
        RAISE NOTICE '✅ SUCCESS: Main version triggers created on proposals table (% triggers)', trigger_count;
    ELSE
        RAISE WARNING '⚠️ WARNING: Expected at least 2 main version triggers on proposals, found %', trigger_count;
    END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This migration creates two triggers on the proposals table:
--
-- 1. ensure_single_main_version_trigger (BEFORE UPDATE)
--    - Fires when is_main_version is updated to true
--    - Sets all other versions in the same group to is_main_version = false
--
-- 2. ensure_single_main_version_on_insert_trigger (AFTER INSERT)
--    - Fires when a new proposal is inserted with is_main_version = true
--    - Sets all other versions in the same group to is_main_version = false
--
-- This mirrors the functionality on the quotes table:
-- - ensure_single_main_version_trigger on quotes table
-- ============================================================================
