-- =============================================================================
-- Migration: Migrate finish_color from pc_option_values → config_value_sets
-- =============================================================================
--
-- This migration reads finish_color data from pc_option_groups and pc_option_values
-- and transforms it into the new config_value_sets format.
--
-- Only finish_color is migrated because it has category data needed for cascading.
-- Other option groups will be defined directly in config_schema on product_models.
--
-- MAPPING:
-- pc_option_values.value    → values[].code AND values[].label
-- pc_option_values.sort_order → values[].sort_order
-- pc_option_values.category → values[].category (for cascading by finish_style)
-- =============================================================================

-- Step 1: Migrate finish_color to config_value_sets
INSERT INTO config_value_sets (slug, name, category, "values")
SELECT
  og.slug,
  og.name,
  'colors',  -- Category for the value set itself
  -- Build JSONB array of values with category for cascading
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'code', ov.value,
          'label', ov.value,
          'sort_order', ov.sort_order
        ) ||
        -- Add category for cascading (e.g., "Standard Vinyl", "Upgrade Fabric")
        CASE
          WHEN ov.category IS NOT NULL THEN
            jsonb_build_object('category', ov.category)
          ELSE '{}'::jsonb
        END
        ORDER BY ov.category, ov.sort_order, ov.value
      )
      FROM pc_option_values ov
      WHERE ov.option_group_id = og.id
        AND ov.is_active = true
    ),
    '[]'::jsonb
  ) AS "values"
FROM pc_option_groups og
WHERE og.slug = 'finish_color'
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- Step 2: Verification
-- =============================================================================

DO $$
DECLARE
  v_value_count INTEGER;
  v_category_count INTEGER;
BEGIN
  -- Count values migrated
  SELECT jsonb_array_length("values") INTO v_value_count
  FROM config_value_sets
  WHERE slug = 'finish_color';

  -- Count distinct categories
  SELECT COUNT(DISTINCT elem->>'category') INTO v_category_count
  FROM config_value_sets,
       jsonb_array_elements("values") AS elem
  WHERE slug = 'finish_color'
    AND elem->>'category' IS NOT NULL;

  IF v_value_count > 0 THEN
    RAISE NOTICE '✅ finish_color migrated: % values across % categories',
      v_value_count, v_category_count;
  ELSE
    RAISE WARNING '⚠️ finish_color migration failed or no values found';
  END IF;
END $$;

-- =============================================================================
-- Sample query to verify
-- =============================================================================
-- SELECT
--   elem->>'code' as code,
--   elem->>'label' as label,
--   elem->>'category' as category
-- FROM config_value_sets,
--      jsonb_array_elements("values") AS elem
-- WHERE slug = 'finish_color'
-- ORDER BY elem->>'category', (elem->>'sort_order')::int;
