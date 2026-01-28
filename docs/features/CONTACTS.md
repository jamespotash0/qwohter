# Contacts System

> **Location:** `src/services/contactsService.ts`, `src/components/features/contacts/`

## Data Model

```typescript
interface Contact {
  id: string;
  organization_id: string;
  full_name: string;                      // Required
  emails: string[];                       // At least one required
  phones?: PhoneNumber[];                 // Optional, JSONB array
  company_name?: string;
  contact_type: ContactType;              // Required
  addresses?: string[];                   // Optional array
  notes?: string;
  is_in_organization: boolean;            // Internal contact flag
  user_id?: string;                       // Links to user account if member
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface PhoneNumber {
  number: string;                         // E.164 format in DB
  type: PhoneType;                        // 'Mobile' | 'Business' | 'Home' | 'Fax' | 'Other'
}

type ContactType =
  | 'Lead'
  | 'Customer'
  | 'Vendor'
  | 'Partner'
  | 'Contractor'
  | 'Architect'
  | 'Designer'
  | 'Engineer'
  | 'Manufacturer'
  | 'Business'
  | 'Supplier'
  | 'Other';
```

## Contact Types

Standard types available for classification:

| Type | Use Case |
|------|----------|
| Lead | Potential customer |
| Customer | Active/past client |
| Vendor | Supplier of goods |
| Partner | Business partner |
| Contractor | Subcontractor |
| Architect | Design professional |
| Designer | Interior/industrial designer |
| Engineer | Technical consultant |
| Manufacturer | Product manufacturer |
| Business | General business contact |
| Supplier | Material supplier |
| Other | Custom type (free text) |

## Phone Validation

**Library:** `libphonenumber-js`

### Validation Flow

```typescript
import { parsePhoneNumber, isValidPhoneNumber, AsYouType } from 'libphonenumber-js';

// Validation
const isValid = isValidPhoneNumber(phoneNumber, 'US');

// As-you-type formatting (for input fields)
const formatter = new AsYouType('US');
const formatted = formatter.input(rawInput);  // (555) 123-4567

// Storage format (E.164)
const parsed = parsePhoneNumber(phoneNumber, 'US');
const e164 = parsed.format('E.164');  // +15551234567

// Display format
const national = parsed.formatNational();       // (555) 123-4567
const international = parsed.formatInternational(); // +1 555 123 4567
```

### Phone Input Features

- Country flag display based on detected country
- As-you-type formatting
- E.164 format storage in database
- Type selector (Mobile, Business, Home, Fax, Other)
- Multiple phones per contact

## Service Layer

**Location:** `src/services/contactsService.ts`

Class-based singleton service:

```typescript
class ContactsService {
  // Fetch all contacts for organization
  async getContacts(organizationId: string): Promise<Contact[]>

  // Fetch single contact
  async getContactById(contactId: string): Promise<Contact | null>

  // Search contacts by name (client-side email search supported)
  async searchContacts(organizationId: string, query: string): Promise<Contact[]>

  // Create new contact
  async createContact(organizationId: string, input: CreateContactInput): Promise<Contact>

  // Update contact
  async updateContact(contactId: string, input: UpdateContactInput): Promise<Contact>

  // Delete single contact
  async deleteContact(contactId: string): Promise<void>

  // Batch delete with permission checks
  async bulkDeleteContacts(contactIds: string[]): Promise<void>

  // Check email uniqueness within organization
  async contactExists(organizationId: string, email: string): Promise<boolean>
}

export const contactsService = new ContactsService();
```

## React Query Hooks

**Location:** `src/hooks/useContacts.ts`

### Query Hooks

| Hook | Purpose |
|------|---------|
| `useContacts(orgId)` | Fetch all contacts (realtime enabled) |
| `useContact(contactId)` | Fetch single contact |
| `useSearchContacts(orgId, query)` | Search contacts |

### Mutation Hooks

| Hook | Purpose |
|------|---------|
| `useCreateContact(orgId)` | Create with toast notifications |
| `useUpdateContact()` | Update with dual query invalidation |
| `useDeleteContact(orgId)` | Single delete mutation |
| `useBulkDeleteContacts(orgId)` | Batch delete mutation |

### Realtime Subscription

```typescript
// Contacts subscribe to realtime updates
useRealtimeSubscription('contacts', ['contacts', organizationId], {
  filter: `organization_id=eq.${organizationId}`
});
```

## UI Components

### ContactsTable

**Location:** `src/components/features/contacts/ContactsTable.tsx`

| Feature | Description |
|---------|-------------|
| **Sorting** | Clickable headers for name, company, type |
| **Selection** | Bulk checkbox selection with select-all |
| **Search** | Real-time search across name, emails, company |
| **Filtering** | Type-based filter dropdown |
| **Display** | Array fields with "+N" hover cards |
| **Export** | CSV export for selected or all contacts |
| **Actions** | Edit and delete per-row dropdown |
| **States** | Loading, empty state with CTA, filtered results |
| **Footer** | Contact count indicator |

