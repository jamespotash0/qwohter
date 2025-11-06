# Implementation Plan: Conditional Logic + User Edits Fix

**Objective**: Enable re-evaluation of conditional template logic while preserving user edits

**Timeline**: 3-4 weeks (3 sprints)

**Risk Level**: Low (incremental changes, backward compatible)

---

## Executive Summary

### What We're Building
A semantic markup system that wraps dynamic/conditional content in `<span>` tags with data attributes. When quote data changes, we can re-evaluate conditionals while preserving user-added text.

### What Changes
- ✅ **New Utility**: Template markup/re-evaluation engine
- ✅ **Template Files**: Add semantic markers to output
- ✅ **Editor Components**: Detect user edits, trigger re-evaluation
- ✅ **UI**: Visual indicators for dynamic vs static content
- ❌ **Database**: NO changes (uses existing `customization` JSONB)

---

## Database Changes

### NONE ✅

**Current schema remains unchanged**:
```sql
-- quotes.customization (existing)
{
  "customSections": [...],  -- Will now contain HTML with semantic markers
  "customHTML": "...",
  "isCustomized": true
}
```

**Why no DB changes?**
- Semantic markers are part of the HTML stored in `customization`
- Old quotes without markers continue to work
- Gradual migration happens naturally as users edit quotes

---

## File Changes

### 1. NEW FILES (4 files)

#### 1.1 Core Utility
**File**: `src/utils/templateMarkers.ts`
**Lines**: ~300
**Purpose**: Markup generator and re-evaluation engine

**Exports**:
```typescript
export class TemplateMarkers {
  static conditional(expression, value, dependencies): string
  static value(path, value, format?): string
  static conditionalText(condition, text, conditionExpr, deps): string
  static reEvaluate(html, newData): string
}
```

---

#### 1.2 Unit Tests
**File**: `src/utils/__tests__/templateMarkers.test.ts`
**Lines**: ~200
**Purpose**: Test all markup and re-evaluation scenarios

**Test Cases**:
- ✅ Conditional markup generation
- ✅ Re-evaluation with data changes
- ✅ User edit preservation
- ✅ Smart value replacement in edited conditionals
- ✅ Edge cases (missing data, invalid expressions)

---

#### 1.3 TypeScript Types
**File**: `src/lib/types/template/semanticMarkup.ts`
**Lines**: ~50
**Purpose**: Type definitions for marked content

```typescript
export interface ConditionalMarker {
  expression: string;
  currentValue: string;
  dependencies: string[];
  isUserEdited: boolean;
  originalValue?: string;
}

export interface ValueMarker {
  path: string;
  currentValue: any;
  format: 'text' | 'currency' | 'date';
  isUserEdited: boolean;
}
```

---

#### 1.4 Visual Styles
**File**: `src/styles/templateMarkers.css`
**Lines**: ~60
**Purpose**: Visual indicators for marked content

```css
/* Conditional expressions (blue underline) */
[data-type="conditional"] { ... }

/* User-edited conditionals (orange underline) */
[data-type="conditional"][data-user-edited="true"] { ... }

/* Hover tooltips */
[data-type="conditional"]:hover::after { ... }
```

---

### 2. MODIFIED FILES (8 files)

#### 2.1 Templates

##### File: `src/templates/GenericWallTemplate.tsx`
**Changes**: Add TemplateMarkers to conditional logic
**Lines Modified**: ~30 locations
**Examples**:

```diff
  generateProposalIntro(data: QuoteData): string {
    const wallCount = Object.keys(data.wall_details?.walls || {}).length;

-   const systemText = wallCount > 1 ? "wall systems" : "wall system";
+   const systemText = TemplateMarkers.conditional(
+     'wallCount > 1 ? "wall systems" : "wall system"',
+     wallCount > 1 ? "wall systems" : "wall system",
+     ['wall_details.walls']
+   );

    return `...the following ${systemText} as specified...`;
  }
```

**Locations to Update**:
1. Line 98: `systemText` conditional
2. Line 134: `panelCount > 1 ? 'Multiple' : 'Single'`
3. Line 153: Same conditional for operable walls
4. Line 172: Same conditional for accordion walls
5. All other ternary operators in template methods

