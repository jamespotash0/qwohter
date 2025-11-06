-- Migration: Set created_by_name when quote is created
-- This trigger populates created_by_name from profiles.full_name when a quote is inserted

CREATE OR REPLACE FUNCTION set_quote_creator_name()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set if created_by_name is not already set
    IF NEW.created_by_name IS NULL AND NEW.created_by IS NOT NULL THEN
        -- Get the creator's name from profiles
        SELECT full_name INTO NEW.created_by_name
        FROM profiles
        WHERE id = NEW.created_by;

        -- If no name found (shouldn't happen), set to 'Unknown'
        IF NEW.created_by_name IS NULL THEN
            NEW.created_by_name := 'Unknown';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on quotes INSERT
DROP TRIGGER IF EXISTS trigger_set_quote_creator_name ON public.quotes;
CREATE TRIGGER trigger_set_quote_creator_name
    BEFORE INSERT ON public.quotes
    FOR EACH ROW
    EXECUTE FUNCTION set_quote_creator_name();

-- Also backfill any existing quotes that have NULL created_by_name
UPDATE public.quotes q
SET created_by_name = p.full_name
FROM profiles p
WHERE q.created_by = p.id
  AND q.created_by_name IS NULL;

-- Set remaining NULLs to 'Unknown' if profile doesn't exist
UPDATE public.quotes
SET created_by_name = 'Unknown'
WHERE created_by_name IS NULL;
