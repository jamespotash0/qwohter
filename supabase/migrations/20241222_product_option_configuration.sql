-- ============================================================================
-- Product Option Configuration Schema
-- Tables for managing model options, values, and business rules
-- Prefix: pc_ (product configuration)
-- ============================================================================

-- ============================================================================
-- STEP 1: Option Groups (shared definitions)
-- e.g., "Track System", "Panel Face", "STC Rating", "Wall Height"
-- ============================================================================

CREATE TABLE IF NOT EXISTS pc_option_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL, -- URL-safe identifier: "track_system", "panel_face"
    description TEXT,

    -- Field behavior
    field_type VARCHAR(50) NOT NULL DEFAULT 'dropdown',
    -- dropdown: single select from options
    -- input: free-form text/number input
    -- multi-select: multiple selections allowed
    -- auto: system-calculated, read-only

    input_type VARCHAR(50), -- For field_type='input': 'string', 'number', 'decimal'

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(slug)
);

COMMENT ON TABLE pc_option_groups IS 'Shared option definitions that can be reused across multiple models';
COMMENT ON COLUMN pc_option_groups.field_type IS 'UI control type: dropdown, input, multi-select, auto';

-- ============================================================================
-- STEP 2: Option Values (all possible values for each group)
-- e.g., "Curtition #4", "Surface-Mounted", "Concealed"
-- ============================================================================

CREATE TABLE IF NOT EXISTS pc_option_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_group_id UUID NOT NULL REFERENCES pc_option_groups(id) ON DELETE CASCADE,

    -- Value data
    value VARCHAR(500) NOT NULL, -- The actual value stored

    -- Organization
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(option_group_id, value)
);

COMMENT ON TABLE pc_option_values IS 'All possible values for each option group';

-- ============================================================================
-- STEP 3: Model Option Configurations
-- Links models to option groups with model-specific UI settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS pc_model_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES product_models(id) ON DELETE CASCADE,
    option_group_id UUID NOT NULL REFERENCES pc_option_groups(id) ON DELETE CASCADE,

    -- UI Metadata
    display_order INT DEFAULT 0,
    display_group VARCHAR(50) DEFAULT 'primary', -- primary, secondary, advanced, hidden
    grid_span INT DEFAULT 2, -- CSS grid span (1-4)
    placeholder VARCHAR(255),
    help_text VARCHAR(500), -- Tooltip or helper text

    -- Behavior overrides (can override option_group defaults)
    is_required BOOLEAN DEFAULT false,
    is_multi_select BOOLEAN DEFAULT false,
    is_manual_select BOOLEAN DEFAULT true, -- false = auto-calculated
    is_visible BOOLEAN DEFAULT true, -- false = hidden but still exists

    -- Default value (references pc_option_values for dropdown/multi-select)
    default_value_id UUID REFERENCES pc_option_values(id) ON DELETE SET NULL,
    default_input_value VARCHAR(500), -- For input fields: default text/number

    -- Input constraints (for field_type='input')
    min_value DECIMAL,
    max_value DECIMAL,
    step_value DECIMAL, -- For number inputs: increment step
    validation_pattern VARCHAR(255), -- Regex pattern for validation

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(model_id, option_group_id)
);

COMMENT ON TABLE pc_model_options IS 'Model-specific option configurations and UI metadata';
COMMENT ON COLUMN pc_model_options.display_group IS 'UI grouping: primary (always visible), secondary (expanded), advanced (hidden by default)';

-- ============================================================================
-- STEP 4: Model Allowed Values
-- Restricts which option values are available for a specific model
-- If no entries exist for a model+option_group, ALL values are allowed
-- ============================================================================

CREATE TABLE IF NOT EXISTS pc_model_allowed_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_option_id UUID NOT NULL REFERENCES pc_model_options(id) ON DELETE CASCADE,
    option_value_id UUID NOT NULL REFERENCES pc_option_values(id) ON DELETE CASCADE,

    -- Override settings
    is_default BOOLEAN DEFAULT false, -- Mark as default selection for this model
    sort_order INT DEFAULT 0, -- Model-specific sort order (overrides option_values.sort_order)

    -- Conditional availability
    is_active BOOLEAN DEFAULT true,

    UNIQUE(model_option_id, option_value_id)
);

