/**
 * Global Subscription Manager
 *
 * Centralized management of Supabase realtime subscriptions to prevent:
 * - Duplicate subscriptions (Issue #8 from race condition analysis)
 * - Orphaned subscriptions on navigation
 * - Memory leaks from uncleaned listeners
 * - Race conditions from multiple subscriptions to same resource
 *
 * BEFORE (Decentralized):
 * - Each page/component created its own realtime subscription
 * - Navigating between pages left orphaned subscriptions
 * - Same resource could have 2+ subscriptions (duplicate events)
 * - No coordination → race conditions
 *
 * AFTER (Centralized):
 * - Single subscription per resource (deduplication)
 * - Automatic cleanup on unsubscribe
 * - Reference counting (only unsubscribe when no listeners)
 * - Coordinated with React Query for cache updates
 */

import { supabase } from '@/integrations/supabase/client';
import { queryClient, queryKeys, invalidateQueries } from '@/lib/queryClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Subscription types (string type for flexibility)
 */
export type SubscriptionType = string;
// export type SubscriptionType = 'quotes' | 'members' | 'subscriptions' | 'activities';

/**
 * Payload from Supabase realtime
 */
export interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
}

/**
 * Subscription configuration
 */
interface SubscriptionConfig {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onUpdate?: (payload: RealtimePayload) => void | Promise<void>;
}

/**
 * Active subscription tracking
 */
interface ActiveSubscription {
  channel: RealtimeChannel;
  refCount: number;
  config: SubscriptionConfig;
}

/**
 * Singleton Subscription Manager
 *
 * Manages all realtime subscriptions globally
 */
class SubscriptionManager {
  private subscriptions = new Map<string, ActiveSubscription>();

