-- ============================================================================
-- OPERABLE WALL SYSTEMS - config_schema updates
-- Migration: 20250209_operable_config_schema.sql
--
-- Dependencies:
--   1. Glass Type → STC Rating: When glass selected, overrides panel_skin logic
--      - 3" models: STC 38 only
--      - 4" models: STC 43 or 48 only
--   2. Panel Skin → STC Rating:
--      - Acoustical Substrate/Wood Veneer/HPL: specific ratings
--      - Steel Skins: specific ratings (not available for Wood/HPL)
--   3. Max Height validation based on panel_skin + glass_type combo
--
-- Height/Width are TEXT to support fractional notation like "12-3/4" or "12 3/4"
-- ============================================================================

-- 2010 - 3" Individual, Curve & Diverter
UPDATE product_models SET config_schema = '{
  "version": "2.0",
  "options": {
    "wall_height": {
      "label": "Wall Height",
      "type": "text",
      "unit": "ft",
      "placeholder": "e.g. 12-3/4",
      "required": true,
      "order": 1,
      "group": "dimensions",
      "max_rules": [
        { "when": { "glass_type": { "is_set": true }, "panel_skin": { "==": "ACOUST_SUB" } }, "max": 14.17, "message": "Max height with glass + acoustical substrate is 14''-2" },
        { "when": { "glass_type": { "is_set": true } }, "max": 16.17, "message": "Max height with glass is 16''-2" },
        { "when": {}, "max": 16.17, "message": "Max height is 16''-2" }
      ]
    },
    "wall_width": {
      "label": "Wall Width",
      "type": "text",
      "unit": "ft",
      "placeholder": "e.g. 24-1/2",
      "required": true,
      "order": 2,
      "group": "dimensions"
    },
    "panel_count": {
      "label": "Panel Count",
      "type": "number",
      "min": 1,
      "step": 1,
      "required": true,
      "order": 3,
      "group": "dimensions"
    },
    "quantity": {
      "label": "Quantity",
      "type": "number",
      "min": 1,
      "step": 1,
      "default_value": 1,
      "required": true,
      "order": 4,
      "group": "dimensions"
    },
    "panel_configuration": {
      "label": "Panel Configuration",
      "type": "select",
      "values_ref": "panel_configuration",
      "allowed_codes": ["IP"],
      "required": true,
      "order": 10,
      "group": "configuration"
    },
    "stacking_configuration": {
      "label": "Stacking Configuration",
      "type": "select",
      "values_ref": "stacking_configuration",
      "allowed_codes": ["PERP", "PAREL", "REM"],
      "required": true,
      "order": 11,
      "group": "configuration"
    },
    "panel_skin": {
      "label": "Panel Skin",
      "type": "select",
      "values_ref": "panel_skin",
      "allowed_codes": ["ACOUST_SUB", "STL_SKN", "WOOD_VNR", "HPL"],
      "required": true,
      "order": 12,
      "group": "configuration"
    },
    "glass_type": {
      "label": "Glass Type",
      "type": "select",
      "values_ref": "glass_type",
      "allowed_codes": ["GL"],
      "required": false,
      "order": 13,
      "group": "configuration"
    },
    "stc_rating": {
      "label": "STC Rating",
      "type": "select",
      "values_ref": "stc_rating",
      "allowed_codes": ["38", "42", "45", "49", "50", "51"],
      "required": true,
      "order": 14,
      "group": "configuration",
      "filters": [
        {
          "field": "glass_type",
          "rules": [
            { "when": { "is_set": true }, "show": ["38"] }
          ]
        },
        {
          "field": "panel_skin",
          "rules": [
            { "when": { "==": "STL_SKN" }, "show": ["49", "51"] },
            { "when": { "==": "ACOUST_SUB" }, "show": ["42", "45", "49", "50"] },
            { "when": { "==": "WOOD_VNR" }, "show": ["42", "45", "49", "50"] },
            { "when": { "==": "HPL" }, "show": ["42", "45", "49", "50"] }
          ]
        }
      ]
    },
    "panel_thickness": {
      "label": "Panel Thickness",
      "type": "select",
      "values_ref": "panel_thickness",
      "allowed_codes": ["3\""],
      "required": true,
      "readonly": true,
      "order": 15,
      "group": "specifications"
    },
    "vertical_seals": {
      "label": "Vertical Seals",
      "type": "select",
      "values_ref": "vertical_seals",
      "allowed_codes": ["TAA", "CTAA"],
      "required": true,
      "order": 16,
      "group": "specifications"
    },
    "top_seals": {
      "label": "Top Seals",
      "type": "select",
      "values_ref": "top_seals",
      "allowed_codes": ["FIXED"],
      "required": true,
      "order": 17,
      "group": "specifications"
    },
    "bottom_seals": {
      "label": "Bottom Seals",
      "type": "select",
      "values_ref": "bottom_seals",
      "allowed_codes": ["OPER", "ADJU", "AUTO"],
      "required": true,
      "order": 18,
      "group": "specifications"
    },
    "initial_closure_system": {
      "label": "Initial Closure System",
      "type": "select",
      "values_ref": "initial_closure_system",
      "allowed_codes": ["BS", "FSJ", "ASJ"],
      "required": true,
      "order": 19,
      "group": "specifications"
    },
    "final_closure_system": {
      "label": "Final Closure System",
      "type": "select",
      "values_ref": "final_closure_system",
      "allowed_codes": ["HING_PAN", "PORT_EXP_PAN", "EXPD_PAN", "POCK_DR"],
      "required": true,
      "order": 20,
      "group": "specifications"
    },
    "finish_material": {
      "label": "Finish Material",
      "type": "select",
      "values_ref": "finish_style",
      "allowed_codes": ["KSV", "KUV", "SSC", "HUC", "HSF", "HUF", "SWV", "WHPL", "UNC", "COM"],
      "required": true,
      "order": 21,
      "group": "specifications"
    },
    "track_type": {
      "label": "Track Type",
      "type": "select",
      "values_ref": "track_type",
      "allowed_codes": ["CDT"],
      "required": true,
      "readonly": true,
      "order": 22,
      "group": "specifications"
    },
    "track_system": {
      "label": "Track System",
      "type": "select",
      "values_ref": "track_system",
      "allowed_codes": ["Type425", "Type850"],
      "required": true,
      "order": 23,
      "group": "specifications"
    }
  },
  "groups": [
    { "id": "dimensions", "label": "Dimensions", "order": 1 },
    { "id": "configuration", "label": "Panel Configuration", "order": 2 },
    { "id": "specifications", "label": "Specifications", "order": 3 }
  ]
}'::jsonb
WHERE name = '2010';

