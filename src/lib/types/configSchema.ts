/**
 * Config Schema Types
 *
 * Type definitions for the product configuration schema system.
 * This replaces the complex pc_* table structure with a single JSONB schema.
 *
 * Supports three option behaviors:
 * 1. CASCADING - Parent selection controls child values (material_type → material_option)
 * 2. SHARED STATIC - Same options everywhere via values_ref (support_system)
 * 3. CONDITIONAL - Options filtered/computed by other field values (track_system by wall_height)
 */

// =============================================================================
// MAIN SCHEMA TYPES
// =============================================================================

/**
 * Complete configuration schema stored on product_models.config_schema
 */
export interface ConfigSchema {
  /** Schema version for future migrations */
  version: string;

  /** Option field definitions keyed by field name (snake_case) */
  options: Record<string, OptionField>;

  /** Optional grouping for UI organization */
  groups?: OptionGroup[];
}

/**
 * Option group for organizing fields in the UI
 */
export interface OptionGroup {
  /** Unique identifier for the group */
  id: string;

  /** Display label */
  label: string;

  /** Sort order (lower = first) */
  order?: number;

  /** Whether group can be collapsed */
  collapsible?: boolean;

  /** Start collapsed */
  collapsed_by_default?: boolean;
}

// =============================================================================
// OPTION FIELD TYPES
// =============================================================================

/**
 * Single option field definition
 */
export interface OptionField {
  /** Display label shown to user */
  label: string;

  /** Field input type */
  type: OptionFieldType;

  // ---------------------------------------------------------------------------
  // VALUES - Three ways to define available options
  // ---------------------------------------------------------------------------

  /**
   * Inline values for small static lists
   * Use for lists that won't change and are specific to this model
   * @example ["Manual", "Electric", "Pneumatic"]
   */
  values?: string[];

  /**
   * Reference to config_value_sets by slug
   *
   * Static reference (same values always):
   * @example "standard_support_systems"
   *
   * Cascading reference (values depend on parent selection):
   * @example {"Oak": "oak_finishes", "Vinyl": "vinyl_colors", "Painted": "ral_paints"}
   */
  values_ref?: string | Record<string, string>;

  /**
   * Parent field name for cascading (used with values_ref as Record)
   * When parent value changes, this field's options update accordingly
   * @example "material_type"
   */
  depends_on?: string;

  // ---------------------------------------------------------------------------
  // VALUE FILTERING - Restrict which values from a set are available
  // ---------------------------------------------------------------------------

  /**
   * Only allow these specific codes from the values_ref set
   * Use when a model should only show a subset of a shared value set
   * @example ["V001", "V002", "V005", "V010"] - only these vinyl colors available
   */
  allowed_codes?: string[];

  /**
   * Exclude these specific codes from the values_ref set
   * Use when a model should show most values except a few
   * @example ["V003", "V004"] - all vinyl colors except these
   */
  excluded_codes?: string[];

  // ---------------------------------------------------------------------------
  // CONDITIONAL FILTERING - Options change based on other field values
  // ---------------------------------------------------------------------------

  /**
   * Filter available options based on another field's numeric value
   * Different from depends_on: this filters by conditions, not exact match
   * @example { field: "wall_height", rules: [{ when: { ">": 30 }, show: ["heavy_duty"] }] }
   */
  filter_by?: FilterConfig;

  // ---------------------------------------------------------------------------
  // COMPUTED - Auto-calculated, readonly
  // ---------------------------------------------------------------------------

  /**
   * Rules for computing value automatically (for type: 'computed')
   * Field becomes readonly and value is calculated from other fields
   */
  compute_rules?: ComputeRule[];

  // ---------------------------------------------------------------------------
  // NUMBER FIELD CONSTRAINTS
  // ---------------------------------------------------------------------------

  /** Minimum value (for type: 'number') */
  min?: number;

  /** Maximum value (for type: 'number') */
  max?: number;

  /** Step increment (for type: 'number') */
  step?: number;

  /** Unit label displayed after input (for type: 'number') */
  unit?: string;

  // ---------------------------------------------------------------------------
  // TEXT FIELD CONSTRAINTS
  // ---------------------------------------------------------------------------

  /** Minimum length (for type: 'text' | 'textarea') */
  min_length?: number;

