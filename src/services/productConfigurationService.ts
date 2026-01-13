/**
 * Product Configuration Service
 *
 * Handles operations for product catalog option configuration:
 * - Option groups (Track System, Panel Face, etc.)
 * - Option values (available selections for each group)
 * - Model option configurations (UI metadata, allowed values per model)
 * - Business rules (conditional logic)
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface OptionGroup {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  field_type: 'dropdown' | 'input' | 'multi-select' | 'auto';
  input_type: 'string' | 'number' | 'decimal' | null;
  created_at: string;
  updated_at: string;
}

export interface OptionValue {
  id: string;
  option_group_id: string;
  value: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ModelOption {
  id: string;
  model_id: string;
  option_group_id: string;
  display_order: number;
  display_group: 'primary' | 'secondary' | 'advanced' | 'hidden';
  grid_span: number;
  placeholder: string | null;
  help_text: string | null;
  is_required: boolean;
  is_multi_select: boolean;
  is_manual_select: boolean;
  is_visible: boolean;
  default_value_id: string | null;
  default_input_value: string | null;
  min_value: number | null;
  max_value: number | null;
  step_value: number | null;
  validation_pattern: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModelAllowedValue {
  id: string;
  model_option_id: string;
  option_value_id: string;
  is_default: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface ProductRule {
  id: string;
  model_id: string | null;
  variant_id: string | null;
  name: string;
  description: string | null;
  priority: number;
  is_active: boolean;
  condition: Record<string, any>;
  effect: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Frontend-friendly configuration format
export interface ModelConfiguration {
  model_id: string;
  model_name: string;
  series_id: string | null;
  series_name: string | null;
  product_line_id: string | null;
  product_line_name: string | null;
  option_groups: OptionGroupConfig[];
  rules: RuleConfig[];
}

export interface OptionGroupConfig {
  id: string;
  name: string;
  slug: string;
  field_type: string;
  input_type: string | null;
  allowed_values: AllowedValueConfig[];
  default_value: string | null;
  ui_metadata: UiMetadata;
}

export interface AllowedValueConfig {
  id: string;
  value: string;
}

export interface UiMetadata {
  display_order: number;
  display_group: string;
  grid_span: number;
  placeholder: string | null;
  help_text: string | null;
  is_required: boolean;
  is_multi_select: boolean;
  is_manual_select: boolean;
  is_visible: boolean;
  min_value: number | null;
  max_value: number | null;
  step_value: number | null;
}

export interface RuleConfig {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  condition: Record<string, any>;
  effect: Record<string, any>;
}

// ============================================================================
// Service
// ============================================================================

export class ProductConfigurationService {
  /**
   * Get complete model configuration using the database function
   * Returns the full option configuration in a frontend-friendly format
   */
  async getModelConfiguration(modelId: string): Promise<ModelConfiguration | null> {
    const { data, error } = await supabase.rpc('get_model_configuration', {
      p_model_id: modelId,
    });

    if (error) {
      console.error('Failed to fetch model configuration:', error);
      throw new Error(`Failed to fetch model configuration: ${error.message}`);
    }

    return data as ModelConfiguration | null;
  }

  /**
   * Get all option groups
   */
  async getOptionGroups(): Promise<OptionGroup[]> {
    const { data, error } = await supabase
      .from('pc_option_groups')
      .select('*')
      .order('name');

    if (error) {
      console.error('Failed to fetch option groups:', error);
      throw new Error(`Failed to fetch option groups: ${error.message}`);
    }

    return (data as OptionGroup[]) || [];
  }

  /**
   * Get option group by slug
   */
  async getOptionGroupBySlug(slug: string): Promise<OptionGroup | null> {
    const { data, error } = await supabase
      .from('pc_option_groups')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Failed to fetch option group:', error);
      throw new Error(`Failed to fetch option group: ${error.message}`);
    }

    return data as OptionGroup;
  }

  /**
   * Get all values for an option group
   */
  async getOptionValues(optionGroupId: string): Promise<OptionValue[]> {
    const { data, error } = await supabase
      .from('pc_option_values')
      .select('*')
      .eq('option_group_id', optionGroupId)
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Failed to fetch option values:', error);
      throw new Error(`Failed to fetch option values: ${error.message}`);
    }

    return (data as OptionValue[]) || [];
  }

  /**
   * Get model options (option configurations for a specific model)
   */
  async getModelOptions(modelId: string): Promise<ModelOption[]> {
    const { data, error } = await supabase
      .from('pc_model_options')
      .select('*')
      .eq('model_id', modelId)
      .order('display_order');

    if (error) {
      console.error('Failed to fetch model options:', error);
      throw new Error(`Failed to fetch model options: ${error.message}`);
    }

    return (data as ModelOption[]) || [];
  }

  /**
   * Get allowed values for a model option
   */
  async getModelAllowedValues(modelOptionId: string): Promise<ModelAllowedValue[]> {
    const { data, error } = await supabase
      .from('pc_model_allowed_values')
      .select('*')
      .eq('model_option_id', modelOptionId)
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Failed to fetch allowed values:', error);
      throw new Error(`Failed to fetch allowed values: ${error.message}`);
    }

    return (data as ModelAllowedValue[]) || [];
  }

  /**
   * Get active rules for a model
   */
  async getModelRules(modelId: string): Promise<ProductRule[]> {
    const { data, error } = await supabase
      .from('pc_rules')
      .select('*')
      .eq('model_id', modelId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Failed to fetch model rules:', error);
      throw new Error(`Failed to fetch model rules: ${error.message}`);
    }

    return (data as ProductRule[]) || [];
  }

  /**
   * Create a new option group
   */
  async createOptionGroup(input: {
    name: string;
    slug: string;
    description?: string;
    field_type: OptionGroup['field_type'];
    input_type?: OptionGroup['input_type'];
  }): Promise<OptionGroup> {
    const { data, error } = await supabase
      .from('pc_option_groups')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('Failed to create option group:', error);
      if (error.message.includes('unique')) {
        throw new Error('An option group with this slug already exists');
      }
      throw new Error(`Failed to create option group: ${error.message}`);
    }

    return data as OptionGroup;
  }

  /**
   * Create a new option value
   */
  async createOptionValue(input: {
    option_group_id: string;
    value: string;
    sort_order?: number;
  }): Promise<OptionValue> {
    const { data, error } = await supabase
      .from('pc_option_values')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('Failed to create option value:', error);
      if (error.message.includes('unique')) {
        throw new Error('This value already exists for the option group');
      }
      throw new Error(`Failed to create option value: ${error.message}`);
    }

    return data as OptionValue;
  }

  /**
   * Link an option group to a model with configuration
   */
  async linkOptionToModel(input: {
    model_id: string;
    option_group_id: string;
    display_order?: number;
    display_group?: ModelOption['display_group'];
    grid_span?: number;
    placeholder?: string;
    help_text?: string;
    is_required?: boolean;
    is_multi_select?: boolean;
    is_manual_select?: boolean;
    is_visible?: boolean;
    default_value_id?: string;
    default_input_value?: string;
    min_value?: number;
    max_value?: number;
    step_value?: number;
    validation_pattern?: string;
  }): Promise<ModelOption> {
    const { data, error } = await supabase
      .from('pc_model_options')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('Failed to link option to model:', error);
      if (error.message.includes('unique')) {
        throw new Error('This option is already linked to the model');
      }
      throw new Error(`Failed to link option to model: ${error.message}`);
    }

    return data as ModelOption;
  }

  /**
   * Add allowed values to a model option
   */
  async addAllowedValues(
    modelOptionId: string,
    valueIds: string[],
    options?: { setDefault?: string }
  ): Promise<void> {
    const inserts = valueIds.map((valueId, index) => ({
      model_option_id: modelOptionId,
      option_value_id: valueId,
      sort_order: index,
      is_default: options?.setDefault === valueId,
    }));

    const { error } = await supabase
      .from('pc_model_allowed_values')
      .insert(inserts);

    if (error) {
      console.error('Failed to add allowed values:', error);
      throw new Error(`Failed to add allowed values: ${error.message}`);
    }
  }

  /**
   * Create a business rule for a model
   */
  async createRule(input: {
    model_id?: string;
    variant_id?: string;
    name: string;
    description?: string;
    priority?: number;
    condition: Record<string, any>;
    effect: Record<string, any>;
  }): Promise<ProductRule> {
    const { data, error } = await supabase
      .from('pc_rules')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('Failed to create rule:', error);
      throw new Error(`Failed to create rule: ${error.message}`);
    }

    return data as ProductRule;
  }

  /**
   * Update a model option configuration
   */
  async updateModelOption(
    modelOptionId: string,
    updates: Partial<Omit<ModelOption, 'id' | 'model_id' | 'option_group_id' | 'created_at'>>
  ): Promise<ModelOption> {
    const { data, error } = await supabase
      .from('pc_model_options')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', modelOptionId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update model option:', error);
      throw new Error(`Failed to update model option: ${error.message}`);
    }

    return data as ModelOption;
  }

  /**
   * Delete a model option (and its allowed values via cascade)
   */
  async deleteModelOption(modelOptionId: string): Promise<void> {
    const { error } = await supabase
      .from('pc_model_options')
      .delete()
      .eq('id', modelOptionId);

    if (error) {
      console.error('Failed to delete model option:', error);
      throw new Error(`Failed to delete model option: ${error.message}`);
    }
  }

  /**
   * Evaluate rules for given form values
   * Returns computed values and visibility states
   */
  evaluateRules(
    rules: RuleConfig[],
    formValues: Record<string, unknown>
  ): {
    computedValues: Record<string, unknown>;
    hiddenFields: string[];
    highlightedOptions: Record<string, string[]>;
  } {
    const result = {
      computedValues: {} as Record<string, unknown>,
      hiddenFields: [] as string[],
      highlightedOptions: {} as Record<string, string[]>,
    };

    // Sort rules by priority (higher first)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.evaluateCondition(rule.condition, formValues)) {
        this.applyEffect(rule.effect, result);
      }
    }

    return result;
  }

  /**
   * Evaluate a rule condition against form values
   */
  private evaluateCondition(
    condition: Record<string, unknown>,
    formValues: Record<string, unknown>
  ): boolean {
    const operator = condition.operator as string | undefined;

    if (operator === 'AND') {
      const conditions = condition.conditions as Record<string, unknown>[];
      return conditions.every((c) => this.evaluateSingleCondition(c, formValues));
    }

    if (operator === 'OR') {
      const conditions = condition.conditions as Record<string, unknown>[];
      return conditions.some((c) => this.evaluateSingleCondition(c, formValues));
    }

    // Single condition
    return this.evaluateSingleCondition(condition, formValues);
  }

  private evaluateSingleCondition(
    condition: Record<string, unknown>,
    formValues: Record<string, unknown>
  ): boolean {
    const field = condition.field as string;
    const comparator = condition.comparator as string;
    const expectedValue = condition.value;
    const actualValue = formValues[field];

    switch (comparator) {
      case 'eq':
        return actualValue === expectedValue;
      case 'neq':
        return actualValue !== expectedValue;
      case 'gt':
        return Number(actualValue) > Number(expectedValue);
      case 'gte':
        return Number(actualValue) >= Number(expectedValue);
      case 'lt':
        return Number(actualValue) < Number(expectedValue);
      case 'lte':
        return Number(actualValue) <= Number(expectedValue);
      case 'contains':
        if (Array.isArray(actualValue)) {
          return actualValue.includes(expectedValue);
        }
        return String(actualValue).includes(String(expectedValue));
      case 'in':
        if (Array.isArray(expectedValue)) {
          return expectedValue.includes(actualValue);
        }
        return false;
      default:
        return false;
    }
  }

  private applyEffect(
    effect: Record<string, unknown>,
    result: {
      computedValues: Record<string, unknown>;
      hiddenFields: string[];
      highlightedOptions: Record<string, string[]>;
    }
  ): void {
    // Set values
    const setValues = effect.set_value as Record<string, unknown> | undefined;
    if (setValues) {
      Object.assign(result.computedValues, setValues);
    }

    // Add values (for multi-select)
    const addValues = effect.add_value as Record<string, unknown[]> | undefined;
    if (addValues) {
      for (const [field, values] of Object.entries(addValues)) {
        const existing = result.computedValues[field];
        if (Array.isArray(existing)) {
          result.computedValues[field] = [...existing, ...values];
        } else {
          result.computedValues[field] = values;
        }
      }
    }

    // Hide options
    const hideOptions = effect.hide_options as string[] | undefined;
    if (hideOptions) {
      result.hiddenFields.push(...hideOptions);
    }

    // Highlight options
    const highlightOptions = effect.highlight_option as Record<string, string[]> | undefined;
    if (highlightOptions) {
      for (const [field, options] of Object.entries(highlightOptions)) {
        result.highlightedOptions[field] = [
          ...(result.highlightedOptions[field] || []),
          ...options,
        ];
      }
    }
  }
}

// Export singleton instance
export const productConfigurationService = new ProductConfigurationService();
