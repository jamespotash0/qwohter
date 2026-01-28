-- =============================================================================
-- Migration: Wall System Config Schema Examples
-- =============================================================================
--
-- This migration provides example config_schema definitions for wall system
-- product models. These schemas reference the config_value_sets created in
-- the previous migration via the values_ref property.
--
-- IMPORTANT: This is a TEMPLATE migration. Adjust model IDs and details
-- to match your actual product_models table data before running.
--
-- The config_schema structure follows the ConfigSchema TypeScript type
-- defined in src/lib/types/configSchema.ts
-- =============================================================================

-- =============================================================================
-- HELPER: Function to update config_schema on a model by code
-- =============================================================================
CREATE OR REPLACE FUNCTION set_model_config_schema(
  p_model_code TEXT,
  p_config_schema JSONB
) RETURNS VOID AS $$
BEGIN
  UPDATE product_models
  SET config_schema = p_config_schema,
      updated_at = NOW()
  WHERE model_code = p_model_code
    OR name ILIKE '%' || p_model_code || '%';

  IF NOT FOUND THEN
    RAISE NOTICE 'No model found with code: %', p_model_code;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. OPERABLE 2010 CONFIG SCHEMA
-- =============================================================================
-- Individual panels with Curve & Diverter track, 3" thick, acoustical substrate standard
SELECT set_model_config_schema('2010', '{
  "version": "2.0",
  "options": {
    "stc_rating": {
      "label": "STC Rating",
      "type": "select",
      "values_ref": "stc_ratings",
      "allowed_codes": ["STC_42", "STC_45", "STC_49", "STC_50", "STC_51", "STC_38"],
      "default_value": "STC_49",
      "required": true,
      "group": "acoustic",
      "order": 1,
      "help_text": "Sound Transmission Class rating. STC 49 is standard. STC 51 requires Steel Skins. STC 38 available with Glass Insert."
    },
    "panel_skin": {
      "label": "Panel Skin",
      "type": "select",
      "values_ref": "panel_skins",
      "default_value": "ACOUSTICAL_SUBSTRATE",
      "required": true,
      "group": "panels",
      "order": 1,
      "help_text": "Acoustical Substrate is standard. Steel Skins required for STC 51."
    },
    "finish_style": {
      "label": "Finish Style",
      "type": "select",
      "values_ref": "finish_styles",
      "required": true,
      "group": "finishes",
      "order": 1,
      "visible_when": {
        "field": "panel_skin",
        "operator": "in",
        "value": ["ACOUSTICAL_SUBSTRATE", "STEEL_SKINS"]
      }
    },
    "finish_color": {
      "label": "Finish Color",
      "type": "select",
      "values_ref": {
        "KOROSEAL_STD_VINYL": "vinyl_colors_standard",
        "KOROSEAL_UPG_VINYL": "vinyl_colors_upgrade",
        "SHAW_STD_CARPET": "carpet_colors_standard",
        "HYTEX_UPG_CARPET": "carpet_colors_upgrade",
        "HYTEX_STD_FABRIC": "fabric_colors_standard",
        "HYTEX_UPG_FABRIC": "fabric_colors_upgrade",
        "STD_WOOD_VENEER": "wood_veneer_colors",
        "WILSONART_HPL": "hpl_colors"
      },
      "depends_on": "finish_style",
      "required": true,
      "group": "finishes",
      "order": 2,
      "help_text": "Color options depend on selected finish style"
    },
    "track_system": {
      "label": "Track System",
      "type": "select",
      "values_ref": "track_systems",
      "allowed_codes": ["TYPE_425_AL", "TYPE_850_AL"],
      "default_value": "TYPE_425_AL",
      "required": true,
      "group": "structural",
      "order": 1,
      "help_text": "Type 425 (up to 525 lbs) or Type 850 (up to 850 lbs)"
    },
    "track_type": {
      "label": "Track Type",
      "type": "select",
      "values": ["Curve & Diverter (Standard)"],
      "default_value": "Curve & Diverter (Standard)",
      "required": true,
      "readonly": true,
      "group": "structural",
      "order": 2
    },
    "panel_configuration": {
      "label": "Panel Configuration",
      "type": "select",
      "values": ["Individual"],
      "default_value": "Individual",
      "required": true,
      "readonly": true,
      "group": "structural",
      "order": 3
    },
    "stacking_configuration": {
      "label": "Stacking Configuration",
      "type": "select",
      "values_ref": "stacking_configurations",
      "allowed_codes": ["PERPENDICULAR", "PARALLEL", "REMOTE"],
      "default_value": "PERPENDICULAR",
      "required": true,
      "group": "structural",
      "order": 4
    },
    "top_seal": {
      "label": "Top Seal",
      "type": "select",
      "values_ref": "top_seals",
      "allowed_codes": ["FIXED"],
      "default_value": "FIXED",
      "required": true,
      "group": "seals",
      "order": 1
    },
    "bottom_seal": {
      "label": "Bottom Seal",
      "type": "select",
      "values_ref": "bottom_seals",
      "allowed_codes": ["OPERABLE", "ADJUSTABLE", "AUTOMATIC"],
      "default_value": "OPERABLE",
      "required": true,
      "group": "seals",
      "order": 2,
      "help_text": "Operable is standard. Adjustable and Automatic are optional."
    },
    "vertical_seal": {
      "label": "Vertical Seal",
      "type": "select",
      "values_ref": "vertical_seals",
      "allowed_codes": ["TRIMLESS_ASTRAGAL", "CAP_ASTRAGAL"],
      "default_value": "TRIMLESS_ASTRAGAL",
      "required": true,
      "group": "seals",
      "order": 3
    },
    "initial_closure": {
      "label": "Initial Closure System",
      "type": "select",
      "values_ref": "initial_closures",
      "allowed_codes": ["BULB_SEAL", "FIXED_STARTER_JAMB", "ADJ_STARTER_JAMB"],
      "default_value": "BULB_SEAL",
      "required": true,
      "group": "closures",
      "order": 1
    },
    "final_closure": {
      "label": "Final Closure System",
      "type": "select",
      "values_ref": "final_closures",
      "allowed_codes": ["HINGED_PANELS", "PORTAL_EXPANDER", "POCKET_DOORS"],
      "default_value": "HINGED_PANELS",
      "required": true,
      "group": "closures",
      "order": 2,
      "help_text": "Hinged Panels is standard. Portal Expander and Pocket Doors are optional."
    },
    "panel_accessories": {
      "label": "Panel Accessories",
      "type": "multi-select",
      "values_ref": "panel_accessories",
      "allowed_codes": ["SINGLE_PASS_DOOR", "DOUBLE_PASS_DOOR", "CONCEALED_CLOSURES", "ROOM_VIEWERS", "EXIT_SIGNS", "DRY_ERASE", "ERASER_TRAYS", "VISION_LITES", "TACK_SURFACES", "POCKET_DOORS"],
      "group": "accessories",
      "order": 1
    },
    "wall_height": {
      "label": "Wall Height",
      "type": "number",
      "min": 6,
      "max": 16.17,
      "step": 0.01,
      "unit": "ft",
      "required": true,
      "group": "dimensions",
      "order": 1,
      "help_text": "Maximum height varies by STC rating and panel skin"
    },
    "max_panel_height": {
      "label": "Max Panel Height",
      "type": "computed",
      "compute_rules": [
        {"when": {"panel_skin": {"==": "GLASS"}, "stc_rating": {"==": "STC_38"}}, "value": "14-2\""},
        {"when": {"panel_skin": {"==": "ACOUSTICAL_SUBSTRATE"}}, "value": "14-2\""},
        {"default": true, "value": "16-2\""}
      ],
      "group": "dimensions",
      "order": 2,
      "readonly": true
    },
    "panel_thickness": {
      "label": "Panel Thickness",
      "type": "select",
      "values": ["3\""],
      "default_value": "3\"",
      "required": true,
      "readonly": true,
      "group": "dimensions",
      "order": 3
    }
  },
  "groups": [
    {"id": "acoustic", "label": "Acoustic Performance", "order": 1},
    {"id": "panels", "label": "Panel Options", "order": 2},
    {"id": "finishes", "label": "Finishes", "order": 3},
    {"id": "structural", "label": "Structural Configuration", "order": 4},
    {"id": "seals", "label": "Seal Systems", "order": 5},
    {"id": "closures", "label": "Closure Systems", "order": 6},
    {"id": "dimensions", "label": "Dimensions", "order": 7},
    {"id": "accessories", "label": "Accessories", "order": 8}
  ]
}'::jsonb);

