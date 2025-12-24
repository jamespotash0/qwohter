-- ============================================
-- UNISPAN U900 CONFIGURATION
-- ============================================
-- Model options and allowed values for finish_style & finish_color


-- ============================================
-- 1. MODEL OPTIONS - Link finish options to U900
-- ============================================

INSERT INTO pc_model_options (
  id, model_id, option_group_id, display_order, display_group,
  grid_span, placeholder, help_text, is_required, is_multi_select,
  is_manual_select, is_visible
)
SELECT
  gen_random_uuid(),
  (SELECT id FROM product_models WHERE name = 'U900'),
  og.id,
  cfg.display_order,
  cfg.display_group,
  cfg.grid_span,
  cfg.placeholder,
  cfg.help_text,
  cfg.is_required,
  cfg.is_multi_select,
  cfg.is_manual_select,
  cfg.is_visible
FROM pc_option_groups og
JOIN (VALUES
  ('finish_style', 1, 'primary', 2, 'Select finish type', 'Side panel face finish', true, false, true, true),
  ('finish_color', 2, 'primary', 2, 'Select color', 'Based on finish style', true, false, true, true)
) AS cfg(slug, display_order, display_group, grid_span, placeholder, help_text, is_required, is_multi_select, is_manual_select, is_visible)
ON og.slug = cfg.slug
ON CONFLICT (model_id, option_group_id) DO NOTHING;

-- ============================================
-- 2. ALLOWED VALUES - finish_style (6 options)
-- ============================================

INSERT INTO pc_model_allowed_values (id, model_option_id, option_value_id, is_default, sort_order, is_active)
SELECT
  gen_random_uuid(),
  mo.id,
  ov.id,
  ov.value = 'Vinyl',
  CASE ov.value
    WHEN 'Vinyl' THEN 1
    WHEN 'Fabric' THEN 2
    WHEN 'Carpet' THEN 3
    WHEN 'Wood Veneer' THEN 4
    WHEN 'High-Pressure Laminate' THEN 5
    WHEN 'Unfinished' THEN 6
  END,
  true
FROM pc_model_options mo
JOIN pc_option_groups og ON mo.option_group_id = og.id
JOIN pc_option_values ov ON ov.option_group_id = og.id
WHERE mo.model_id = (SELECT id FROM product_models WHERE name = 'U900')
  AND og.slug = 'finish_style'
  AND ov.value IN ('Vinyl', 'Fabric', 'Carpet', 'Wood Veneer', 'High-Pressure Laminate', 'Unfinished')
ON CONFLICT (model_option_id, option_value_id) DO NOTHING;

-- ============================================
-- 3. ALLOWED VALUES - finish_color (use categories for filtering)
-- ============================================
-- Allow all colors that have a category matching our finish_styles
-- The frontend will filter dynamically based on selected finish_style

INSERT INTO pc_model_allowed_values (id, model_option_id, option_value_id, is_default, sort_order, is_active)
SELECT
  gen_random_uuid(),
  mo.id,
  ov.id,
  false,
  ov.sort_order,
  true
FROM pc_model_options mo
JOIN pc_option_groups og ON mo.option_group_id = og.id
JOIN pc_option_values ov ON ov.option_group_id = og.id
WHERE mo.model_id = (SELECT id FROM product_models WHERE name = 'U900')
  AND og.slug = 'finish_color'
  AND ov.category IN (
    'Standard Vinyl', 'Upgrade Vinyl',
    'Standard Fabric', 'Upgrade Fabric',
    'Standard Carpet', 'Upgrade Carpet',
    'Standard Wood Veneer',
    'High-Pressure Laminate'
  )
ON CONFLICT (model_option_id, option_value_id) DO NOTHING;

-- ============================================
-- VERIFY
-- ============================================

SELECT 'model_options' as type, og.slug, mo.display_order
FROM pc_model_options mo
JOIN pc_option_groups og ON og.id = mo.option_group_id
WHERE mo.model_id = (SELECT id FROM product_models WHERE name = 'U900')
ORDER BY mo.display_order;

SELECT 'allowed_values' as type, og.slug, COUNT(*) as count
FROM pc_model_allowed_values mav
JOIN pc_model_options mo ON mo.id = mav.model_option_id
JOIN pc_option_groups og ON og.id = mo.option_group_id
WHERE mo.model_id = (SELECT id FROM product_models WHERE name = 'U900')
GROUP BY og.slug;
