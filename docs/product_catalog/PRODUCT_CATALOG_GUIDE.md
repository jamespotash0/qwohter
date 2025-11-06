# Product Catalog Data Management Guide

## Overview

This guide explains how to capture and manage manufacturer catalog data with complex field dependencies (e.g., STC Rating depends on Panel Skin selection).

---

## 🎯 The Challenge

Manufacturer catalogs have **conditional relationships** between fields:
- Panel Skin selection determines available STC Ratings
- Panel Thickness affects minimum STC Rating
- Configuration affects available Series options
- Series selection determines available Models

**Your catalog data might look like:**
```
Model: OW-100-VNL-25
Panel Skin: Vinyl
Available STC: 40, 45, 50

Model: OW-200-FAB-35
Panel Skin: Fabric
Available STC: 50, 55, 60, 65
```

---

## 📊 Three-Layer Approach

### Layer 1: Field Definitions (UI Structure)
**Table: `product_field_definitions`**

Defines what fields exist and their base configuration:
```sql
-- Panel Skin field (parent)
field_name: 'panel_skin'
field_type: 'select'
field_options: {
  "options": [
    {"value": "vinyl", "label": "Vinyl"},
    {"value": "fabric", "label": "Fabric"}
  ]
}

-- STC Rating field (child with conditional options)
field_name: 'stc_rating'
field_type: 'select'
conditional_options: [
  {
    "condition": {"field": "panel_skin", "value": "vinyl", "operator": "equals"},
    "options": [
      {"value": "40", "label": "STC 40"},
      {"value": "45", "label": "STC 45"},
      {"value": "50", "label": "STC 50"}
    ]
  },
  {
    "condition": {"field": "panel_skin", "value": "fabric", "operator": "equals"},
    "options": [
      {"value": "50", "label": "STC 50"},
      {"value": "55", "label": "STC 55"},
      {"value": "60", "label": "STC 60"}
    ]
  }
]
```

### Layer 2: Field Dependencies (Relationships)
**Table: `product_field_dependencies`**

Maps parent-child relationships:
```sql
parent_field: 'panel_skin'
child_field: 'stc_rating'
dependency_type: 'options'
value_mapping: {
  "vinyl": {
    "options": [...],
    "default": "45"
  },
  "fabric": {
    "options": [...],
    "default": "50"
  }
}
```

### Layer 3: Product Specifications (Actual Data)
**Table: `products.specifications` (JSONB)**

Store what the manufacturer catalog says:
```json
{
  "panel_skin": "vinyl",
  "panel_thickness": "2.5",
  "stc_rating": "45",
  "available_stc_ratings": ["40", "45", "50"],
  "max_height": "20",
  "operating_method": "manual",
  "fire_rating": "Class A"
}
```

---

## 📥 How to Capture Catalog Data

### Option 1: Manual Input UI (Current)

**Best for:** Initial setup, small catalogs

1. **Create Field Definitions First**
   - Define all fields that exist across products
   - Set up conditional logic using `conditional_options`
   - Map dependencies in `product_field_dependencies`

2. **Create Products with Form**
   - Form dynamically shows/hides fields based on selections
   - Available options change based on dependencies
   - Validate against rules before saving

**Frontend Flow:**
```typescript
// 1. Load field definitions for selected category
const fields = await getFieldDefinitions(categoryId);

// 2. When user selects Panel Skin = "fabric"
const stcOptions = await getFieldOptions(
  stcRatingFieldId,
  { panel_skin: "fabric" }
);

// 3. Validate configuration before saving
const validation = await validateConfiguration(
  productId,
  { panel_skin: "fabric", stc_rating: "55" }
);
```

### Option 2: CSV/Excel Bulk Import

**Best for:** Large catalogs from manufacturers

**Step 1: Create Import Record**
```sql
INSERT INTO product_catalog_imports (
  organization_id, manufacturer_id,
  import_name, source_file, source_format,
  field_mapping
) VALUES (
  org_id, kwikwall_id,
  'Kwik-Wall 2024 Catalog', 'kwikwall_2024.csv', 'csv',
  '{
    "Model #": "model_number",
    "Description": "model_name",
    "Panel Skin": "specifications.panel_skin",
    "Panel Thickness": "specifications.panel_thickness",
    "Available STC": "specifications.available_stc_ratings",
    "Price": "base_price"
  }'
);
```

