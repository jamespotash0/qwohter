/**
 * React Query Hooks for Proposals
 *
 * Server state management for proposals.
 * Wraps the proposals service with React Query for caching and mutations.
 *
 * Usage:
 * ```typescript
 * const { data: proposals } = useProposals(organizationId);
 * const { data: proposal } = useProposal(proposalId);
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProposals,
  fetchProposalById,
  createProposal,
  updateProposal,
  deleteProposal,
  updateProposalStatus,
  archiveProposal,
  unarchiveProposal,
  setMainVersion,
  createProposalVersion,
  type Proposal,
  type CreateProposalData,
  type UpdateProposalData,
} from '@/services/proposalsService';

// ============================================================================
// Query Keys
// ============================================================================

export const proposalQueryKeys = {
  all: ['proposals'] as const,
  lists: () => [...proposalQueryKeys.all, 'list'] as const,
  list: (organizationId: string, filters?: { status?: string; form_id?: string }) =>
    [...proposalQueryKeys.lists(), organizationId, filters] as const,
  details: () => [...proposalQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...proposalQueryKeys.details(), id] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook: Fetch all proposals for an organization
 */
export function useProposals(
  organizationId: string | undefined,
  filters?: { status?: string; form_id?: string },
  enabled: boolean = true
) {
  return useQuery({
    queryKey: proposalQueryKeys.list(organizationId || '__no_org__', filters),
    queryFn: () => {
      if (!organizationId) return [];
      return fetchProposals(organizationId, filters);
    },
    enabled: !!organizationId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook: Fetch a single proposal by ID
 */
export function useProposal(proposalId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: proposalQueryKeys.detail(proposalId || '__no_id__'),
    queryFn: () => {
      if (!proposalId) return null;
      return fetchProposalById(proposalId);
    },
    enabled: !!proposalId && enabled,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook: Check if any proposals exist for a form
 * Used to determine if document_type can be changed
 */
export function useFormHasProposals(formId: string | undefined, organizationId: string | undefined) {
  return useQuery({
    queryKey: [...proposalQueryKeys.all, 'hasProposals', formId],
    queryFn: async () => {
      if (!formId || !organizationId) return false;
      const proposals = await fetchProposals(organizationId, { form_id: formId });
      return proposals.length > 0;
    },
    enabled: !!formId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes - this doesn't change often
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook: Create a new proposal
 */
export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProposal,
    onSuccess: () => {
      // Invalidate all proposal lists
      queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.lists(),
      });
    },
  });
}

/**
 * Hook: Update a proposal
 */
export function useUpdateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      updates,
    }: {
      proposalId: string;
      updates: UpdateProposalData;
    }) => {
      return updateProposal(proposalId, updates);
    },
    onSuccess: (data) => {
      // Invalidate the specific proposal
      queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.detail(data.id),
      });
      // Invalidate all lists
      queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.lists(),
      });
    },
  });
}

/**
 * Hook: Delete a proposal
 */
export function useDeleteProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProposal,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.lists(),
      });
    },
  });
}

/**
 * Hook: Update proposal status
 */
export function useUpdateProposalStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      status,
    }: {
      proposalId: string;
      status: string;
    }) => {
      return updateProposalStatus(proposalId, status);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.lists(),
      });
    },
  });
}

/**
 * Hook: Archive a proposal
 */
export function useArchiveProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveProposal,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.lists(),
      });
    },
  });
}

/**
 * Hook: Unarchive a proposal
 */
export function useUnarchiveProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unarchiveProposal,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.lists(),
      });
    },
  });
}

/**
 * Hook: Set a proposal as the main version
 */
export function useSetMainVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      baseProposalNumber,
    }: {
      proposalId: string;
      baseProposalNumber: string;
    }) => {
      return setMainVersion(proposalId, baseProposalNumber);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.lists(),
      });
    },
  });
}

/**
 * Hook: Create a new version of a proposal
 */
export function useCreateProposalVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parentProposalId: string) => {
      return createProposalVersion(parentProposalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.lists(),
      });
    },
  });
}

// Re-export types
export type { Proposal, CreateProposalData, UpdateProposalData };
