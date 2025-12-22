-- ============================================
-- SEED FINAL CLOSURE OPTIONS
-- ============================================
-- Final closure system options for all product types
-- Extracted from generate_product_models.py

INSERT INTO pc_option_values (id, option_group_id, value, sort_order, is_active)
SELECT
  gen_random_uuid(),
  (SELECT id FROM pc_option_groups WHERE slug = 'final_closure_system'),
  closure,
  row_number() OVER () as sort_order,
  true
FROM (
  SELECT unnest(ARRAY[
    -- Operable Walls - Common
    'Hinged Panel(s)',
    'Pocket Door(s)',
    'Expander Panel',
    'Portal Expander Panel',
    -- Operable Walls - Hinged-Paired
    'Communicating Panel',
    'Lap Panel',
    'Single Panel Expander',
    'Three-Panel-Train',
    -- Electric Continuously-Hinged (2050e)
    'Manual Half Panel',
    -- Electric Continuously-Hinged (3050e)
    'L-Jamb',
    'Manual Half Panel Pivot',
    'Automatic Half Panel Pivot',
    -- Hufcor
    'Expanding Jamb (Lever) Panel',
    -- Glass Walls (Stella)
    'Panel-Mounted Telescoping Jamb',
    'Wall-Mounted Telescoping Jamb',
    'Full-Height Door',
    -- Glass Walls (Luna, Illona, Mata)
    'Hinged Closure Panel',
    -- Glass Walls (Ava)
    'Fixed Pivot Panel',
    'Fixed Swing Panel',
    -- Accordion
    'Latch Mechanism',
    'Tiebacks'
  ]) as closure
) closures;

-- ============================================
-- VERIFY
-- ============================================
SELECT COUNT(*) as total_final_closures FROM pc_option_values
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'final_closure');
