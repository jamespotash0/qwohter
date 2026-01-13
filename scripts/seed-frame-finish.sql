-- ============================================
-- SEED FRAME FINISH OPTIONS
-- ============================================
-- Frame finish options for glass wall models
-- Extracted from generate_product_models.py

INSERT INTO pc_option_values (id, option_group_id, value, sort_order, is_active)
SELECT
  gen_random_uuid(),
  (SELECT id FROM pc_option_groups WHERE slug = 'frame_finish'),
  finish,
  row_number() OVER () as sort_order,
  true
FROM (
  SELECT unnest(ARRAY[
    -- Standard Anodized
    'Clear Anodized',
    -- Powder Coat - Standard Colors
    'Black',
    'Black Powder Coat',
    'White',
    'White Powder Coat',
    -- Powder Coat - Custom
    'Custom RAL Powder Coat',
    'Custom RAL Color Options',
    -- Wood Look
    'Sublimation Wood Look',
    -- Mata Wood Stains
    'Stained Fruitwood Dark Oak',
    'Stained Wheat',
    'Stained Cordovan',
    -- Mata Painted
    'Painted Black',
    'Painted White',
    'Unfinished'
  ]) as finish
) finishes;

-- ============================================
-- VERIFY
-- ============================================
SELECT COUNT(*) as total_frame_finishes FROM pc_option_values
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'frame_finish');
