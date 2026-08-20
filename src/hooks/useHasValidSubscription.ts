/**
 * useHasValidSubscription
 *
 * Whether the current organization has a subscription that unlocks the paid
 * settings sections. Both the settings secondary sidebar and the Settings page
 * call this, so it goes through React Query to share a single fetch, and stays
 * current via the realtime subscriptions channel.
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/auth';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { stripeService } from '@/services/stripeService';
import { useRealtimeSubscription } from '@/lib/realtimeSubscriptions';

const CACHE_KEY = 'settings_subscription_valid';
const QUERY_KEY = 'subscription-valid';

/** Seeded from localStorage so paid sections don't flash out and back in */
function readCachedValidity(): boolean {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : true; // Default to true so sections show initially
  } catch {
    return true;
  }
}

function writeCachedValidity(isValid: boolean) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(isValid));
  } catch (e) {
    console.error('Failed to cache subscription status:', e);
  }
}

export function useHasValidSubscription(): boolean {
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id || '');
  const organizationId = organization?.id;
  const queryClient = useQueryClient();

  // Centralized realtime subscription for the subscriptions table. The channel
  // registry dedupes, so multiple callers are safe.
  useRealtimeSubscription(
    'subscriptions',
    ['subscriptions', organizationId || ''],
    { filter: `organization_id=eq.${organizationId}` },
    !!organizationId
  );

  const { data } = useQuery({
    queryKey: [QUERY_KEY, organizationId],
    queryFn: async () => {
      const { isValid } = await stripeService.hasValidSubscription(organizationId!);
      writeCachedValidity(isValid);
      return isValid;
    },
    enabled: !!organizationId,
    placeholderData: readCachedValidity,
  });

  // Realtime invalidates ['subscriptions', orgId]; mirror that onto this query
  useEffect(() => {
    if (!organizationId) return;

    return queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey[0] === 'subscriptions' && event?.query.queryKey[1] === organizationId) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
      }
    });
  }, [organizationId, queryClient]);

  return data ?? true;
}
