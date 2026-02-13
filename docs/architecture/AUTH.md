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

Org Admin/Owner invites a user by email to join their organization.

| Property | Value |
|----------|-------|
| Token expiry | 24 hours |
| Created by | Admin/Owner via Settings → Team |
| Route | `/create-account?invite=TOKEN` |
| Email sent via | Resend (edge function: `send-invite`) |

#### Validation Flow (signed-in user clicks invite link)

```
1. Token validated FIRST (before any side effects)
2. If invalid → navigate to /invalid-invitation?error={type}
3. If valid + signed-in user's email matches invite email:
   → Auto-join via RPC (auto_join_pending_invite)
   → Stripe seat sync, toast, redirect to dashboard
4. If valid + email mismatch:
   → Redirect to /invalid-invitation?error=EmailMismatch&inviteEmail=...&currentEmail=...
   → Invite token stored in sessionStorage (`mismatchInviteToken`)
   → User can "Sign Out & Accept Invite" (signs out, redirects to /create-account?invite=TOKEN)
   → Uses window.location.replace() to bypass AuthRoute's dashboard redirect
5. If valid + no session:
   → Store token in sessionStorage, begin signup/OTP flow
```

**Key principle:** Never sign out a user before validating the token. Invalid tokens should never trigger side effects.

#### Rate Limiting

- **5 failed attempts per 5 minutes** (IP-based)
- **2 failed attempts per 5 minutes** (per-token, prevents scanning)
- Logged in `invite_token_attempts` table
- Checked via `check_invite_rate_limit()` RPC

### Signup Invites (`signup_invites` table)

Super admin invites a new user to the platform (creates their own org).

| Property | Value |
|----------|-------|
| Token expiry | 7 days |
| Created by | Super admin via Admin panel |
| Route | `/create-account?appinvite=TOKEN` |
| Email sent via | Resend (edge function: `send-signup-invite`) |

#### Validation Flow

```
1. Rate limit checked FIRST (stricter: 3 attempts / 10 min)
2. Sign out existing user if any
3. Token validated via validate_signup_invite() RPC
4. If valid → store in sessionStorage, pre-fill email, show signup form
5. If invalid → navigate to /invalid-invitation?error={type}&type=signup
```

#### Rate Limiting (stricter than team invites)

- **3 failed attempts per 10 minutes** (IP-based)
- **1 failed attempt per 10 minutes** (per-token)
- Uses same `invite_token_attempts` table and `check_invite_rate_limit()` RPC
- Stricter because signup invites grant platform-level access (org creation)

### Why Two Separate Tables?

| Concern | `invite_tokens` | `signup_invites` |
|---------|-----------------|------------------|
| Purpose | Join existing org | Create new org on platform |
| Created by | Org Admin/Owner | Super Admin |
| Scoped to | Organization | Platform-wide |
| RLS model | Org-scoped policies | Super admin only |
| Expiry | 24 hours | 7 days |
| Lifecycle | Tied to org membership | Tied to platform onboarding |

Different business concerns, RLS models, and lifecycles — merging would add complexity for no benefit.

### Auto-Join Orphaned Invited Users

When a user is invited but abandons the signup flow (e.g., closes tab during OTP), their `invite_tokens` row remains with `is_used = false`. When they later sign in normally, MainLayout detects no membership and would redirect to org creation — which is wrong.

**Fix:** Before the orphan redirect, MainLayout calls `auto_join_pending_invite()` RPC:

```
1. MainLayout detects: authenticated user, no membership
2. RPC checks invite_tokens for valid pending invite matching user's email
3. If found → atomically creates membership + marks token used
4. Client syncs Stripe seat count, invalidates queries, shows toast
5. If not found → normal orphan redirect to /create-account
```

**RPC:** `auto_join_pending_invite(p_user_id, p_user_email)` — `SECURITY DEFINER`, handles email case insensitivity, duplicate membership detection, and returns org name for the toast.

