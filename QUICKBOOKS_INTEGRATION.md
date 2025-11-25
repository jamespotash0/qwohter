# QuickBooks Integration - Implementation Guide

## Overview

This document describes the complete QuickBooks integration feature that allows users to create invoices directly from quotes in either QuickBooks Online or QuickBooks Desktop.

## Features Implemented

### 1. **Integrations Settings Tab**
- New "Integrations" tab in Settings page
- Displays available integrations as cards with:
  - Integration name and description
  - Connection status (Connected, Disconnected, Error, Connecting)
  - Feature list
  - Connect/Disconnect buttons
  - Last sync timestamp

### 2. **QuickBooks Online Integration**
- OAuth 2.0 authentication flow
- Secure token storage and refresh
- Real-time invoice creation
- Customer and item synchronization
- Cloud-based access

### 3. **QuickBooks Desktop Integration**
- Web Connector setup
- QBXML request/response handling
- Batch processing via queue system
- Local data storage
- .QWC file generation for easy setup

### 4. **Invoice Creation from Quotes**
- "Create Invoice" button in quotes table dropdown menu
- Pre-populated invoice data from quote
- Support for both QB Online and QB Desktop
- Customer memo and private notes
- Invoice status tracking

## Architecture

### Database Schema

#### Tables Created

1. **`integrations`** - General integrations tracking
   - Stores all integration types and their connection status
   - Auto-updated by triggers when QB connections change

2. **`quickbooks_online_connections`**
   - OAuth tokens (access_token, refresh_token)
   - Company information (realm_id, company_name)
   - Token expiration tracking

3. **`quickbooks_online_invoice_sync`**
   - Tracks QB Online invoice sync status
   - Stores QB invoice ID and sync token
   - Error logging

4. **`quickbooks_desktop_connections`** (already existed)
   - Web Connector credentials
   - Company file information
   - Sync frequency settings

5. **`quickbooks_request_queue`** (already existed)
   - Queued QBXML requests for Desktop
   - Priority-based processing
   - Retry logic

6. **`quickbooks_desktop_invoice_sync`** (already existed)
   - Desktop invoice sync tracking
   - QBXML transaction IDs

### Services Layer

#### Core Services

1. **`integrationsService.ts`**
   - CRUD operations for integrations table
   - Get available integrations
   - Get integration card display data
   - Update connection status

2. **`quickbooksOnlineService.ts`**
   - OAuth URL generation
   - OAuth callback handling (via Edge Function)
   - Invoice creation (via Edge Function)
   - Invoice sync status tracking
   - QB Online API data builders

3. **`quickbooksDesktopService.ts`** (enhanced)
   - Web Connector connection management
   - .QWC file generation
   - QBXML queue management
   - Invoice sync tracking

### Frontend Components

#### Settings Components

1. **`IntegrationsTab.tsx`** - Main integrations settings page
   - Displays all available integrations
   - Manages connection state
   - Opens connection dialogs

2. **`IntegrationCard.tsx`** - Reusable integration card
   - Shows integration details
   - Connection status badge
   - Connect/disconnect actions

3. **`QBOnlineConnectDialog.tsx`** - QB Online OAuth flow
   - Opens OAuth popup window
   - Handles OAuth callback via postMessage
   - Shows connection progress

4. **`QBDesktopConnectDialog.tsx`** - QB Desktop setup
   - Two-step wizard (credentials → download)
   - Web Connector configuration form
   - .QWC file download

#### Invoice Components

5. **`CreateInvoiceDialog.tsx`** - Invoice creation dialog
   - Displays quote summary
   - Integration selection (if multiple connected)
   - Customer memo and notes input
   - Success/error handling

### Type Definitions

**`lib/types/integrations.ts`** - Complete TypeScript definitions:
- `Integration` - General integration interface
- `QBOnlineConnection` - Online connection data
- `QBOnlineInvoice` - Online invoice structure
- `QBOnlineCustomer` - Customer data
- `IntegrationCardData` - UI display data
- `InvoiceCreationRequest/Result` - Invoice creation types

