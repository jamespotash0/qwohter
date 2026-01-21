-- Migration: Create Product Templates System
-- Description: Simplified product configuration using LiquidJS templates
--
-- This replaces the complex pc_* table structure with a more flexible
-- template-based approach. Product configurations, options, and rules
-- are stored as JSONB and rendered using LiquidJS templates.
--
-- Benefits:
-- - Single table vs 7+ tables
-- - Flexible schema changes without migrations
-- - Templates stored in DB, editable without deploys
-- - Better support for varied product types (walls, HVAC, furniture)

-- =============================================================================
-- STEP 1: Create product_templates table
-- =============================================================================

CREATE TABLE IF NOT EXISTS product_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Hierarchy: Manufacturer → Domain → Series → Model
  manufacturer TEXT NOT NULL,
  domain TEXT NOT NULL,        -- "Wall Systems", "Office Furniture", "HVAC"
  series TEXT,                 -- Optional: specific product series
  model TEXT,                  -- Optional: specific model

  -- Display info
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,

  -- Liquid templates (stored as TEXT, rendered client-side)
  options_template TEXT,       -- Template for rendering options UI
  summary_template TEXT,       -- Template for order summary

  -- Configuration data (JSONB for flexibility)
  -- Contains: options[], option_groups[], cascading rules, etc.
  config_data JSONB NOT NULL DEFAULT '{}',

  -- Pricing data
  base_price DECIMAL(10,2) DEFAULT 0,
  price_modifiers JSONB DEFAULT '[]',  -- Array of price adjustment rules

  -- Rules for validation and constraints
  validation_rules JSONB DEFAULT '[]', -- Array of validation rules

  -- Cascading dropdown configuration
  cascades JSONB DEFAULT '{}',  -- Which fields cascade to which

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Unique constraint on hierarchy
  CONSTRAINT unique_product_template UNIQUE (manufacturer, domain, series, model)
);

-- =============================================================================
-- STEP 2: Create option_values lookup table (for cascading dropdowns)
-- =============================================================================

CREATE TABLE IF NOT EXISTS template_option_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES product_templates(id) ON DELETE CASCADE,

  -- Hierarchy level this option belongs to
  level TEXT NOT NULL,         -- "series", "model", "option_group", "option"
  parent_id UUID,              -- For cascading: references parent option

  -- Option data
  code TEXT NOT NULL,          -- Unique code within template
  label TEXT NOT NULL,         -- Display label
  description TEXT,
  image_url TEXT,

  -- Pricing
  price_modifier DECIMAL(10,2) DEFAULT 0,
  modifier_type TEXT DEFAULT 'fixed',  -- "fixed" or "percentage"

  -- Display order
  sort_order INTEGER DEFAULT 0,

  -- Conditional visibility (Liquid expression)
  visible_when TEXT,           -- e.g., "{{ selected.series == 'premium' }}"

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique code within template
  CONSTRAINT unique_option_code UNIQUE (template_id, level, code)
);

-- =============================================================================
-- STEP 3: Create indexes for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_product_templates_manufacturer
  ON product_templates(manufacturer);

CREATE INDEX IF NOT EXISTS idx_product_templates_domain
  ON product_templates(domain);

CREATE INDEX IF NOT EXISTS idx_product_templates_hierarchy
  ON product_templates(manufacturer, domain, series, model);

