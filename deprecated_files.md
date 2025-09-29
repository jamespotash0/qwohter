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