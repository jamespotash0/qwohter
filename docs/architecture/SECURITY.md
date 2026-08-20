# Security Architecture

## Row Level Security (RLS)

**All tables have RLS enabled.** This is the primary security mechanism for multi-tenant isolation.

### Core RLS Patterns

```sql
-- Organization isolation (most common)
WHERE organization_id IN (
  SELECT organization_id FROM memberships
  WHERE user_id = auth.uid() AND status = 'Active'
)

-- Role-based access
WHERE has_org_role(auth.uid(), organization_id, ARRAY['Admin', 'Owner'])

-- Self + admin access
WHERE (user_id = auth.uid() OR has_org_role(...))
```

## RLS Helper Functions

**Location:** `supabase/migrations/05_essential_functions.sql`

All functions use `SECURITY DEFINER` and `STABLE` modifiers for RLS policy compatibility.

### Membership Checks

| Function | Signature | Description |
|----------|-----------|-------------|
| `is_active_member` | `(user_id uuid, org_id uuid) → boolean` | Check if user has active membership in organization |
| `has_org_role` | `(user_id uuid, org_id uuid, roles text[]) → boolean` | Check if user has ANY of the specified roles (e.g., `ARRAY['Admin', 'Owner']`) |
| `can_view_cost` | `(user_id uuid, org_id uuid) → boolean` | Whether a user may see cost and margin figures. Single source of truth for buy-side visibility |
| `can_view_membership` | `(user_id uuid, membership_user_id uuid, membership_org_id uuid) → boolean` | Check if user can view another user's membership (same org or self) |

### Cost & Margin Visibility

Buy-side numbers — what the dealer pays a manufacturer — are not visible to
everyone with an account. An installer or warehouse user needs to write receipts
and upload damage photos while never seeing what the product cost.

`can_view_cost(user_id, org_id)` is the single predicate for this. It resolves to
Owner/Admin against the current role vocabulary (Owner, Admin, Member); when
back-office roles land (PM, warehouse, installer, AP) this function is the only
place that changes.

```sql
-- vendor_discounts is margin data: gated on cost visibility, not membership
CREATE POLICY "Cost viewers can view vendor discounts"
  ON public.vendor_discounts FOR SELECT TO authenticated
  USING (public.can_view_cost((SELECT auth.uid()), organization_id));
```

The client mirror is `useCanViewCost(userId, organizationId)`, so the UI hides
cost columns rather than rendering empty ones. It **fails closed**: a failed
permission check returns `false`.

Note that RLS *filters* rather than rejects, so a user without cost visibility
receives an empty discount list, not an error. Callers must treat "no discounts"
as "cannot price" — never as "zero discount".

### Current User Helpers (uses `auth.uid()`)

| Function | Signature | Description |
|----------|-----------|-------------|
| `is_owner_or_admin` | `() → boolean` | Check if current user is Owner or Admin in their org |
| `get_current_user_organization` | `() → uuid` | Get current user's organization ID |
| `get_current_user_role` | `() → text` | Get current user's role ('Owner', 'Admin', 'Member') |
| `user_has_admin_role_in_org` | `(org_id uuid) → boolean` | Check if current user is Admin/Owner in specific org |
| `user_has_role_in_org` | `(org_id uuid, required_role text) → boolean` | Check if current user has exact role in org |

### Multi-Org Helpers

| Function | Signature | Description |
|----------|-----------|-------------|
| `get_user_org_ids` | `(user_id uuid) → TABLE(organization_id uuid)` | Get all organization IDs user belongs to |
| `get_org_member_ids` | `(user_id uuid) → TABLE(user_id uuid)` | Get all member IDs in user's organizations |

### Storage Access

| Function | Signature | Description |
|----------|-----------|-------------|
| `is_org_folder_admin` | `(user_id uuid, folder_name text) → boolean` | Check if user is Admin/Owner for storage bucket folder |
| `get_user_org_folders` | `(user_id uuid) → TABLE(org_folder text)` | Get storage folders user can access (org IDs as text) |

### Subscription Checks

| Function | Signature | Description |
|----------|-----------|-------------|
| `has_valid_subscription` | `(org_id uuid) → boolean` | Check if org has active/trialing subscription |

### Usage Examples

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

## Rate Limiting

**Table:** `auth_rate_limits`
**Functions:** `check_auth_rate_limit()`, `record_auth_attempt()`

| Action | Limit | Block Duration |
|--------|-------|----------------|
| Login | 5 attempts/15 min | 30-min block |
| OTP | 3 attempts/10 min | 60-min block |
| Password reset | 3 attempts/60 min | 120-min block |

## Storage Security

**Function:** `validate_storage_upload()`

- Per-bucket file type and size limits
- No public buckets - always use `createSignedUrl()`
- UUID filenames to prevent enumeration attacks
- Never expose direct storage paths to clients

## Audit Logging

**Table:** `security_audit_log`
**Function:** `log_security_event()`

Logs sensitive operations for compliance and debugging.

## Error Sanitization

**Function:** `sanitize_error_message()`

Prevents information leakage by sanitizing error messages before returning to clients.

## Security Checklist for New Tables

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

## Alternative RLS Patterns

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

## Edge Function Security

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

## Security Best Practices

1. **Never trust client input** - Always validate on server/edge function
2. **Use SECURITY DEFINER sparingly** - Only for privileged operations
3. **Always include `SET search_path = ''`** in SECURITY DEFINER functions
4. **Don't expose internal error messages** - Use `sanitize_error_message()`
5. **Log security events** - Call `log_security_event()` for sensitive operations
6. **Test RLS policies** - Verify users can't access other org's data

## Additional Security Hardening

### Input & API Security
- **Validate all inputs** with Zod in Edge Functions before processing
- **Verify webhook signatures** (Stripe) using `stripe.webhooks.constructEvent()` - return `400` if verification fails
- **Rate limit** mutation endpoints, especially auth and payment routes

### Storage Security
- **No public buckets** - always use `createSignedUrl()` for file retrieval
- **UUID filenames** - rename uploads to `crypto.randomUUID()` to prevent enumeration
- **Never expose direct storage paths** to clients

### Environment Variables
- **Never hardcode secrets** - use `import.meta.env.VITE_*` (client) or Supabase secrets (edge functions)
- **Validate at startup** - fail fast on missing required config

### RPC Function Lockdown
```sql
-- For sensitive Postgres functions, revoke public access:
REVOKE EXECUTE ON FUNCTION function_name FROM public;
REVOKE EXECUTE ON FUNCTION function_name FROM anon;
GRANT EXECUTE ON FUNCTION function_name TO service_role;
```

## Key Files

- `supabase/migrations/05_essential_functions.sql` - RLS helper functions
- `supabase/migrations/20260116000001_security_hardening.sql` - Security functions
- `src/utils/errorSanitizer.ts` - Client-side error sanitization
