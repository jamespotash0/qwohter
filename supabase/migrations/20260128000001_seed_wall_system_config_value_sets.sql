-- =============================================================================
-- Migration: Seed Wall System Config Value Sets
-- =============================================================================
--
-- This migration populates config_value_sets with wall system product options
-- extracted from the Wall Spec Sheet CSV. These value sets are then referenced
-- by config_schema on product_models via values_ref.
--
-- Categories Created:
-- - STC Ratings
-- - Track Systems
-- - Panel Skins
-- - Finish Materials
-- - Seals (Top, Bottom, Vertical)
-- - Panel Configurations
-- - Stacking Configurations
-- - Closure Systems (Initial, Final)
-- - Operation Types
-- - Glass Types
-- - Frame/Track Finishes
-- - Panel Accessories
-- =============================================================================

-- =============================================================================
-- 1. STC RATINGS
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'stc_ratings',
  'STC Ratings',
  'acoustic',
  '[
    {"code": "NON_ACOUSTIC", "label": "Non-Acoustic", "sort_order": 0, "metadata": {"rating": 0}},
    {"code": "STC_33", "label": "STC 33", "sort_order": 1, "metadata": {"rating": 33}},
    {"code": "STC_35", "label": "STC 35", "sort_order": 2, "metadata": {"rating": 35}},
    {"code": "STC_38", "label": "STC 38", "sort_order": 3, "metadata": {"rating": 38, "note": "Glass Insert compatible"}},
    {"code": "STC_40", "label": "STC 40", "sort_order": 4, "metadata": {"rating": 40}},
    {"code": "STC_42", "label": "STC 42", "sort_order": 5, "metadata": {"rating": 42}},
    {"code": "STC_43", "label": "STC 43", "sort_order": 6, "metadata": {"rating": 43}},
    {"code": "STC_44", "label": "STC 44", "sort_order": 7, "metadata": {"rating": 44}},
    {"code": "STC_45", "label": "STC 45", "sort_order": 8, "metadata": {"rating": 45}},
    {"code": "STC_46", "label": "STC 46", "sort_order": 9, "metadata": {"rating": 46}},
    {"code": "STC_48", "label": "STC 48", "sort_order": 10, "metadata": {"rating": 48}},
    {"code": "STC_49", "label": "STC 49 (Standard)", "sort_order": 11, "metadata": {"rating": 49, "is_standard": true}},
    {"code": "STC_50", "label": "STC 50", "sort_order": 12, "metadata": {"rating": 50}},
    {"code": "STC_51", "label": "STC 51", "sort_order": 13, "metadata": {"rating": 51, "requires": "steel_skins"}},
    {"code": "STC_52", "label": "STC 52 (Standard)", "sort_order": 14, "metadata": {"rating": 52, "is_standard": true, "requires": "steel_skins"}},
    {"code": "STC_56", "label": "STC 56", "sort_order": 15, "metadata": {"rating": 56, "requires": "steel_skins"}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 2. TRACK SYSTEMS
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'track_systems',
  'Track Systems',
  'structural',
  '[
    {"code": "CURTITION_4", "label": "Curtition #4", "sort_order": 0, "category": "accordion"},
    {"code": "6063_T6", "label": "6063-T6 Aluminum", "sort_order": 1, "category": "glass"},
    {"code": "TYPE_425_AL", "label": "Type 425 Aluminum (up to 525 lbs)", "sort_order": 2, "category": "operable", "metadata": {"max_weight_lbs": 525}},
    {"code": "TYPE_850_AL", "label": "Type 850 Aluminum (up to 850 lbs)", "sort_order": 3, "category": "operable", "metadata": {"max_weight_lbs": 850}},
    {"code": "TYPE_11L_STEEL", "label": "Type 11L Steel (up to 900 lbs)", "sort_order": 4, "category": "operable", "metadata": {"max_weight_lbs": 900}},
    {"code": "TYPE_HD_STEEL", "label": "Type H.D. Steel", "sort_order": 5, "category": "operable"},
    {"code": "UNISPAN_TRUSS", "label": "Unispan Truss Support w/ Type 40 Aluminum", "sort_order": 6, "category": "operable"}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 3. PANEL SKINS (OPERABLE)
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'panel_skins',
  'Panel Skins',
  'materials',
  '[
    {"code": "ACOUSTICAL_SUBSTRATE", "label": "Acoustical Substrate", "sort_order": 0, "metadata": {"is_standard_20xx": true}},
    {"code": "STEEL_SKINS", "label": "Steel Skins", "sort_order": 1, "metadata": {"is_standard_30xx": true, "enables_high_stc": true}},
    {"code": "WOOD_VENEER", "label": "Wood Veneer", "sort_order": 2, "metadata": {"excludes_stc": ["STC_51", "STC_52", "STC_56"]}},
    {"code": "HPL", "label": "High Pressure Laminate (HPL)", "sort_order": 3, "metadata": {"excludes_stc": ["STC_51", "STC_52", "STC_56"]}},
    {"code": "GLASS", "label": "Glass Insert", "sort_order": 4, "metadata": {"model_suffix": "GL"}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 4. PANEL FACE OPTIONS (ACCORDION & GLASS)
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'panel_faces_accordion',
  'Panel Faces (Accordion)',
  'materials',
  '[
    {"code": "VINYL_FABRIC", "label": "Reinforced Vinyl Fabric", "sort_order": 0},
    {"code": "CARPET", "label": "Carpet", "sort_order": 1},
    {"code": "NON_WOVEN", "label": "Non-Woven", "sort_order": 2},
    {"code": "CUSTOMER_SUPPLIED", "label": "Customer Supplied", "sort_order": 3}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'panel_faces_glass',
  'Panel Faces (Glass)',
  'materials',
  '[
    {"code": "SOLID_FACE", "label": "Solid Face", "sort_order": 0, "category": "STELLA"},
    {"code": "MDF_MELAMINE", "label": "MDF-Backed Melamine", "sort_order": 1, "category": "STELLA,LUNA"},
    {"code": "HPL", "label": "High Pressure Laminate (HPL)", "sort_order": 2, "category": "STELLA,LUNA"},
    {"code": "INTERNAL_BLINDS", "label": "Electrical Internal Mini-Blinds", "sort_order": 3, "category": "STELLA,LUNA"},
    {"code": "INTERNAL_MULLIONS", "label": "Internal Mullions & Muntins", "sort_order": 4, "category": "STELLA"},
    {"code": "INTERNAL_MUNTINS", "label": "Internal Muntins", "sort_order": 5, "category": "LUNA"},
    {"code": "SURFACE_MUNTINS", "label": "Surface Mounted Muntins", "sort_order": 6, "category": "ILLONA"}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 5. FINISH MATERIALS (Operable)
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'finish_styles',
  'Finish Styles',
  'finishes',
  '[
    {"code": "KOROSEAL_STD_VINYL", "label": "Koroseal Standard Vinyl", "sort_order": 0, "category": "vinyl", "metadata": {"is_upgrade": false}},
    {"code": "KOROSEAL_UPG_VINYL", "label": "Koroseal Upgrade Vinyl", "sort_order": 1, "category": "vinyl", "metadata": {"is_upgrade": true}},
    {"code": "SHAW_STD_CARPET", "label": "Shaw Standard Carpet", "sort_order": 2, "category": "carpet", "metadata": {"is_upgrade": false}},
    {"code": "HYTEX_UPG_CARPET", "label": "HyTex Upgrade Carpet", "sort_order": 3, "category": "carpet", "metadata": {"is_upgrade": true}},
    {"code": "HYTEX_STD_FABRIC", "label": "HyTex Standard Fabric", "sort_order": 4, "category": "fabric", "metadata": {"is_upgrade": false}},
    {"code": "HYTEX_UPG_FABRIC", "label": "HyTex Upgrade Fabric", "sort_order": 5, "category": "fabric", "metadata": {"is_upgrade": true}},
    {"code": "STD_WOOD_VENEER", "label": "Standard Wood Veneer", "sort_order": 6, "category": "wood", "metadata": {"is_upgrade": false}},
    {"code": "WILSONART_HPL", "label": "Wilsonart High Pressure Laminate (HPL)", "sort_order": 7, "category": "laminate", "metadata": {"is_upgrade": false}},
    {"code": "UNFINISHED", "label": "Unfinished", "sort_order": 8, "category": "other", "metadata": {"is_upgrade": false}},
    {"code": "CUSTOMER_SUPPLIED", "label": "Customer Supplied Material", "sort_order": 9, "category": "other", "metadata": {"is_upgrade": false}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 6. TOP SEALS
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'top_seals',
  'Top Seals',
  'seals',
  '[
    {"code": "FIXED", "label": "Fixed (Standard)", "sort_order": 0, "metadata": {"is_standard": true, "category": "operable"}},
    {"code": "OPERABLE", "label": "Operable (Optional)", "sort_order": 1, "metadata": {"is_optional": true, "category": "operable"}},
    {"code": "MULTI_PLY_HALF", "label": "1/2\" Multi-ply Rubberized Sweeps", "sort_order": 2, "metadata": {"category": "accordion"}},
    {"code": "ELECTRIC", "label": "Electric", "sort_order": 3, "metadata": {"category": "glass"}},
    {"code": "AUTOMATIC", "label": "Automatic", "sort_order": 4, "metadata": {"category": "glass"}},
    {"code": "SEMI_AUTOMATIC", "label": "Semi-Automatic", "sort_order": 5, "metadata": {"category": "glass"}},
    {"code": "MANUAL", "label": "Manual", "sort_order": 6, "metadata": {"category": "glass"}},
    {"code": "FIXED_BULB", "label": "Fixed Bulb", "sort_order": 7, "metadata": {"category": "glass", "note": "Floor Supported"}},
    {"code": "FIXED_BRUSH", "label": "Fixed Brush", "sort_order": 8, "metadata": {"category": "glass", "note": "Top-Supported"}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 7. BOTTOM SEALS
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'bottom_seals',
  'Bottom Seals',
  'seals',
  '[
    {"code": "OPERABLE", "label": "Operable (Standard)", "sort_order": 0, "metadata": {"is_standard": true, "category": "operable"}},
    {"code": "ADJUSTABLE", "label": "Adjustable (Optional)", "sort_order": 1, "metadata": {"is_optional": true, "category": "operable"}},
    {"code": "AUTOMATIC", "label": "Automatic (Optional)", "sort_order": 2, "metadata": {"is_optional": true, "category": "operable"}},
    {"code": "MULTI_PLY_1_5", "label": "1-1/2\" Multi-ply Rubberized Sweeps", "sort_order": 3, "metadata": {"category": "accordion"}},
    {"code": "MULTI_PLY_3", "label": "3\" Multi-ply Rubberized Sweeps", "sort_order": 4, "metadata": {"category": "accordion"}},
    {"code": "ELECTRIC", "label": "Electric", "sort_order": 5, "metadata": {"category": "glass"}},
    {"code": "FIXED_BULB", "label": "Fixed Bulb", "sort_order": 6, "metadata": {"category": "glass", "note": "Floor Supported"}},
    {"code": "FIXED_BRUSH", "label": "Fixed Brush", "sort_order": 7, "metadata": {"category": "glass", "note": "Top-Supported"}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 8. VERTICAL SEALS
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'vertical_seals',
  'Vertical Seals',
  'seals',
  '[
    {"code": "TRIMLESS_ASTRAGAL", "label": "Trimless Astragal (Standard)", "sort_order": 0, "metadata": {"is_standard": true}},
    {"code": "CAP_ASTRAGAL", "label": "Cap-type Astragal (Optional)", "sort_order": 1, "metadata": {"is_optional": true}},
    {"code": "MALE_FEMALE_GASKETS", "label": "Male/Female w/Full Length Gaskets", "sort_order": 2, "metadata": {"category": "glass"}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 9. PANEL CONFIGURATIONS
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'panel_configurations',
  'Panel Configurations',
  'structural',
  '[
    {"code": "SINGLE", "label": "Single", "sort_order": 0, "category": "accordion"},
    {"code": "HINGED_PAIRS", "label": "Hinged-Pairs", "sort_order": 1, "category": "accordion,operable"},
    {"code": "MULTIPLE_INTERSECTING", "label": "Multiple (Intersecting)", "sort_order": 2, "category": "accordion"},
    {"code": "INDIVIDUAL", "label": "Individual", "sort_order": 3, "category": "operable,glass"},
    {"code": "INDIVIDUAL_MULTI_DIR", "label": "Individual, Multi-Directional", "sort_order": 4, "category": "glass"},
    {"code": "INDIVIDUAL_SINGLE_CARRIER", "label": "Individual, Single Carrier", "sort_order": 5, "category": "glass"},
    {"code": "INDIVIDUAL_FULLY_AUTO", "label": "Individual, Fully-Automatic", "sort_order": 6, "category": "glass", "metadata": {"requires": {"operation": "AUTOMATED"}}},
    {"code": "CONTINUOUSLY_HINGED", "label": "Continuously-Hinged", "sort_order": 7, "category": "glass,operable"},
    {"code": "CONTINUOUSLY_HINGED_ELECTRIC", "label": "Continuously-Hinged (Electric)", "sort_order": 8, "category": "operable"},
    {"code": "PIVOTING", "label": "Pivoting", "sort_order": 9, "category": "glass"},
    {"code": "SLIDER_TELESCOPING", "label": "Slider Doors or Telescoping", "sort_order": 10, "category": "glass"},
    {"code": "HINGED_PAIRED", "label": "Hinged-Paired Panels", "sort_order": 11, "category": "glass"}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 10. STACKING CONFIGURATIONS
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'stacking_configurations',
  'Stacking Configurations',
  'structural',
  '[
    {"code": "PERPENDICULAR", "label": "Perpendicular (Standard)", "sort_order": 0, "metadata": {"is_standard": true, "category": "operable"}},
    {"code": "PARALLEL", "label": "Parallel", "sort_order": 1, "metadata": {"category": "operable"}},
    {"code": "REMOTE", "label": "Remote", "sort_order": 2, "metadata": {"category": "operable,glass"}},
    {"code": "OFFSET", "label": "Offset", "sort_order": 3, "metadata": {"category": "glass"}},
    {"code": "BI_PARTING", "label": "Bi-Parting", "sort_order": 4, "metadata": {"category": "glass"}},
    {"code": "CENTERLINE", "label": "Centerline (Standard)", "sort_order": 5, "metadata": {"is_standard": true, "category": "operable_hinged,glass"}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 11. INITIAL CLOSURE SYSTEMS
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'initial_closures',
  'Initial Closure Systems',
  'closures',
  '[
    {"code": "BULB_SEAL", "label": "Bulb Seal (Standard)", "sort_order": 0, "metadata": {"is_standard": true}},
    {"code": "FIXED_STARTER_JAMB", "label": "Fixed Starter Jamb (Optional)", "sort_order": 1, "metadata": {"is_optional": true}},
    {"code": "ADJ_STARTER_JAMB", "label": "Adjustable Starter Jamb (Optional)", "sort_order": 2, "metadata": {"is_optional": true}},
    {"code": "ADJ_COMPENSATING", "label": "Adjustable-Compensating (Standard)", "sort_order": 3, "metadata": {"is_standard": true, "note": "2050e/3050e"}},
    {"code": "FIXED_BALL_SEAL", "label": "Fixed Ball Seal", "sort_order": 4}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 12. FINAL CLOSURE SYSTEMS
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'final_closures',
  'Final Closure Systems',
  'closures',
  '[
    {"code": "HINGED_PANELS", "label": "Hinged Panel(s) (Standard)", "sort_order": 0, "metadata": {"is_standard": true}},
    {"code": "PORTAL_EXPANDER", "label": "Portal Expander Panel (Optional)", "sort_order": 1, "metadata": {"is_optional": true}},
    {"code": "EXPANDER_PANEL", "label": "Expander Panel (Standard)", "sort_order": 2, "metadata": {"is_standard": true, "note": "2020/3020"}},
    {"code": "POCKET_DOORS", "label": "Pocket Door(s) (Optional)", "sort_order": 3, "metadata": {"is_optional": true}},
    {"code": "MANUAL_HALF_PANEL", "label": "Manual Half Panel (Standard)", "sort_order": 4, "metadata": {"is_standard": true, "note": "2050e"}},
    {"code": "AUTO_HALF_PANEL", "label": "Automatic Half Panel (Optional)", "sort_order": 5, "metadata": {"is_optional": true, "note": "3050e"}},
    {"code": "COMMUNICATING_PANEL", "label": "Communicating Panel (Optional)", "sort_order": 6, "metadata": {"is_optional": true}},
    {"code": "LAP_PANEL", "label": "Lap Panel (Optional)", "sort_order": 7, "metadata": {"is_optional": true}},
    {"code": "SINGLE_EXPANDER", "label": "Single Panel Expander (Optional)", "sort_order": 8, "metadata": {"is_optional": true}},
    {"code": "THREE_PANEL_TRAIN", "label": "Three-Panel-Train (Optional)", "sort_order": 9, "metadata": {"is_optional": true, "note": "3030 only"}},
    {"code": "L_JAMB", "label": "L-Jamb", "sort_order": 10, "metadata": {"note": "3050e"}},
    {"code": "TIE_BACKS", "label": "Tie Backs", "sort_order": 11, "category": "accordion"},
    {"code": "LATCH_MECHANISM", "label": "Latch Mechanism", "sort_order": 12, "category": "accordion"},
    {"code": "PANEL_TELE_JAMB", "label": "Panel Mounted Telescoping Jamb", "sort_order": 13, "category": "glass"},
    {"code": "WALL_TELE_JAMB", "label": "Wall-Mounted Telescoping Jamb", "sort_order": 14, "category": "glass"},
    {"code": "FULL_HEIGHT_DOOR", "label": "Full-Height Door", "sort_order": 15, "category": "glass"},
    {"code": "HINGED_CLOSURE", "label": "Hinged Closure Panel", "sort_order": 16, "category": "glass"},
    {"code": "FIXED_PIVOT_SWING", "label": "Fixed Pivot Swing", "sort_order": 17, "category": "glass"},
    {"code": "FIXED_PANEL_SWING", "label": "Fixed Panel Swing", "sort_order": 18, "category": "glass"}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 13. OPERATION TYPES
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'operation_types',
  'Operation Types',
  'operation',
  '[
    {"code": "MANUAL", "label": "Manual", "sort_order": 0},
    {"code": "AUTOMATED", "label": "Automated Programmable Self-Driving Panels", "sort_order": 1, "metadata": {"category": "glass"}},
    {"code": "SEMI_AUTO_SEALS", "label": "Semi-Automated Seals", "sort_order": 2, "metadata": {"category": "glass"}},
    {"code": "ELECTRIC_115V", "label": "115v Electric Motor (Standard)", "sort_order": 3, "metadata": {"is_standard": true, "category": "operable_electric"}},
    {"code": "ELECTRIC_208V", "label": "208v Electric Motor (Optional)", "sort_order": 4, "metadata": {"is_optional": true, "category": "operable_electric"}},
    {"code": "OPERABLE", "label": "Operable", "sort_order": 5, "metadata": {"category": "glass"}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 14. GLASS TYPES
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'glass_types',
  'Glass Types',
  'materials',
  '[
    {"code": "TEMPERED_SAFETY", "label": "Tempered Safety Glass", "sort_order": 0},
    {"code": "SWITCHABLE", "label": "Switchable Glass", "sort_order": 1},
    {"code": "CHILD_SAFE", "label": "Child-Safe Glass", "sort_order": 2},
    {"code": "BACK_PAINTED", "label": "Fully Back-Painted Glass", "sort_order": 3},
    {"code": "HALF_CLEAR_TEMPERED", "label": "1/2\" Clear Tempered Safety Glass", "sort_order": 4, "metadata": {"model": "AVA"}},
    {"code": "GLAZED_ACOUSTICAL", "label": "Glazed Acoustical Insulated Glass (GL)", "sort_order": 5, "metadata": {"model_suffix": "GL"}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 15. FRAME FINISHES (Glass Systems)
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'frame_finishes',
  'Frame Finishes',
  'finishes',
  '[
    {"code": "CLEAR_ANODIZED", "label": "Clear Anodized (Standard)", "sort_order": 0, "metadata": {"is_standard": true}},
    {"code": "BLACK", "label": "Black (Standard)", "sort_order": 1, "metadata": {"is_standard": true}},
    {"code": "WHITE", "label": "White (Standard)", "sort_order": 2, "metadata": {"is_standard": true}},
    {"code": "BLACK_POWDER", "label": "Black Powder Coat (Standard)", "sort_order": 3, "metadata": {"is_standard": true}},
    {"code": "WHITE_POWDER", "label": "White Powder Coat (Standard)", "sort_order": 4, "metadata": {"is_standard": true}},
    {"code": "CUSTOM_RAL", "label": "Custom RAL Powder Coat (Optional)", "sort_order": 5, "metadata": {"is_optional": true}},
    {"code": "SUBLIMATION_WOOD", "label": "Sublimation Wood Look (Optional)", "sort_order": 6, "metadata": {"is_optional": true}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 16. TRACK FINISHES (Glass Systems)
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'track_finishes',
  'Track Finishes',
  'finishes',
  '[
    {"code": "CLEAR_ANODIZED", "label": "Clear Anodized", "sort_order": 0, "metadata": {"is_standard": true}},
    {"code": "BLACK_POWDER", "label": "Black Powder Coat", "sort_order": 1},
    {"code": "WHITE_POWDER", "label": "White Powder Coat", "sort_order": 2},
    {"code": "CUSTOM_RAL", "label": "Custom RAL Powder Coat (Optional)", "sort_order": 3, "metadata": {"is_optional": true}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 17. PANEL ACCESSORIES
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'panel_accessories',
  'Panel Accessories',
  'accessories',
  '[
    {"code": "SINGLE_PASS_DOOR", "label": "Single Pass Door", "sort_order": 0},
    {"code": "DOUBLE_PASS_DOOR", "label": "Double Pass Door", "sort_order": 1},
    {"code": "CONCEALED_CLOSURES", "label": "Concealed Door Closures", "sort_order": 2},
    {"code": "ROOM_VIEWERS", "label": "Room Viewers", "sort_order": 3},
    {"code": "EXIT_SIGNS", "label": "Exit Signs", "sort_order": 4},
    {"code": "DRY_ERASE", "label": "Dry Marker Writing Surfaces", "sort_order": 5},
    {"code": "ERASER_TRAYS", "label": "Recessed Eraser Trays", "sort_order": 6},
    {"code": "VISION_LITES", "label": "Vision Lites", "sort_order": 7},
    {"code": "TACK_SURFACES", "label": "Tack Surfaces", "sort_order": 8},
    {"code": "POCKET_DOORS", "label": "Pocket Doors", "sort_order": 9},
    {"code": "KEYED_LOCKS", "label": "Keyed Cylinder Locks", "sort_order": 10, "metadata": {"models": ["2050e", "3050e"]}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 18. ACCORDION ADDITIONAL OPTIONS
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'accordion_options',
  'Accordion Additional Options',
  'accessories',
  '[
    {"code": "LOCKS_ONE_SIDE", "label": "Locks One Side", "sort_order": 0},
    {"code": "LOCKS_BOTH_SIDES", "label": "Locks Both Sides", "sort_order": 1},
    {"code": "RADIUS_CONSTRUCTION", "label": "Radius Constructions", "sort_order": 2},
    {"code": "TRACK_SWITCHES", "label": "Track Switches for Alternate Storage", "sort_order": 3},
    {"code": "FLOATING_POSTS", "label": "Floating Posts for Latching", "sort_order": 4},
    {"code": "SLIDING_JAMB", "label": "Sliding Jamb Boards for Pocket Storage", "sort_order": 5},
    {"code": "CONVERSION_LATCH", "label": "Conversion Latch", "sort_order": 6, "metadata": {"models": ["VL-2/6/8"]}},
    {"code": "CEILING_GUARD", "label": "Ceiling Guard", "sort_order": 7}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 19. GLASS ADDITIONAL OPTIONS
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'glass_options',
  'Glass System Options',
  'accessories',
  '[
    {"code": "FLOOR_GUIDE", "label": "Floor Guide", "sort_order": 0, "metadata": {"models": ["LUNA", "ILLONA"]}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 20. TRACK MOUNTING OPTIONS (Accordion)
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'track_mounting',
  'Track Mounting Options',
  'structural',
  '[
    {"code": "SURFACE_MOUNTED", "label": "Surface Mounted", "sort_order": 0},
    {"code": "CONCEALED", "label": "Concealed", "sort_order": 1}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 21. STRUCTURAL SUPPORT TYPES
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'structural_support',
  'Structural Support Types',
  'structural',
  '[
    {"code": "TOP_SUPPORTED", "label": "Top Supported", "sort_order": 0},
    {"code": "FLOOR_SUPPORTED", "label": "Floor Supported", "sort_order": 1, "metadata": {"note": "Only Continuously Hinged"}},
    {"code": "TOP_AND_FLOOR", "label": "Top Supported (Individual) / Floor Supported (Continuously Hinged)", "sort_order": 2, "metadata": {"model": "LUNA"}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 22. PASS DOOR TYPES (Glass)
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'pass_door_types',
  'Pass Door Types',
  'doors',
  '[
    {"code": "FULL_HEIGHT", "label": "Full Height", "sort_order": 0, "metadata": {"has_options": true}},
    {"code": "INSET", "label": "Inset", "sort_order": 1, "metadata": {"has_options": true, "models": ["STELLA"]}},
    {"code": "FULL_HEIGHT_HINGED", "label": "Full-Height Hinged Closure", "sort_order": 2, "metadata": {"has_options": false}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 23. PASS DOOR OPTIONS (Glass)
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'pass_door_options',
  'Pass Door Options',
  'doors',
  '[
    {"code": "SINGLE", "label": "Single", "sort_order": 0},
    {"code": "DOUBLE", "label": "Double", "sort_order": 1}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 24. HINGING OPTIONS (Glass)
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'hinging_options',
  'Hinging Options',
  'hardware',
  '[
    {"code": "INVISIBLE_HINGES", "label": "Invisible Hinges (Default)", "sort_order": 0, "metadata": {"is_default": true}},
    {"code": "FULL_LEAF_BUTT", "label": "Full-Leaf Butt Hinges (Optional)", "sort_order": 1, "metadata": {"is_optional": true, "model": "AVA"}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 25. TRACK TYPES (Operable)
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'track_types_operable',
  'Track Types (Operable)',
  'structural',
  '[
    {"code": "CURVE_DIVERTER", "label": "Curve & Diverter (Standard)", "sort_order": 0, "metadata": {"models": ["2010", "3010"]}},
    {"code": "MULTI_DIRECTIONAL", "label": "Multi-Directional (Standard)", "sort_order": 1, "metadata": {"models": ["2020", "3020"]}},
    {"code": "HINGED_PAIRS", "label": "Hinged-Pairs (Standard)", "sort_order": 2, "metadata": {"models": ["2030", "3030"]}},
    {"code": "CONTINUOUSLY_HINGED", "label": "Continuously Hinged (Electric)", "sort_order": 3, "metadata": {"models": ["2050e", "3050e"]}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 26. TRACK TYPES (Glass)
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'track_types_glass',
  'Track Types (Glass)',
  'structural',
  '[
    {"code": "TOP_SUPPORTED_MULTI", "label": "Top-Supported Multidirectional & Single Point", "sort_order": 0},
    {"code": "TOP_GUIDE_FLOOR", "label": "Top Guide (Floor Supported)", "sort_order": 1, "metadata": {"model": "LUNA"}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 27. PANEL THICKNESS (Operable)
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'panel_thickness',
  'Panel Thickness',
  'dimensions',
  '[
    {"code": "3_INCH", "label": "3\"", "sort_order": 0, "metadata": {"models": ["2010", "2020", "2030", "2050e"]}},
    {"code": "4_INCH", "label": "4\"", "sort_order": 1, "metadata": {"models": ["3010", "3020", "3030", "3050e"]}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- 28. FRAME THICKNESS (Glass)
-- =============================================================================
INSERT INTO config_value_sets (slug, name, category, "values")
VALUES (
  'frame_thickness_glass',
  'Frame Thickness (Glass)',
  'dimensions',
  '[
    {"code": "4_9_16_44STC", "label": "4-9/16\" (44 STC)", "sort_order": 0, "metadata": {"model": "STELLA", "stc": 44}},
    {"code": "4_11_16_50STC", "label": "4-11/16\" (50 STC)", "sort_order": 1, "metadata": {"model": "STELLA", "stc": 50}},
    {"code": "2_13_16", "label": "2-13/16\"", "sort_order": 2, "metadata": {"model": "LUNA"}},
    {"code": "1_3_8", "label": "1-3/8\"", "sort_order": 3, "metadata": {"model": "ILLONA"}},
    {"code": "1_7_16", "label": "1-7/16\"", "sort_order": 4, "metadata": {"model": "AVA"}}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  "values" = EXCLUDED."values",
  updated_at = NOW();

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM config_value_sets WHERE slug LIKE '%seal%' OR slug LIKE '%stc%' OR slug LIKE 'panel_%' OR slug LIKE 'track_%';
  RAISE NOTICE '✅ Wall System Config Value Sets Migration Complete';
  RAISE NOTICE '   Total value sets created/updated: %', v_count;
END $$;
