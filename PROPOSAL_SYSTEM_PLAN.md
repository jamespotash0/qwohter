# Proposal System Redesign Plan

## Overview

Replace the complex drag-and-drop form builder with a structured, tab-based proposal system. The new system will use a full-screen overlay with predefined sections that are intuitive and professional.

---

## Architecture Comparison

### Current (Deprecated)
```
Drag-and-drop builder → Create fields → Preview → Template
Complex, flexible, overwhelming
```

### New Approach
```
Full-screen overlay → Structured tabs → Fill data → Configure presentation
Simple, guided, professional
```

---

## Two Main Concepts

### 1. FORMS (Schema/Template)
**What fields exist** - The structure that defines tabs, sections, and fields.
- Stored in `forms` table
- Created/edited via Form Builder
- Reusable across multiple proposals
- Has DEFAULT schema + custom tabs/sections/fields

### 2. PROPOSALS (Data)
**What values are entered** - The actual data filled in by users.
- Stored in `proposals` table
- References a form via `form_id`
- Contains `form_data` JSONB with all values
- One proposal per project/client

```
┌──────────────────┐         ┌──────────────────┐
│      FORMS       │         │    PROPOSALS     │
│    (Schema)      │         │     (Data)       │
│                  │         │                  │
│  "Standard       │◄────────│  form_id         │
│   Proposal"      │   1:N   │                  │
│                  │         │  form_data: {    │
│  schema: {       │         │    info: {...},  │
│    tabs: [...],  │         │    products: {}  │
│    sections: [], │         │  }               │
│    fields: []    │         │                  │
│  }               │         │                  │
└──────────────────┘         └──────────────────┘

One form schema → Many proposals using that form
```

---

## Default Schema Flow

### How "Create New Form" Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  STEP 1: User clicks "Create New Form"                                  │
│                                                                         │
│          ┌─────────────────────────────────────────┐                   │
│          │  DEFAULT_FORM_SCHEMA (constant in code) │                   │
│          │                                         │                   │
│          │  • Info tab (with default sections)     │                   │
│          │  • Products tab                         │                   │
│          │  • Pricing tab (with default sections)  │                   │
│          │  • Terms tab                            │                   │
│          │  • Documents tab                        │                   │
│          │  • Presentation tab                     │                   │
│          └───────────────────┬─────────────────────┘                   │
│                              │                                          │
│                              ▼ COPY                                     │
│                                                                         │
│  STEP 2: Default is copied into a new form record                       │
│                                                                         │
│          ┌─────────────────────────────────────────┐                   │
│          │  NEW FORM (editable copy)               │                   │
│          │                                         │                   │
│          │  name: "Untitled Form"                  │                   │
│          │  schema: { ...copied from default }     │                   │
│          │  is_default: false                      │                   │
│          └───────────────────┬─────────────────────┘                   │
│                              │                                          │
│                              ▼                                          │
│                                                                         │
│  STEP 3: User edits the form (add tabs, sections, fields)              │
│                                                                         │
│          ┌─────────────────────────────────────────┐                   │
│          │  FORM BUILDER UI                        │                   │
│          │                                         │                   │
│          │  • Rename form                          │                   │
│          │  • Add custom tabs                      │                   │
│          │  • Add sections to tabs                 │                   │
│          │  • Add fields to sections               │                   │
│          │  • Reorder tabs/sections/fields         │                   │
│          │  • Cannot remove default tabs           │                   │
│          └───────────────────┬─────────────────────┘                   │
│                              │                                          │
│                              ▼ SAVE                                     │
│                                                                         │
│  STEP 4: Save stores customized form in `forms` table                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Where Default Schema Lives

```typescript
// src/features/forms/constants/defaultFormSchema.ts

export const DEFAULT_FORM_SCHEMA: FormSchema = {
  tabs: [
    {
      id: 'info',
      name: 'Info',
      type: 'default',
      removable: false,
      order: 0,
      sections: [
        {
          id: 'project_details',
          name: 'Project Details',
          order: 0,
          fields: [
            { id: 'project_name', label: 'Project Name', type: 'text', required: true },
            { id: 'proposal_number', label: 'Proposal #', type: 'text', required: true },
            // ... more fields
          ]
        },
        {
          id: 'client_info',
          name: 'Client Information',
          order: 1,
          fields: [
            { id: 'client_name', label: 'Client Name', type: 'text', required: true },
            // ... more fields
          ]
        },
        // ... more sections
      ]
    },
    // ... more tabs (Products, Pricing, Terms, Documents, Presentation)
  ]
};
```

### Form Creation Flow

```typescript
// When user clicks "Create New Form"
const createNewForm = async (name: string) => {
  // 1. Deep copy the default schema
  const schema = structuredClone(DEFAULT_FORM_SCHEMA);

  // 2. Create new form record
  const { data, error } = await supabase
    .from('forms')
    .insert({
      organization_id: currentOrg.id,
      name: name || 'Untitled Form',
      schema: schema,  // Copy of default
      is_default: false
    })
    .select()
    .single();

  // 3. Open form builder with this form
  navigate(`/forms/${data.id}/edit`);
};
```

### Form Builder = Edit Mode

```
"Create New Form" is really:
1. Copy DEFAULT_FORM_SCHEMA
2. Save as new form
3. Open in edit mode

There is no separate "create" vs "edit" -
you're always editing a copy of the default.
```

---

