# Deprecated Files

This document tracks files that have been deprecated and replaced in the Wall Quote Wizard application.

## useQuotes.ts
**File:** `src/hooks/useQuotes.ts`
**Deprecated:** September 28, 2025
**Replacement:** `src/stores/quotes/quotesStore.ts`

**Reason for Deprecation:**
Migrated from React custom hook pattern to Zustand state management for better performance and centralized state handling. The custom hook pattern was causing unnecessary re-renders and made state management across components more complex.

**Migration Details:**
- All functionality moved to Zustand store
- Creator name fetching and profile lookups migrated
- Wall system operations (update/remove) migrated
- Quote customization and download tracking migrated
- Type exports moved to store file

**Status:** Fully commented out, all references updated

## pageBreakManager.ts
**File:** `src/utils/pageBreakManager.ts`
**Deprecated:** September 28, 2025
**Replacement:** `src/utils/dynamicPageBreakManager.ts`

**Reason for Deprecation:**
Replaced by enhanced dynamic page break system with better performance, caching, and content analysis. The original PageBreakManager class had limitations in handling complex layouts and lacked optimization features.

**Migration Details:**
- Enhanced DynamicPageBreakManager provides better content splitting
- Improved caching mechanism for performance
- Better handling of panels and terms sections
- More sophisticated page break calculations
- All existing functionality preserved in newer implementation

**Status:** Fully commented out, no active references found

## QuoteFilters.tsx
**File:** `src/components/features/quotes/table/QuoteFilters.tsx`
**Deprecated:** September 28, 2025
**Replacement:** `src/components/features/quotes/table/components/TableFilters.tsx` + `EnhancedSearchInput.tsx`

**Reason for Deprecation:**
Replaced by enhanced filtering system with Fuse.js-powered search, field-specific search capabilities, and better user experience. The original component had basic text search without fuzzy matching, suggestions, or advanced features.

**Migration Details:**
- Enhanced search with Fuse.js replaces basic text matching
- Field-specific search syntax (e.g., "client:ABC Corp")
- Auto-suggestions from existing data
- Help system with clickable examples
- Visual feedback for field-specific searches
- Better integration with TanStack Table

**Status:** Fully commented out, no active references found

## QuotePagination.tsx
**File:** `src/components/features/quotes/table/QuotePagination.tsx`
**Deprecated:** September 28, 2025
**Replacement:** `src/components/features/quotes/table/components/PaginationControls.tsx`

**Reason for Deprecation:**
Replaced by TanStack Table-integrated pagination component with better state management and consistent interface. The original component used custom pagination logic that didn't integrate well with the table state.

**Migration Details:**
- Direct integration with TanStack Table pagination state
- Consistent prop interface with table components
- Better page navigation with first/last page buttons
- Integrated page size selection
- Results count display
- Disabled state handling for navigation buttons

**Status:** Fully commented out, no active references found