-- 2020 - 3" Individual, Multi-Directional
UPDATE product_models SET config_schema = '{
  "version": "2.0",
  "options": {
    "wall_height": {
      "label": "Wall Height",
      "type": "text",
      "unit": "ft",
      "placeholder": "e.g. 12-3/4",
      "required": true,
      "order": 1,
      "group": "dimensions",
      "max_rules": [
        { "when": { "glass_type": { "is_set": true }, "panel_skin": { "==": "ACOUST_SUB" } }, "max": 14.17, "message": "Max height with glass + acoustical substrate is 14''-2" },
        { "when": { "glass_type": { "is_set": true } }, "max": 16.17, "message": "Max height with glass is 16''-2" },
        { "when": {}, "max": 16.17, "message": "Max height is 16''-2" }
      ]
    },
    "wall_width": {
      "label": "Wall Width",
      "type": "text",
      "unit": "ft",
      "placeholder": "e.g. 24-1/2",
      "required": true,
      "order": 2,
      "group": "dimensions"
    },
    "panel_count": {
      "label": "Panel Count",
      "type": "number",
      "min": 1,
      "step": 1,
      "required": true,
      "order": 3,
      "group": "dimensions"
    },
    "quantity": {
      "label": "Quantity",
      "type": "number",
      "min": 1,
      "step": 1,
      "default_value": 1,
      "required": true,
      "order": 4,
      "group": "dimensions"
    },
    "panel_configuration": {
      "label": "Panel Configuration",
      "type": "select",
      "values_ref": "panel_configuration",
      "allowed_codes": ["IP"],
      "required": true,
      "order": 10,
      "group": "configuration"
    },
    "stacking_configuration": {
      "label": "Stacking Configuration",
      "type": "select",
      "values_ref": "stacking_configuration",
      "allowed_codes": ["PERP", "PAREL", "REM"],
      "required": true,
      "order": 11,
      "group": "configuration"
    },
    "panel_skin": {
      "label": "Panel Skin",
      "type": "select",
      "values_ref": "panel_skin",
      "allowed_codes": ["ACOUST_SUB", "STL_SKN", "WOOD_VNR", "HPL"],
      "required": true,
      "order": 12,
      "group": "configuration"
    },
    "glass_type": {
      "label": "Glass Type",
      "type": "select",
      "values_ref": "glass_type",
      "allowed_codes": ["GL"],
      "required": false,
      "order": 13,
      "group": "configuration"
    },
    "stc_rating": {
      "label": "STC Rating",
      "type": "select",
      "values_ref": "stc_rating",
      "allowed_codes": ["38", "42", "45", "49", "50", "51"],
      "required": true,
      "order": 14,
      "group": "configuration",
      "filters": [
        {
          "field": "glass_type",
          "rules": [
            { "when": { "is_set": true }, "show": ["38"] }
          ]
        },
        {
          "field": "panel_skin",
          "rules": [
            { "when": { "==": "STL_SKN" }, "show": ["49", "51"] },
            { "when": { "==": "ACOUST_SUB" }, "show": ["42", "45", "49", "50"] },
            { "when": { "==": "WOOD_VNR" }, "show": ["42", "45", "49", "50"] },
            { "when": { "==": "HPL" }, "show": ["42", "45", "49", "50"] }
          ]
        }
      ]
    },
    "panel_thickness": {
      "label": "Panel Thickness",
      "type": "select",
      "values_ref": "panel_thickness",
      "allowed_codes": ["3\""],
      "required": true,
      "readonly": true,
      "order": 15,
      "group": "specifications"
    },
    "vertical_seals": {
      "label": "Vertical Seals",
      "type": "select",
      "values_ref": "vertical_seals",
      "allowed_codes": ["TAA", "CTAA"],
      "required": true,
      "order": 16,
      "group": "specifications"
    },
    "top_seals": {
      "label": "Top Seals",
      "type": "select",
      "values_ref": "top_seals",
      "allowed_codes": ["FIXED", "OPER"],
      "required": true,
      "order": 17,
      "group": "specifications"
    },
    "bottom_seals": {
      "label": "Bottom Seals",
      "type": "select",
      "values_ref": "bottom_seals",
      "allowed_codes": ["OPER", "ADJU", "AUTO"],
      "required": true,
      "order": 18,
      "group": "specifications"
    },
    "initial_closure_system": {
      "label": "Initial Closure System",
      "type": "select",
      "values_ref": "initial_closure_system",
      "allowed_codes": ["BS", "FSJ", "ASJ"],
      "required": true,
      "order": 19,
      "group": "specifications"
    },
    "final_closure_system": {
      "label": "Final Closure System",
      "type": "select",
      "values_ref": "final_closure_system",
      "allowed_codes": ["EXPD_PAN", "HING_PAN", "POCK_DR"],
      "required": true,
      "order": 20,
      "group": "specifications"
    },
    "finish_material": {
      "label": "Finish Material",
      "type": "select",
      "values_ref": "finish_style",
      "allowed_codes": ["KSV", "KUV", "SSC", "HUC", "HSF", "HUF", "SWV", "WHPL", "UNC", "COM"],
      "required": true,
      "order": 21,
      "group": "specifications"
    },
    "track_type": {
      "label": "Track Type",
      "type": "select",
      "values_ref": "track_type",
      "allowed_codes": ["MDT"],
      "required": true,
      "readonly": true,
      "order": 22,
      "group": "specifications"
    },
    "track_system": {
      "label": "Track System",
      "type": "select",
      "values_ref": "track_system",
      "allowed_codes": ["Type425", "Type850"],
      "required": true,
      "order": 23,
      "group": "specifications"
    }
  },
  "groups": [
    { "id": "dimensions", "label": "Dimensions", "order": 1 },
    { "id": "configuration", "label": "Panel Configuration", "order": 2 },
    { "id": "specifications", "label": "Specifications", "order": 3 }
  ]
}'::jsonb
WHERE name = '2020';