## Tab Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PROPOSAL #1042 - Johnson Residence                    [Draft ▾] [Save]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────┐ ┌──────────┐ ┌─────────┐ ┌───────┐ ┌───────────┐ ┌────────┐  │
│  │ Info │ │ Products │ │ Pricing │ │ Terms │ │Lead Times │ │  Misc  │  │
│  └──────┘ └──────────┘ └─────────┘ └───────┘ └───────────┘ └────────┘  │
│                                                                         │
│  ┌──────────┐ ┌──────────────┐                                         │
│  │Documents │ │ Presentation │                                         │
│  └──────────┘ └──────────────┘                                         │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │                     TAB CONTENT AREA                            │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

TAB ORDER:
1. Info          - Project/client metadata (quartet layout)
2. Products      - Product line items and AI extraction
3. Pricing       - Cost sections with calculations (horizontal subsections)
4. Terms         - Payment/delivery terms (horizontal subsections)
5. Lead Times    - Project phases with durations (NEW)
6. Miscellaneous - Custom references and notes (NEW)
7. Documents     - File uploads
8. Presentation  - Output configuration
```

---

## Tab 1: Info

### Purpose
Capture all project and client metadata in a sleek, Apple-level design.

### Layout: Quartet of Boxes

The Info tab uses a 2x2 grid layout ("quartet") for clean visual organization:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  INFO                                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │ PROJECT DETAILS             │  │ CREATED BY                      │   │
│  │                             │  │                                 │   │
│  │ Project Name*               │  │ [Dropdown: Name]                │   │
│  │ Date                        │  │ Email (auto-filled from user)   │   │
│  │ Proposal Number (auto)      │  │                                 │   │
│  │ Quote Status [Draft|...]    │  │ DateTime Created (auto)         │   │
│  │ Quote Source [Referral|...] │  │                                 │   │
│  └─────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │ CLIENT INFORMATION          │  │ JOB DETAILS                     │   │
│  │                             │  │                                 │   │
│  │ Client Name*                │  │ Job Location                    │   │
│  │ Company Name                │  │ Job Type [Union | Non-Union]    │   │
│  │ Address (autocomplete)      │  │ Estimated Due Date              │   │
│  │ Phone Number                │  │ Notes (optional textarea)       │   │
│  │                             │  │                                 │   │
│  └─────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Box Descriptions

**Top Left - Project Details:**
- Project Name* (required)
- Date (proposal date)
- Proposal Number (auto-generated based on org numbering config)
- Quote Status dropdown [Draft | Pending | Approved | Rejected]
- Quote Source dropdown [Referral | Website | Cold Call | Repeat | Other]

**Top Right - Created By:**
- Who's quoting dropdown (org members with name/email)
- DateTime created (auto, read-only)

**Bottom Left - Client Information:**
- Client Name* (required)
- Company Name
- Address (with autocomplete)
- Phone Number

**Bottom Right - Job Details:**
- Job Location (can differ from client address)
- Job Type [Union | Non-Union] (was Prevailing Wage | Standard)
- Estimated Due Date (date picker)
- Notes (optional textarea)

### Design Requirements
- Clean, minimal borders - Apple-level aesthetic
- Cards with subtle shadows, not heavy borders
- Consistent padding and spacing
- Labels above inputs, not inline
- Auto-save on field blur

---

## Tab 2: Products

### Purpose
Add products via AI extraction or manual entry.

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PRODUCTS                                            [+ Add Product]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  IMPORT OPTIONS                                                   │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │ │
│  │  │ Upload PDF  │  │ Paste Text  │  │ Manual Entry│               │ │
│  │  │ or Image    │  │             │  │             │               │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  PRODUCT LIST                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Product Name          Qty    Unit Price    Total         Actions  │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │ Kwil Panel 4x8        12     $245.00       $2,940.00     [···]   │ │
│  │ Corner Trim           8      $45.00        $360.00       [···]   │ │
│  │ ⚠ Misc Hardware       ??     ??            ??            [Fix]   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  CASCADING/TEXT PRODUCTS                                                │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ "Additional wall accessories as discussed..."           [Edit]    │ │
│  │ Assigned Total: $500.00                                           │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│                                            Products Subtotal: $3,800.00 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Features
- AI extraction from PDF/images
- Paste text extraction
- Manual line item entry
- Cascading text with assigned total
- Resolution flow for incomplete items
- Category tagging for template zones

---

## Tab 3: Pricing

### Purpose
Define all cost sections with automatic calculations.

### Section Structure

Each pricing section contains:
- Section header (collapsible)
- Dynamic line items
- Section subtotal

### Default Sections

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PRICING                                                    Grand Total │
│                                                              $12,450.00 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ▼ MERCHANDISE                                      Subtotal: $3,800.00 │
│    (Pulled from Products tab - read only here)                          │
│                                                                         │
│  ▼ DELIVERY & INSTALLATION                          Subtotal: $2,400.00 │
│    ┌──────────────────────────────────────────────────────────────────┐│
│    │ Name           Qty   Sell Rule    Unit Cost  Markup%  Sell Price ││
│    ├──────────────────────────────────────────────────────────────────┤│
│    │ [D&I Labor   ] [2 ] [Per Day  ▾] [$800    ] [25%  ] $2,000.00   ││
│    │ [Equipment   ] [1 ] [Flat Rate▾] [$400    ] [0%   ] $400.00     ││
│    │                                            [+ Add Line Item]     ││
│    └──────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ▼ LABOR                                            Subtotal: $3,200.00 │
│    ┌──────────────────────────────────────────────────────────────────┐│
│    │ Name           Qty   Sell Rule    Unit Cost  Markup%  Sell Price ││
│    ├──────────────────────────────────────────────────────────────────┤│
│    │ [Installer 1 ] [24] [Per Hour ▾] [$85     ] [20%  ] $2,448.00   ││
│    │ [Installer 2 ] [16] [Per Hour ▾] [$75     ] [20%  ] $1,440.00   ││
│    │                                            [+ Add Line Item]     ││
│    └──────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ▼ FREIGHT & SHIPPING                               Subtotal: $1,200.00 │
│    ┌──────────────────────────────────────────────────────────────────┐│
│    │ [Freight     ] [1 ] [Flat Rate▾] [$950    ] [25%  ] $1,187.50   ││
│    │                                            [+ Add Line Item]     ││
│    └──────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ▼ TARIFFS & FEES                                   Subtotal: $350.00   │
│    ┌──────────────────────────────────────────────────────────────────┐│
│    │ [Import Duty ] [1 ] [Flat Rate▾] [$350    ] [0%   ] $350.00     ││
│    │                                            [+ Add Line Item]     ││
│    └──────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ► OTHER COSTS (click to expand)                    Subtotal: $0.00     │
│                                                                         │
│  [+ Add Section]                                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Sell Rules
- Per Hour
- Per Day
- Per Job
- Per Unit
- Per Sq Ft
- Flat Rate

### Calculations
```typescript
// Per line item
sellPrice = (qty * unitCost) * (1 + markupPercent / 100)

