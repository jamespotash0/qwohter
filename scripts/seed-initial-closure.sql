-- ============================================
-- SEED INITIAL CLOSURE OPTIONS
-- ============================================
-- Initial closure system options for operable walls
-- Extracted from generate_product_models.py

INSERT INTO pc_option_values (id, option_group_id, value, sort_order, is_active)
SELECT
  gen_random_uuid(),
  (SELECT id FROM pc_option_groups WHERE slug = 'initial_closure'),
  closure,
  row_number() OVER () as sort_order,
  true
FROM (
  SELECT unnest(ARRAY[
    -- Standard Operable Walls (2000/3000 Series)
    'Bulb Seal',
    'Fixed Starter Jamb',
    'Adjustable Starter Jamb',
    -- Electric Continuously-Hinged (2050e)
    'Adjustable-Compensating',
    -- Electric Continuously-Hinged (3050e)
    'Fixed Ball Seal'
  ]) as closure
) closures;

-- ============================================
-- VERIFY
-- ============================================
SELECT COUNT(*) as total_initial_closures FROM pc_option_values
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'initial_closure');
