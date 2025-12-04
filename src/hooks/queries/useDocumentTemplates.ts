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
import { useRealtimeSubscription } from '@/lib/realtimeSubscriptions';

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
  is_default: boolean; // Default template for the organization
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormDocumentTemplate {
  form_id: string;
  document_template_id: string;
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
  templateForms: (templateId: string) => [...documentTemplateQueryKeys.all, 'templateForms', templateId] as const,
  formTemplateCounts: (organizationId: string) => [...documentTemplateQueryKeys.all, 'formCounts', organizationId] as const,
};

// ============================================================================
// Service Functions
// ============================================================================

/**
 * DEBUG: Fetch ALL templates without filters to see raw DB state
 * Call this from browser console: window.debugFetchAllTemplates()
 */
async function debugFetchAllTemplates(organizationId?: string): Promise<void> {
  console.log('=== DEBUG: Fetching ALL templates (no filters) ===');

  // Query 1: All templates for this org (including inactive)
  const query1 = supabase.from('document_templates').select('*');
  if (organizationId) {
    query1.or(`organization_id.is.null,organization_id.eq.${organizationId}`);
  }
  const { data: allData, error: allError } = await query1;

  console.log('ALL templates (including is_active=false):', {
    count: allData?.length ?? 0,
    error: allError,
    templates: allData?.map((t: any) => ({
      id: t.id,
      name: t.name,
      org_id: t.organization_id,
      is_active: t.is_active,
      created_at: t.created_at,
    })),
  });

  // Query 2: Only active templates
  const query2 = supabase.from('document_templates').select('*').eq('is_active', true);
  if (organizationId) {
    query2.or(`organization_id.is.null,organization_id.eq.${organizationId}`);
  }
  const { data: activeData, error: activeError } = await query2;

  console.log('ACTIVE templates only (is_active=true):', {
    count: activeData?.length ?? 0,
    error: activeError,
    templates: activeData?.map((t: any) => ({
      id: t.id,
      name: t.name,
      org_id: t.organization_id,
      is_active: t.is_active,
    })),
  });

  console.log('=== END DEBUG ===');
}

// Expose debug functions globally for browser console access
if (typeof window !== 'undefined') {
  (window as any).debugFetchAllTemplates = debugFetchAllTemplates;

  // Debug helper to check realtime connection status
  (window as any).debugRealtimeStatus = () => {
    const channels = (supabase as any).realtime?.channels || [];
    console.log('=== REALTIME CHANNELS ===');
    console.log('Channel count:', channels.length);
    channels.forEach((ch: any) => {
      console.log(`  - ${ch.topic}: ${ch.state}`);
    });
  };
}

/**
 * Fetch all available document templates for an organization
 * Returns both system templates (org_id = null) and organization-specific templates
 */
async function fetchDocumentTemplates(organizationId?: string): Promise<DocumentTemplate[]> {
  console.log('[fetchDocumentTemplates] Starting fetch with organizationId:', organizationId);

  // No is_active filter - we use hard deletes now
  let query = supabase
    .from('document_templates')
    .select('*')
    .order('name');

  if (organizationId) {
    query = query.or(`organization_id.is.null,organization_id.eq.${organizationId}`);
  } else {
    query = query.is('organization_id', null);
  }

  const { data, error, status, statusText } = await query;

  console.log('[fetchDocumentTemplates] Response:', {
    dataCount: data?.length ?? 0,
    error,
    status,
    statusText,
    organizationId,
    templates: data?.map((t: any) => ({ id: t.id, name: t.name, org_id: t.organization_id })),
  });

  if (error) {
    console.error('[fetchDocumentTemplates] Error:', error);
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
    is_default: false,
  };

  // Using type assertion because document_templates table types are not generated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = supabase.from('document_templates') as any;
  const { data: result, error } = await query
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
  console.log('[updateDocumentTemplate] Starting update for templateId:', templateId, 'updates:', updates);

  // Using type assertion because document_templates table types are not generated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = supabase.from('document_templates') as any;
  const { data, error, status } = await query
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .select()
    .single();

  console.log('[updateDocumentTemplate] Response:', { data, error, status });

  if (error) {
    console.error('[updateDocumentTemplate] Error:', error);
    throw new Error(`Failed to update document template: ${error.message}`);
  }

  if (!data) {
    console.error('[updateDocumentTemplate] No data returned - RLS may have blocked the update');
    throw new Error('Template not found or you do not have permission to update it');
  }

  console.log('[updateDocumentTemplate] Success');
  return data as DocumentTemplate;
}

