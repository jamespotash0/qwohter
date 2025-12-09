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
│  ┌──────┐ ┌──────────┐ ┌─────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐│
│  │ Info │ │ Products │ │ Pricing │ │ Terms  │ │Documents │ │Presentatn││
│  └──────┘ └──────────┘ └─────────┘ └────────┘ └──────────┘ └──────────┘│
│                                                                         │
│  [+ Add Tab]  ← Custom tabs appear between Documents and Presentation   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │                     TAB CONTENT AREA                            │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tab 1: Info

### Purpose
Capture all project and client metadata.

### Sections

```
PROJECT DETAILS
├── Project Name*
├── Proposal Number (auto-generated, editable)
├── Date Created (auto)
├── Quote Status [Draft | Pending | Approved | Rejected]
└── Quote Source [Referral | Website | Cold Call | Repeat | Other]

CLIENT INFORMATION
├── Client Name*
├── Company Name
├── Address (with autocomplete)
├── Phone Number
└── Email

JOB DETAILS
├── Job Location (can differ from client address)
├── Job Type [Prevailing Wage | Standard]
└── Job Description (optional textarea)
```

### Field Completion Tracking
- Required fields marked with *
- Visual indicator for incomplete sections
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

## Tab 4: Miscellaneous / Terms

### Purpose
Additional terms, timelines, and notes.

### Sections

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TERMS & CONDITIONS                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ▼ PAYMENT TERMS                                                        │
│    ┌──────────────────────────────────────────────────────────────────┐│
│    │ Payment Schedule:                                                ││
│    │ ┌────────────────────────────────────────────────────────────┐  ││
│    │ │ [30%] upon [Contract Signing        ▾]                     │  ││
│    │ │ [40%] upon [Track Installation      ▾]                     │  ││
│    │ │ [30%] upon [Project Completion      ▾]                     │  ││
│    │ │                                          [+ Add Milestone] │  ││
│    │ └────────────────────────────────────────────────────────────┘  ││
│    │                                                                  ││
│    │ Payment Methods: ☑ Check  ☑ Wire  ☑ Credit Card  ☐ Cash        ││
│    │ Net Terms: [Net 30 ▾]                                           ││
│    └──────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ▼ PROJECT TIMELINE                                                     │
│    ┌──────────────────────────────────────────────────────────────────┐│
│    │ Phase                    Duration                                ││
│    │ [Shop Drawings        ] [2 weeks    ]                           ││
│    │ [Manufacturing        ] [4 weeks    ]                           ││
│    │ [Track Installation   ] [2 days     ]                           ││
│    │ [Panel Installation   ] [4 days     ]                           ││
│    │                                          [+ Add Phase]          ││
│    └──────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ▼ EXCLUSIONS                                                           │
│    ┌──────────────────────────────────────────────────────────────────┐│
│    │ ☑ Electrical work                                               ││
│    │ ☑ Structural modifications                                      ││
│    │ ☑ Permits and inspections                                       ││
│    │ ☐ Site cleanup                                                   ││
│    │ [+ Add Exclusion: ________________]                              ││
│    └──────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ▼ WARRANTY                                                             │
│    ┌──────────────────────────────────────────────────────────────────┐│
│    │ Product Warranty: [5 years ▾]                                    ││
│    │ Labor Warranty: [1 year ▾]                                       ││
│    │ Additional Notes: [________________________]                     ││
│    └──────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ▼ NOTES                                                                │
│    ┌──────────────────────────────────────────────────────────────────┐│
│    │ [Rich text area for additional notes...]                        ││
│    └──────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tab 5: Documents

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

## Tab 6: Presentation

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

// Tab 1: Info
interface ProposalInfo {
  // Project
  project_name: string;
  date_created: string;
  quote_status: 'draft' | 'pending' | 'approved' | 'rejected';
  quote_source: 'referral' | 'website' | 'cold_call' | 'repeat' | 'other';

  // Client
  client_name: string;
  client_company?: string;
  client_address?: Address;
  client_phone?: string;
  client_email?: string;

  // Job
  job_location?: Address;
  job_type: 'prevailing' | 'standard';
  job_description?: string;
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

interface TimelinePhase {
  phase: string;
  duration: string;
}

// Tab 6: Presentation Config
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
  info: Record<string, any>;
  products: Record<string, any>;
  pricing: Record<string, any>;
  terms: Record<string, any>;
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
│       │   │   ├── InfoTab.tsx
│       │   │   ├── ProductsTab.tsx
│       │   │   ├── PricingTab.tsx
│       │   │   ├── TermsTab.tsx
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

### Phase 2: Info Tab
- [ ] Build InfoTab component with all sections
- [ ] Project details form
- [ ] Client information form
- [ ] Job details form
- [ ] Auto-save on blur
- [ ] Completion tracking

### Phase 3: Products Tab
- [ ] Build ProductsTab component
- [ ] Manual product entry form
- [ ] Product table with edit/delete
- [ ] Cascading product support
- [ ] (Later) AI extraction integration

### Phase 4: Pricing Tab
- [ ] Build PricingTab component
- [ ] PricingSection collapsible component
- [ ] PricingLineItem with calculations
- [ ] Add/remove sections
- [ ] Add/remove line items
- [ ] Real-time grand total
- [ ] Sell rule dropdown

### Phase 5: Terms Tab
- [ ] Build TermsTab component
- [ ] PaymentSchedule builder
- [ ] Timeline builder
- [ ] Exclusions checklist
- [ ] Warranty settings
- [ ] Notes textarea

### Phase 6: Documents Tab
- [ ] Build DocumentsTab component
- [ ] File upload with drag-drop
- [ ] File categorization
- [ ] File list with preview
- [ ] Supabase storage integration

### Phase 7: Presentation Tab
- [ ] Build PresentationTab component
- [ ] Template zone configuration
- [ ] Field selector from available data (using {{tab_id.field_id}} pattern)
- [ ] Product zone configuration
- [ ] Output format selection (PDF, text, email)
- [ ] Preview generation

### Phase 8: Polish & Integration
- [ ] Status workflow (draft → sent → approved)
- [ ] Proposal list/table view
- [ ] Search and filter proposals
- [ ] Duplicate proposal
- [ ] Delete proposal
- [ ] PDF generation
- [ ] Email integration

---

## Design Guidelines

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
*Status: Awaiting review*
