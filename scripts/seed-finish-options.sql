
-- ============================================
-- 2. INSERT ALL OPTION VALUES
-- ============================================

INSERT INTO pc_option_values (id, option_group_id, value, sort_order, is_active)
SELECT
  gen_random_uuid(),
  (SELECT id FROM pc_option_groups WHERE slug = 'finish_color'),
  color,
  row_number() OVER () as sort_order,
  true
FROM (
  SELECT DISTINCT unnest(ARRAY[
    -- Koroseal Standard Vinyl
    'Silver Fan', 'Dover Gray', 'Rectory', 'Skylight', 'Frost', 'Surfside', 'Mesh', 'Nettle', 'Fused', 'Tangle', 'Spun', 'Rolled', 'Inscription', 'Joie de Vivre', 'Zydeco', 'Fine Silver', 'Beignet', 'French Quarter', 'Mink', 'Tuxedo', 'Truffle', 'Ionic Grey', 'Inkwell', 'Magnolia', 'Hemline', 'Clothesline', 'Draperie', 'Cotton', 'Silk', 'Cloth', 'Stitch', 'Origin', 'Artisan', 'Linen', 'Bone', 'Eggshell',
    -- Koroseal Upgrade Vinyl
    'Ash', 'Jacobean', 'Mocha', 'Prairie', 'Rustic', 'Sedona', 'Slate', 'Vintage', 'Willow', 'Heir', 'Heritage', 'Generation', 'Pedigree', 'Descent', 'Illusion', 'Mottled', 'Opalescence', 'Enchanted', 'Melded', 'Fascination', 'Earnest', 'Baroness', 'Poplar', 'Hope', 'Expectation', 'Smoke',
    -- Shaw Standard Carpet
    'Moonscape', 'Whitewood', 'Almond', 'Pelican', 'Teak', 'Del Sol', 'Mohair', 'Pottery Glaze', 'Hazelnut', 'Citrus Leaf', 'Mineral Green', 'Malachite', 'Sierra', 'Expresso', 'Eclipse', 'Antique Silver', 'Riverboat', 'Seacliff', 'Snake Skin', 'Flint', 'PierPointe', 'Lakeland', 'Blooms Berry', 'Ink', 'Exotic Clay', 'Red Velvet', 'Roasted Pepper', 'Black Nickel', 'Onyx',
    -- HyTex Upgrade Carpet
    'Ghost', 'Porcelain', 'Parchment', 'Beach', 'Cinnabar', 'Abalone', 'Lace', 'Curry', 'Scarlet', 'Marble', 'Taffy', 'Hunter', 'Ruby', 'Flagstone', 'Taupe', 'Teal', 'Marine', 'Gunmetal Grey', 'Sepia', 'Sumatra', 'Danube', 'Navy', 'Black', 'Charcoal', 'Juniper', 'Cerulean', 'Verdigris',
    -- HyTex Standard Fabric
    'Cepheus', 'Cassiopeia', 'Pegasus', 'Phoenix', 'Hydrus', 'Pyxis', 'Monoceros', 'Aquila', 'Orion', 'Pisces', 'Snow', 'Sand', 'Graphite', 'Cottage', 'Mist', 'Starlight', 'Plaster', 'Gray', 'Discover', 'Bahamas', 'Olive Grove', 'Silverado', 'Glacier', 'Element', 'Gated', 'Casarina', 'Armor', 'Wilderness', 'Pepper', 'Laguna',
    -- HyTex Upgrade Fabric
    'Flan', 'Light Beige', 'Husky Gray', 'Primavera', 'Dovetail', 'Pigeon', 'Magnetic', 'Deep Navy', 'Raisin', 'Knight', 'Mirage', 'Triton', 'Rock', 'Metal', 'Basket', 'Coriander', 'Greige', 'Phoron', 'Sand Dollar', 'Silhouette', 'Nightingale', 'Buttercup', 'Topaz', 'Jade', 'Palmwood', 'Palm Desert', 'Beach Glass', 'Harvest', 'Morning Dove', 'Boulder', 'Bravado', 'Saddle Brown', 'Earl Gray', 'Golden (Echo)', 'White (Echo)', 'Tan (Echo)', 'Ice (Echo)', 'Silver (Echo)', 'Stone (Echo)', 'Lake (Echo)', 'Smokey Blue (Echo)',
    -- Standard Wood Veneer
    'Unfinished Flat Cut White Maple', 'Unfinished Flat Cut White Oak', 'Unfinished Flat Cut Walnut', 'Unfinished Flat Cut Cherry', 'Unfinished Flat Cut Red Oak',
    -- Wilsonart HPL
    'Beigewood', 'Raw Chestnut', 'Fusion Maple', 'Manitoba Maple', 'Bannister Oak', 'Limber Maple', 'Solar Oak', 'Fonthill Pear', 'Wild Cherry', 'Grey Glace', 'Neutral Glace', 'Shadow Zephyr', 'Canyon Zephyr', 'Grey Pampas', 'Almond Leather', 'Beige Pampas', 'Miste Zephyr', 'Twilight Zephyr', 'Desert Zephyr', 'Cloud Zephyr', 'Burnished Chestnut', 'Windswept Pewter', 'Titanium Ev', 'Carbon Ev', 'Cloud Nebula', 'White Nebula', 'Grey Nebula', 'Graphite Nebula', 'White Tigris', 'Evening Tigris', 'Natural Tigris', 'Bronze Legacy', 'Navy Legacy', 'Pewter Brush', 'Woolamai Brush', 'Grey', 'Beige', 'White', 'Antique White', 'Frosty White', 'Regimental Red', 'Atlantis', 'Natural Almond', 'Khaki Brown', 'Pewter', 'North Sea', 'Slate Grey', 'Dove Grey', 'Shadow', 'Hollyberry', 'Platinum', 'Brittany Blue', 'Pepperdust', 'Designer White', 'Indigo', 'Fashion Grey', 'Crystal', 'White Sand', 'Lapis Blue', 'Linen Alabaster', 'Wallaby', 'Coffee Bean', 'Island', 'Ocean', 'Cement', 'Fossil Shale', 'Midnight', 'Beachwalk', 'Pebble Piazza', 'Milan Quartz', 'Mystique Dawn', 'Kalahari Topaz'
  ]) as color
  ORDER BY color
) colors;

-- ============================================
-- VERIFY
-- ============================================
SELECT COUNT(*) as total_colors FROM pc_option_values
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'finish_color');
