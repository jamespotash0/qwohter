# Authentication System

> **Location:** `src/auth/`

## Architecture Overview

```
User → AuthProvider.tsx → authService.ts → Supabase Auth
                ↓
        React Query (session/profile cache)
                ↓
        AuthEventMutex (race condition prevention)
```

## Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AuthProvider.tsx` | `src/auth/` | Single `onAuthStateChange` listener, session restoration |
| `authService.ts` | `src/auth/services/` | Sign in/out, OTP verification, password reset |
| `profileService.ts` | `src/auth/services/` | Profile CRUD operations |
| `useAuth.ts` | `src/auth/hooks/` | Hooks: `useUser()`, `useSession()`, `useProfile()`, `useSignIn()`, `useSignOut()` |
| `AuthEventMutex.ts` | `src/auth/utils/` | Prevents race conditions on rapid auth events |

## Sign-In Flow

```
1. User enters credentials → authService.signIn()
2. Success → AuthProvider listener fires SIGNED_IN
3. Session cached in React Query
4. Profile prefetched → Organization prefetched
5. Redirect based on onboarding state
```

## Complete Signup Flow

```
1. User enters email/password/name
2. tempSignupService stores data (password in sessionStorage, rest in localStorage)
3. Supabase signUp() called → OTP email sent
4. User enters OTP code → verifyOtp()
5. Profile auto-created in profiles table
6. Onboarding state machine begins
```

## Onboarding State Machine

**States:** `verify-otp → profile → organization → company-info → complete`

**Location:** `src/services/onboardingStateService.ts`

### Detailed Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         SIGNUP FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User enters email/password/name                              │
│     └── tempSignupService stores in sessionStorage/localStorage  │
│                                                                  │
│  2. Supabase signUp() called                                     │
│     └── OTP email sent to user                                   │
│                                                                  │
│  3. verify-otp step (pre-auth, uses localStorage)                │
│     └── User enters 6-digit OTP code                             │
│     └── verifyOtp() validates and signs in                       │
│                                                                  │
│  4. profile step                                                 │
│     └── User confirms/edits full name                            │
│     └── Profile created/updated in profiles table                │
│                                                                  │
│  5. organization step                                            │
│     └── User enters org name, prefix, industry                   │
│     └── RPC: create_org_with_owner() creates org + membership    │
│                                                                  │
│  6. company-info step (Owner/Admin only)                         │
│     └── Phone, address, website                                  │
│     └── Updates organization record                              │
│                                                                  │
│  7. complete                                                     │
│     └── Onboarding progress cleared from DB                      │
│     └── Redirect to /dashboard                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Session Data Persistence

```typescript
interface OnboardingSessionData {
  fullName?: string;
  orgName?: string;
  industry?: string;
  foundVia?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyWebsite?: string;
}
```

**Pre-auth (verify-otp):** localStorage with timestamp
**Post-auth:** `user_onboarding_progress` table with 24-hour expiry

### Step Determination Logic

```typescript
determineOnboardingStep(userId):
  1. Check saved progress → return saved step
  2. Check profile.full_name → if missing, return 'profile'
  3. Check membership exists → if missing, return 'organization'
  4. If role is Member → return null (complete)
  5. If Owner/Admin, check company info → if missing, return 'company-info'
  6. Return null (complete)
```

### Invited User Flow

When user accepts a team invitation:

```
1. Click invite link → /join?token=xxx
2. Token validated, membership auto-created with status='Active'
3. Skip organization step (already assigned to org)
4. Profile step (if name missing) → company-info (if Owner/Admin) → complete
```

## Organization Creation (Signup)

```typescript
// Atomic RPC call creates org + membership
supabase.rpc('create_org_with_owner', {
  org_name, org_prefix, found_via, industry, owner_id
})
// Creates membership with role='Owner', status='Active', join_type='Created'
```

## Invite Flows

### Team Invites (`invite_tokens` table)
- Admin invites existing user by email
- Token valid for 2 hours
- On accept: Membership created, seat added to Stripe

### Signup Invites (`signup_invites` table)
- Super admin invites new user
- User must use invite link to create account
- Route: `/create-account?appinvite=TOKEN`

## Transfer Ownership

**Location:** `supabase/migrations/20251012000002_create_transfer_ownership_function.sql`

Only one Owner per organization. Ownership transfer is an atomic operation.

### Flow

```
1. Current Owner initiates transfer in Settings → Team
2. Selects new owner (must be active Admin or Member)
3. RPC: transfer_ownership(new_owner_id, organization_id)
4. Atomic operation:
   - Current Owner demoted to Admin
   - Selected user promoted to Owner
   - Both profiles and memberships tables updated
```

### Function

