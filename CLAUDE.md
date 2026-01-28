# CLAUDE.md

Essential guidance for Claude Code when working with **Qwohter** - A proposal and quote management platform for businesses.

> **Note:** Directory names still use the legacy "WallQu/wall-quote-wizard" naming. Do NOT rename directories.

---

## Quick Commands

```bash
# Development
npm run dev                    # Start dev server (localhost:5173)
npm run build                  # Production build (auto-increments version)
npm run lint && npm run build  # Validate before commits

# Testing
npm run test                   # Unit tests
npm run test:coverage          # Coverage report

# Supabase (local development)
supabase start                 # Start local Supabase
supabase db reset              # Reset database with migrations
supabase functions serve       # Run edge functions locally
```

---

## Architecture Overview

### Tech Stack
- **Frontend:** React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **State:** React Query (server) + Zustand (UI/app)
- **Payments:** Stripe (subscriptions, invoices)
- **Email:** Resend (transactional emails)
- **Integrations:** Google Docs, QuickBooks

### Core Architectural Patterns
- **Multi-tenant:** Organization-based isolation via RLS
- **JSONB:** Flexible form data and configuration storage
- **Real-time:** Supabase subscriptions for live updates
- **Type-safe:** Full TypeScript with strict mode

---

## Application Systems Overview

### 1. Authentication System

**Location:** `src/auth/`

**Architecture:**
```
User → AuthProvider.tsx → authService.ts → Supabase Auth
                ↓
        React Query (session/profile cache)
                ↓
        AuthEventMutex (race condition prevention)
```

**Key Components:**
- `AuthProvider.tsx` - Single `onAuthStateChange` listener, session restoration
- `authService.ts` - Sign in/out, OTP verification, password reset
- `profileService.ts` - Profile CRUD operations
- `useAuth.ts` - Hooks: `useUser()`, `useSession()`, `useProfile()`, `useSignIn()`, `useSignOut()`
- `AuthEventMutex.ts` - Prevents race conditions on rapid auth events

**Sign-In Flow:**
1. User enters credentials → `authService.signIn()`
2. Success → AuthProvider listener fires `SIGNED_IN`
3. Session cached in React Query
4. Profile prefetched → Organization prefetched
5. Redirect based on onboarding state

**Sign-Out Edge Cases Handled:**
- Session already invalid → Treats as success (no logout loop)
- Token refresh failure → Automatic sign out
- Orphaned sessions → Detected via `validateUserExists()`
- Unconfirmed email on login → Auto-resends OTP

**Rate Limiting:**
- Login: 5 attempts/15 min, 30-min block
- OTP: 3 attempts/10 min, 60-min block
- Password reset: 3 attempts/60 min, 120-min block

**Protected Routes:** `src/router/ProtectedRoute.tsx`
- Role hierarchy: Owner (3) > Admin (2) > Member (1)
- Access denied → Navigate to `/access-denied`

---

### 2. Proposal System

**Location:** `src/services/proposalsService.ts`, `src/components/features/proposals/`

**Data Model:**
```typescript
interface Proposal {
  id: string;
  proposal_number: string;           // Auto-generated (e.g., "SR-1005.2")
  organization_id: string;
  form_id: string;                   // Form template used
  form_data: Record<string, any>;    // JSONB - all form fields
  status: 'Draft' | 'Submitted' | 'Won' | 'Rejected' | 'Pending Approval';

  // Direct columns for querying
  project_name?: string;
  client_name?: string;
  client_company?: string;
  job_location?: string;
  total_value?: number;

  // Versioning
  parent_proposal_id?: string;
  is_main_version: boolean;

  // Timestamps
  submitted_at?: string;
  won_at?: string;
  rejected_at?: string;
}
```

**Key Features:**
- **Versioning:** `proposal_number.version` (e.g., "SR-1005.2")
- **Document-type numbering:** Configurable prefixes per type (Quote, Bid, Estimate, etc.)
- **E-Signature:** Digital signing via `proposalSigningService.ts`
- **Approval Workflow:** Optional admin approval before submission
- **PDF Export:** Google Docs integration for document generation

**Proposal Hooks:** `src/hooks/queries/useProposals.ts`
- `useProposals(orgId)` - Fetch all with realtime
- `useProposal(id)` - Single proposal
- `useCreateProposal()`, `useUpdateProposal()`, `useDeleteProposal()`
- `useUpdateProposalStatus()` - Status changes with notifications

