/**
 * Option Admin Service
 * CRUD operations for option groups, values, and model configurations
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
  // Joined data
  option_group?: OptionGroup;
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

// ============================================================================
// Service Class
// ============================================================================

class OptionAdminService {
  // ==========================================================================
  // Option Groups
  // ==========================================================================

  async getOptionGroups(): Promise<OptionGroup[]> {
    const { data, error } = await supabase
      .from('pc_option_groups')
      .select('*')
      .order('name');

    if (error) throw new Error(`Failed to fetch option groups: ${error.message}`);
    return data || [];
  }

  async getOptionGroup(id: string): Promise<OptionGroup | null> {
    const { data, error } = await supabase
      .from('pc_option_groups')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch option group: ${error.message}`);
    }
    return data;
  }

  async getOptionGroupBySlug(slug: string): Promise<OptionGroup | null> {
    const { data, error } = await supabase
      .from('pc_option_groups')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch option group: ${error.message}`);
    }
    return data;
  }

  async createOptionGroup(input: {
    name: string;
    slug: string;
    description?: string | null;
    field_type: OptionGroup['field_type'];
    input_type?: OptionGroup['input_type'];
  }): Promise<OptionGroup> {
    const { data, error } = await supabase
      .from('pc_option_groups')
      .insert(input)
      .select()
      .single();

    if (error) {
      if (error.message.includes('unique')) {
        throw new Error('An option group with this slug already exists');
      }
      throw new Error(`Failed to create option group: ${error.message}`);
    }
    return data;
  }

  async updateOptionGroup(
    id: string,
    updates: Partial<Omit<OptionGroup, 'id' | 'created_at'>>
  ): Promise<OptionGroup> {
    const { data, error } = await supabase
      .from('pc_option_groups')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update option group: ${error.message}`);
    return data;
  }

  async deleteOptionGroup(id: string): Promise<void> {
    const { error } = await supabase
      .from('pc_option_groups')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete option group: ${error.message}`);
  }

  // ==========================================================================
  // Option Values
  // ==========================================================================

  async getOptionValues(optionGroupId: string): Promise<OptionValue[]> {
    const { data, error } = await supabase
      .from('pc_option_values')
      .select('*')
      .eq('option_group_id', optionGroupId)
      .order('sort_order');

    if (error) throw new Error(`Failed to fetch option values: ${error.message}`);
    return data || [];
  }

  async createOptionValue(input: {
    option_group_id: string;
    value: string;
    sort_order?: number;
    is_active?: boolean;
  }): Promise<OptionValue> {
    const { data, error } = await supabase
      .from('pc_option_values')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(`Failed to create option value: ${error.message}`);
    return data;
  }

  async updateOptionValue(
    id: string,
    updates: { value?: string; sort_order?: number; is_active?: boolean }
  ): Promise<OptionValue> {
    const { data, error } = await supabase
      .from('pc_option_values')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update option value: ${error.message}`);
    return data;
  }

  async deleteOptionValue(id: string): Promise<void> {
    const { error } = await supabase
      .from('pc_option_values')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete option value: ${error.message}`);
  }

  async reorderOptionValues(optionGroupId: string, orderedIds: string[]): Promise<void> {
    // Update sort_order for each value
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('pc_option_values')
        .update({ sort_order: index })
        .eq('id', id)
    );

    const results = await Promise.all(updates);
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      throw new Error('Failed to reorder option values');
    }
  }

  /**
   * Bulk create option values
   * Creates multiple values at once with auto-incrementing sort order
   */
  async bulkCreateOptionValues(
    optionGroupId: string,
    values: string[],
    startingSortOrder: number = 0
  ): Promise<{ created: number; skipped: number }> {
    // Filter out empty values and duplicates
    const uniqueValues = [...new Set(values.map((v) => v.trim()).filter(Boolean))];

    if (uniqueValues.length === 0) {
      return { created: 0, skipped: 0 };
    }

    // Get existing values to avoid duplicates
    const { data: existing } = await supabase
      .from('pc_option_values')
      .select('value')
      .eq('option_group_id', optionGroupId);

    const existingSet = new Set((existing || []).map((e) => e.value.toLowerCase()));
    const newValues = uniqueValues.filter((v) => !existingSet.has(v.toLowerCase()));
    const skipped = uniqueValues.length - newValues.length;

    if (newValues.length === 0) {
      return { created: 0, skipped };
    }

    // Create insert records
    const inserts = newValues.map((value, index) => ({
      option_group_id: optionGroupId,
      value,
      sort_order: startingSortOrder + index,
      is_active: true,
    }));

    const { error } = await supabase.from('pc_option_values').insert(inserts);

    if (error) throw new Error(`Failed to bulk create values: ${error.message}`);

    return { created: newValues.length, skipped };
  }

  // ==========================================================================
  // Model Options (linking options to models)
  // ==========================================================================

  async getModelOptions(modelId: string): Promise<ModelOption[]> {
    const { data, error } = await supabase
      .from('pc_model_options')
      .select(`
        *,
        option_group:pc_option_groups(*)
      `)
      .eq('model_id', modelId)
      .order('display_order');

    if (error) throw new Error(`Failed to fetch model options: ${error.message}`);
    return data || [];
  }

  async createModelOption(input: {
    model_id: string;
    option_group_id: string;
    display_order?: number;
    display_group?: ModelOption['display_group'];
    grid_span?: number;
    placeholder?: string | null;
    help_text?: string | null;
    is_required?: boolean;
    is_multi_select?: boolean;
    is_manual_select?: boolean;
    is_visible?: boolean;
    default_value_id?: string | null;
    default_input_value?: string | null;
    min_value?: number | null;
    max_value?: number | null;
    step_value?: number | null;
  }): Promise<ModelOption> {
    const { data, error } = await supabase
      .from('pc_model_options')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(`Failed to create model option: ${error.message}`);
    return data;
  }

  async updateModelOption(
    id: string,
    updates: Partial<Omit<ModelOption, 'id' | 'model_id' | 'option_group_id' | 'created_at'>>
  ): Promise<ModelOption> {
    const { data, error } = await supabase
      .from('pc_model_options')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update model option: ${error.message}`);
    return data;
  }

  async deleteModelOption(id: string): Promise<void> {
    const { error } = await supabase
      .from('pc_model_options')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete model option: ${error.message}`);
  }

  // ==========================================================================
  // Model Allowed Values
  // ==========================================================================

  async getModelAllowedValues(modelOptionId: string): Promise<ModelAllowedValue[]> {
    const { data, error } = await supabase
      .from('pc_model_allowed_values')
      .select('*')
      .eq('model_option_id', modelOptionId)
      .order('sort_order');

    if (error) throw new Error(`Failed to fetch allowed values: ${error.message}`);
    return data || [];
  }

  async setModelAllowedValues(
    modelOptionId: string,
    valueIds: string[],
    defaultValueId?: string
  ): Promise<void> {
    // Delete existing allowed values
    const { error: deleteError } = await supabase
      .from('pc_model_allowed_values')
      .delete()
      .eq('model_option_id', modelOptionId);

    if (deleteError) throw new Error(`Failed to clear allowed values: ${deleteError.message}`);

    // Insert new allowed values
    if (valueIds.length > 0) {
      const inserts = valueIds.map((valueId, index) => ({
        model_option_id: modelOptionId,
        option_value_id: valueId,
        sort_order: index,
        is_default: valueId === defaultValueId,
      }));

      const { error: insertError } = await supabase
        .from('pc_model_allowed_values')
        .insert(inserts);

      if (insertError) throw new Error(`Failed to set allowed values: ${insertError.message}`);
    }
  }

  // ==========================================================================
  // Business Rules
  // ==========================================================================

  async getRules(modelId?: string): Promise<ProductRule[]> {
    let query = supabase
      .from('pc_rules')
      .select('*')
      .order('priority', { ascending: false });

    if (modelId) {
      query = query.eq('model_id', modelId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch rules: ${error.message}`);
    return data || [];
  }

  async createRule(input: {
    model_id?: string | null;
    variant_id?: string | null;
    name: string;
    description?: string | null;
    priority?: number;
    is_active?: boolean;
    condition: Record<string, any>;
    effect: Record<string, any>;
  }): Promise<ProductRule> {
    const { data, error } = await supabase
      .from('pc_rules')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(`Failed to create rule: ${error.message}`);
    return data;
  }

  async updateRule(
    id: string,
    updates: Partial<Omit<ProductRule, 'id' | 'created_at'>>
  ): Promise<ProductRule> {
    const { data, error } = await supabase
      .from('pc_rules')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update rule: ${error.message}`);
    return data;
  }

  async deleteRule(id: string): Promise<void> {
    const { error } = await supabase.from('pc_rules').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete rule: ${error.message}`);
  }
}

// Export singleton instance
export const optionAdminService = new OptionAdminService();
