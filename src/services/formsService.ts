/**
 * Forms Service
 * Handles all form definition operations with the database
 *
 * This service follows the architecture pattern from quotesService
 * with proper separation of concerns and error handling
 */

import { supabase } from '@/integrations/supabase/client';
import type { FormDefinition, FormTab } from '@/stores/forms/formsStore';

// Export types for use in other files
export type { FormDefinition, FormTab, FormField } from '@/stores/forms/formsStore';

/**
 * Fetch all forms for an organization
 */
export async function fetchForms(organizationId: string): Promise<FormDefinition[]> {
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }

  const { data, error } = await supabase
    .from('form_definitions')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching forms:', error);
    throw new Error(`Failed to fetch forms: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch a single form by ID
 */
export async function fetchFormById(formId: string): Promise<FormDefinition> {
  if (!formId) {
    throw new Error('Form ID is required');
  }

  const { data, error } = await supabase
    .from('form_definitions')
    .select('*')
    .eq('id', formId)
    .single();

  if (error) {
    console.error('Error fetching form:', error);
    throw new Error(`Failed to fetch form: ${error.message}`);
  }

  if (!data) {
    throw new Error('Form not found');
  }

  return data;
}

/**
 * Create a new form
 */
export async function createForm(
  form: Omit<FormDefinition, 'id' | 'created_at' | 'updated_at'>
): Promise<FormDefinition> {
  // Validate required fields
  if (!form.organization_id) {
    throw new Error('Organization ID is required');
  }
  if (!form.name || !form.name.trim()) {
    throw new Error('Form name is required');
  }
  if (!form.created_by) {
    throw new Error('Creator user ID is required');
  }

  const { data, error } = await (supabase
    .from('form_definitions') as any)
    .insert([form])
    .select()
    .single();

  if (error) {
    console.error('Error creating form:', error);
    throw new Error(`Failed to create form: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to create form: No data returned');
  }

  return data;
}

/**
 * Update an existing form
 */
export async function updateForm(
  formId: string,
  updates: Partial<FormDefinition>
): Promise<FormDefinition> {
  if (!formId) {
    throw new Error('Form ID is required');
  }

  // Remove fields that shouldn't be updated directly
  const { id, created_at, created_by, ...allowedUpdates } = updates as any;

  const { data, error } = await (supabase
    .from('form_definitions') as any)
    .update({ ...allowedUpdates, updated_at: new Date().toISOString() })
    .eq('id', formId)
    .select()
    .single();

  if (error) {
    console.error('Error updating form:', error);
    throw new Error(`Failed to update form: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to update form: No data returned');
  }

  return data;
}

/**
 * Delete a form (soft delete by setting is_active to false)
 */
export async function deleteForm(formId: string): Promise<void> {
  if (!formId) {
    throw new Error('Form ID is required');
  }

  const { error } = await (supabase
    .from('form_definitions') as any)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', formId);

  if (error) {
    console.error('Error deleting form:', error);
    throw new Error(`Failed to delete form: ${error.message}`);
  }
}

/**
 * Copy/duplicate a form
 */
export async function copyForm(formId: string, newName: string): Promise<FormDefinition> {
  if (!formId) {
    throw new Error('Form ID is required');
  }
  if (!newName || !newName.trim()) {
    throw new Error('New form name is required');
  }

  // Fetch original form
  const original = await fetchFormById(formId);

  // Create copy (exclude id, timestamps, and is_default)
  const { id, created_at, updated_at, is_default, ...formData } = original;
  const copy = {
    ...formData,
    name: newName.trim(),
    is_default: false, // Don't copy default status
  };

  // Create the new form
  return createForm(copy);
}

/**
 * Get the default form for an organization
 */
export async function getDefaultForm(organizationId: string): Promise<FormDefinition | null> {
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }

  const { data, error } = await supabase
    .from('form_definitions')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .eq('is_default', true)
    .single();

  if (error) {
    // Not finding a default form is not an error
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching default form:', error);
    throw new Error(`Failed to fetch default form: ${error.message}`);
  }

  return data;
}

/**
 * Set a form as the default for an organization
 * This will unset any existing default form
 */
export async function setDefaultForm(
  formId: string,
  organizationId: string
): Promise<FormDefinition> {
  if (!formId) {
    throw new Error('Form ID is required');
  }
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }

  // First, unset all other forms as default in this organization
  const { error: unsetError } = await (supabase
    .from('form_definitions') as any)
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('is_default', true)
    .neq('id', formId);

  if (unsetError) {
    console.error('Error unsetting default forms:', unsetError);
    throw new Error(`Failed to unset default forms: ${unsetError.message}`);
  }

  // Then set this form as default
  return updateForm(formId, { is_default: true });
}

/**
 * Unset a form as default
 */
export async function unsetDefaultForm(formId: string): Promise<FormDefinition> {
  if (!formId) {
    throw new Error('Form ID is required');
  }

  return updateForm(formId, { is_default: false });
}