**E-Signature Flow:**
1. `sendForSignature()` → Creates signing token
2. Exports Google Doc as PDF → Uploads unsigned PDF
3. Emails client with signing link
4. Client signs → `submitSignature()` embeds signature in PDF
5. Updates proposal status to "Won"

---

### 3. Projects & Board System

**Location:** `src/services/boardService.ts`, `src/components/features/board/`

**Relationship:** Projects are auto-created when proposals become "Won"

```
Proposal (status: Won, is_main_version: true)
        ↓ Trigger
    Project
        ├── workflow_status (kanban column)
        ├── project_tasks[]
        └── project_attachments[]
```

**Key Features:**
- **Kanban Board:** Custom workflow columns per organization
- **Task Management:** Tasks with references (e.g., "CW-1"), priorities, due dates
- **Attachments:** File uploads with signed URLs (50MB limit)
- **Real-time:** Live updates across all board views

**Project Hooks:** `src/hooks/queries/useBoard.ts`
- `useProjects(orgId)` - Board items with realtime
- `useWorkflowColumns(orgId)` - Custom columns
- `useMoveProject()` - Drag/drop reordering

---

### 4. Contacts System

**Location:** `src/services/contactsService.ts`, `src/components/features/contacts/`

**Data Model:**
```typescript
interface Contact {
  id: string;
  organization_id: string;
  full_name: string;
  emails: string[];              // Array of emails
  phones?: { number: string; type: string }[];
  company_name?: string;
  contact_type?: string;         // Customer, Vendor, Lead, etc.
  is_in_organization: boolean;   // Part of team or external
}
```

**Key Features:**
- Multi-email and multi-phone support
- International phone validation (libphonenumber-js)
- CSV export functionality
- Contact type categorization

---

### 5. Forms & Form Builder

**Location:** `src/features/proposals/context/FormBuilderContext.tsx`, `src/services/formsService.ts`

**Architecture:**
- **Form Templates:** Reusable form definitions with metadata (JSONB)
- **FormBuilderContext:** Shared state across builder tabs (pricing, lead times, products, etc.)
- **Dynamic Fields:** JSONB-based flexible field structure

**Form Data Structure:**
```typescript
interface FormBuilderData {
  pricing: PricingData;          // Line items, sections, totals
  leadTimes: LeadTimesData;      // Phases, timeline
  miscellaneous: MiscellaneousData;
  products: ProductsData;
  presentation: PresentationData;
}
```

**Hooks:** `src/hooks/queries/useForms.ts`
- `useForms(orgId)`, `useFormById(id)`
- `useCreateForm()`, `useUpdateForm()`, `useDeleteForm()`
- `useArchiveForm()`, `useUnarchiveForm()`

---

### 6. Notification System

**Location:** `src/services/notificationService.ts`, `supabase/functions/`

**Architecture:**
```
User Action → notificationService.ts
        ├── createNotification() → notifications table (in-app)
        └── invoke send-notification-email → Resend API
                                                ↓ (on failure)
                                    notification_retry_queue
                                                ↓ (every 5 min)
                                    process-notification-retry
```

**Notification Types:**
- Signature events: `signature_sent`, `signature_viewed`, `signature_signed`
- Proposal events: `proposal_submitted`, `proposal_won`, `proposal_rejected`
- Task events: `task_assigned`, `update_mention`
- Payment events: `payment_success`, `payment_failed`, `trial_ending`

**Scheduled Notifications:**
- Table: `scheduled_notifications`
- Supports: one-time, daily, weekly recurrence
- Processed by pg_cron every 5 minutes

**User Preferences:** `notification_preferences` table
- Per-user, per-organization settings
- Toggle each notification type on/off

---

### 7. Settings System

**Location:** `src/pages/Settings.tsx`, `src/components/features/settings/`

**Tabs (role-filtered):**
| Tab | Access | Description |
|-----|--------|-------------|
| Account | All | Profile, email, password |
| Organization | Admin+ | Company info, logo, numbering |
| Team | Admin+ | Invite/manage members |
| Plan & Billing | Admin+ | Subscription, invoices |
| Notifications | All | Email preferences |
| Integrations | Admin+ | Google, QuickBooks |
| Appearance | All | Theme settings |

**Workflow Settings:**
- `require_proposal_approval` - Toggle admin approval requirement
- When enabled, Members need Admin/Owner approval to submit proposals

---

### 8. Billing & Subscriptions

