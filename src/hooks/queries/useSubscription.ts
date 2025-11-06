/**
 * React Query Hooks for Subscription
 *
 * Replaces manual subscription checking with React Query
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryClient';

/**
 * Fetch subscription status for organization
 */
async function fetchSubscriptionStatus(organizationId: string): Promise<{
  hasAccess: boolean;
  status: string | null;
  reason: string;
}> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_status, current_period_end')
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      // No subscription found
      return {
        hasAccess: false,
        status: null,
        reason: 'No active subscription',
      };
    }

    // Case-insensitive comparison to match database trigger
    const hasAccess = data.stripe_subscription_status?.toLowerCase() === 'active' ||
                      data.stripe_subscription_status?.toLowerCase() === 'trialing';

    return {
      hasAccess,
      status: data.stripe_subscription_status,
      reason: hasAccess ? '' : 'Subscription is not active',
    };
  } catch (error) {
    return {
      hasAccess: false,
      status: null,
      reason: 'Unable to verify subscription status',
    };
  }
}

/**
 * Hook: Use Subscription Status
 *
 * Fetches and caches subscription status
 *
 * Usage:
 * ```tsx
 * const { data: subscription } = useSubscriptionStatus(organizationId);
 * if (subscription.hasAccess) {
 *   // Show content
 * }
 * ```
 */
export function useSubscriptionStatus(organizationId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.subscription.status(organizationId),
    queryFn: () => fetchSubscriptionStatus(organizationId),
    enabled: !!organizationId && enabled,
    staleTime: 60 * 1000, // 1 minute - subscription doesn't change often
    retry: 1, // Don't retry aggressively for subscription checks
  });
}
