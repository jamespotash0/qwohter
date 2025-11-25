# Contacts CRM Implementation Guide

## Overview

A comprehensive Contact Relationship Management (CRM) system for managing customer and prospect contacts who don't have user accounts in your organization.

---

## Features

### ✅ Complete Contact Management
- **Add/Edit/Delete** contacts
- **Rich contact fields**: Name, Email, Phone, Company, Type, Address, Source, Tags, Notes
- **Custom Types & Sources**: Predefined options + ability to add custom values
- **Tag System**: Flexible categorization with multiple tags per contact
- **Duplicate Prevention**: Email-based uniqueness within organizations

### ✅ Integrated Quote Flow
- **Unified Dropdown**: Contact form now shows both organization members AND customer contacts
- **Quick Add Button**: Add new contacts directly from quote creation
- **Auto-fill**: Newly created contacts automatically populate the form

### ✅ Standalone CRM Page
- **Data Table View**: Sortable table with all contact information
- **Search**: Find contacts by name, email, or company
- **Filters**: Filter by contact type or tags
- **Stats Dashboard**: Quick overview of total contacts and types
- **Export to CSV**: Download filtered contacts for external use

### ✅ User Experience
- **Click-to-Email**: Email buttons launch mailto links
- **Click-to-Call**: Phone buttons launch tel links
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Updates**: React Query handles automatic refresh

---

## File Structure

```
src/
├── components/features/contacts/
│   ├── ContactDialog.tsx          # Add/Edit modal dialog
│   └── ContactsTable.tsx          # Data table component
├── pages/
│   └── Contacts.tsx               # Standalone CRM page
├── hooks/
│   └── useContacts.ts             # React hooks for contact operations
├── services/
│   └── contactsService.ts         # API service layer
├── lib/
│   ├── types/contacts.ts          # TypeScript types & constants
│   └── utils/contactUtils.ts     # Helper utilities
└── components/features/quotes/forms/contact/
    └── ContactInfoForm.tsx        # Updated with contacts integration

supabase/migrations/
└── 20251121000000_create_contacts_table.sql  # Database schema
```

---

## Database Schema

### Table: `contacts`

| Column             | Type         | Description                                    |
|--------------------|--------------|------------------------------------------------|
| id                 | UUID         | Primary key                                    |
| organization_id    | UUID         | Foreign key to organizations                   |
| full_name          | TEXT         | Contact full name (required)                   |
| email              | TEXT         | Contact email (required, unique per org)       |
| phone              | TEXT         | Phone number (optional)                        |
| company_name       | TEXT         | Company name (optional)                        |
| contact_type       | TEXT         | Lead, Customer, Vendor, etc. (optional)        |
| address            | TEXT         | Physical address (optional)                    |
| source             | TEXT         | How they found you (optional)                  |
| tags               | TEXT[]       | Array of tags (optional)                       |
| last_contacted_at  | TIMESTAMPTZ  | Last interaction timestamp (optional, future)  |
| notes              | TEXT         | Additional notes (optional)                    |
| created_by         | UUID         | User who created contact                       |
| created_at         | TIMESTAMPTZ  | Creation timestamp                             |
| updated_at         | TIMESTAMPTZ  | Last update timestamp                          |

### Indexes

- `organization_id` - Fast lookups by organization
- `full_name` - Search by name
- `contact_type` - Filter by type
- `tags` (GIN) - Array search for tags

### RLS Policies

- **SELECT**: All active members can view contacts
- **INSERT**: All active members can create contacts
- **UPDATE**: All active members can update contacts
- **DELETE**: Only Admins and Owners can delete contacts

---

## How to Use

### 1. Run the Migration

```bash
# Apply the migration to your database
# In Supabase Dashboard → SQL Editor → Run:
supabase/migrations/20251121000000_create_contacts_table.sql
```

### 2. Add Route (If Not Already Added)

Add this to your router configuration:

```typescript
import ContactsPage from '@/pages/Contacts';

// In your routes:
{
  path: '/contacts',
  element: <ContactsPage />,
}
```

### 3. Add Navigation Link

Add a link to your sidebar/navigation:

```tsx
<NavLink to="/contacts">
  <Users className="w-4 h-4" />
  Contacts
</NavLink>
```

---

## Usage Examples

### Creating a Contact from Quote Form

1. User opens quote creation wizard
2. On Contact Info step, user sees "Add New Contact" button
3. Click button → ContactDialog opens
4. Fill in contact details → Save
5. Contact automatically populates the form fields

