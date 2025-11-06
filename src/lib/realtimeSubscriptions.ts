/**
 * Realtime Subscription Manager for React Query
 *
 * Integrates Supabase Realtime with React Query's cache invalidation.
 * When database changes occur, automatically invalidates React Query cache.
 *
 * Usage:
 * ```typescript
 * useEffect(() => {
 *   const unsubscribe = subscribeToTableChanges(
 *     'quotes',
 *     queryClient,
 *     ['quotes', 'list', userId]
 *   );
 *   return unsubscribe;
 * }, [userId]);
 * ```
 */

import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

type TableName = 'quotes' | 'reminders' | 'projects' | 'organizations' | 'memberships' | 'subscriptions';

interface SubscriptionOptions {
  /**
   * Filter for postgres_changes events
   * Example: `organization_id=eq.${orgId}`
   */
  filter?: string;

  /**
   * Events to listen to
   * Default: ['INSERT', 'UPDATE', 'DELETE']
   */
  events?: ('INSERT' | 'UPDATE' | 'DELETE')[];

  /**
   * Debounce delay in ms before invalidating cache
   * Default: 100ms
   */
  debounceMs?: number;
}

/**
 * Subscribe to a Supabase table and auto-invalidate React Query cache
 *
 * @param table - Table name to subscribe to
 * @param queryClient - React Query client instance
 * @param queryKey - Query key to invalidate on changes
 * @param options - Subscription options
 * @returns Cleanup function to unsubscribe
 */
export function subscribeToTableChanges(
  table: TableName,
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  options: SubscriptionOptions = {}
): () => void {
  const {
    filter,
    events = ['INSERT', 'UPDATE', 'DELETE'],
    debounceMs = 100,
  } = options;

  let debounceTimeout: NodeJS.Timeout | null = null;
  let channel: RealtimeChannel | null = null;

  const invalidateCache = () => {
    // Debounce to avoid excessive invalidations
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    debounceTimeout = setTimeout(() => {
      console.log(`🔄 Realtime: Invalidating cache for`, queryKey);
      queryClient.invalidateQueries({ queryKey });
    }, debounceMs);
  };

  // Create unique channel name
  const channelName = `realtime_${table}_${JSON.stringify(queryKey)}`;

  // Subscribe to changes
  channel = supabase.channel(channelName);

  events.forEach((event) => {
    const config: any = {
      event,
      schema: 'public',
      table,
    };

    if (filter) {
      config.filter = filter;
    }

    channel!.on('postgres_changes', config, (payload) => {
      console.log(`🔔 Realtime ${event} on ${table}:`, payload);
      invalidateCache();
    });
  });

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log(`✅ Realtime: Subscribed to ${table}`, { filter, queryKey });
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.warn(
        `⚠️ Realtime: Connection failed for ${table} (${status}).\n` +
        `This is non-critical - the app will continue to work with regular polling.\n` +
        `Possible causes:\n` +
        `1. RLS policies may need SELECT permission for authenticated users\n` +
        `2. Check Supabase Dashboard → Database → Replication → ${table} table\n` +
        `3. Ensure realtime is enabled for INSERT, UPDATE, DELETE events`
      );
    }
  });

  // Return cleanup function
  return () => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    if (channel) {
      console.log(`🧹 Realtime: Unsubscribing from ${table}`);
      supabase.removeChannel(channel);
    }
  };
}

/**
 * Hook-friendly wrapper for realtime subscriptions
 *
 * Usage:
 * ```typescript
 * useRealtimeSubscription('quotes', ['quotes', 'list', userId], {
 *   filter: `organization_id=eq.${orgId}`
 * });
 * ```
 */
export function useRealtimeSubscription(
  table: TableName,
  queryKey: readonly unknown[],
  options: SubscriptionOptions = {},
  enabled: boolean = true
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribeToTableChanges(
      table,
      queryClient,
      queryKey,
      options
    );

    return unsubscribe;
  }, [table, JSON.stringify(queryKey), JSON.stringify(options), enabled]);
}

// Re-export for convenience
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
