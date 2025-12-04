-- Add is_default column to document_templates table
-- This allows setting a default template per organization
-- Only one template should be default per organization

ALTER TABLE document_templates
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Create function to ensure only one default template per organization
CREATE OR REPLACE FUNCTION ensure_single_default_document_template()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when setting is_default to true
  IF NEW.is_default = TRUE THEN
    -- Unset any other default templates in the same organization
    UPDATE document_templates
    SET is_default = FALSE
    WHERE organization_id = NEW.organization_id
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single default
DROP TRIGGER IF EXISTS enforce_single_default_document_template ON document_templates;
CREATE TRIGGER enforce_single_default_document_template
  BEFORE INSERT OR UPDATE OF is_default ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_document_template();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_document_templates_is_default
ON document_templates(organization_id, is_default)
WHERE is_default = TRUE;
