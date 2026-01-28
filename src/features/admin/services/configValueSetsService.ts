/**
 * Config Value Sets Service
 * CRUD operations for shared value libraries (config_value_sets table)
 *
 * These value sets are referenced by config_schema via the values_ref property.
 * Example: finish_color value set contains all color options with categories
 * for cascading by finish_style.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ConfigValueSet,
  ValueOption,
  CreateValueSetInput,
  UpdateValueSetInput,
  ValueSetFilters,
  ValueSetListItem,
} from '@/lib/types/configValueSet';

// ============================================================================
// Service Class
// ============================================================================

class ConfigValueSetsService {
  // ==========================================================================
  // List & Query
  // ==========================================================================

  /**
   * Get all value sets with optional filtering
   */
  async getValueSets(filters?: ValueSetFilters): Promise<ConfigValueSet[]> {
    let query = supabase.from('config_value_sets').select('*').order('name');

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.manufacturer_id !== undefined) {
      if (filters.manufacturer_id === null) {
        query = query.is('manufacturer_id', null);
      } else {
        query = query.eq('manufacturer_id', filters.manufacturer_id);
      }
    }

    if (filters?.search) {
      query = query.or(
        `slug.ilike.%${filters.search}%,name.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch value sets: ${error.message}`);
    }

    return (data || []) as ConfigValueSet[];
  }

  /**
   * Get value sets as list items (minimal fields for list views)
   */
  async getValueSetsList(filters?: ValueSetFilters): Promise<ValueSetListItem[]> {
    const sets = await this.getValueSets(filters);

    return sets.map((set) => ({
      id: set.id,
      slug: set.slug,
      name: set.name,
      category: set.category ?? null,
      manufacturer_id: set.manufacturer_id ?? null,
      value_count: Array.isArray(set.values) ? set.values.length : 0,
      created_at: set.created_at,
      updated_at: set.updated_at,
    }));
  }

  // ==========================================================================
  // Single Value Set Operations
  // ==========================================================================

  /**
   * Get a value set by ID
   */
  async getValueSet(id: string): Promise<ConfigValueSet | null> {
    const { data, error } = await supabase
      .from('config_value_sets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch value set: ${error.message}`);
    }

    return data as ConfigValueSet;
  }

  /**
   * Get a value set by slug
   */
  async getValueSetBySlug(slug: string): Promise<ConfigValueSet | null> {
    const { data, error } = await supabase
      .from('config_value_sets')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch value set: ${error.message}`);
    }

    return data as ConfigValueSet;
  }

  /**
   * Get multiple value sets by slugs (for batch fetching)
   */
  async getValueSetsBySlugs(slugs: string[]): Promise<ConfigValueSet[]> {
    if (slugs.length === 0) return [];

    const { data, error } = await supabase
      .from('config_value_sets')
      .select('*')
      .in('slug', slugs);

    if (error) {
      throw new Error(`Failed to fetch value sets: ${error.message}`);
    }

    return (data || []) as ConfigValueSet[];
  }

  // ==========================================================================
  // Create & Update
  // ==========================================================================

  /**
   * Create a new value set
   */
  async createValueSet(input: CreateValueSetInput): Promise<ConfigValueSet> {
    const { data, error } = await supabase
      .from('config_value_sets')
      .insert({
        slug: input.slug,
        name: input.name,
        category: input.category || null,
        manufacturer_id: input.manufacturer_id || null,
        values: input.values || [],
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        throw new Error(`A value set with slug "${input.slug}" already exists`);
      }
      throw new Error(`Failed to create value set: ${error.message}`);
    }

    return data as ConfigValueSet;
  }

  /**
   * Update an existing value set
   */
  async updateValueSet(
    id: string,
    updates: UpdateValueSetInput
  ): Promise<ConfigValueSet> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.slug !== undefined) updateData.slug = updates.slug;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.manufacturer_id !== undefined)
      updateData.manufacturer_id = updates.manufacturer_id;
    if (updates.values !== undefined) updateData.values = updates.values;

    const { data, error } = await supabase
      .from('config_value_sets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        throw new Error(`A value set with this slug already exists`);
      }
      throw new Error(`Failed to update value set: ${error.message}`);
    }

    return data as ConfigValueSet;
  }

  /**
   * Delete a value set
   */
  async deleteValueSet(id: string): Promise<void> {
    const { error } = await supabase
      .from('config_value_sets')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete value set: ${error.message}`);
    }
  }

  // ==========================================================================
  // Value Operations (within a value set)
  // ==========================================================================

  /**
   * Add values to a value set
   */
  async addValues(
    id: string,
    newValues: ValueOption[]
  ): Promise<ConfigValueSet> {
    // Get current values
    const valueSet = await this.getValueSet(id);
    if (!valueSet) {
      throw new Error('Value set not found');
    }

    const currentValues = valueSet.values || [];
    const existingCodes = new Set(currentValues.map((v) => v.code));

    // Filter out duplicates and add new values
    const valuesToAdd = newValues.filter((v) => !existingCodes.has(v.code));
    const updatedValues = [...currentValues, ...valuesToAdd];

    return this.updateValueSet(id, { values: updatedValues });
  }

  /**
   * Update a single value within a value set
   */
  async updateValue(
    id: string,
    code: string,
    updates: Partial<ValueOption>
  ): Promise<ConfigValueSet> {
    const valueSet = await this.getValueSet(id);
    if (!valueSet) {
      throw new Error('Value set not found');
    }

    const updatedValues = valueSet.values.map((v) =>
      v.code === code ? { ...v, ...updates } : v
    );

    return this.updateValueSet(id, { values: updatedValues });
  }

  /**
   * Remove a value from a value set
   */
  async removeValue(id: string, code: string): Promise<ConfigValueSet> {
    const valueSet = await this.getValueSet(id);
    if (!valueSet) {
      throw new Error('Value set not found');
    }

    const updatedValues = valueSet.values.filter((v) => v.code !== code);

    return this.updateValueSet(id, { values: updatedValues });
  }

  /**
   * Reorder values within a value set
   */
  async reorderValues(id: string, orderedCodes: string[]): Promise<ConfigValueSet> {
    const valueSet = await this.getValueSet(id);
    if (!valueSet) {
      throw new Error('Value set not found');
    }

    // Create a map of code -> value
    const valueMap = new Map(valueSet.values.map((v) => [v.code, v]));

    // Reorder based on the provided order
    const reorderedValues: ValueOption[] = [];
    orderedCodes.forEach((code, index) => {
      const value = valueMap.get(code);
      if (value) {
        reorderedValues.push({ ...value, sort_order: index });
      }
    });

    // Add any values not in the ordered list at the end
    const orderedSet = new Set(orderedCodes);
    const remainingValues: ValueOption[] = valueSet.values
      .filter((v) => !orderedSet.has(v.code))
      .map((v, index) => ({
        ...v,
        sort_order: reorderedValues.length + index,
      }));

    return this.updateValueSet(id, {
      values: [...reorderedValues, ...remainingValues],
    });
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get distinct categories from all value sets
   */
  async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('config_value_sets')
      .select('category')
      .not('category', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    const categories = new Set(
      (data || []).map((d) => d.category).filter(Boolean)
    );
    return Array.from(categories).sort();
  }

  /**
   * Check if a slug is available
   */
  async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
    let query = supabase
      .from('config_value_sets')
      .select('id')
      .eq('slug', slug);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to check slug: ${error.message}`);
    }

    return (data || []).length === 0;
  }

  /**
   * Get values filtered by category (for cascading)
   * Useful for filtering finish_color by finish_style category
   */
  async getValuesByCategory(
    slug: string,
    category: string
  ): Promise<ValueOption[]> {
    const valueSet = await this.getValueSetBySlug(slug);
    if (!valueSet) {
      return [];
    }

    return valueSet.values.filter((v) => v.category === category);
  }
}

// Export singleton instance
export const configValueSetsService = new ConfigValueSetsService();
