/**
 * @deprecated This store has been migrated to React Query
 * Use hooks from @/hooks/queries instead
 *
 * Migration:
 * - import { useQuotes, useCreateQuote, useUpdateQuote } from '@/hooks/queries/useQuotes'
 * - const { data: quotes = [] } = useQuotes(userId)
 * - const { mutate: createQuote } = useCreateQuote()
 * - const { mutate: updateQuote } = useUpdateQuote()
 *
 * Types and deprecated hooks are exported for backward compatibility
 */

// Re-export types from service layer
export type { Quote, QuoteFilters, CreateQuoteData, UpdateQuoteData } from '@/services/quotesService';

// Re-export React Query hooks for backward compatibility
export {
  useQuotes,
  useQuote,
  useCreateQuote,
  useUpdateQuote,
  useDeleteQuote,
} from '@/hooks/queries/useQuotes';

// Legacy alias for backward compatibility
export { useQuotes as useQuotesStore } from '@/hooks/queries/useQuotes';
