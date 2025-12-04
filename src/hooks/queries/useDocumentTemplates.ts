/**
 * React Query Hooks for Document Templates
 *
 * Server state management for document templates (Plate.js content).
 * Handles fetching, creating, and linking templates to forms.
 *
 * Usage:
 * ```typescript
 * const { data: templates } = useDocumentTemplates(organizationId);
 * const { data: formTemplates } = useFormDocumentTemplates(formId);
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface PageSettings {
  size: 'letter' | 'a4' | 'legal';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface DocumentTemplate {
  id: string;
  organization_id: string | null; // null = system template
  name: string;
  slug: string | null;
  description: string | null;
  content: any[]; // Plate.js/Slate JSON structure
  variables: string[]; // Available variables: ["client_name", "total_price"]
  page_settings: PageSettings;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormDocumentTemplate {
  form_id: string;
  document_template_id: string;
  is_default: boolean | null;
  created_at: string;
  document_template?: DocumentTemplate;
}

export interface CreateDocumentTemplateData {
  organization_id: string;
  name: string;
  slug?: string;
  description?: string;
  content?: any[];
  variables?: string[];
  page_settings?: Partial<PageSettings>;
  created_by: string;
}

export interface UpdateDocumentTemplateData {
  name?: string;
  slug?: string;
  description?: string;
  content?: any[];
  variables?: string[];
  page_settings?: Partial<PageSettings>;
  is_active?: boolean;
}

// ============================================================================
// Query Keys
// ============================================================================

export const documentTemplateQueryKeys = {
  all: ['documentTemplates'] as const,
  lists: () => [...documentTemplateQueryKeys.all, 'list'] as const,
  list: (organizationId?: string) => [...documentTemplateQueryKeys.lists(), organizationId] as const,
  details: () => [...documentTemplateQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentTemplateQueryKeys.details(), id] as const,
  formTemplates: (formId: string) => [...documentTemplateQueryKeys.all, 'form', formId] as const,
};

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Fetch all available document templates for an organization
 * Returns both system templates (org_id = null) and organization-specific templates
 */
async function fetchDocumentTemplates(organizationId?: string): Promise<DocumentTemplate[]> {
  let query = supabase
    .from('document_templates')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (organizationId) {
    query = query.or(`organization_id.is.null,organization_id.eq.${organizationId}`);
  } else {
    query = query.is('organization_id', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching document templates:', error);
    throw new Error(`Failed to fetch document templates: ${error.message}`);
  }

  return (data || []) as DocumentTemplate[];
}

/**
 * Fetch a single document template by ID
 */
async function fetchDocumentTemplateById(templateId: string): Promise<DocumentTemplate | null> {
  const { data, error } = await supabase
    .from('document_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching document template:', error);
    throw new Error(`Failed to fetch document template: ${error.message}`);
  }

  return data as DocumentTemplate;
}

/**
 * Create a new document template
 */
async function createDocumentTemplate(data: CreateDocumentTemplateData): Promise<DocumentTemplate> {
  const defaultPageSettings: PageSettings = {
    size: 'letter',
    orientation: 'portrait',
    margins: { top: 40, right: 40, bottom: 40, left: 40 },
  };

  const insertData = {
    organization_id: data.organization_id,
    name: data.name,
    slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
    description: data.description || null,
    content: data.content || [],
    variables: data.variables || [],
    page_settings: { ...defaultPageSettings, ...data.page_settings },
    created_by: data.created_by,
    is_active: true,
  };

  const { data: result, error } = await supabase
    .from('document_templates')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating document template:', error);
    throw new Error(`Failed to create document template: ${error.message}`);
  }

  return result as DocumentTemplate;
}

/**
 * Update a document template
 */
async function updateDocumentTemplate(
  templateId: string,
  updates: UpdateDocumentTemplateData
): Promise<DocumentTemplate> {
  const { data, error } = await supabase
    .from('document_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    console.error('Error updating document template:', error);
    throw new Error(`Failed to update document template: ${error.message}`);
  }

  return data as DocumentTemplate;
}

/**
 * Delete (soft delete) a document template
 */
async function deleteDocumentTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('document_templates')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting document template:', error);
    throw new Error(`Failed to delete document template: ${error.message}`);
  }
}

/**
 * Fetch document templates linked to a specific form
 */
async function fetchFormDocumentTemplates(formId: string): Promise<FormDocumentTemplate[]> {
  const { data, error } = await supabase
    .from('form_document_templates')
    .select(`
      *,
      document_template:document_templates(*)
    `)
    .eq('form_id', formId);

  if (error) {
    console.error('Error fetching form document templates:', error);
    throw new Error(`Failed to fetch form document templates: ${error.message}`);
  }

  return (data || []) as FormDocumentTemplate[];
}