## User Flow

### QuickBooks Online Connection

1. User goes to **Settings → Integrations**
2. Clicks **Connect** on "QuickBooks Online" card
3. Dialog opens with connection instructions
4. User clicks **Connect QuickBooks**
5. OAuth popup opens to Intuit's authorization page
6. User authorizes the app in QuickBooks
7. Popup closes, connection is saved
8. Integration card shows "Connected" status

### QuickBooks Desktop Connection

1. User goes to **Settings → Integrations**
2. Clicks **Connect** on "QuickBooks Desktop" card
3. Dialog opens with setup wizard
4. User fills in:
   - Company file name
   - Web Connector username
   - Web Connector password
   - Sync frequency (minutes)
5. User clicks **Next: Download Config**
6. Downloads .QWC file
7. Opens .QWC file (adds to Web Connector)
8. Enters credentials in Web Connector
9. Authorizes in QuickBooks Desktop
10. Web Connector begins syncing automatically

### Creating an Invoice

1. User navigates to **Quotes** page
2. Clicks **⋮** (actions) on a quote row
3. Selects **Create Invoice**
4. Dialog shows:
   - Quote summary (number, customer, project, total)
   - Integration selector (if multiple connected)
   - Customer memo field
   - Private notes field
5. User clicks **Create Invoice**
6. For QB Online:
   - Invoice created immediately
   - Success dialog with link to view in QB
7. For QB Desktop:
   - Invoice queued for next Web Connector sync
   - User sees "queued" message

## Backend Requirements (Not Yet Implemented)

### Supabase Edge Functions Needed

1. **`quickbooks-online-oauth`**
   ```typescript
   // Handles OAuth code exchange
   POST /functions/v1/quickbooks-online-oauth
   Body: { code, realm_id, organization_id }
   Returns: { connection }
   ```

2. **`quickbooks-online-create-invoice`**
   ```typescript
   // Creates invoice in QB Online
   POST /functions/v1/quickbooks-online-create-invoice
   Body: { quote_id, organization_id, options }
   Returns: { invoice, invoice_url }
   ```

3. **`quickbooks-web-connector`** (already exists)
   ```typescript
   // SOAP endpoint for QB Desktop Web Connector
   POST /functions/v1/quickbooks-web-connector
   ```

4. **`quickbooks-desktop-handler`** (already exists)
   ```typescript
   // Handles Desktop connection creation
   POST /functions/v1/quickbooks-desktop-handler
   Body: { organization_id, company_file_name, username, password }
   Returns: { connection }
   ```

### Environment Variables Required