  /** Maximum length (for type: 'text' | 'textarea') */
  max_length?: number;

  /** Validation pattern (for type: 'text') */
  pattern?: string;

  // ---------------------------------------------------------------------------
  // UI METADATA
  // ---------------------------------------------------------------------------

  /** Whether field is required */
  required?: boolean;

  /** Whether field is readonly (auto-set for computed fields) */
  readonly?: boolean;

  /** Placeholder text */
  placeholder?: string;

  /** Help text shown below field */
  help_text?: string;

  /** Group ID this field belongs to */
  group?: string;

  /** Sort order within group (lower = first) */
  order?: number;

  /** Grid column span (1-4) for layout */
  grid_span?: 1 | 2 | 3 | 4;

  /** Conditional visibility based on other field values */
  visible_when?: VisibilityCondition;

  /** Default value */
  default_value?: string | number | boolean | string[];
}

/**
 * Available field input types
 */
export type OptionFieldType =
  | 'select' // Single dropdown selection
  | 'multi-select' // Multiple selection (checkboxes or multi-select dropdown)
  | 'number' // Numeric input with optional min/max/step
  | 'text' // Single line text input
  | 'textarea' // Multi-line text input
  | 'checkbox' // Boolean toggle
  | 'computed'; // Auto-calculated, readonly display

// =============================================================================
// CONDITIONAL LOGIC TYPES
// =============================================================================

/**
 * Configuration for filtering options based on another field's value
 */
export interface FilterConfig {
  /** Field name to evaluate */
  field: string;

  /** Rules determining which values to show */
  rules: FilterRule[];
}

/**
 * Single filter rule
 */
export interface FilterRule {
  /** Condition to check against the field value */
  when: ConditionExpression;

  /** Value codes to show when condition is true */
  show: string[];
}

/**
 * Rule for computing a field's value automatically
 */
export interface ComputeRule {
  /** Condition to check (omit for default/fallback rule) */
  when?: Record<string, ConditionExpression>;

  /** Resulting value when condition is true */
  value: string | number;

  /** Mark as default fallback rule (used when no other rules match) */
  default?: boolean;
}

/**
 * Condition for showing/hiding a field
 */
export interface VisibilityCondition {
  /** Field name to check */
  field: string;

  /** Comparison operator */
  operator: ConditionOperator;

  /** Value to compare against */
  value: string | number | boolean | (string | number)[];
}

/**
 * Available comparison operators
 */
export type ConditionOperator =
  | '==' // Equals
  | '!=' // Not equals
  | '>' // Greater than (numeric)
  | '<' // Less than (numeric)
  | '>=' // Greater than or equal (numeric)
  | '<=' // Less than or equal (numeric)
  | 'in' // Value is in array
  | 'not_in' // Value is not in array
  | 'is_set' // Value is not null/undefined/empty
  | 'is_not_set'; // Value is null/undefined/empty

/**
 * Flexible condition expression for filter_by and compute_rules
 *
 * @example { "<=": 20 } - value <= 20
 * @example { ">": 30 } - value > 30
 * @example { "==": "Vinyl" } - value equals "Vinyl"
 * @example { "in": ["Oak", "Walnut"] } - value is "Oak" or "Walnut"
 */
export interface ConditionExpression {
  '=='?: string | number | boolean;
  '!='?: string | number | boolean;
  '>'?: number;
  '<'?: number;
  '>='?: number;
  '<='?: number;
  in?: (string | number)[];
  not_in?: (string | number)[];
}

// =============================================================================
// FORM STATE TYPES
// =============================================================================

/**
 * Form values collected from user selections
 */
export type ConfigFormValues = Record<
  string,
  string | number | boolean | string[] | null
>;

/**
 * Validation error for a single field
 */
export interface ConfigValidationError {
  /** Field name with error */
  field: string;

  /** Error message */
  message: string;

  /** Error type for categorization */
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
}

// =============================================================================
// RESOLVED SCHEMA TYPES (after fetching value refs)
// =============================================================================

/**
 * Value option from config_value_sets (resolved)
 */
export interface ResolvedValueOption {
  /** Unique code for this value */
  code: string;

  /** Display label */
  label: string;

  /** Optional color hex code */
  hex?: string;

  /** Optional swatch/preview image URL */
  image_url?: string;

