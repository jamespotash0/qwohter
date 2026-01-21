/**
 * Product Templates Types
 *
 * Type definitions for the LiquidJS-based product configuration system.
 */

// =============================================================================
// Database Types
// =============================================================================

export interface ProductTemplate {
  id: string;
  manufacturer: string;
  domain: string;
  series: string | null;
  model: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  options_template: string | null;
  summary_template: string | null;
  config_data: ConfigData;
  base_price: number;
  price_modifiers: PriceModifier[];
  validation_rules: ValidationRule[];
  cascades: Record<string, string[]>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface TemplateOptionValue {
  id: string;
  template_id: string;
  level: 'series' | 'model' | 'option_group' | 'option';
  parent_id: string | null;
  code: string;
  label: string;
  description: string | null;
  image_url: string | null;
  price_modifier: number;
  modifier_type: 'fixed' | 'percentage';
  sort_order: number;
  visible_when: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Configuration Data Types
// =============================================================================

export interface ConfigData {
  options: Record<string, OptionDefinition[]>;
  option_groups?: OptionGroup[];
  [key: string]: unknown; // Allow additional custom data
}

export interface OptionDefinition {
  code: string;
  label: string;
  description?: string;
  image_url?: string;
  price_modifier: number;
  modifier_type?: 'fixed' | 'percentage';
  available_for?: string | string[]; // "all" or array of parent codes
  requires?: string[]; // Other option codes that must be selected
  excludes?: string[]; // Other option codes that cannot be selected with this
  [key: string]: unknown; // Allow additional custom properties
}

export interface OptionGroup {
  id: string;
  label: string;
  description?: string;
  fields: string[];
  collapsible?: boolean;
  collapsed_by_default?: boolean;
}

// =============================================================================
// Price Modifier Types
// =============================================================================

export interface PriceModifier {
  condition_field: string;
  condition_value: string | number | boolean;
  condition_operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  price_adjustment: number;
  adjustment_type: 'fixed' | 'percentage';
  description?: string;
}

// =============================================================================
// Validation Types
// =============================================================================

export interface ValidationRule {
  field: string;
  rule: ValidationRuleType;
  message: string;
  params?: Record<string, unknown>;
}

export type ValidationRuleType =
  | 'required'
  | 'min'
  | 'max'
  | 'min_length'
  | 'max_length'
  | 'pattern'
  | 'custom';

export interface ValidationError {
  field: string;
  message: string;
}

// =============================================================================
// Configurator State Types
// =============================================================================

export interface ConfiguratorSelections {
  [key: string]: string | number | boolean | null;
}

export interface ConfiguratorState {
  template: ProductTemplate | null;
  selections: ConfiguratorSelections;
  validationErrors: ValidationError[];
  calculatedPrice: number;
  unitPrice: number;
  isLoading: boolean;
  error: string | null;
}

// =============================================================================
// Render Context Types (passed to Liquid templates)
// =============================================================================

export interface TemplateRenderContext {
  product: {
    id: string;
    name: string;
    description: string | null;
    manufacturer: string;
    domain: string;
    series: string | null;
    model: string | null;
    image_url: string | null;
    base_price: number;
  };
  options: Record<string, OptionDefinition[]>;
  option_groups: OptionGroup[];
  selected: ConfiguratorSelections & {
    // Also include labels for selected values
    [key: `${string}_label`]: string;
  };
  calculated_price: number;
  unit_price: number;
  quantity: number;
  validation_errors: ValidationError[];
  cascades: Record<string, string[]>;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface FetchTemplateParams {
  manufacturer?: string;
  domain?: string;
  series?: string;
  model?: string;
  id?: string;
}

export interface TemplateListItem {
  id: string;
  manufacturer: string;
  domain: string;
  series: string | null;
  model: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  base_price: number;
  is_active: boolean;
}

// =============================================================================
// Event Types
// =============================================================================

export interface ConfiguratorChangeEvent {
  field: string;
  value: string | number | boolean | null;
  previousValue: string | number | boolean | null;
  selections: ConfiguratorSelections;
  calculatedPrice: number;
}

export interface ConfiguratorSubmitEvent {
  template: ProductTemplate;
  selections: ConfiguratorSelections;
  calculatedPrice: number;
  unitPrice: number;
  quantity: number;
}

// =============================================================================
// Component Props Types
// =============================================================================

export interface ProductConfiguratorProps {
  /** Template ID to load */
  templateId?: string;
  /** Or specify by hierarchy */
  manufacturer?: string;
  domain?: string;
  series?: string;
  model?: string;
  /** Initial selections */
  initialSelections?: ConfiguratorSelections;
  /** Callback when selections change */
  onChange?: (event: ConfiguratorChangeEvent) => void;
  /** Callback when configuration is submitted */
  onSubmit?: (event: ConfiguratorSubmitEvent) => void;
  /** Callback on validation error */
  onValidationError?: (errors: ValidationError[]) => void;
  /** Show/hide price summary */
  showPriceSummary?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Read-only mode (for viewing saved configurations) */
  readOnly?: boolean;
}

export interface ConfiguratorSelectorProps {
  /** Available manufacturers */
  manufacturers: string[];
  /** Available domains */
  domains: string[];
  /** Selected manufacturer */
  selectedManufacturer?: string;
  /** Selected domain */
  selectedDomain?: string;
  /** Callback when selection changes */
  onSelect: (manufacturer: string, domain: string) => void;
}
