/**
 * React Query Hooks for Dashboard
 *
 * Uses the proposals table (new form-builder system)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryClient';

/**
 * Dashboard stats type
 * Proposal statuses: Draft, Submitted, Won, Rejected
 */
export interface DashboardStats {
  totalProposals: number;
  draftProposals: number;
  submittedProposals: number;
  wonProposals: number;
  rejectedProposals: number;
  totalValue: number;
  winRate: number; // Won / (Won + Rejected) * 100
}

/**
 * Fetch dashboard stats from proposals table
 */
type ProposalRow = {
  status: 'Draft' | 'Submitted' | 'Won' | 'Rejected';
  total_value: number | null;
};

async function fetchDashboardStats(organizationId: string): Promise<DashboardStats> {
  const { data: proposals, error } = await supabase
    .from('proposals')
    .select('status, total_value')
    .eq('organization_id', organizationId);

  if (error) throw error;

  const typedProposals = (proposals ?? []) as ProposalRow[];

  const totalProposals = typedProposals?.length || 0;
  const draftProposals = typedProposals?.filter(p => p.status === 'Draft').length || 0;
  const submittedProposals = typedProposals?.filter(p => p.status === 'Submitted').length || 0;
  const wonProposals = typedProposals?.filter(p => p.status === 'Won').length || 0;
  const rejectedProposals = typedProposals?.filter(p => p.status === 'Rejected').length || 0;
  const totalValue = typedProposals?.reduce((sum, p) => sum + (p.total_value || 0), 0) || 0;

  // Win rate = Won / (Won + Rejected) * 100
  const decidedProposals = wonProposals + rejectedProposals;
  const winRate = decidedProposals > 0 ? (wonProposals / decidedProposals) * 100 : 0;

  return {
    totalProposals,
    draftProposals,
    submittedProposals,
    wonProposals,
    rejectedProposals,
    totalValue,
    winRate,
  };
}

/**
 * Hook: Use Dashboard Stats
 *
 * Fetches aggregated proposal statistics
 */
export function useDashboardStats(organizationId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(organizationId),
    queryFn: () => fetchDashboardStats(organizationId),
    enabled: !!organizationId && enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}
