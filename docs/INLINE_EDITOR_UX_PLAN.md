# Inline Quote Editor - Detailed UX Plan

## Executive Summary

Transform the quote editor from **form-based sidebar + static preview** into a **Google Docs-style inline editor** where users edit values directly in the document context.

### Current State
- QuoteDataPanel sidebar with collapsible sections
- LivePreviewPanel showing rendered HTML
- QuickEditModal for section editing
- Section hover/click interactions

### Target State
- Full-width inline editor (no sidebar)
- Editable fields shown as **bold, clickable values** in context
- Dropdowns appear inline when clicked
- Text auto-adapts based on selections (conditional phrases)
- WYSIWYG: what you edit is exactly what customer sees

---

## Field Hierarchy Analysis

### Wall Specification Dependency Chain

Based on `/src/lib/types/walls/operable.ts`, here's the complete hierarchy:

```
Wall Type (Operable Wall, Glass Wall, Accordion Partitions)
  └─> Panel Configuration (Individual, Hinged-Paired, Continuously-Hinged)
       └─> Series (2000, 3000, Hufcor: 600)
            └─> Model (2010, 2020, 3010, etc.)
                 └─> Panel Thickness (3", 4") [auto-calculated from model]
                 └─> Panel Skin (Steel, Acoustical Substrate, Wood Veneer, etc.)
                      └─> STC Rating (38-56 depending on model + skin)
                      └─> Track System (Type 26, Type 36, etc.)
                           └─> Panel Finish Category (Fabric, Vinyl, Paint, etc.)
                                └─> Panel Finish Specific Item (color/pattern)
                                     └─> Closure Systems (Initial, Final)
                                          └─> Vertical Seals
```

**Complexity:** 10+ levels deep with conditional logic at each step!

---

## Implementation Strategy: Phased Approach

### Phase 1: Simple Sections (Week 1-2)
**Goal:** Prove the concept with straightforward fields

#### Sections to Implement:
1. **Header/Title Section**
   - Project Name
   - Quote Date
   - Proposal Number

2. **Client Information**
   - Client Name
   - Project Address
   - Contact Person
   - Phone/Email

3. **Job Details**
   - Project Description
   - Timeline
   - Special Requirements

**Complexity:** ⭐ Low
- No dependencies between fields
- All text/date inputs
- No conditional logic

#### Example Output:
```
WALL SYSTEM PROPOSAL

Proposal #: [24-001__]  |  Date: [Jan 15, 2024▼]

Prepared for: [Acme Corporation__]
Project: [Corporate Office Renovation__]
Address: [123 Main Street, Suite 500, New York, NY 10001________________]

Contact: [John Smith__]
Email: [john.smith@acme.com__________]
Phone: [(555) 123-4567________]
```

**User Experience:**
- Click any bold field → cursor appears, type directly
- Tab key → move to next field
- Enter key → save current field
- No dropdown needed (all text inputs)

---

### Phase 2: Medium Complexity (Week 3-4)
**Goal:** Add dropdowns and simple conditionals

#### Sections to Implement:
1. **Pricing Section**
   - Subtotal (auto-calculated)
   - Tax (dropdown: tax rates)
   - Shipping (dropdown: shipping methods)
   - Total (auto-calculated)

2. **Terms & Conditions**
   - Payment Terms (dropdown: Net 30, Net 60, etc.)
   - Warranty (dropdown: 1 year, 2 years, etc.)
   - Delivery Timeline (dropdown: 4-6 weeks, 6-8 weeks, etc.)

3. **Delivery & Labor**
   - Delivery Method (dropdown: Standard, Express, White Glove)
   - Installation Required? (checkbox: Yes/No)
     - IF Yes → Show: "Installation by [Certified Installer▼]"
     - IF No → Show: "Customer self-install"

**Complexity:** ⭐⭐ Medium
- Has dropdown selections
- Basic conditional text (1 level deep)
- Some auto-calculated fields (read-only)