-- 2030 - 3" Hinged-Paired
UPDATE product_models SET config_schema = '{
  "version": "2.0",
  "options": {
    "wall_height": {
      "label": "Wall Height",
      "type": "text",
      "unit": "ft",
      "placeholder": "e.g. 12-3/4",
      "required": true,
      "order": 1,
      "group": "dimensions",
      "max_rules": [
        { "when": { "glass_type": { "is_set": true }, "panel_skin": { "==": "ACOUST_SUB" } }, "max": 14.17, "message": "Max height with glass + acoustical substrate is 14''-2" },
        { "when": { "glass_type": { "is_set": true } }, "max": 16.17, "message": "Max height with glass is 16''-2" },
        { "when": {}, "max": 16.17, "message": "Max height is 16''-2" }
      ]
    },
    "wall_width": {
      "label": "Wall Width",
      "type": "text",
      "unit": "ft",
      "placeholder": "e.g. 24-1/2",
      "required": true,
      "order": 2,
      "group": "dimensions"
    },
    "panel_count": {
      "label": "Panel Count",
      "type": "number",
      "min": 1,
      "step": 1,
      "required": true,
      "order": 3,
      "group": "dimensions"
    },
    "quantity": {
      "label": "Quantity",
      "type": "number",
      "min": 1,
      "step": 1,
      "default_value": 1,
      "required": true,
      "order": 4,
      "group": "dimensions"
    },
    "panel_configuration": {
      "label": "Panel Configuration",
      "type": "select",
      "values_ref": "panel_configuration",
      "allowed_codes": ["HPP"],
      "required": true,
      "order": 10,
      "group": "configuration"
    },
    "stacking_configuration": {
      "label": "Stacking Configuration",
      "type": "select",
      "values_ref": "stacking_configuration",
      "allowed_codes": ["CENTER_STK"],
      "required": true,
      "order": 11,
      "group": "configuration"
    },
    "panel_skin": {
      "label": "Panel Skin",
      "type": "select",
      "values_ref": "panel_skin",
      "allowed_codes": ["ACOUST_SUB", "STL_SKN", "WOOD_VNR", "HPL"],
      "required": true,
      "order": 12,
      "group": "configuration"
    },
    "glass_type": {
      "label": "Glass Type",
      "type": "select",
      "values_ref": "glass_type",
      "allowed_codes": ["GL"],
      "required": false,
      "order": 13,
      "group": "configuration"
    },
    "stc_rating": {
      "label": "STC Rating",
      "type": "select",
      "values_ref": "stc_rating",
      "allowed_codes": ["38", "42", "45", "49", "50", "51"],
      "required": true,
      "order": 14,
      "group": "configuration",
      "filters": [
        {
          "field": "glass_type",
          "rules": [
            { "when": { "is_set": true }, "show": ["38"] }
          ]
        },
        {
          "field": "panel_skin",
          "rules": [
            { "when": { "==": "STL_SKN" }, "show": ["49", "51"] },
            { "when": { "==": "ACOUST_SUB" }, "show": ["42", "45", "49", "50"] },
            { "when": { "==": "WOOD_VNR" }, "show": ["42", "45", "49", "50"] },
            { "when": { "==": "HPL" }, "show": ["42", "45", "49", "50"] }
          ]
        }
      ]
    },
    "panel_thickness": {
      "label": "Panel Thickness",
      "type": "select",
      "values_ref": "panel_thickness",
      "allowed_codes": ["3\""],
      "required": true,
      "readonly": true,
      "order": 15,
      "group": "specifications"
    },
    "vertical_seals": {
      "label": "Vertical Seals",
      "type": "select",
      "values_ref": "vertical_seals",
      "allowed_codes": ["TAA", "CTAA"],
      "required": true,
      "order": 16,
      "group": "specifications"
    },
    "top_seals": {
      "label": "Top Seals",
      "type": "select",
      "values_ref": "top_seals",
      "allowed_codes": ["FIXED", "OPER"],
      "required": true,
      "order": 17,
      "group": "specifications"
    },
    "bottom_seals": {
      "label": "Bottom Seals",
      "type": "select",
      "values_ref": "bottom_seals",
      "allowed_codes": ["OPER", "ADJU", "AUTO"],
      "required": true,
      "order": 18,
      "group": "specifications"
    },
    "initial_closure_system": {
      "label": "Initial Closure System",
      "type": "select",
      "values_ref": "initial_closure_system",
      "allowed_codes": ["BS", "FSJ", "ASJ"],
      "required": true,
      "order": 19,
      "group": "specifications"
    },
    "final_closure_system": {
      "label": "Final Closure System",
      "type": "select",
      "values_ref": "final_closure_system",
      "allowed_codes": ["EXPD_PAN", "HING_PAN", "COM_PAN", "LAP_PAN", "SING_PAN_EXP", "POCK_DR"],
      "required": true,
      "order": 20,
      "group": "specifications"
    },
    "finish_material": {
      "label": "Finish Material",
      "type": "select",
      "values_ref": "finish_style",
      "allowed_codes": ["KSV", "KUV", "SSC", "HUC", "HSF", "HUF", "SWV", "WHPL", "UNC", "COM"],
      "required": true,
      "order": 21,
      "group": "specifications"
    },
    "track_type": {
      "label": "Track Type",
      "type": "select",
      "values_ref": "track_type",
      "allowed_codes": ["HPT"],
      "required": true,
      "readonly": true,
      "order": 22,
      "group": "specifications"
    },
    "track_system": {
      "label": "Track System",
      "type": "select",
      "values_ref": "track_system",
      "allowed_codes": ["Type425", "Type850", "Type11L"],
      "required": true,
      "order": 23,
      "group": "specifications"
    }
  },
  "groups": [
    { "id": "dimensions", "label": "Dimensions", "order": 1 },
    { "id": "configuration", "label": "Panel Configuration", "order": 2 },
    { "id": "specifications", "label": "Specifications", "order": 3 }
  ]
}'::jsonb
WHERE name = '2030';