**Location:** `src/components/common/layout/MainLayout.tsx` (in `checkMembershipStatus`)

### Invalid Invitation Page

**Route:** `/invalid-invitation` (standalone, no auth wrapper)
**Location:** `src/pages/InvalidInvitation.tsx`

Displayed when a user accesses an invite link that is used, expired, revoked, not found, or for a different email.

**Error info passed via URL query params** (not `location.state`, which is fragile across navigation chains):
- `?error=Used|Expired|Revoked|NotFound|Invalid|EmailMismatch` — error type
- `&type=signup` — if the invite was a signup invite (changes messaging)
- `&inviteEmail=...&currentEmail=...` — for EmailMismatch (shows both emails in message)

**EmailMismatch flow:**
- Invite token stored in `sessionStorage` (`mismatchInviteToken` key) before redirect
- "Sign Out & Accept Invite" button: signs out, clears sessionStorage, redirects to `/create-account?invite=TOKEN`
- "Go to Dashboard" button: returns to current account's dashboard

**Sign-in aware:** Checks for active session and shows:
- Signed in → "Go to Dashboard" button
- Not signed in → "Back to Qwohter" button

Direct access without `?error=` param redirects to `/`.

### Invite Cleanup (Daily Cron)

Both invite tables are cleaned up by the daily cron at **3:30 AM UTC** (`cleanup-rate-limiting-logs`):

| Table | Cleanup rule |
|-------|-------------|
| `invite_tokens` | Delete expired; delete revoked older than 30 days |
| `signup_invites` | Delete expired & unused; delete revoked older than 30 days; delete used older than 90 days |
| `invite_token_attempts` | Delete records older than 7 days |

**Functions:** `cleanup_invite_tokens()`, `cleanup_signup_invites()`, `cleanup_invite_token_attempts()` — all called by `cleanup_all_rate_limiting_logs()`.

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

**Trigger:** `update_proposal_creator_name_on_membership_change()`

| Action | Proposal Creator Name |
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
4. created_by set to NULL on proposals (FK constraint: SET NULL)
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

### Auth Rate Limits (Supabase-managed)

| Action | Limit | Block Duration |
|--------|-------|----------------|
| Login | 5 attempts/15 min | 30-min block |
| OTP | 3 attempts/10 min | 60-min block |
| Password reset | 3 attempts/60 min | 120-min block |

### Invite Rate Limits (application-managed)

| Action | IP Limit | Per-Token Limit | Window |
|--------|----------|-----------------|--------|
| Team invite validation | 5 fails/5 min | 2 fails/5 min | 5 min |
| Signup invite validation | 3 fails/10 min | 1 fail/10 min | 10 min |

**Infrastructure:** `invite_token_attempts` table, `check_invite_rate_limit()` RPC, `logInviteAttempt()` frontend utility. Both invite types share the same table and RPC — thresholds are controlled by frontend params.

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

### Invites & Rate Limiting
- `src/utils/inviteTokens.ts` - Token validation (team + signup)
- `src/utils/rateLimiting.ts` - Rate limit checks, attempt logging, IP detection
- `src/pages/InvalidInvitation.tsx` - Invalid invite error page
- `supabase/functions/send-invite/index.ts` - Team invite email (Resend)
- `supabase/functions/send-signup-invite/index.ts` - Signup invite email (Resend)
- `supabase/migrations/20260202000001_auto_join_pending_invite.sql` - Auto-join orphaned users RPC
- `supabase/migrations/20260203000001_cleanup_signup_invites_and_rate_limiting.sql` - Cleanup cron additions

### Team Management
- `src/components/features/settings/TeamTab.tsx` - Team management UI
- `src/utils/teamManagementHelpers.ts` - Team operation helpers
- `supabase/migrations/20251012000002_create_transfer_ownership_function.sql` - Ownership transfer
- `supabase/migrations/20251024000005_handle_deleted_deactivated_users.sql` - Soft delete handling
