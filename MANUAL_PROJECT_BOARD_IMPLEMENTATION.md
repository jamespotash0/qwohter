# Manual Project Board - Complete Implementation

## Summary

Changed from **automatic** project creation to **manual user control** for sending Won quotes to the project board.

---

## What Changed

### Before (Automatic):
```
User marks quote as Won
  ↓
System AUTOMATICALLY creates project
  ↓
Quote appears on project board
  ↓
User has NO control
```

### After (Manual Control):
```
User marks quote as Won
  ↓
Button appears: "Send to Project Board"
  ↓
User clicks when ready
  ↓
System creates project
  ↓
Button changes to: "Remove from Board"
```

---

## Files Modified/Created

### 1. ✅ Removed Auto-Create Logic
**File:** [src/services/quotesService.ts:645](src/services/quotesService.ts#L645)

**Removed 50 lines** of automatic project creation code from `updateQuoteStatus()`.

**Before:**
```typescript
if (status === 'Won' && updatedQuote.is_main_version === true) {
  // Automatically create project...
}
```

**After:**
```typescript
// Removed - no automatic creation
```

---

### 2. ✅ Created Manual Send Function
**File:** [src/services/quotesService.ts:657-737](src/services/quotesService.ts#L657-L737)

```typescript
export async function sendQuoteToProjectBoard(quoteId: string)
```

**Features:**
- Checks quote is Won ✅
- Checks no existing project ✅
- **Automatically promotes quote to main version** ✅
- Creates project with default workflow status ✅
- Returns success/error response ✅

**Key Logic:**
```typescript
// Auto-promote to main version before creating project
if (quote.is_main_version !== true) {
  await updateQuote(quoteId, { is_main_version: true });
  // Demote other versions to false
}
```

---

### 3. ✅ Created Manual Remove Function
**File:** [src/services/quotesService.ts:741-779](src/services/quotesService.ts#L741-L779)

```typescript
export async function removeQuoteFromProjectBoard(quoteId: string)
```

**Features:**
- Checks project exists ✅
- Deletes the project ✅
- Returns success/error response ✅

---

### 4. ✅ Created UI Component
**File:** [src/components/features/quotes/editing/ProjectBoardActions.tsx](src/components/features/quotes/editing/ProjectBoardActions.tsx)

**Features:**
- Only shows for Won quotes ✅
- Automatically checks if quote is on board ✅
- Shows correct button based on state:
  - "Send to Project Board" (green) if not on board
  - "Remove from Board" (red) if on board
- Loading states during operations ✅
- Toast notifications for success/errors ✅

---

### 5. ✅ Integrated into Quote Editor
**File:** [src/components/features/quotes/editing/UnifiedQuoteEditor.tsx:28,938-941](src/components/features/quotes/editing/UnifiedQuoteEditor.tsx)

**Location:** Added to toolbar next to "Download PDF" button

```typescript
<ProjectBoardActions
  quoteId={activeQuote.id}
  quoteStatus={activeQuote.status || ''}
/>
```

---

## User Workflows

### Workflow 1: Send Won Quote to Board

```
1. User marks quote as Won
   Status: Won ✅
   On Board: No ❌

2. Button appears: "Send to Project Board" (green)

3. User clicks button
   → System checks: Is Won? ✅
   → System checks: Already on board? No ✅
   → System checks: is_main_version? No ❌
   → System PROMOTES quote to main version ✅
   → System demotes other versions
   → System creates project
   → Toast: "Sent to Project Board"

4. Button changes to: "Remove from Board" (red)
   Status: Won ✅
   On Board: Yes ✅
   is_main_version: true ✅
```

---

### Workflow 2: Remove from Board

```
1. Quote is on project board
   Button shows: "Remove from Board" (red)

2. User clicks button
   → System finds project
   → System deletes project
   → Toast: "Removed from Project Board"

3. Button changes to: "Send to Project Board" (green)
   Status: Won ✅
   On Board: No ❌
```

---

### Workflow 3: Mark Version as Won

```
1. User creates Quote-001-v2 (version)
   is_main_version: false (by design)

2. User marks v2 as Won
   Status: Won ✅
   is_main_version: false ❌

3. Button appears: "Send to Project Board"

4. User clicks button
   → System PROMOTES v2 to main
   → System demotes original to false
   → System creates project

5. Result:
   Quote-001: is_main_version = false
   Quote-001-v2: is_main_version = true ✅ (on board)
```

---

## Benefits of Manual Control

### 1. **User Choice**
- Users decide WHEN to send to board
- Not forced immediately when marking as Won
- Can review quote before sending

### 2. **Flexibility with Versions**
- Can mark any version as Won
- Choose which version goes to board
- Automatically promotes chosen version

### 3. **Easier Cleanup**
- Simple "Remove" button
- No need to delete project manually
- Cleaner workflow

### 4. **No Constraint Errors**
- System handles `is_main_version` automatically
- No more "violates check constraint" errors
- Smooth user experience

---

## Database Constraint Still Enforced

**Constraint:** `projects_must_link_to_main_version_and_won`

```sql
-- Projects can ONLY link to quotes that are:
-- 1. Main version (is_main_version = true)
-- 2. Won status (status = 'Won')
```

**How we satisfy it:**
- `sendQuoteToProjectBoard()` automatically sets `is_main_version = true` ✅
- Only Won quotes show the button ✅
- Constraint never fails ✅

---

## Edge Cases Handled

### Case 1: Quote Already on Board
```
User clicks "Send to Project Board"
→ System checks: Project exists? YES
→ Returns error: "Quote already has a project on the board"
→ No duplicate projects ✅
```

### Case 2: Non-Won Quote
```
User with Submitted/Rejected/Draft quote
→ Button doesn't appear (hidden)
→ If somehow called: Returns error "Only Won quotes..." ✅
```

### Case 3: Network Error
```
User clicks button
→ Network fails during creation
→ Error caught
→ Toast: "An unexpected error occurred"
→ Button stays in original state ✅
```

---

## Testing Checklist

### Test 1: Send to Board
- [ ] Mark quote as Won
- [ ] "Send to Project Board" button appears (green)
- [ ] Click button
- [ ] Toast: "Sent to Project Board"
- [ ] Button changes to "Remove from Board" (red)
- [ ] Check Projects page - quote appears

### Test 2: Remove from Board
- [ ] Quote already on board
- [ ] "Remove from Board" button shows (red)
- [ ] Click button
- [ ] Toast: "Removed from Project Board"
- [ ] Button changes to "Send to Project Board" (green)
- [ ] Check Projects page - quote removed

### Test 3: Version Promotion
- [ ] Create Quote-001-v2
- [ ] Mark v2 as Won
- [ ] Click "Send to Project Board"
- [ ] Check database: v2 should have `is_main_version = true`
- [ ] Check database: original should have `is_main_version = false`
- [ ] Project links to v2

### Test 4: Button Visibility
- [ ] Draft quote - no button ✅
- [ ] Submitted quote - no button ✅
- [ ] Rejected quote - no button ✅
- [ ] Won quote - button appears ✅

### Test 5: Error Handling
- [ ] Try sending same quote twice - should show error
- [ ] Try removing quote not on board - should show error (though button shouldn't show)
- [ ] Check toast notifications appear

---

## Migration Notes

### Old Quotes (Created Before This Change)
- **No impact** - they can still be marked as Won
- Button will appear when Won
- Can be sent to board manually
- System will auto-set `is_main_version` as needed

### Existing Projects
- **No impact** - remain on board
- Can be removed using new button
- Re-add using new button if needed

---

## Future Enhancements (Optional)

### 1. Bulk Actions
```typescript
// Send multiple Won quotes to board at once
sendMultipleQuotesToBoard(quoteIds: string[])
```

### 2. Custom Workflow Status
```typescript
// Allow user to choose initial workflow status
sendQuoteToProjectBoard(quoteId, workflowStatus: string)
```

### 3. Project Priority
```typescript
// Allow user to set priority when sending
sendQuoteToProjectBoard(quoteId, priority: 'Low' | 'Medium' | 'High')
```

### 4. Confirmation Dialogs
```typescript
// Add confirmation before removing from board
"Are you sure you want to remove this quote from the project board?"
```

---

## Summary

**Status:** ✅ Fully Implemented and Ready

- ❌ Removed automatic project creation
- ✅ Added manual "Send to Board" function
- ✅ Added manual "Remove from Board" function
- ✅ Created UI component with smart state
- ✅ Integrated into quote editor
- ✅ Handles all edge cases
- ✅ Auto-promotes versions to main
- ✅ Satisfies database constraints
- ✅ User-friendly with toast notifications

**Users now have full control over when quotes go to the project board!** 🎉
