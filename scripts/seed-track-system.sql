-- ============================================
-- SEED TRACK SYSTEM OPTIONS
-- ============================================
-- Track system options for all product types
-- Extracted from generate_product_models.py

INSERT INTO pc_option_values (id, option_group_id, value, sort_order, is_active)
SELECT
  gen_random_uuid(),
  (SELECT id FROM pc_option_groups WHERE slug = 'track_system'),
  system,
  row_number() OVER () as sort_order,
  true
FROM (
  SELECT unnest(ARRAY[
    -- Operable Walls - Kwik-Wall Aluminum
    'Type 425 Aluminum Track',
    'Type 850 Aluminum Track',
    -- Operable Walls - Steel
    'Type 11L Steel Track',
    'Type H.D. Electric Steel',
    -- Hufcor Aluminum
    'Type 26 Aluminum Track',
    'Type 36 Aluminum Track',
    'Type 38 Aluminum Track',
    'Type 57 Aluminum Track',
    -- Hufcor Steel
    'Type 11 Steel Track',
    -- Glass Walls
    'Architectural Grade Extruded Aluminum Alloy 6063-T6',
    -- Accordion
    'Curtition #4 Architectural Grade Aluminum Extrusion'
  ]) as system
) systems;

-- ============================================
-- VERIFY
-- ============================================
SELECT COUNT(*) as total_track_systems FROM pc_option_values
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'track_system');
