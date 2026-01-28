/**
 * Centralized React Query Configuration
 *
 * This is the industry-standard approach (used by Stripe, Notion, Linear, etc.)
 * to handle async state management and eliminate race conditions.
 *
 * Benefits over manual state management:
 * - Automatic request deduplication
 * - Built-in race condition prevention
 * - Optimistic updates with automatic rollback
 * - Cache invalidation strategies
 * - Stale-while-revalidate pattern
 * - Background refetching
 * - Retry logic with exponential backoff
 *
 * This replaces manual:
 * - Request versioning
 * - Timestamp tracking
 * - Debouncing
 * - In-flight request management
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { handleErrorWithRecovery } from '@/utils/staleClientRecovery';

/**
 * Create a singleton QueryClient instance
 * Used throughout the app for all data fetching
 */
export const queryClient = new QueryClient({
  // React Query v5: Global error handlers moved to QueryCache and MutationCache
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Global error handler with automatic stale client recovery
      // This catches issues like "No Organization Available" when old JS runs after deployments
      // Only logs stale client errors to Sentry (prevents duplicate logging)
      handleErrorWithRecovery(error, queryClient);
    },
  }),

  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Global mutation error handler
      // Only logs stale client errors to Sentry (prevents duplicate logging)
      handleErrorWithRecovery(error, queryClient);
    },
  }),

  defaultOptions: {
    queries: {
      // Stale-while-revalidate: Show cached data immediately, refetch in background
      staleTime: 30 * 1000, // 30 seconds - data is "fresh" for this long
      gcTime: 5 * 60 * 1000, // 5 minutes - keep unused data in cache (was cacheTime)

      // Retry failed requests with exponential backoff
      retry: (failureCount, error) => {
        // Don't retry on auth errors (401, 403)
        if (error instanceof Error && error.message.includes('401')) return false;
        if (error instanceof Error && error.message.includes('403')) return false;

        // Retry network errors up to 3 times
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff

      // Refetch strategies
      refetchOnWindowFocus: true, // Refetch when user returns to tab
      refetchOnReconnect: true, // Refetch when internet reconnects
      refetchOnMount: true, // Refetch when component mounts (if data is stale)

      // Race condition prevention
      // React Query automatically handles:
      // - Deduplicates concurrent requests with same query key
      // - Cancels previous requests when new one starts
      // - Only applies the latest response

      // Error handling (v5 uses throwOnError instead of useErrorBoundary)
      throwOnError: false, // Don't throw errors to error boundary by default

      // Network mode
      networkMode: 'online', // Only run queries when online
    },
    mutations: {
      // Retry mutations less aggressively (writes are more dangerous)
      retry: 1,

      // Network mode for mutations
      networkMode: 'online',

      // Error handling (v5 uses throwOnError instead of useErrorBoundary)
      throwOnError: false,
    },
  },
});

/**
 * Query Keys Factory
 *
 * Centralized query key management prevents typos and enables
 * easy cache invalidation.
 *
 * Pattern: ['resource', 'operation', ...params]
 *
 */