### ContactDialog

**Location:** `src/components/features/contacts/ContactDialog.tsx`

Modal form for create/edit:

| Section | Fields |
|---------|--------|
| **Core** | Name (required), Company, Contact Type (required) |
| **Phones** | Multiple phones with type selector, international validation |
| **Emails** | Multiple emails with validation |
| **Optional** | Addresses (with MapboxInput), Notes (collapsible) |
| **Organization** | Radio button for internal vs external contact |

### ContactsPage

**Location:** `src/pages/Contacts.tsx`

- Table integration with filters
- Add/Edit/Delete contact dialogs
- Bulk delete confirmation
- Loading and empty states
- Search and type filter state management

## Data Flow

```
ContactsPage
  ├─ useContacts(orgId) → [realtime subscription]
  │  └─ contactsService.getContacts()
  │
  ├─ ContactsTable
  │  ├─ Client-side: search filter, type filter
  │  ├─ Sort, select, export functionality
  │  └─ Actions → onEdit, onDelete, onBulkDelete
  │
  ├─ ContactDialog (Create/Edit)
  │  ├─ useCreateContact() → contactsService.createContact()
  │  ├─ useUpdateContact() → contactsService.updateContact()
  │  └─ Form validation + phone number parsing
  │
  └─ Confirm Dialogs
     ├─ useDeleteContact() → contactsService.deleteContact()
     └─ useBulkDeleteContacts() → contactsService.bulkDeleteContacts()
```

## Integration with Proposals

**Location:** `src/features/proposals/components/tabs/InfoTab.tsx`

Contacts are used in proposal creation for client selection:

```typescript
// Fetch contacts for dropdown
const { data: contacts } = useContacts(organizationId);

// Combine members and contacts for unified dropdown
const contactOptions = combineContactOptions(members, contacts);

// Quick inline contact creation
const createContact = useCreateContact(organizationId);
await createContact.mutateAsync({ full_name, emails: [email], ... });
```

### combineContactOptions Utility

**Location:** `src/lib/utils/contactUtils.ts`

```typescript
// Merges members and contacts for proposal client selection
combineContactOptions(members, contacts) → ContactOption[]

// Returns unified list with:
// - type: 'member' | 'contact'
// - name, email, company
// - Deduplicated by email
```

## CSV Export

```typescript
// Export selected contacts
const exportContacts = (contacts: Contact[]) => {
  const headers = ['Name', 'Company', 'Email', 'Phone', 'Type', 'Notes'];
  const rows = contacts.map(c => [
    c.full_name,
    c.company_name || '',
    c.emails.join('; '),
    formatPhones(c.phones),
    c.contact_type,
    c.notes || ''
  ]);
  downloadCSV(headers, rows, 'contacts.csv');
};
```

## Security

### RLS Policies

```sql
-- All operations require active organization membership
CREATE POLICY "contacts_select_policy" ON contacts
  FOR SELECT USING (is_active_member(organization_id));

CREATE POLICY "contacts_insert_policy" ON contacts
  FOR INSERT WITH CHECK (is_active_member(organization_id));

CREATE POLICY "contacts_update_policy" ON contacts
  FOR UPDATE USING (is_active_member(organization_id));

CREATE POLICY "contacts_delete_policy" ON contacts
  FOR DELETE USING (is_active_member(organization_id));
```

### Validation

- Email validation on client and implied database level
- Phone numbers validated against international standards
- `created_by` field tracks contact creator
- Permission errors caught and displayed to users

## Key Files

### Types
- `src/lib/types/contacts.ts` - Data types

### Services
- `src/services/contactsService.ts` - CRUD operations

### Hooks
- `src/hooks/useContacts.ts` - React Query hooks

### Components
- `src/components/features/contacts/ContactsTable.tsx` - Data table
- `src/components/features/contacts/ContactDialog.tsx` - Create/Edit modal
- `src/pages/Contacts.tsx` - Main page

### Utilities
- `src/lib/utils/contactUtils.ts` - Helper functions

## Database Schema

```sql
-- contacts table
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
full_name         text NOT NULL
emails            text[] NOT NULL CHECK (array_length(emails, 1) >= 1)
phones            jsonb  -- Array of {number, type}
company_name      text
contact_type      text NOT NULL
addresses         text[]
notes             text
is_in_organization boolean DEFAULT false
user_id           uuid REFERENCES auth.users(id)
created_by        uuid REFERENCES profiles(id)
created_at        timestamptz DEFAULT now()
updated_at        timestamptz DEFAULT now()

-- Indexes
CREATE INDEX idx_contacts_organization ON contacts(organization_id);
CREATE INDEX idx_contacts_full_name ON contacts(full_name);
CREATE INDEX idx_contacts_contact_type ON contacts(contact_type);

-- Auto-update timestamp trigger
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```
