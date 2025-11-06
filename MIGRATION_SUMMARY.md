# Database Column Rename: version → document_version

## Summary
Renamed the `version` column in the `quotes` table to `document_version` to avoid confusion with other version-related fields (app version, proposal versioning).

## Files Modified

### 1. Database Migration
- **File**: `supabase/migrations/20250104000001_rename_version_to_document_version.sql`
- **Action**: Created SQL migration script to rename the column
- **To Apply**: Run `npx supabase migration up`

### 2. TypeScript Database Types
- **File**: `src/integrations/supabase/types.ts`
- **Changes**:
  - Line 20: `version: number` → `document_version: number` (Row type)
  - Line 49: `version?: number` → `document_version?: number` (Insert type)
  - Line 75: `version?: number` → `document_version?: number` (Update type)

### 3. Service Layer
- **File**: `src/services/quotesService.ts`
- **Changes**:
  - Line 53: `version?: number` → `document_version?: number` (UpdateQuoteData interface)
  - Line 101: `version, created_at` → `document_version, created_at` (SELECT query #1)
  - Line 129: `version, created_at` → `document_version, created_at` (SELECT query #2)
  - Line 342: `version: versionNumber` → `document_version: versionNumber` (INSERT in createQuoteVersion)

### 4. Document Version Syncing
- **File**: `src/pages/QuoteEdit.tsx`
- **Changes**:
  - Lines 52-69: Updated `saveQuoteCustomization()` to increment `document_version` when customizations change
  - Line 175: Pass current `document_version` to `saveQuoteCustomization()`
- **Behavior**:
  - When customizations are saved, `document_version` is incremented
  - The new `document_version` is stored in both:
    1. The `document_version` column in the database
    2. The `customization.version` field in the JSONB customization object
  - This creates an audit trail of document changes

## NOT Changed (These are separate concerns)

### Proposal Versioning
- **File**: `src/utils/proposalNumberGenerator.ts`
- **Field**: `version` in ProposalNumberInfo interface
- **Purpose**: Tracks proposal version numbers (e.g., P100001.1 = version 1)
- **Status**: NO CHANGE NEEDED - This is proposal versioning, not document versioning

### Customization Versioning
- **File**: `src/lib/types/quotes/quote.ts`
- **Field**: `version?` in QuoteCustomization interface
- **Purpose**: Tracks customization changes
- **Status**: ✅ **NOW SYNCED** - This field now stores the current `document_version` value
- **Implementation**: When customizations are saved, `document_version` is incremented and stored in `customization.version`

### App Versioning
- **Files**: `src/services/versionCheckService.ts`, `src/stores/app/appStore.ts`
- **Purpose**: Application version tracking
- **Status**: NO CHANGE NEEDED - This is app versioning, not document versioning

## Document Version Syncing Behavior

The `document_version` column and `customization.version` field are now synchronized:

1. **Initial State**: When a quote is created, `document_version` starts at 0
2. **Form Data Changes**: Regular updates (changing prices, wall specs, etc.) do NOT increment `document_version`
3. **Customization Changes**: When customizations are saved (editing template HTML), `document_version` is incremented:
   - `document_version` column is incremented by 1
   - New value is stored in `customization.version`
   - Creates an audit trail: version 1, 2, 3, etc.

This allows you to:
- Track when a quote's template was last customized
- Know which version of customizations is currently applied
- Potentially implement version history/rollback in the future

## Backward Compatibility

The database migration will automatically rename the column, so no data will be lost. However:
- Old code referencing `quote.version` will break after migration
- All TypeScript code has been updated to use `document_version`
- Ensure all clients are updated before running the migration
- Existing quotes will have `document_version = 0` until they are customized

## Testing Checklist

After applying the migration:
- [ ] Verify quotes load correctly in the table
- [ ] Verify quotes can be created
- [ ] Verify quotes can be updated
- [ ] Verify quote versioning (P100001.1, P100001.2) still works
- [ ] Check that no TypeScript errors exist
- [ ] Test quote editor functionality
