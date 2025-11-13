# Minimal Fix: Conditional Logic + User Edits

**Problem**: Template has inline conditional logic (e.g., "Multiple" vs "Single" based on panelCount). When user edits the output AND data changes, we need to:
- ✅ Re-evaluate conditionals ("Multiple" → "Single")
- ✅ Preserve user-added text ("high-quality", "premium")
- ✅ Do this WITHOUT complete rewrite

---

## The Challenge

### Template Code (GenericWallTemplate.tsx:134)

```typescript
`configured with <strong>${wall.panelCount && parseInt(wall.panelCount as any || '1') > 1 ? 'Multiple' : 'Single'} ${wall.panelConfiguration}</strong>`
```

### Generated Output (panelCount = 2)

```html
configured with <strong>Multiple Individual Panels</strong>
```

### User Edits To

```html
configured with <strong>Multiple high-quality Individual Panels for superior acoustics</strong>
```

### Data Changes (panelCount = 1)

**What Should Happen**:
```html
configured with <strong>Single high-quality Individual Panels for superior acoustics</strong>
<!--                      ^^^^^^ updated     ^^^^^^^^^^^^ preserved    ^^^^^^^^^^^^^^^^^^^^^^ preserved -->
```

---

## Minimal Solution: Smart Semantic Markup

### Phase 1: Mark Conditional Expressions in Templates

Update template methods to wrap conditional expressions with semantic markers.

#### 1.1 Create Template Helper Utility

**File**: `/src/utils/templateMarkers.ts`

