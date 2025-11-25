# Contact to Member Linking System

## Overview

This document explains how the system handles the case where a contact (customer/prospect) becomes a team member (user account with organization membership).

## The Problem

When a contact in the CRM gets invited to join the organization as a team member, we need to:
1. Preserve historical contact data (quotes, notes, interactions)
2. Avoid duplicate entries in dropdowns and lists
3. Show that they're now a team member
4. Maintain the relationship between the contact record and user account

## The Solution: `user_id` Linking

### Database Schema

The `contacts` table includes a `user_id` field:

```sql
ALTER TABLE public.contacts
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
```

**Fields:**
- `user_id` (nullable): Links to the user account when contact becomes a member
- `is_in_organization` (boolean): Set to `true` when linked
- `emails` (array): Used to match contact with new members

### Automatic Linking

When a new member is added to an organization, the system automatically:

1. **Checks for matching emails**: Compares the new member's email with all contact emails in the organization
2. **Links the contact**: If a match is found, sets `user_id` and `is_in_organization = true`
3. **Preserves data**: Keeps all historical contact data intact

**Trigger Function:**
```sql
CREATE TRIGGER trigger_link_contact_to_member
  AFTER INSERT ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION link_contact_to_member();
```

### De-duplication in UI

**combineContactOptions utility:**
- Skips contacts with `user_id` set (they're already in the members list)
- Prevents duplicate entries in dropdowns
- Shows team members once, with their full user account data

```typescript
// Skip contacts that are linked to team members (avoid duplicates)
if (contact.user_id) {
  return;
}
```

### Visual Indication

**ContactsTable:**
- Shows "Team Member" badge next to names when `user_id` is set
- Indicates the contact is now part of the organization

```typescript
{contact.user_id && (
  <Badge variant="secondary" className="text-xs">
    Team Member
  </Badge>
)}
```

## Auto-Linking on Contact Creation

When you create a contact whose email matches an existing team member, the system automatically links them:

**ContactsService.createContact():**
1. Checks if any contact email matches an existing active member
2. If match found: Sets `user_id` and `is_in_organization = true`
3. Contact is created already linked to the team member
4. Shows "Team Member" badge immediately

**Result:**
- No duplicate entries
- Historical contact data preserved
- Clear indication they're a team member

## Workflow Examples

### Example 1: Adding a contact who is already a team member

1. **Admin tries to add contact:**
   - Name: "Sarah Smith"
   - Email: "sarah@example.com"

2. **System checks members:**
   - Finds active member with email "sarah@example.com"
   - Auto-links: Sets `user_id` to Sarah's user ID
   - Sets `is_in_organization = true`

3. **Result:**
   - Contact created and linked automatically
   - "Team Member" badge shows immediately
   - No duplicate in dropdowns
   - Can track both customer interactions AND team activities

### Example 2: Contact becomes a team member

1. **Initial State:**
   - Contact: "John Doe" with email "john@example.com"
   - `user_id`: null
   - `is_in_organization`: false

2. **John gets invited:**
   - Admin invites john@example.com to join the organization
   - John creates user account and accepts invitation

3. **Automatic Linking:**
   - Trigger detects matching email
   - Updates contact: `user_id` = john's user ID
   - Updates contact: `is_in_organization` = true

4. **Result:**
   - Contact record preserved with all historical data
   - John appears once in dropdowns (as team member)
   - "Team Member" badge shown in Contacts table
   - Can still see all past interactions as a contact

### Example 2: Member leaves organization

1. **Member removed from organization:**
   - Membership record deleted or set to inactive
   - Contact record remains with `user_id` set (historical link)

2. **Options:**
   - **Keep link**: Maintain `user_id` for historical tracking
   - **Clear link**: Set `user_id` = null and `is_in_organization` = false to "un-link" them

## Implementation Files

### Migration
- `supabase/migrations/20251121000001_add_user_id_to_contacts.sql`
  - Adds `user_id` column
  - Creates trigger for automatic linking
  - Migrates existing data

### TypeScript Types
- `src/lib/types/contacts.ts`
  - Updated `Contact` interface with `user_id?: string`

### Services
- `src/lib/utils/contactUtils.ts`
  - `combineContactOptions()`: De-duplicates contacts with `user_id`

### UI Components
- `src/components/features/contacts/ContactsTable.tsx`
  - Shows "Team Member" badge when `user_id` is set

## Benefits

✅ **Preserves History**: All past interactions as a contact are kept
✅ **Prevents Duplicates**: Contacts with `user_id` don't appear twice in lists
✅ **Automatic**: No manual linking required
✅ **Visual Clarity**: Badge shows when someone is a team member
✅ **Flexible**: Can unlink if member leaves organization
✅ **Data Integrity**: Foreign key constraints ensure referential integrity

## Future Enhancements

Potential improvements:
- Manual link/unlink UI for admins
- Merge conflict resolution if data differs between contact and member
- Historical view showing "Contact since X, Member since Y"
- Notification when a contact becomes a member
