-- ============================================
-- SEED STC RATING OPTIONS
-- ============================================
-- STC (Sound Transmission Class) ratings for all product types
-- Extracted from generate_product_models.py

INSERT INTO pc_option_values (id, option_group_id, value, sort_order, is_active)
SELECT
  gen_random_uuid(),
  (SELECT id FROM pc_option_groups WHERE slug = 'stc_rating'),
  rating,
  row_number() OVER () as sort_order,
  true
FROM (
  SELECT unnest(ARRAY[
    -- Numeric STC ratings (sorted by value)
    '33',   -- Illona Glass
    '35',   -- VL-2 Accordion
    '38',   -- GL models, VL-6 Accordion
    '40',   -- VL-8 Accordion, Operable Vinyl skin
    '43',   -- Luna Glass, Hufcor 641/642
    '44',   -- Stella Glass
    '47',   -- Hufcor 641/642
    '49',   -- Hufcor 641/642
    '50',   -- Stella Glass, Operable Vinyl/Fabric skin (dynamic)
    '52',   -- Hufcor 641/642
    '54',   -- Hufcor 641/642
    '56',   -- Hufcor 641/642
    -- Non-acoustic option
    'Non-Acoustic'  -- Ava Glass, Mata Glass, MK-X/MK-XX Accordion
  ]) as rating
) ratings;

-- ============================================
-- VERIFY
-- ============================================
SELECT COUNT(*) as total_stc_ratings FROM pc_option_values
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'stc_rating');