```bash
# QuickBooks Online OAuth
VITE_QB_CLIENT_ID=your_qb_client_id
VITE_QB_CLIENT_SECRET=your_qb_client_secret  # Server-side only
VITE_QB_REDIRECT_URI=https://yourdomain.com/oauth/callback

# Supabase (already configured)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Security Considerations

### Implemented

1. **Row Level Security (RLS)**
   - All tables have RLS enabled
   - Users can only access their organization's data
   - Owner/Admin roles required for connection management

2. **Data Encryption**
   - OAuth tokens stored in database (should be encrypted at rest)
   - Passwords hashed before storage (Desktop)

3. **Permission Checks**
   - Integration settings require Admin/Owner role
   - Invoice creation available to all active members

### Recommendations

1. **Token Encryption**: Encrypt OAuth tokens in database using Supabase Vault
2. **Token Rotation**: Implement automatic refresh token rotation
3. **API Rate Limiting**: Add rate limits for invoice creation
4. **Audit Logging**: Log all invoice creation attempts
5. **OAuth State Validation**: Validate OAuth state parameter to prevent CSRF

## Testing Checklist

### QuickBooks Online

- [ ] OAuth connection flow completes successfully
- [ ] Token refresh works when expired
- [ ] Invoice creation populates all fields correctly
- [ ] Customer is created if doesn't exist
- [ ] Line items map correctly (materials, labor, discounts)
- [ ] Invoice appears in QuickBooks Online
- [ ] Disconnect removes access tokens
- [ ] Error handling for invalid tokens

### QuickBooks Desktop

- [ ] .QWC file downloads correctly
- [ ] Web Connector connects successfully
- [ ] Invoice requests are queued
- [ ] Web Connector processes queue
- [ ] Invoices appear in QuickBooks Desktop
- [ ] QBXML responses are parsed correctly
- [ ] Error handling for QB connection issues

### UI/UX

- [ ] Integrations tab loads without errors
- [ ] Integration cards display correctly
- [ ] Connection status updates in real-time
- [ ] OAuth popup doesn't get blocked
- [ ] Create Invoice dialog validates inputs
- [ ] Success/error messages are clear
- [ ] Loading states show appropriately

## Migration Instructions

### Database Migration

Run the migration file:
```bash
# Apply QuickBooks Online schema
psql -h your-db-host -U postgres -d your-db-name -f supabase/migrations/20251125000001_add_quickbooks_online.sql
```

Or through Supabase Dashboard:
1. Go to Database → Migrations
2. Upload `20251125000001_add_quickbooks_online.sql`
3. Run migration

### Deployment Steps

1. **Merge feature branch**
   ```bash
   git checkout main
   git merge feature/integration/quickbooks
   ```

2. **Deploy database migration**
   - Migration will run automatically on Vercel deployment
   - Or run manually in Supabase Dashboard

3. **Set environment variables**
   - Add QB credentials to Vercel environment variables
   - Redeploy to apply changes

4. **Deploy Edge Functions**
   - Create OAuth handler Edge Function
   - Create invoice creation Edge Function
   - Test endpoints

5. **Create integration assets**
   - Add QB Online logo: `public/integrations/quickbooks-online.svg`
   - Add QB Desktop logo: `public/integrations/quickbooks-desktop.svg`

## Future Enhancements

### Phase 2 Features

1. **Bi-directional Sync**
   - Import invoices from QuickBooks
   - Update quotes when invoices change
   - Customer sync from QB to app

2. **Additional Integrations**
   - Xero accounting
   - FreshBooks
   - Wave accounting
   - Stripe payment links

3. **Advanced Features**
   - Batch invoice creation
   - Recurring invoices
   - Payment tracking
   - Invoice templates customization

4. **Reporting**
   - Invoice creation analytics
   - Sync health monitoring
   - Integration usage dashboard

## File Structure

```
src/
├── components/features/
│   ├── integrations/
│   │   ├── IntegrationCard.tsx
│   │   ├── QBOnlineConnectDialog.tsx
│   │   ├── QBDesktopConnectDialog.tsx
│   │   └── CreateInvoiceDialog.tsx
│   └── settings/
│       └── IntegrationsTab.tsx
├── lib/
│   └── types/
│       └── integrations.ts
├── services/
│   ├── integrationsService.ts
│   ├── quickbooksOnlineService.ts
│   └── quickbooksDesktopService.ts (enhanced)
└── pages/
    ├── Settings.tsx (updated)
    └── Quotes.tsx (updated)

supabase/migrations/
└── 20251125000001_add_quickbooks_online.sql
```

## Support & Troubleshooting

### Common Issues

**OAuth popup blocked**
- Solution: Allow popups for your domain
- Alternative: Use redirect flow instead of popup

**Web Connector won't connect**
- Check company file name matches exactly
- Verify QuickBooks Desktop is running
- Ensure .QWC file was installed correctly
- Check username/password in Web Connector

**Invoice not appearing**
- Check sync status in invoice_sync table
- For Desktop: Wait for next Web Connector sync
- For Online: Check OAuth token validity

**Token expired errors**
- Implement automatic token refresh
- User may need to reconnect

## Contact & Support

For issues or questions:
- Check CLAUDE.md for coding standards
- Review this documentation
- Check Supabase logs for errors
- Test Edge Functions individually

---

**Created:** November 25, 2024
**Branch:** `feature/integration/quickbooks`
**Status:** Ready for testing and Edge Function implementation