**Location:** `src/services/stripeService.ts`, `src/components/features/settings/BillingTab.tsx`

**Architecture:** Stripe-first (Stripe is source of truth)

**Subscription Model:**
```typescript
interface Subscription {
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_subscription_status: 'Active' | 'Trialing' | 'Canceled' | ...;
  current_period_start: string;
  current_period_end: string;
  has_payment_method: boolean;
  is_active: boolean;
}
```

**Key Features:**
- 14-day free trial (local-only until payment method added)
- 3-day grace period after trial expiry
- Per-seat pricing with proration
- Stripe Customer Portal integration

**Edge Functions:**
- `stripe-webhook` - Handles Stripe events
- `stripe-handler` - Checkout session creation
- `create-portal-session` - Billing portal access
- `manage-seats` - Seat count updates

---

### 9. Admin Panel

**Location:** `src/features/admin/`

**Access:** `is_super_admin = true` in profiles table

**Routes:**
- `/admin` - Admin dashboard
- `/admin/appinvite` - Send signup invites
- `/admin/products/*` - Product catalog management
- `/admin/options/value-sets` - Config value sets

**Product Catalog Hierarchy:**
```
Domain → Manufacturer → Product Line → Series → Model
```

---

### 10. State Management

**Three-Tier System:**
| Type | Location | Purpose |
|------|----------|---------|
| Server State | React Query | Proposals, organizations, forms, etc. |
| UI State | Zustand (uiStore) | Modals, toasts, sidebar, theme |
| App State | Zustand (appStore) | Feature flags, online status |

**React Query Configuration:** `src/lib/queryClient.ts`
- Stale time: 30 seconds
- GC time: 5 minutes
- Retry: 3 with exponential backoff
- localStorage persistence (5-min TTL)

**Zustand Stores:**
- `appStore.ts` - App lifecycle, feature flags
- `uiStore.ts` - UI preferences (persisted to localStorage)
- `productStore.ts` - Product selection state

---

### 11. Real-time Updates

**Location:** `src/lib/realtimeSubscriptions.ts`

**Pattern:**
```typescript
useRealtimeSubscription(
  'tableName',
  queryKey,
  { filter: `organization_id=eq.${orgId}` }
);
```

**Tables with Realtime:**
- proposals, projects, project_tasks
- notifications, contacts
- forms, memberships

**Features:**
- Channel registry prevents duplicate subscriptions
- Debounced cache invalidation (100ms)
- Immediate removal for DELETE events

---

## Database & Security

### RLS (Row Level Security) Patterns

**All tables have RLS enabled.** Key patterns:

```sql
-- Organization isolation
WHERE organization_id IN (
  SELECT organization_id FROM memberships
  WHERE user_id = auth.uid() AND status = 'Active'
)

-- Role-based access
WHERE has_org_role(auth.uid(), organization_id, ARRAY['Admin', 'Owner'])

-- Self + admin access
WHERE (user_id = auth.uid() OR has_org_role(...))
```

### RLS Helper Functions Reference

**Location:** `supabase/migrations/05_essential_functions.sql`

All functions use `SECURITY DEFINER` and `STABLE` modifiers for RLS policy compatibility.

#### Membership Checks

| Function | Signature | Description |
|----------|-----------|-------------|
| `is_active_member` | `(user_id uuid, org_id uuid) → boolean` | Check if user has active membership in organization |
| `has_org_role` | `(user_id uuid, org_id uuid, roles text[]) → boolean` | Check if user has ANY of the specified roles (e.g., `ARRAY['Admin', 'Owner']`) |
| `can_view_membership` | `(user_id uuid, membership_user_id uuid, membership_org_id uuid) → boolean` | Check if user can view another user's membership (same org or self) |

#### Current User Helpers (uses `auth.uid()`)

| Function | Signature | Description |
|----------|-----------|-------------|
| `is_owner_or_admin` | `() → boolean` | Check if current user is Owner or Admin in their org |
| `get_current_user_organization` | `() → uuid` | Get current user's organization ID |
| `get_current_user_role` | `() → text` | Get current user's role ('Owner', 'Admin', 'Member') |
| `user_has_admin_role_in_org` | `(org_id uuid) → boolean` | Check if current user is Admin/Owner in specific org |
| `user_has_role_in_org` | `(org_id uuid, required_role text) → boolean` | Check if current user has exact role in org |

#### Multi-Org Helpers