```typescript
/**
 * Marks conditional expressions in template output
 * This allows us to re-evaluate them when data changes
 */
export class TemplateMarkers {

  /**
   * Wraps a conditional expression with semantic markup
   * @param expression - The JavaScript expression (for tracking)
   * @param value - The current evaluated value
   * @param dependencies - Data paths this depends on (e.g., "wall_details.walls.wallA.panelCount")
   */
  static conditional(expression: string, value: string, dependencies: string[]): string {
    const depsAttr = dependencies.join(',');
    return `<span data-conditional="${this.escapeAttr(expression)}" data-deps="${depsAttr}" data-type="conditional">${value}</span>`;
  }

  /**
   * Marks a simple data value (not conditional, just dynamic)
   */
  static value(path: string, value: any, format?: string): string {
    return `<span data-value="${path}" data-format="${format || 'text'}" data-type="value">${value}</span>`;
  }

  /**
   * Marks text that should only appear if condition is true
   * (for SmartQuoteHelper.buildSentence conditional parts)
   */
  static conditionalText(condition: boolean, text: string, conditionExpr: string, dependencies: string[]): string {
    if (!condition) return '';
    const depsAttr = dependencies.join(',');
    return `<span data-show-if="${this.escapeAttr(conditionExpr)}" data-deps="${depsAttr}" data-type="conditional-text">${text}</span>`;
  }

  private static escapeAttr(str: string): string {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * Re-evaluates all conditionals in HTML using new data
   * Preserves user-added text
   */
  static reEvaluate(html: string, newData: any): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. Re-evaluate conditional expressions
    doc.querySelectorAll('[data-type="conditional"]').forEach(span => {
      const expr = span.getAttribute('data-conditional');
      const deps = span.getAttribute('data-deps')?.split(',') || [];

      if (expr) {
        try {
          // Create safe evaluation context with only the needed data
          const context = this.buildContext(newData, deps);
          const newValue = this.safeEval(expr, context);

          // Only update the conditional value, preserve any user-added text
          this.updateConditionalValue(span, newValue);
        } catch (error) {
          console.warn(`Failed to re-evaluate: ${expr}`, error);
        }
      }
    });

    // 2. Re-evaluate conditional visibility
    doc.querySelectorAll('[data-type="conditional-text"]').forEach(span => {
      const conditionExpr = span.getAttribute('data-show-if');
      const deps = span.getAttribute('data-deps')?.split(',') || [];

      if (conditionExpr) {
        try {
          const context = this.buildContext(newData, deps);
          const shouldShow = this.safeEval(conditionExpr, context);

          if (!shouldShow) {
            span.remove();  // Condition no longer met, remove element
          }
        } catch (error) {
          console.warn(`Failed to evaluate condition: ${conditionExpr}`, error);
        }
      }
    });

    // 3. Update simple values
    doc.querySelectorAll('[data-type="value"]').forEach(span => {
      const path = span.getAttribute('data-value');
      const format = span.getAttribute('data-format');

      if (path) {
        const newValue = this.getNestedValue(newData, path);
        const formatted = this.formatValue(newValue, format);

        // Check if user edited this value
        if (!span.hasAttribute('data-user-edited')) {
          span.textContent = formatted;
        }
      }
    });

    return doc.body.innerHTML;
  }

  /**
   * Intelligently updates conditional value while preserving user additions
   */
  private static updateConditionalValue(span: Element, newValue: string): void {
    const currentText = span.textContent || '';

    // If span hasn't been edited, just update
    if (!span.hasAttribute('data-user-edited')) {
      span.textContent = newValue;
      return;
    }

    // User has edited - try to find and replace just the conditional part
    const originalValue = span.getAttribute('data-original-value');
    if (originalValue && currentText.includes(originalValue)) {
      // Replace old value with new value, keeping user additions
      const updatedText = currentText.replace(originalValue, newValue);
      span.textContent = updatedText;
      span.setAttribute('data-original-value', newValue);
    } else {
      // Can't determine what to replace - keep user's version
      console.warn('User edited conditional value, keeping their version:', currentText);
    }
  }

  /**
   * Build evaluation context from data and dependencies
   */
  private static buildContext(data: any, deps: string[]): Record<string, any> {
    const context: Record<string, any> = {};

    deps.forEach(dep => {
      const value = this.getNestedValue(data, dep);
      const varName = dep.split('.').pop() || dep;
      context[varName] = value;
    });

    return context;
  }

  /**
   * Safe evaluation of expressions
   */
  private static safeEval(expr: string, context: Record<string, any>): any {
    // Create function with context as parameters
    const params = Object.keys(context);
    const values = Object.values(context);

    // eslint-disable-next-line no-new-func
    const fn = new Function(...params, `return ${expr}`);
    return fn(...values);
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private static formatValue(value: any, format: string | null): string {
    if (value === undefined || value === null) return '';

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(parseFloat(value));
      case 'date':
        return new Date(value).toLocaleDateString();
      default:
        return String(value);
    }
  }
}
```

#### 1.2 Update GenericWallTemplate to Use Markers

**File**: `src/templates/GenericWallTemplate.tsx`