**Step 2: Parse and Import**
```javascript
// Pseudocode for import processor
for (const row of csvRows) {
  // Map CSV columns to product fields
  const product = {
    model_number: row['Model #'],
    model_name: row['Description'],
    base_price: parseFloat(row['Price']),
    specifications: {
      panel_skin: row['Panel Skin'],
      panel_thickness: row['Panel Thickness'],
      available_stc_ratings: row['Available STC'].split(',')
    }
  };

  // Create product
  await supabase.from('products').insert(product);
}
```

**Step 3: Validate Imported Data**
```sql
-- Check for products with invalid configurations
SELECT p.model_number, p.specifications
FROM products p
WHERE validate_product_configuration(
  p.id,
  p.specifications
)->>'is_valid' = 'false';
```

### Option 3: API Integration (Future)

**Best for:** Real-time manufacturer data

```typescript
// When manufacturer API is available
async function syncManufacturerCatalog(manufacturerId: string) {
  // 1. Fetch from manufacturer API
  const catalogData = await fetch(
    `https://api.kwikwall.com/v1/catalog`
  ).then(r => r.json());

  // 2. Transform to your schema
  const products = catalogData.products.map(item => ({
    manufacturer_id: manufacturerId,
    model_number: item.sku,
    specifications: {
      panel_skin: item.finish_type,
      stc_rating: item.acoustic_rating,
      // Map all fields...
    }
  }));

  // 3. Upsert to database
  await supabase.from('products').upsert(products);
}
```

---

## 🔧 Handling Complex Dependencies

### Scenario 1: Field Value Determines Available Options
**Example:** Panel Skin → STC Rating options

**Setup in `product_field_definitions`:**
```json
{
  "field_name": "stc_rating",
  "conditional_options": [
    {
      "condition": {"field": "panel_skin", "value": "vinyl"},
      "options": [{"value": "40"}, {"value": "45"}, {"value": "50"}]
    },
    {
      "condition": {"field": "panel_skin", "value": "fabric"},
      "options": [{"value": "50"}, {"value": "55"}, {"value": "60"}]
    }
  ]
}
```

**Frontend Logic:**
```typescript
function updateStcOptions(panelSkinValue: string) {
  const stcField = fields.find(f => f.field_name === 'stc_rating');

  // Find matching conditional options
  const conditionalOpt = stcField.conditional_options.find(
    opt => opt.condition.field === 'panel_skin' &&
           opt.condition.value === panelSkinValue
  );

  // Update available options
  setStcOptions(conditionalOpt?.options || stcField.field_options.options);
}
```

### Scenario 2: Multiple Fields Affect Options
**Example:** Panel Skin + Panel Thickness → STC Rating

**Use `product_option_rules` table:**
```sql
-- Rule 1: Vinyl skin options
INSERT INTO product_option_rules (
  source_field, source_value,
  target_field, action_type, action_data,
  priority
) VALUES (
  'panel_skin', 'vinyl',
  'stc_rating', 'set_options',
  '{"options": [{"value": "40"}, {"value": "45"}]}',
  1
);

-- Rule 2: Thick panels require higher STC
INSERT INTO product_option_rules (
  source_field, source_value, source_operator,
  target_field, action_type, action_data,
  priority
) VALUES (
  'panel_thickness', '3.5', 'greater_than',
  'stc_rating', 'filter_options',
  '{"allowed_values": ["50", "55", "60"]}',
  2
);
```

**Evaluation Logic:**
```typescript
// Apply rules in priority order
const rules = await getRulesForProduct(categoryId);
let availableOptions = baseOptions;

for (const rule of rules.sort((a, b) => a.priority - b.priority)) {
  if (evaluateCondition(rule, currentSelections)) {
    if (rule.action_type === 'set_options') {
      availableOptions = rule.action_data.options;
    } else if (rule.action_type === 'filter_options') {
      availableOptions = availableOptions.filter(opt =>
        rule.action_data.allowed_values.includes(opt.value)
      );
    }
  }
}
```

---

## 📋 Data Entry Best Practices

### 1. Start with Hierarchy
```
1. Create Manufacturer
2. Create Product Type
3. Create Categories
4. Create Configurations
5. Create Series
6. Define Fields (with dependencies)
7. Add Products
```

### 2. Define Fields Before Products
- Create all field definitions for a category
- Set up dependencies and conditional logic
- Test with a few sample products
- Then bulk import remaining products

### 3. Store Both Options AND Values
```json
// In products.specifications
{
  // Actual selected values
  "panel_skin": "fabric",
  "stc_rating": "55",

  // Available options from catalog (for reference/validation)
  "available_stc_ratings": ["50", "55", "60", "65"],

  // Derived values
  "effective_stc": 55,
  "acoustic_performance": "premium"
}
```

### 4. Validation Strategy
```sql
-- Always validate before insert/update
SELECT validate_product_configuration(
  product_id,
  new_specifications
);

