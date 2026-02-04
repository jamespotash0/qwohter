# Google Integration

> **Location:** `src/services/googleDocsIntegrationService.ts`, `supabase/functions/`

## Overview

Google Docs integration enables professional document generation from proposal data. One admin connects Google for the entire organization.

## OAuth Flow

```
1. Admin clicks "Connect Google" → getGoogleAuthUrl()
2. Generates secure URL with state nonce
3. User authorizes in Google consent screen
4. Callback → google-oauth-callback edge function
5. Exchanges code for tokens
6. Tokens stored in google_oauth_tokens table
7. Organization marked as connected
```

## Token Storage

**Table:** `google_oauth_tokens`

```typescript
interface GoogleOAuthToken {
  id: string;
  organization_id: string;          // One per org, not per user
  access_token: string;             // Encrypted
  refresh_token: string;            // Encrypted
  expires_at: string;
  scope: string;
  created_at: string;
  updated_at: string;
}
```

### Token Refresh

- Tokens auto-refresh 5 minutes before expiry
- Refresh handled in edge functions before API calls
- If refresh fails, user must reconnect

## Google Docs Features

### Template Variables

Variables in Google Docs templates are replaced with proposal data:

**Client & Project:**
```
{{project.name}}
{{client.name}}
{{client.company}}
{{client.email}}
{{job.location}}
{{job.address}}
```

**Organization:**
```
{{org.name}}
{{org.phone}}
{{org.address}}
{{org.website}}
{{org.logo}}                        // Inserts image
```

**Pricing:**
```
{{pricing.subtotal}}
{{pricing.markup}}
{{pricing.tax}}
{{pricing.total}}
{{pricing.totalSellingPrice}}
{{pricing.materials.sellingPrice}}
{{pricing.labor.sellingPrice}}
```

**Products:**
```
{{product.1.name}}
{{product.1.Manufacturer}}
{{product.1.Series}}
{{product.1.quantity}}
{{product.2.name}}                  // Second product
```

**Signature:**
```
{{SIGNATURE_BLOCK}}                 // Placeholder for e-signature
```

### Dynamic Tables

For repeating data (line items, products), use row markers:

```
{{#ROW:tableId}}                    // Start row template
{{item.description}}
{{item.quantity}}
{{item.price}}
{{/ROW}}                            // End row template
```

The edge function duplicates the row for each item.

### Block Markers (Paragraph Loops per Product Type)

For prose/paragraph content that varies by wall or product type, use block markers.
Each product's `productDomain` (e.g., "Operable Wall", "Accordion Partition") determines
which `#TYPE` template gets rendered.

**Template syntax:**
```
{{#BLOCK:walls}}

{{#TYPE:operable wall}}
OPERABLE PANELS:
This wall system utilizes {{wall.Manufacturer}} {{wall.Series}} {{wall.Model}}
configured with panels designed for use with a {{wall.trackLayout}}. The wall
stands {{wall.Height}} in height, each panel nominally {{wall.Thickness}} thick,
finished in {{wall.Finish}}.
{{/TYPE:operable wall}}

{{#TYPE:accordion}}
ACCORDION PANELS:
This accordion wall system utilizes {{wall.Manufacturer}} {{wall.Series}} panels
in a continuous folding configuration. The wall stands {{wall.Height}} in height
with panels finished in {{wall.Finish}}.
{{/TYPE:accordion}}

{{/BLOCK:walls}}
```

**How it works:**
- `{{#BLOCK:walls}}` / `{{/BLOCK}}` wraps the entire block section
- `{{#TYPE:name}}` / `{{/TYPE:name}}` defines a paragraph template for a product type
- `{{wall.*}}` variables resolve to the current product's data (per-product, not global)
- Type matching uses case-insensitive contains: `accordion` matches `Accordion Partition`
- If a product has no matching TYPE block, it is skipped
- If no products match a TYPE block, that block is removed entirely
- Multiple products of the same type each get their own resolved paragraph

**Available `{{wall.*}}` variables:**