```typescript
import { TemplateMarkers } from '@/utils/templateMarkers';

export class GenericWallTemplate extends BaseQuoteTemplate {

  generateProposalIntro(data: QuoteData): string {
    const organizationName = data.quote_details?.organizationName?.trim() || '';
    const walls = data.wall_details?.walls || {};
    const wallCount = Object.keys(walls).length;

    if (wallCount === 0) return '';

    // OLD WAY:
    // const systemText = wallCount > 1 ? "wall systems" : "wall system";

    // NEW WAY: Mark the conditional
    const systemText = TemplateMarkers.conditional(
      'wallCount > 1 ? "wall systems" : "wall system"',
      wallCount > 1 ? "wall systems" : "wall system",
      ['wall_details.walls']  // Dependencies
    );

    return `
      <div class="proposal-intro-section" style="line-height: 1.2; margin-top: 12px;">
        Thank you for considering <strong>${organizationName}</strong> for this project.
        As discussed, we are offering a proposal to furnish, deliver, & install,
        the following ${systemText} as specified below, at the above named project.
        <br><br><strong>Specifications as follows:</strong>
      </div>
    `;
  }

  generatePanelsSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);

    if (wallEntries.length === 0) return '';

    const wallDescriptions = wallEntries.map(([wallName, wall]) => {
      const wallPath = `wall_details.walls.${wallName}`;

      if (isGlassWall(wall)) {
        // Mark conditional: Multiple vs Single
        const panelCountText = TemplateMarkers.conditional(
          'panelCount > 1 ? "Multiple" : "Single"',
          wall.panelCount && parseInt(wall.panelCount as any || '1') > 1 ? 'Multiple' : 'Single',
          [`${wallPath}.panelCount`]
        );

        return SmartQuoteHelper.buildSentence([
          { text: `<strong>${wallName.replace(/\s+/g, '&nbsp;')}</strong> utilizes the Kwik-Wall Glass Wall System` },
          { text: `<strong>Model ${wall.model}</strong>`, condition: SmartQuoteHelper.hasValue(wall.model) },
          { text: `featuring <strong>${wall.panelOperation}</strong> operation`, condition: SmartQuoteHelper.hasValue(wall.panelOperation) },
          // OLD: configured with <strong>Multiple Individual Panels</strong>
          // NEW: Mark conditional part
          {
            text: `configured with <strong>${panelCountText} ${wall.panelConfiguration}</strong>`,
            condition: SmartQuoteHelper.hasValue(wall.panelConfiguration)
          },
          // ... rest of the sentence parts
        ], wallPath);  // Pass wallPath for dependency tracking
      }
      // ... other wall types
    });

    return `<div class="panels-section" style="line-height: 1.15;">
      <p class="section-header-item">PANELS:</p>
      ${wallDescriptions}
    </div>`;
  }
}
```

#### 1.3 Update SmartQuoteHelper.buildSentence

**File**: `src/templates/SmartQuoteTemplate.ts`

```typescript
import { TemplateMarkers } from '@/utils/templateMarkers';

export class SmartQuoteHelper {

  /**
   * Build smart sentences with conditional parts
   * Now with dependency tracking for re-evaluation
   */
  static buildSentence(
    parts: Array<{ text: string; condition?: boolean; conditionExpr?: string }>,
    basePath?: string  // For dependency tracking (e.g., "wall_details.walls.wallA")
  ): string {
    const validParts = parts.map(part => {
      const hasCondition = part.condition !== undefined;

      if (!hasCondition) {
        return part.text.trim();
      }

      // Part has a condition - mark it for re-evaluation
      if (part.condition && part.conditionExpr && basePath) {
        return TemplateMarkers.conditionalText(
          part.condition,
          part.text.trim(),
          part.conditionExpr,
          [basePath]  // Dependencies
        );
      } else if (part.condition) {
        // Condition is true, include text
        return part.text.trim();
      } else {
        // Condition is false, exclude
        return '';
      }
    }).filter(text => text);

    if (validParts.length === 0) return '';

    return validParts.join(' ') + '.';
  }

  // For backward compatibility, also accept old signature
  static buildSentence(
    parts: Array<{ text: string; condition?: boolean }>
  ): string;
  static buildSentence(
    parts: Array<{ text: string; condition?: boolean; conditionExpr?: string }>,
    basePath?: string
  ): string {
    // Implementation above
  }
}
```

---

### Phase 2: Detect User Edits

When user edits in QuickEditModal, detect what they changed.

**File**: `src/components/features/quotes/editing/UnifiedQuoteEditor/QuickEditModal.tsx`

```typescript
import { TemplateMarkers } from '@/utils/templateMarkers';

// In handleSave
const handleSave = () => {
  if (!richEditorRef.current) return;

  const editedHTML = richEditorRef.current.innerHTML;

  // Mark user-edited conditional spans
  const parser = new DOMParser();
  const doc = parser.parseFromString(editedHTML, 'text/html');

  // Find conditionals and check if user edited them
  doc.querySelectorAll('[data-type="conditional"]').forEach(span => {
    const originalValue = span.getAttribute('data-original-value');
    const currentText = span.textContent || '';

    if (!originalValue) {
      // First time - store original
      span.setAttribute('data-original-value', currentText);
    } else if (originalValue !== currentText) {
      // User edited this conditional
      span.setAttribute('data-user-edited', 'true');
    }
  });

  // Similar for values
  doc.querySelectorAll('[data-type="value"]').forEach(span => {
    // Check if value was manually changed
    // ... similar logic
  });

  const finalHTML = doc.body.innerHTML;
  onSave(sectionId, finalHTML);
};
```