-- 2050e - 3" Continuously-Hinged Electric (no GL variant)
UPDATE product_models SET config_schema = '{
  "version": "2.0",
  "options": {
    "wall_height": {
      "label": "Wall Height",
      "type": "text",
      "unit": "ft",
      "placeholder": "e.g. 12-3/4",
      "required": true,
      "order": 1,
      "group": "dimensions",
      "max_rules": [
        { "when": {}, "max": 14.17, "message": "Max height is 14''-2" }
      ]
    },
    "wall_width": {
      "label": "Wall Width",
      "type": "text",
      "unit": "ft",
      "placeholder": "e.g. 24-1/2",
      "required": true,
      "order": 2,
      "group": "dimensions"
    },
    "panel_count": {
      "label": "Panel Count",
      "type": "number",
      "min": 1,
      "step": 1,
      "required": true,
      "order": 3,
      "group": "dimensions"
    },
    "quantity": {
      "label": "Quantity",
      "type": "number",
      "min": 1,
      "step": 1,
      "default_value": 1,
      "required": true,
      "order": 4,
      "group": "dimensions"
    },
    "panel_configuration": {
      "label": "Panel Configuration",
      "type": "select",
      "values_ref": "panel_configuration",
      "allowed_codes": ["CHP"],
      "required": true,
      "order": 10,
      "group": "configuration"
    },
    "stacking_configuration": {
      "label": "Stacking Configuration",
      "type": "select",
      "values_ref": "stacking_configuration",
      "allowed_codes": ["CENTER_STK"],
      "required": true,
      "order": 11,
      "group": "configuration"
    },
    "panel_skin": {
      "label": "Panel Skin",
      "type": "select",
      "values_ref": "panel_skin",
      "allowed_codes": ["ACOUST_SUB", "STL_SKN"],
      "required": true,
      "order": 12,
      "group": "configuration"
    },
    "stc_rating": {
      "label": "STC Rating",
      "type": "select",
      "values_ref": "stc_rating",
      "allowed_codes": ["42", "45", "49", "50", "51"],
      "required": true,
      "order": 13,
      "group": "configuration",
      "filters": [
        {
          "field": "panel_skin",
          "rules": [
            { "when": { "==": "STL_SKN" }, "show": ["49", "51"] },
            { "when": { "==": "ACOUST_SUB" }, "show": ["42", "45", "49", "50"] }
          ]
        }
      ]
    },
    "panel_thickness": {
      "label": "Panel Thickness",
      "type": "select",
      "values_ref": "panel_thickness",
      "allowed_codes": ["3\""],
      "required": true,
      "readonly": true,
      "order": 14,
      "group": "specifications"
    },
    "vertical_seals": {
      "label": "Vertical Seals",
      "type": "select",
      "values_ref": "vertical_seals",
      "allowed_codes": ["TAA", "CTAA"],
      "required": true,
      "order": 15,
      "group": "specifications"
    },
    "top_seals": {
      "label": "Top Seals",
      "type": "select",
      "values_ref": "top_seals",
      "allowed_codes": ["FIXED"],
      "required": true,
      "order": 16,
      "group": "specifications"
    },
    "bottom_seals": {
      "label": "Bottom Seals",
      "type": "select",
      "values_ref": "bottom_seals",
      "allowed_codes": ["ADJU"],
      "required": true,
      "order": 17,
      "group": "specifications"
    },
    "initial_closure_system": {
      "label": "Initial Closure System",
      "type": "select",
      "values_ref": "initial_closure_system",
      "allowed_codes": ["AC"],
      "required": true,
      "order": 18,
      "group": "specifications"
    },
    "final_closure_system": {
      "label": "Final Closure System",
      "type": "select",
      "values_ref": "final_closure_system",
      "allowed_codes": ["MANU_HALF_PAN"],
      "required": true,
      "order": 19,
      "group": "specifications"
    },
    "finish_material": {
      "label": "Finish Material",
      "type": "select",
      "values_ref": "finish_style",
      "allowed_codes": ["KSV", "KUV", "SSC", "HUC", "HSF", "HUF", "SWV", "WHPL", "UNC", "COM"],
      "required": true,
      "order": 20,
      "group": "specifications"
    },
    "track_type": {
      "label": "Track Type",
      "type": "select",
      "values_ref": "track_type",
      "allowed_codes": ["CHELEC"],
      "required": true,
      "readonly": true,
      "order": 21,
      "group": "specifications"
    },
    "track_system": {
      "label": "Track System",
      "type": "select",
      "values_ref": "track_system",
      "allowed_codes": ["TypeHD"],
      "required": true,
      "order": 22,
      "group": "specifications"
    }
  },
  "groups": [
    { "id": "dimensions", "label": "Dimensions", "order": 1 },
    { "id": "configuration", "label": "Panel Configuration", "order": 2 },
    { "id": "specifications", "label": "Specifications", "order": 3 }
  ]
}'::jsonb
WHERE name = '2050e';

