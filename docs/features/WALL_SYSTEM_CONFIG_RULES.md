# Wall System Configuration Rules

This document outlines the validation rules, cascading relationships, and constraints for wall system product configurations based on the Wall Spec Sheet data.

## Table of Contents

1. [Overview](#overview)
2. [Product Categories](#product-categories)
3. [STC Rating Rules](#stc-rating-rules)
4. [Panel Skin Rules](#panel-skin-rules)
5. [Max Height Rules](#max-height-rules)
6. [Configuration Cascades](#configuration-cascades)
7. [Model-Specific Rules](#model-specific-rules)

---

## Overview

Wall systems are organized into three main categories:
- **ACCORDION** - Folding accordion-style wall partitions
- **GLASS** - Frameless and framed glass partition systems
- **OPERABLE** - Acoustical operable wall partitions

Each category has distinct models with specific configuration options and constraints.

---

## Product Categories

### ACCORDION Models

| Model | STC Rating | Max Height | Panel Config |
|-------|------------|------------|--------------|
| MK-XX | Non-Acoustic | 16' | Single, Hinged-Pairs, Multiple |
| MK-X | Non-Acoustic | 12' | Single, Hinged-Pairs, Multiple |
| VL-2 | STC 35 | 16' | Single, Hinged-Pairs, Multiple |
| VL-6 | STC 38 | 16' | Single, Hinged-Pairs, Multiple |
| VL-8 | STC 40 | 16' | Single, Hinged-Pairs, Multiple |

### GLASS Models

| Model | STC Rating | Max Height | Frame Thickness |
|-------|------------|------------|-----------------|
| STELLA | 44, 50 | 10' (44), 11' (50), 14'-9" (interrupted) | 4-9/16" (44), 4-11/16" (50) |
| LUNA | 43 | 9'-10" | 2-13/16" |
| ILLONA | 33 | 9'-10" | 1-3/8" |
| AVA | Non-Acoustic (35 w/edge trim) | 10'-6" | 1-7/16" |

### OPERABLE Models

| Model | Panel Thickness | STC Options | Standard STC |
|-------|-----------------|-------------|--------------|
| 2010/2010GL | 3" | 42, 45, 49, 50, 51, 38 (GL) | 49 |
| 2020/2020GL | 3" | 42, 45, 49, 50, 51, 38 (GL) | 49 |
| 2030/2030GL | 3" | 42, 45, 49, 50, 51, 38 (GL) | 49 |
| 2050e | 3" | 42, 45, 49, 50, 51 | 49 |
| 3010/3010GL | 4" | 43, 46, 48, 50, 52, 56 | 52 |
| 3020/3020GL | 4" | 43, 46, 48, 50, 52, 56 | 52 |
| 3030/3030GL | 4" | 43, 46, 48, 50, 52, 56 | 52 |
| 3050e | 4" | 46, 50, 52, 56 | 52 |

---

## STC Rating Rules

### Panel Skin → STC Restrictions

**For 20XX Series:**
```
Steel Skins → Enables: STC 49, 51
Acoustical Substrate → Enables: STC 42, 45, 49, 50
Wood Veneer → Excludes: STC 51
HPL → Excludes: STC 51
Glass Insert (GL) → Enables: STC 38
```

**For 30XX Series:**
```
Steel Skins → Enables: STC 52, 56
Acoustical Substrate → Enables: STC 43, 46, 48, 50 (NOT for Wood Veneer/HPL)
Wood Veneer → Excludes: STC 52, 56
HPL → Excludes: STC 52, 56
Glass Insert (GL) → Enables: STC 43, 48
```

### Implementation in config_schema

```json
{
  "stc_rating": {
    "type": "select",
    "values_ref": "stc_ratings",
    "filter_by": {
      "field": "panel_skin",
      "rules": [
        {
          "when": {"==": "STEEL_SKINS"},
          "show": ["STC_49", "STC_51"]
        },
        {
          "when": {"in": ["WOOD_VENEER", "HPL"]},
          "show": ["STC_42", "STC_45", "STC_49", "STC_50"]
        }
      ]
    }
  }
}
```

---

## Panel Skin Rules

### Standard vs Optional by Series

**20XX Series (3" panels):**
- **Standard:** Acoustical Substrate
- **Optional:** Steel Skins, Wood Veneer, HPL, Glass

**30XX Series (4" panels):**
- **Standard:** Steel Skins
- **Optional:** Acoustical Substrate, Wood Veneer, HPL, Glass

---

## Max Height Rules

### Operable 20XX Series

| Panel Skin | Glass Insert | Max Height |
|------------|--------------|------------|
| Acoustical Substrate | No | 16'-2" |
| Acoustical Substrate | Yes (GL) | 14'-2" |
| Steel Skins | No | 16'-2" |
| Steel Skins | Yes (GL) | 16'-2" |

### Operable 30XX Series

| Panel Skin | Glass Insert | Max Height |
|------------|--------------|------------|
| Acoustical Substrate | No | 14'-2" |
| Acoustical Substrate | Yes (GL) | 14'-2" |
| Steel Skins | No | 30'-2" |
| Steel Skins | Yes (GL) | 24'-2" |

### Implementation as Computed Field

```json
{
  "max_panel_height": {
    "type": "computed",
    "compute_rules": [
      {
        "when": {
          "panel_skin": {"==": "ACOUSTICAL_SUBSTRATE"},
          "has_glass": {"==": true}
        },
        "value": "14'-2\""
      },
      {
        "when": {"panel_skin": {"==": "STEEL_SKINS"}},
        "value": "30'-2\""
      },
      {"default": true, "value": "16'-2\""}
    ]
  }
}
```

---

## Configuration Cascades

### Finish Style → Finish Color

The finish color options depend on the selected finish style:

```json
{
  "finish_color": {
    "type": "select",
    "depends_on": "finish_style",
    "values_ref": {
      "KOROSEAL_STD_VINYL": "vinyl_colors_standard",
      "KOROSEAL_UPG_VINYL": "vinyl_colors_upgrade",
      "SHAW_STD_CARPET": "carpet_colors_standard",
      "HYTEX_UPG_CARPET": "carpet_colors_upgrade",
      "HYTEX_STD_FABRIC": "fabric_colors_standard",
      "HYTEX_UPG_FABRIC": "fabric_colors_upgrade",
      "STD_WOOD_VENEER": "wood_veneer_colors",
      "WILSONART_HPL": "hpl_colors"
    }
  }
}
```

### Panel Configuration → Stacking Configuration

**GLASS Systems (STELLA):**

| Panel Configuration | Allowed Stacking |
|---------------------|------------------|
| Individual, Fully-Automatic | Offset, Remote, Bi-Parting, Centerline |
| Individual, Multi-Directional | Offset, Remote, Bi-Parting |
| Individual, Single Carrier | Centerline only |

**OPERABLE Systems:**

| Panel Configuration | Allowed Stacking |
|---------------------|------------------|
| Individual (2010/2020/3010/3020) | Perpendicular, Parallel, Remote |
| Hinged-Paired (2030/3030) | Centerline |
| Continuously-Hinged (2050e/3050e) | Centerline |

---

## Model-Specific Rules

### STELLA (Glass)

**Pass Door Rules:**
- Full Height: Has options (Single, Double)
- Inset: Has options (Single, Double) - STELLA only
- Full-Height Hinged Closure: No options

**STC → Frame Thickness:**
- STC 44 → 4-9/16"
- STC 50 → 4-11/16"

### LUNA (Glass)

**Structural Support Rules:**
- Individual panels → Top Supported
- Continuously Hinged panels → Floor Supported

**Top/Bottom Seals by Support:**
- Top Supported → Fixed Brush
- Floor Supported → Fixed Bulb

### AVA (Glass)

**Special Rules:**
- Non-Acoustic by default
- STC 35 available with edge trim on individual panels
- Hinging: Full-Leaf Butt Hinges (Optional) - only model with this option

### 2050e / 3050e (Operable Electric)

**Closure Systems:**
- Initial: Adjustable-Compensating (Standard)
- Final: Manual Half Panel (Standard for 2050e), L-Jamb (3050e)
- Optional: Automatic Half Panel (3050e only)

**Bottom Seal:**
- Adjustable (Standard) - different from other operable models

**Accessories:**
- Has Keyed Cylinder Locks (other operable models have Single/Double Pass Door)

---

## config_value_sets Reference

The following value sets are created for wall system configuration:

| Slug | Category | Description |
|------|----------|-------------|
| `stc_ratings` | acoustic | STC rating options (Non-Acoustic through STC 56) |
| `track_systems` | structural | Track system types with weight capacities |
| `panel_skins` | materials | Panel skin/substrate options |
| `panel_faces_accordion` | materials | Panel face options for accordion |
| `panel_faces_glass` | materials | Panel face options for glass |
| `finish_styles` | finishes | Finish material categories |
| `top_seals` | seals | Top seal options |
| `bottom_seals` | seals | Bottom seal options |
| `vertical_seals` | seals | Vertical seal options |
| `panel_configurations` | structural | Panel configuration types |
| `stacking_configurations` | structural | Stacking configuration types |
| `initial_closures` | closures | Initial closure systems |
| `final_closures` | closures | Final closure systems |
| `operation_types` | operation | Operation type options |
| `glass_types` | materials | Glass type options |
| `frame_finishes` | finishes | Frame finish options |
| `track_finishes` | finishes | Track finish options |
| `panel_accessories` | accessories | Panel accessory options |
| `accordion_options` | accessories | Accordion-specific options |
| `glass_options` | accessories | Glass-specific options |
| `track_mounting` | structural | Track mounting options |
| `structural_support` | structural | Support type options |
| `pass_door_types` | doors | Pass door type options |
| `pass_door_options` | doors | Pass door configuration options |
| `hinging_options` | hardware | Hinging options |
| `track_types_operable` | structural | Operable track types |
| `track_types_glass` | structural | Glass track types |
| `panel_thickness` | dimensions | Panel thickness options |
| `frame_thickness_glass` | dimensions | Glass frame thickness options |

---

## Using These Rules

### In TypeScript

```typescript
import { ConfigSchema, filterValuesByCodes } from '@/lib/types/configSchema';

// Example: Filter STC ratings based on panel skin selection
function getAvailableSTCRatings(
  allRatings: ResolvedValueOption[],
  panelSkin: string,
  modelSeries: '20xx' | '30xx'
): ResolvedValueOption[] {
  const exclusions: Record<string, string[]> = {
    'WOOD_VENEER': modelSeries === '20xx' ? ['STC_51'] : ['STC_52', 'STC_56'],
    'HPL': modelSeries === '20xx' ? ['STC_51'] : ['STC_52', 'STC_56'],
  };

  return filterValuesByCodes(
    allRatings,
    undefined,
    exclusions[panelSkin]
  );
}
```

### In SQL

```sql
-- Get available STC ratings for a model with steel skins
SELECT elem->>'code' as code, elem->>'label' as label
FROM config_value_sets,
     jsonb_array_elements("values") AS elem
WHERE slug = 'stc_ratings'
  AND (elem->>'metadata')::jsonb->>'requires' IS NULL
  OR (elem->>'metadata')::jsonb->>'requires' = 'steel_skins';
```

---

## Migration Files

1. **20260128000001_seed_wall_system_config_value_sets.sql**
   - Creates all `config_value_sets` entries for wall system options

2. **20260128000002_wall_system_config_schema_examples.sql**
   - Example `config_schema` definitions for select models
   - Shows how to reference value sets and implement rules
