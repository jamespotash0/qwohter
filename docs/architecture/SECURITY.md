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
| `can_view_membership` | `(user_id uuid, membership_user_id uuid, membership_org_id uuid) → boolean` | Check if user can view another user's membership (same org or self) |

### Cost & Margin Visibility

**There is none, deliberately.** Cost columns live on `order_lines` and are
readable by any active member.

This was originally gated behind a `can_view_cost()` predicate, written in
anticipation of back-office roles (PM, warehouse, installer, AP) and a field app
that would give installers logins. Neither is being built — this is an office
system — so the function was removed rather than left dormant.

The reasoning is worth keeping: **at a dealer, everyone in the office needs
cost.** The AE quotes the job. The designer sees list and discount in the
specification tool before it ever reaches here. The PM reconciles
acknowledgments against cost, which is the entire variance queue. The one group
that should not see it is field crews, and they have no login.

A dormant predicate was worse than none, because its own comment claimed to be
the "single source of truth for buy-side visibility" while nothing enforced it —
and a boundary that exists only in documentation stops people looking for the
real one.

**If a client portal lands,** a customer is not an organization member, so no
membership check can serve them. That needs a view exposing sell-side fields
only, which is a different mechanism entirely.

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
