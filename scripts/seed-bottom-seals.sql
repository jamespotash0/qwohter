-- ============================================
-- SEED BOTTOM SEALS OPTIONS
-- ============================================
-- Bottom seal options for all product types
-- Extracted from generate_product_models.py

INSERT INTO pc_option_values (id, option_group_id, value, sort_order, is_active)
SELECT
  gen_random_uuid(),
  (SELECT id FROM pc_option_groups WHERE slug = 'bottom_seals'),
  seal,
  row_number() OVER () as sort_order,
  true
FROM (
  SELECT unnest(ARRAY[
    -- Operable Walls
    'Operable',
    'Adjustable',
    'Automatic',
    'Fixed',
    -- Operable Walls (Hufcor)
    'Retractable',
    'Retractable (2")',
    'Retractable (4")',
    -- Glass Walls (Stella)
    'Electric',
    'Semi-Automatic',
    'Manual',
    -- Glass Walls (Luna)
    'Floor Supported Fixed Bulb',
    'Top Supported Fixed Brush',
    -- Glass Walls (Illona, Ava)
    'Fixed Brush',
    -- Glass Walls (Mata)
    'Fixed Flexible Vinyl',
    -- Accordion (VL Series)
    '1-1/2" multi-ply rubberized sweep strip',
    '3" multi-ply rubberized sweep strip'
  ]) as seal
) seals;

-- ============================================
-- VERIFY
-- ============================================
SELECT COUNT(*) as total_bottom_seals FROM pc_option_values
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'bottom_seals');