// Per section
sectionSubtotal = sum(lineItems.sellPrice)

// Grand total
grandTotal = sum(sections.subtotal)
```

### Features
- Collapsible sections
- Drag to reorder sections
- Add custom sections
- Real-time calculation
- Markup templates (save/load common markup %)

---

## Tab 4: Terms

### Purpose
Simple pricing and delivery terms with horizontal subsection navigation.

### Layout: Horizontal Subsections

Terms uses a simplified horizontal nav for subsections - clean, minimal, Apple-style.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TERMS                                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐               │
│  │ Pricing Terms  │ │ Delivery Terms │ │ Exclusions     │               │
│  └────────────────┘ └────────────────┘ └────────────────┘               │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  (Active subsection content appears below)                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Subsection: Pricing Terms
```
┌──────────────────────────────────────────────────────────────────────────┐
│  Payment Schedule:                                                       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ [30%] upon [Contract Signing        ▾]                             │ │
│  │ [40%] upon [Track Installation      ▾]                             │ │
│  │ [30%] upon [Project Completion      ▾]                             │ │
│  │                                            [+ Add Milestone]       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Payment Methods: ☑ Check  ☑ Wire  ☑ Credit Card  ☐ Cash                │
│  Net Terms: [Net 30 ▾]                                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Subsection: Delivery Terms
```
┌──────────────────────────────────────────────────────────────────────────┐
│  Delivery Method: [On-site Delivery ▾]                                   │
│  Delivery Notes: [_________________________________]                     │
│                                                                          │
│  Warranty:                                                               │
│  Product Warranty: [5 years ▾]                                           │
│  Labor Warranty: [1 year ▾]                                              │
│  Additional Notes: [________________________]                            │
└──────────────────────────────────────────────────────────────────────────┘
```

### Subsection: Exclusions
```
┌──────────────────────────────────────────────────────────────────────────┐
│  ☑ Electrical work                                                       │
│  ☑ Structural modifications                                              │
│  ☑ Permits and inspections                                               │
│  ☐ Site cleanup                                                          │
│  [+ Add Exclusion: ________________]                                     │
│                                                                          │
│  General Notes:                                                          │
│  [Rich text area for additional notes...]                                │
└──────────────────────────────────────────────────────────────────────────┘
```

### Design Requirements
- Horizontal subsection tabs (pill buttons or underlined tabs)
- Only one subsection visible at a time
- Clean card-based layout for content
- Minimal visual clutter

---

## Tab 5: Lead Times

### Purpose
Track project phases with durations and reference dates. Essential for project scheduling and client expectations.

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LEAD TIMES                                                [+ Add Item] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Phase Name          Duration        Unit         Reference Date   │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ Shop Drawings       [2    ]         [Weeks ▾]    [From: Order]    │  │
│  │ Manufacturing       [4    ]         [Weeks ▾]    [From: Approval] │  │
│  │ Shipping            [5    ]         [Days  ▾]    [From: Mfg Done] │  │
│  │ Track Installation  [2    ]         [Days  ▾]    [From: Delivery] │  │
│  │ Panel Installation  [4    ]         [Days  ▾]    [From: Track]    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ TOTAL ESTIMATED: ~6 weeks 4 days from order placement             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Line Item Fields
- **Phase Name**: Text input for phase/milestone name
- **Duration**: Numeric input
- **Unit**: Dropdown [Days | Weeks | Months]
- **Reference Date**: Dropdown for what this duration is measured from
  - From: Order Placement
  - From: Approval
  - From: Previous Phase
  - From: Specific Date
  - Custom text

### Features
- Drag to reorder phases
- Auto-calculate total estimated timeline
- Optional: Timeline visualization (Gantt-lite)
- Copy from template (save/load common lead time templates)

### Design Requirements
- Clean table layout with minimal borders
- Inline editing (click to edit)
- Duration unit selector as compact dropdown
- Reference dates as contextual dropdowns

---