-- 3010 - 4" Individual, Curve & Diverter
UPDATE product_models SET config_schema = '{
  "version": "2.0",
  "options": {
    "wall_height": {
      "label": "Wall Height",
      "type": "text",
      "unit": "ft",
      "placeholder": "e.g. 12-3/4",
      "required": true,
      "order": 1,
      "group": "dimensions",
      "max_rules": [
        { "when": { "glass_type": { "is_set": true }, "panel_skin": { "==": "ACOUST_SUB" } }, "max": 14.17, "message": "Max height with glass + acoustical substrate is 14''-2" },
        { "when": { "glass_type": { "is_set": true }, "panel_skin": { "==": "STL_SKN" } }, "max": 24.17, "message": "Max height with glass + steel skin is 24''-2" },
        { "when": { "panel_skin": { "==": "STL_SKN" } }, "max": 30.17, "message": "Max height with steel skin is 30''-2" },
        { "when": {}, "max": 14.17, "message": "Max height with acoustical substrate is 14''-2" }
      ]
    },
    "wall_width": {
      "label": "Wall Width",
      "type": "text",
      "unit": "ft",
      "placeholder": "e.g. 24-1/2",
      "required": true,
      "order": 2,
      "group": "dimensions"
    },
    "panel_count": {
      "label": "Panel Count",
      "type": "number",
      "min": 1,
      "step": 1,
      "required": true,
      "order": 3,
      "group": "dimensions"
    },
    "quantity": {
      "label": "Quantity",
      "type": "number",
      "min": 1,
      "step": 1,
      "default_value": 1,
      "required": true,
      "order": 4,
      "group": "dimensions"
    },
    "panel_configuration": {
      "label": "Panel Configuration",
      "type": "select",
      "values_ref": "panel_configuration",
      "allowed_codes": ["IP"],
      "required": true,
      "order": 10,
      "group": "configuration"
    },
    "stacking_configuration": {
      "label": "Stacking Configuration",
      "type": "select",
      "values_ref": "stacking_configuration",
      "allowed_codes": ["PERP", "PAREL", "REM"],
      "required": true,
      "order": 11,
      "group": "configuration"
    },
    "panel_skin": {
      "label": "Panel Skin",
      "type": "select",
      "values_ref": "panel_skin",
      "allowed_codes": ["STL_SKN", "ACOUST_SUB", "WOOD_VNR", "HPL"],
      "required": true,
      "order": 12,
      "group": "configuration"
    },
    "glass_type": {
      "label": "Glass Type",
      "type": "select",
      "values_ref": "glass_type",
      "allowed_codes": ["GL"],
      "required": false,
      "order": 13,
      "group": "configuration"
    },
    "stc_rating": {
      "label": "STC Rating",
      "type": "select",
      "values_ref": "stc_rating",
      "allowed_codes": ["43", "46", "48", "50", "52", "56"],
      "required": true,
      "order": 14,
      "group": "configuration",
      "filters": [
        {
          "field": "glass_type",
          "rules": [
            { "when": { "is_set": true }, "show": ["43", "48"] }
          ]
        },
        {
          "field": "panel_skin",
          "rules": [
            { "when": { "==": "STL_SKN" }, "show": ["46", "50", "52", "56"] },
            { "when": { "==": "ACOUST_SUB" }, "show": ["43", "46", "48", "50"] },
            { "when": { "==": "WOOD_VNR" }, "show": ["43", "46", "48", "50"] },
            { "when": { "==": "HPL" }, "show": ["43", "46", "48", "50"] }
          ]
        }
      ]
    },
    "panel_thickness": {
      "label": "Panel Thickness",
      "type": "select",
      "values_ref": "panel_thickness",
      "allowed_codes": ["4\""],
      "required": true,
      "readonly": true,
      "order": 15,
      "group": "specifications"
    },
    "vertical_seals": {
      "label": "Vertical Seals",
      "type": "select",
      "values_ref": "vertical_seals",
      "allowed_codes": ["TAA", "CTAA"],
      "required": true,
      "order": 16,
      "group": "specifications"
    },
    "top_seals": {
      "label": "Top Seals",
      "type": "select",
      "values_ref": "top_seals",
      "allowed_codes": ["FIXED"],
      "required": true,
      "order": 17,
      "group": "specifications"
    },
    "bottom_seals": {
      "label": "Bottom Seals",
      "type": "select",
      "values_ref": "bottom_seals",
      "allowed_codes": ["OPER", "ADJU", "AUTO"],
      "required": true,
      "order": 18,
      "group": "specifications"
    },
    "initial_closure_system": {
      "label": "Initial Closure System",
      "type": "select",
      "values_ref": "initial_closure_system",
      "allowed_codes": ["BS", "FSJ", "ASJ"],
      "required": true,
      "order": 19,
      "group": "specifications"
    },
    "final_closure_system": {
      "label": "Final Closure System",
      "type": "select",
      "values_ref": "final_closure_system",
      "allowed_codes": ["HING_PAN", "PORT_EXP_PAN", "POCK_DR"],
      "required": true,
      "order": 20,
      "group": "specifications"
    },
    "finish_material": {
      "label": "Finish Material",
      "type": "select",
      "values_ref": "finish_style",
      "allowed_codes": ["KSV", "KUV", "SSC", "HUC", "HSF", "HUF", "SWV", "WHPL", "UNC", "COM"],
      "required": true,
      "order": 21,
      "group": "specifications"
    },
    "track_type": {
      "label": "Track Type",
      "type": "select",
      "values_ref": "track_type",
      "allowed_codes": ["CDT"],
      "required": true,
      "readonly": true,
      "order": 22,
      "group": "specifications"
    },
    "track_system": {
      "label": "Track System",
      "type": "select",
      "values_ref": "track_system",
      "allowed_codes": ["Type425", "Type850", "TypeHD"],
      "required": true,
      "order": 23,
      "group": "specifications"
    }
  },
  "groups": [
    { "id": "dimensions", "label": "Dimensions", "order": 1 },
    { "id": "configuration", "label": "Panel Configuration", "order": 2 },
    { "id": "specifications", "label": "Specifications", "order": 3 }
  ]
}'::jsonb
WHERE name = '3010';