-- =============================================================================
-- 2. OPERABLE 3010 CONFIG SCHEMA
-- =============================================================================
-- Similar to 2010 but with 4" panels and steel skins standard
SELECT set_model_config_schema('3010', '{
  "version": "2.0",
  "options": {
    "stc_rating": {
      "label": "STC Rating",
      "type": "select",
      "values_ref": "stc_ratings",
      "allowed_codes": ["STC_43", "STC_46", "STC_48", "STC_50", "STC_52", "STC_56"],
      "default_value": "STC_52",
      "required": true,
      "group": "acoustic",
      "order": 1,
      "help_text": "Sound Transmission Class rating. STC 52 (Steel Skins) is standard. STC 43-50 available with Acoustical Substrate."
    },
    "panel_skin": {
      "label": "Panel Skin",
      "type": "select",
      "values_ref": "panel_skins",
      "default_value": "STEEL_SKINS",
      "required": true,
      "group": "panels",
      "order": 1,
      "help_text": "Steel Skins is standard for 30XX series. Acoustical Substrate available for lower STC options."
    },
    "finish_style": {
      "label": "Finish Style",
      "type": "select",
      "values_ref": "finish_styles",
      "required": true,
      "group": "finishes",
      "order": 1
    },
    "finish_color": {
      "label": "Finish Color",
      "type": "select",
      "values_ref": {
        "KOROSEAL_STD_VINYL": "vinyl_colors_standard",
        "KOROSEAL_UPG_VINYL": "vinyl_colors_upgrade",
        "SHAW_STD_CARPET": "carpet_colors_standard",
        "HYTEX_UPG_CARPET": "carpet_colors_upgrade",
        "HYTEX_STD_FABRIC": "fabric_colors_standard",
        "HYTEX_UPG_FABRIC": "fabric_colors_upgrade",
        "STD_WOOD_VENEER": "wood_veneer_colors",
        "WILSONART_HPL": "hpl_colors"
      },
      "depends_on": "finish_style",
      "required": true,
      "group": "finishes",
      "order": 2
    },
    "track_system": {
      "label": "Track System",
      "type": "select",
      "values_ref": "track_systems",
      "allowed_codes": ["TYPE_425_AL", "TYPE_850_AL", "TYPE_HD_STEEL"],
      "default_value": "TYPE_425_AL",
      "required": true,
      "group": "structural",
      "order": 1
    },
    "track_type": {
      "label": "Track Type",
      "type": "select",
      "values": ["Curve & Diverter (Standard)"],
      "default_value": "Curve & Diverter (Standard)",
      "required": true,
      "readonly": true,
      "group": "structural",
      "order": 2
    },
    "panel_configuration": {
      "label": "Panel Configuration",
      "type": "select",
      "values": ["Individual"],
      "default_value": "Individual",
      "required": true,
      "readonly": true,
      "group": "structural",
      "order": 3
    },
    "stacking_configuration": {
      "label": "Stacking Configuration",
      "type": "select",
      "values_ref": "stacking_configurations",
      "allowed_codes": ["PERPENDICULAR", "PARALLEL", "REMOTE"],
      "default_value": "PERPENDICULAR",
      "required": true,
      "group": "structural",
      "order": 4
    },
    "top_seal": {
      "label": "Top Seal",
      "type": "select",
      "values_ref": "top_seals",
      "allowed_codes": ["FIXED"],
      "default_value": "FIXED",
      "required": true,
      "group": "seals",
      "order": 1
    },
    "bottom_seal": {
      "label": "Bottom Seal",
      "type": "select",
      "values_ref": "bottom_seals",
      "allowed_codes": ["OPERABLE", "ADJUSTABLE", "AUTOMATIC"],
      "default_value": "OPERABLE",
      "required": true,
      "group": "seals",
      "order": 2
    },
    "vertical_seal": {
      "label": "Vertical Seal",
      "type": "select",
      "values_ref": "vertical_seals",
      "allowed_codes": ["TRIMLESS_ASTRAGAL", "CAP_ASTRAGAL"],
      "default_value": "TRIMLESS_ASTRAGAL",
      "required": true,
      "group": "seals",
      "order": 3
    },
    "initial_closure": {
      "label": "Initial Closure System",
      "type": "select",
      "values_ref": "initial_closures",
      "allowed_codes": ["BULB_SEAL", "FIXED_STARTER_JAMB", "ADJ_STARTER_JAMB"],
      "default_value": "BULB_SEAL",
      "required": true,
      "group": "closures",
      "order": 1
    },
    "final_closure": {
      "label": "Final Closure System",
      "type": "select",
      "values_ref": "final_closures",
      "allowed_codes": ["HINGED_PANELS", "PORTAL_EXPANDER", "POCKET_DOORS"],
      "default_value": "HINGED_PANELS",
      "required": true,
      "group": "closures",
      "order": 2
    },
    "panel_accessories": {
      "label": "Panel Accessories",
      "type": "multi-select",
      "values_ref": "panel_accessories",
      "allowed_codes": ["SINGLE_PASS_DOOR", "DOUBLE_PASS_DOOR", "CONCEALED_CLOSURES", "ROOM_VIEWERS", "EXIT_SIGNS", "DRY_ERASE", "ERASER_TRAYS", "VISION_LITES", "TACK_SURFACES", "POCKET_DOORS"],
      "group": "accessories",
      "order": 1
    },
    "wall_height": {
      "label": "Wall Height",
      "type": "number",
      "min": 6,
      "max": 30.17,
      "step": 0.01,
      "unit": "ft",
      "required": true,
      "group": "dimensions",
      "order": 1,
      "help_text": "Maximum height varies by STC rating and panel skin. Steel skins allow up to 30-2\", acoustical up to 14-2\""
    },
    "max_panel_height": {
      "label": "Max Panel Height",
      "type": "computed",
      "compute_rules": [
        {"when": {"panel_skin": {"==": "GLASS"}}, "value": "24-2\" (Steel) / 14-2\" (Acoustical)"},
        {"when": {"panel_skin": {"==": "ACOUSTICAL_SUBSTRATE"}}, "value": "14-2\""},
        {"when": {"panel_skin": {"==": "STEEL_SKINS"}}, "value": "30-2\""},
        {"default": true, "value": "14-2\""}
      ],
      "group": "dimensions",
      "order": 2,
      "readonly": true
    },
    "panel_thickness": {
      "label": "Panel Thickness",
      "type": "select",
      "values": ["4\""],
      "default_value": "4\"",
      "required": true,
      "readonly": true,
      "group": "dimensions",
      "order": 3
    }
  },
  "groups": [
    {"id": "acoustic", "label": "Acoustic Performance", "order": 1},
    {"id": "panels", "label": "Panel Options", "order": 2},
    {"id": "finishes", "label": "Finishes", "order": 3},
    {"id": "structural", "label": "Structural Configuration", "order": 4},
    {"id": "seals", "label": "Seal Systems", "order": 5},
    {"id": "closures", "label": "Closure Systems", "order": 6},
    {"id": "dimensions", "label": "Dimensions", "order": 7},
    {"id": "accessories", "label": "Accessories", "order": 8}
  ]
}'::jsonb);