**Impact**: Medium - touch many lines, but mechanical changes

---

##### File: `src/templates/SmartQuoteTemplate.ts`
**Changes**: Update `buildSentence()` to track conditional parts
**Lines Modified**: ~20

```diff
  static buildSentence(
    parts: Array<{ text: string; condition?: boolean }>,
+   basePath?: string  // NEW: for dependency tracking
  ): string {
    const validParts = parts.map(part => {
      const hasCondition = part.condition !== undefined;

-     if (!hasCondition) return part.text.trim();
+     if (!hasCondition) {
+       return part.text.trim();
+     }

+     // Mark conditional parts for re-evaluation
+     if (part.condition && basePath) {
+       return TemplateMarkers.conditionalText(
+         part.condition,
+         part.text.trim(),
+         `hasValue(${part.fieldName})`,  // Store which field this depends on
+         [basePath]
+       );
+     }

      return part.condition ? part.text.trim() : '';
    }).filter(text => text);

    return validParts.join(' ') + '.';
  }
```

**Impact**: Low - backward compatible (basePath optional)

---

#### 2.2 Editor Components

##### File: `src/components/features/quotes/editing/UnifiedQuoteEditor.tsx`
**Changes**: Add re-evaluation on data updates
**Lines Modified**: ~40
**Location**: After line 365 (in `useEffect` for data changes)

```diff
+ import { TemplateMarkers } from '@/utils/templateMarkers';

  // When quote data changes (pricing form, wall details, etc.)
  useEffect(() => {
    if (!state.rawData) return;

+   // Re-evaluate all sections with conditional logic
+   const reEvaluatedSections = new Map<string, MixedContentSection>();
+
+   state.mixedContentSections.forEach((section, sectionId) => {
+     const reEvaluatedTemplate = TemplateMarkers.reEvaluate(
+       section.template,
+       state.rawData
+     );
+
+     reEvaluatedSections.set(sectionId, {
+       ...section,
+       template: reEvaluatedTemplate
+     });
+   });
+
+   setState(prev => ({
+     ...prev,
+     mixedContentSections: reEvaluatedSections
+   }));

    // Regenerate preview
    regeneratePreview();
  }, [state.rawData]);
```

**Impact**: Medium - critical path for re-evaluation

---

##### File: `src/components/features/quotes/editing/UnifiedQuoteEditor/QuickEditModal.tsx`
**Changes**: Detect when user edits conditionals
**Lines Modified**: ~50
**Location**: In `handleSave()` function (around line 227)

```diff
+ import { TemplateMarkers } from '@/utils/templateMarkers';

  const handleSave = () => {
    if (!richEditorRef.current) return;

    const editedHTML = richEditorRef.current.innerHTML;

+   // Mark user-edited spans
+   const parser = new DOMParser();
+   const doc = parser.parseFromString(editedHTML, 'text/html');
+
+   // Track conditionals
+   doc.querySelectorAll('[data-type="conditional"]').forEach(span => {
+     const originalValue = span.getAttribute('data-original-value');
+     const currentText = span.textContent || '';
+
+     if (!originalValue) {
+       // First save - store original
+       span.setAttribute('data-original-value', currentText);
+     } else if (originalValue !== currentText) {
+       // User edited the conditional
+       span.setAttribute('data-user-edited', 'true');
+     }
+   });
+
+   // Track simple values
+   doc.querySelectorAll('[data-type="value"]').forEach(span => {
+     const path = span.getAttribute('data-value');
+     const format = span.getAttribute('data-format');
+
+     if (path) {
+       const expectedValue = TemplateMarkers.getNestedValue(formData, path);
+       const formattedExpected = TemplateMarkers.formatValue(expectedValue, format);
+       const currentText = span.textContent || '';
+
+       if (formattedExpected !== currentText) {
+         span.setAttribute('data-user-edited', 'true');
+       }
+     }
+   });
+
+   const finalHTML = doc.body.innerHTML;

    onSave(sectionId, finalHTML);
  };
```

**Impact**: High - critical for tracking user edits

---