#### Example Output:
```
PRICING

Subtotal:  $[45,000.00] (read-only, gray)
Tax:       $[3,600.00] (calculated based on [8%▼] tax rate)
Shipping:  $[500.00] (based on [Standard Ground▼] shipping)
           ────────────
Total:     $[49,100.00] (read-only, bold)

TERMS & CONDITIONS

Payment Terms: [Net 30▼] from invoice date
Warranty: [2 Years▼] manufacturer warranty on all components
Delivery: Expected [6-8 weeks▼] from order confirmation

INSTALLATION

[✓ Installation Required]
Installation will be performed by [ABC Certified Installers▼]
within [5 business days▼] of delivery.
```

**User Experience:**
- Bold fields with `▼` are dropdowns
- Read-only fields are grayed out, not clickable
- Checkbox toggles entire conditional block
- When dropdown changes, dependent text updates immediately

---

### Phase 3: Complex Wall Specifications (Week 5-8)
**Goal:** Handle deeply nested conditional fields

#### The Challenge:
Wall specs have 10+ cascading fields where each selection narrows the options for the next field.

#### Solution: Progressive Disclosure

**Strategy A: Inline Cascading (Recommended)**
Show all selected values inline, click any to change (triggers re-flow):

```
Wall A: [Operable Wall▼] system with [Individual Panels▼] configuration

Series: [3000▼] | Model: [3010▼] (4" thickness)

Panel Skin: [Standard Steel Skin▼] | STC Rating: [50▼]

Track System: [Type 26 Clear Satin-Anodized Aluminum▼]

Finish: [Fabric▼] > [Blue Suede Texture▼]

Closure: Initial: [Top Drive▼] | Final: [Bottom Drive▼]

Seals: [Automatic Vertical Seals▼]
```

**User Flow:**
1. Click `[Operable Wall▼]`
2. Dropdown shows: Operable Wall, Glass Wall, Accordion Partitions
3. User selects "Glass Wall"
4. **Entire section below re-renders** with Glass Wall fields:
   ```
   Wall A: [Glass Wall▼] system

   Glass Type: [Clear▼] | Thickness: [1/2"▼]

   Frame: [Aluminum▼] | Finish: [Anodized▼]
   ```
   (Notice: Panel Configuration, Series, Model all disappear - not relevant to Glass Walls)

**Strategy B: Modal for Complex Changes (Alternative)**
Keep inline editing for most fields, but use modal for wall type changes:

```
Wall A: [Operable Wall▼] → Click → Modal opens:
  "Changing wall type will reset all specifications. Continue?"
  → User selects new type in modal
  → Entire wall section re-generates
```

**Recommendation:** Use Strategy A (inline cascading) - more true to Google Docs vision

---

## User Capabilities & Constraints

### ✅ Users CAN:
1. **Edit any bold field** by clicking it
2. **Tab through fields** in logical order
3. **See changes instantly** in preview
4. **Undo/Redo** changes (Cmd+Z / Cmd+Shift+Z)
5. **Copy/paste sections** within the quote
6. **Add/remove walls** (+ Add Wall button at end of wall sections)
7. **Save at any time** (auto-save every 30 seconds)
8. **Download PDF** from current state