export const queryKeys = {
  // Proposals
  proposals: {
    all: ['proposals'] as const,
    lists: () => [...queryKeys.proposals.all, 'list'] as const,
    list: (organizationId: string, filters?: any) =>
      [...queryKeys.proposals.lists(), organizationId, filters] as const,
    details: () => [...queryKeys.proposals.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.proposals.details(), id] as const,
  },

  // Organization
  organization: {
    all: ['organization'] as const,
    byUser: (userId: string) => [...queryKeys.organization.all, 'user', userId] as const,
    details: () => [...queryKeys.organization.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.organization.details(), id] as const,
    members: (organizationId: string) =>
      [...queryKeys.organization.all, 'members', organizationId] as const,
    invites: (organizationId: string) =>
      [...queryKeys.organization.all, 'invites', organizationId] as const,
    inviteTokens: (organizationId: string) =>
      [...queryKeys.organization.all, 'inviteTokens', organizationId] as const,
  },

  // Subscription
  subscription: {
    all: ['subscription'] as const,
    status: (organizationId: string) =>
      [...queryKeys.subscription.all, 'status', organizationId] as const,
  },

  // User/Auth
  user: {
    all: ['user'] as const,
    profile: (userId: string) => [...queryKeys.user.all, 'profile', userId] as const,
    session: () => [...queryKeys.user.all, 'session'] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    stats: (organizationId: string) =>
      [...queryKeys.dashboard.all, 'stats', organizationId] as const,
  },

  // Board
  board: {
    all: ['board'] as const,
    tasks: (organizationId: string) =>
      [...queryKeys.board.all, 'tasks', organizationId] as const,
  },

  // Integrations
  integrations: {
    all: ['integrations'] as const,
    available: (organizationPlan?: string) =>
      [...queryKeys.integrations.all, 'available', organizationPlan] as const,
    connected: (organizationId: string) =>
      [...queryKeys.integrations.all, 'connected', organizationId] as const,
  },

  // Notification Preferences
  notificationPreferences: {
    all: ['notificationPreferences'] as const,
    byUserOrg: (userId: string, organizationId: string) =>
      [...queryKeys.notificationPreferences.all, userId, organizationId] as const,
  },
} as const;

/**
 * Cache Invalidation Helpers
 *
 * These helpers make it easy to invalidate related queries
 * when data changes.
 */
export const invalidateQueries = {
  /**
   * Invalidate all proposals queries
   * Use after: create, update, delete proposal
   */
  allProposals: () => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
  },

  /**
   * Invalidate proposals list for specific organization
   * Use after: proposal status change, archive, etc.
   */
  proposalsList: (organizationId: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.proposals.list(organizationId)
    });
  },

  /**
   * Invalidate specific proposal detail
   * Use after: update proposal details
   */
  proposalDetail: (proposalId: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.proposals.detail(proposalId)
    });
  },

  /**
   * Invalidate all organization data
   * Use after: organization settings change
   */
  allOrganization: () => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.organization.all
    });
  },

  /**
   * Invalidate organization members
   * Use after: invite member, remove member, change role
   */
  organizationMembers: (organizationId: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.organization.members(organizationId)
    });
  },

  /**
   * Invalidate subscription status
   * Use after: subscription change detected via webhook
   */
  subscriptionStatus: (organizationId: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.subscription.status(organizationId)
    });
  },

  /**
   * Invalidate dashboard data
   * Use after: any proposal change
   */
  dashboard: (organizationId: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.stats(organizationId)
    });
  },

  /**
   * Invalidate all board data
   * Use after: project creation, proposal status change to Won
   */
  allBoard: () => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.board.all });
  },

  /**
   * Invalidate board tasks for specific organization
   * Use after: project updates, workflow changes
   */
  boardTasks: (organizationId: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.board.tasks(organizationId)
    });
  },

  /**
   * Invalidate available integrations
   * Use after: admin adds/updates/removes integration from catalog
   */
  availableIntegrations: () => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.integrations.all
    });
  },

  /**
   * Invalidate connected integrations for organization
   * Use after: connect/disconnect integration
   */
  connectedIntegrations: (organizationId: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.integrations.connected(organizationId)
    });
  },

  /**
   * Invalidate Google connection status
   * Use after: connect/disconnect Google Docs
   */
  googleConnection: (organizationId: string) => {
    return queryClient.invalidateQueries({
      queryKey: ['google-connection', organizationId]
    });
  },
};

/**
 * Prefetch Helpers
 *
 * Prefetch data before user navigates to avoid loading states
 */
export const prefetchQueries = {
  /**
   * Prefetch proposals list
   * Use: On dashboard mount, before navigating to proposals page
   */
  proposalsList: async (organizationId: string, fetchFn: () => Promise<any>) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.proposals.list(organizationId),
      queryFn: fetchFn,
      staleTime: 30 * 1000, // Consider fresh for 30 seconds
    });
  },

  /**
   * Prefetch organization members
   * Use: Before opening team management modal
   */
  organizationMembers: async (organizationId: string, fetchFn: () => Promise<any>) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.organization.members(organizationId),
      queryFn: fetchFn,
      staleTime: 60 * 1000, // Consider fresh for 1 minute
    });
  },
};