-- 3020 - 4" Individual, Multi-Directional
UPDATE product_models SET config_schema = '{
  "version": "2.0",
  "options": {
    "wall_height": {
      "label": "Wall Height",
      "type": "text",
      "unit": "ft",
      "placeholder": "e.g. 12-3/4",
      "required": true,
      "order": 1,
      "group": "dimensions",
      "max_rules": [
        { "when": { "glass_type": { "is_set": true }, "panel_skin": { "==": "ACOUST_SUB" } }, "max": 14.17, "message": "Max height with glass + acoustical substrate is 14''-2" },
        { "when": { "glass_type": { "is_set": true }, "panel_skin": { "==": "STL_SKN" } }, "max": 24.17, "message": "Max height with glass + steel skin is 24''-2" },
        { "when": { "panel_skin": { "==": "STL_SKN" } }, "max": 30.17, "message": "Max height with steel skin is 30''-2" },
        { "when": {}, "max": 14.17, "message": "Max height with acoustical substrate is 14''-2" }
      ]
    },
    "wall_width": {
      "label": "Wall Width",
      "type": "text",
      "unit": "ft",
      "placeholder": "e.g. 24-1/2",
      "required": true,
      "order": 2,
      "group": "dimensions"
    },
    "panel_count": {
      "label": "Panel Count",
      "type": "number",
      "min": 1,
      "step": 1,
      "required": true,
      "order": 3,
      "group": "dimensions"
    },
    "quantity": {
      "label": "Quantity",
      "type": "number",
      "min": 1,
      "step": 1,
      "default_value": 1,
      "required": true,
      "order": 4,
      "group": "dimensions"
    },
    "panel_configuration": {
      "label": "Panel Configuration",
      "type": "select",
      "values_ref": "panel_configuration",
      "allowed_codes": ["IP"],
      "required": true,
      "order": 10,
      "group": "configuration"
    },
    "stacking_configuration": {
      "label": "Stacking Configuration",
      "type": "select",
      "values_ref": "stacking_configuration",
      "allowed_codes": ["PERP", "PAREL", "REM"],
      "required": true,
      "order": 11,
      "group": "configuration"
    },
    "panel_skin": {
      "label": "Panel Skin",
      "type": "select",
      "values_ref": "panel_skin",
      "allowed_codes": ["STL_SKN", "ACOUST_SUB", "WOOD_VNR", "HPL"],
      "required": true,
      "order": 12,
      "group": "configuration"
    },
    "glass_type": {
      "label": "Glass Type",
      "type": "select",
      "values_ref": "glass_type",
      "allowed_codes": ["GL"],
      "required": false,
      "order": 13,
      "group": "configuration"
    },
    "stc_rating": {
      "label": "STC Rating",
      "type": "select",
      "values_ref": "stc_rating",
      "allowed_codes": ["43", "46", "48", "50", "52", "56"],
      "required": true,
      "order": 14,
      "group": "configuration",
      "filters": [
        {
          "field": "glass_type",
          "rules": [
            { "when": { "is_set": true }, "show": ["43", "48"] }
          ]
        },
        {
          "field": "panel_skin",
          "rules": [
            { "when": { "==": "STL_SKN" }, "show": ["46", "50", "52", "56"] },
            { "when": { "==": "ACOUST_SUB" }, "show": ["43", "46", "48", "50"] },
            { "when": { "==": "WOOD_VNR" }, "show": ["43", "46", "48", "50"] },
            { "when": { "==": "HPL" }, "show": ["43", "46", "48", "50"] }
          ]
        }
      ]
    },
    "panel_thickness": {
      "label": "Panel Thickness",
      "type": "select",
      "values_ref": "panel_thickness",
      "allowed_codes": ["4\""],
      "required": true,
      "readonly": true,
      "order": 15,
      "group": "specifications"
    },
    "vertical_seals": {
      "label": "Vertical Seals",
      "type": "select",
      "values_ref": "vertical_seals",
      "allowed_codes": ["TAA", "CTAA"],
      "required": true,
      "order": 16,
      "group": "specifications"
    },
    "top_seals": {
      "label": "Top Seals",
      "type": "select",
      "values_ref": "top_seals",
      "allowed_codes": ["FIXED", "OPER"],
      "required": true,
      "order": 17,
      "group": "specifications"
    },
    "bottom_seals": {
      "label": "Bottom Seals",
      "type": "select",
      "values_ref": "bottom_seals",
      "allowed_codes": ["OPER", "ADJU", "AUTO"],
      "required": true,
      "order": 18,
      "group": "specifications"
    },
    "initial_closure_system": {
      "label": "Initial Closure System",
      "type": "select",
      "values_ref": "initial_closure_system",
      "allowed_codes": ["BS", "FSJ", "ASJ"],
      "required": true,
      "order": 19,
      "group": "specifications"
    },
    "final_closure_system": {
      "label": "Final Closure System",
      "type": "select",
      "values_ref": "final_closure_system",
      "allowed_codes": ["EXPD_PAN", "HING_PAN", "POCK_DR"],
      "required": true,
      "order": 20,
      "group": "specifications"
    },
    "finish_material": {
      "label": "Finish Material",
      "type": "select",
      "values_ref": "finish_style",
      "allowed_codes": ["KSV", "KUV", "SSC", "HUC", "HSF", "HUF", "SWV", "WHPL", "UNC", "COM"],
      "required": true,
      "order": 21,
      "group": "specifications"
    },
    "track_type": {
      "label": "Track Type",
      "type": "select",
      "values_ref": "track_type",
      "allowed_codes": ["MDT"],
      "required": true,
      "readonly": true,
      "order": 22,
      "group": "specifications"
    },
    "track_system": {
      "label": "Track System",
      "type": "select",
      "values_ref": "track_system",
      "allowed_codes": ["Type425", "Type850"],
      "required": true,
      "order": 23,
      "group": "specifications"
    }
  },
  "groups": [
    { "id": "dimensions", "label": "Dimensions", "order": 1 },
    { "id": "configuration", "label": "Panel Configuration", "order": 2 },
    { "id": "specifications", "label": "Specifications", "order": 3 }
  ]
}'::jsonb
WHERE name = '3020';