##### File: `src/components/features/quotes/editing/UnifiedQuoteEditor/QuickEditModal.tsx` (UI part)
**Changes**: Add visual styling for marked content
**Lines Modified**: ~30
**Location**: In `useEffect` after contentEditable is rendered (around line 520)

```diff
  useEffect(() => {
    if (!richEditorRef.current) return;

+   // Apply visual styles to marked elements
+   const applyMarkupStyles = () => {
+     const editor = richEditorRef.current;
+     if (!editor) return;
+
+     // Style conditionals
+     editor.querySelectorAll('[data-type="conditional"]').forEach(span => {
+       const isUserEdited = span.getAttribute('data-user-edited') === 'true';
+       const expr = span.getAttribute('data-conditional');
+
+       if (isUserEdited) {
+         span.setAttribute('title', 'User edited - partially updates with data');
+       } else {
+         span.setAttribute('title', `Auto-updates: ${expr}`);
+       }
+     });
+
+     // Style values
+     editor.querySelectorAll('[data-type="value"]').forEach(span => {
+       const isUserEdited = span.getAttribute('data-user-edited') === 'true';
+       const path = span.getAttribute('data-value');
+
+       if (isUserEdited) {
+         span.setAttribute('title', 'User edited - will not auto-update');
+       } else {
+         span.setAttribute('title', `Auto-updates from: ${path}`);
+       }
+     });
+   };
+
+   applyMarkupStyles();
  }, [content]);
```

**Impact**: Low - visual enhancement only

---

#### 2.3 Utilities

##### File: `src/utils/mixedContentEngine.ts`
**Changes**: Use TemplateMarkers for population
**Lines Modified**: ~20
**Location**: In `populateTemplate()` method (around line 48)

```diff
+ import { TemplateMarkers } from './templateMarkers';

  static populateTemplate(template: string, formData: any): string {
-   // OLD: Replace ${...} patterns with values
-   return template.replace(/\$\{([^}]+)\}/g, (match, variablePath) => {
-     const value = this.getNestedValue(formData, variablePath);
-     return value !== undefined ? value : match;
-   });

+   // NEW: Use TemplateMarkers re-evaluation
+   return TemplateMarkers.reEvaluate(template, formData);
  }
```

**Impact**: Medium - changes core template population logic

---

##### File: `src/utils/mixedContentEngine.ts`
**Changes**: Update variable extraction to read data attributes
**Lines Modified**: ~30
**Location**: In `extractVariables()` method (around line 34)

```diff
  static extractVariables(html: string): string[] {
-   // OLD: Regex-based extraction
-   const regex = /\$\{([^}]+)\}/g;
-   const matches = [...html.matchAll(regex)];
-   return matches.map(m => m[1]);

+   // NEW: Parse DOM and extract from data attributes
+   const parser = new DOMParser();
+   const doc = parser.parseFromString(html, 'text/html');
+
+   const variables = new Set<string>();
+
+   // Extract from conditionals
+   doc.querySelectorAll('[data-type="conditional"]').forEach(span => {
+     const deps = span.getAttribute('data-deps');
+     if (deps) {
+       deps.split(',').forEach(dep => variables.add(dep.trim()));
+     }
+   });
+
+   // Extract from values
+   doc.querySelectorAll('[data-type="value"]').forEach(span => {
+     const path = span.getAttribute('data-value');
+     if (path) variables.add(path);
+   });
+
+   return Array.from(variables);
  }
```

**Impact**: Medium - changes how variables are detected

---

### 3. IMPORT ADDITIONS

All template and editor files need this import:
```typescript
import { TemplateMarkers } from '@/utils/templateMarkers';
```

**Files needing import**:
1. `src/templates/GenericWallTemplate.tsx`
2. `src/templates/SmartQuoteTemplate.ts`
3. `src/components/features/quotes/editing/UnifiedQuoteEditor.tsx`
4. `src/components/features/quotes/editing/UnifiedQuoteEditor/QuickEditModal.tsx`
5. `src/utils/mixedContentEngine.ts`

---

## UI/UX Changes

### 1. Visual Indicators in Editor

