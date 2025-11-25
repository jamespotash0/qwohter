# Integrations Architecture

## Hybrid Approach: Database Metadata + Code Implementation

### Overview

We use a **hybrid approach** for managing integrations:
- **Metadata** (name, description, logo, etc.) → Database
- **Implementation** (OAuth, API calls, etc.) → Code

This gives us the best of both worlds: flexibility without sacrificing type safety.

---

## Database Tables

### 1. `available_integrations` (Catalog)
**Purpose:** Stores metadata for ALL possible integrations

```sql
- integration_type (unique identifier, e.g., 'quickbooks_online')
- name, description, logo_url
- category ('accounting', 'crm', 'payment')
- is_enabled (global on/off switch)
- required_plan ('Starter', 'Pro', 'Enterprise')
- features (JSONB array)
- coming_soon, is_beta
- display_order
```

**Who manages:** Admin via migrations or future admin panel

**Example:**
```sql
INSERT INTO available_integrations VALUES (
  'stripe',
  'Stripe',
  'Accept payments...',
  '/images/integrations/stripe.png',
  'payment',
  false,  -- Not enabled yet
  'Starter',
  ...
);
```

### 2. `integrations` (Connections)
**Purpose:** Tracks which organizations have which integrations connected

```sql
- organization_id + integration_type (unique pair)
- is_connected (boolean)
- connection_status ('Connected', 'Disconnected', 'Error')
- settings (JSONB)
```

**Who manages:** Auto-populated by database triggers when connections are created

---

## How to Add a New Integration

### Step 1: Add to Database (Metadata)
```sql
INSERT INTO available_integrations (
  integration_type,
  name,
  description,
  logo_url,
  category,
  is_enabled,
  required_plan,
  features,
  display_order
) VALUES (
  'xero',
  'Xero',
  'Connect with Xero accounting...',
  '/images/integrations/xero.png',
  'accounting',
  false,  -- Start disabled
  'Pro',
  '["Create invoices", "Sync customers"]'::jsonb,
  10
);
```

### Step 2: Add to TypeScript Types
```typescript
// lib/types/integrations.ts
export type IntegrationType =
  | 'quickbooks_online'
  | 'quickbooks_desktop'
  | 'xero'  // Add new type
  | 'stripe';
```

### Step 3: Implement Service Layer
```typescript
// services/xeroService.ts
export async function connectXero(organizationId: string) {
  // OAuth implementation
}

export async function createInvoiceInXero(quote: Quote, orgId: string) {
  // Invoice creation logic
}
```

### Step 4: Add Connection Dialog
```typescript
// components/features/integrations/XeroConnectDialog.tsx
export const XeroConnectDialog = ({ ... }) => {
  // OAuth flow UI
};
```

### Step 5: Wire Up in IntegrationsTab
```typescript
// IntegrationsTab.tsx
const handleConnect = async (type: IntegrationType) => {
  if (type === 'xero') {
    setShowXeroDialog(true);
  }
  // ...
};
```

### Step 6: Enable in Database
```sql
UPDATE available_integrations
SET is_enabled = true
WHERE integration_type = 'xero';
```

---

## Benefits of This Approach

### ✅ Easy Management
- Enable/disable integrations without deploy
- Update descriptions, logos, categories via SQL
- Add "coming soon" integrations that show in UI but can't be connected

### ✅ Plan-Based Access Control
```typescript
// Only show integrations available for user's plan
const integrations = await getAvailableIntegrations(organization.plan);
```

### ✅ Category Organization
```sql
SELECT * FROM available_integrations
WHERE category = 'accounting'
ORDER BY display_order;
```

### ✅ Scalability
- Can have 100+ integrations in database
- Only enabled ones show in UI
- Easy to sort, filter, search

### ✅ Still Type-Safe
- TypeScript types for integration_type
- Code implementation required
- Can't "accidentally" add integration without code

---

## API Usage

### Get Available Integrations (with plan filtering)
```typescript
import { getAvailableIntegrations } from '@/services/integrationsService';

// Get all enabled integrations
const allIntegrations = await getAvailableIntegrations();

// Get only integrations available for Pro plan
const proIntegrations = await getAvailableIntegrations('Pro');

// Enterprise sees everything
const enterpriseIntegrations = await getAvailableIntegrations('Enterprise');
```

### Get Organization's Connections
```typescript
import { getIntegrations } from '@/services/integrationsService';

const connections = await getIntegrations(organizationId);
// Returns only integrations THIS organization has connected
```

### Check if Integration is Connected
```typescript
const connected = connections.find(i => i.integration_type === 'quickbooks_online');
if (connected?.is_connected) {
  // QuickBooks Online is connected
}
```

---

## Future Enhancements

### Admin Panel for Managing Integrations
- Enable/disable integrations
- Update metadata (name, description, logo)
- Set plan requirements
- Reorder display
- Mark as beta or coming soon

### Per-Organization Feature Flags
```sql
ALTER TABLE integrations
ADD COLUMN custom_settings JSONB DEFAULT '{}'::jsonb;

-- Example: Allow specific org to access beta integration
UPDATE integrations
SET custom_settings = '{"beta_access": true}'::jsonb
WHERE organization_id = 'special-customer';
```

### Integration Analytics
```sql
-- See which integrations are most popular
SELECT
  integration_type,
  COUNT(*) as connection_count
FROM integrations
WHERE is_connected = true
GROUP BY integration_type
ORDER BY connection_count DESC;
```

---

## Migration Path

### From Hardcoded to Database

**Before (Hardcoded):**
```typescript
export function getAvailableIntegrations() {
  return [
    { type: 'quickbooks_online', name: 'QuickBooks Online', ... },
    { type: 'quickbooks_desktop', name: 'QuickBooks Desktop', ... },
    // ... 20 more hardcoded entries
  ];
}
```

**After (Database):**
```typescript
export async function getAvailableIntegrations(plan?: string) {
  const { data } = await supabase
    .from('available_integrations')
    .select('*')
    .eq('is_enabled', true);
  // Filter by plan, map to expected format
}
```

**Migration Steps:**
1. Run migration to create `available_integrations` table
2. Seed with existing integrations
3. Update service to read from database
4. Update components to await async function
5. Test thoroughly
6. Deploy

---

## Summary

| Aspect | Old (Hardcoded) | New (Database) |
|--------|----------------|----------------|
| **Add integration** | Code deploy | SQL INSERT |
| **Enable/disable** | Code deploy | SQL UPDATE |
| **Plan restrictions** | Manual code | Database query |
| **Scalability** | Hard to manage 20+ | Easy to manage 100+ |
| **Type safety** | ✅ Full | ✅ Still enforced |
| **Flexibility** | ❌ Low | ✅ High |
| **Complexity** | ✅ Simple | ⚠️ Moderate |

**Result:** Better balance of flexibility and maintainability for 20+ integrations.
