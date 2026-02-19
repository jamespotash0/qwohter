/**
 * React Query Hook for Proposal Signing Tokens
 *
 * Fetches signing token data to track proposal lifecycle status.
 */

import { useQuery } from '@tanstack/react-query';
import {
  getProposalSigningTokens,
  type SigningToken,
} from '@/services/proposalSigningService';

export function useProposalSigningTokens(proposalId: string | undefined, enabled = true) {
  return useQuery<SigningToken[]>({
    queryKey: ['signingTokens', proposalId],
    queryFn: () => getProposalSigningTokens(proposalId!),
    enabled: !!proposalId && enabled,
    staleTime: 30 * 1000,
  });
}
