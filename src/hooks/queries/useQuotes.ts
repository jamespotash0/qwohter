/**
 * @deprecated These hooks are DEPRECATED. Use useProposals.ts instead.
 *
 * The "quotes" table is being replaced by the "proposals" table which integrates
 * with the new form-builder system. These hooks will be removed in a future version.
 *
 * Migration:
 * - OLD: const { data: quotes } = useQuotes(userId)
 * - NEW: const { data: proposals } = useProposals(organizationId)
 *
 * See: src/hooks/queries/useProposals.ts
 * See: src/services/proposalsService.ts
 *
 * ============================================================================
 * DEPRECATED - DO NOT USE FOR NEW FEATURES
 * ============================================================================
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateQueries, optimisticUpdates } from '@/lib/queryClient';
import { useRealtimeSubscription } from '@/lib/realtimeSubscriptions';
import { toast } from 'sonner';
import type { Quote } from '@/services/quotesService';
import {
  fetchQuotes,
  fetchQuoteById,
  createQuote,
  updateQuote,
  deleteQuote,
  archiveQuote,
  unarchiveQuote,
  updateQuoteStatus as updateQuoteStatusService,
  setMainVersion as setMainVersionService,
  createQuoteVersion,
  type CreateQuoteData,
  type UpdateQuoteData,
  type QuoteFilters,
} from '@/services/quotesService';

/**
 * Hook: Use Quotes List
 *
 * Automatically fetches and caches quotes with race condition prevention
 * Includes realtime subscriptions for automatic updates
 *
 * Usage:
 * ```tsx
 * const { data: quotes, isLoading, error } = useQuotes(userId, filters);
 * ```
 */
export function useQuotes(
  userId?: string,
  filters?: QuoteFilters,
  enabled: boolean = true
) {
  const queryKey = queryKeys.quotes.list(userId || '', filters);

  // Set up realtime subscription for quotes
  useRealtimeSubscription(
    'quotes',
    queryKey,
    {}, // No filter - client-side filtering based on user's org memberships
    !!userId && enabled
  );

  return useQuery({
    queryKey,
    queryFn: () => fetchQuotes(userId!, filters),
    enabled: !!userId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes - changes frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Keep data fresh
    // React Query automatically:
    // - Deduplicates concurrent requests
    // - Cancels stale requests
    // - Refetches on window focus
    // - Prevents race conditions
    // + Realtime subscriptions for instant updates!
  });
}

/**
 * Hook: Use Quote Detail
 *
 * Fetch a single quote by ID
 */
export function useQuote(quoteId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.quotes.detail(quoteId),
    queryFn: () => fetchQuoteById(quoteId),
    enabled: !!quoteId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - single quote changes less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook: Create Quote Mutation
 *
 * Creates a new quote with optimistic updates
 *
 * Usage:
 * ```tsx
 * const createQuote = useCreateQuote();
 * createQuote.mutate(quoteData, {
 *   onSuccess: (newQuote) => console.log('Created:', newQuote.id)
 * });
 * ```
 */
export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteData: CreateQuoteData) => {
      return createQuote(quoteData);
    },

    // On success: Invalidate quotes list
    onSuccess: () => {
      toast.success('Quote created successfully');

      // Invalidate all quotes lists to refresh the table
      invalidateQueries.allQuotes();
    },

    // On error: Show error message
    onError: (error) => {
      toast.error('Failed to create quote: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });
}

/**
 * Hook: Update Quote Mutation
 *
 * Updates a quote with optimistic updates
 */
export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateQuoteData }) => {
      return updateQuote(id, updates);
    },

    // Optimistic update
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.quotes.detail(id) });

      // Snapshot previous value
      const previousQuote = queryClient.getQueryData(queryKeys.quotes.detail(id));

      // Optimistically update
      queryClient.setQueryData(queryKeys.quotes.detail(id), (old: Quote | undefined) => {
        if (!old) return old;
        return { ...old, ...updates };
      });

      return { previousQuote, id };
    },

    onSuccess: (data, variables) => {
      // Silent update - toasts are handled by calling pages (Quotes table, etc.)
      // Editor pages show their own "Quote Saved" toast
      // Download tracking is completely silent

      // Invalidate all quotes lists to refresh the table
      invalidateQueries.allQuotes();
    },

    onError: (error, variables, context) => {
      if (context?.previousQuote && context?.id) {
        queryClient.setQueryData(
          queryKeys.quotes.detail(context.id),
          context.previousQuote
        );
      }

      // Silent error - errors are handled by calling pages
      console.error('Failed to update quote:', error);
    },
  });
}

/**
 * Hook: Delete Quote Mutation
 *
 * Deletes a quote with optimistic update
 */