| Function | Signature | Description |
|----------|-----------|-------------|
| `get_user_org_ids` | `(user_id uuid) → TABLE(organization_id uuid)` | Get all organization IDs user belongs to |
| `get_org_member_ids` | `(user_id uuid) → TABLE(user_id uuid)` | Get all member IDs in user's organizations |

#### Storage Access

| Function | Signature | Description |
|----------|-----------|-------------|
| `is_org_folder_admin` | `(user_id uuid, folder_name text) → boolean` | Check if user is Admin/Owner for storage bucket folder |
| `get_user_org_folders` | `(user_id uuid) → TABLE(org_folder text)` | Get storage folders user can access (org IDs as text) |

#### Subscription Checks

| Function | Signature | Description |
|----------|-----------|-------------|
| `has_valid_subscription` | `(org_id uuid) → boolean` | Check if org has active/trialing subscription |

#### Usage Examples

```sql
-- RLS Policy: Users can view their org's proposals
CREATE POLICY "view_org_proposals" ON proposals FOR SELECT
USING (is_active_member(auth.uid(), organization_id));

-- RLS Policy: Only admins can delete
CREATE POLICY "admins_delete" ON proposals FOR DELETE
USING (has_org_role(auth.uid(), organization_id, ARRAY['Admin', 'Owner']));

-- RLS Policy: Users see only their org's data
CREATE POLICY "org_isolation" ON contacts FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM get_user_org_ids(auth.uid())
  )
);

-- Check current user's permissions
SELECT is_owner_or_admin();  -- true/false
SELECT get_current_user_role();  -- 'Owner', 'Admin', or 'Member'
```

### Security Measures

**Rate Limiting:**
- Table: `auth_rate_limits`
- Function: `check_auth_rate_limit()`, `record_auth_attempt()`

**Storage Validation:**
- Function: `validate_storage_upload()`
- Per-bucket file type and size limits

**Audit Logging:**
- Table: `security_audit_log`
- Function: `log_security_event()`

**Error Sanitization:**
- Function: `sanitize_error_message()`
- Prevents information leakage

---

## Supabase Security Checklist for New Features

### When Creating a New Table

```sql
-- 1. ALWAYS enable RLS
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

-- 2. Create SELECT policy (use helper function)
CREATE POLICY "Users can view their org data"
ON public.new_table FOR SELECT
TO authenticated
USING (is_active_member(auth.uid(), organization_id));

-- 3. Create INSERT policy (use helper function)
CREATE POLICY "Users can create in their org"
ON public.new_table FOR INSERT
TO authenticated
WITH CHECK (is_active_member(auth.uid(), organization_id));

-- 4. Create UPDATE policy (use helper function)
CREATE POLICY "Users can update their org data"
ON public.new_table FOR UPDATE
TO authenticated
USING (is_active_member(auth.uid(), organization_id))
WITH CHECK (is_active_member(auth.uid(), organization_id));

-- 5. Create DELETE policy (admin-only using role check)
CREATE POLICY "Admins can delete"
ON public.new_table FOR DELETE
TO authenticated
USING (has_org_role(auth.uid(), organization_id, ARRAY['Admin', 'Owner']));

-- 6. Add required indexes
CREATE INDEX idx_new_table_org ON public.new_table(organization_id);
CREATE INDEX idx_new_table_created ON public.new_table(created_at);
```

**Alternative patterns using helper functions:**

```sql
-- For user-owned resources (e.g., user can only edit their own records)
CREATE POLICY "Users can update own records"
ON public.new_table FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR has_org_role(auth.uid(), organization_id, ARRAY['Admin', 'Owner'])
);

-- For subscription-gated features
CREATE POLICY "Active subscription required"
ON public.premium_features FOR SELECT
TO authenticated
USING (
  is_active_member(auth.uid(), organization_id)
  AND has_valid_subscription(organization_id)
);

-- For cross-org visibility (e.g., shared resources)
CREATE POLICY "View org data"
ON public.new_table FOR SELECT
TO authenticated
USING (
  organization_id IN (SELECT organization_id FROM get_user_org_ids(auth.uid()))
);
```

### When Creating Edge Functions

```typescript
// 1. Verify authentication
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');
const { data: { user }, error } = await supabase.auth.getUser(token);

if (!user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

// 2. Verify organization membership
const { data: membership } = await supabase
  .from('memberships')
  .select('role, status')
  .eq('user_id', user.id)
  .eq('organization_id', organizationId)
  .single();

if (!membership || membership.status !== 'Active') {
  return new Response(JSON.stringify({ error: 'Not a member' }), { status: 403 });
}

// 3. For admin operations, check role
if (!['Admin', 'Owner'].includes(membership.role)) {
  return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { status: 403 });
}
```