-- 3030 - 4" Hinged-Paired
UPDATE product_models SET config_schema = '{
  "version": "2.0",
  "options": {
    "wall_height": {
      "label": "Wall Height",
      "type": "text",
      "unit": "ft",
      "placeholder": "e.g. 12-3/4",
      "required": true,
      "order": 1,
      "group": "dimensions",
      "max_rules": [
        { "when": { "glass_type": { "is_set": true }, "panel_skin": { "==": "ACOUST_SUB" } }, "max": 14.17, "message": "Max height with glass + acoustical substrate is 14''-2" },
        { "when": { "glass_type": { "is_set": true }, "panel_skin": { "==": "STL_SKN" } }, "max": 24.17, "message": "Max height with glass + steel skin is 24''-2" },
        { "when": { "panel_skin": { "==": "STL_SKN" } }, "max": 30.17, "message": "Max height with steel skin is 30''-2" },
        { "when": {}, "max": 14.17, "message": "Max height with acoustical substrate is 14''-2" }
      ]
    },
    "wall_width": {
      "label": "Wall Width",
      "type": "text",
      "unit": "ft",
      "placeholder": "e.g. 24-1/2",
      "required": true,
      "order": 2,
      "group": "dimensions"
    },
    "panel_count": {
      "label": "Panel Count",
      "type": "number",
      "min": 1,
      "step": 1,
      "required": true,
      "order": 3,
      "group": "dimensions"
    },
    "quantity": {
      "label": "Quantity",
      "type": "number",
      "min": 1,
      "step": 1,
      "default_value": 1,
      "required": true,
      "order": 4,
      "group": "dimensions"
    },
    "panel_configuration": {
      "label": "Panel Configuration",
      "type": "select",
      "values_ref": "panel_configuration",
      "allowed_codes": ["HPP"],
      "required": true,
      "order": 10,
      "group": "configuration"
    },
    "stacking_configuration": {
      "label": "Stacking Configuration",
      "type": "select",
      "values_ref": "stacking_configuration",
      "allowed_codes": ["CENTER_STK"],
      "required": true,
      "order": 11,
      "group": "configuration"
    },
    "panel_skin": {
      "label": "Panel Skin",
      "type": "select",
      "values_ref": "panel_skin",
      "allowed_codes": ["STL_SKN", "ACOUST_SUB", "WOOD_VNR", "HPL"],
      "required": true,
      "order": 12,
      "group": "configuration"
    },
    "glass_type": {
      "label": "Glass Type",
      "type": "select",
      "values_ref": "glass_type",
      "allowed_codes": ["GL"],
      "required": false,
      "order": 13,
      "group": "configuration"
    },
    "stc_rating": {
      "label": "STC Rating",
      "type": "select",
      "values_ref": "stc_rating",
      "allowed_codes": ["43", "46", "48", "50", "52", "56"],
      "required": true,
      "order": 14,
      "group": "configuration",
      "filters": [
        {
          "field": "glass_type",
          "rules": [
            { "when": { "is_set": true }, "show": ["43", "48"] }
          ]
        },
        {
          "field": "panel_skin",
          "rules": [
            { "when": { "==": "STL_SKN" }, "show": ["46", "50", "52", "56"] },
            { "when": { "==": "ACOUST_SUB" }, "show": ["43", "46", "48", "50"] },
            { "when": { "==": "WOOD_VNR" }, "show": ["43", "46", "48", "50"] },
            { "when": { "==": "HPL" }, "show": ["43", "46", "48", "50"] }
          ]
        }
      ]
    },
    "panel_thickness": {
      "label": "Panel Thickness",
      "type": "select",
      "values_ref": "panel_thickness",
      "allowed_codes": ["4\""],
      "required": true,
      "readonly": true,
      "order": 15,
      "group": "specifications"
    },
    "vertical_seals": {
      "label": "Vertical Seals",
      "type": "select",
      "values_ref": "vertical_seals",
      "allowed_codes": ["TAA", "CTAA"],
      "required": true,
      "order": 16,
      "group": "specifications"
    },
    "top_seals": {
      "label": "Top Seals",
      "type": "select",
      "values_ref": "top_seals",
      "allowed_codes": ["FIXED", "OPER"],
      "required": true,
      "order": 17,
      "group": "specifications"
    },
    "bottom_seals": {
      "label": "Bottom Seals",
      "type": "select",
      "values_ref": "bottom_seals",
      "allowed_codes": ["OPER", "ADJU", "AUTO"],
      "required": true,
      "order": 18,
      "group": "specifications"
    },
    "initial_closure_system": {
      "label": "Initial Closure System",
      "type": "select",
      "values_ref": "initial_closure_system",
      "allowed_codes": ["BS", "FSJ", "ASJ"],
      "required": true,
      "order": 19,
      "group": "specifications"
    },
    "final_closure_system": {
      "label": "Final Closure System",
      "type": "select",
      "values_ref": "final_closure_system",
      "allowed_codes": ["EXPD_PAN", "HING_PAN", "COM_PAN", "3PAN_TRAIN", "LAP_PAN", "SING_PAN_EXP", "POCK_DR"],
      "required": true,
      "order": 20,
      "group": "specifications"
    },
    "finish_material": {
      "label": "Finish Material",
      "type": "select",
      "values_ref": "finish_style",
      "allowed_codes": ["KSV", "KUV", "SSC", "HUC", "HSF", "HUF", "SWV", "WHPL", "UNC", "COM"],
      "required": true,
      "order": 21,
      "group": "specifications"
    },
    "track_type": {
      "label": "Track Type",
      "type": "select",
      "values_ref": "track_type",
      "allowed_codes": ["HPT"],
      "required": true,
      "readonly": true,
      "order": 22,
      "group": "specifications"
    },
    "track_system": {
      "label": "Track System",
      "type": "select",
      "values_ref": "track_system",
      "allowed_codes": ["Type425", "Type850", "Type11L"],
      "required": true,
      "order": 23,
      "group": "specifications"
    }
  },
  "groups": [
    { "id": "dimensions", "label": "Dimensions", "order": 1 },
    { "id": "configuration", "label": "Panel Configuration", "order": 2 },
    { "id": "specifications", "label": "Specifications", "order": 3 }
  ]
}'::jsonb
WHERE name = '3030';

