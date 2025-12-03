-- ============================================================================
-- Simplify Products Table - Remove unused columns
-- ============================================================================
-- Removes: tags, description, is_active
-- These are not needed for the simplified product catalog

-- Drop indexes first
DROP INDEX IF EXISTS idx_products_tags;
DROP INDEX IF EXISTS idx_products_is_active;

-- Drop columns
ALTER TABLE public.products
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS is_active;

-- Update table comment
COMMENT ON TABLE public.products IS 'Simplified product catalog for organizations. Core fields: name, category, price.';