## Tab 6: Miscellaneous

### Purpose
Custom references, notes, and any additional information that doesn't fit elsewhere.

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MISCELLANEOUS                                          [+ Add Section] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ▼ REFERENCE NUMBERS                                                     │
│    ┌──────────────────────────────────────────────────────────────────┐ │
│    │ Label                         Value                              │ │
│    ├──────────────────────────────────────────────────────────────────┤ │
│    │ [PO Number           ]        [PO-2024-1234    ]                 │ │
│    │ [Job Number          ]        [J-456           ]                 │ │
│    │ [Contract Number     ]        [C-789           ]                 │ │
│    │                                           [+ Add Reference]      │ │
│    └──────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ▼ CUSTOM FIELDS                                                         │
│    ┌──────────────────────────────────────────────────────────────────┐ │
│    │ [Field Label    ]    [Field Value                            ]   │ │
│    │                                           [+ Add Custom Field]   │ │
│    └──────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ▼ INTERNAL NOTES                                                        │
│    ┌──────────────────────────────────────────────────────────────────┐ │
│    │ [Rich text area - not shown in final proposal output...]        │ │
│    │                                                                  │ │
│    └──────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Sections

**Reference Numbers:**
- Key-value pairs for common reference numbers
- Common labels: PO Number, Job Number, Contract Number, RFQ Number
- Fully customizable labels

**Custom Fields:**
- Arbitrary label-value pairs
- For any additional data the organization needs to track

**Internal Notes:**
- Rich text area for internal team notes
- Not included in client-facing output
- Marked clearly as "Internal Only"

### Features
- Collapsible sections
- Add custom sections
- Import from previous proposals
- Templates for common reference sets

### Design Requirements
- Clean key-value layout
- Subtle section headers
- "Internal Only" badge for notes section
- Minimal visual clutter

---

## Tab 7: Documents

### Purpose
Store all project-related files in one location.

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  DOCUMENTS                                             [Upload Files]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                                                                   │ │
│  │      Drag and drop files here, or click to browse                │ │
│  │                                                                   │ │
│  │      Supported: PDF, Images, Word, Excel (max 25MB)              │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  UPLOADED FILES                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ ▼ Supplier Quotes (2)                                             │ │
│  │   ├─ studio_ps5_quote.pdf         2.3 MB   Dec 5, 2024   [···]   │ │
│  │   └─ hardware_pricing.xlsx        145 KB   Dec 4, 2024   [···]   │ │
│  │                                                                   │ │
│  │ ▼ Site Photos (4)                                                 │ │
│  │   ├─ site_measurement_1.jpg       1.2 MB   Dec 3, 2024   [···]   │ │
│  │   ├─ site_measurement_2.jpg       1.1 MB   Dec 3, 2024   [···]   │ │
│  │   └─ ... 2 more                                                   │ │
│  │                                                                   │ │
│  │ ▼ Client Communications (1)                                       │ │
│  │   └─ project_requirements.pdf     450 KB   Dec 1, 2024   [···]   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Categories: [Supplier Quotes] [Site Photos] [Communications] [Other]  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Features
- Drag-and-drop upload
- Automatic categorization suggestions
- Manual category assignment
- Preview PDFs/images inline
- Download individual or all files
- Link documents to specific products (optional)

---

## Tab 8: Presentation

### Purpose
Configure how the proposal is presented and distributed. This is where you build the document template by selecting which fields from other tabs to include.

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PRESENTATION                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TEMPLATE CONFIGURATION                                                 │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                                                                   │ │
│  │  Data Available:              Template Builder:                   │ │
│  │  ┌─────────────────────┐     ┌─────────────────────────────────┐ │ │
│  │  │ INFO                │     │                                 │ │ │
│  │  │ ├─ project_name     │     │  [Drag fields here to build]    │ │ │
│  │  │ ├─ proposal_number  │     │                                 │ │ │
│  │  │ ├─ client_name      │     │  {{company_logo}}               │ │ │
│  │  │ ├─ client_company   │     │  Proposal #{{proposal_number}}  │ │ │
│  │  │ └─ ...              │     │                                 │ │ │
│  │  │                     │     │  To: {{client_name}}            │ │ │
│  │  │ PRODUCTS            │     │  {{client_company}}             │ │ │
│  │  │ ├─ [Zone: Summary]  │     │                                 │ │ │
│  │  │ └─ [Zone: Detail]   │     │  [PRODUCT ZONE: Summary]        │ │ │
│  │  │                     │     │  Fields: name, qty, price       │ │ │
│  │  │ PRICING             │     │                                 │ │ │
│  │  │ ├─ grand_total      │     │  Total: {{grand_total}}         │ │ │
│  │  │ ├─ subtotals        │     │                                 │ │ │
│  │  │ └─ ...              │     │                                 │ │ │
│  │  │                     │     │  Terms: {{payment_terms}}       │ │ │
│  │  │ TERMS               │     │                                 │ │ │
│  │  │ ├─ payment_terms    │     │  [+ Add Section]                │ │ │
│  │  │ └─ timeline         │     │                                 │ │ │
│  │  └─────────────────────┘     └─────────────────────────────────┘ │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  OUTPUT OPTIONS                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                                                                   │ │
│  │  Format: ○ Visual PDF  ○ Text Quote  ○ Email Body  ○ Print       │ │
│  │                                                                   │ │
│  │  Branding:                                                        │ │
│  │  ☑ Include company logo                                          │ │
│  │  ☑ Include company footer                                        │ │
│  │  ☐ Include terms & conditions                                    │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐   │
│  │ Preview    │  │ Download   │  │ Send Email │  │ Copy Link      │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tab Navigation Recommendation