### config.toml Settings

```toml
# For authenticated endpoints (default)
[functions.my-function]
verify_jwt = true

# For webhook endpoints (use signature verification instead)
[functions.stripe-webhook]
verify_jwt = false
```

### Security Best Practices

1. **Never trust client input** - Always validate on server/edge function
2. **Use SECURITY DEFINER sparingly** - Only for privileged operations
3. **Always include `SET search_path = ''`** in SECURITY DEFINER functions
4. **Don't expose internal error messages** - Use `sanitize_error_message()`
5. **Log security events** - Call `log_security_event()` for sensitive operations
6. **Test RLS policies** - Verify users can't access other org's data

### Additional Security Hardening

**Input & API Security:**
- **Validate all inputs** with Zod in Edge Functions before processing
- **Verify webhook signatures** (Stripe) using `stripe.webhooks.constructEvent()` before trusting payload — return `400` immediately if verification fails
- **Rate limit** mutation endpoints, especially auth and payment routes

**Storage Security:**
- **No public buckets** — always use `createSignedUrl()` for file retrieval
- **UUID filenames** — rename uploads to `crypto.randomUUID()` to prevent enumeration attacks
- **Never expose direct storage paths** to clients

**Environment Variables:**
- **Never hardcode secrets** — use `import.meta.env.VITE_*` (client) or Supabase secrets (edge functions)
- **Validate at startup** — fail fast on missing required config
- If you see a secret in code, replace it with an environment variable and warn the user

**RPC Function Lockdown:**
- For sensitive Postgres functions, revoke public access:
  ```sql
  REVOKE EXECUTE ON FUNCTION function_name FROM public;
  REVOKE EXECUTE ON FUNCTION function_name FROM anon;
  GRANT EXECUTE ON FUNCTION function_name TO service_role;
  ```

**Compliance Check:**
Before generating code involving data access, verify:
- Is this operation protected by RLS policies?
- Are inputs validated with Zod?
- Are webhook payloads signature-verified?
- Are file uploads using UUID names and signed URLs?

---

## Feature Development Checklist

### Before Starting

- [ ] Create feature branch: `feature/{name}` or `hotfix/{name}`
- [ ] Understand existing patterns in similar features
- [ ] Plan database schema changes (if any)

### Database Changes

- [ ] Create migration file with timestamp prefix
- [ ] Add RLS policies for ALL operations (SELECT, INSERT, UPDATE, DELETE)
- [ ] Add necessary indexes
- [ ] Add foreign key constraints with appropriate ON DELETE behavior
- [ ] Test RLS works correctly (user A can't see user B's data)

### Backend/Edge Functions

- [ ] Verify authentication in all endpoints
- [ ] Check organization membership
- [ ] Validate role permissions for admin operations
- [ ] Use service role only when necessary
- [ ] Add to config.toml with appropriate verify_jwt setting

### Frontend

- [ ] Create service file: `src/services/{feature}Service.ts`
- [ ] Create React Query hooks: `src/hooks/queries/use{Feature}.ts`
- [ ] Add realtime subscription if needed
- [ ] Handle loading, error, and empty states
- [ ] Add toast notifications for user feedback

### Types

- [ ] Add TypeScript interfaces: `src/lib/types/{feature}.ts`
- [ ] Update Supabase types if schema changed: `src/integrations/supabase/types.ts`

### Testing

- [ ] Test with multiple organizations (multi-tenant isolation)
- [ ] Test with different roles (Owner, Admin, Member)
- [ ] Test error scenarios (network failure, permission denied)
- [ ] Test real-time updates

---

## Coding Standards

### File Organization

```
src/
├── auth/                  # Authentication system
├── components/
│   ├── features/          # Feature-specific components
│   ├── common/            # Reusable components
│   └── ui/                # shadcn/ui components
├── features/              # Feature modules (admin, proposals)
├── hooks/
│   └── queries/           # React Query hooks
├── lib/                   # Core utilities and types
├── pages/                 # Route components
├── services/              # API services
├── stores/                # Zustand stores
└── utils/                 # Utility functions
```

### File Size Limits

- **Max 500 lines per file** - Break up at 400 lines
- **Single responsibility** - One concern per file
- **No god classes** - Split large components

### Naming Conventions