-- =============================================================================
-- 3. GLASS STELLA CONFIG SCHEMA
-- =============================================================================
SELECT set_model_config_schema('STELLA', '{
  "version": "2.0",
  "options": {
    "stc_rating": {
      "label": "STC Rating",
      "type": "select",
      "values_ref": "stc_ratings",
      "allowed_codes": ["STC_44", "STC_50"],
      "default_value": "STC_44",
      "required": true,
      "group": "acoustic",
      "order": 1
    },
    "operation": {
      "label": "Operation Type",
      "type": "select",
      "values_ref": "operation_types",
      "allowed_codes": ["MANUAL", "AUTOMATED", "SEMI_AUTO_SEALS"],
      "default_value": "MANUAL",
      "required": true,
      "group": "operation",
      "order": 1,
      "help_text": "Manual, Automated Programmable Self-Driving Panels, or Semi-Automated Seals"
    },
    "panel_configuration": {
      "label": "Panel Configuration",
      "type": "select",
      "values_ref": "panel_configurations",
      "allowed_codes": ["INDIVIDUAL", "INDIVIDUAL_MULTI_DIR", "INDIVIDUAL_SINGLE_CARRIER", "INDIVIDUAL_FULLY_AUTO"],
      "default_value": "INDIVIDUAL",
      "required": true,
      "group": "structural",
      "order": 1
    },
    "stacking_configuration": {
      "label": "Stacking Configuration",
      "type": "select",
      "values_ref": "stacking_configurations",
      "allowed_codes": ["OFFSET", "REMOTE", "BI_PARTING", "CENTERLINE"],
      "default_value": "OFFSET",
      "required": true,
      "group": "structural",
      "order": 2,
      "help_text": "Centerline only for Single Carrier. Offset/Remote exclude Single Carrier."
    },
    "panel_face": {
      "label": "Panel Face",
      "type": "select",
      "values_ref": "panel_faces_glass",
      "allowed_codes": ["SOLID_FACE", "MDF_MELAMINE", "HPL", "INTERNAL_BLINDS", "INTERNAL_MULLIONS"],
      "required": true,
      "group": "panels",
      "order": 1
    },
    "glass_type": {
      "label": "Glass Type",
      "type": "select",
      "values_ref": "glass_types",
      "allowed_codes": ["TEMPERED_SAFETY", "SWITCHABLE", "CHILD_SAFE", "BACK_PAINTED"],
      "default_value": "TEMPERED_SAFETY",
      "required": true,
      "group": "panels",
      "order": 2
    },
    "frame_finish": {
      "label": "Frame Finish",
      "type": "select",
      "values_ref": "frame_finishes",
      "default_value": "CLEAR_ANODIZED",
      "required": true,
      "group": "finishes",
      "order": 1
    },
    "track_finish": {
      "label": "Track Finish",
      "type": "select",
      "values_ref": "track_finishes",
      "default_value": "CLEAR_ANODIZED",
      "required": true,
      "group": "finishes",
      "order": 2
    },
    "top_seal": {
      "label": "Top Seal",
      "type": "select",
      "values_ref": "top_seals",
      "allowed_codes": ["ELECTRIC", "AUTOMATIC", "SEMI_AUTOMATIC", "MANUAL", "OPERABLE"],
      "required": true,
      "group": "seals",
      "order": 1
    },
    "bottom_seal": {
      "label": "Bottom Seal",
      "type": "select",
      "values_ref": "bottom_seals",
      "allowed_codes": ["ELECTRIC", "AUTOMATIC", "SEMI_AUTOMATIC", "MANUAL", "OPERABLE"],
      "required": true,
      "group": "seals",
      "order": 2
    },
    "vertical_seal": {
      "label": "Vertical Seal",
      "type": "select",
      "values_ref": "vertical_seals",
      "allowed_codes": ["MALE_FEMALE_GASKETS"],
      "default_value": "MALE_FEMALE_GASKETS",
      "required": true,
      "readonly": true,
      "group": "seals",
      "order": 3
    },
    "final_closure": {
      "label": "Final Closure System",
      "type": "select",
      "values_ref": "final_closures",
      "allowed_codes": ["PANEL_TELE_JAMB", "WALL_TELE_JAMB", "FULL_HEIGHT_DOOR"],
      "required": true,
      "group": "closures",
      "order": 1
    },
    "pass_door_type": {
      "label": "Pass Door Type",
      "type": "select",
      "values_ref": "pass_door_types",
      "allowed_codes": ["FULL_HEIGHT", "INSET", "FULL_HEIGHT_HINGED"],
      "group": "doors",
      "order": 1,
      "help_text": "Full Height and Inset have Single/Double options. Full-Height Hinged Closure has no options."
    },
    "pass_door_option": {
      "label": "Pass Door Option",
      "type": "select",
      "values_ref": "pass_door_options",
      "group": "doors",
      "order": 2,
      "visible_when": {
        "field": "pass_door_type",
        "operator": "in",
        "value": ["FULL_HEIGHT", "INSET"]
      }
    },
    "hinging": {
      "label": "Hinging",
      "type": "select",
      "values_ref": "hinging_options",
      "allowed_codes": ["INVISIBLE_HINGES"],
      "default_value": "INVISIBLE_HINGES",
      "required": true,
      "readonly": true,
      "group": "hardware",
      "order": 1
    },
    "wall_height": {
      "label": "Wall Height",
      "type": "number",
      "min": 6,
      "max": 14.75,
      "step": 0.01,
      "unit": "ft",
      "required": true,
      "group": "dimensions",
      "order": 1,
      "help_text": "44 STC = 10ft max, 50 STC = 11ft max, w/interrupted glass = 14-9\" max"
    },
    "frame_thickness": {
      "label": "Frame Thickness",
      "type": "computed",
      "compute_rules": [
        {"when": {"stc_rating": {"==": "STC_44"}}, "value": "4-9/16\""},
        {"when": {"stc_rating": {"==": "STC_50"}}, "value": "4-11/16\""},
        {"default": true, "value": "4-9/16\""}
      ],
      "group": "dimensions",
      "order": 2,
      "readonly": true
    }
  },
  "groups": [
    {"id": "acoustic", "label": "Acoustic Performance", "order": 1},
    {"id": "operation", "label": "Operation", "order": 2},
    {"id": "panels", "label": "Panel Options", "order": 3},
    {"id": "structural", "label": "Structural Configuration", "order": 4},
    {"id": "finishes", "label": "Finishes", "order": 5},
    {"id": "seals", "label": "Seal Systems", "order": 6},
    {"id": "closures", "label": "Closure Systems", "order": 7},
    {"id": "doors", "label": "Pass Doors", "order": 8},
    {"id": "dimensions", "label": "Dimensions", "order": 9},
    {"id": "hardware", "label": "Hardware", "order": 10}
  ]
}'::jsonb);

