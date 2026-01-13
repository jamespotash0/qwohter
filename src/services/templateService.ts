/**
 * Template Service - CRUD operations for form templates
 *
 * This service handles all template-related operations including:
 * - Fetching system templates
 * - Copying templates to organizations
 * - Managing template categories
 *
 * Auth: Uses centralized auth from @/auth (v3.0.0 compliant)
 */

import { supabase } from '@/integrations/supabase/client';
import * as authService from '@/auth/services/authService';
import type { Database } from '@/integrations/supabase/types';

type FormRow = Database['public']['Tables']['forms']['Row'];
type FormInsert = Database['public']['Tables']['forms']['Insert'];

export interface Template extends FormRow {
  is_template: true;
  organization_id: null;
}

export interface TemplateCategory {
  name: string;
  count: number;
  description?: string;
}

/**
 * Fetch all system templates
 * @param category - Optional category filter (uses form_type)
 * @returns List of system templates
 */
export async function fetchTemplates(category?: string): Promise<Template[]> {
  let query = supabase
    .from('forms')
    .select('*')
    .eq('is_template', true)
    .is('organization_id', null) // System templates only
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('form_type', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch templates:', error);
    throw new Error(`Failed to fetch templates: ${error.message}`);
  }

  return (data || []) as Template[];
}

/**
 * Fetch a single template by ID
 * @param templateId - Template ID
 * @returns Template data
 */
export async function fetchTemplateById(templateId: string): Promise<Template | null> {
  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('id', templateId)
    .eq('is_template', true)
    .is('organization_id', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Failed to fetch template:', error);
    throw new Error(`Failed to fetch template: ${error.message}`);
  }

  return data as Template;
}

/**
 * Get all available template categories with counts
 * Uses form_type as the category
 * @returns List of categories with template counts
 */
export async function fetchTemplateCategories(): Promise<TemplateCategory[]> {
  const { data, error } = await supabase
    .from('forms')
    .select('form_type')
    .eq('is_template', true)
    .is('organization_id', null);

  if (error) {
    console.error('Failed to fetch template categories:', error);
    throw new Error(`Failed to fetch template categories: ${error.message}`);
  }

  // Aggregate categories and count
  const categoryMap = new Map<string, number>();
  (data as Array<{ form_type: string }>)?.forEach((row) => {
    if (row.form_type) {
      categoryMap.set(
        row.form_type,
        (categoryMap.get(row.form_type) || 0) + 1
      );
    }
  });

  return Array.from(categoryMap.entries()).map(([name, count]) => ({
    name,
    count,
  }));
}

export interface CopyTemplateParams {
  templateId: string;
  organizationId: string;
  customName?: string;
  customDescription?: string;
}

/**
 * Copy a template to an organization
 * Creates a new form based on the template structure
 *
 * @param params - Copy parameters
 * @returns The newly created form
 */
export async function copyTemplateToOrganization(
  params: CopyTemplateParams
): Promise<FormRow> {
  const session = await authService.getSession();
  if (!session?.user) {
    throw new Error('Not authenticated');
  }

  // Fetch the template
  const template = await fetchTemplateById(params.templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  // Create new form based on template
  const newFormData: FormInsert = {
    organization_id: params.organizationId,
    created_by: session.user.id,
    name: params.customName || template.name,
    description: params.customDescription || template.description,
    document_type: template.document_type,
    metadata: template.metadata,
    is_archived: false,
    is_default: false,
    is_template: false, // Regular form, not a template
    copied_from_form_id: template.id,
  };

  const { data, error } = await supabase
    .from('forms')
    .insert(newFormData as any)
    .select()
    .single();

  if (error) {
    console.error('Failed to copy template:', error);
    throw new Error(`Failed to copy template: ${error.message}`);
  }

  return data;
}

/**
 * Check if a form was copied from a template
 * @param formId - Form ID
 * @returns Template info if form was copied from template
 */
export async function getFormTemplateLineage(formId: string): Promise<{
  isFromTemplate: boolean;
  template?: Template;
}> {
  const { data: form, error } = await supabase
    .from('forms')
    .select('copied_from_form_id')
    .eq('id', formId)
    .single();

  const typedForm = form as { copied_from_form_id: string | null } | null;

  if (error || !typedForm?.copied_from_form_id) {
    return { isFromTemplate: false };
  }

  const template = await fetchTemplateById(typedForm.copied_from_form_id);

  return {
    isFromTemplate: true,
    template: template || undefined,
  };
}

/**
 * Search templates by name or description
 * @param searchQuery - Search term
 * @param category - Optional category filter (uses form_type)
 * @returns Matching templates
 */
export async function searchTemplates(
  searchQuery: string,
  category?: string
): Promise<Template[]> {
  let query = supabase
    .from('forms')
    .select('*')
    .eq('is_template', true)
    .is('organization_id', null)
    .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('form_type', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to search templates:', error);
    throw new Error(`Failed to search templates: ${error.message}`);
  }

  return (data || []) as Template[];
}
