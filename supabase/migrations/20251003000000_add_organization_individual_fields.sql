-- Add individual organization fields to replace organization_info JSONB
-- These fields provide direct access to commonly used organization data

-- Add individual fields
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS fax_number TEXT,
ADD COLUMN IF NOT EXISTS company_address TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS quote_start_number TEXT,
ADD COLUMN IF NOT EXISTS logo_data JSONB DEFAULT '{}';

-- Add comments
COMMENT ON COLUMN public.organizations.phone_number IS 'Primary phone number for the organization';
COMMENT ON COLUMN public.organizations.fax_number IS 'Fax number for the organization';
COMMENT ON COLUMN public.organizations.company_address IS 'Physical address of the organization';
COMMENT ON COLUMN public.organizations.website IS 'Organization website URL';
COMMENT ON COLUMN public.organizations.quote_start_number IS 'Starting number for quote proposal numbers';
COMMENT ON COLUMN public.organizations.logo_data IS 'Logo image data and settings in JSONB format';

-- Migrate data from organization_info JSONB to individual fields (if organization_info exists)
-- This handles backward compatibility for existing data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'organization_info'
  ) THEN
    -- Migrate phone numbers
    UPDATE public.organizations
    SET phone_number = COALESCE(
      organization_info->'phones'->0->>'number',
      phone_number
    )
    WHERE organization_info IS NOT NULL
    AND organization_info->'phones'->0->>'number' IS NOT NULL
    AND phone_number IS NULL;

    -- Migrate fax numbers
    UPDATE public.organizations
    SET fax_number = (
      SELECT organization_info->'phones'->>idx::int->>'number'
      FROM generate_series(0, jsonb_array_length(organization_info->'phones') - 1) idx
      WHERE organization_info->'phones'->>idx::int->>'type' = 'fax'
      LIMIT 1
    )
    WHERE organization_info IS NOT NULL
    AND organization_info->'phones' IS NOT NULL
    AND fax_number IS NULL;

    -- Migrate addresses
    UPDATE public.organizations
    SET company_address = COALESCE(
      organization_info->'addresses'->0->>'address',
      company_address
    )
    WHERE organization_info IS NOT NULL
    AND organization_info->'addresses'->0->>'address' IS NOT NULL
    AND company_address IS NULL;

    -- Migrate websites
    UPDATE public.organizations
    SET website = COALESCE(
      organization_info->'websites'->0->>'url',
      website
    )
    WHERE organization_info IS NOT NULL
    AND organization_info->'websites'->0->>'url' IS NOT NULL
    AND website IS NULL;
  END IF;
END $$;
