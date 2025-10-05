# Access Control & Routing Guide

Complete guide to how user access, permissions, and routing work in Wall Quote Wizard.

---

## 🎯 User States & Pages

### 1. **Not Authenticated** → `/sign-in` or `/create-account`
- User has no account or is not logged in
- Can access: Landing page, auth pages, demo contact

### 2. **Pending Approval** → `/pending-approval`
- User signed up and joined an organization
- Membership status: `"Pending"`
- Waiting for Admin/Owner to approve
- **Auto-redirected** to this page on login

### 3. **Active Member** → Full app access
- Membership status: `"Active"`
- Can access dashboard, quotes, analytics, etc.
- Different features based on role (Owner, Admin, Member)

### 4. **Access Denied** → `/access-denied`
- User tried to access feature requiring higher role
- Example: Member tries to access Team page (requires Admin)
- Shows what role is required

### 5. **No Subscription** → `/subscription`
- User has no valid subscription
- Must choose a plan to continue (after Stripe setup)

---

## 🛣️ Routing Architecture

### Public Routes (No Auth Required)
```
/                       - Landing page
/sign-in                - Sign in page
/create-account         - Create account page
/forgot-password        - Password reset request
/reset-password         - Password reset confirmation
/demo-contact           - Demo request form
```

### Status Pages (Authenticated but Limited)
```
/pending-approval       - Waiting for organization approval
/access-denied          - Insufficient role permissions
/subscription           - Choose subscription plan
```

### Protected Routes (Requires Active Membership)
```
/dashboard              - Main dashboard
/quotes                 - Quote list
/quotes/new             - Create quote
/quotes/edit/:id        - Edit quote
/analytics              - Analytics dashboard
/team                   - Team management (Admin/Owner only)
/settings               - Settings
```

---

## 🔐 Access Control Layers

### Layer 1: Authentication (MainLayout.tsx)
**Location**: `src/components/common/layout/MainLayout.tsx` (lines 90-98)

**Checks**:
1. Is user logged in?
   - ❌ No → Redirect to `/sign-in`
   - ✅ Yes → Continue

**Implementation**:
```typescript
// Authentication check for protected routes
useEffect(() => {
  if (!shouldShowSidebar) return;

  if (isInitialized && !user) {
    navigate('/sign-in');
  }
}, [navigate, shouldShowSidebar, isInitialized, user]);
```

### Layer 2: Membership Status (MainLayout.tsx)
**Location**: `src/components/common/layout/MainLayout.tsx` (lines 52-108)

**Checks**:
1. Does user have an organization membership?
   - ❌ No → Allow access (might be creating org)
   - ✅ Yes → Check status

2. What is membership status?
   - `"Pending"` → Redirect to `/pending-approval`
   - `"Active"` → Allow access
   - `"Suspended"` → Could add logic here

**Implementation**:
```typescript
// Check membership status
useEffect(() => {
  const checkMembershipStatus = async () => {
    const { data: membership } = await supabase
      .from('memberships')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();

    setMembershipStatus(membership?.status || null);
  };

  checkMembershipStatus();
}, [user, isInitialized]);

// Redirect to pending approval if needed
useEffect(() => {
  if (membershipStatus === 'Pending' && !checkingMembership) {
    navigate('/pending-approval');
  }
}, [membershipStatus]);
```

### Layer 3: Role-Based Access (ProtectedRoute.tsx)
**Location**: `src/router/ProtectedRoute.tsx`

**Checks**:
1. Does route require specific role?
   - ❌ No → Allow access
   - ✅ Yes → Check user's role

2. Does user have required role?
   - Role hierarchy: Owner > Admin > Member
   - ❌ No → Redirect to `/access-denied`
   - ✅ Yes → Allow access

**Usage Example**:
```tsx
// In AppRouter.tsx
<Route path="/team" element={
  <ProtectedRoute requiresRole="Admin">
    <Team />
  </ProtectedRoute>
} />
```

**Implementation**:
```typescript
const hasRequiredRole = (
  userRole: 'Owner' | 'Admin' | 'Member' | null,
  requiredRole: 'Owner' | 'Admin' | 'Member'
): boolean => {
  const roleHierarchy = { Owner: 3, Admin: 2, Member: 1 };
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
};
```

### Layer 4: Subscription Status (Optional - After Stripe Setup)
**Location**: `src/components/common/SubscriptionPaywall.tsx`

**Checks**:
1. Does organization have valid subscription?
   - Status: `"active"` or `"trialing"`
   - ❌ No → Show paywall, redirect to `/subscription`
   - ✅ Yes → Allow access

**Usage Example**:
```tsx
function Dashboard() {
  const { organization } = useOrganizations();

  return (
    <SubscriptionPaywall organizationId={organization?.id}>
      {/* Protected content */}
    </SubscriptionPaywall>
  );
}
```

---

## 📋 User Flows

### Flow 1: New User Signs Up

```
1. User creates account → /create-account
2. User joins organization with code
3. Membership created with status="Pending"
4. User redirected to /pending-approval ← Auto-redirect
5. User waits for Admin approval
6. Admin approves → status="Active"
7. User refreshes status → Redirected to /dashboard
```

