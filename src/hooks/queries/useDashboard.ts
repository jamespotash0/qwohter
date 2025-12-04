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
  totalQuotes: number;
  submittedQuotes: number;
  wonQuotes: number;
  totalValue: number;
  winRate: number;
}

/**
 * Fetch dashboard stats
 */
async function fetchDashboardStats(organizationId: string): Promise<DashboardStats> {
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('status, total_value')
    .eq('organization_id', organizationId);

  if (error) throw error;

  const totalQuotes = quotes?.length || 0;
  const submittedQuotes = quotes?.filter(q => q.status === 'Submitted').length || 0;
  const wonQuotes = quotes?.filter(q => q.status === 'Won').length || 0;
  const totalValue = quotes?.reduce((sum, q) => sum + (q.total_value || 0), 0) || 0;
  const winRate = submittedQuotes > 0 ? (wonQuotes / submittedQuotes) * 100 : 0;

  return {
    totalQuotes,
    submittedQuotes,
    wonQuotes,
    totalValue,
    winRate,
  };
}

/**
 * Hook: Use Dashboard Stats
 *
 * Fetches aggregated quote statistics
 */
export function useDashboardStats(organizationId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(organizationId),
    queryFn: () => fetchDashboardStats(organizationId),
    enabled: !!organizationId && enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}
