
// Re-export types from service layer (new names)
export type {
  Proposal,
  ProposalFilters,
  CreateProposalData,
  UpdateProposalData
} from '@/services/proposalsService';

// Re-export React Query hooks
export {
  useProposals,
  useProposal,
  useCreateProposal,
  useUpdateProposal,
  useDeleteProposal,
  useUpdateProposalStatus,
  useArchiveProposal,
  useUnarchiveProposal,
  // useSetMainVersion,
  useCreateProposalVersion,
} from '@/hooks/queries/useProposals';

// Legacy aliases for backward compatibility
export { useProposals as useProposalsStore } from '@/hooks/queries/useProposals';
export { useProposals as useQuotes } from '@/hooks/queries/useProposals';
export { useProposal as useQuote } from '@/hooks/queries/useProposals';
export { useCreateProposal as useCreateQuote } from '@/hooks/queries/useProposals';
export { useUpdateProposal as useUpdateQuote } from '@/hooks/queries/useProposals';
export { useDeleteProposal as useDeleteQuote } from '@/hooks/queries/useProposals';
export { useUpdateProposalStatus as useUpdateQuoteStatus } from '@/hooks/queries/useProposals';
export { useArchiveProposal as useArchiveQuote } from '@/hooks/queries/useProposals';
export { useUnarchiveProposal as useUnarchiveQuote } from '@/hooks/queries/useProposals';
export { useSetMainVersion } from '@/hooks/queries/useProposals';
export { useCreateProposalVersion as useCreateQuoteVersion } from '@/hooks/queries/useProposals';