### Top Bar (Recommended)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back    PROPOSAL #1042                              [Draft ▾] [Save]│
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────┐ ┌──────────┐ ┌─────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Info │ │ Products │ │ Pricing │ │ Terms  │ │Documents │ │ Present. │ │
│  │  ✓   │ │    ⚠     │ │         │ │        │ │          │ │          │ │
│  └──────┘ └──────────┘ └─────────┘ └────────┘ └──────────┘ └──────────┘ │
├───────────────────────────────────────────────────────────────────────────┤
```

**Why Top Bar:**
- Full width for content area
- Clear linear progression (left to right)
- Familiar pattern (checkout flows, wizards)
- Status indicators visible at glance
- Better for 5-6 tabs than sidebar

### Alternative: Icon Sidebar

```
┌────┬────────────────────────────────────────────────────────────────────┐
│    │  PROPOSAL #1042                               [Draft ▾] [Save]    │
│ ℹ️  ├────────────────────────────────────────────────────────────────────┤
│ ✓  │                                                                    │
│    │                                                                    │
│ 📦 │                                                                    │
│ ⚠  │                    CONTENT AREA                                   │
│    │                                                                    │
│ 💰 │                                                                    │
│    │                                                                    │
│ 📋 │                                                                    │
│    │                                                                    │
│ 📁 │                                                                    │
│    │                                                                    │
│ 📤 │                                                                    │
│    │                                                                    │
└────┴────────────────────────────────────────────────────────────────────┘
```

**When Sidebar Works:**
- Icons with tooltips (minimal text)
- More vertical space for content
- Matches app's existing sidebar pattern
- Good if tabs grow beyond 6

### Recommendation
**Start with top bar** - simpler, clearer for first iteration. Can switch to sidebar later if needed.

---

## Status System

### Proposal Statuses

```typescript
type ProposalStatus =
  | 'draft'        // Actively being edited
  | 'incomplete'   // Has unresolved fields/products
  | 'ready'        // All fields complete, ready to send
  | 'sent'         // Sent to client
  | 'viewed'       // Client opened it
  | 'approved'     // Client accepted
  | 'rejected'     // Client declined
  | 'expired';     // Past validity date
```

### Completion Tracking

Simple boolean flag on the proposals table:

```sql
-- proposals table column
is_complete BOOLEAN NOT NULL DEFAULT false
```

When `is_complete = false`:
- Red hazard icon (⚠️) appears next to project name in proposals table
- Tooltip shows "Unfinished" on hover

No complex per-tab completion tracking. Just a simple flag that the user toggles when they consider the proposal complete.

---

## Data Model

### Core Types

```typescript
// Main proposal entity
interface Proposal {
  id: string;
  organization_id: string;
  created_by: string;

  // Metadata
  proposal_number: string;
  status: ProposalStatus;
  created_at: string;
  updated_at: string;

  // Reference to form schema
  form_id: string;

  // All tab data in one JSONB field
  form_data: FormData;  // { info: {...}, products: {...}, pricing: {...}, ... }

  // Presentation config (separate - for template building)
  presentation_config: PresentationConfig;

  // Simple completion flag
  is_complete: boolean;  // false shows hazard icon in proposals table
}

// Tab 1: Info (Quartet Layout)
interface ProposalInfo {
  // Top Left - Project Details
  project_name: string;
  proposal_date: string;
  proposal_number: string;  // Auto-generated
  quote_status: 'draft' | 'pending' | 'approved' | 'rejected';
  quote_source: 'referral' | 'website' | 'cold_call' | 'repeat' | 'other';

  // Top Right - Created By
  created_by_user_id: string;  // Org member dropdown
  created_by_name: string;     // Auto-filled from user
  created_by_email: string;    // Auto-filled from user
  date_time_created: string;   // Auto, read-only

  // Bottom Left - Client Information
  client_name: string;
  client_company?: string;
  client_address?: Address;
  client_phone?: string;

  // Bottom Right - Job Details
  job_location?: Address;
  job_type: 'union' | 'non_union';  // Was prevailing/standard
  estimated_due_date?: string;
  job_notes?: string;
}

// Tab 2: Products
interface ProposalProducts {
  line_items: ProductLineItem[];
  cascading_items: CascadingProduct[];
  subtotal: number;
}

interface ProductLineItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  category?: string;
  source: 'ai_extracted' | 'manual';
  resolved: boolean;
  // All 17+ possible fields
  sku?: string;
  supplier?: string;
  lead_time?: string;
  // ...
}

interface CascadingProduct {
  id: string;
  description: string;
  assigned_total: number;
  category?: string;
}

// Tab 3: Pricing
interface ProposalPricing {
  sections: PricingSection[];
  grand_total: number;
}

interface PricingSection {
  id: string;
  name: string;
  type: 'merchandise' | 'delivery_install' | 'labor' |
        'freight' | 'tariffs' | 'other';
  order: number;
  line_items: PricingLineItem[];
  subtotal: number;
  collapsed: boolean;
}

interface PricingLineItem {
  id: string;
  name: string;
  quantity: number;
  sell_rule: 'per_hour' | 'per_day' | 'per_job' |
             'per_unit' | 'per_sqft' | 'flat_rate';
  unit_cost: number;
  markup_percent: number;
  sell_price: number;  // Calculated
}

