-- Add is_default column to form_definitions table
-- This allows marking one form as the default for quote creation

ALTER TABLE form_definitions
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Create index for faster queries on default forms
CREATE INDEX IF NOT EXISTS idx_form_definitions_is_default
ON form_definitions(organization_id, is_default)
WHERE is_default = TRUE;

-- Add comment
COMMENT ON COLUMN form_definitions.is_default IS 'Marks this form as the default for quote creation in the organization';
