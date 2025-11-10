/**
 * React Query Hooks for Proposals
 *
 * These hooks replace the manual Zustand proposalsStore with industry-standard
 * React Query patterns. This automatically eliminates race conditions.
 *
 * Benefits:
 * - Automatic request deduplication
 * - Built-in stale-while-revalidate
 * - Optimistic updates with rollback
 * - Cache invalidation
 * - Loading/error states
 * - Realtime integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateQueries, optimisticUpdates } from '@/lib/queryClient';
import { useRealtimeSubscription } from '@/lib/realtimeSubscriptions';
import { toast } from 'sonner';
import type { Proposal } from '@/stores/proposals/proposalsStore';
import {
  fetchProposals,
  fetchProposalById,
  createProposal,
  updateProposal,
  deleteProposal,
  archiveProposal,
  unarchiveProposal,
  updateProposalStatus as updateProposalStatusService,
  setMainVersion as setMainVersionService,
  createProposalVersion,
  type CreateProposalData,
  type UpdateProposalData,
  type ProposalFilters,
} from '@/services/proposalsService';

/**
 * Hook: Use Proposals List
 *
 * Automatically fetches and caches Proposals with race condition prevention
 * Includes realtime subscriptions for automatic updates
 *
 * Usage:
 * ```tsx
 * const { data: Proposals, isLoading, error } = useProposals(userId, filters);
 * ```
 */
export function useProposals(
  userId?: string,
  filters?: ProposalFilters,
  enabled: boolean = true
) {
  const queryKey = queryKeys.proposals.list(userId || '', filters);

  // Set up realtime subscription for proposals
  useRealtimeSubscription(
    'proposals',
    queryKey,
    {}, // No filter - client-side filtering based on user's org memberships
    !!userId && enabled
  );

  return useQuery({
    queryKey,
    queryFn: () => fetchProposals(userId!, filters),
    enabled: !!userId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes - changes frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Keep data fresh
    // React Query automatically:
    // - Deduplicates concurrent requests
    // - Cancels stale requests
    // - Refetches on window focus
    // - Prevents race conditions
    // + Realtime subscriptions for instant updates!
  });
}

/**
 * Hook: Use Proposal Detail
 *
 * Fetch a single proposal by ID
 */
export function useProposal(proposalId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.proposals.detail(proposalId),
    queryFn: () => fetchProposalById(proposalId),
    enabled: !!proposalId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - single proposal changes less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook: Create Proposal Mutation
 *
 * Creates a new proposal with optimistic updates
 *
 * Usage:
 * ```tsx
 * const createProposal = useCreateProposal();
 * createProposal.mutate(proposalData, {
 *   onSuccess: (newProposal) => console.log('Created:', newProposal.id)
 * });
 * ```
 */
export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposalData: CreateProposalData) => {
      return createProposal(proposalData);
    },

    // On success: Invalidate proposals list
    onSuccess: () => {
      toast.success('Proposal created successfully');

      // Invalidate all proposals lists to refresh the table
      invalidateQueries.allProposals();
    },

    // On error: Show error message
    onError: (error) => {
      toast.error('Failed to create proposal: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });
}

/**
 * Hook: Update Proposal Mutation
 *
 * Updates a proposal with optimistic updates
 */
export function useUpdateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateProposalData }) => {
      return updateProposal(id, updates);
    },

    // Optimistic update
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.proposals.detail(id) });

      // Snapshot previous value
      const previousProposal = queryClient.getQueryData(queryKeys.proposals.detail(id));

      // Optimistically update
      queryClient.setQueryData(queryKeys.proposals.detail(id), (old: Proposal | undefined) => {
        if (!old) return old;
        return { ...old, ...updates };
      });

      return { previousProposal, id };
    },

    onSuccess: (data, variables) => {
      // Don't show toast for download tracking (silent update)
      const isDownloadTracking =
        Object.keys(variables.updates).length === 1 &&
        'date_last_downloaded' in variables.updates;

      if (!isDownloadTracking) {
        toast.success('Proposal updated successfully');
      }

      // Invalidate all proposals lists to refresh the table
      invalidateQueries.allProposals();
    },

    onError: (error, variables, context) => {
      if (context?.previousProposal && context?.id) {
        queryClient.setQueryData(
          queryKeys.proposals.detail(context.id),
          context.previousProposal
        );
      }

      toast.error('Failed to update proposal');
    },
  });
}

/**
 * Hook: Delete Proposal Mutation
 *
 * Deletes a proposal with optimistic update
 */