COMMENT ON TABLE pc_model_allowed_values IS 'Restricts option values to a subset for each model. Empty = all values allowed.';

-- ============================================================================
-- STEP 5: Product Rules (conditional business logic)
-- e.g., "If wall_height > 50 AND wall_type = operable, set Track System = Curtition #4"
-- ============================================================================

CREATE TABLE IF NOT EXISTS pc_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Scope: rule applies to model, variant, or globally
    model_id UUID REFERENCES product_models(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    -- If both null, rule is global (applies to all)

    -- Identity
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Execution
    priority INT DEFAULT 0, -- Higher = evaluated first
    is_active BOOLEAN DEFAULT true,

    -- Rule logic (JSONB for flexible structure)
    condition JSONB NOT NULL,
    effect JSONB NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE pc_rules IS 'Business rules for conditional option behavior';
COMMENT ON COLUMN pc_rules.condition IS 'JSON condition: {"operator": "AND", "conditions": [{"field": "Wall Height", "comparator": "gt", "value": 50}]}';
COMMENT ON COLUMN pc_rules.effect IS 'JSON effect: {"set_value": {"Track System": "Curtition #4"}, "hide_options": ["Panel Face"]}';

-- ============================================================================
-- STEP 6: Variant Option Overrides
-- Allows variants to override model-level option configurations
-- ============================================================================

CREATE TABLE IF NOT EXISTS pc_variant_option_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    model_option_id UUID NOT NULL REFERENCES pc_model_options(id) ON DELETE CASCADE,

    -- Override settings (null = inherit from model)
    is_required BOOLEAN,
    is_visible BOOLEAN,
    is_manual_select BOOLEAN,
    default_value_id UUID REFERENCES pc_option_values(id) ON DELETE SET NULL,
    default_input_value VARCHAR(500),

    -- Constrain allowed values differently for this variant
    -- If empty, inherits from pc_model_allowed_values
    allowed_value_ids UUID[] DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(variant_id, model_option_id)
);

COMMENT ON TABLE pc_variant_option_overrides IS 'Variant-specific overrides for model option configurations';

-- ============================================================================
-- STEP 7: Indexes for Query Performance
-- ============================================================================

-- Option groups
CREATE INDEX IF NOT EXISTS idx_pc_option_groups_slug ON pc_option_groups(slug);
CREATE INDEX IF NOT EXISTS idx_pc_option_groups_field_type ON pc_option_groups(field_type);

-- Option values
CREATE INDEX IF NOT EXISTS idx_pc_option_values_group_id ON pc_option_values(option_group_id);
CREATE INDEX IF NOT EXISTS idx_pc_option_values_active ON pc_option_values(option_group_id, is_active) WHERE is_active = true;

-- Model options
CREATE INDEX IF NOT EXISTS idx_pc_model_options_model_id ON pc_model_options(model_id);
CREATE INDEX IF NOT EXISTS idx_pc_model_options_group_id ON pc_model_options(option_group_id);
CREATE INDEX IF NOT EXISTS idx_pc_model_options_display ON pc_model_options(model_id, display_order);

-- Allowed values
CREATE INDEX IF NOT EXISTS idx_pc_allowed_values_model_option ON pc_model_allowed_values(model_option_id);
CREATE INDEX IF NOT EXISTS idx_pc_allowed_values_option_value ON pc_model_allowed_values(option_value_id);

-- Rules
CREATE INDEX IF NOT EXISTS idx_pc_rules_model_id ON pc_rules(model_id);
CREATE INDEX IF NOT EXISTS idx_pc_rules_variant_id ON pc_rules(variant_id);
CREATE INDEX IF NOT EXISTS idx_pc_rules_priority ON pc_rules(priority DESC) WHERE is_active = true;

-- Variant overrides
CREATE INDEX IF NOT EXISTS idx_pc_variant_overrides_variant ON pc_variant_option_overrides(variant_id);
CREATE INDEX IF NOT EXISTS idx_pc_variant_overrides_model_option ON pc_variant_option_overrides(model_option_id);

-- ============================================================================
-- STEP 8: Row Level Security (RLS)
-- ============================================================================