  /** Optional description */
  description?: string;

  /** Sort order */
  sort_order?: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Option field with resolved values (values_ref replaced with actual values)
 */
export interface ResolvedOptionField extends Omit<OptionField, 'values_ref'> {
  /** Resolved values from config_value_sets or inline values */
  resolved_values: ResolvedValueOption[];

  /** Original values_ref for reference */
  original_values_ref?: string | Record<string, string>;
}

/**
 * Fully resolved schema ready for rendering
 */
export interface ResolvedConfigSchema {
  version: string;
  options: Record<string, ResolvedOptionField>;
  groups: OptionGroup[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Type guard to check if a value is a valid ConfigSchema
 */
export function isValidConfigSchema(value: unknown): value is ConfigSchema {
  if (typeof value !== 'object' || value === null) return false;

  const schema = value as Record<string, unknown>;

  return (
    typeof schema.version === 'string' &&
    typeof schema.options === 'object' &&
    schema.options !== null
  );
}

/**
 * Type guard to check if values_ref is a cascading reference (Record)
 */
export function isCascadingValuesRef(
  valuesRef: string | Record<string, string> | undefined
): valuesRef is Record<string, string> {
  return typeof valuesRef === 'object' && valuesRef !== null;
}

/**
 * Type guard to check if values_ref is a static reference (string)
 */
export function isStaticValuesRef(
  valuesRef: string | Record<string, string> | undefined
): valuesRef is string {
  return typeof valuesRef === 'string';
}

/**
 * Check if a field has conditional filtering
 */
export function hasFilterBy(field: OptionField): boolean {
  return field.filter_by !== undefined && field.filter_by.rules.length > 0;
}

/**
 * Check if a field is computed
 */
export function isComputedField(field: OptionField): boolean {
  return field.type === 'computed';
}

/**
 * Check if a field has cascading dependencies
 */
export function hasCascading(field: OptionField): boolean {
  return field.depends_on !== undefined && isCascadingValuesRef(field.values_ref);
}

/**
 * Check if a field has value filtering (allowed_codes or excluded_codes)
 */
export function hasValueFiltering(field: OptionField): boolean {
  return (
    (field.allowed_codes !== undefined && field.allowed_codes.length > 0) ||
    (field.excluded_codes !== undefined && field.excluded_codes.length > 0)
  );
}

/**
 * Filter values based on allowed_codes and excluded_codes
 */
export function filterValuesByCodes<T extends { code: string }>(
  values: T[],
  allowedCodes?: string[],
  excludedCodes?: string[]
): T[] {
  let filtered = values;

  // If allowed_codes is specified, only include those (case-insensitive)
  if (allowedCodes && allowedCodes.length > 0) {
    const allowedSetUpper = new Set(allowedCodes.map(c => c.toUpperCase()));
    filtered = filtered.filter((v) => allowedSetUpper.has(v.code.toUpperCase()));
  }

  // If excluded_codes is specified, remove those (case-insensitive)
  if (excludedCodes && excludedCodes.length > 0) {
    const excludedSetUpper = new Set(excludedCodes.map(c => c.toUpperCase()));
    filtered = filtered.filter((v) => !excludedSetUpper.has(v.code.toUpperCase()));
  }

  return filtered;
}

/**
 * Get all value set slugs referenced in a schema
 * Useful for batch fetching all required value sets
 */
export function getReferencedValueSetSlugs(schema: ConfigSchema): string[] {
  const slugs = new Set<string>();

  for (const field of Object.values(schema.options)) {
    if (!field.values_ref) continue;

    if (isStaticValuesRef(field.values_ref)) {
      slugs.add(field.values_ref);
    } else if (isCascadingValuesRef(field.values_ref)) {
      for (const slug of Object.values(field.values_ref)) {
        slugs.add(slug);
      }
    }
  }

  return Array.from(slugs);
}

/**
 * Create an empty config schema with default version
 */
export function createEmptyConfigSchema(): ConfigSchema {
  return {
    version: '2.0',
    options: {},
    groups: [],
  };
}

/**
 * Normalize inline values to ResolvedValueOption format
 */
export function normalizeInlineValues(values: string[]): ResolvedValueOption[] {
  return values.map((value, index) => ({
    code: value,
    label: value,
    sort_order: index,
  }));
}
