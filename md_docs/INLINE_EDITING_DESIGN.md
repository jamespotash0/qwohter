# Inline Quote Editor Design

## Vision
Replace QuoteDataPanel + LivePreview with a single inline editor where:
- Users click bold fields to edit values directly in context
- Dropdowns appear inline for selections
- Text automatically adapts based on selections (conditional phrases)
- No separate sidebar form

## Architecture

### TipTap Custom Nodes

#### 1. FieldNode - For inline editable values
```typescript
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'

const FieldNode = Node.create({
  name: 'field',
  group: 'inline',
  inline: true,
  atom: true, // Can't be split by cursor

  addAttributes() {
    return {
      fieldId: { default: null },
      fieldType: { default: 'text' }, // text, number, select
      value: { default: '' },
      options: { default: null }, // For select type
      bold: { default: true },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-field]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-field': HTMLAttributes.fieldId,
      class: 'inline-field font-bold text-blue-600 cursor-pointer hover:bg-blue-50 px-1 rounded',
    }), HTMLAttributes.value || '[Empty]']
  },

  addNodeView() {
    return ReactNodeViewRenderer(FieldComponent)
  },
})

// React component for inline field editing
const FieldComponent = ({ node, updateAttributes }) => {
  const [isEditing, setIsEditing] = useState(false)
  const { fieldType, value, options } = node.attrs

  if (isEditing && fieldType === 'select') {
    return (
      <select
        value={value}
        onChange={(e) => {
          updateAttributes({ value: e.target.value })
          setIsEditing(false)
        }}
        autoFocus
        onBlur={() => setIsEditing(false)}
        className="inline-field-select"
      >
        {options?.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }

  if (isEditing && fieldType === 'text') {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => updateAttributes({ value: e.target.value })}
        onBlur={() => setIsEditing(false)}
        autoFocus
        className="inline-field-input"
      />
    )
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className="inline-field font-bold text-blue-600 cursor-pointer hover:bg-blue-50 px-1 rounded"
    >
      {value || '[Click to edit]'}
    </span>
  )
}
```

#### 2. ConditionalNode - For text that appears/disappears based on field values
```typescript
const ConditionalNode = Node.create({
  name: 'conditional',
  group: 'block',
  content: 'inline*',

  addAttributes() {
    return {
      condition: { default: '' }, // e.g., "wallType === 'Operable Wall'"
      dependsOn: { default: [] }, // Field IDs to watch
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-conditional]' }]
  },

  renderHTML({ HTMLAttributes, getNode }) {
    // Evaluate condition based on current field values
    const shouldShow = evaluateCondition(HTMLAttributes.condition)

    return ['div', mergeAttributes(HTMLAttributes, {
      'data-conditional': HTMLAttributes.condition,
      style: shouldShow ? '' : 'display: none;',
    }), 0]
  },
})
```

## Example Quote Template

```html
<h1>Wall System Proposal</h1>

<div class="section">
  <h2>Project Information</h2>
  <p>
    Prepared for <field fieldId="clientName" type="text" value="[Client Name]" />
    at <field fieldId="projectAddress" type="text" value="[Address]" />
    on <field fieldId="quoteDate" type="date" value="2024-01-15" />.
  </p>
</div>

<div class="section">
  <h2>Wall Specifications</h2>
  <p>
    This proposal includes
    <field fieldId="wallCount" type="number" value="2" />
    wall systems:
  </p>

  <div class="wall-spec">
    <strong>Wall A:</strong>
    <field fieldId="wallA.area" type="number" value="120" /> sq ft of
    <field fieldId="wallA.type" type="select" options='["Operable Wall","Glass Wall","Accordion Wall"]' value="Operable Wall" />

    <conditional condition="wallA.type === 'Operable Wall'" dependsOn='["wallA.type"]'>
      with <field fieldId="wallA.panelCount" type="number" value="8" /> panels
      and <field fieldId="wallA.finish" type="select" options='["Fabric","Vinyl","Wood"]' value="Fabric" /> finish
    </conditional>

    <conditional condition="wallA.finish === 'Fabric'" dependsOn='["wallA.finish"]'>
      in <field fieldId="wallA.color" type="select" options='["Blue","Gray","Beige"]' value="Blue" /> color
    </conditional>

    <conditional condition="wallA.type === 'Glass Wall'" dependsOn='["wallA.type"]'>
      with <field fieldId="wallA.glassType" type="select" options='["Clear","Frosted","Tinted"]' value="Clear" /> glass
    </conditional>
    .
  </p>
</div>

<div class="section">
  <h2>Pricing</h2>
  <p>
    Total investment: $<field fieldId="totalPrice" type="number" value="45000" readonly />
    (<field fieldId="pricePerSqFt" type="number" value="225" readonly /> per sq ft)
  </p>
</div>
```