- **Services:** `{feature}Service.ts`
- **Hooks:** `use{Feature}.ts` or `use{Feature}s.ts`
- **Components:** PascalCase, descriptive names
- **Types:** Interfaces in `types/` folder

### State Management Rules

- **Server state:** Always use React Query
- **UI state:** useState for local, Zustand for global
- **Never mix:** Keep server and UI state separate

### Error Handling

```typescript
// Always handle errors explicitly
try {
  const result = await service.operation(data);
  toast({ title: 'Success', description: 'Operation completed' });
  return result;
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  toast({ title: 'Error', description: message, variant: 'destructive' });
  throw error;
}
```

---

## Environment Variables

```bash
# Required
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Stripe (test/prod)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...

# Edge function secrets (set in Supabase dashboard)
STRIPE_SECRET_KEY=sk_...
RESEND_API_KEY=re_...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
```

---

## Version Management

**Auto-managed** - Do NOT manually edit `public/version.json`

- Format: `v1.0.{buildNumber}`
- Increments on every build
- Stale client detection every 5 minutes
- Auto-reload notification for users

---

## Key Files Reference

| System | Key Files |
|--------|-----------|
| Auth | `src/auth/AuthProvider.tsx`, `src/auth/services/authService.ts` |
| Proposals | `src/services/proposalsService.ts`, `src/hooks/queries/useProposals.ts` |
| Projects | `src/services/boardService.ts`, `src/hooks/queries/useBoard.ts` |
| Forms | `src/services/formsService.ts`, `src/hooks/queries/useForms.ts` |
| Notifications | `src/services/notificationService.ts`, `supabase/functions/send-notification-email/` |
| Billing | `src/services/stripeService.ts`, `src/components/features/settings/BillingTab.tsx` |
| Query Client | `src/lib/queryClient.ts` |
| Realtime | `src/lib/realtimeSubscriptions.ts` |
| Types | `src/integrations/supabase/types.ts`, `src/lib/types/` |

---

## Auth Design & Flow (Detailed)

### Complete Signup Flow

```
1. User enters email/password/name
2. tempSignupService stores data (password in sessionStorage, rest in localStorage)
3. Supabase signUp() called → OTP email sent
4. User enters OTP code → verifyOtp()
5. Profile auto-created in profiles table
6. Onboarding state machine begins
```

### Onboarding State Machine

**States:** `verify-otp → profile → organization → company-info → complete`

**Location:** `src/services/onboardingStateService.ts`

- Pre-auth: localStorage with 24-hour expiry
- Post-auth: `user_onboarding_progress` table with JSONB session data
- Determines next step based on profile/membership existence

### Organization Creation (Signup)

```typescript
// Atomic RPC call creates org + membership
supabase.rpc('create_org_with_owner', {
  org_name, org_prefix, found_via, industry, owner_id
})
// Creates membership with role='Owner', status='Active', join_type='Created'
```

### Invite Flows

**Team Invites** (`invite_tokens` table):
- Admin invites existing user by email
- Token valid for 2 hours
- On accept: Membership created, seat added to Stripe

**Signup Invites** (`signup_invites` table):
- Super admin invites new user
- User must use invite link to create account
- Route: `/create-account?appinvite=TOKEN`

### Token Refresh

- Supabase auto-refreshes ~60 seconds before expiry
- Triggers `TOKEN_REFRESHED` event in AuthProvider
- Session updated in React Query cache

### Password Reset Flow

1. User requests reset → `authService.resetPassword(email)`
2. Email with link: `/reset-password?access_token=...&refresh_token=...`
3. `setSession()` with tokens from URL
4. User enters new password → `updateUser({ password })`
5. Auto sign-out after success

---

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

### React Query Deduplication

- Automatic deduplication of concurrent requests with same key
- `cancelQueries()` before optimistic updates
- Stale-while-revalidate pattern

### Optimistic Updates Pattern

```typescript
onMutate: async (data) => {
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData(queryKey);
  queryClient.setQueryData(queryKey, newData);  // Immediate UI update
  return { previous };
},
onError: (error, vars, context) => {
  queryClient.setQueryData(queryKey, context.previous);  // Rollback
},
onSettled: () => {
  queryClient.invalidateQueries({ queryKey });  // Refetch for truth
}
```

### Other Patterns