  /**
   * Subscribe to realtime updates
   *
   * Automatically deduplicates subscriptions to same resource
   *
   * Usage (with custom onUpdate):
   * ```tsx
   * useEffect(() => {
   *   const unsubscribe = subscriptionManager.subscribe(
   *     'board-projects',
   *     organizationId,
   *     'projects',
   *     {
   *       filter: `organization_id=eq.${organizationId}`,
   *       onUpdate: (payload) => {
   *         if (payload.eventType === 'INSERT') {
   *           // Handle insert
   *         }
   *       }
   *     }
   *   );
   *
   *   return unsubscribe;
   * }, [organizationId]);
   * ```
   *
   * Usage (with built-in handlers for quotes/members/subscriptions/activities):
   * ```tsx
   * useEffect(() => {
   *   const unsubscribe = subscriptionManager.subscribe(
   *     'quotes',
   *     organizationId,
   *     'quotes',
   *     { filter: `organization_id=eq.${organizationId}` }
   *   );
   *
   *   return unsubscribe;
   * }, [organizationId]);
   * ```
   */
  subscribe(
    type: SubscriptionType,
    resourceId: string,
    table: string,
    config?: Partial<SubscriptionConfig>
  ): () => void {
    const key = this.getSubscriptionKey(type, resourceId);

    // If subscription already exists, increment ref count
    const existing = this.subscriptions.get(key);
    if (existing) {
      existing.refCount++;
      console.log(`♻️ Reusing existing ${type} subscription (ref count: ${existing.refCount})`);

      // Return unsubscribe function
      return () => this.unsubscribe(type, resourceId);
    }

    // Create new subscription
    console.log(`📡 Creating new ${type} subscription for ${resourceId}`);

    const fullConfig: SubscriptionConfig = {
      table,
      event: '*',
      ...config,
    };

    // Create channel with proper postgres_changes subscription
    let channelInstance = supabase.channel(`${type}-${resourceId}`);

    // Build the postgres_changes config
    const postgresChangesConfig: any = {
      event: fullConfig.event || '*',
      schema: 'public',
      table: fullConfig.table,
    };

    // Only add filter if it's defined
    if (fullConfig.filter) {
      postgresChangesConfig.filter = fullConfig.filter;
    }

    // Subscribe to postgres_changes
    channelInstance = channelInstance.on(
      'postgres_changes' as any,
      postgresChangesConfig,
      (payload: any) => this.handleRealtimeEvent(type, resourceId, payload)
    );

    // Subscribe to the channel
    const channel = channelInstance.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ ${type} subscription active for ${resourceId}`);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(`❌ ${type} subscription failed:`, status);
      }
    });

    // Store subscription
    this.subscriptions.set(key, {
      channel,
      refCount: 1,
      config: fullConfig,
    });

    // Return unsubscribe function
    return () => this.unsubscribe(type, resourceId);
  }

  /**
   * Unsubscribe from realtime updates
   *
   * Uses reference counting - only actually unsubscribes when refCount hits 0
   */
  private unsubscribe(type: SubscriptionType, resourceId: string) {
    const key = this.getSubscriptionKey(type, resourceId);
    const subscription = this.subscriptions.get(key);

    if (!subscription) {
      console.warn(`⚠️ Attempted to unsubscribe from non-existent ${type} subscription`);
      return;
    }

    // Decrement ref count
    subscription.refCount--;
    console.log(`🔽 ${type} subscription ref count: ${subscription.refCount}`);

    // Only actually unsubscribe when refCount hits 0
    if (subscription.refCount <= 0) {
      console.log(`🧹 Cleaning up ${type} subscription for ${resourceId}`);
      supabase.removeChannel(subscription.channel);
      this.subscriptions.delete(key);
    }
  }

  /**
   * Handle realtime event and update React Query cache
   */
  private async handleRealtimeEvent(
    type: SubscriptionType,
    resourceId: string,
    payload: any
  ) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    console.log(`📡 Realtime ${eventType} for ${type}:`, resourceId);

    const key = this.getSubscriptionKey(type, resourceId);
    const subscription = this.subscriptions.get(key);

    // If custom onUpdate callback provided, use it
    if (subscription?.config.onUpdate) {
      const realtimePayload: RealtimePayload = {
        eventType,
        new: newRecord,
        old: oldRecord,
      };
      await subscription.config.onUpdate(realtimePayload);
      return;
    }

    // Otherwise, fall back to hardcoded handlers for backward compatibility
    switch (type) {
      case 'quotes':
        this.handleQuotesEvent(resourceId, eventType, newRecord, oldRecord);
        break;

      case 'members':
        this.handleMembersEvent(resourceId, eventType, newRecord, oldRecord);
        break;

      case 'subscriptions':
        this.handleSubscriptionEvent(resourceId, eventType, newRecord, oldRecord);
        break;

      case 'activities':
        this.handleActivitiesEvent(resourceId, eventType, newRecord, oldRecord);
        break;

      default:
        console.warn(`⚠️ No handler for subscription type '${type}'. Consider providing an onUpdate callback.`);
    }
  }

  /**
   * Handle quotes realtime events
   */
  private handleQuotesEvent(
    organizationId: string,
    eventType: string,
    newRecord: any,
    oldRecord: any
  ) {
    const queryKey = queryKeys.quotes.list(organizationId);

    switch (eventType) {
      case 'INSERT':
        // Add new quote to cache
        queryClient.setQueryData(queryKey, (old: any[] = []) => {
          const exists = old.some((q) => q.id === newRecord.id);
          if (exists) return old;
          return [newRecord, ...old];
        });
        break;

      case 'UPDATE':
        // Update quote in cache
        queryClient.setQueryData(queryKey, (old: any[] = []) =>
          old.map((q) => (q.id === newRecord.id ? newRecord : q))
        );

        // Also update detail cache if exists
        queryClient.setQueryData(
          queryKeys.quotes.detail(newRecord.id),
          newRecord
        );
        break;

      case 'DELETE':
        // Remove quote from cache
        queryClient.setQueryData(queryKey, (old: any[] = []) =>
          old.filter((q) => q.id !== oldRecord.id)
        );
        break;
    }

    // Also invalidate dashboard stats (quotes affect analytics)
    invalidateQueries.dashboard(organizationId);
  }

  /**
   * Handle members realtime events
   */
  private async handleMembersEvent(
    organizationId: string,
    eventType: string,
    newRecord: any,
    oldRecord: any
  ) {
    // For members, we refetch to ensure we have profiles
    // React Query will deduplicate concurrent refetches automatically
    await invalidateQueries.organizationMembers(organizationId);
  }

  /**
   * Handle subscription status events
   */
  private handleSubscriptionEvent(
    organizationId: string,
    eventType: string,
    newRecord: any,
    oldRecord: any
  ) {
    // Invalidate subscription status
    invalidateQueries.subscriptionStatus(organizationId);

    // Show toast if subscription status changed
    if (eventType === 'UPDATE' && oldRecord.status !== newRecord.status) {
      if (newRecord.status === 'active') {
        console.log('Subscription activated');
      } else if (newRecord.status === 'canceled' || newRecord.status === 'unpaid') {
        console.log('Subscription ended');
      }
    }
  }

  /**
   * Handle activities realtime events
   */
  private handleActivitiesEvent(
    organizationId: string,
    eventType: string,
    newRecord: any,
    oldRecord: any
  ) {
    if (eventType === 'INSERT') {
      // Prepend new activity to cache
      const queryKey = queryKeys.dashboard.activities(organizationId);

      queryClient.setQueryData(queryKey, (old: any[] = []) => {
        const exists = old.some((a) => a.id === newRecord.id);
        if (exists) return old;
        return [newRecord, ...old];
      });
    }
  }

  /**
   * Get subscription key for deduplication
   */
  private getSubscriptionKey(type: SubscriptionType, resourceId: string): string {
    return `${type}:${resourceId}`;
  }

  /**
   * Unsubscribe from all subscriptions (for logout)
   */
  unsubscribeAll() {
    console.log('🧹 Cleaning up all subscriptions');

    for (const [key, subscription] of this.subscriptions) {
      supabase.removeChannel(subscription.channel);
    }

    this.subscriptions.clear();
  }

  /**
   * Get active subscriptions (for debugging)
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Get subscription count (for debugging)
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}

// Export singleton instance
export const subscriptionManager = new SubscriptionManager();