### Flow 2: Invited User Joins

```
1. Admin sends invite
2. User clicks invite link → /create-account?token=xxx
3. Account created, membership auto-approved (status="Active")
4. User redirected to /dashboard ← Direct access
```

### Flow 3: Member Tries Admin Feature

```
1. Member navigates to /team
2. ProtectedRoute checks role
3. Member role < Admin role required
4. User redirected to /access-denied
5. Message shown: "You need Admin permissions"
```

### Flow 4: Organization Needs Subscription

```
1. User logs in, membership is Active
2. No valid subscription found
3. SubscriptionPaywall blocks access
4. User redirected to /subscription
5. User selects plan → Stripe Checkout
6. Payment succeeds → Redirected to /dashboard
```

---

## 🎨 Page Purposes

### `/pending-approval`
**When**: Membership status is "Pending"

**Shows**:
- Organization name and code
- Current status (Pending)
- Request date
- "Refresh Status" button
- "Sign Out" button

**Features**:
- Auto-checks if status changed to Active
- Auto-redirects to dashboard when approved
- User can refresh manually

**Screenshot**:
```
┌────────────────────────────────┐
│   🕐 Waiting for Approval      │
│                                │
│  Organization: ABC Corp        │
│  Code: ABC123                  │
│  Status: Pending               │
│  Requested: Oct 5, 2025        │
│                                │
│  [Refresh Status]              │
│  [Sign Out]                    │
└────────────────────────────────┘
```

### `/access-denied`
**When**: User role insufficient for feature

**Shows**:
- Your current role
- Required role
- Role descriptions
- Back to Dashboard button
- Sign Out button

**Screenshot**:
```
┌────────────────────────────────┐
│   🛡️ Access Denied              │
│                                │
│  Your Role: Member             │
│  → Create and manage quotes    │
│                                │
│  Required: Admin               │
│  → Manage users, settings      │
│                                │
│  Contact your admin for access │
│                                │
│  [Back to Dashboard]           │
│  [Sign Out]                    │
└────────────────────────────────┘
```

### `/subscription`
**When**: No valid subscription (after Stripe setup)

**Shows**:
- Available pricing plans
- Per-user pricing
- User count for organization
- Monthly/yearly toggle
- Plan features
- Checkout buttons

**Screenshot**:
```
┌────────────────────────────────┐
│    Choose Your Plan            │
│                                │
│  [Monthly] [Yearly - Save 23%] │
│                                │
│  Your org has 5 users          │
│                                │
│  ┌──────────────────┐          │
│  │ Professional     │          │
│  │ $64.95/month     │          │
│  │ ($12.99/user)    │          │
│  │                  │          │
│  │ ✓ Unlimited...   │          │
│  │ [Select Plan]    │          │
│  └──────────────────┘          │
└────────────────────────────────┘
```

---

## 🔧 Adding New Protected Routes

### Example: Add a Reports page (Admin only)

1. **Create the page**:
```tsx
// src/pages/Reports.tsx
export default function Reports() {
  return <div>Reports Content</div>;
}
```

2. **Add to router with protection**:
```tsx
// src/router/AppRouter.tsx
import { ProtectedRoute } from '@/router/ProtectedRoute';

const Reports = lazy(() => import('@/pages/Reports'));

<Route path="/reports" element={
  <ProtectedRoute requiresRole="Admin">
    <Reports />
  </ProtectedRoute>
} />
```

3. **Update sidebar** (if needed):
```tsx
// src/components/common/layout/AppSidebar.tsx
// Add to navigation items
```

That's it! The route is now:
- ✅ Requires authentication
- ✅ Checks membership status
- ✅ Requires Admin role
- ✅ Redirects to /access-denied if insufficient

---

## 🐛 Troubleshooting

### User stuck on Pending Approval
**Check**:
1. Membership status in database:
   ```sql
   SELECT status FROM memberships WHERE user_id = 'xxx';
   ```
2. Is it actually "Pending" or something else?
3. Admin needs to approve in Team page

### User can access Admin features as Member
**Check**:
1. Is route wrapped in `<ProtectedRoute requiresRole="Admin">`?
2. Check user's role in database:
   ```sql
   SELECT role FROM memberships WHERE user_id = 'xxx';
   ```
3. Verify ProtectedRoute.tsx is imported correctly

### Redirect loop
**Check**:
1. Look for navigation state issues
2. Verify `shouldShowSidebar` excludes the redirect target
3. Check browser console for errors

---

## ✅ Summary

**Access Control Hierarchy**:
```
1. Authentication (logged in?)
   ↓
2. Membership Status (pending/active?)
   ↓
3. Role Permissions (owner/admin/member?)
   ↓
4. Subscription Status (has valid plan?) [After Stripe setup]
```

**Key Files**:
- `MainLayout.tsx` - Auth & membership status checks
- `ProtectedRoute.tsx` - Role-based access
- `PendingApproval.tsx` - Pending approval page
- `AccessDenied.tsx` - Insufficient permissions page
- `SubscriptionPaywall.tsx` - Subscription check (optional)

**Routing is already configured!** The pages exist, the logic is in place. Everything works automatically.