---

### Phase 3: Re-Evaluate on Data Change

When form data changes (e.g., panelCount: 2 → 1), re-evaluate conditionals.

**File**: `src/components/features/quotes/editing/UnifiedQuoteEditor.tsx`

```typescript
import { TemplateMarkers } from '@/utils/templateMarkers';

// In handleDataUpdate (when pricing or wall details change)
const handleDataUpdate = useCallback((newData: Partial<QuoteData>) => {
  const updatedQuoteData = { ...quoteData, ...newData };

  // Re-evaluate all sections with conditionals
  const updatedSections = state.mixedContentSections.map(section => {
    // Re-evaluate conditionals in this section's template
    const reEvaluatedTemplate = TemplateMarkers.reEvaluate(
      section.template,
      updatedQuoteData
    );

    return {
      ...section,
      template: reEvaluatedTemplate
    };
  });

  // Update state with re-evaluated sections
  setState(prev => ({
    ...prev,
    mixedContentSections: updatedSections,
    rawData: updatedQuoteData
  }));

  // Regenerate preview HTML
  regeneratePreview(updatedSections, updatedQuoteData);
}, [quoteData, state.mixedContentSections]);
```

---

## Example Flow

### 1. Template Generation (wallCount = 2)

**Template code**:
```typescript
const systemText = TemplateMarkers.conditional(
  'wallCount > 1 ? "wall systems" : "wall system"',
  wallCount > 1 ? "wall systems" : "wall system",
  ['wall_details.walls']
);
```

**Generated HTML**:
```html
the following <span data-conditional="wallCount &gt; 1 ? &quot;wall systems&quot; : &quot;wall system&quot;" data-deps="wall_details.walls" data-type="conditional" data-original-value="wall systems">wall systems</span> as specified
```

---

### 2. User Edits (adds "premium")

**User changes to**:
```html
the following premium <span data-conditional="..." data-type="conditional" data-original-value="wall systems">wall systems</span> as specified
```

When saved, system detects:
- User added "premium" (new text before the span)
- Conditional value unchanged
- No `data-user-edited` flag added

---

### 3. Data Changes (wallCount = 1)

**TemplateMarkers.reEvaluate() is called**:

1. Finds `<span data-type="conditional">wall systems</span>`
2. Re-evaluates expression: `wallCount > 1 ? "wall systems" : "wall system"`
3. Result: `"wall system"` (singular)
4. Checks for `data-user-edited` flag: NOT present
5. Updates span content: `wall systems` → `wall system`
6. User's "premium" text is OUTSIDE the span, so it's preserved

**Final HTML**:
```html
the following premium <span data-conditional="..." data-type="conditional" data-original-value="wall system">wall system</span> as specified
<!--              ^^^^^^^^ PRESERVED             ^^^^^^^^^^^ UPDATED -->
```

---

### 4. User Edits Conditional Value (changes "wall system" to "acoustic wall system")

**User changes to**:
```html
the following premium <span data-conditional="..." data-type="conditional" data-original-value="wall system">acoustic wall system</span> as specified
```

When saved, system detects:
- `currentText` = "acoustic wall system"
- `data-original-value` = "wall system"
- They don't match → Set `data-user-edited="true"`

---

### 5. Data Changes Again (wallCount = 2)

**TemplateMarkers.reEvaluate() is called**:

1. Finds `<span data-type="conditional" data-user-edited="true">acoustic wall system</span>`
2. Re-evaluates: should be "wall systems" (plural)
3. Checks `data-user-edited` flag: PRESENT
4. Calls `updateConditionalValue()`:
   - `originalValue` = "wall system"
   - `currentText` = "acoustic wall system"
   - `newValue` = "wall systems"
   - Replaces "wall system" → "wall systems" in currentText
   - Result: "acoustic wall systems"