ALTER TABLE pc_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_model_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_model_allowed_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_variant_option_overrides ENABLE ROW LEVEL SECURITY;

-- Public read access (product catalog is public)
CREATE POLICY "pc_option_groups_select" ON pc_option_groups FOR SELECT USING (true);
CREATE POLICY "pc_option_values_select" ON pc_option_values FOR SELECT USING (true);
CREATE POLICY "pc_model_options_select" ON pc_model_options FOR SELECT USING (true);
CREATE POLICY "pc_model_allowed_values_select" ON pc_model_allowed_values FOR SELECT USING (true);
CREATE POLICY "pc_rules_select" ON pc_rules FOR SELECT USING (true);
CREATE POLICY "pc_variant_option_overrides_select" ON pc_variant_option_overrides FOR SELECT USING (true);

-- Authenticated write access
CREATE POLICY "pc_option_groups_insert" ON pc_option_groups FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "pc_option_groups_update" ON pc_option_groups FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "pc_option_groups_delete" ON pc_option_groups FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "pc_option_values_insert" ON pc_option_values FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "pc_option_values_update" ON pc_option_values FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "pc_option_values_delete" ON pc_option_values FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "pc_model_options_insert" ON pc_model_options FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "pc_model_options_update" ON pc_model_options FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "pc_model_options_delete" ON pc_model_options FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "pc_model_allowed_values_insert" ON pc_model_allowed_values FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "pc_model_allowed_values_update" ON pc_model_allowed_values FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "pc_model_allowed_values_delete" ON pc_model_allowed_values FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "pc_rules_insert" ON pc_rules FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "pc_rules_update" ON pc_rules FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "pc_rules_delete" ON pc_rules FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "pc_variant_option_overrides_insert" ON pc_variant_option_overrides FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "pc_variant_option_overrides_update" ON pc_variant_option_overrides FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "pc_variant_option_overrides_delete" ON pc_variant_option_overrides FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================================
-- STEP 9: Updated_at Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS update_pc_option_groups_updated_at ON pc_option_groups;
CREATE TRIGGER update_pc_option_groups_updated_at
    BEFORE UPDATE ON pc_option_groups
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS update_pc_model_options_updated_at ON pc_model_options;
CREATE TRIGGER update_pc_model_options_updated_at
    BEFORE UPDATE ON pc_model_options
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS update_pc_rules_updated_at ON pc_rules;
CREATE TRIGGER update_pc_rules_updated_at
    BEFORE UPDATE ON pc_rules
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS update_pc_variant_option_overrides_updated_at ON pc_variant_option_overrides;
CREATE TRIGGER update_pc_variant_option_overrides_updated_at
    BEFORE UPDATE ON pc_variant_option_overrides
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- STEP 10: Helper View - Full Model Configuration
-- Returns complete option configuration for a model in a query-friendly format
-- ============================================================================

CREATE OR REPLACE VIEW v_model_option_config AS
SELECT
    pm.id AS model_id,
    pm.name AS model_name,
    ps.id AS series_id,
    ps.name AS series_name,

    -- Option group info
    og.id AS option_group_id,
    og.name AS option_group_name,
    og.slug AS option_group_slug,
    og.field_type,
    og.input_type,

    -- Model-specific config
    mo.id AS model_option_id,
    mo.display_order,
    mo.display_group,
    mo.grid_span,
    mo.placeholder,
    mo.help_text,
    mo.is_required,
    mo.is_multi_select,
    mo.is_manual_select,
    mo.is_visible,
    mo.min_value,
    mo.max_value,
    mo.step_value,
    mo.default_input_value,

    -- Default value
    dv.id AS default_value_id,
    dv.value AS default_value

FROM product_models pm
LEFT JOIN product_series ps ON ps.id = pm.product_series_id
JOIN pc_model_options mo ON mo.model_id = pm.id
JOIN pc_option_groups og ON og.id = mo.option_group_id
LEFT JOIN pc_option_values dv ON dv.id = mo.default_value_id
ORDER BY pm.name, mo.display_order;

GRANT SELECT ON v_model_option_config TO authenticated;

-- ============================================================================
-- STEP 11: Helper View - Model Allowed Values with Details
-- ============================================================================

