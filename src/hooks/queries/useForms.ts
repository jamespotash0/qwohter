/**
 * React Query Hooks for Forms
 *
 * These hooks replace the manual Zustand formsStore with industry-standard
 * React Query patterns. This automatically eliminates race conditions.
 *
 * Benefits:
 * - Automatic request deduplication
 * - Built-in stale-while-revalidate
 * - Optimistic updates with rollback
 * - Cache invalidation
 * - Loading/error states
 * - Realtime integration ready
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Form } from '@/services/formsService';
import {
  fetchForms,
  fetchFormById,
  createForm,
  updateForm,
  deleteForm,
  copyForm,
  getDefaultForm,
  setDefaultForm,
  unsetDefaultForm,
  fetchArchivedForms,
  archiveForm,
  unarchiveForm,
  isFormInUse,
} from '@/services/formsService';

// Re-export types for convenience
export type { Form } from '@/services/formsService';

// Re-export form configuration types
export type {
  FieldConfig,
  InfoTabConfig,
  ProductsTabConfig,
  PricingTabConfig,
  TermsTabConfig,
  LeadTimesTabConfig,
  MiscTabConfig,
  DocumentsTabConfig,
  PresentationTabConfig,
  FormConfiguration,
  FormMetadata,
} from '@/services/formsService';

// Re-export factory functions
export {
  createDefaultFieldConfig,
  createDefaultFormConfiguration,
  createDefaultFormMetadata,
} from '@/services/formsService';

/**
 * Query Keys Factory for Forms
 * Follows the pattern from queryClient.ts
 */
export const formsQueryKeys = {
  all: ['forms'] as const,
  lists: () => [...formsQueryKeys.all, 'list'] as const,
  list: (organizationId: string) => [...formsQueryKeys.lists(), organizationId] as const,
  archived: (organizationId: string) => [...formsQueryKeys.all, 'archived', organizationId] as const,
  details: () => [...formsQueryKeys.all, 'detail'] as const,
  detail: (formId: string) => [...formsQueryKeys.details(), formId] as const,
  default: (organizationId: string) => [...formsQueryKeys.all, 'default', organizationId] as const,
};

/**
 * Hook: Use Forms List
 *
 * Automatically fetches and caches forms with race condition prevention
 * Includes realtime subscriptions for automatic updates
 *
 * Usage:
 * ```tsx
 * const { data: forms, isLoading, error } = useForms(organizationId);
 * ```
 */