```typescript
// Frontend call
const { data, error } = await supabase.rpc('transfer_ownership', {
  p_new_owner_id: newOwnerId,
  p_organization_id: organizationId
});

// Returns
{
  success: true,
  previous_owner_id: '...',
  new_owner_id: '...',
  organization_id: '...',
  transferred_at: '...'
}
```

### Constraints

- Only current Owner can transfer
- New owner must be active Admin or Member
- Cannot transfer to yourself
- One Owner enforced per organization

## Member Removal (Soft Delete)

Members are **not deleted** - they are deactivated. This preserves data integrity.

### Removal Flow

```
1. Admin/Owner removes member in Settings → Team
2. Membership status changed: 'Active' → 'Inactive'
3. Stripe seat count decremented
4. User's proposals show "Deactivated User" as creator
5. User loses access to organization data (RLS)
```

### Status Values

| Status | Access | Description |
|--------|--------|-------------|
| `Active` | ✅ Full | Normal active member |
| `Pending` | ❌ None | Awaiting approval (if enabled) |
| `Inactive` | ❌ None | Removed/deactivated member |

### Reactivation

If a user is re-invited to the same organization:
- Membership status changes back to `Active`
- Their proposals revert to showing their actual name
- Access restored

### Data Preservation

**Trigger:** `update_quote_creator_name_on_membership_change()`

| Action | Quote Creator Name |
|--------|-------------------|
| Member removed (Inactive) | "Deactivated User" |
| Member reactivated (Active) | Actual user name |
| Profile deleted | "Deleted User" |

### User Account Deletion

When a user deletes their account:

```
1. User requests deletion in Settings → Account
2. Password confirmation required
3. Trigger: handle_user_deletion() runs
4. created_by set to NULL on quotes (FK constraint: SET NULL)
5. created_by_name set to "Deleted User"
6. Profile record deleted from profiles table
7. Auth user deleted from auth.users
```

## Token Refresh

- Supabase auto-refreshes ~60 seconds before expiry
- Triggers `TOKEN_REFRESHED` event in AuthProvider
- Session updated in React Query cache

## Password Reset Flow

```
1. User requests reset → authService.resetPassword(email)
2. Email with link: /reset-password?access_token=...&refresh_token=...
3. setSession() with tokens from URL
4. User enters new password → updateUser({ password })
5. Auto sign-out after success
```

## Sign-Out Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Session already invalid | Treats as success (no logout loop) |
| Token refresh failure | Automatic sign out |
| Orphaned sessions | Detected via `validateUserExists()` |
| Unconfirmed email on login | Auto-resends OTP |

## Rate Limiting

| Action | Limit | Block Duration |
|--------|-------|----------------|
| Login | 5 attempts/15 min | 30-min block |
| OTP | 3 attempts/10 min | 60-min block |
| Password reset | 3 attempts/60 min | 120-min block |

## Protected Routes

**Location:** `src/router/ProtectedRoute.tsx`

- Role hierarchy: Owner (3) > Admin (2) > Member (1)
- Access denied → Navigate to `/access-denied`

## Race Condition Prevention

### AuthEventMutex

**Location:** `src/auth/utils/AuthEventMutex.ts`

Serializes all auth events to prevent race conditions:

```typescript
class AuthEventMutex {
  private queue: Promise<void>;  // Queue chain
  private timeout = 30000;       // 30s timeout per operation

  async execute<T>(fn: () => Promise<T>): Promise<T>
  isPending(): boolean
  clear(): void  // Reset on logout
}
```

**Prevents:**
- Concurrent SIGNED_IN + TOKEN_REFRESHED races
- Multiple simultaneous auth state mutations
- Hung operations (30s timeout)

## Key Files

### Auth Core
- `src/auth/AuthProvider.tsx` - Main auth context provider
- `src/auth/services/authService.ts` - Auth operations (sign in/out, OTP, password reset)
- `src/auth/services/profileService.ts` - Profile CRUD
- `src/auth/hooks/useAuth.ts` - Auth hooks
- `src/auth/utils/AuthEventMutex.ts` - Race condition prevention

### Onboarding
- `src/services/onboardingStateService.ts` - Onboarding state machine
- `src/pages/Auth.tsx` - Auth page with step routing
- `src/pages/Auth/actions/` - Step handlers (handleAuth, handleOrganizationSubmit, handleInviteJoin)
- `src/utils/authFlowHelpers.ts` - Auth flow utilities

### Team Management
- `src/components/features/settings/TeamTab.tsx` - Team management UI
- `src/utils/teamManagementHelpers.ts` - Team operation helpers
- `supabase/migrations/20251012000002_create_transfer_ownership_function.sql` - Ownership transfer
- `supabase/migrations/20251024000005_handle_deleted_deactivated_users.sql` - Soft delete handling
