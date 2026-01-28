# Forms & Form Builder

> **Location:** `src/features/proposals/`, `src/services/formsService.ts`, `src/services/templateService.ts`

## Architecture Overview

The form builder system uses a **two-mode editor pattern** with React Context for state management:

- **Builder Mode**: Design form templates with structure and default values
- **Filler Mode**: Enter data into proposals based on form templates

```
User navigates to /form-builder/:formId
  ↓
ProposalEditor fetches form via useForm(formId)
  ↓
FormBuilderProvider loads metadata via loadMetadata()
  ↓
User edits tabs → tab-specific setters (setPricingData, etc.)
  ↓
isDirty flag set, auto-save triggers (2-second debounce)
  ↓
updateForm() serializes via serializeFormMetadata()
  ↓
Metadata saved to forms.metadata JSONB column
```

## Data Model

### Form Definition

```typescript
interface Form {
  id: string;
  organization_id: string | null;      // Null for system templates
  name: string;
  description?: string;
  metadata?: FormMetadata | Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  is_default?: boolean;                // Default form for proposal creation
  is_template?: boolean;               // System template flag
  copied_from_form_id?: string | null; // Template lineage tracking
  document_type?: DocumentType;        // Proposal, Invoice, Service_Request
  presentation_template?: PresentationTemplate | null;
}
```

### Form Metadata Structure

```typescript
interface FormMetadata {
  config: FormConfiguration;  // Form structure (which tabs enabled)
  defaults: {                 // Default values for each tab
    pricing?: PricingData;
    leadTimes?: LeadTimesData;
    miscellaneous?: MiscellaneousData;
    products?: ProductsData;
    presentation?: PresentationData;
  };
}

interface FormConfiguration {
  version: number;
  tabs: {
    info: InfoTabConfig;              // Always enabled
    products: ProductsTabConfig;       // Custom products allowed?
    pricing: PricingTabConfig;         // Show markup? Show unit cost?
    leadTimes: LeadTimesTabConfig;    // Always enabled
    miscellaneous: MiscTabConfig;      // Show notes?
    documents: DocumentsTabConfig;     // File types, max size
    presentation: PresentationTabConfig; // Rich text or Google Docs?
  };
}
```

## Form Builder Context

**Location:** `src/features/proposals/context/FormBuilderContext.tsx`

Central state management for form editing:

```typescript
interface FormBuilderContextType {
  // Configuration (structure)
  config: FormConfiguration;
  setConfig: (config: FormConfiguration) => void;
  updateConfig: (updates: Partial<FormConfiguration>) => void;

  // Data (default values for tabs)
  data: FormBuilderData;
  isDirty: boolean;

  // Tab-specific setters
  setPricingData: (data: PricingData) => void;
  setLeadTimesData: (data: LeadTimesData) => void;
  setMiscellaneousData: (data: MiscellaneousData) => void;
  setProductsData: (data: ProductsData) => void;
  setPresentationData: (data: PresentationData) => void;

  // Load/reset functions
  loadMetadata: (metadata: FormMetadata) => void;
  resetData: () => void;
  markClean: () => void;
}
```

## The 7 Tabs

Each tab follows a consistent interface:

```typescript
interface TabComponentProps {
  mode: EditorMode;                    // 'builder' | 'filler'
  onDirtyChange?: (isDirty: boolean) => void;
  proposalData?: any;
}
```

| Tab | Data Section | Builder Features | Filler Features |
|-----|--------------|------------------|-----------------|
| **Info** | Client/project details | Configure required fields | 2x2 quartet layout entry |
| **Products** | Product catalog | Enable custom products | Browse/search products |
| **Pricing** | Cost sections | Configure sections, markup display | Line items with calculations |
| **Lead Times** | Project timeline | Define phases | Duration tracking |
| **Miscellaneous** | Custom fields | Add field definitions | Enter custom values |
| **Documents** | File uploads | Set allowed types, max size | Upload files |
| **Presentation** | Document generation | Configure sections | Rich text/Google Docs |

### Pricing Data Structure

```typescript
interface PricingData {
  sections: PricingSection[];  // Merchandise, Delivery, Labor, etc.
  globalMarkup: number;
  taxRate: number;
  summary: {
    subtotal: number;
    markup: number;
    tax: number;
    total: number;
  };
}

interface PricingSection {
  id: string;
  name: string;
  items: PricingItem[];
}

interface PricingItem {
  id: string;
  description: string;
  quantity: number;
  unitCost: number;
  markup: number;             // % or $
  discount?: number;
  taxable?: boolean;
  total: number;
}
```

### Lead Times Data Structure

```typescript
interface LeadTimesData {
  sections: LeadTimeSection[];  // Design, Manufacturing, Delivery, Installation
}

interface LeadTimeSection {
  id: string;
  name: string;
  phases: Phase[];
}

interface Phase {
  id: string;
  name: string;
  duration: number;
  unit: 'days' | 'weeks' | 'months';
  estimatedCompletion?: string;
}
```

## System Templates

**Location:** `src/services/templateService.ts`

Templates are system-provided forms that organizations can copy:

```typescript
// Template storage
is_template=true, organization_id=null  // System template
is_template=false, organization_id=X    // Org-specific form

// Copy flow
copyTemplateToOrganization({
  templateId,
  organizationId,
  name,           // Custom name
  description     // Custom description
})
// → Creates form with copied_from_form_id for lineage tracking
```

### Template Service Functions

| Function | Purpose |
|----------|---------|
| `fetchTemplates(category?)` | Get all system templates |
| `fetchTemplateById(id)` | Single template |
| `fetchTemplateCategories()` | Categories with counts |
| `copyTemplateToOrganization()` | Copy to org |
| `searchTemplates(query, category?)` | Search templates |
| `getFormTemplateLineage(formId)` | Track template origin |

