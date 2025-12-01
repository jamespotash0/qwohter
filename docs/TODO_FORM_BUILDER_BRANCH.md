# TODO: Form Builder Branch - Multi-Form Numbering

## Context

When implementing the form builder feature, you'll need to support different form types (quotes, invoices, work orders, proposals) with **independent numbering sequences**.

## Architecture to Implement

### Database Structure:

```sql
-- forms table: Defines available forms per organization
CREATE TABLE forms (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  name TEXT,              -- e.g., "Standard Quote", "Custom Invoice"
  form_type TEXT,         -- e.g., "quote", "invoice", "work_order", "proposal"
  ...
);

-- proposals table: Replaces/extends quotes table
CREATE TABLE proposals (
  id UUID PRIMARY KEY,
  organization_id UUID,
  form_id UUID REFERENCES forms(id),  -- ← FK to forms table
  proposal_number TEXT,               -- "Q1000", "INV1000", etc.
  ...
);

-- organizations table: Add JSONB field for starting numbers
ALTER TABLE organizations
ADD COLUMN form_start_numbers JSONB DEFAULT '{
  "quote": "Q1000",
  "invoice": "INV1000",
  "work_order": "WO1000",
  "proposal": "P1000"
}'::jsonb;
```

### Key Principle:

**Store starting numbers by `form_type`, NOT by individual form name.**

This way:
- Multiple forms can share the same numbering sequence (e.g., "Standard Quote" and "Custom Quote" both use `form_type: "quote"` → Q1000, Q1001, Q1002...)
- Adding/deleting custom forms doesn't break numbering
- Covers 95% of use cases with 4 core form types

### Example Data Flow:

**Forms:**
```
| id  | name            | form_type   |
|-----|-----------------|-------------|
| f1  | "Quote"         | "quote"     | → Q1000, Q1001...
| f2  | "Custom Quote"  | "quote"     | → Q1002, Q1003... (shares sequence)
| f3  | "Invoice"       | "invoice"   | → INV1000, INV1001...
```

**Proposals:**
```
| id  | form_id | proposal_number |
|-----|---------|-----------------|
| p1  | f1      | Q1000          |
| p2  | f2      | Q1001          | ← Custom Quote continues quote sequence
| p3  | f3      | INV1000        | ← Invoice has separate sequence
```

## Code Changes Needed

### 1. Update ProposalNumberGenerator

Change signature to accept `form_id`:

```typescript
static async getNextProposalNumber(
  formId: string,
  existingProposalNumber?: string
): Promise<ProposalNumberInfo> {
  // Look up form to get form_type
  const { data: form } = await supabase
    .from('forms')
    .select('form_type')
    .eq('id', formId)
    .single();

  const formType = form.form_type;

  // Use form_type to get starting number from organizations.form_start_numbers
  // Query proposals table with JOIN to forms
  // ...rest of logic
}
```

### 2. Update Settings UI

Allow setting starting numbers per form_type:

```tsx
<Input label="Quotes" value={formStartNumbers.quote} />
<Input label="Invoices" value={formStartNumbers.invoice} />
<Input label="Work Orders" value={formStartNumbers.work_order} />
<Input label="Proposals" value={formStartNumbers.proposal} />
```

### 3. Create ProposalsService

Similar to `quotesService.ts`, but for the new `proposals` table.

## Migration Strategy

1. Create `forms` and `proposals` tables
2. Create default forms for each organization (Quote, Invoice, Work Order, Proposal)
3. Optionally migrate existing quotes to proposals table
4. Update all quote creation flows to use form selection

## Testing

- Create quote using different forms → Should share same sequence
- Create invoice → Should have separate sequence
- Delete custom form → Numbering continues unaffected
- Change starting number → Next proposal respects new setting

---

**Note:** This feature should be implemented in a separate `feature/form-builder` branch to avoid affecting current quote functionality.
