/**
 * @deprecated This store has been migrated to React Query
 * Use hooks from @/hooks/queries instead
 *
 * Migration:
 * - import { useQuotes, useCreateQuote, useUpdateQuote } from '@/hooks/queries'
 * - const { data: quotes } = useQuotes(userId)
 * - const { mutate: createQuote } = useCreateQuote()
 * - const { mutate: updateQuote } = useUpdateQuote()
 *
 * Types and deprecated hooks are exported for backward compatibility
 */

// Re-export types from service layer
export type { Quote, QuoteFilters, CreateQuoteData, UpdateQuoteData } from '@/services/quotesService';

// Deprecated: These should use React Query hooks instead
export { useQuotes as useQuotesStore } from '@/hooks/queries';

// Deprecated: Use useQuote(quoteId) instead
export const useCurrentQuote = () => {
  console.warn('useCurrentQuote is deprecated. Use useQuote(quoteId) from @/hooks/queries instead');
  return null;
};