/**
 * Optimistic Update Helpers
 *
 * These provide type-safe optimistic updates
 */
export const optimisticUpdates = {
  /**
   * Optimistically update proposal status
   * Automatically rolls back on error
   */
  updateProposalStatus: (proposalId: string, newStatus: string) => {
    const queryKey = queryKeys.proposals.detail(proposalId);

    // Cancel outgoing refetches
    queryClient.cancelQueries({ queryKey });

    // Get current data for rollback
    const previousData = queryClient.getQueryData(queryKey);

    // Optimistically update
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return { ...old, status: newStatus };
    });

    // Return rollback function
    return () => queryClient.setQueryData(queryKey, previousData);
  },

  /**
   * Optimistically add new proposal to list
   */
  addProposal: (organizationId: string, newProposal: any) => {
    const queryKey = queryKeys.proposals.list(organizationId);

    queryClient.cancelQueries({ queryKey });
    const previousData = queryClient.getQueryData(queryKey);

    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return [newProposal];
      return [newProposal, ...old];
    });

    return () => queryClient.setQueryData(queryKey, previousData);
  },

  /**
   * Optimistically remove proposal from list
   */
  removeProposal: (organizationId: string, proposalId: string) => {
    const queryKey = queryKeys.proposals.list(organizationId);

    queryClient.cancelQueries({ queryKey });
    const previousData = queryClient.getQueryData(queryKey);

    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return old.filter((p: any) => p.id !== proposalId);
    });

    return () => queryClient.setQueryData(queryKey, previousData);
  },
};

/**
 * localStorage Persistence
 *
 * Persist React Query cache to localStorage for:
 * - Instant page loads (< 50ms from cache)
 * - Offline support
 * - Better user experience
 *
 * Strategy: Hybrid Persist (Option C from CACHING_STRATEGY_V2.0.0.md)
 * - 5 minute TTL (reasonable freshness)
 * - Version busting (clear cache on app updates)
 * - Exclude sensitive data (user sessions)
 */
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'REACT_QUERY_OFFLINE_CACHE', // Single localStorage key (replaces 10+ manual keys)
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 5 * 60 * 1000, // 5 minutes - balance between speed and freshness
  buster: 'v3.0.2-proposals-no-persist', // Clear cache on version change (update this when breaking changes)
  dehydrateOptions: {
    // Control what gets persisted
    shouldDehydrateQuery: (query) => {
      const queryKey = query.queryKey[0] as string;

      // Don't persist user sessions (security - prevent session fixation)
      if (queryKey === 'user' && query.queryKey[1] === 'session') {
        return false;
      }

      // Don't persist proposals - they change frequently and need realtime updates
      // This prevents deleted items from reappearing after refresh
      if (queryKey === 'proposals') {
        return false;
      }

      // Only persist successful queries (not pending, error, or loading)
      // This prevents race conditions where queries get cancelled mid-dehydration
      if (query.state.status !== 'success') {
        return false;
      }

      // Don't persist queries with no data (empty results)
      if (query.state.data === undefined) {
        return false;
      }

      // Persist everything else (organizations, members, subscription status)
      return true;
    },
  },
});

/**
 * Development Tools
 *
 * Helpers for debugging in development
 */
export const devTools = {
  /**
   * Log all queries in cache
   */
  logCache: () => {
    console.log('React Query Cache:', queryClient.getQueryCache().getAll());
  },

  /**
   * Clear all cache
   */
  clearCache: () => {
    queryClient.clear();
    console.log('React Query cache cleared');
  },

  /**
   * Get specific query data
   */
  getQueryData: (queryKey: any) => {
    return queryClient.getQueryData(queryKey);
  },

  /**
   * Clear persisted cache (localStorage)
   */
  clearPersistedCache: () => {
    localStorage.removeItem('REACT_QUERY_OFFLINE_CACHE');
    console.log('Persisted cache cleared from localStorage');
  },
};
