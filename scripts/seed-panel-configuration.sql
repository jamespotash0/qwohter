-- ============================================
-- SEED PANEL CONFIGURATION OPTIONS
-- ============================================
-- Panel configuration options for glass wall models
-- Extracted from generate_product_models.py

INSERT INTO pc_option_values (id, option_group_id, value, sort_order, is_active)
SELECT
  gen_random_uuid(),
  (SELECT id FROM pc_option_groups WHERE slug = 'panel_configuration'),
  config,
  row_number() OVER () as sort_order,
  true
FROM (
  SELECT unnest(ARRAY[
    -- Glass Walls - Multi-Directional (all models)
    'Individual, Multi-Directional Panels',
    -- Glass Walls (Stella)
    'Individual, Single Carrier Panels',
    'Individual, Fully Automatic Panels',
    -- Glass Walls (Luna, Illona, Mata)

    'Pivoting Individual Panels',
    -- Glass Walls (Illona, Mata)
    'Single & Telescoping Slider Panels'
  ]) as config
) configs;

-- ============================================
-- VERIFY
-- ============================================
SELECT COUNT(*) as total_panel_configs FROM pc_option_values
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'panel_configuration');