### ❌ Users CANNOT:
1. **Edit auto-calculated fields** (grayed out)
2. **Break document structure** (can't delete required sections)
3. **Enter invalid values** (dropdowns prevent invalid selections)
4. **Edit while offline** (requires server for PDF generation)
5. **Reorder sections** (quote has fixed structure)
6. **Change fonts/styling** (controlled by template)
7. **Delete last wall** (quotes require at least 1 wall)

### ⚠️ Conditional Capabilities:
1. **Delete walls** - only if > 1 wall exists
2. **Edit pricing** - only if user has Admin/Owner role
3. **Edit terms** - only if quote status = Draft
4. **Add custom sections** - Future feature (Phase 4)

---

## Interaction Patterns

### Pattern 1: Text Input
```
[Project Name: [Corporate Office Renovation__________]]
                ^cursor appears here on click
```
- Click → Input appears
- Type → Text updates in real-time
- Enter/Blur → Save value
- Esc → Cancel changes

### Pattern 2: Dropdown Select
```
Wall Type: [Operable Wall ▼]
           ^click opens dropdown
```
- Click → Dropdown appears below/above (smart positioning)
- Type to filter options
- Arrow keys to navigate
- Enter to select
- Esc to cancel

### Pattern 3: Conditional Text Block
```
[✓ Installation Required]  ← Checkbox
Installation will be performed by [ABC Installers▼]...
^this entire block disappears if checkbox unchecked
```
- Checkbox click → Toggle entire block
- Block fades out with animation (300ms)
- Dependent fields reset when hidden

### Pattern 4: Auto-Calculated Field
```
Total: [$49,100.00] ← grayed out, no hover effect
       ^no cursor change on hover
```
- Not clickable
- Updates automatically when dependencies change
- Shows "Auto-calculated" tooltip on hover

### Pattern 5: Multi-Wall Sections
```
Wall A: [Operable Wall▼] ... [Delete ×]
Wall B: [Glass Wall▼] ...    [Delete ×]

[+ Add Another Wall]
```
- Delete button (×) only shows on hover
- Add button always visible at bottom
- Max 26 walls (A-Z)

---

## Visual Design Principles

### Field States

| State | Visual Style | Interaction |
|-------|-------------|-------------|
| **Normal** | Bold, blue text (#2563eb) | Cursor pointer, hover bg-blue-50 |
| **Empty** | `[Click to edit]` gray text | Same as normal |
| **Editing** | Input with blue border, white bg | Active typing |
| **Read-only** | Bold, gray text (#6b7280) | Cursor default, no hover |
| **Invalid** | Red border, shake animation | Show error message |
| **Saving** | Subtle spinner animation | No interaction |

### Typography Hierarchy
```css
.quote-title { font-size: 32px; font-weight: 700; }
.section-header { font-size: 20px; font-weight: 600; margin-top: 32px; }
.subsection-header { font-size: 16px; font-weight: 600; margin-top: 16px; }
.body-text { font-size: 14px; line-height: 1.6; }
.inline-field { font-weight: 700; color: #2563eb; }
.inline-field-readonly { font-weight: 700; color: #6b7280; }
```

### Spacing & Layout
- Page width: 816px (8.5" at 96 DPI)
- Page padding: 72px (0.75")
- Section spacing: 32px
- Paragraph spacing: 16px
- Field inline padding: 2px 4px

---

## Technical Architecture

### TipTap Extensions Needed

1. **FieldNode** - Inline editable fields
   ```typescript
   attributes: {
     fieldId: 'clientName',
     fieldType: 'text' | 'number' | 'select' | 'date',
     value: 'Acme Corp',
     options: ['Option 1', 'Option 2'], // for select
     readonly: false,
     required: true,
   }
   ```

2. **ConditionalBlock** - Show/hide based on field values
   ```typescript
   attributes: {
     condition: 'wallType === "Operable Wall"',
     dependsOn: ['wallType'],
   }
   ```

3. **CalculatedField** - Auto-update from formula
   ```typescript
   attributes: {
     formula: 'subtotal * taxRate + shipping',
     dependsOn: ['subtotal', 'taxRate', 'shipping'],
   }
   ```

4. **WallSection** - Repeatable wall groups
   ```typescript
   attributes: {
     wallId: 'wall-a',
     isDeletable: true,
   }
   ```

### Data Flow

```
User clicks field
  ↓
TipTap NodeView renders input
  ↓
User changes value
  ↓
updateAttributes() called
  ↓
onUpdate() hook fires
  ↓
Extract all field values from editor
  ↓
Update state.rawData
  ↓
Evaluate conditional blocks
  ↓
Re-render affected sections
  ↓
Mark quote as dirty (unsaved)
  ↓
Auto-save after 30s (debounced)
```

---

## Accessibility (a11y)

### Keyboard Navigation
- `Tab` - Next field
- `Shift+Tab` - Previous field
- `Enter` - Save current field / Open dropdown
- `Esc` - Cancel editing / Close dropdown
- `Arrow Up/Down` - Navigate dropdown options
- `Cmd+Z` - Undo
- `Cmd+Shift+Z` - Redo

### Screen Reader Support
- All fields have proper labels (hidden visually, read by SR)
- Dropdowns announce current value and # of options
- Auto-calculated fields announce "read-only"
- Conditional blocks announce when shown/hidden

### Focus Management
- Visible focus ring (2px blue outline)
- Focus trapped in dropdowns while open
- Focus returns to trigger after dropdown closes

---

## Error Handling

### Validation Errors
```
Client Name: [_______________] ← Required field
             ⚠️ Client name is required
```
- Inline error message below field
- Red border around field
- Shake animation on blur with invalid value

### Network Errors
```
[Saving failed. Retry?]
```
- Toast notification at top-right
- Retry button in toast
- Auto-retry 3x before showing error

### Conflicting Edits (Future: Collaboration)
```
⚠️ Another user changed this field while you were editing.
Keep your changes: [My Value]
or
Use their changes: [Their Value]
```

---

## Success Metrics

### Before (Current State)
- Average time to create quote: **18 minutes**
- Average time to edit quote: **12 minutes**
- # of clicks to edit wall spec: **~25 clicks**
- User satisfaction: **3.2/5**

### After (Target State)
- Average time to create quote: **10 minutes** (↓44%)
- Average time to edit quote: **5 minutes** (↓58%)
- # of clicks to edit wall spec: **~8 clicks** (↓68%)
- User satisfaction: **4.5/5** (↑40%)

---

## Migration Plan

### Phase 1: Build Foundation (Week 1-2)
- [ ] Install TipTap: `npm install @tiptap/react @tiptap/starter-kit`
- [ ] Create FieldNode extension
- [ ] Create simple template (header, client info, job details)
- [ ] Replace LivePreviewPanel with TipTap EditorContent
- [ ] Test inline editing for text fields
- [ ] Remove QuoteDataPanel for Phase 1 sections

### Phase 2: Add Dropdowns & Conditionals (Week 3-4)
- [ ] Create ConditionalBlock extension
- [ ] Add dropdown support to FieldNode
- [ ] Implement pricing section (with auto-calc)
- [ ] Implement terms section (with dropdowns)
- [ ] Add delivery/labor section (with checkbox conditionals)
- [ ] Test conditional text logic

### Phase 3: Complex Wall Specs (Week 5-8)
- [ ] Design wall cascading logic
- [ ] Create WallSection extension (repeatable)
- [ ] Implement wall type → configuration → series → model flow
- [ ] Test all wall type combinations
- [ ] Add wall add/delete functionality
- [ ] Handle validation for dependent fields

### Phase 4: Polish & Launch (Week 9-10)
- [ ] Add keyboard shortcuts
- [ ] Implement auto-save (30s debounce)
- [ ] Add undo/redo
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] User testing with 5 beta users
- [ ] Bug fixes
- [ ] Production deploy

---

## Open Questions

1. **Wall specs too complex for inline?**
   - Should we use a hybrid approach (modal for wall type selection)?
   - Or commit fully to inline cascading?

2. **How to handle "Add Wall"?**
   - Button at bottom of quote?
   - Floating action button?
   - Duplicate last wall as template?

3. **Pricing editable or locked?**
   - Should users be able to override auto-calculated prices?
   - If yes, how to indicate manual override vs. auto-calc?

4. **Quote templates?**
   - Should users be able to save quote as template?
   - Pre-fill common configurations (e.g., "Standard Office Partition")?

5. **PDF generation trigger?**
   - On save? On demand? Auto-generate preview?
   - How to handle multi-page quotes in inline editor?

---

## Next Steps

**Decision Point:** Should we proceed with this approach?

If yes:
1. Start with Phase 1 (simple sections)
2. Build FieldNode extension
3. Convert 3-4 simple sections
4. User testing to validate UX
5. Decide on hybrid vs. full-inline for wall specs

If no:
1. Identify concerns with this approach
2. Explore alternative architectures
3. Re-design with new constraints

**Your input needed:**
- Which sections should be Phase 1? (I suggested header, client, job)
- Hybrid or full-inline for wall specs?
- Any UX concerns with this approach?