CREATE INDEX IF NOT EXISTS idx_product_templates_active
  ON product_templates(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_template_option_values_template
  ON template_option_values(template_id);

CREATE INDEX IF NOT EXISTS idx_template_option_values_parent
  ON template_option_values(parent_id);

CREATE INDEX IF NOT EXISTS idx_template_option_values_level
  ON template_option_values(template_id, level);

-- =============================================================================
-- STEP 4: Enable RLS
-- =============================================================================

ALTER TABLE product_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_option_values ENABLE ROW LEVEL SECURITY;

-- Product templates are public read, service_role write (like product catalog)
CREATE POLICY "Anyone can read product templates"
  ON product_templates FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage product templates"
  ON product_templates FOR ALL
  USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Anyone can read template option values"
  ON template_option_values FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage template option values"
  ON template_option_values FOR ALL
  USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- =============================================================================
-- STEP 5: Create updated_at trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION update_product_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_templates_updated_at
  BEFORE UPDATE ON product_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_product_template_updated_at();

CREATE TRIGGER template_option_values_updated_at
  BEFORE UPDATE ON template_option_values
  FOR EACH ROW
  EXECUTE FUNCTION update_product_template_updated_at();

-- =============================================================================
-- STEP 6: Insert sample data for Wall Systems
-- =============================================================================

INSERT INTO product_templates (
  manufacturer,
  domain,
  name,
  description,
  options_template,
  summary_template,
  config_data,
  base_price,
  price_modifiers,
  validation_rules,
  cascades
) VALUES (
  'Generic',
  'Wall Systems',
  'Demountable Wall System',
  'Configurable demountable wall system for office spaces',

  -- Options Template (Liquid)
  E'<div class="configurator space-y-6">
  <h2 class="text-xl font-semibold">{{ product.name }}</h2>

  <!-- Series Selection -->
  <div class="option-group">
    <label class="block text-sm font-medium mb-2">Wall Series</label>
    <select name="series" class="w-full p-2 border rounded" data-cascade="models">
      <option value="">Select Series...</option>
      {% for series in options.series %}
        <option value="{{ series.code }}"
                data-price="{{ series.price_modifier }}"
                {% if selected.series == series.code %}selected{% endif %}>
          {{ series.label }} {% if series.price_modifier > 0 %}(+{{ series.price_modifier | currency }}){% endif %}
        </option>
      {% endfor %}
    </select>
  </div>

  <!-- Height Selection (cascades from series) -->
  {% if selected.series %}
  <div class="option-group">
    <label class="block text-sm font-medium mb-2">Panel Height</label>
    <div class="grid grid-cols-3 gap-2">
      {% for height in options.heights %}
        {% if height.available_for contains selected.series or height.available_for == "all" %}
        <label class="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50
                      {% if selected.height == height.code %}ring-2 ring-blue-500 bg-blue-50{% endif %}">
          <input type="radio" name="height" value="{{ height.code }}"
                 data-price="{{ height.price_modifier }}"
                 {% if selected.height == height.code %}checked{% endif %}
                 class="mr-2">
          <span>
            <span class="block font-medium">{{ height.label }}</span>
            <span class="text-sm text-gray-500">{{ height.inches | inches_display }}</span>
            {% if height.price_modifier > 0 %}
            <span class="text-sm text-green-600">+{{ height.price_modifier | currency }}</span>
            {% endif %}
          </span>
        </label>
        {% endif %}
      {% endfor %}
    </div>
  </div>
  {% endif %}

  <!-- Glass Type -->
  {% if selected.series and selected.height %}
  <div class="option-group">
    <label class="block text-sm font-medium mb-2">Glass Type</label>
    <select name="glass_type" class="w-full p-2 border rounded">
      <option value="">Select Glass Type...</option>
      {% for glass in options.glass_types %}
        <option value="{{ glass.code }}"
                data-price="{{ glass.price_modifier }}"
                {% if selected.glass_type == glass.code %}selected{% endif %}>
          {{ glass.label }} (+{{ glass.price_modifier | currency }})
        </option>
      {% endfor %}
    </select>
  </div>
  {% endif %}

  <!-- Quantity -->
  <div class="option-group">
    <label class="block text-sm font-medium mb-2">Quantity (Linear Feet)</label>
    <input type="number" name="quantity" value="{{ selected.quantity | default: 1 }}"
           min="1" max="1000" class="w-full p-2 border rounded">
  </div>

  <!-- Warning for tall panels -->
  {% if selected.height == "120" or selected.height == "144" %}
  <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
    <p class="text-amber-800 font-medium">Note: Panels over 10ft require structural reinforcement</p>
    <label class="flex items-center mt-2">
      <input type="checkbox" name="reinforcement" value="yes"
             {% if selected.reinforcement == "yes" %}checked{% endif %}
             class="mr-2">
      Add reinforcement (+$45.00/linear ft)
    </label>
  </div>
  {% endif %}

  <!-- Price Summary -->
  <div class="mt-6 p-4 bg-gray-100 rounded-lg">
    <div class="flex justify-between text-lg font-semibold">
      <span>Estimated Total:</span>
      <span>{{ calculated_price | currency }}</span>
    </div>
    <p class="text-sm text-gray-500 mt-1">Price per linear foot: {{ unit_price | currency }}</p>
  </div>
</div>',

  -- Summary Template
  E'<div class="order-summary">
  <h3 class="font-semibold mb-3">Configuration Summary</h3>
  <dl class="space-y-2">
    <div class="flex justify-between">
      <dt>Series:</dt>
      <dd>{{ selected.series_label }}</dd>
    </div>
    <div class="flex justify-between">
      <dt>Height:</dt>
      <dd>{{ selected.height_label }}</dd>
    </div>
    {% if selected.glass_type %}
    <div class="flex justify-between">
      <dt>Glass:</dt>
      <dd>{{ selected.glass_type_label }}</dd>
    </div>
    {% endif %}
    <div class="flex justify-between">
      <dt>Quantity:</dt>
      <dd>{{ selected.quantity }} linear ft</dd>
    </div>
    {% if selected.reinforcement == "yes" %}
    <div class="flex justify-between text-amber-600">
      <dt>Reinforcement:</dt>
      <dd>Included</dd>
    </div>
    {% endif %}
  </dl>
  <hr class="my-3">
  <div class="flex justify-between text-lg font-bold">
    <span>Total:</span>
    <span>{{ calculated_price | currency }}</span>
  </div>
</div>',

  -- Config Data (JSONB)
  '{
    "options": {
      "series": [
        {"code": "essential", "label": "Essential", "price_modifier": 0, "description": "Basic demountable wall"},
        {"code": "professional", "label": "Professional", "price_modifier": 25, "description": "Enhanced acoustics"},
        {"code": "premium", "label": "Premium", "price_modifier": 75, "description": "Full glass, premium finish"}
      ],
      "heights": [
        {"code": "84", "label": "Standard", "inches": 84, "price_modifier": 0, "available_for": "all"},
        {"code": "96", "label": "8 Foot", "inches": 96, "price_modifier": 15, "available_for": "all"},
        {"code": "108", "label": "9 Foot", "inches": 108, "price_modifier": 35, "available_for": ["professional", "premium"]},
        {"code": "120", "label": "10 Foot", "inches": 120, "price_modifier": 55, "available_for": ["professional", "premium"]},
        {"code": "144", "label": "12 Foot", "inches": 144, "price_modifier": 95, "available_for": ["premium"]}
      ],
      "glass_types": [
        {"code": "clear", "label": "Clear Glass", "price_modifier": 0},
        {"code": "frosted", "label": "Frosted Glass", "price_modifier": 20},
        {"code": "smart", "label": "Smart Glass (Switchable)", "price_modifier": 150}
      ]
    },
    "option_groups": [
      {"id": "dimensions", "label": "Dimensions", "fields": ["series", "height"]},
      {"id": "materials", "label": "Materials", "fields": ["glass_type"]},
      {"id": "quantity", "label": "Quantity", "fields": ["quantity"]}
    ]
  }',

  -- Base price (per linear foot)
  85.00,

  -- Price modifiers
  '[
    {"condition_field": "reinforcement", "condition_value": "yes", "price_adjustment": 45, "adjustment_type": "fixed"}
  ]',

  -- Validation rules
  '[
    {"field": "series", "rule": "required", "message": "Please select a wall series"},
    {"field": "height", "rule": "required", "message": "Please select a panel height"},
    {"field": "quantity", "rule": "min:1", "message": "Quantity must be at least 1"}
  ]',

  -- Cascades configuration
  '{
    "series": ["heights"],
    "height": ["glass_types"]
  }'
);

-- =============================================================================
-- STEP 7: Add comments
-- =============================================================================

COMMENT ON TABLE product_templates IS
  'Product configuration templates using LiquidJS. Stores templates and config data for flexible product configurators.';

COMMENT ON COLUMN product_templates.options_template IS
  'LiquidJS template for rendering the options/configuration UI';

COMMENT ON COLUMN product_templates.config_data IS
  'JSONB containing all option definitions, groups, and static data for the template';

COMMENT ON COLUMN product_templates.price_modifiers IS
  'Array of pricing rules: [{condition_field, condition_value, price_adjustment, adjustment_type}]';

COMMENT ON COLUMN product_templates.cascades IS
  'Defines which fields cascade to others: {"parent_field": ["child_field1", "child_field2"]}';