**Final HTML**:
```html
the following premium <span data-conditional="..." data-type="conditional" data-original-value="wall systems" data-user-edited="true">acoustic wall systems</span> as specified
<!--              ^^^^^^^^ PRESERVED             ^^^^^^^^^^^^^^^^^ UPDATED (user's "acoustic" + computed "wall systems") -->
```

✅ User's "acoustic" prefix is preserved
✅ Conditional logic re-evaluated ("wall systems" plural)

---

## Implementation Checklist

### Week 1: Foundation
- [ ] Create `src/utils/templateMarkers.ts`
- [ ] Add `TemplateMarkers.conditional()`
- [ ] Add `TemplateMarkers.value()`
- [ ] Add `TemplateMarkers.conditionalText()`
- [ ] Add `TemplateMarkers.reEvaluate()`
- [ ] Write unit tests for templateMarkers

### Week 2: Template Updates
- [ ] Update `GenericWallTemplate.generateProposalIntro()` to use markers
- [ ] Update `GenericWallTemplate.generatePanelsSection()` to use markers
- [ ] Update other template methods with conditionals
- [ ] Update `SmartQuoteHelper.buildSentence()` to track dependencies
- [ ] Test template generation with markers

### Week 3: Editor Integration
- [ ] Update `QuickEditModal` to detect user edits
- [ ] Add `data-user-edited` flag tracking
- [ ] Update `UnifiedQuoteEditor.handleDataUpdate()` to re-evaluate
- [ ] Add visual indicators for conditional vs user-edited text
- [ ] Test full edit → save → data change → re-evaluate flow

### Week 4: Testing & Polish
- [ ] Test with complex scenarios (multiple conditionals)
- [ ] Test edge cases (user deletes conditional, adds new text, etc.)
- [ ] Performance testing (re-evaluate on large documents)
- [ ] User acceptance testing
- [ ] Documentation

---

## Benefits

✅ **Minimal changes**: Only wrap conditionals, add re-evaluation logic
✅ **Solves the problem**: Conditionals update, user text preserved
✅ **No database changes**: Still stores HTML in `customization`
✅ **Foundation for future**: Semantic markup enables version history later
✅ **Better UX**: Visual indicators show what's conditional vs static
✅ **Backward compatible**: Old quotes without markers still work

---

## CSS for Visual Indicators

```css
/* Conditional expressions (auto-update) */
[data-type="conditional"] {
  border-bottom: 1px dotted #3b82f6;
  position: relative;
}

[data-type="conditional"]:hover::after {
  content: "Auto-updates based on data";
  position: absolute;
  bottom: 100%;
  left: 0;
  background: #1f2937;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
  z-index: 1000;
}

/* User-edited conditionals */
[data-type="conditional"][data-user-edited="true"] {
  border-bottom: 1px dotted #f59e0b;
}

[data-type="conditional"][data-user-edited="true"]:hover::after {
  content: "User edited - partially locked";
  background: #f59e0b;
}

/* Simple values (always update) */
[data-type="value"] {
  background: #eff6ff;
  padding: 0 2px;
}

/* User-edited values (locked) */
[data-type="value"][data-user-edited="true"] {
  background: #fef3c7;
}
```

---

## Future Enhancement: "Reset to Template" Button

Add a button to reset conditionals back to auto-computed state:

```tsx
const handleResetConditional = (sectionId: string) => {
  const section = document.querySelector(`[data-section-id="${sectionId}"]`);

  // Remove all data-user-edited flags
  section.querySelectorAll('[data-user-edited]').forEach(el => {
    el.removeAttribute('data-user-edited');
  });

  // Re-evaluate with current data
  const reEvaluated = TemplateMarkers.reEvaluate(section.innerHTML, quoteData);
  section.innerHTML = reEvaluated;
};
```

---

This solution is **minimal** (3-4 weeks), **surgical** (no major rewrites), and **solves your exact problem** (conditionals update, user edits preserved).

Ready to implement?