- **Channel Registry:** Ref counting prevents duplicate Supabase subscriptions
- **Debounced Cache:** 100ms debounce on realtime invalidations
- **Version Check Mutex:** Boolean flag prevents concurrent version checks
- **Recovery Debounce:** 30s minimum between stale client recovery attempts

---

## Resend Email Integration

**Location:** `supabase/functions/send-notification-email/`

### Configuration

```bash
# Edge Function Secrets (Supabase Dashboard)
RESEND_API_KEY=re_...
APP_URL=https://www.qwohter.com

# Supabase SMTP (for auth emails)
Host: smtp.resend.com
Port: 465 (SSL)
Username: resend
Password: <RESEND_API_KEY>
Sender: noreply@qwohter.com
```

### Email Types

| Category | Types |
|----------|-------|
| Signature | `signature_sent`, `signature_viewed`, `signature_signed` |
| Proposal | `proposal_submitted`, `proposal_won`, `proposal_rejected` |
| Approval | `approval_requested`, `approval_approved`, `approval_rejected` |
| Task | `task_assigned`, `update_mention` |
| Payment | `payment_success`, `payment_failed`, `trial_ending` |
| Team | `member_joined`, invitations |

### Retry Logic

**Table:** `notification_retry_queue`

```
Max retries: 5
Backoff: 5min → 15min → 45min → 2.25hr → 6.75hr
Processing: pg_cron every 5 minutes (batch of 50)
```

### Email Templates

- Inline HTML with embedded CSS
- Brand color: `#EE6C4D`
- Max-width: 560px container
- XSS protection via `escapeHtml()`
- Plain text fallback for all emails

### User Preferences

- `notification_preferences` table
- Global kill switch: `email_enabled`
- Per-type toggles: `email_on_signature_sent`, etc.
- Custom email address support

---

## Google Integration

**Location:** `src/services/googleDocsIntegrationService.ts`, `supabase/functions/`

### OAuth Flow

1. `getGoogleAuthUrl()` generates secure URL with nonce
2. User authorizes in Google
3. Callback exchanges code for tokens via `google-oauth-callback` edge function
4. Tokens stored at organization level (one admin connects for entire org)

### Token Storage

**Table:** `google_oauth_tokens`
- One token per organization (not per user)
- Auto-refresh before expiry (5-min buffer)
- RISC event handling for security (token revocation)

### Google Docs Features

**Template Variables:**
```
{{project.name}}, {{client.name}}, {{org.phone}}
{{pricing.totalSellingPrice}}, {{pricing.materials.sellingPrice}}
{{product.1.name}}, {{product.1.Manufacturer}}
{{SIGNATURE_BLOCK}}
```

**Table Generation:** Dynamic row duplication with `{{#ROW:tableId}}`

**Document Modes:**
- **Create:** New doc from template
- **Overwrite:** Replace existing doc
- **Update:** Update values preserving edits

### Edge Functions

| Function | Purpose |
|----------|---------|
| `generate-google-doc` | Create/update docs from templates |
| `google-oauth-callback` | Handle OAuth code exchange |
| `google-disconnect` | Revoke and delete tokens |
| `check-google-doc` | Verify doc exists/accessible |
| `google-list-drive-files` | List files for template picker |
| `google-risc-receiver` | Handle Google security events |

### Hooks

- `useGoogleConnection(orgId)` - Check connection status
- `useGenerateGoogleDoc()` - Document generation mutation
- `useCheckGoogleDoc(docId)` - Verify doc accessibility
- `useDriveFiles(orgId)` - List Drive files

---

## Observability & Monitoring

### Sentry Integration

**Location:** `src/lib/sentry.ts`

```typescript
// Configuration
DSN: VITE_SENTRY_DSN
Release: qwohter@{APP_VERSION}
Environment: production | development

// Sampling
Traces: 10% production, 100% development
Replays: 10% normal, 100% error sessions

// Privacy
maskAllText: true
blockAllMedia: true
maskAllInputs: true
```

### Error Tracking

**ErrorBoundary:** `src/components/common/ErrorBoundary.tsx`
- Global boundary wraps entire app
- Feature-level boundaries for isolated failures
- "Glitchy Robot" fallback UI with retry

**Error Sanitization:** `src/utils/errorSanitizer.ts`
- Redacts: passwords, tokens, API keys, stack traces
- Maps internal errors to user-friendly messages
- Categorizes: auth, database, network, permission, etc.

### Stale Client Detection

**Location:** `src/services/versionCheckService.ts`, `src/hooks/useVersionCheck.ts`

