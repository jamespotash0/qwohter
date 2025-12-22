-- ============================================
-- SEED PANEL FACES OPTIONS
-- ============================================
-- Panel face options for glass and accordion models
-- Extracted from generate_product_models.py

INSERT INTO pc_option_values (id, option_group_id, value, sort_order, is_active)
SELECT
  gen_random_uuid(),
  (SELECT id FROM pc_option_groups WHERE slug = 'panel_face'),
  face,
  row_number() OVER () as sort_order,
  true
FROM (
  SELECT unnest(ARRAY[
    -- Glass Walls - Common
    'Solid Face',
    'MDF-Backed Melamine',
    'High Pressure Laminate',
    -- Glass Walls (Stella, Luna)
    'Electrical Internal Mini-Blinds',
    -- Glass Walls (Stella)
    'Internal Mullions & Muntins',
    -- Glass Walls (Luna)
    'Internal Muntins',
    -- Glass Walls (Illona)
    'Surface-Mounted Muntins',
    -- Glass Walls (Mata)
    'Wood Insert',
    'Mullions & Surface-Mounted Muntins',
    -- Accordion (VL & MK Series)
    'Reinforced Vinyl Fabric w/ Voven Backing',
    'Non-Woven Carpet',
    -- Accordion (VL Series only)
    'Customer Supplied Materials'
  ]) as face
) faces;

-- ============================================
-- VERIFY
-- ============================================
SELECT COUNT(*) as total_panel_faces FROM pc_option_values
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'panel_face');