export function useDeleteProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposalId: string) => {
      await deleteProposal(proposalId);
      return proposalId;
    },

    // Optimistic update: Remove from list immediately
    onMutate: async (proposalId) => {
      // Find the proposal in ALL cached lists to get organization_id
      const cacheData = queryClient.getQueriesData<Proposal[]>({ queryKey: ['proposals', 'list'] });

      let organizationId: string | undefined;
      let previousProposals: Proposal[] | undefined;

      for (const [queryKey, proposals] of cacheData) {
        if (proposals) {
          const proposal = proposals.find(q => q.id === proposalId);
          if (proposal) {
            organizationId = proposal.organization_id;
            previousProposals = proposals;

            // Cancel outgoing refetches for this specific list
            await queryClient.cancelQueries({ queryKey });

            // Optimistically remove from this list
            queryClient.setQueryData(queryKey, proposals.filter((q) => q.id !== proposalId));
            break;
          }
        }
      }

      return { previousProposals, organizationId, proposalId };
    },

    onSuccess: () => {
      toast.success('Proposal deleted successfully');

      // Invalidate all proposals lists to refresh the table
      invalidateQueries.allProposals();
    },

    onError: (error, variables, context) => {
      console.error('Delete proposal error:', error);

      if (context?.previousProposals && context?.organizationId) {
        queryClient.setQueryData(
          queryKeys.proposals.list(context.organizationId),
          context.previousProposals
        );
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to delete proposal: ${errorMessage}`);
    },
  });
}

/**
 * Hook: Update Proposal Status
 *
 * Specialized mutation for status updates with optimistic UI
 */
export function useUpdateProposalStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ proposalId, status }: { proposalId: string; status: string }) => {
      return updateProposalStatusService(proposalId, status);
    },

    onMutate: async ({ proposalId, status }) => {
      // Use optimistic update helper
      const rollback = optimisticUpdates.updateProposalStatus(proposalId, status);

      return { rollback, proposalId };
    },

    onSuccess: () => {
      toast.success('Proposal status updated successfully');
      // Invalidate all proposals lists to refresh the table
      invalidateQueries.allProposals();
    },

    onError: (error, variables, context) => {
      context?.rollback?.();
      toast.error('Failed to update proposal status');
    },
  });
}

/**
 * Hook: Archive Proposal
 *
 * Archives a proposal with optimistic updates
 */
export function useArchiveProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposalId: string) => {
      return archiveProposal(proposalId);
    },
    onSuccess: () => {
      toast.success('Proposal archived successfully');
      // Invalidate all proposals lists to refresh both active and archived views
      invalidateQueries.allProposals();
    },
    onError: (error) => {
      console.error('Archive proposal error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to archive proposal: ${errorMessage}`);
    },
  });
}

/**
 * Hook: Unarchive Proposal
 *
 * Unarchives a proposal with optimistic updates
 */
export function useUnarchiveProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposalId: string) => {
      return unarchiveProposal(proposalId);
    },
    onSuccess: () => {
      toast.success('Proposal unarchived successfully');
      // Invalidate all proposals lists to refresh both active and archived views
      invalidateQueries.allProposals();
    },
    onError: (error) => {
      console.error('Unarchive proposal error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to unarchive proposal: ${errorMessage}`);
    },
  });
}

/**
 * Hook: Set Main Version
 *
 * Sets a proposal as the main version in its version group
 */
export function useSetMainVersion() {
  return useMutation({
    mutationFn: async ({ proposalId, baseProposalNumber }: { proposalId: string; baseProposalNumber: string }) => {
      return setMainVersionService(proposalId, baseProposalNumber);
    },
    onSuccess: () => {
      toast.success('Main version updated');
      // Invalidate all proposals lists to refresh the data
      invalidateQueries.allProposals();
    },
    onError: (error) => {
      toast.error('Failed to set main version');
    },
  });
}

/**
 * Hook: Create Proposal Version
 *
 * Creates a new version of an existing proposal
 */
export function useCreateProposalVersion() {
  return useMutation({
    mutationFn: async ({
      proposalId,
      newProposalNumber,
      versionNumber
    }: {
      proposalId: string;
      newProposalNumber: string;
      versionNumber: number;
    }) => {
      return createProposalVersion(proposalId, newProposalNumber, versionNumber);
    },
    onSuccess: () => {
      toast.success('Proposal version created successfully');
      // Invalidate all proposals lists to refresh the table
      invalidateQueries.allProposals();
    },
    onError: (error) => {
      console.error('Create version error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to create version: ${errorMessage}`);
    },
  });
}
