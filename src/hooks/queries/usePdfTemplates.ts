/**
 * React Query Hooks for PDF Templates
 *
 * Server state management for PDF rendering templates.
 * Handles fetching templates available for forms and proposals.
 *
 * Usage:
 * ```typescript
 * const { data: templates } = usePdfTemplates();
 * const { data: formTemplates } = useFormPdfTemplates(formId);
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface PdfTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  organization_id: string | null; // null = system template
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormPdfTemplate {
  form_id: string;
  pdf_template_id: string;
  is_default: boolean | null;
  pdf_template?: PdfTemplate;
}

// ============================================================================
// Query Keys
// ============================================================================

export const pdfTemplateQueryKeys = {
  all: ['pdfTemplates'] as const,
  lists: () => [...pdfTemplateQueryKeys.all, 'list'] as const,
  list: (organizationId?: string) => [...pdfTemplateQueryKeys.lists(), organizationId] as const,
  details: () => [...pdfTemplateQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...pdfTemplateQueryKeys.details(), id] as const,
  formTemplates: (formId: string) => [...pdfTemplateQueryKeys.all, 'form', formId] as const,
};

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Fetch all available PDF templates for an organization
 * Returns both system templates and organization-specific templates
 */
async function fetchPdfTemplates(organizationId?: string): Promise<PdfTemplate[]> {
  let query = supabase
    .from('pdf_templates')
    .select('*')
    .eq('is_active', true)
    .order('name');

  // If org ID is provided, fetch system templates OR org templates
  // RLS will handle this automatically based on policies
  if (organizationId) {
    query = query.or(`organization_id.is.null,organization_id.eq.${organizationId}`);
  } else {
    // Only fetch system templates if no org ID
    query = query.is('organization_id', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching PDF templates:', error);
    throw new Error(`Failed to fetch PDF templates: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch a single PDF template by ID
 */
async function fetchPdfTemplateById(templateId: string): Promise<PdfTemplate | null> {
  const { data, error } = await supabase
    .from('pdf_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching PDF template:', error);
    throw new Error(`Failed to fetch PDF template: ${error.message}`);
  }

  return data;
}

/**
 * Fetch PDF templates linked to a specific form
 */
async function fetchFormPdfTemplates(formId: string): Promise<FormPdfTemplate[]> {
  const { data, error } = await supabase
    .from('form_pdf_templates')
    .select(`
      *,
      pdf_template:pdf_templates(*)
    `)
    .eq('form_id', formId);

  if (error) {
    console.error('Error fetching form PDF templates:', error);
    throw new Error(`Failed to fetch form PDF templates: ${error.message}`);
  }

  return data || [];
}

/**
 * Link a PDF template to a form
 */
async function linkPdfTemplateToForm(
  formId: string,
  pdfTemplateId: string,
  isDefault: boolean = false
): Promise<FormPdfTemplate> {
  // If setting as default, first unset any existing defaults
  if (isDefault) {
    await supabase
      .from('form_pdf_templates')
      .update({ is_default: false })
      .eq('form_id', formId)
      .eq('is_default', true);
  }

  const { data, error } = await supabase
    .from('form_pdf_templates')
    .insert({
      form_id: formId,
      pdf_template_id: pdfTemplateId,
      is_default: isDefault,
    })
    .select(`
      *,
      pdf_template:pdf_templates(*)
    `)
    .single();

  if (error) {
    console.error('Error linking PDF template to form:', error);
    throw new Error(`Failed to link PDF template: ${error.message}`);
  }

  return data;
}

/**
 * Unlink a PDF template from a form
 */
async function unlinkPdfTemplateFromForm(
  formId: string,
  pdfTemplateId: string
): Promise<void> {
  const { error } = await supabase
    .from('form_pdf_templates')
    .delete()
    .eq('form_id', formId)
    .eq('pdf_template_id', pdfTemplateId);

  if (error) {
    console.error('Error unlinking PDF template from form:', error);
    throw new Error(`Failed to unlink PDF template: ${error.message}`);
  }
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook: Fetch all available PDF templates
 * Returns system templates + organization-specific templates
 */
export function usePdfTemplates(organizationId?: string) {
  return useQuery({
    queryKey: pdfTemplateQueryKeys.list(organizationId),
    queryFn: () => fetchPdfTemplates(organizationId),
    staleTime: 10 * 60 * 1000, // Templates don't change often
  });
}

/**
 * Hook: Fetch a single PDF template by ID
 */
export function usePdfTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: pdfTemplateQueryKeys.detail(templateId || '__no_id__'),
    queryFn: () => {
      if (!templateId) return null;
      return fetchPdfTemplateById(templateId);
    },
    enabled: !!templateId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook: Fetch PDF templates linked to a specific form
 */
export function useFormPdfTemplates(formId: string | undefined) {
  return useQuery({
    queryKey: pdfTemplateQueryKeys.formTemplates(formId || '__no_id__'),
    queryFn: () => {
      if (!formId) return [];
      return fetchFormPdfTemplates(formId);
    },
    enabled: !!formId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook: Link a PDF template to a form
 */
export function useLinkPdfTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      formId,
      pdfTemplateId,
      isDefault = false,
    }: {
      formId: string;
      pdfTemplateId: string;
      isDefault?: boolean;
    }) => {
      return linkPdfTemplateToForm(formId, pdfTemplateId, isDefault);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: pdfTemplateQueryKeys.formTemplates(variables.formId),
      });
    },
  });
}

/**
 * Hook: Unlink a PDF template from a form
 */
export function useUnlinkPdfTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      formId,
      pdfTemplateId,
    }: {
      formId: string;
      pdfTemplateId: string;
    }) => {
      return unlinkPdfTemplateFromForm(formId, pdfTemplateId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: pdfTemplateQueryKeys.formTemplates(variables.formId),
      });
    },
  });
}