/**
 * Link a document template to a form
 */
async function linkDocumentTemplateToForm(
  formId: string,
  documentTemplateId: string,
  isDefault: boolean = false
): Promise<FormDocumentTemplate> {
  // If setting as default, first unset any existing defaults
  if (isDefault) {
    await supabase
      .from('form_document_templates')
      .update({ is_default: false })
      .eq('form_id', formId)
      .eq('is_default', true);
  }

  const { data, error } = await supabase
    .from('form_document_templates')
    .insert({
      form_id: formId,
      document_template_id: documentTemplateId,
      is_default: isDefault,
    })
    .select(`
      *,
      document_template:document_templates(*)
    `)
    .single();

  if (error) {
    console.error('Error linking document template to form:', error);
    throw new Error(`Failed to link document template: ${error.message}`);
  }

  return data as FormDocumentTemplate;
}

/**
 * Unlink a document template from a form
 */
async function unlinkDocumentTemplateFromForm(
  formId: string,
  documentTemplateId: string
): Promise<void> {
  const { error } = await supabase
    .from('form_document_templates')
    .delete()
    .eq('form_id', formId)
    .eq('document_template_id', documentTemplateId);

  if (error) {
    console.error('Error unlinking document template from form:', error);
    throw new Error(`Failed to unlink document template: ${error.message}`);
  }
}

/**
 * Set a template as the default for a form
 */
async function setDefaultTemplate(formId: string, documentTemplateId: string): Promise<void> {
  // Unset all defaults for this form
  await supabase
    .from('form_document_templates')
    .update({ is_default: false })
    .eq('form_id', formId);

  // Set the new default
  const { error } = await supabase
    .from('form_document_templates')
    .update({ is_default: true })
    .eq('form_id', formId)
    .eq('document_template_id', documentTemplateId);

  if (error) {
    console.error('Error setting default template:', error);
    throw new Error(`Failed to set default template: ${error.message}`);
  }
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook: Fetch all available document templates
 */
export function useDocumentTemplates(organizationId?: string) {
  return useQuery({
    queryKey: documentTemplateQueryKeys.list(organizationId),
    queryFn: () => fetchDocumentTemplates(organizationId),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: Fetch a single document template by ID
 */
export function useDocumentTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: documentTemplateQueryKeys.detail(templateId || '__no_id__'),
    queryFn: () => {
      if (!templateId) return null;
      return fetchDocumentTemplateById(templateId);
    },
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: Fetch document templates linked to a specific form
 */
export function useFormDocumentTemplates(formId: string | undefined) {
  return useQuery({
    queryKey: documentTemplateQueryKeys.formTemplates(formId || '__no_id__'),
    queryFn: () => {
      if (!formId) return [];
      return fetchFormDocumentTemplates(formId);
    },
    enabled: !!formId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook: Create a new document template
 */
export function useCreateDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDocumentTemplate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: documentTemplateQueryKeys.list(data.organization_id || undefined),
      });
    },
  });
}

/**
 * Hook: Update a document template
 */
export function useUpdateDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      updates,
    }: {
      templateId: string;
      updates: UpdateDocumentTemplateData;
    }) => {
      return updateDocumentTemplate(templateId, updates);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: documentTemplateQueryKeys.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: documentTemplateQueryKeys.list(data.organization_id || undefined),
      });
    },
  });
}

/**
 * Hook: Delete a document template
 */
export function useDeleteDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDocumentTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: documentTemplateQueryKeys.lists(),
      });
    },
  });
}

/**
 * Hook: Link a document template to a form
 */
export function useLinkDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      formId,
      documentTemplateId,
      isDefault = false,
    }: {
      formId: string;
      documentTemplateId: string;
      isDefault?: boolean;
    }) => {
      return linkDocumentTemplateToForm(formId, documentTemplateId, isDefault);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: documentTemplateQueryKeys.formTemplates(variables.formId),
      });
    },
  });
}

/**
 * Hook: Unlink a document template from a form
 */
export function useUnlinkDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      formId,
      documentTemplateId,
    }: {
      formId: string;
      documentTemplateId: string;
    }) => {
      return unlinkDocumentTemplateFromForm(formId, documentTemplateId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: documentTemplateQueryKeys.formTemplates(variables.formId),
      });
    },
  });
}

/**
 * Hook: Set default template for a form
 */
export function useSetDefaultTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      formId,
      documentTemplateId,
    }: {
      formId: string;
      documentTemplateId: string;
    }) => {
      return setDefaultTemplate(formId, documentTemplateId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: documentTemplateQueryKeys.formTemplates(variables.formId),
      });
    },
  });
}