**Location**: QuickEditModal contentEditable area

**What Users See**:

#### Before (current):
```
We will install 2 high-quality panels on the wall.
```
*(Everything looks the same - no indication what's dynamic)*

#### After (new):
```
We will install [2] high-quality [panels] on the wall.
                 ^^^             ^^^^^^^
         (blue underline)   (blue underline)
```

**Legend**:
- **Blue dotted underline** = Auto-updates with data changes
- **Orange dotted underline** = User edited, partially locked
- **No underline** = Pure static text

**Hover Tooltips**:
- Blue: "Auto-updates: panelCount > 1 ? 'Multiple' : 'Single'"
- Orange: "User edited - partially updates with data"

---

### 2. New UI Components (Optional, but Recommended)

#### 2.1 Markup Legend (Tooltip/Help Icon)

**Location**: QuickEditModal toolbar
**Component**: `<MarkupLegend />`

```tsx
<div className="markup-legend">
  <button className="help-icon" onClick={toggleLegend}>
    <InfoCircle />
  </button>

  {showLegend && (
    <div className="legend-tooltip">
      <h4>Content Types</h4>
      <div className="legend-item">
        <span className="example" data-type="conditional">Dynamic</span>
        <span>Auto-updates with data</span>
      </div>
      <div className="legend-item">
        <span className="example" data-type="conditional" data-user-edited="true">Edited</span>
        <span>User edited, partially locked</span>
      </div>
      <div className="legend-item">
        <span className="example">Static</span>
        <span>Never changes</span>
      </div>
    </div>
  )}
</div>
```

**New File**: `src/components/features/quotes/editing/UnifiedQuoteEditor/MarkupLegend.tsx` (~80 lines)

---

#### 2.2 Reset Button (For User-Edited Conditionals)

**Location**: QuickEditModal toolbar (appears when conditional is selected)

```tsx
{selectedConditional?.isUserEdited && (
  <Button
    size="sm"
    variant="outline"
    onClick={handleResetConditional}
    className="reset-conditional-btn"
  >
    <RotateCcw className="w-4 h-4 mr-2" />
    Reset to Auto-Update
  </Button>
)}
```

**Functionality**:
- Removes `data-user-edited` flag from selected span
- Triggers re-evaluation to restore computed value
- Shows confirmation dialog first

**New Component**: Update `QuickEditModal.tsx` toolbar section (~30 lines)

---

### 3. No Major UX Changes

✅ **Editing flow stays the same**:
1. User clicks section → modal opens
2. User edits content in contentEditable
3. User clicks Save → changes applied

✅ **Data update flow stays the same**:
1. User updates pricing form
2. Preview auto-refreshes
3. Changed values update in preview

**Only difference**: Visual underlines show what's dynamic vs static

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal**: Build core utility and test it

**Tasks**:
1. [ ] Create `src/utils/templateMarkers.ts`
   - [ ] Implement `TemplateMarkers.conditional()`
   - [ ] Implement `TemplateMarkers.value()`
   - [ ] Implement `TemplateMarkers.conditionalText()`
   - [ ] Implement `TemplateMarkers.reEvaluate()`
   - [ ] Add safe expression evaluation
   - [ ] Add smart value replacement logic

2. [ ] Create `src/utils/__tests__/templateMarkers.test.ts`
   - [ ] Test conditional markup generation
   - [ ] Test re-evaluation with simple data change
   - [ ] Test re-evaluation with user edits
   - [ ] Test smart replacement ("Multiple" → "Single" in "Multiple high-quality")
   - [ ] Test edge cases (null values, invalid expressions)

3. [ ] Create `src/lib/types/template/semanticMarkup.ts`
   - [ ] Define TypeScript interfaces

4. [ ] Create `src/styles/templateMarkers.css`
   - [ ] Visual styles for marked content
   - [ ] Hover tooltips

**Deliverables**:
- ✅ `templateMarkers.ts` fully tested (95%+ coverage)
- ✅ Can generate marked HTML
- ✅ Can re-evaluate marked HTML
- ✅ All tests passing

**Time**: 4-5 days

---

### Phase 2: Template Integration (Week 2)
**Goal**: Update templates to generate marked output

**Tasks**:
1. [ ] Update `src/templates/GenericWallTemplate.tsx`
   - [ ] Add import for TemplateMarkers
   - [ ] Update `generateProposalIntro()` (line 98)
   - [ ] Update `generatePanelsSection()` (lines 134, 153, 172)
   - [ ] Update `generateTrackSection()` (any conditionals)
   - [ ] Update `generateSupportSection()` (any conditionals)
   - [ ] Update all other methods with ternary operators

2. [ ] Update `src/templates/SmartQuoteTemplate.ts`
   - [ ] Update `buildSentence()` signature (add `basePath` param)
   - [ ] Add conditional tracking for parts with `condition` flag
   - [ ] Maintain backward compatibility

3. [ ] Update all `generateXxxSection()` calls
   - [ ] Pass wallPath to buildSentence
   - [ ] Example: `SmartQuoteHelper.buildSentence(parts, 'wall_details.walls.wallA')`

4. [ ] Test template generation
   - [ ] Generate quote HTML, verify markup present
   - [ ] Inspect output in browser dev tools
   - [ ] Verify data attributes correct

**Deliverables**:
- ✅ All template methods generate marked HTML
- ✅ Data attributes contain correct expressions and dependencies
- ✅ Generated HTML looks identical to old system (just with extra attributes)
- ✅ No visual changes in preview (underlines not applied yet)

**Time**: 4-5 days

---

### Phase 3: Editor Integration (Week 3)
**Goal**: Connect re-evaluation to editor, add visual indicators

**Tasks**:
1. [ ] Update `src/components/features/quotes/editing/UnifiedQuoteEditor.tsx`
   - [ ] Import TemplateMarkers
   - [ ] Add re-evaluation in data change `useEffect` (around line 365)
   - [ ] Test: change panelCount, verify conditional updates
   - [ ] Add error handling for re-evaluation failures

2. [ ] Update `src/components/features/quotes/editing/UnifiedQuoteEditor/QuickEditModal.tsx`
   - [ ] Import TemplateMarkers
   - [ ] Add user edit detection in `handleSave()` (line 227)
   - [ ] Add visual styling in `useEffect` (line 520)
   - [ ] Test: edit conditional, save, verify `data-user-edited` flag added

3. [ ] Update `src/utils/mixedContentEngine.ts`
   - [ ] Update `populateTemplate()` to use TemplateMarkers
   - [ ] Update `extractVariables()` to read from data attributes
   - [ ] Test backward compatibility with old HTML (no markers)

4. [ ] Add `src/components/features/quotes/editing/UnifiedQuoteEditor/MarkupLegend.tsx`
   - [ ] Create help tooltip component
   - [ ] Add to QuickEditModal toolbar

5. [ ] Add reset button functionality
   - [ ] Update QuickEditModal toolbar
   - [ ] Implement `handleResetConditional()`
   - [ ] Add confirmation dialog

**Deliverables**:
- ✅ Conditionals re-evaluate when data changes
- ✅ User edits are detected and flagged
- ✅ Visual indicators appear in editor
- ✅ Hover tooltips show expression/path
- ✅ Reset button works

**Time**: 5-6 days

---

### Phase 4: Testing & Polish (Week 4)
**Goal**: Comprehensive testing, edge cases, polish UX

**Tasks**:
1. [ ] Integration testing
   - [ ] Test full flow: generate quote → edit → save → change data → verify update
   - [ ] Test multiple walls (wallA, wallB, wallC)
   - [ ] Test all wall types (glass, operable, accordion)
   - [ ] Test all conditional patterns in templates

2. [ ] Edge case testing
   - [ ] User deletes conditional span entirely
   - [ ] User adds new text inside conditional span
   - [ ] User copy-pastes from outside (strips data attributes)
   - [ ] Data becomes null/undefined
   - [ ] Expression evaluation errors

3. [ ] User acceptance testing
   - [ ] Get feedback from real users
   - [ ] Adjust visual indicators if needed
   - [ ] Refine hover tooltip text

4. [ ] Performance testing
   - [ ] Large quotes (10+ walls, 50+ sections)
   - [ ] Re-evaluation speed (<100ms target)
   - [ ] Browser memory usage

5. [ ] Documentation
   - [ ] Update developer docs (how to add new conditionals)
   - [ ] User guide (what the underlines mean)
   - [ ] Inline code comments

**Deliverables**:
- ✅ All edge cases handled gracefully
- ✅ Performance meets targets
- ✅ User feedback incorporated
- ✅ Documentation complete

**Time**: 4-5 days

---

## Testing Strategy

### Unit Tests (Week 1)
**File**: `src/utils/__tests__/templateMarkers.test.ts`

```typescript
describe('TemplateMarkers', () => {
  describe('conditional()', () => {
    it('generates markup with expression and dependencies', () => {
      const result = TemplateMarkers.conditional(
        'count > 1 ? "Multiple" : "Single"',
        'Multiple',
        ['wall_details.panels']
      );

      expect(result).toContain('data-conditional');
      expect(result).toContain('data-deps="wall_details.panels"');
      expect(result).toContain('>Multiple<');
    });
  });

  describe('reEvaluate()', () => {
    it('updates conditional when data changes', () => {
      const html = `<span data-conditional="count > 1 ? 'Multiple' : 'Single'" data-deps="panelCount">Multiple</span>`;
      const newData = { panelCount: 1 };

      const result = TemplateMarkers.reEvaluate(html, newData);

      expect(result).toContain('>Single<');
    });

    it('preserves user-added text around conditional', () => {
      const html = `premium <span data-conditional="count > 1 ? 'panels' : 'panel'" data-deps="count">panels</span> system`;
      const newData = { count: 1 };

      const result = TemplateMarkers.reEvaluate(html, newData);

      expect(result).toContain('premium');  // Preserved
      expect(result).toContain('panel');    // Updated
      expect(result).toContain('system');   // Preserved
    });

    it('smart replaces in user-edited conditionals', () => {
      const html = `<span
        data-conditional="count > 1 ? 'Multiple' : 'Single'"
        data-deps="count"
        data-user-edited="true"
        data-original-value="Multiple">Multiple high-quality</span>`;
      const newData = { count: 1 };

      const result = TemplateMarkers.reEvaluate(html, newData);

      expect(result).toContain('Single high-quality');
      // "Multiple" → "Single", "high-quality" preserved
    });
  });
});
```

---

### Integration Tests (Week 3-4)
**File**: `src/components/features/quotes/editing/__tests__/conditionalEditing.integration.test.tsx`

```typescript
describe('Conditional Editing Integration', () => {
  it('full flow: generate → edit → update data → verify re-evaluation', async () => {
    // 1. Generate quote with 2 panels
    const quoteData = createMockQuote({ panelCount: 2 });
    const { container } = render(<UnifiedQuoteEditor quoteId="test-123" />);

    // Verify "Multiple" appears
    expect(container.innerHTML).toContain('Multiple');

    // 2. User edits section, adds "high-quality"
    const section = screen.getByText(/Multiple/);
    fireEvent.click(section);

    const editor = screen.getByRole('textbox');
    // Simulate adding text
    editor.innerHTML = editor.innerHTML.replace('Multiple', 'Multiple high-quality');

    fireEvent.click(screen.getByText('Save'));

    // 3. Change data: panelCount 2 → 1
    const panelCountInput = screen.getByLabelText('Panel Count');
    fireEvent.change(panelCountInput, { target: { value: '1' } });

    // 4. Verify: "Single high-quality" appears
    await waitFor(() => {
      expect(container.innerHTML).toContain('Single high-quality');
    });

    // Verify: "Multiple" is gone
    expect(container.innerHTML).not.toContain('Multiple');
  });
});
```

---

### Manual Test Cases (Week 4)

#### Test Case 1: Basic Conditional Update
1. Create quote with 2 walls (wallA, wallB)
2. Verify proposal intro says "wall systems" (plural)
3. Delete wallB
4. Verify proposal intro says "wall system" (singular)

**Expected**: ✅ Text updates automatically

---

#### Test Case 2: User Edit Preservation
1. Create quote with panelCount = 2
2. Open panels section editor
3. Change "Multiple Individual Panels" to "Multiple premium Individual Panels"
4. Save
5. Change panelCount to 1 in form
6. Open panels section
7. Verify text is "Single premium Individual Panels"

**Expected**: ✅ "premium" preserved, "Multiple"→"Single" updated

---

#### Test Case 3: User Edits Conditional Value
1. Create quote with panelCount = 2
2. Open panels section editor
3. Change "Multiple" to "Numerous"
4. Save
5. Change panelCount to 1
6. Verify text is "Single" (not "Numerous")

**Expected**: ⚠️ System should ask user: "You edited 'Multiple' to 'Numerous'. Update to 'Single' or keep 'Numerous'?"

---

#### Test Case 4: Reset to Auto-Update
1. Create quote with panelCount = 2
2. Edit "Multiple" to "Numerous"
3. Save
4. Notice orange underline
5. Click "Reset to Auto-Update" button
6. Verify text changes back to "Multiple"
7. Verify underline is blue again

**Expected**: ✅ User can unlock conditionals

---

## Rollout Strategy

### Phase 1: Feature Flag (Week 1-3)
**Environment Variable**:
```bash
VITE_ENABLE_SEMANTIC_MARKUP=false  # Default: off
```

**Code**:
```typescript
// In GenericWallTemplate.tsx
const USE_SEMANTIC_MARKUP = import.meta.env.VITE_ENABLE_SEMANTIC_MARKUP === 'true';

if (USE_SEMANTIC_MARKUP) {
  return TemplateMarkers.conditional(/* ... */);
} else {
  // Old logic
  return wallCount > 1 ? "wall systems" : "wall system";
}
```

**Benefit**: Can toggle on/off without code changes

---

### Phase 2: Gradual Rollout (Week 4)

#### Day 1-2: Internal Testing
- Enable flag for dev/staging environments
- Internal team tests all features
- Fix any bugs found

#### Day 3-4: Beta Users (10%)
- Enable flag for 10% of organizations (via feature flag service)
- Monitor error rates, performance metrics
- Collect user feedback

#### Day 5-7: Wider Rollout (50%)
- Enable for 50% of organizations
- Continue monitoring

#### Week 5: Full Rollout (100%)
- Enable for all organizations
- Remove feature flag code
- Mark as GA (Generally Available)

---

### Phase 3: Migration (Ongoing)

**Old quotes** (without semantic markup):
- Continue to work as-is
- When user next edits them, system regenerates with markup
- No forced migration needed

**New quotes**:
- Always generated with semantic markup
- Benefit from re-evaluation immediately

---

## Monitoring & Metrics

### Error Tracking
```typescript
// In TemplateMarkers.reEvaluate()
try {
  const newValue = this.safeEval(expr, context);
  // ...
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      feature: 'semantic-markup',
      expression: expr,
      dependencies: deps
    },
    extra: {
      quoteId,
      sectionId
    }
  });

  // Fallback: keep old value
  console.warn('Re-evaluation failed, keeping old value');
}
```

**Metrics to Track**:
1. Re-evaluation errors (target: <1%)
2. Re-evaluation latency (target: <100ms)
3. User edit detection accuracy (manual QA)
4. Quote generation time (ensure no regression)

---

### Analytics
```typescript
// Track usage
analytics.track('semantic_markup_re_evaluated', {
  quote_id: quoteId,
  section_id: sectionId,
  conditionals_updated: conditionalCount,
  user_edits_preserved: userEditCount,
  duration_ms: duration
});

analytics.track('user_reset_conditional', {
  quote_id: quoteId,
  section_id: sectionId,
  expression: expr
});
```

**Success Metrics**:
- 95%+ of quotes generate without errors
- <1% re-evaluation failures
- <5% user confusion (measured by support tickets)
- 0 data loss incidents

---

## Risk Mitigation

### Risk 1: Expression Evaluation Errors
**Likelihood**: Medium
**Impact**: Medium
**Mitigation**:
- Wrap all evaluations in try-catch
- Fallback to old value on error
- Log to Sentry for investigation
- Add validation to template generation (detect invalid expressions)

---

### Risk 2: Performance Degradation
**Likelihood**: Low
**Impact**: High
**Mitigation**:
- Benchmark re-evaluation (target: <100ms for typical quote)
- Cache evaluated expressions
- Debounce re-evaluation on rapid data changes
- Monitor P95 latency in production

---

### Risk 3: User Confusion (Visual Indicators)
**Likelihood**: Medium
**Impact**: Low
**Mitigation**:
- A/B test different visual designs
- Add help tooltip/legend
- User training materials
- Iterate based on feedback

---

### Risk 4: Backward Compatibility
**Likelihood**: Low
**Impact**: High
**Mitigation**:
- Test with old quotes (without semantic markup)
- Ensure graceful degradation
- Feature flag for quick rollback
- Keep old code paths for 1 month after GA

---

## Success Criteria

### Week 1 (Foundation)
- [ ] `templateMarkers.ts` complete with 95%+ test coverage
- [ ] All unit tests passing
- [ ] Can generate marked HTML
- [ ] Can re-evaluate marked HTML

### Week 2 (Templates)
- [ ] All template methods generate marked HTML
- [ ] Generated quotes contain `data-conditional`, `data-value` attributes
- [ ] Visual output identical to old system (just with attributes)

### Week 3 (Integration)
- [ ] Re-evaluation works on data change
- [ ] User edit detection works
- [ ] Visual indicators appear in editor
- [ ] Reset button functional

### Week 4 (Testing)
- [ ] All integration tests passing
- [ ] Edge cases handled
- [ ] Performance benchmarks met (<100ms re-evaluation)
- [ ] Zero data loss in testing

### Production (Week 5+)
- [ ] <1% error rate
- [ ] 95%+ user satisfaction
- [ ] No P1/P2 bugs
- [ ] Support ticket volume <5% increase

---

## Rollback Plan

If critical issues arise:

1. **Immediate**: Set `VITE_ENABLE_SEMANTIC_MARKUP=false` in environment
2. **Quick**: Deploy previous version (keep old code for 1 month)
3. **Data**: No rollback needed (old HTML still works)

**Rollback Triggers**:
- Error rate >5%
- Performance regression >200ms
- Critical data loss bug
- >20% increase in support tickets

---

## Documentation Deliverables

### Developer Docs
**File**: `docs/SEMANTIC_MARKUP_GUIDE.md`
**Content**:
- How to add new conditional expressions
- How to test template changes
- How the re-evaluation engine works
- Debugging tips

### User Guide
**File**: `docs/USER_DYNAMIC_CONTENT_GUIDE.md`
**Content**:
- What the blue underlines mean
- What the orange underlines mean
- How to reset conditionals
- Examples with screenshots

### ADR (Architecture Decision Record)
**File**: `docs/ADR/0001-semantic-markup-for-conditionals.md`
**Content**:
- Problem statement
- Alternatives considered
- Decision rationale
- Consequences

---

## Timeline Summary

| Week | Phase | Key Deliverable | Team Capacity |
|------|-------|----------------|---------------|
| 1 | Foundation | `templateMarkers.ts` + tests | 1 dev full-time |
| 2 | Templates | All templates updated | 1 dev full-time |
| 3 | Integration | Editor connected | 1 dev full-time |
| 4 | Testing | Production-ready | 1 dev + QA |
| 5 | Rollout | GA release | Team support |

**Total Effort**: ~120-140 hours (3-4 weeks with 1 senior developer)

---

## Next Steps

### Immediate (This Week)
1. [ ] Review this implementation plan with team
2. [ ] Get approval from stakeholders
3. [ ] Create feature branch: `feature/semantic-markup-conditionals`
4. [ ] Set up project in task tracker (Jira/Linear/etc.)
5. [ ] Schedule kickoff meeting

### Week 1 Kickoff
1. [ ] Create new files (templateMarkers.ts, types, tests)
2. [ ] Set up testing infrastructure
3. [ ] Begin implementation of TemplateMarkers class
4. [ ] Daily standups to track progress

---

**Ready to start? Let's build this! 🚀**
