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
 * Quote activity type
 */
export interface QuoteActivity {
  id: string;
  quote_id: string;
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
 * Fetch recent activities
 */
async function fetchRecentActivities(
  organizationId: string,
  limit: number = 10
): Promise<QuoteActivity[]> {
  const { data, error } = await supabase
    .from('quote_activities')
    .select(`
      id,
      quote_id,
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
    quote_id: activity.quote_id,
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

/**
 * Hook: Use Recent Activities
 *
 * Fetches recent quote activities for dashboard
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