-- 3050e - 4" Continuously-Hinged Electric (no GL variant)
UPDATE product_models SET config_schema = '{
  "version": "2.0",
  "options": {
    "wall_height": {
      "label": "Wall Height",
      "type": "text",
      "unit": "ft",
      "placeholder": "e.g. 12-3/4",
      "required": true,
      "order": 1,
      "group": "dimensions",
      "max_rules": [
        { "when": { "panel_skin": { "==": "STL_SKN" } }, "max": 24.17, "message": "Max height with steel skin is 24''-2" },
        { "when": {}, "max": 14.17, "message": "Max height with acoustical substrate is 14''-2" }
      ]
    },
    "wall_width": {
      "label": "Wall Width",
      "type": "text",
      "unit": "ft",
      "placeholder": "e.g. 24-1/2",
      "required": true,
      "order": 2,
      "group": "dimensions"
    },
    "panel_count": {
      "label": "Panel Count",
      "type": "number",
      "min": 1,
      "step": 1,
      "required": true,
      "order": 3,
      "group": "dimensions"
    },
    "quantity": {
      "label": "Quantity",
      "type": "number",
      "min": 1,
      "step": 1,
      "default_value": 1,
      "required": true,
      "order": 4,
      "group": "dimensions"
    },
    "panel_configuration": {
      "label": "Panel Configuration",
      "type": "select",
      "values_ref": "panel_configuration",
      "allowed_codes": ["CHP"],
      "required": true,
      "order": 10,
      "group": "configuration"
    },
    "stacking_configuration": {
      "label": "Stacking Configuration",
      "type": "select",
      "values_ref": "stacking_configuration",
      "allowed_codes": ["CENTER_STK"],
      "required": true,
      "order": 11,
      "group": "configuration"
    },
    "panel_skin": {
      "label": "Panel Skin",
      "type": "select",
      "values_ref": "panel_skin",
      "allowed_codes": ["STL_SKN", "ACOUST_SUB"],
      "required": true,
      "order": 12,
      "group": "configuration"
    },
    "stc_rating": {
      "label": "STC Rating",
      "type": "select",
      "values_ref": "stc_rating",
      "allowed_codes": ["43", "46", "48", "50", "52", "56"],
      "required": true,
      "order": 13,
      "group": "configuration",
      "filters": [
        {
          "field": "panel_skin",
          "rules": [
            { "when": { "==": "STL_SKN" }, "show": ["46", "50", "52", "56"] },
            { "when": { "==": "ACOUST_SUB" }, "show": ["43", "46", "48", "50"] }
          ]
        }
      ]
    },
    "panel_thickness": {
      "label": "Panel Thickness",
      "type": "select",
      "values_ref": "panel_thickness",
      "allowed_codes": ["4\""],
      "required": true,
      "readonly": true,
      "order": 14,
      "group": "specifications"
    },
    "vertical_seals": {
      "label": "Vertical Seals",
      "type": "select",
      "values_ref": "vertical_seals",
      "allowed_codes": ["TAA"],
      "required": true,
      "order": 15,
      "group": "specifications"
    },
    "top_seals": {
      "label": "Top Seals",
      "type": "select",
      "values_ref": "top_seals",
      "allowed_codes": ["FIXED"],
      "required": true,
      "order": 16,
      "group": "specifications"
    },
    "bottom_seals": {
      "label": "Bottom Seals",
      "type": "select",
      "values_ref": "bottom_seals",
      "allowed_codes": ["ADJU"],
      "required": true,
      "order": 17,
      "group": "specifications"
    },
    "initial_closure_system": {
      "label": "Initial Closure System",
      "type": "select",
      "values_ref": "initial_closure_system",
      "allowed_codes": ["FBS", "AC"],
      "required": true,
      "order": 18,
      "group": "specifications"
    },
    "final_closure_system": {
      "label": "Final Closure System",
      "type": "select",
      "values_ref": "final_closure_system",
      "allowed_codes": ["LJAM", "MANU_HALF_PAN", "AUTO_HALF_PAN_PIV"],
      "required": true,
      "order": 19,
      "group": "specifications"
    },
    "finish_material": {
      "label": "Finish Material",
      "type": "select",
      "values_ref": "finish_style",
      "allowed_codes": ["KSV", "KUV", "SSC", "HUC", "HSF", "HUF", "SWV", "WHPL", "UNC", "COM"],
      "required": true,
      "order": 20,
      "group": "specifications"
    },
    "track_type": {
      "label": "Track Type",
      "type": "select",
      "values_ref": "track_type",
      "allowed_codes": ["CHELEC"],
      "required": true,
      "readonly": true,
      "order": 21,
      "group": "specifications"
    },
    "track_system": {
      "label": "Track System",
      "type": "select",
      "values_ref": "track_system",
      "allowed_codes": ["TypeHD"],
      "required": true,
      "order": 22,
      "group": "specifications"
    }
  },
  "groups": [
    { "id": "dimensions", "label": "Dimensions", "order": 1 },
    { "id": "configuration", "label": "Panel Configuration", "order": 2 },
    { "id": "specifications", "label": "Specifications", "order": 3 }
  ]
}'::jsonb
WHERE name = '3050e';