// Tab 4: Terms
interface ProposalTerms {
  payment_schedule: PaymentMilestone[];
  payment_methods: string[];
  net_terms: string;
  timeline: TimelinePhase[];
  exclusions: string[];
  warranty: {
    product: string;
    labor: string;
    notes?: string;
  };
  notes?: string;
}

interface PaymentMilestone {
  percentage: number;
  trigger: string;
}

// Tab 5: Lead Times
interface ProposalLeadTimes {
  phases: LeadTimePhase[];
  total_estimated_duration?: string;  // Calculated
}

interface LeadTimePhase {
  id: string;
  phase_name: string;
  duration: number;
  duration_unit: 'days' | 'weeks' | 'months';
  reference_type: 'order_placement' | 'approval' | 'previous_phase' | 'specific_date' | 'custom';
  reference_text?: string;  // For custom references
  order: number;
}

// Tab 6: Miscellaneous
interface ProposalMiscellaneous {
  reference_numbers: ReferenceNumber[];
  custom_fields: CustomField[];
  internal_notes?: string;  // Not included in client output
}

interface ReferenceNumber {
  id: string;
  label: string;   // e.g., "PO Number", "Job Number"
  value: string;   // e.g., "PO-2024-1234"
}

interface CustomField {
  id: string;
  label: string;
  value: string;
}

// Tab 8: Presentation Config
interface PresentationConfig {
  template_zones: TemplateZone[];
  format: 'pdf' | 'text' | 'email' | 'print';
  branding: {
    include_logo: boolean;
    include_footer: boolean;
    include_terms: boolean;
  };
}

interface TemplateZone {
  id: string;
  name: string;
  type: 'static' | 'line_items' | 'cascading' | 'text';
  position: number;
  visible_fields?: string[];
  style?: 'table' | 'list' | 'paragraph';
}

// Form Data - unified structure for all tab values
// Uses {{tab_id.field_id}} pattern for variable references
interface FormData {
  info: ProposalInfo;
  products: ProposalProducts;
  pricing: ProposalPricing;
  terms: ProposalTerms;
  lead_times: ProposalLeadTimes;
  miscellaneous: ProposalMiscellaneous;
  documents: Record<string, any>;
  [customTabId: string]: Record<string, any>;  // Custom tabs
}
```

### Database Schema

```sql
-- Forms table (schema/template definition)
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,

  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Full schema: tabs → sections → fields
  schema JSONB NOT NULL,

  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proposals table (actual data)
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,

  -- Reference to form schema
  form_id UUID REFERENCES forms(id),

  proposal_number VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',

  -- ALL tab data in one JSONB field
  -- Structure: { "info": {...}, "products": {...}, "pricing": {...}, "custom_tab": {...} }
  form_data JSONB NOT NULL DEFAULT '{}',

  -- Presentation config (separate)
  presentation_config JSONB DEFAULT '{}',

  -- Simple completion flag (false shows hazard icon in proposals table)
  is_complete BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, proposal_number)
);

-- Documents linked to proposals
CREATE TABLE proposal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,

  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(50),
  category VARCHAR(50),

  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id)
);

-- RLS policies
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_documents ENABLE ROW LEVEL SECURITY;

-- Users can only see forms from their organization
CREATE POLICY forms_org_policy ON forms
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  ));

-- Users can only see proposals from their organization
CREATE POLICY proposals_org_policy ON proposals
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  ));
```

### Variable Reference Pattern

All fields (default and custom) are referenced the same way:

```
{{tab_id.field_id}}

Examples:
{{info.project_name}}        → "Johnson Residence"
{{info.client_name}}         → "John Smith"
{{pricing.grand_total}}      → "$12,450.00"
{{terms.payment_schedule}}   → "30% now, 40% on install..."
{{site_survey.surveyor}}     → "Mike" (custom tab field)
```

---

## Component Architecture

### New Directory Structure

```
src/
├── features/
│   └── proposals/                    # NEW FEATURE
│       ├── components/
│       │   ├── ProposalOverlay.tsx   # Main full-screen overlay
│       │   ├── ProposalHeader.tsx    # Title, status, save button
│       │   ├── ProposalTabs.tsx      # Tab navigation (top bar)
│       │   │
│       │   ├── tabs/
│       │   │   ├── InfoTab.tsx           # Quartet layout
│       │   │   ├── ProductsTab.tsx
│       │   │   ├── PricingTab.tsx        # Horizontal subsections
│       │   │   ├── TermsTab.tsx          # Horizontal subsections
│       │   │   ├── LeadTimesTab.tsx      # NEW - Phase durations
│       │   │   ├── MiscellaneousTab.tsx  # NEW - Custom references
│       │   │   ├── DocumentsTab.tsx
│       │   │   └── PresentationTab.tsx
│       │   │
│       │   ├── pricing/
│       │   │   ├── PricingSection.tsx
│       │   │   ├── PricingLineItem.tsx
│       │   │   └── PricingCalculator.tsx
│       │   │
│       │   ├── products/
│       │   │   ├── ProductImporter.tsx
│       │   │   ├── ProductTable.tsx
│       │   │   ├── ProductResolver.tsx
│       │   │   └── CascadingProduct.tsx
│       │   │
│       │   ├── terms/
│       │   │   ├── PaymentSchedule.tsx
│       │   │   ├── Timeline.tsx
│       │   │   └── Exclusions.tsx
│       │   │
│       │   └── presentation/
│       │       ├── TemplateBuilder.tsx
│       │       ├── TemplateZone.tsx
│       │       └── PresentationPreview.tsx
│       │
│       ├── hooks/
│       │   ├── useProposal.ts        # React Query hook
│       │   ├── useProposalForm.ts    # Form state management
│       │   ├── usePricingCalculator.ts
│       │   └── useProductExtraction.ts
│       │
│       ├── store/
│       │   └── proposalStore.ts      # Zustand for UI state
│       │
│       ├── services/
│       │   └── proposalService.ts    # API calls
│       │
│       └── types/
│           └── index.ts              # All proposal types
```

### Key Components

#### ProposalOverlay.tsx
```typescript
// Full-screen overlay that houses the entire proposal system
interface ProposalOverlayProps {
  proposalId?: string;  // Edit existing
  onClose: () => void;
}

