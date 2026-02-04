# Permissions Bitmask & JWT Claims Plan

## Overview

Replace per-request database queries for role/permission checks with a **bitmask stored in JWT custom claims**. Role changes are infrequent, so the staleness trade-off is acceptable.

**Status:** Not implemented — research/planning phase

---

## Problem

Current RLS helpers (`is_active_member()`, `has_org_role()`) query `organization_members` on every request. This adds latency to every authenticated operation.

---

## Proposed Approach: JWT + Bitmask

Embed a permissions bitmask in `app_metadata` on the JWT token. RLS policies read `auth.jwt()` instead of joining tables.

### Permission Definitions

```typescript
const Permissions = {
  VIEW_PROPOSALS:    1 << 0,  // 1
  EDIT_PROPOSALS:    1 << 1,  // 2
  DELETE_PROPOSALS:  1 << 2,  // 4
  MANAGE_MEMBERS:    1 << 3,  // 8
  MANAGE_BILLING:    1 << 4,  // 16
  MANAGE_SETTINGS:   1 << 5,  // 32
  // Add more as needed (up to ~30 safely in JS)
} as const;

const Roles = {
  Viewer: Permissions.VIEW_PROPOSALS,
  Editor: Permissions.VIEW_PROPOSALS | Permissions.EDIT_PROPOSALS,
  Admin:  0b111111, // all bits
  Owner:  0b111111,
} as const;
```

### Client-Side Hook

```typescript
function useHasPermission(required: number): boolean {
  const { session } = useAuth();
  const mask = session?.user?.app_metadata?.permissions ?? 0;
  return (mask & required) === required;
}
```

### RLS Policy Example

```sql
-- No table join needed
CREATE POLICY "can_edit_proposals" ON proposals
  FOR UPDATE USING (
    ((auth.jwt()->'app_metadata'->>'permissions')::int & 2) = 2
  );
```

### Sync Trigger

```sql
CREATE OR REPLACE FUNCTION sync_permissions_to_jwt()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data ||
    jsonb_build_object(
      'permissions', NEW.permissions_mask,
      'org_id', NEW.organization_id
    )
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_member_role_change
  AFTER INSERT OR UPDATE OF permissions_mask ON organization_members
  FOR EACH ROW EXECUTE FUNCTION sync_permissions_to_jwt();
```

---

## Staleness Mitigation

- Call `supabase.auth.refreshSession()` immediately after any role change on the client
- Default Supabase JWT expiry is ~1hr; permissions update on next refresh regardless
- Role changes are rare — acceptable trade-off

---

## Trade-offs

| Approach | DB Queries | Granularity | Staleness | Complexity |
|----------|-----------|-------------|-----------|------------|
| Current (RLS helpers) | Every request | Role-level | None | Low |
| JWT claims (role string) | None | Role-level | Until token refresh | Low |
| **JWT + bitmask** | **None** | **Per-permission** | **Until token refresh** | **Medium** |
| DB bitmask column only | 1 (simpler join) | Per-permission | None | Low |

---

## Open Questions

- [ ] Define the full permission set needed across all features
- [ ] Decide whether to keep role-level RLS helpers as a fallback
- [ ] Determine if any policies require real-time accuracy (no staleness)
- [ ] Migration path for existing `organization_members` rows
- [ ] Audit all current RLS policies that would need updating