### Managing Contacts

1. Navigate to `/contacts` page
2. View all contacts in a sortable table
3. Use search bar to find specific contacts
4. Filter by type (Lead, Customer, Vendor, etc.)
5. Filter by tags
6. Click "..." menu on any contact to:
   - Edit contact
   - Send email
   - Make phone call
   - Delete contact

### Exporting Contacts

1. On Contacts page, apply any filters (optional)
2. Click "Export" button
3. CSV file downloads with all filtered contacts
4. Open in Excel, Google Sheets, or import elsewhere

---

## API Reference

### Hooks

```typescript
// Fetch all contacts for an organization
const { data: contacts, isLoading } = useContacts(organizationId);

// Create a new contact
const createContact = useCreateContact(organizationId);
await createContact.mutateAsync({
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '555-1234',
  company_name: 'Acme Corp',
  contact_type: 'Customer',
  // ... other fields
});

// Update a contact
const updateContact = useUpdateContact();
await updateContact.mutateAsync({
  contactId: 'contact-id',
  input: { full_name: 'Jane Doe' }
});

// Delete a contact
const deleteContact = useDeleteContact(organizationId);
await deleteContact.mutateAsync('contact-id');
```

### Service Methods

```typescript
import { contactsService } from '@/services/contactsService';

// Get all contacts
const contacts = await contactsService.getContacts(organizationId);

// Search contacts
const results = await contactsService.searchContacts(organizationId, 'john');

// Create contact
const newContact = await contactsService.createContact(organizationId, {
  full_name: 'John Doe',
  email: 'john@example.com',
});

// Update contact
const updated = await contactsService.updateContact(contactId, {
  phone: '555-9999',
});

// Delete contact
await contactsService.deleteContact(contactId);

// Check if contact exists
const exists = await contactsService.contactExists(organizationId, 'john@example.com');
```

---

## Contact Fields Reference

### Predefined Contact Types
- Lead
- Customer
- Vendor
- Partner
- Contractor
- Architect
- Designer
- Supplier
- Consultant
- Other
- *Custom (user-defined)*

### Predefined Sources
- Referral
- Website
- Trade Show
- Cold Call
- Email Campaign
- Social Media
- Advertisement
- Networking Event
- Repeat Customer
- Other
- *Custom (user-defined)*

---

## Security

### Row-Level Security (RLS)
All contacts are isolated by organization. Users can only access contacts within their organization(s).

### Permissions
- **Members**: Can view, create, and update contacts
- **Admins & Owners**: Can delete contacts (in addition to member permissions)

### Data Validation
- Email format validation
- Duplicate email prevention within organization
- Required fields: name, email

---

## Future Enhancements

### Potential Features (Not Yet Implemented)

1. **Contact Activity Tracking**
   - Track quotes sent to each contact
   - See contact history and interactions
   - Last contacted date auto-update

2. **Bulk Operations**
   - Import contacts from CSV
   - Bulk edit/delete
   - Merge duplicate contacts

3. **Advanced Filtering**
   - Date range filters
   - Multi-tag filtering (AND/OR logic)
   - Saved filter presets

4. **Contact Details Page**
   - Dedicated page for each contact
   - View all quotes for this contact
   - Timeline of interactions

5. **Integration with Quotes**
   - Auto-update last_contacted_at when quote is created
   - Link contacts to projects
   - Contact-based analytics

---

## Troubleshooting

### Contacts not showing in dropdown?

1. Check that the migration was run successfully
2. Verify contacts exist: `SELECT * FROM contacts WHERE organization_id = 'your-org-id';`
3. Check browser console for errors
4. Verify RLS policies are active

### Can't delete contacts?

- Only Admins and Owners can delete contacts
- Check your membership role
- Verify you have the correct permissions

### Duplicate email error?

- Each email must be unique within an organization
- Check if the contact already exists
- Use search to find existing contacts

---

## Summary

You now have a fully functional CRM system for managing customer contacts!

**Key Benefits:**
- ✅ Reference prior customers easily
- ✅ No more duplicate data entry
- ✅ Keep all contact info in one place
- ✅ Export data anytime
- ✅ Integrated directly into quote workflow

**Next Steps:**
1. Run the database migration
2. Add the `/contacts` route
3. Add navigation link to sidebar
4. Start adding your customer contacts!

---

**Questions or Issues?**

Refer to the individual component files for detailed implementation notes and examples.