export const ProposalOverlay: React.FC<ProposalOverlayProps> = ({
  proposalId,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const { proposal, updateProposal } = useProposal(proposalId);

  return (
    <div className="fixed inset-0 z-50 bg-offwhite">
      <ProposalHeader
        proposal={proposal}
        onClose={onClose}
        onSave={handleSave}
      />
      <ProposalTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'info' && <InfoTab />}
        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'pricing' && <PricingTab />}
        {activeTab === 'terms' && <TermsTab />}
        {activeTab === 'lead_times' && <LeadTimesTab />}
        {activeTab === 'miscellaneous' && <MiscellaneousTab />}
        {activeTab === 'documents' && <DocumentsTab />}
        {activeTab === 'presentation' && <PresentationTab />}
      </div>
    </div>
  );
};
```

---

## Code to Deprecate/Remove

### Move to _deprecated/

Based on the new proposal system, the following can be deprecated:

```
DEPRECATE IMMEDIATELY (No longer needed)
─────────────────────────────────────────

/src/features/form-builder/
├── components/
│   ├── FormBuilderCanvas.tsx      # Drag-drop canvas
│   ├── TabManager.tsx             # Custom tab builder
│   ├── FieldEditor.tsx            # Field properties panel
│   ├── FieldItem.tsx              # Draggable field cards
│   ├── FormComponents.tsx         # Draggable field palette
│   └── CreateFormDialog.tsx       # Form creation dialog
├── store/
│   └── formBuilderStore.ts        # Form builder state
└── types/
    ├── index.ts                   # Old form types
    └── enhanced.ts                # Grid layout types

/src/pages/
├── FormBuilder.tsx                # Form builder page
├── FormBuilderV3.tsx              # Grid-based builder
└── FormsPage.tsx                  # Forms list page

/src/features/document-builder/    # Keep for now, may integrate
                                   # into Output tab later
```

### Keep / Repurpose

```
KEEP (Still useful)
───────────────────

/src/components/ui/                # All UI components
/src/features/form-builder/components/
├── DynamicFormRenderer.tsx        # May repurpose for proposal forms
└── DynamicField.tsx               # Field rendering logic

/src/stores/
├── ui/uiStore.ts                  # Global UI state
└── forms/formsStore.ts            # React Query integration

/src/features/document-builder/    # Template system - integrate later
```

### Already Deprecated

```
ALREADY IN _deprecated/ (Confirm removal safe)
──────────────────────────────────────────────

