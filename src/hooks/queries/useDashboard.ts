/**
 * React Query Hooks for Dashboard
 *
 * Replaces manual dashboard data fetching
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryClient';

/**
 * Dashboard stats type
 */
export interface DashboardStats {
  totalProposals: number;
  submittedProposals: number;
  acceptedProposals: number;
  totalValue: number;
  winRate: number;
}

/**
 * Proposal activity type
 */
export interface ProposalActivity {
  id: string;
  proposal_id: string;
  action_type: string;
  performed_by: string;
  performed_by_name?: string;
  created_at: string;
  metadata?: any;
}

/**
 * Fetch dashboard stats
 */
async function fetchDashboardStats(organizationId: string): Promise<DashboardStats> {
  const { data: proposals, error } = await supabase
    .from('proposals')
    .select('proposal_status, total_value')
    .eq('organization_id', organizationId);

  if (error) throw error;

  const totalProposals = proposals?.length || 0;
  const submittedProposals = proposals?.filter(q => q.proposal_status === 'Submitted').length || 0;
  const acceptedProposals = proposals?.filter(q => q.proposal_status === 'Accepted').length || 0;
  const totalValue = proposals?.reduce((sum, q) => sum + (q.total_value || 0), 0) || 0;
  const winRate = submittedProposals > 0 ? (acceptedProposals / submittedProposals) * 100 : 0;

  return {
    totalProposals,
    submittedProposals,
    acceptedProposals,
    totalValue,
    winRate,
  };
}

/**
 * Fetch recent activities
 */
async function fetchRecentActivities(
  organizationId: string,
  limit: number = 10
): Promise<ProposalActivity[]> {
  const { data, error } = await supabase
    .from('proposal_activities')
    .select(`
      id,
      proposal_id,
      action_type,
      performed_by,
      created_at,
      metadata,
      profiles:performed_by (
        full_name
      )
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map(activity => ({
    id: activity.id,
    proposal_id: activity.proposal_id,
    action_type: activity.action_type,
    performed_by: activity.performed_by,
    performed_by_name: (activity.profiles as any)?.full_name,
    created_at: activity.created_at,
    metadata: activity.metadata,
  }));
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

/**
 * Hook: Use Recent Activities
 *
 * Fetches recent proposal activities for dashboard
 */
export function useRecentActivities(
  organizationId: string,
  limit: number = 10,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.dashboard.activities(organizationId, limit),
    queryFn: () => fetchRecentActivities(organizationId, limit),
    enabled: !!organizationId && enabled,
    staleTime: 10 * 1000, // 10 seconds - activities change frequently
  });
}