-- Check for orphaned products (invalid parent references)
SELECT * FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM product_series s WHERE s.id = p.series_id
);
```

---

## 🎨 UI Implementation

### Cascading Select Example
```typescript
function ProductForm() {
  const [manufacturer, setManufacturer] = useState(null);
  const [productType, setProductType] = useState(null);
  const [category, setCategory] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [fields, setFields] = useState([]);

  // Load fields when category selected
  useEffect(() => {
    if (category) {
      loadFieldDefinitions(category.id).then(setFields);
    }
  }, [category]);

  // Update field options when dependencies change
  useEffect(() => {
    fields.forEach(field => {
      if (field.conditional_options) {
        const newOptions = evaluateConditionalOptions(
          field,
          fieldValues
        );
        updateFieldOptions(field.id, newOptions);
      }
    });
  }, [fieldValues, fields]);

  return (
    <form>
      <Select
        value={manufacturer}
        onChange={setManufacturer}
        options={manufacturers}
      />

      <Select
        value={productType}
        onChange={setProductType}
        options={productTypes.filter(t =>
          t.manufacturer_id === manufacturer?.id
        )}
        disabled={!manufacturer}
      />

      {/* Dynamic fields based on category */}
      {fields.map(field => (
        <DynamicField
          key={field.id}
          field={field}
          value={fieldValues[field.field_name]}
          onChange={(val) => setFieldValues({
            ...fieldValues,
            [field.field_name]: val
          })}
        />
      ))}
    </form>
  );
}
```

---

## 🚀 Migration Checklist

**Created Migrations:**
- ✅ `20251009000008` - Core product tables
- ✅ `20251009000009` - Kwik-Wall sample data
- ✅ `20251009000010` - Conditional field logic
- ✅ `20251009000011` - Example conditional setup

**To Apply:**
```bash
npx supabase db push
```

**To Verify:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'product%';

-- Check sample data
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM product_field_definitions;
```

---

## 📚 Key Database Functions

### `get_field_options(field_id, current_selections)`
Returns available options for a field based on current user selections.

```sql
SELECT get_field_options(
  'stc_rating_field_id',
  '{"panel_skin": "fabric", "panel_thickness": "3.5"}'::JSONB
);
```

### `validate_product_configuration(product_id, field_values)`
Validates a product configuration against all rules.

```sql
SELECT validate_product_configuration(
  'product-uuid',
  '{"panel_skin": "vinyl", "stc_rating": "65"}'::JSONB
);
-- Returns: {"is_valid": false, "errors": [...]}
```

### `get_product_hierarchy(product_id)`
Returns full hierarchy for a product.

```sql
SELECT get_product_hierarchy('product-uuid');
-- Returns: {manufacturer: {...}, type: {...}, category: {...}, ...}
```

---

## 💡 Tips

1. **Keep catalog PDFs/spreadsheets** - Store original manufacturer documents in `product_catalog_imports.raw_data`

2. **Version control** - Track when catalog data was imported/updated using `created_at`/`updated_at`

3. **Audit trail** - Log changes to products using a separate audit table

4. **Search optimization** - Use `products.tags` array for full-text search

5. **Image management** - Store images in Supabase Storage, reference URLs in `products.images` JSONB

---

## 🔍 Troubleshooting

**Problem:** Field options not updating when parent field changes
- Check `conditional_options` is valid JSON
- Verify `depends_on` references correct field name
- Ensure frontend calls `get_field_options()` on change

**Problem:** Products failing validation
- Run validation function to see specific errors
- Check that field values match allowed options
- Verify rules don't conflict (check priority)

**Problem:** Import failing
- Validate CSV column names match `field_mapping`
- Check for required fields
- Verify foreign key references exist (manufacturer_id, etc.)
