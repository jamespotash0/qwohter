/**
 * React Query Hooks for Template Library
 *
 * Server state management for form templates using React Query.
 * Handles fetching, caching, and copying templates.
 *
 * Usage:
 * ```typescript
 * const { data: templates } = useTemplates();
 * const { data: template } = useTemplate(templateId);
 * const copyTemplate = useCopyTemplate();
 * ```
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  fetchTemplates,
  fetchTemplateById,
  fetchTemplateCategories,
  copyTemplateToOrganization,
  searchTemplates,
  getFormTemplateLineage,
  type Template,
  type TemplateCategory,
  type CopyTemplateParams,
} from '@/services/templateService';
import type { Database } from '@/integrations/supabase/types';

type FormRow = Database['public']['Tables']['forms']['Row'];

// Query Keys
export const templateQueryKeys = {
  all: ['templates'] as const,
  lists: () => [...templateQueryKeys.all, 'list'] as const,
  list: (category?: string) => [...templateQueryKeys.lists(), { category }] as const,
  details: () => [...templateQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateQueryKeys.details(), id] as const,
  categories: () => [...templateQueryKeys.all, 'categories'] as const,
  search: (query: string, category?: string) =>
    [...templateQueryKeys.all, 'search', { query, category }] as const,
  lineage: (formId: string) => [...templateQueryKeys.all, 'lineage', formId] as const,
};

/**
 * Hook: Fetch all system templates
 * @param category - Optional category filter
 * @param options - React Query options
 */
export function useTemplates(
  category?: string,
  options?: Omit<UseQueryOptions<Template[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Template[], Error>({
    queryKey: templateQueryKeys.list(category),
    queryFn: () => fetchTemplates(category),
    staleTime: 10 * 60 * 1000, // Templates don't change often, cache for 10 minutes
    ...options,
  });
}

/**
 * Hook: Fetch a single template by ID
 * @param templateId - Template ID
 * @param options - React Query options
 */
export function useTemplate(
  templateId: string | undefined,
  options?: Omit<UseQueryOptions<Template | null, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Template | null, Error>({
    queryKey: templateQueryKeys.detail(templateId || '__no_id__'),
    queryFn: () => {
      if (!templateId) return null;
      return fetchTemplateById(templateId);
    },
    enabled: !!templateId,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook: Fetch template categories
 * @param options - React Query options
 */
export function useTemplateCategories(
  options?: Omit<UseQueryOptions<TemplateCategory[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TemplateCategory[], Error>({
    queryKey: templateQueryKeys.categories(),
    queryFn: fetchTemplateCategories,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook: Search templates
 * @param searchQuery - Search term
 * @param category - Optional category filter
 * @param options - React Query options
 */
export function useSearchTemplates(
  searchQuery: string,
  category?: string,
  options?: Omit<UseQueryOptions<Template[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Template[], Error>({
    queryKey: templateQueryKeys.search(searchQuery, category),
    queryFn: () => searchTemplates(searchQuery, category),
    enabled: searchQuery.length >= 2, // Only search with 2+ characters
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook: Get form template lineage
 * @param formId - Form ID
 * @param options - React Query options
 */
export function useFormTemplateLineage(
  formId: string | undefined,
  options?: Omit<
    UseQueryOptions<{ isFromTemplate: boolean; template?: Template }, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: templateQueryKeys.lineage(formId || '__no_id__'),
    queryFn: () => {
      if (!formId) return { isFromTemplate: false };
      return getFormTemplateLineage(formId);
    },
    enabled: !!formId,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook: Copy template to organization
 * Creates a new form based on the template
 *
 * Automatically invalidates:
 * - Forms list for the organization
 * - Sets the new form in cache
 */
export function useCopyTemplate() {
  const queryClient = useQueryClient();

  return useMutation<FormRow, Error, CopyTemplateParams>({
    mutationFn: copyTemplateToOrganization,
    onSuccess: (newForm, variables) => {
      // Invalidate forms list for this organization
      queryClient.invalidateQueries({
        queryKey: ['forms', 'list', variables.organizationId],
      });

      // Set the new form in cache
      queryClient.setQueryData(['forms', 'detail', newForm.id], newForm);

      // Invalidate template lineage queries
      queryClient.invalidateQueries({
        queryKey: templateQueryKeys.lineage(newForm.id),
      });
    },
    onError: (error) => {
      console.error('Failed to copy template:', error);
    },
  });
}

/**
 * Hook: Prefetch a template for smoother preview loading
 * @param templateId - Template ID to prefetch
 */
export function usePrefetchTemplate() {
  const queryClient = useQueryClient();

  return (templateId: string) => {
    queryClient.prefetchQuery({
      queryKey: templateQueryKeys.detail(templateId),
      queryFn: () => fetchTemplateById(templateId),
      staleTime: 10 * 60 * 1000,
    });
  };
}
