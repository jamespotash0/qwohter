-- ============================================================================
-- Add/update placeholders for dimension fields in config_schema
-- Remove default_value from quantity (user must enter explicitly)
-- Migration: 20250210_add_dimension_placeholders.sql
-- ============================================================================

-- Placeholder convention:
-- - Number inputs: "Enter {description}"
-- - Select fields: "Select {field name}..." (handled in code as fallback)

-- Update panel_count placeholder
UPDATE product_models
SET config_schema = jsonb_set(
  config_schema,
  '{options,panel_count,placeholder}',
  '"Enter number of panels"'
)
WHERE config_schema IS NOT NULL
  AND config_schema->'options'->'panel_count' IS NOT NULL;

-- Update quantity placeholder and remove default_value
UPDATE product_models
SET config_schema = jsonb_set(
  config_schema #- '{options,quantity,default_value}',
  '{options,quantity,placeholder}',
  '"Enter quantity"'
)
WHERE config_schema IS NOT NULL
  AND config_schema->'options'->'quantity' IS NOT NULL;

-- Update wall_height placeholder (more descriptive)
UPDATE product_models
SET config_schema = jsonb_set(
  config_schema,
  '{options,wall_height,placeholder}',
  '"Enter height (e.g. 12-3/4)"'
)
WHERE config_schema IS NOT NULL
  AND config_schema->'options'->'wall_height' IS NOT NULL;

-- Update wall_width placeholder (more descriptive)
UPDATE product_models
SET config_schema = jsonb_set(
  config_schema,
  '{options,wall_width,placeholder}',
  '"Enter width (e.g. 24-1/2)"'
)
WHERE config_schema IS NOT NULL
  AND config_schema->'options'->'wall_width' IS NOT NULL;
