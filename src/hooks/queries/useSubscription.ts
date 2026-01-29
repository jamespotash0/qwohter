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
  inGracePeriod?: boolean;
  graceDaysRemaining?: number;
}> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_status, current_period_end, trial_end, has_payment_method')
      .eq('organization_id', organizationId)
      .single() as { data: {
        stripe_subscription_status: string | null;
        current_period_end: string | null;
        trial_end: string | null;
        has_payment_method: boolean;
      } | null; error: unknown };

    if (error || !data) {
      // No subscription found
      return {
        hasAccess: false,
        status: null,
        reason: 'No active subscription',
      };
    }

    const status = data.stripe_subscription_status?.toLowerCase();

    // Direct access for active/trialing
    const hasAccess = status === 'active' || status === 'trialing';

    if (hasAccess) {
      return {
        hasAccess: true,
        status: data.stripe_subscription_status,
        reason: '',
      };
    }

    // Grace period check for post-trial statuses (incomplete, incomplete_expired, past_due)
    const graceStatuses = ['incomplete', 'incomplete_expired', 'past_due'];
    if (status && graceStatuses.includes(status) && data.trial_end) {
      const now = new Date();
      const trialEndDate = new Date(data.trial_end);
      const gracePeriodEnd = new Date(trialEndDate.getTime() + (3 * 24 * 60 * 60 * 1000));
      const inGracePeriod = now <= gracePeriodEnd;
      const graceDaysRemaining = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (inGracePeriod) {
        return {
          hasAccess: true,
          status: data.stripe_subscription_status,
          reason: '',
          inGracePeriod: true,
          graceDaysRemaining: Math.max(0, graceDaysRemaining),
        };
      }
    }

    return {
      hasAccess: false,
      status: data.stripe_subscription_status,
      reason: 'Subscription is not active',
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
