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
import type { FormDefinition } from '@/services/formsService';
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
} from '@/services/formsService';

// Re-export types for convenience
export type { FormDefinition, FormTab, FormField } from '@/services/formsService';

/**
 * Query Keys Factory for Forms
 * Follows the pattern from queryClient.ts
 */
export const formsQueryKeys = {
  all: ['forms'] as const,
  lists: () => [...formsQueryKeys.all, 'list'] as const,
  list: (organizationId: string) => [...formsQueryKeys.lists(), organizationId] as const,
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
    queryKey: formsQueryKeys.list(organizationId || ''),
    queryFn: () => fetchForms(organizationId!),
    enabled: !!organizationId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - forms don't change that frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
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
        (payload) => {
          console.log('Form change detected:', payload);
          // Invalidate and refetch forms list
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
    mutationFn: async (formData: Omit<FormDefinition, 'id' | 'created_at' | 'updated_at'>) => {
      return createForm(formData);
    },

    onSuccess: (newForm) => {
      toast.success('Form created successfully');

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
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FormDefinition> }) => {
      return updateForm(id, updates);
    },

    // Optimistic update
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: formsQueryKeys.detail(id) });

      // Snapshot previous value
      const previousForm = queryClient.getQueryData<FormDefinition>(formsQueryKeys.detail(id));

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
      toast.success('Form updated successfully');

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
      // Get the form to find its organization_id
      const form = queryClient.getQueryData<FormDefinition>(formsQueryKeys.detail(formId));

      if (form) {
        // Cancel queries
        await queryClient.cancelQueries({ queryKey: formsQueryKeys.list(form.organization_id) });

        // Snapshot
        const previousForms = queryClient.getQueryData<FormDefinition[]>(
          formsQueryKeys.list(form.organization_id)
        );

        // Optimistically remove from list
        if (previousForms) {
          queryClient.setQueryData(
            formsQueryKeys.list(form.organization_id),
            previousForms.filter(f => f.id !== formId)
          );
        }

        return { previousForms, organizationId: form.organization_id };
      }

      return { previousForms: undefined, organizationId: undefined };
    },

    onSuccess: (formId, variables, context) => {
      toast.success('Form deleted successfully');

      // Remove from cache
      queryClient.removeQueries({ queryKey: formsQueryKeys.detail(formId) });

      // Force invalidate the list to ensure UI updates
      if (context?.organizationId) {
        queryClient.invalidateQueries({ queryKey: formsQueryKeys.list(context.organizationId) });
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
      // Refetch to ensure consistency
      if (context?.organizationId) {
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
      toast.success('Form duplicated successfully');

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
      toast.success('Default form updated');

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
      toast.success('Default form removed');

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
