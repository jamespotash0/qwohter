# TODO: Migrate join_type from profiles to memberships

## Current Status:
- ✅ Database: `join_type` field already added to `memberships` table
- ✅ Types: `join_type` included in `OrganizationMember` interface
- ✅ Store: `join_type` fetched in membership queries

## What Still Needs to Change:

### 1. Remove All References to `profiles.join_type`

Search for and update all code that references `join_type` in the `profiles` table:

**Files to check:**
- `src/hooks/useOrganizations.ts` - Check invite/signup functions
- `src/pages/Auth.tsx` - Signup flow
- `src/components/*` - Any profile updates
- Database functions/triggers - RLS policies

**Pattern to search:**
```bash
grep -r "profiles.*join_type\|join_type.*profiles" src/
grep -r "INSERT INTO.*profiles\|UPDATE.*profiles" src/ | grep join_type
```

---

### 2. Update Insert Operations

**Current (WRONG):**
```typescript
// Setting join_type on profiles table
await supabase
  .from('profiles')
  .insert({
    id: userId,
    email: email,
    join_type: 'Invited' // ❌ Should be in memberships
  });
```

**Updated (CORRECT):**
```typescript
// join_type should only be set on memberships
await supabase
  .from('memberships')
  .insert({
    user_id: userId,
    organization_id: orgId,
    role: 'Member',
    join_type: 'Invited', // ✅ Correct location
    status: 'Active'
  });
```

---

### 3. Update Select Operations

**Current (WRONG):**
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('*, join_type') // ❌ Wrong table
  .eq('id', userId)
  .single();
```

**Updated (CORRECT):**
```typescript
const { data: member } = await supabase
  .from('memberships')
  .select('*, join_type') // ✅ Correct table
  .eq('user_id', userId)
  .eq('organization_id', orgId)
  .single();
```

---

### 4. Update Functions

#### `inviteMember()`
Ensure it sets `join_type: 'Invited'` on memberships table:
```typescript
await supabase.from('memberships').insert({
  organization_id: orgId,
  email: email,
  role: role,
  department: department,
  join_type: 'Invited', // ✅
  status: 'Pending'
});
```

#### Signup Flow
When user creates account via org code (Direct):
```typescript
await supabase.from('memberships').insert({
  user_id: userId,
  organization_id: orgId,
  role: 'Member',
  join_type: 'Direct', // ✅
  status: 'Active'
});
```

#### Request Access Flow
When user requests to join:
```typescript
await supabase.from('memberships').insert({
  user_id: userId,
  organization_id: orgId,
  role: 'Member',
  join_type: 'Requested', // ✅
  status: 'Pending'
});
```

---

### 5. Database Cleanup (After Code Updates)

Once all code references are updated, remove `join_type` from profiles:

```sql
-- ONLY run this after ALL code is updated
-- Migration: Remove join_type from profiles table
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS join_type;
```

---

## Verification Checklist

Before removing from profiles table:

- [ ] Search codebase for `profiles.join_type` - should return 0 results
- [ ] Search for INSERT/UPDATE on profiles with join_type - should return 0 results
- [ ] Test invite flow - join_type set on memberships
- [ ] Test direct signup - join_type set on memberships
- [ ] Test request access - join_type set on memberships
- [ ] Verify TeamTab displays join_type correctly from memberships
- [ ] Run migration to drop profiles.join_type column

---

## Search Commands to Find All References:

```bash
# Find all references to join_type in profiles
grep -rn "profiles" src/ | grep "join_type"

# Find INSERT statements
grep -rn "INSERT INTO.*profiles\|\.from('profiles')\.insert" src/

# Find UPDATE statements
grep -rn "UPDATE.*profiles\|\.from('profiles')\.update" src/

# Find SELECT statements
grep -rn "SELECT.*profiles\|\.from('profiles')\.select" src/
```

---

**Priority:** Complete after department feature is fully implemented and tested.

**Estimated Time:** 1-2 hours to find and update all references.