| Variable | Source |
|----------|--------|
| `{{wall.name}}` | Product name |
| `{{wall.alias}}` | Product alias |
| `{{wall.Manufacturer}}` | rawData.manufacturer |
| `{{wall.Series}}` | rawData.series |
| `{{wall.Model}}` | rawData.model |
| `{{wall.Height}}` | rawData.dimensions.height |
| `{{wall.Width}}` | rawData.dimensions.width |
| `{{wall.Length}}` | rawData.dimensions.length |
| `{{wall.Thickness}}` | rawData.dimensions.thickness |
| `{{wall.STC}}` | rawData.performanceRatings.stc |
| `{{wall.Fire_Rating}}` | rawData.performanceRatings.fireRating |
| `{{wall.Finish}}` | rawData.appearance.finish |
| `{{wall.Color}}` | rawData.appearance.color |
| `{{wall.Core}}` | rawData.materials.core |
| `{{wall.Face}}` | rawData.materials.face |
| `{{wall.Frame}}` | rawData.materials.frame |
| `{{wall.Certifications}}` | rawData.certifications (comma-separated) |
| `{{wall.<specKey>}}` | Any key from rawData.specifications JSONB |

Custom fields stored in `rawData.specifications` (e.g., `trackLayout`, `panelType`, `insulation`) are automatically available as `{{wall.<keyName>}}`.

### Document Modes

| Mode | Description |
|------|-------------|
| `create` | Create new document from template |
| `overwrite` | Replace existing document content |
| `update` | Update variables, preserve manual edits |

## Edge Functions

| Function | Purpose |
|----------|---------|
| `generate-google-doc` | Create/update docs from templates |
| `google-oauth-callback` | Handle OAuth code exchange |
| `google-disconnect` | Revoke tokens, delete from DB |
| `check-google-doc` | Verify document exists and accessible |
| `google-list-drive-files` | List files for template picker |
| `google-risc-receiver` | Handle Google security events (RISC) |

### Generate Document

```typescript
const { data } = await supabase.functions.invoke('generate-google-doc', {
  body: {
    organizationId,
    proposalId,
    templateId: 'google-doc-id',
    mode: 'create',                 // or 'overwrite', 'update'
    folderId: 'optional-folder-id'
  }
});

// Returns
{
  documentId: 'new-doc-id',
  documentUrl: 'https://docs.google.com/...'
}
```

## RISC (Cross-Account Protection)

**Location:** `supabase/functions/google-risc-receiver/`

Google sends security events when:
- User revokes access
- Account is compromised
- Tokens are invalidated

Handler automatically disconnects affected organizations.

See `docs/guides/GOOGLE_RISC_SETUP.md` for configuration.

## React Query Hooks

**Location:** `src/hooks/queries/useGoogleDocs.ts`

| Hook | Purpose |
|------|---------|
| `useGoogleConnection(orgId)` | Check if connected |
| `useConnectGoogle()` | Initiate OAuth flow |
| `useDisconnectGoogle()` | Revoke connection |
| `useGenerateGoogleDoc()` | Generate document mutation |
| `useCheckGoogleDoc(docId)` | Verify doc accessible |
| `useDriveFiles(orgId)` | List Drive files |
| `useDriveFolders(orgId)` | List Drive folders |

## Template Picker

UI for selecting Google Docs templates:

```typescript
const { data: files } = useDriveFiles(organizationId, {
  mimeType: 'application/vnd.google-apps.document',
  folderId: selectedFolderId
});
```

## Key Files

- `src/services/googleDocsIntegrationService.ts` - Client-side service
- `src/hooks/queries/useGoogleDocs.ts` - React Query hooks
- `supabase/functions/generate-google-doc/` - Document generation
- `supabase/functions/google-oauth-callback/` - OAuth handler
- `supabase/functions/google-disconnect/` - Disconnect handler
- `supabase/functions/google-risc-receiver/` - Security events
- `docs/guides/GOOGLE_RISC_SETUP.md` - RISC configuration guide
