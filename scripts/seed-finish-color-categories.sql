-- ============================================
-- FINISH COLOR CATEGORIES
-- ============================================
-- Links finish_color values to finish_style + tier (Standard/Upgrade)
-- ============================================

-- VINYL: Koroseal Standard
UPDATE pc_option_values SET category = 'Standard Vinyl'
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'finish_color')
  AND value IN (
    'Silver Fan', 'Dover Gray', 'Rectory', 'Skylight', 'Frost', 'Surfside',
    'Mesh', 'Nettle', 'Fused', 'Tangle', 'Spun', 'Rolled', 'Inscription',
    'Joie de Vivre', 'Zydeco', 'Fine Silver', 'Beignet', 'French Quarter',
    'Mink', 'Tuxedo', 'Truffle', 'Ionic Grey', 'Inkwell', 'Magnolia',
    'Hemline', 'Clothesline', 'Draperie', 'Cotton', 'Silk', 'Cloth',
    'Stitch', 'Origin', 'Artisan', 'Linen', 'Bone', 'Eggshell'
  );

-- VINYL: Koroseal Upgrade
UPDATE pc_option_values SET category = 'Upgrade Vinyl'
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'finish_color')
  AND value IN (
    'Ash', 'Jacobean', 'Mocha', 'Prairie', 'Rustic', 'Sedona', 'Slate',
    'Vintage', 'Willow', 'Heir', 'Heritage', 'Generation', 'Pedigree',
    'Descent', 'Illusion', 'Mottled', 'Opalescence', 'Enchanted', 'Melded',
    'Fascination', 'Earnest', 'Baroness', 'Poplar', 'Hope', 'Expectation', 'Smoke'
  );

-- FABRIC: HyTex Standard
UPDATE pc_option_values SET category = 'Standard Fabric'
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'finish_color')
  AND value IN (
    'Cepheus', 'Cassiopeia', 'Pegasus', 'Phoenix', 'Hydrus', 'Pyxis',
    'Monoceros', 'Aquila', 'Orion', 'Pisces', 'Snow', 'Sand', 'Graphite',
    'Cottage', 'Mist', 'Starlight', 'Plaster', 'Gray', 'Discover', 'Bahamas',
    'Olive Grove', 'Silverado', 'Glacier', 'Element', 'Gated', 'Casarina',
    'Armor', 'Wilderness', 'Pepper', 'Laguna'
  );

-- FABRIC: HyTex Upgrade
UPDATE pc_option_values SET category = 'Upgrade Fabric'
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'finish_color')
  AND value IN (
    'Flan', 'Light Beige', 'Husky Gray', 'Primavera', 'Dovetail', 'Pigeon',
    'Magnetic', 'Deep Navy', 'Raisin', 'Knight', 'Mirage', 'Triton', 'Rock',
    'Metal', 'Basket', 'Coriander', 'Greige', 'Phoron', 'Sand Dollar',
    'Silhouette', 'Nightingale', 'Buttercup', 'Topaz', 'Jade', 'Palmwood',
    'Palm Desert', 'Beach Glass', 'Harvest', 'Morning Dove', 'Boulder',
    'Bravado', 'Saddle Brown', 'Earl Gray', 'Golden (Echo)', 'White (Echo)',
    'Tan (Echo)', 'Ice (Echo)', 'Silver (Echo)', 'Stone (Echo)', 'Lake (Echo)',
    'Smokey Blue (Echo)'
  );

-- CARPET: Shaw Standard
UPDATE pc_option_values SET category = 'Standard Carpet'
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'finish_color')
  AND value IN (
    'Moonscape', 'Whitewood', 'Almond', 'Pelican', 'Teak', 'Del Sol', 'Mohair',
    'Pottery Glaze', 'Hazelnut', 'Citrus Leaf', 'Mineral Green', 'Malachite',
    'Sierra', 'Expresso', 'Eclipse', 'Antique Silver', 'Riverboat', 'Seacliff',
    'Snake Skin', 'Flint', 'PierPointe', 'Lakeland', 'Blooms Berry', 'Ink',
    'Exotic Clay', 'Red Velvet', 'Roasted Pepper', 'Black Nickel', 'Onyx'
  );

-- CARPET: HyTex Upgrade
UPDATE pc_option_values SET category = 'Upgrade Carpet'
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'finish_color')
  AND value IN (
    'Ghost', 'Porcelain', 'Parchment', 'Beach', 'Cinnabar', 'Abalone', 'Lace',
    'Curry', 'Scarlet', 'Marble', 'Taffy', 'Hunter', 'Ruby', 'Flagstone',
    'Taupe', 'Teal', 'Marine', 'Gunmetal Grey', 'Sepia', 'Sumatra', 'Danube',
    'Navy', 'Black', 'Charcoal', 'Juniper', 'Cerulean', 'Verdigris'
  );

-- WOOD VENEER
UPDATE pc_option_values SET category = 'Standard Wood Veneer'
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'finish_color')
  AND value IN (
    'Unfinished Flat Cut White Maple',
    'Unfinished Flat Cut White Oak',
    'Unfinished Flat Cut Walnut',
    'Unfinished Flat Cut Cherry',
    'Unfinished Flat Cut Red Oak'
  );

-- HIGH-PRESSURE LAMINATE: Wilsonart
UPDATE pc_option_values SET category = 'High-Pressure Laminate'
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'finish_color')
  AND value IN (
    'Beigewood', 'Raw Chestnut', 'Fusion Maple', 'Manitoba Maple', 'Bannister Oak',
    'Limber Maple', 'Solar Oak', 'Fonthill Pear', 'Wild Cherry', 'Grey Glace',
    'Neutral Glace', 'Shadow Zephyr', 'Canyon Zephyr', 'Grey Pampas', 'Almond Leather',
    'Beige Pampas', 'Miste Zephyr', 'Twilight Zephyr', 'Desert Zephyr', 'Cloud Zephyr',
    'Burnished Chestnut', 'Windswept Pewter', 'Titanium Ev', 'Carbon Ev', 'Cloud Nebula',
    'White Nebula', 'Grey Nebula', 'Graphite Nebula', 'White Tigris', 'Evening Tigris',
    'Natural Tigris', 'Bronze Legacy', 'Navy Legacy', 'Pewter Brush', 'Woolamai Brush',
    'Grey', 'Beige', 'White', 'Antique White', 'Frosty White', 'Regimental Red',
    'Atlantis', 'Natural Almond', 'Khaki Brown', 'Pewter', 'North Sea', 'Slate Grey',
    'Dove Grey', 'Shadow', 'Hollyberry', 'Platinum', 'Brittany Blue', 'Pepperdust',
    'Designer White', 'Indigo', 'Fashion Grey', 'Crystal', 'White Sand', 'Lapis Blue',
    'Linen Alabaster', 'Wallaby', 'Coffee Bean', 'Island', 'Ocean', 'Cement',
    'Fossil Shale', 'Midnight', 'Beachwalk', 'Pebble Piazza', 'Milan Quartz',
    'Mystique Dawn', 'Kalahari Topaz'
  );


-- ============================================
-- VERIFY
-- ============================================

-- Count by category
SELECT category, COUNT(*) as color_count
FROM pc_option_values
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'finish_color')
  AND category IS NOT NULL
GROUP BY category
ORDER BY category;

-- Show any colors without a category
SELECT value as uncategorized_colors
FROM pc_option_values
WHERE option_group_id = (SELECT id FROM pc_option_groups WHERE slug = 'finish_color')
  AND category IS NULL
LIMIT 20;