-- =============================================================================
-- 4. ACCORDION MK-XX/X CONFIG SCHEMA
-- =============================================================================
SELECT set_model_config_schema('MK-XX', '{
  "version": "2.0",
  "options": {
    "stc_rating": {
      "label": "STC Rating",
      "type": "select",
      "values_ref": "stc_ratings",
      "allowed_codes": ["NON_ACOUSTIC"],
      "default_value": "NON_ACOUSTIC",
      "required": true,
      "readonly": true,
      "group": "acoustic",
      "order": 1
    },
    "panel_face": {
      "label": "Panel Face",
      "type": "select",
      "values_ref": "panel_faces_accordion",
      "required": true,
      "group": "panels",
      "order": 1
    },
    "track_system": {
      "label": "Track System",
      "type": "select",
      "values_ref": "track_systems",
      "allowed_codes": ["CURTITION_4"],
      "default_value": "CURTITION_4",
      "required": true,
      "readonly": true,
      "group": "structural",
      "order": 1
    },
    "track_mounting": {
      "label": "Track Mounting",
      "type": "select",
      "values_ref": "track_mounting",
      "required": true,
      "group": "structural",
      "order": 2
    },
    "structural_support": {
      "label": "Structural Support",
      "type": "select",
      "values_ref": "structural_support",
      "allowed_codes": ["TOP_SUPPORTED"],
      "default_value": "TOP_SUPPORTED",
      "required": true,
      "readonly": true,
      "group": "structural",
      "order": 3
    },
    "panel_configuration": {
      "label": "Panel Configuration",
      "type": "select",
      "values_ref": "panel_configurations",
      "allowed_codes": ["SINGLE", "HINGED_PAIRS", "MULTIPLE_INTERSECTING"],
      "default_value": "SINGLE",
      "required": true,
      "group": "structural",
      "order": 4
    },
    "final_closure": {
      "label": "Final Closure System",
      "type": "multi-select",
      "values_ref": "final_closures",
      "allowed_codes": ["TIE_BACKS", "LATCH_MECHANISM", "POCKET_DOORS"],
      "group": "closures",
      "order": 1
    },
    "additional_options": {
      "label": "Additional Options",
      "type": "multi-select",
      "values_ref": "accordion_options",
      "allowed_codes": ["LOCKS_ONE_SIDE", "LOCKS_BOTH_SIDES", "RADIUS_CONSTRUCTION", "TRACK_SWITCHES", "FLOATING_POSTS", "SLIDING_JAMB", "CEILING_GUARD"],
      "group": "accessories",
      "order": 1
    },
    "wall_height": {
      "label": "Wall Height",
      "type": "number",
      "min": 6,
      "max": 16,
      "step": 0.01,
      "unit": "ft",
      "required": true,
      "group": "dimensions",
      "order": 1,
      "help_text": "MK-XX max 16ft, MK-X max 12ft"
    }
  },
  "groups": [
    {"id": "acoustic", "label": "Acoustic Performance", "order": 1},
    {"id": "panels", "label": "Panel Options", "order": 2},
    {"id": "structural", "label": "Structural Configuration", "order": 3},
    {"id": "closures", "label": "Closure Systems", "order": 4},
    {"id": "dimensions", "label": "Dimensions", "order": 5},
    {"id": "accessories", "label": "Additional Options", "order": 6}
  ]
}'::jsonb);

-- =============================================================================
-- CLEANUP: Drop helper function
-- =============================================================================
DROP FUNCTION IF EXISTS set_model_config_schema(TEXT, JSONB);

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM product_models
  WHERE config_schema IS NOT NULL
    AND config_schema != '{"version": "2.0", "options": {}, "groups": []}'::jsonb;

  RAISE NOTICE '✅ Wall System Config Schema Examples Applied';
  RAISE NOTICE '   Models with config_schema defined: %', v_count;
END $$;