/**
 * Delete a document template (hard delete - removes from DB)
 * Returns the deleted template to verify the operation succeeded
 */
async function deleteDocumentTemplate(templateId: string): Promise<DocumentTemplate> {
  console.log('[deleteDocumentTemplate] Starting HARD DELETE for templateId:', templateId);

  // Using type assertion because document_templates table types are not generated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = supabase.from('document_templates') as any;

  // Hard delete - actually remove the row from the database
  const { data, error, status, statusText } = await query
    .delete()
    .eq('id', templateId)
    .select()
    .single();

  console.log('[deleteDocumentTemplate] Response:', { data, error, status, statusText });

  if (error) {
    console.error('[deleteDocumentTemplate] Error:', error);
    throw new Error(`Failed to delete document template: ${error.message}`);
  }

  if (!data) {
    console.error('[deleteDocumentTemplate] No data returned - RLS may have blocked the delete');
    throw new Error('Template not found or you do not have permission to delete it');
  }

  const result = data as DocumentTemplate;
  console.log('[deleteDocumentTemplate] Success - template permanently deleted:', result.id);
  return result;
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
 * Note: is_default is now managed on document_templates table, not the junction table
 */
async function linkDocumentTemplateToForm(
  formId: string,
  documentTemplateId: string
): Promise<FormDocumentTemplate> {
  // Using type assertion because form_document_templates table types may not be generated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = supabase.from('form_document_templates') as any;
  const { data, error } = await query
    .insert({
      form_id: formId,
      document_template_id: documentTemplateId,
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
 * Returns the deleted row to verify operation succeeded
 */
async function unlinkDocumentTemplateFromForm(
  formId: string,
  documentTemplateId: string
): Promise<{ form_id: string; document_template_id: string }> {
  const { data, error } = await supabase
    .from('form_document_templates')
    .delete()
    .eq('form_id', formId)
    .eq('document_template_id', documentTemplateId)
    .select()
    .single();

  if (error) {
    console.error('Error unlinking document template from form:', error);
    throw new Error(`Failed to unlink document template: ${error.message}`);
  }

  if (!data) {
    throw new Error('Link not found or you do not have permission to remove it');
  }

  return data as { form_id: string; document_template_id: string };
}

/**
 * Set a document template as the default for an organization
 * The database trigger ensures only one default per organization
 */
async function setDefaultDocumentTemplate(
  templateId: string,
  organizationId: string
): Promise<DocumentTemplate> {
  // Using type assertion because is_default column is from a new migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = supabase.from('document_templates') as any;
  const { data, error } = await query
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    console.error('Error setting default document template:', error);
    throw new Error(`Failed to set default document template: ${error.message}`);
  }

  return data as DocumentTemplate;
}

/**
 * Unset a document template as default
 */
async function unsetDefaultDocumentTemplate(
  templateId: string
): Promise<DocumentTemplate> {
  // Using type assertion because is_default column is from a new migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = supabase.from('document_templates') as any;
  const { data, error } = await query
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    console.error('Error unsetting default document template:', error);
    throw new Error(`Failed to unset default document template: ${error.message}`);
  }

  return data as DocumentTemplate;
}

/**
 * Fetch forms linked to a specific document template (reverse lookup)
 */
export interface LinkedForm {
  form_id: string;
  created_at: string;
  form?: {
    id: string;
    name: string;
    description?: string | null;
  };
}

async function fetchTemplateForms(templateId: string): Promise<LinkedForm[]> {
  // Using type assertion because form_document_templates table types may not be generated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = supabase.from('form_document_templates') as any;
  const { data, error } = await query
    .select(`
      form_id,
      created_at,
      form:forms!form_document_templates_form_id_fkey(id, name, description)
    `)
    .eq('document_template_id', templateId);

  if (error) {
    console.error('Error fetching template forms:', error);
    throw new Error(`Failed to fetch template forms: ${error.message}`);
  }

  return (data || []) as LinkedForm[];
}

/**
 * Fetch template counts for all forms (returns map of formId -> count)
 */
export interface FormTemplateCount {
  form_id: string;
  count: number;
}

async function fetchFormTemplateCounts(formIds: string[]): Promise<Record<string, number>> {
  if (formIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('form_document_templates')
    .select('form_id')
    .in('form_id', formIds);

  if (error) {
    console.error('Error fetching form template counts:', error);
    throw new Error(`Failed to fetch form template counts: ${error.message}`);
  }

  // Count occurrences for each form_id
  const countMap: Record<string, number> = {};
  for (const row of data || []) {
    const formId = (row as any).form_id;
    countMap[formId] = (countMap[formId] || 0) + 1;
  }

  return countMap;
}

/**
 * Fetch linked forms count for all templates (returns object of templateId -> count)
 */
async function fetchTemplateFormCounts(templateIds: string[]): Promise<Record<string, number>> {
  if (templateIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('form_document_templates')
    .select('document_template_id')
    .in('document_template_id', templateIds);

  if (error) {
    console.error('Error fetching template form counts:', error);
    throw new Error(`Failed to fetch template form counts: ${error.message}`);
  }

  // Count occurrences for each document_template_id
  const countMap: Record<string, number> = {};
  for (const row of data || []) {
    const templateId = (row as any).document_template_id;
    countMap[templateId] = (countMap[templateId] || 0) + 1;
  }

  return countMap;
}

/**
 * Linked form info for batch fetch
 */
export interface TemplateLinkedFormInfo {
  form_id: string;
  form_name: string;
}

/**
 * Fetch linked form info (id + name) for all templates in batch
 * Returns map of templateId -> { form_id, form_name }
 */
async function fetchTemplateLinkedForms(
  templateIds: string[]
): Promise<Record<string, TemplateLinkedFormInfo>> {
  if (templateIds.length === 0) {
    return {};
  }

  // First get the junction table data
  const { data: junctionData, error: junctionError } = await supabase
    .from('form_document_templates')
    .select('document_template_id, form_id')
    .in('document_template_id', templateIds);

  if (junctionError) {
    console.error('Error fetching template linked forms:', junctionError);
    throw new Error(`Failed to fetch template linked forms: ${junctionError.message}`);
  }

  if (!junctionData || junctionData.length === 0) {
    return {};
  }

  // Type assertion for junction data
  const typedJunctionData = junctionData as Array<{
    document_template_id: string;
    form_id: string;
  }>;

  // Get unique form IDs
  const formIds = [...new Set(typedJunctionData.map((j) => j.form_id))];

  // Fetch form names
  const { data: formsData, error: formsError } = await supabase
    .from('forms')
    .select('id, name')
    .in('id', formIds);

  if (formsError) {
    console.error('Error fetching form names:', formsError);
    throw new Error(`Failed to fetch form names: ${formsError.message}`);
  }

  // Type assertion for forms data
  const typedFormsData = (formsData || []) as Array<{ id: string; name: string }>;

  // Create form name lookup
  const formNameMap: Record<string, string> = {};
  for (const form of typedFormsData) {
    formNameMap[form.id] = form.name;
  }

  // Build result map (templateId -> form info)
  // Since each template links to one form, we take the first one
  const resultMap: Record<string, TemplateLinkedFormInfo> = {};
  for (const junction of typedJunctionData) {
    const templateId = junction.document_template_id;
    if (!resultMap[templateId]) {
      resultMap[templateId] = {
        form_id: junction.form_id,
        form_name: formNameMap[junction.form_id] || 'Unknown Form',
      };
    }
  }

  return resultMap;
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook: Fetch all available document templates with realtime updates
 */
export function useDocumentTemplates(organizationId?: string) {
  const queryKey = documentTemplateQueryKeys.list(organizationId);

  // Subscribe to realtime changes on document_templates table
  // Always subscribe when enabled, filter is optional for org-specific changes
  useRealtimeSubscription(
    'document_templates',
    queryKey,
    organizationId ? { filter: `organization_id=eq.${organizationId}` } : {},
    true // Always enabled - we want to catch all changes
  );

  return useQuery({
    queryKey,
    queryFn: () => fetchDocumentTemplates(organizationId),
    staleTime: 30 * 1000, // Reduced to 30 seconds for faster cache invalidation
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

/**
 * Hook: Fetch a single document template by ID with realtime updates
 */
export function useDocumentTemplate(templateId: string | undefined) {
  const queryKey = documentTemplateQueryKeys.detail(templateId || '__no_id__');

  // Subscribe to realtime changes for this specific template
  useRealtimeSubscription(
    'document_templates',
    queryKey,
    templateId ? { filter: `id=eq.${templateId}` } : {},
    !!templateId
  );

  return useQuery({
    queryKey,
    queryFn: () => {
      if (!templateId) return null;
      return fetchDocumentTemplateById(templateId);
    },
    enabled: !!templateId,
    staleTime: 30 * 1000, // Reduced to 30 seconds
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook: Fetch document templates linked to a specific form with realtime updates
 */
export function useFormDocumentTemplates(formId: string | undefined) {
  const queryKey = documentTemplateQueryKeys.formTemplates(formId || '__no_id__');

  // Subscribe to realtime changes on form_document_templates junction table
  useRealtimeSubscription(
    'form_document_templates',
    queryKey,
    formId ? { filter: `form_id=eq.${formId}` } : {},
    !!formId
  );

  return useQuery({
    queryKey,
    queryFn: () => {
      if (!formId) return [];
      return fetchFormDocumentTemplates(formId);
    },
    enabled: !!formId,
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
  });
}

/**
 * Hook: Fetch forms linked to a specific document template (reverse lookup) with realtime updates
 */
export function useTemplateForms(templateId: string | undefined) {
  const queryKey = documentTemplateQueryKeys.templateForms(templateId || '__no_id__');

  // Subscribe to realtime changes on form_document_templates junction table
  useRealtimeSubscription(
    'form_document_templates',
    queryKey,
    templateId ? { filter: `document_template_id=eq.${templateId}` } : {},
    !!templateId
  );

  return useQuery({
    queryKey,
    queryFn: () => {
      if (!templateId) return [];
      return fetchTemplateForms(templateId);
    },
    enabled: !!templateId,
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
  });
}

/**
 * Hook: Fetch template counts for a list of forms (batch fetch)
 * Returns a Map<formId, count> for efficient lookup
 */
export function useFormTemplateCounts(formIds: string[]) {
  return useQuery({
    queryKey: [...documentTemplateQueryKeys.all, 'formCounts', formIds.sort().join(',')],
    queryFn: () => fetchFormTemplateCounts(formIds),
    enabled: formIds.length > 0,
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
  });
}

/**
 * Hook: Fetch linked form counts for a list of templates (batch fetch)
 * Returns a Map<templateId, count> for efficient lookup
 */
export function useTemplateFormCounts(templateIds: string[]) {
  return useQuery({
    queryKey: [...documentTemplateQueryKeys.all, 'templateFormCounts', templateIds.sort().join(',')],
    queryFn: () => fetchTemplateFormCounts(templateIds),
    enabled: templateIds.length > 0,
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
  });
}

/**
 * Hook: Fetch linked form info (id + name) for all templates in batch
 * Returns a Map<templateId, { form_id, form_name }> for efficient lookup
 */
export function useTemplateLinkedForms(templateIds: string[]) {
  return useQuery({
    queryKey: [...documentTemplateQueryKeys.all, 'templateLinkedForms', templateIds.sort().join(',')],
    queryFn: () => fetchTemplateLinkedForms(templateIds),
    enabled: templateIds.length > 0,
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
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
    onSuccess: async (data) => {
      console.log('[useCreateDocumentTemplate] onSuccess - created template:', {
        id: data.id,
        name: data.name,
        organization_id: data.organization_id,
        is_active: data.is_active,
      });
      // Force immediate refetch to ensure new template appears
      await queryClient.resetQueries({
        queryKey: documentTemplateQueryKeys.list(data.organization_id || undefined),
      });
    },
    onError: (err) => {
      console.error('[useCreateDocumentTemplate] onError:', err);
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
    onSuccess: async (data) => {
      console.log('[useUpdateDocumentTemplate] onSuccess - forcing refetch for:', data.id);
      // Force immediate refetch
      await queryClient.resetQueries({
        queryKey: documentTemplateQueryKeys.detail(data.id),
      });
      await queryClient.resetQueries({
        queryKey: documentTemplateQueryKeys.list(data.organization_id || undefined),
      });
    },
    onError: (err) => {
      console.error('[useUpdateDocumentTemplate] onError:', err);
    },
  });
}

/**
 * Hook: Delete a document template
 * Uses optimistic updates to immediately remove from UI
 */
export function useDeleteDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDocumentTemplate,
    onMutate: async (templateId: string) => {
      console.log('[useDeleteDocumentTemplate] onMutate - optimistically removing:', templateId);

      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: documentTemplateQueryKeys.all });

      // Snapshot all list queries for potential rollback
      const previousLists = queryClient.getQueriesData<DocumentTemplate[]>({
        queryKey: documentTemplateQueryKeys.lists(),
      });

      // Optimistically remove the template from all list caches
      queryClient.setQueriesData<DocumentTemplate[]>(
        { queryKey: documentTemplateQueryKeys.lists() },
        (old) => {
          const filtered = old?.filter((t) => t.id !== templateId) ?? [];
          console.log('[useDeleteDocumentTemplate] Cache updated, remaining templates:', filtered.length);
          return filtered;
        }
      );

      // Return context with previous data for rollback
      return { previousLists, templateId };
    },
    onError: (err, _templateId, context) => {
      console.error('[useDeleteDocumentTemplate] onError - rolling back:', err);
      // Rollback to previous state on error
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (data) => {
      console.log('[useDeleteDocumentTemplate] onSuccess - DB returned:', {
        id: data.id,
        is_active: data.is_active,
        name: data.name
      });
    },
    onSettled: async () => {
      console.log('[useDeleteDocumentTemplate] onSettled - forcing refetch');
      // Force immediate refetch by resetting queries, not just invalidating
      await queryClient.resetQueries({ queryKey: documentTemplateQueryKeys.all });
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
    }: {
      formId: string;
      documentTemplateId: string;
    }) => {
      return linkDocumentTemplateToForm(formId, documentTemplateId);
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
      // Invalidate form templates query
      queryClient.invalidateQueries({
        queryKey: documentTemplateQueryKeys.formTemplates(variables.formId),
      });
      // Invalidate template forms query (reverse lookup)
      queryClient.invalidateQueries({
        queryKey: documentTemplateQueryKeys.templateForms(variables.documentTemplateId),
      });
      // Invalidate linked forms batch query
      queryClient.invalidateQueries({
        queryKey: [...documentTemplateQueryKeys.all, 'templateLinkedForms'],
      });
    },
  });
}

/**
 * Hook: Set a document template as the default for an organization
 */
export function useSetDefaultDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      organizationId,
    }: {
      templateId: string;
      organizationId: string;
    }) => {
      return setDefaultDocumentTemplate(templateId, organizationId);
    },
    onSuccess: (data) => {
      // Invalidate template list and detail queries
      queryClient.invalidateQueries({
        queryKey: documentTemplateQueryKeys.list(data.organization_id || undefined),
      });
      queryClient.invalidateQueries({
        queryKey: documentTemplateQueryKeys.detail(data.id),
      });
    },
  });
}

/**
 * Hook: Unset a document template as default
 */
export function useUnsetDefaultDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId }: { templateId: string }) => {
      return unsetDefaultDocumentTemplate(templateId);
    },
    onSuccess: (data) => {
      // Invalidate template list and detail queries
      queryClient.invalidateQueries({
        queryKey: documentTemplateQueryKeys.list(data.organization_id || undefined),
      });
      queryClient.invalidateQueries({
        queryKey: documentTemplateQueryKeys.detail(data.id),
      });
    },
  });
}
