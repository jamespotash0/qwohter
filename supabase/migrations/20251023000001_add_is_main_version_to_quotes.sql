-- Add is_main_version column to quotes table
-- This column tracks which version is the "main" version for each quote group (base proposal number)
-- Only one version per base_proposal_number should have is_main_version = true at a time

-- Step 1: Add the column with default false
ALTER TABLE public.quotes
ADD COLUMN is_main_version BOOLEAN DEFAULT false NOT NULL;

-- Step 2: Create index for performance (we'll often query by organization_id and is_main_version)
CREATE INDEX idx_quotes_is_main_version ON public.quotes(organization_id, is_main_version) WHERE is_main_version = true;

-- Step 3: Create a function to ensure only one main version per base proposal number
CREATE OR REPLACE FUNCTION public.ensure_single_main_version()
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
        UPDATE public.quotes
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

-- Step 4: Create trigger to enforce single main version
CREATE TRIGGER ensure_single_main_version_trigger
    BEFORE UPDATE OF is_main_version ON public.quotes
    FOR EACH ROW
    WHEN (NEW.is_main_version = true)
    EXECUTE FUNCTION public.ensure_single_main_version();

-- Step 5: Backfill existing data - set the main version for each quote group
-- Priority: Won status > Latest version number > Most recent created_at
DO $$
DECLARE
    quote_record RECORD;
    base_num TEXT;
    main_version_id UUID;
BEGIN
    -- Get all unique base proposal numbers
    FOR quote_record IN
        SELECT DISTINCT
            organization_id,
            CASE
                WHEN proposal_number ~ '\.' THEN split_part(proposal_number, '.', 1)
                ELSE proposal_number
            END as base_proposal_number
        FROM public.quotes
        ORDER BY base_proposal_number
    LOOP
        base_num := quote_record.base_proposal_number;

        -- Find the main version for this base number
        -- Priority: 1) Won status, 2) Base quote (no version suffix), 3) Highest version number, 4) Most recent
        SELECT id INTO main_version_id
        FROM public.quotes
        WHERE organization_id = quote_record.organization_id
        AND (
            proposal_number = base_num
            OR proposal_number LIKE base_num || '.%'
        )
        ORDER BY
            CASE WHEN status = 'Won' THEN 0 ELSE 1 END,  -- Won versions first
            CASE
                WHEN proposal_number = base_num THEN 0  -- Base quote (e.g., P1001) second
                ELSE 1  -- Versions (e.g., P1001.1) last
            END,
            CASE
                WHEN proposal_number ~ '\.' THEN
                    CAST(split_part(proposal_number, '.', 2) AS INTEGER)
                ELSE 0
            END DESC,  -- Higher version numbers first
            created_at DESC  -- Most recent first
        LIMIT 1;

        -- Set this version as main
        IF main_version_id IS NOT NULL THEN
            UPDATE public.quotes
            SET is_main_version = true
            WHERE id = main_version_id;
        END IF;
    END LOOP;
END $$;

-- Add comment
COMMENT ON COLUMN public.quotes.is_main_version IS
'Indicates if this version is the "main" version for its quote group. Only one version per base proposal number should be main.';