export function useForms(organizationId?: string, enabled: boolean = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: formsQueryKeys.list(organizationId || '__pending__'),
    queryFn: async ({ signal }) => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      return fetchForms(organizationId);
    },
    enabled: !!organizationId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - forms don't change that frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    // Don't retry on errors - let them fail immediately
    retry: false,
    // Suppress error throwing for cancelled queries (harmless warning when orgId changes)
    throwOnError: false,
  });

  // Realtime subscription for automatic updates
  useEffect(() => {
    if (!organizationId || !enabled) return;

    const channel = supabase
      .channel(`forms:${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forms',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          // Invalidate and refetch forms list when changes occur
          queryClient.invalidateQueries({ queryKey: formsQueryKeys.list(organizationId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, enabled, queryClient]);

  return query;
}

/**
 * Hook: Use Form Detail
 *
 * Fetch a single form by ID
 */
export function useForm(formId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: formsQueryKeys.detail(formId),
    queryFn: () => fetchFormById(formId),
    enabled: !!formId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook: Use Default Form
 *
 * Fetch the default form for an organization
 */
export function useDefaultForm(organizationId?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: formsQueryKeys.default(organizationId || ''),
    queryFn: () => getDefaultForm(organizationId!),
    enabled: !!organizationId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook: Create Form Mutation
 *
 * Creates a new form with optimistic updates
 *
 * Usage:
 * ```tsx
 * const createFormMutation = useCreateForm();
 * createFormMutation.mutate(formData, {
 *   onSuccess: (newForm) => console.log('Created:', newForm.id)
 * });
 * ```
 */
export function useCreateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: Omit<Form, 'id' | 'created_at' | 'updated_at'>) => {
      return createForm(formData);
    },

    onSuccess: (newForm) => {
      // Invalidate forms list for this organization
      queryClient.invalidateQueries({ queryKey: formsQueryKeys.list(newForm.organization_id) });

      // Set the detail in cache
      queryClient.setQueryData(formsQueryKeys.detail(newForm.id), newForm);
    },

    onError: (error) => {
      toast.error('Failed to create form: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });
}

/**
 * Hook: Update Form Mutation
 *
 * Updates a form with optimistic updates
 */
export function useUpdateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Form> }) => {
      return updateForm(id, updates);
    },

    // Optimistic update
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: formsQueryKeys.detail(id) });

      // Snapshot previous value
      const previousForm = queryClient.getQueryData<Form>(formsQueryKeys.detail(id));

      // Optimistically update
      if (previousForm) {
        queryClient.setQueryData(formsQueryKeys.detail(id), {
          ...previousForm,
          ...updates,
        });
      }

      return { previousForm, id };
    },

    onSuccess: (updatedForm) => {
      // Update the form in cache
      queryClient.setQueryData(formsQueryKeys.detail(updatedForm.id), updatedForm);

      // Invalidate forms list for this organization
      queryClient.invalidateQueries({ queryKey: formsQueryKeys.list(updatedForm.organization_id) });
    },

    onError: (error, variables, context) => {
      if (context?.previousForm && context?.id) {
        queryClient.setQueryData(
          formsQueryKeys.detail(context.id),
          context.previousForm
        );
      }

      toast.error('Failed to update form: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });
}

/**
 * Hook: Delete Form Mutation
 *
 * Deletes a form with optimistic update
 */
export function useDeleteForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formId: string) => {
      await deleteForm(formId);
      return formId;
    },

    onMutate: async (formId) => {
      console.log('[useDeleteForm] onMutate - Starting deletion for:', formId);

      // Find the form in any forms list cache to get organization_id
      let form: Form | undefined;
      let organizationId: string | undefined;

      // Search through all cached forms lists to find the form
      const queriesData = queryClient.getQueriesData<Form[]>({ queryKey: formsQueryKeys.lists() });
      console.log('[useDeleteForm] Found cached queries:', queriesData.length);

      for (const [queryKey, forms] of queriesData) {
        if (forms) {
          const foundForm = forms.find(f => f.id === formId);
          if (foundForm) {
            form = foundForm;
            organizationId = foundForm.organization_id;
            console.log('[useDeleteForm] Found form in cache, orgId:', organizationId);
            break;
          }
        }
      }

      // Fallback: try to get from detail cache if not found in lists
      if (!form) {
        form = queryClient.getQueryData<Form>(formsQueryKeys.detail(formId));
        organizationId = form?.organization_id;
        console.log('[useDeleteForm] Fallback to detail cache, orgId:', organizationId);
      }

      if (organizationId) {
        // Cancel queries
        await queryClient.cancelQueries({ queryKey: formsQueryKeys.list(organizationId) });

        // Snapshot
        const previousForms = queryClient.getQueryData<Form[]>(
          formsQueryKeys.list(organizationId)
        );
        console.log('[useDeleteForm] Previous forms count:', previousForms?.length);

        // Optimistically remove from list
        if (previousForms) {
          const newForms = previousForms.filter(f => f.id !== formId);
          console.log('[useDeleteForm] Optimistically updating cache, new count:', newForms.length);
          queryClient.setQueryData(
            formsQueryKeys.list(organizationId),
            newForms
          );
        }

        return { previousForms, organizationId };
      }

      console.warn('[useDeleteForm] No organizationId found!');
      return { previousForms: undefined, organizationId: undefined };
    },

    onSuccess: (formId, variables, context) => {
      console.log('[useDeleteForm] onSuccess - Form deleted successfully:', formId);
      toast.success('Form deleted successfully');

      // Remove from cache
      queryClient.removeQueries({ queryKey: formsQueryKeys.detail(formId) });

      // Force invalidate the list to ensure UI updates
      if (context?.organizationId) {
        console.log('[useDeleteForm] Invalidating queries for org:', context.organizationId);
        queryClient.invalidateQueries({ queryKey: formsQueryKeys.list(context.organizationId) });
      } else {
        console.warn('[useDeleteForm] No organizationId in context, cannot invalidate!');
      }
    },

    onError: (error, formId, context) => {
      if (context?.previousForms && context?.organizationId) {
        queryClient.setQueryData(
          formsQueryKeys.list(context.organizationId),
          context.previousForms
        );
      }

      toast.error('Failed to delete form: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },

    onSettled: (formId, error, variables, context) => {
      console.log('[useDeleteForm] onSettled - Refetching for consistency');
      // Refetch to ensure consistency
      if (context?.organizationId) {
        console.log('[useDeleteForm] Final invalidation for org:', context.organizationId);
        queryClient.invalidateQueries({ queryKey: formsQueryKeys.list(context.organizationId) });
      }
    },
  });
}

/**
 * Hook: Copy Form Mutation
 *
 * Duplicates a form
 */
export function useCopyForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ formId, newName }: { formId: string; newName: string }) => {
      return copyForm(formId, newName);
    },

    onSuccess: (newForm) => {
      // Invalidate forms list
      queryClient.invalidateQueries({ queryKey: formsQueryKeys.list(newForm.organization_id) });

      // Set the detail in cache
      queryClient.setQueryData(formsQueryKeys.detail(newForm.id), newForm);
    },

    onError: (error) => {
      toast.error('Failed to duplicate form: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });
}

/**
 * Hook: Set Default Form Mutation
 *
 * Sets a form as the default for an organization
 */
export function useSetDefaultForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ formId, organizationId }: { formId: string; organizationId: string }) => {
      return setDefaultForm(formId, organizationId);
    },

    onSuccess: (updatedForm) => {
      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: formsQueryKeys.list(updatedForm.organization_id) });
      queryClient.invalidateQueries({ queryKey: formsQueryKeys.default(updatedForm.organization_id) });
      queryClient.setQueryData(formsQueryKeys.detail(updatedForm.id), updatedForm);
    },

    onError: (error) => {
      toast.error('Failed to set default form: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });
}

/**
 * Hook: Unset Default Form Mutation
 *
 * Removes a form's default status
 */
export function useUnsetDefaultForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ formId, organizationId }: { formId: string; organizationId: string }) => {
      return unsetDefaultForm(formId);
    },

    onSuccess: (updatedForm, variables) => {
      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: formsQueryKeys.list(variables.organizationId) });
      queryClient.invalidateQueries({ queryKey: formsQueryKeys.default(variables.organizationId) });
      queryClient.setQueryData(formsQueryKeys.detail(updatedForm.id), updatedForm);
    },

    onError: (error) => {
      toast.error('Failed to remove default form: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });
}

/**
 * Hook: Check if Form is In Use
 *
 * Returns true if the form is used by any proposals
 */
export function useIsFormInUse(formId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['forms', 'inUse', formId],
    queryFn: () => isFormInUse(formId),
    enabled: !!formId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook: Use Archived Forms List
 *
 * Fetches archived forms for an organization
 */
export function useArchivedForms(organizationId?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: formsQueryKeys.archived(organizationId || '__pending__'),
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      return fetchArchivedForms(organizationId);
    },
    enabled: !!organizationId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook: Archive Form Mutation
 *
 * Archives a form (soft delete)
 */
export function useArchiveForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formId: string) => {
      return archiveForm(formId);
    },

    onSuccess: (archivedForm) => {
      // Invalidate both active and archived lists
      if (archivedForm.organization_id) {
        queryClient.invalidateQueries({ queryKey: formsQueryKeys.list(archivedForm.organization_id) });
        queryClient.invalidateQueries({ queryKey: formsQueryKeys.archived(archivedForm.organization_id) });
      }
      queryClient.setQueryData(formsQueryKeys.detail(archivedForm.id), archivedForm);
    },

    onError: (error) => {
      toast.error('Failed to archive form: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });
}

/**
 * Hook: Unarchive Form Mutation
 *
 * Restores an archived form
 */
export function useUnarchiveForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formId: string) => {
      return unarchiveForm(formId);
    },

    onSuccess: (restoredForm) => {
      // Invalidate both active and archived lists
      if (restoredForm.organization_id) {
        queryClient.invalidateQueries({ queryKey: formsQueryKeys.list(restoredForm.organization_id) });
        queryClient.invalidateQueries({ queryKey: formsQueryKeys.archived(restoredForm.organization_id) });
      }
      queryClient.setQueryData(formsQueryKeys.detail(restoredForm.id), restoredForm);
    },

    onError: (error) => {
      toast.error('Failed to restore form: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });
}