CREATE OR REPLACE VIEW v_model_allowed_values AS
SELECT
    mo.model_id,
    mo.option_group_id,
    og.name AS option_group_name,
    og.slug AS option_group_slug,
    ov.id AS option_value_id,
    ov.value,
    mav.is_default,
    COALESCE(mav.sort_order, ov.sort_order) AS sort_order

FROM pc_model_options mo
JOIN pc_option_groups og ON og.id = mo.option_group_id
JOIN pc_model_allowed_values mav ON mav.model_option_id = mo.id
JOIN pc_option_values ov ON ov.id = mav.option_value_id
WHERE ov.is_active = true
ORDER BY mo.model_id, og.name, COALESCE(mav.sort_order, ov.sort_order);

GRANT SELECT ON v_model_allowed_values TO authenticated;

-- ============================================================================
-- STEP 12: Function to Get Complete Model Configuration as JSON
-- Returns the exact JSON structure needed by the frontend
-- ============================================================================

CREATE OR REPLACE FUNCTION get_model_configuration(p_model_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'model_id', pm.id,
        'model_name', pm.name,
        'series_id', ps.id,
        'series_name', ps.name,
        'product_line_id', pl.id,
        'product_line_name', pl.name,
        'option_groups', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', og.id,
                    'name', og.name,
                    'slug', og.slug,
                    'field_type', og.field_type,
                    'input_type', og.input_type,
                    'allowed_values', (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', ov.id,
                                'value', ov.value
                            ) ORDER BY COALESCE(mav.sort_order, ov.sort_order)
                        ), '[]'::jsonb)
                        FROM pc_model_allowed_values mav
                        JOIN pc_option_values ov ON ov.id = mav.option_value_id
                        WHERE mav.model_option_id = mo.id
                        AND ov.is_active = true
                    ),
                    'default_value', COALESCE(
                        (SELECT ov.value FROM pc_option_values ov WHERE ov.id = mo.default_value_id),
                        mo.default_input_value
                    ),
                    'ui_metadata', jsonb_build_object(
                        'display_order', mo.display_order,
                        'display_group', mo.display_group,
                        'grid_span', mo.grid_span,
                        'placeholder', mo.placeholder,
                        'help_text', mo.help_text,
                        'is_required', mo.is_required,
                        'is_multi_select', mo.is_multi_select,
                        'is_manual_select', mo.is_manual_select,
                        'is_visible', mo.is_visible,
                        'min_value', mo.min_value,
                        'max_value', mo.max_value,
                        'step_value', mo.step_value
                    )
                ) ORDER BY mo.display_order
            ), '[]'::jsonb)
            FROM pc_model_options mo
            JOIN pc_option_groups og ON og.id = mo.option_group_id
            WHERE mo.model_id = pm.id
        ),
        'rules', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', r.id,
                    'name', r.name,
                    'description', r.description,
                    'priority', r.priority,
                    'condition', r.condition,
                    'effect', r.effect
                ) ORDER BY r.priority DESC
            ), '[]'::jsonb)
            FROM pc_rules r
            WHERE r.model_id = pm.id
            AND r.is_active = true
        )
    ) INTO v_result
    FROM product_models pm
    LEFT JOIN product_series ps ON ps.id = pm.product_series_id
    LEFT JOIN product_line pl ON pl.id = pm.product_line_id
    WHERE pm.id = p_model_id;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_model_configuration(UUID) TO authenticated;

-- ============================================================================
-- Schema Summary:
--
-- TABLES:
-- pc_option_groups      - Shared option definitions (Track System, Panel Face, etc.)
-- pc_option_values      - All possible values for each option group
-- pc_model_options      - Model ↔ option group link with UI metadata
-- pc_model_allowed_values - Which values are allowed per model (subset)
-- pc_rules              - Conditional business logic
-- pc_variant_option_overrides - Variant-specific option overrides
--
-- VIEWS:
-- v_model_option_config   - Flat view of model options for querying
-- v_model_allowed_values  - Model's allowed values with details
--
-- FUNCTIONS:
-- get_model_configuration(model_id) - Returns complete JSON for frontend
--
-- USAGE:
-- SELECT get_model_configuration('382a1fbd-6090-4cb9-be78-99075d1680bf');
--
-- ============================================================================
