-- Add organization_info JSONB column to organizations table
-- This allows storing flexible company contact information

-- Add the JSONB column with default empty object
ALTER TABLE public.organizations 
ADD COLUMN organization_info JSONB DEFAULT '{}' NOT NULL;

-- Create a GIN index on the JSONB column for better query performance
CREATE INDEX idx_organizations_info_gin ON public.organizations USING GIN (organization_info);

-- Add a comment to document the column structure
COMMENT ON COLUMN public.organizations.organization_info IS 
'JSONB field storing company contact information with structure: {
  "phones": [{"type": "main|fax", "number": "string", "isPrimary": boolean}],
  "addresses": [{"type": "business", "address": "string", "isPrimary": boolean}],
  "websites": [{"type": "main", "url": "string", "isPrimary": boolean}]
}';

-- Optional: Add a check constraint to ensure it's valid JSON
ALTER TABLE public.organizations 
ADD CONSTRAINT organization_info_is_json CHECK (organization_info IS NOT NULL);