export function useDeleteQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteId: string) => {
      await deleteQuote(quoteId);
      return quoteId;
    },

    // Optimistic update: Remove from list immediately
    onMutate: async (quoteId) => {
      // Find the quote in ALL cached lists to get organization_id
      const cacheData = queryClient.getQueriesData<Quote[]>({ queryKey: ['quotes', 'list'] });

      let organizationId: string | undefined;
      let previousQuotes: Quote[] | undefined;

      for (const [queryKey, quotes] of cacheData) {
        if (quotes) {
          const quote = quotes.find(q => q.id === quoteId);
          if (quote) {
            organizationId = quote.organization_id;
            previousQuotes = quotes;

            // Cancel outgoing refetches for this specific list
            await queryClient.cancelQueries({ queryKey });

            // Optimistically remove from this list
            queryClient.setQueryData(queryKey, quotes.filter((q) => q.id !== quoteId));
            break;
          }
        }
      }

      return { previousQuotes, organizationId, quoteId };
    },

    onSuccess: () => {
      toast.success('Quote deleted successfully');

      // Invalidate all quotes lists to refresh the table
      invalidateQueries.allQuotes();
    },

    onError: (error, variables, context) => {
      console.error('Delete quote error:', error);

      if (context?.previousQuotes && context?.organizationId) {
        queryClient.setQueryData(
          queryKeys.quotes.list(context.organizationId),
          context.previousQuotes
        );
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to delete quote: ${errorMessage}`);
    },
  });
}

/**
 * Hook: Update Quote Status
 *
 * Specialized mutation for status updates with optimistic UI
 */
export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quoteId, status }: { quoteId: string; status: string }) => {
      return updateQuoteStatusService(quoteId, status);
    },

    onMutate: async ({ quoteId, status }) => {
      // Use optimistic update helper
      const rollback = optimisticUpdates.updateQuoteStatus(quoteId, status);

      return { rollback, quoteId };
    },

    onSuccess: () => {
      toast.success('Quote status updated successfully');
      // Invalidate all quotes lists to refresh the table
      invalidateQueries.allQuotes();
      // Also invalidate board queries in case a project was created (Won status)
      invalidateQueries.allBoard();
    },

    onError: (error, variables, context) => {
      context?.rollback?.();
      toast.error('Failed to update quote status');
    },
  });
}

/**
 * Hook: Archive Quote
 *
 * Archives a quote with optimistic updates
 */
export function useArchiveQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteId: string) => {
      return archiveQuote(quoteId);
    },
    onSuccess: () => {
      toast.success('Quote archived successfully');
      // Invalidate all quotes lists to refresh both active and archived views
      invalidateQueries.allQuotes();
    },
    onError: (error) => {
      console.error('Archive quote error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to archive quote: ${errorMessage}`);
    },
  });
}

/**
 * Hook: Unarchive Quote
 *
 * Unarchives a quote with optimistic updates
 */
export function useUnarchiveQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteId: string) => {
      return unarchiveQuote(quoteId);
    },
    onSuccess: () => {
      toast.success('Quote unarchived successfully');
      // Invalidate all quotes lists to refresh both active and archived views
      invalidateQueries.allQuotes();
    },
    onError: (error) => {
      console.error('Unarchive quote error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to unarchive quote: ${errorMessage}`);
    },
  });
}

/**
 * Hook: Set Main Version
 *
 * Sets a quote as the main version in its version group
 */
export function useSetMainVersion() {
  return useMutation({
    mutationFn: async ({ quoteId, baseProposalNumber }: { quoteId: string; baseProposalNumber: string }) => {
      return setMainVersionService(quoteId, baseProposalNumber);
    },
    onSuccess: () => {
      toast.success('Main version updated');
      // Invalidate all quotes lists to refresh the data
      invalidateQueries.allQuotes();
    },
    onError: (error) => {
      toast.error('Failed to set main version');
    },
  });
}

/**
 * Hook: Create Quote Version
 *
 * Creates a new version of an existing quote
 */
export function useCreateQuoteVersion() {
  return useMutation({
    mutationFn: async ({
      quoteId,
      newProposalNumber,
      versionNumber
    }: {
      quoteId: string;
      newProposalNumber: string;
      versionNumber: number;
    }) => {
      return createQuoteVersion(quoteId, newProposalNumber, versionNumber);
    },
    onSuccess: () => {
      toast.success('Quote version created successfully');
      // Invalidate all quotes lists to refresh the table
      invalidateQueries.allQuotes();
    },
    onError: (error) => {
      console.error('Create version error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to create version: ${errorMessage}`);
    },
  });
}
