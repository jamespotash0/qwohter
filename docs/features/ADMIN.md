# Admin Panel

> **Location:** `src/features/admin/`

## Access Control

**Requirement:** `is_super_admin = true` in profiles table

Only super admins can access the admin panel. This is a global flag, not organization-specific.

## Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/admin` | AdminDashboard | Main admin dashboard |
| `/admin/appinvite` | AppInvite | Send signup invitations |
| `/admin/products/*` | ProductManagement | Product catalog CRUD |
| `/admin/options/value-sets` | ValueSets | Configuration value sets |

## Features

### App Invitations

**Location:** `src/features/admin/pages/AppInvite.tsx`

Super admins can invite new users to create accounts:

```typescript
interface SignupInvite {
  id: string;
  email: string;
  token: string;                    // Unique invite token
  invited_by: string;               // Super admin who sent
  expires_at: string;               // 7 days from creation
  used_at?: string;
  created_at: string;
}
```

**Invite Flow:**
1. Super admin enters email → Creates `signup_invites` record
2. Email sent with link: `/create-account?appinvite=TOKEN`
3. User clicks link → Pre-fills email, validates token
4. User completes signup → Token marked as used

### Product Catalog

**Location:** `src/features/admin/pages/products/`

Hierarchical product management for wall systems:

```
Domain
  └── Manufacturer
        └── Product Line
              └── Series
                    └── Model
```

Each level has:
- Name, description
- Active/inactive status
- Sort order
- Associated configurations

### Value Sets

**Location:** `src/features/admin/pages/ValueSets.tsx`

Configuration options for product forms:

```typescript
interface ValueSet {
  id: string;
  name: string;                     // e.g., "Frame Finishes"
  values: ValueSetItem[];
}

interface ValueSetItem {
  id: string;
  label: string;                    // Display name
  value: string;                    // Internal value
  sort_order: number;
  is_active: boolean;
}
```

Used for:
- Frame finishes
- Track systems
- Panel configurations
- Seal types
- STC ratings

## Admin Dashboard

**Location:** `src/features/admin/pages/AdminDashboard.tsx`

Overview metrics:
- Total organizations
- Total users
- Active subscriptions
- Recent signups
- System health

## Protected Route

Admin routes are protected by:

```typescript
// In router
{
  path: '/admin/*',
  element: (
    <ProtectedRoute requireSuperAdmin>
      <AdminLayout />
    </ProtectedRoute>
  )
}
```

## Key Files

- `src/features/admin/` - Admin feature module
- `src/features/admin/pages/AdminDashboard.tsx` - Main dashboard
- `src/features/admin/pages/AppInvite.tsx` - Signup invitations
- `src/features/admin/pages/products/` - Product management
- `src/features/admin/pages/ValueSets.tsx` - Config value sets
- `src/features/admin/components/` - Admin UI components
