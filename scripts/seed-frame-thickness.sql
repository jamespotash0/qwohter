-- ============================================
-- SEED FRAME THICKNESS OPTIONS
-- ============================================
-- Frame thickness values for glass wall models
-- Extracted from generate_product_models.py

INSERT INTO pc_option_values (id, option_group_id, value, sort_order, is_active)
SELECT
  gen_random_uuid(),
  (SELECT id FROM pc_option_groups WHERE slug = 'frame_thickness'),
  thickness,
  row_number() OVER () as sort_order,
  true
FROM (
  SELECT unnest(ARRAY[
    -- Glass wall frame thicknesses (sorted by size)
    '1 3/8"',   -- Illona
    '1 7/16"',  -- Ava
    '1 3/4"',   -- Mata
    '2 3/4"',   -- Luna
    -- Stella dynamic frame thickness (depends on STC Rating)
    '4 9/16"',   -- Stella STC 44
    '4 11/16"'    -- Stella STC 50
  ]) as thickness
) thicknesses;

-- ============================================
-- VERIFY
-- ============================================
SELECT COUNT(*) as total_frame_thicknesses FROM pc_option_values
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'frame_thickness');