/src/_deprecated/components/quotes/    # Old quote system
/src/_deprecated/pages/                # Old quote pages
/src/_deprecated/templates/            # Old templates
/src/_deprecated/lib/types/walls/      # Wall type definitions
```

---

## Implementation Phases

### Phase 0: Form Schema System
- [ ] Create form schema types (TabSchema, SectionSchema, FieldSchema)
- [ ] Create DEFAULT_FORM_SCHEMA constant with all default tabs/sections/fields
- [ ] Create database migration for `forms` table
- [ ] Create formsService with CRUD operations
- [ ] Build Form Builder UI (edit tabs, sections, fields)
- [ ] Build "Create New Form" flow (copy default → edit)
- [ ] Forms list page

### Phase 1: Proposal Foundation
- [ ] Create proposal types and interfaces
- [ ] Create database migration for `proposals` table
- [ ] Set up proposalService with CRUD operations
- [ ] Create useProposal React Query hook
- [ ] Create proposalStore for UI state
- [ ] Build ProposalOverlay shell component
- [ ] Build ProposalHeader with status/save
- [ ] Build ProposalTabs navigation (renders tabs from form schema)

### Phase 2: Info Tab (Quartet Layout)
- [ ] Build InfoTab component with 2x2 grid layout
- [ ] Top Left: Project Details box (name, date, proposal#, status, source)
- [ ] Top Right: Created By box (user dropdown, email, datetime)
- [ ] Bottom Left: Client Information box (name, company, address, phone)
- [ ] Bottom Right: Job Details box (location, type, due date, notes)
- [ ] Auto-save on blur
- [ ] Apple-level styling (subtle shadows, minimal borders)

### Phase 3: Products Tab
- [ ] Build ProductsTab component
- [ ] Manual product entry form
- [ ] Product table with edit/delete
- [ ] Cascading product support
- [ ] (Later) AI extraction integration

### Phase 4: Pricing Tab (Horizontal Subsections)
- [ ] Build PricingTab component with horizontal subsection nav
- [ ] PricingSection collapsible component
- [ ] PricingLineItem with calculations
- [ ] Add/remove sections
- [ ] Add/remove line items
- [ ] Real-time grand total
- [ ] Sell rule dropdown

### Phase 5: Terms Tab (Horizontal Subsections)
- [ ] Build TermsTab component with horizontal subsection nav
- [ ] Subsection: Pricing Terms (payment schedule, methods, net terms)
- [ ] Subsection: Delivery Terms (delivery method, warranty)
- [ ] Subsection: Exclusions (checklist, general notes)
- [ ] Clean pill-button or underlined tab design

### Phase 6: Lead Times Tab (NEW)
- [ ] Build LeadTimesTab component
- [ ] Phase list with duration/unit/reference
- [ ] Drag to reorder phases
- [ ] Auto-calculate total estimated timeline
- [ ] Duration unit selector (days/weeks/months)
- [ ] Reference date dropdown

### Phase 7: Miscellaneous Tab (NEW)
- [ ] Build MiscellaneousTab component
- [ ] Reference numbers section (PO, Job, Contract numbers)
- [ ] Custom fields section (label-value pairs)
- [ ] Internal notes section (marked "not in output")
- [ ] Collapsible sections

### Phase 8: Documents Tab
- [ ] Build DocumentsTab component
- [ ] File upload with drag-drop
- [ ] File categorization
- [ ] File list with preview
- [ ] Supabase storage integration

### Phase 9: Presentation Tab
- [ ] Build PresentationTab component
- [ ] Template zone configuration
- [ ] Field selector from available data (using {{tab_id.field_id}} pattern)
- [ ] Product zone configuration
- [ ] Output format selection (PDF, text, email)
- [ ] Preview generation

### Phase 10: Polish & Integration
- [ ] Status workflow (draft → sent → approved)
- [ ] Proposal list/table view
- [ ] Search and filter proposals
- [ ] Duplicate proposal
- [ ] Delete proposal
- [ ] PDF generation
- [ ] Email integration

---

## Design Guidelines

### Apple-Level Design Principles

The Form Builder should embody a sleek, modern, and simple aesthetic. **No tacky AI design slop.**

**Core Principles:**
1. **Minimalism** - Every element must serve a purpose. Remove visual clutter.
2. **Whitespace** - Generous padding and margins create breathing room.
3. **Subtle Depth** - Use soft shadows instead of heavy borders.
4. **Consistency** - Uniform spacing, sizing, and styling throughout.
5. **Clarity** - Information hierarchy is immediately obvious.

**Visual Characteristics:**
- Cards with subtle `shadow-sm` or `shadow-md`, not thick borders
- Rounded corners (`rounded-lg` or `rounded-xl`)
- Clean typography with proper font weights
- Muted colors for backgrounds, accent for key actions
- Smooth transitions and micro-interactions
- Labels above inputs, never inline
- Generous internal padding (p-4 to p-6)
- Consistent gap spacing (gap-4, gap-6)

**What to AVOID:**
- Heavy black borders
- Gradient backgrounds (unless very subtle)
- Drop shadows that are too dark or large
- Cluttered layouts with too many elements
- Inconsistent spacing or sizing
- Generic "AI-generated" aesthetic
- Over-designed icons or graphics

### Color Usage (From existing design system)

```css
/* Backgrounds */
--bg-primary: #F7F2E9;      /* offwhite - main background */
--bg-secondary: #FFFFFF;    /* white - cards, sections */
--bg-accent: rgba(238, 108, 77, 0.1);  /* coral 10% - highlights */

/* Text */
--text-primary: #171717;    /* charcoal - headings */
--text-secondary: #343432;  /* dark-gray - body */
--text-muted: #B8B7B6;      /* light-gray - placeholders */

/* Accent */
--coral: #EE6C4D;           /* primary accent */
--coral-hover: #E55A3A;     /* hover state */

/* Status */
--success: #22C55E;
--warning: #F59E0B;
--error: #EF4444;
```

### Component Styling

```tsx
// Section card
<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">

// Tab active state
<button className="px-4 py-2 border-b-2 border-coral text-charcoal font-medium">

// Input fields
<input className="w-full px-3 py-2 border border-gray-300 rounded-md
                  focus:outline-none focus:ring-2 focus:ring-coral/50
                  focus:border-coral" />

// Primary button
<button className="bg-coral hover:bg-coral-hover text-white px-4 py-2
                   rounded-md font-medium transition-colors">

// Add line item button
<button className="text-coral hover:text-coral-hover text-sm font-medium
                   flex items-center gap-1">
  <Plus size={16} /> Add Line Item
</button>
```

---

## Open Questions

1. **Tab Navigation**: Top bar vs sidebar - recommend **top bar** for V1

2. **Auto-save Frequency**:
   - On blur (recommended)
   - Every 30 seconds
   - Manual save only

3. **Product AI Extraction**:
   - Build in Phase 3 or defer?
   - Use OpenAI Vision or Claude?

4. **Template System**:
   - How complex should Output tab be in V1?
   - Simple field mapping or full builder?

5. **Existing Forms**:
   - Migration path for existing forms?
   - Or fresh start with proposals?

---

## Next Steps

1. Review and approve this plan
2. Clarify open questions
3. Create feature branch: `feature/proposal-system`
4. Begin Phase 1 implementation

---

*Plan created: December 8, 2024*
*Updated: December 9, 2024 - Added Lead Times tab, Miscellaneous tab, quartet layout for Info, horizontal subsections for Terms/Pricing, Apple-level design guidelines*
*Status: Ready for implementation*
