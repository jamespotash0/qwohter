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
 */
export interface DashboardStats {
  totalProposals: number;
  draftProposals: number;
  sentProposals: number;
  approvedProposals: number;
  totalValue: number;
  approvalRate: number;
  /** @deprecated Use totalProposals instead */
  totalQuotes: number;
  /** @deprecated Use sentProposals instead */
  submittedQuotes: number;
  /** @deprecated Use approvedProposals instead */
  wonQuotes: number;
  /** @deprecated Use approvalRate instead */
  winRate: number;
}

/**
 * Fetch dashboard stats from proposals table
 */
async function fetchDashboardStats(organizationId: string): Promise<DashboardStats> {
  const { data: proposals, error } = await supabase
    .from('proposals')
    .select('status, total_value')
    .eq('organization_id', organizationId);

  if (error) throw error;

  const totalProposals = proposals?.length || 0;
  const draftProposals = proposals?.filter(p => p.status === 'Draft').length || 0;
  const sentProposals = proposals?.filter(p => p.status === 'Sent').length || 0;
  const approvedProposals = proposals?.filter(p => p.status === 'Approved').length || 0;
  const totalValue = proposals?.reduce((sum, p) => sum + (p.total_value || 0), 0) || 0;
  const approvalRate = sentProposals > 0 ? (approvedProposals / sentProposals) * 100 : 0;

  return {
    // New field names
    totalProposals,
    draftProposals,
    sentProposals,
    approvedProposals,
    totalValue,
    approvalRate,
    // Deprecated aliases for backward compatibility
    totalQuotes: totalProposals,
    submittedQuotes: sentProposals,
    wonQuotes: approvedProposals,
    winRate: approvalRate,
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
