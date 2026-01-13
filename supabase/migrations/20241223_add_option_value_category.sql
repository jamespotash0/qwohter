-- ============================================
-- Add Category Column to pc_option_values
-- ============================================
-- Enables hierarchical filtering (e.g., finish_color by finish_style)
-- ============================================

-- Add category column (simple text)
ALTER TABLE pc_option_values
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_pc_option_values_category
ON pc_option_values(category);

-- Add composite index for group + category queries
CREATE INDEX IF NOT EXISTS idx_pc_option_values_group_category
ON pc_option_values(option_group_id, category);

-- ============================================
-- COLUMN USAGE
-- ============================================
--
-- The category column links option values to a parent value.
--
-- Example: finish_color values linked to finish_style
--   value: "Silver Fan"
--   category: "Vinyl"
--
-- Query to filter colors by selected style:
--   SELECT * FROM pc_option_values
--   WHERE option_group_id = (finish_color_group_id)
--     AND category = 'Vinyl';
--
-- ============================================

COMMENT ON COLUMN pc_option_values.category IS 'Parent category for hierarchical filtering (e.g., Vinyl, Fabric for finish colors)';