```
Checks: Every 5 minutes
Pattern Detection: "column does not exist", module loading errors
Recovery: Toast notification + auto-reload (if user inactive)
Smart Reload: Delays if user is typing (up to 2 min retry)
```

### Logging Patterns

- Emoji prefixes: ✅ success, ⚠️ warning, 🔴 error
- Console warning filtering for noise reduction
- Sentry user context on login/logout

### Vercel Analytics

- `<Analytics />` component in App.tsx
- Automatic Web Vitals tracking (LCP, FID, CLS)
- Page view analytics

---

## Landing Page & Public Routes

### Landing Page Structure

**Location:** `src/pages/LandingPage.tsx`, `src/components/features/landing/`

**Components:**
- `HeroSection.tsx` - Sticky header, CTA buttons, hero image
- `FeatureSection.tsx` - 3 feature cards with animations
- `PlatformStatsSection.tsx` - Metrics display
- `TestimonialsSection.tsx` - Customer quotes
- `IndustrySection.tsx` - Industry carousel
- `PricingPlanSection.tsx` - $20/user/month pricing
- `Footer.tsx` - Navigation, legal links, social

**Design System:**
- Font: Urbanist
- Accent: `#EE6C4D`
- Animations: IntersectionObserver-triggered

### Public Routes (No Auth)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | LandingPage | Marketing homepage |
| `/demo` | Demo | Cal.com booking embed |
| `/contact-us` | ContactUs | Contact form + FAQ |
| `/sign/:token` | ProposalSigningPage | Client e-signature |
| `/privacy-policy` | PrivacyPolicy | Legal |
| `/terms-of-service` | TermsOfService | Legal |
| `/faq` | FAQ | Help content |

### SEO Setup

**Location:** `index.html`

```html
<title>Qwohter - Professional Quote Management</title>
<meta name="description" content="..." />
<meta property="og:title" content="..." />
<meta property="og:image" content="https://qwohter.com/images/og-image.png" />
<meta name="google-site-verification" content="..." />
```

---

## Testing Suite

### Framework

**Vitest 3.2.4** with jsdom environment

```bash
npm run test              # Watch mode
npm run test:run          # Single run (CI)
npm run test:coverage     # With coverage report
npm run test:ui           # UI dashboard
```

### Configuration

**Location:** `vitest.config.ts`

```typescript
{
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/test/setup.ts',
  coverage: {
    provider: 'v8',
    thresholds: { lines: 60, functions: 60, branches: 50 }
  }
}
```

### Test Structure

```
src/test/
├── setup.ts              # Global mocks (localStorage, ResizeObserver, etc.)
├── config/
│   ├── testEnv.ts        # Test environment variables
│   └── testClient.ts     # Supabase test client
├── fixtures/
│   └── proposals.ts      # Mock data factories
└── utils/
    ├── renderWithProviders.tsx  # Custom render with QueryClient
    └── *.test.ts         # Unit tests
```

### Test Utilities

```typescript
// Custom render with providers
renderWithProviders(<Component />, { initialRoute: '/path' })

// Mock factories
createMockProposal({ status: 'Won' })
createMockVersionChain('P-1001', 3)

// Test QueryClient (no retries, instant stale)
createTestQueryClient()
```

### Coverage Areas

- Form validation (`validation.test.ts`)
- Number formatting (`numberingConfigService.test.ts`)
- Version grouping (`proposalVersionGrouping.test.ts`)
- Email generation (`emailGeneration.test.ts`)
- Notification service (`scheduledNotificationsService.test.ts`)

---

## Legacy Code

The old quotes system is deprecated in `src/_deprecated/`. Do NOT use:
- `quotesService` → Use `proposalsService`
- `Quote` type → Use `Proposal` type

---

## Branching Strategy

### Current Workflow

- **Development branch:** `feature/form-builder-system` (latest code, active development)
- **Production branch:** `main` (stable, deployed to Vercel)
- **New features:** Branch off `feature/form-builder-system` as `feature/{name}`
- **Hotfixes:** Branch off `main` as `hotfix/{name}` (for production emergencies)

### Rules

- Branch off `feature/form-builder-system` for new feature work
- PRs for features → target `feature/form-builder-system`
- PRs for hotfixes → target `main` (then cherry-pick to dev branch)
- Never commit directly to `main` or `feature/form-builder-system`

### Upcoming

Once form-builder-system is merged to main, the workflow will simplify:
- `main` becomes primary development + production
- All feature branches will target `main` directly