## React Query Hooks

**Location:** `src/hooks/queries/useForms.ts`, `src/hooks/queries/useTemplates.ts`

### Form Hooks

| Hook | Purpose |
|------|---------|
| `useForms(orgId)` | List org forms (5 min stale) |
| `useForm(formId)` | Single form detail |
| `useDefaultForm(orgId)` | Get org default form |
| `useArchivedForms(orgId)` | Archived forms list |
| `useCreateForm()` | Create with optimistic updates |
| `useUpdateForm()` | Update with rollback on error |
| `useDeleteForm()` | Delete with cache cleanup |
| `useCopyForm()` | Duplicate form |
| `useSetDefaultForm()` | Make form default |
| `useArchiveForm()` | Soft delete |
| `useUnarchiveForm()` | Restore archived |

### Template Hooks

| Hook | Purpose |
|------|---------|
| `useTemplates(category?)` | Fetch with category filter |
| `useTemplate(templateId)` | Single template |
| `useTemplateCategories()` | Category list with counts |
| `useSearchTemplates(query, category?)` | Search (2+ char minimum) |
| `useCopyTemplate()` | Copy template to org |
| `usePrefetchTemplate()` | Prefetch on hover |

### Query Keys

```typescript
formsQueryKeys = {
  all: ['forms'],
  lists: ['forms', 'list'],
  list: (orgId) => ['forms', 'list', orgId],
  detail: (formId) => ['forms', 'detail', formId],
  archived: (orgId) => ['forms', 'archived', orgId],
}

templatesQueryKeys = {
  all: ['templates'],
  list: (category?) => ['templates', 'list', category],
  detail: (id) => ['templates', 'detail', id],
  categories: ['templates', 'categories'],
}
```

## Form Validation

**Location:** `src/utils/formValidation.ts`

Comprehensive validation suite with field-specific validators:

```typescript
// FormValidator class methods
FormValidator.validateEmail(value)       // Must have @ and domain
FormValidator.validatePhone(value)       // 10 digits, auto-formats
FormValidator.validateWebsite(value)     // Must start with www.
FormValidator.validateNumbersOnly(value) // Optional decimal support
FormValidator.validateCurrency(value)    // Dollar amounts
FormValidator.validatePercentage(value)  // 0-100 range
FormValidator.sanitizeInput(value)       // Remove XSS threats

// Field validators registry
fieldValidators = {
  email, phone, website, address,
  lengthFeet, lengthInches, heightFeet, heightInches,
  panelCount, quantity,
  basePrice, freight, paymentPercentage,
  shopDrawingWeeks, trackDeliveryWeeks, // etc.
}
```

## UI Components

### Template Library

**Location:** `src/components/features/forms/LibraryTab.tsx`

- Search by name/description
- Category filtering
- Template cards with preview/copy actions
- Preview modal with customization before copy

### Create Form Dialog

**Location:** `src/components/features/forms/CreateFormDialog.tsx`

- Form name input
- Optional description
- Document type selector (linked to Settings)
- Workflow status display
- Navigation to Settings if no document types configured

## Auto-Save Behavior

```typescript
// ProposalEditor auto-save configuration
const DEBOUNCE_MS = 2000;  // 2 second debounce

// Save flow
1. User makes change → tab calls setter (setPricingData, etc.)
2. isDirty flag set to true
3. Debounce timer starts
4. After 2s of no changes → auto-save triggers
5. serializeFormMetadata() prepares data
6. updateForm() mutation called
7. On success → markClean()
8. UI shows: "Saving..." → "Saved" → fades

// Visual indicators
Save status: 'idle' | 'saving' | 'saved' | 'error'
```

## Data Flow

### Builder Mode

```
FormBuilderV4 page
  ↓
ProposalEditor (mode='builder')
  ↓
FormBuilderProvider wraps tabs
  ↓
User edits → setters update context
  ↓
Auto-save → formsService.updateForm()
  ↓
forms.metadata JSONB updated
```

### Filler Mode (Proposals)

```
Proposal creation
  ↓
Select form template
  ↓
ProposalEditor (mode='filler')
  ↓
Load form.metadata as defaults
  ↓
User enters data → form_data updated
  ↓
Auto-save → proposalsService.updateProposal()
  ↓
proposals.form_data JSONB updated
```

## Key Files

### Services
- `src/services/formsService.ts` - Form CRUD operations
- `src/services/templateService.ts` - Template operations

### Context & State
- `src/features/proposals/context/FormBuilderContext.tsx` - Shared state

### Components
- `src/features/proposals/components/ProposalEditor.tsx` - Main editor
- `src/features/proposals/components/tabs/` - 7 tab components
- `src/components/features/forms/LibraryTab.tsx` - Template browser
- `src/components/features/forms/CreateFormDialog.tsx` - Creation wizard

### Hooks
- `src/hooks/queries/useForms.ts` - Form React Query hooks
- `src/hooks/queries/useTemplates.ts` - Template hooks

### Utilities
- `src/utils/formValidation.ts` - Validation suite
- `src/lib/types/forms.ts` - Type definitions

### Pages
- `src/pages/FormBuilderV4.tsx` - Builder route page

## Database Schema

```sql
-- forms table
id                    uuid PRIMARY KEY
organization_id       uuid REFERENCES organizations(id)  -- NULL for templates
name                  text NOT NULL
description           text
metadata              jsonb                              -- FormMetadata
created_by            uuid REFERENCES profiles(id)
created_at            timestamptz
updated_at            timestamptz
is_archived           boolean DEFAULT false
is_default            boolean DEFAULT false
is_template           boolean DEFAULT false
copied_from_form_id   uuid REFERENCES forms(id)          -- Lineage tracking
document_type         text
presentation_template jsonb
```
