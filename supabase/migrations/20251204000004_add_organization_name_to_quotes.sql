-- ============================================================================
-- ADD organization_name COLUMN TO QUOTES
-- ============================================================================
-- Captures the organization name at time of quote creation for historical record.
-- This is denormalized intentionally - if org name changes, old quotes keep original.
-- ============================================================================

-- Add the column
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS organization_name TEXT;

-- Backfill existing quotes from organizations table
UPDATE public.quotes q
SET organization_name = o.name
FROM public.organizations o
WHERE q.organization_id = o.id
AND q.organization_name IS NULL;

-- Also backfill from quote_details.organizationName if organizations join failed
UPDATE public.quotes
SET organization_name = (quote_details->>'organizationName')
WHERE organization_name IS NULL
AND quote_details->>'organizationName' IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.quotes.organization_name IS
'Organization name captured at quote creation time. Denormalized for historical accuracy - does not update if org name changes.';

-- Verification
DO $$
DECLARE
  null_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM quotes;
  SELECT COUNT(*) INTO null_count FROM quotes WHERE organization_name IS NULL;

  RAISE NOTICE '✅ organization_name column added to quotes';
  RAISE NOTICE '   Total quotes: %', total_count;
  RAISE NOTICE '   Quotes with organization_name: %', total_count - null_count;
  RAISE NOTICE '   Quotes still missing name: %', null_count;
END $$;
