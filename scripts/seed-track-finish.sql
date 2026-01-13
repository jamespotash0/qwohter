-- ============================================
-- SEED TRACK FINISH OPTIONS
-- ============================================
-- Track finish options for glass wall models
-- Extracted from generate_product_models.py

INSERT INTO pc_option_values (id, option_group_id, value, sort_order, is_active)
SELECT
  gen_random_uuid(),
  (SELECT id FROM pc_option_groups WHERE slug = 'track_finish'),
  finish,
  row_number() OVER () as sort_order,
  true
FROM (
  SELECT unnest(ARRAY[
    -- Standard Anodized
    'Clear Anodized',
    -- Powder Coat - Standard Colors
    'Black Powder Coat',
    'White Powder Coat',
    'White',
    -- Custom
    'Custom RAL Color Option'
  ]) as finish
) finishes;

-- ============================================
-- VERIFY
-- ============================================
SELECT COUNT(*) as total_track_finishes FROM pc_option_values
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'track_finish');
