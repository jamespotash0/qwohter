/**
 * React Query hooks for subscription access.
 *
 * The decision itself lives in `lib/billing/subscriptionAccess`; this reads the
 * row and caches the answer.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryClient';
import { evaluateSubscription, SubscriptionAccess, SubscriptionRow } from '@/lib/billing/subscriptionAccess';

export {
  evaluateSubscription,
  type SubscriptionRow,
  type SubscriptionAccess,
} from '@/lib/billing/subscriptionAccess';

/** Read the row and judge it. */
async function fetchSubscriptionStatus(
  organizationId: string
): Promise<SubscriptionAccess> {
  try {
    const { data, error } = (await supabase
      .from('subscriptions')
      .select(
        'stripe_subscription_status, current_period_end, trial_end, has_payment_method, grace_period_end, access_blocked_reason'
      )
      .eq('organization_id', organizationId)
      .single()) as { data: SubscriptionRow | null; error: unknown };

    // `.single()` errors when there is no row, which is the ordinary state for
    // an organization created seconds ago rather than a fault.
    if (error || !data) return evaluateSubscription(null);

    return evaluateSubscription(data);
  } catch (error) {
    // Could not ask, which is not the same as being told no. Flagged as
    // provisioning so a network blip shows the setup spinner rather than
    // telling a paying customer they have no subscription. The caller's grace
    // window is time-bounded, so a persistent failure still ends at the paywall.
    console.error('[useSubscription] status check failed:', error);
    return {
      hasAccess: false,
      status: null,
      reason: 'Unable to verify subscription status',
      provisioning: true,
    };
  }
}

/**
 * Hook: Use Subscription Status
 *
 * Usage:
 * ```tsx
 * const { data: subscription } = useSubscriptionStatus(organizationId);
 * if (subscription.hasAccess) {
 *   // Show content
 * }
 * ```
 */
export function useSubscriptionStatus(
  organizationId: string,
  enabled: boolean = true,
  options: { pollWhileProvisioning?: boolean } = {}
) {
  const { pollWhileProvisioning = false } = options;

  return useQuery({
    queryKey: queryKeys.subscription.status(organizationId),
    queryFn: () => fetchSubscriptionStatus(organizationId),
    enabled: !!organizationId && enabled,
    staleTime: 60 * 1000, // 1 minute - subscription doesn't change often
    retry: 1, // Don't retry aggressively for subscription checks
    // Right after signup the trial row is still being written by
    // create-trial-subscription. Poll instead of showing a paywall.
    refetchInterval: query =>
      pollWhileProvisioning && query.state.data?.provisioning ? 2000 : false,
  });
}
