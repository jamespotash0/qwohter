# Settings System

> **Location:** `src/pages/Settings.tsx`, `src/components/features/settings/`

## Overview

Settings are organized into tabs with role-based access control. Some tabs are only visible to Admin/Owner roles.

## Settings Tabs

| Tab | Access | Description |
|-----|--------|-------------|
| Account | All users | Profile, email, password |
| Organization | Admin+ | Company info, logo, numbering config |
| Team | Admin+ | Invite/manage members, roles |
| Plan & Billing | Admin+ | Subscription, invoices, payment method |
| Notifications | All users | Email preferences per notification type |
| Integrations | Admin+ | Google Docs, QuickBooks connections |
| Appearance | All users | Theme settings (light/dark/system) |

## Account Settings

**Location:** `src/components/features/settings/AccountTab.tsx`

### Profile

- Full name
- Email (requires re-verification if changed)
- Avatar upload

### Password

- Current password verification
- New password with strength requirements
- Confirmation field

### Danger Zone

- Delete account (requires password confirmation)
- Transfers ownership if user is org owner

## Organization Settings

**Location:** `src/components/features/settings/OrganizationTab.tsx`

### Company Information

```typescript
interface OrganizationInfo {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  website?: string;
  logo_url?: string;
}
```

### Logo Upload

- Supported formats: PNG, JPG, SVG
- Max size: 2MB
- Stored in Supabase Storage
- Used in proposals, emails, landing page

### Proposal Numbering

```typescript
interface NumberingConfig {
  prefix: string;              // e.g., "SR", "Q", "EST"
  startNumber: number;         // Next number to use
  digitPadding: number;        // e.g., 4 → "SR-0001"
  includeYear: boolean;        // e.g., "SR-2024-0001"
}
```

## Team Settings

**Location:** `src/components/features/settings/TeamTab.tsx`

### Member Management

- View all organization members
- Change member roles (Admin/Owner only)
- Remove members (updates Stripe seat count)
- View pending invitations

### Invitations

```typescript
interface Invitation {
  id: string;
  email: string;
  role: 'Admin' | 'Member';
  invited_by: string;
  expires_at: string;          // 48 hours from creation
  status: 'pending' | 'accepted' | 'expired';
}
```

### Role Permissions

| Permission | Owner | Admin | Member |
|------------|-------|-------|--------|
| View proposals | ✅ | ✅ | ✅ |
| Create proposals | ✅ | ✅ | ✅ |
| Delete proposals | ✅ | ✅ | ❌ |
| Manage team | ✅ | ✅ | ❌ |
| Billing access | ✅ | ✅ | ❌ |
| Organization settings | ✅ | ✅ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ |

## Workflow Settings

**Location:** Organization settings or dedicated workflow tab

### Proposal Approval

```typescript
interface WorkflowSettings {
  require_proposal_approval: boolean;
}
```

When enabled:
1. Members submit proposals → Status: `Pending Approval`
2. Admin/Owner must approve before sending to client
3. Approved → Status: `Submitted`
4. Rejected → Returns to `Draft` with feedback

## Billing Settings

**Location:** `src/components/features/settings/BillingTab.tsx`

See [BILLING.md](./BILLING.md) for comprehensive billing documentation.

### Quick Overview

- Current plan and status
- Next billing date
- Payment method management
- Invoice history
- Manage subscription (via Stripe Portal)

## Notification Settings

**Location:** `src/components/features/settings/NotificationsTab.tsx`

See [NOTIFICATIONS.md](./NOTIFICATIONS.md) for notification types.

### Preferences UI

- Global email toggle
- Per-type toggles (signature events, proposals, tasks, etc.)
- Custom email address option

## Integration Settings

**Location:** `src/components/features/settings/IntegrationsTab.tsx`

### Google Docs

- Connection status
- Connect/Disconnect buttons
- Template folder selection

See [GOOGLE_INTEGRATION.md](./GOOGLE_INTEGRATION.md) for details.

### QuickBooks

- Connection status (if implemented)
- Sync settings

## Appearance Settings

**Location:** `src/components/features/settings/AppearanceTab.tsx`

```typescript
interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  // Future: custom accent colors, density
}
```

Persisted to Zustand store with localStorage.

## Key Files

- `src/pages/Settings.tsx` - Main settings page with tab routing
- `src/components/features/settings/AccountTab.tsx`
- `src/components/features/settings/OrganizationTab.tsx`
- `src/components/features/settings/TeamTab.tsx`
- `src/components/features/settings/BillingTab.tsx`
- `src/components/features/settings/NotificationsTab.tsx`
- `src/components/features/settings/IntegrationsTab.tsx`
- `src/components/features/settings/AppearanceTab.tsx`