## Smart Text Generation

### Challenge: Coherent sentence generation
When user changes a dropdown, the surrounding text must adapt.

**Example:**
- If `wallType = "Operable Wall"` → "with 8 panels and Fabric finish"
- If `wallType = "Glass Wall"` → "with Clear glass"
- If `wallType = "Accordion Wall"` → no additional text

### Solution: Conditional Text Blocks

Use TipTap's schema to define text that only appears when conditions are met:

```typescript
// Extension to handle conditional rendering
const ConditionalText = Extension.create({
  name: 'conditionalText',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          showIf: {
            default: null,
            parseHTML: element => element.getAttribute('data-show-if'),
            renderHTML: attributes => {
              if (!attributes.showIf) return {}
              return { 'data-show-if': attributes.showIf }
            },
          },
        },
      },
    ]
  },

  onUpdate({ editor }) {
    // Re-evaluate all conditionals when any field changes
    this.reevaluateConditionals(editor)
  },

  reevaluateConditionals(editor) {
    const { doc } = editor.state

    doc.descendants((node, pos) => {
      if (node.attrs.showIf) {
        const shouldShow = this.evaluateCondition(node.attrs.showIf, editor)

        // Hide/show node by wrapping in hidden span or removing wrapper
        if (!shouldShow && !node.marks.find(m => m.type.name === 'hidden')) {
          editor.commands.setNodeMarkup(pos, null, {
            ...node.attrs,
            hidden: true,
          })
        }
      }
    })
  },

  evaluateCondition(condition, editor) {
    // Parse condition like "wallA.type === 'Operable Wall'"
    // Get current field values from editor state
    const fields = this.extractFieldValues(editor)

    // Safely evaluate condition
    try {
      return new Function('fields', `return ${condition}`)(fields)
    } catch {
      return false
    }
  },

  extractFieldValues(editor) {
    const fields = {}
    const { doc } = editor.state

    doc.descendants((node) => {
      if (node.type.name === 'field') {
        const { fieldId, value } = node.attrs
        fields[fieldId] = value
      }
    })

    return fields
  },
})
```

## Migration Path

### Phase 1: Build Template System
1. Create custom TipTap nodes (FieldNode, ConditionalNode)
2. Convert current quote template to inline-editable version
3. Test with simple quote (no walls/complex logic)

### Phase 2: Replace QuoteDataPanel
1. Remove QuoteDataPanel component
2. Expand editor to full width
3. Add "field directory" sidebar (collapsible) showing all editable fields

### Phase 3: Smart Text Generation
1. Implement conditional text extension
2. Add template rules for wall types, finishes, etc.
3. Test all combinations for coherent output

### Phase 4: Polish
1. Add keyboard shortcuts (Tab to next field)
2. Validation (required fields highlighted)
3. Quick-fill presets (common wall configurations)

## UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  📄 Quote Editor                          [Save] [Download]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Wall System Proposal                                        │
│  ───────────────────────                                     │
│                                                               │
│  Prepared for [ACME Corp ▼] at [123 Main St ▼]              │
│  on [Jan 15, 2024 ▼]                                        │
│                                                               │
│  Wall Specifications                                         │
│  ────────────────────                                        │
│                                                               │
│  This proposal includes [2 ▼] wall systems:                 │
│                                                               │
│  Wall A: [120__] sq ft of [Operable Wall ▼]                │
│  with [8__] panels and [Fabric ▼] finish in [Blue ▼] color │
│                                                               │
│  Wall B: [85__] sq ft of [Glass Wall ▼]                    │
│  with [Clear ▼] glass                                        │
│                                                               │
│  Pricing                                                     │
│  ───────                                                      │
│                                                               │
│  Total investment: $[45,000] ($[225]/sq ft)                 │
│                                                               │
│  [When user hovers over bold fields, they highlight]        │
│  [Click to edit inline - no modal, no sidebar]              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Benefits

1. **Simpler UX**: Edit in context, not in separate form
2. **Faster workflow**: No switching between panels
3. **Better preview**: See exactly what customer sees
4. **Smarter quotes**: Text adapts to selections automatically
5. **Less code**: Remove QuoteDataPanel, QuickEditModal, section hover logic

## Challenges

1. **Template authoring**: Need to design templates carefully
2. **Validation**: Harder to validate than traditional forms
3. **Complex logic**: Wall specs with many conditional fields
4. **Learning curve**: Users need to discover editable fields

## Next Steps

Would you like me to:
1. Build the FieldNode and ConditionalNode extensions?
2. Create a sample template for one section (e.g., wall specs)?
3. Show you how to handle the conditional text logic?
