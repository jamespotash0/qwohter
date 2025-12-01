# QuickBooks Desktop - Edge Functions Implementation

## What Changed

We've migrated from a **separate Node.js backend** to **Supabase Edge Functions**. Here's why this is better:

### ❌ Old Approach (Separate Backend)
```
Your Vite App → Separate Node.js Server → Supabase
                    ↑
            QB Web Connector polls this

Problems:
- Need to deploy separate backend (Railway/DigitalOcean/etc.)
- Manage environment variables manually
- Service role key exposed in hosting environment
- Extra $5-10/month hosting cost
- More moving parts to maintain
```

### ✅ New Approach (Edge Functions)
```
Your Vite App → Supabase Edge Functions → Supabase Database
                        ↑
                QB Web Connector polls this

Benefits:
- No separate hosting needed
- Service role key secured by Supabase
- Free tier: 500k invocations/month
- Single platform for everything
- Easier to deploy and maintain
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  User's Computer                                        │
│  ┌──────────────────┐    ┌──────────────────────────┐  │
│  │ QuickBooks       │    │ QB Web Connector         │  │
│  │ Desktop          │◄───┤ (Polls every 15 min)     │  │
│  └──────────────────┘    └──────────────────────────┘  │
└────────────────────────────────────┬────────────────────┘
                                     │ HTTPS
                                     ↓
┌──────────────────────────────────────────────────────────┐
│  Supabase Platform                                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Edge Function: quickbooks-web-connector                  │  │
│  │  - Handles SOAP requests                          │  │
│  │  - Authenticates Web Connector                    │  │
│  │  - Manages request/response queue                 │  │
│  │  - Has service role key access (secure)           │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                               │
│                          ↓                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                              │  │
│  │  - quickbooks_desktop_connections                 │  │
│  │  - quickbooks_request_queue                       │  │
│  │  - quickbooks_desktop_invoice_sync                │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↑                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Edge Function: quickbooks-desktop-handler                  │  │
│  │  - Creates connections                            │  │
│  │  - Hashes passwords (bcrypt)                      │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↑                               │
└──────────────────────────┬───────────────────────────────┘
                           │ HTTPS
                           │
┌──────────────────────────┴───────────────────────────────┐
│  Your Vite Frontend                                      │
│  - Settings UI                                           │
│  - Create invoices from quotes                           │
│  - Download .QWC files                                   │
│  - Uses anon key (secure, RLS-protected)                 │
└──────────────────────────────────────────────────────────┘
```

## Files Created

### Edge Functions (Deno/TypeScript)
```
supabase/functions/
├── quickbooks-web-connector/
│   └── index.ts          # Handles SOAP from Web Connector
├── quickbooks-desktop-handler/
│   └── index.ts          # Creates connections with hashed passwords
└── README.md             # Deployment guide
```

### Frontend Service (React/TypeScript)
```
src/services/
└── quickbooksDesktopService.ts  # Calls Edge Functions

src/lib/qbxml/
└── generators.ts                 # Converts quotes to QBXML

src/components/features/settings/
└── QuickBooksDesktopIntegration.tsx  # Settings UI
```

### Database Migration
```
supabase/migrations/
└── 20251117000001_add_quickbooks_desktop.sql
```

## How It Works

### 1. User Setup (One-time)
```typescript
// User goes to Settings → Integrations
// Fills in company name, username, password

// Frontend calls Edge Function:
await supabase.functions.invoke('quickbooks-desktop-handler', {
  body: {
    organization_id: 'uuid',
    company_file_name: 'Dad\'s Company',
    username: 'qwohter_user',
    password: 'secure_password'
  }
});

// Edge Function:
// 1. Hashes password with bcrypt
// 2. Stores in quickbooks_desktop_connections table
// 3. Returns connection (without password)
```

### 2. Download .QWC File
```typescript
// User clicks "Download .QWC"

// Frontend generates .QWC XML pointing to:
const url = `${SUPABASE_URL}/functions/v1/quickbooks-web-connector`;

// User downloads file and opens in QB Web Connector
```

### 3. Web Connector Authentication
```
QB Web Connector polls Edge Function every 15 minutes:

1. authenticate → Edge Function checks username/password
2. sendRequestXML → Edge Function returns QBXML from queue
3. receiveResponseXML → Edge Function processes response
4. closeConnection → Edge Function closes session
```

### 4. Create Invoice
```typescript
// User marks quote as "Won", clicks "Send to QB"

// Frontend adds to request queue:
await supabase
  .from('quickbooks_request_queue')
  .insert({
    organization_id: 'uuid',
    request_type: 'InvoiceAdd',
    qbxml_request: generateInvoiceQBXML(quote),
    source_record_id: quote.id
  });

// Next Web Connector poll:
// 1. Edge Function sends QBXML to Web Connector
// 2. Web Connector creates invoice in QB Desktop
// 3. Web Connector sends response back
// 4. Edge Function updates sync status
```

## Deployment Steps

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Login and Link
```bash
supabase login
supabase link --project-ref your-project-ref
```

### 3. Deploy Functions
```bash
supabase functions deploy quickbooks-web-connector
supabase functions deploy quickbooks-desktop-handler
```

### 4. Run Migration
```bash
npx supabase db push
```

### 5. Test
```bash
# Health check
curl https://your-project.supabase.co/functions/v1/quickbooks-web-connector

# Should return: {"status":"OK","activeSessions":0}
```

## Security

### ✅ What's Secure

1. **Service Role Key**: Never exposed to frontend, only in Edge Functions
2. **Password Hashing**: Bcrypt with salt, stored securely
3. **RLS Policies**: Database access controlled per organization
4. **HTTPS**: All communication encrypted
5. **Supabase Secrets**: Environment variables managed by Supabase

### ⚠️ Important Notes

- Edge Functions run on Supabase's servers (not in browser)
- Service role key bypasses RLS (only for Edge Functions)
- Frontend still uses anon key with RLS protection
- Each organization has isolated data via RLS

## Cost Breakdown

### Supabase Edge Functions
- **Free Tier**: 500,000 invocations/month
- **Pro Tier**: 2,000,000 invocations/month

### Typical Usage (per organization)
- Sync every 15 minutes = 96 times/day
- 96 × 30 days = **2,880 invocations/month**
- **10 organizations** = 28,800 invocations/month
- **Well within free tier**

### vs. Separate Backend
- Railway/DigitalOcean: $5-10/month
- Always-on server required
- Manual scaling
- **Edge Functions: FREE**

## Monitoring

### View Logs
```bash
# Real-time
supabase functions logs quickbooks-web-connector --follow

# Recent
supabase functions logs quickbooks-web-connector --limit 100
```

### Check Database
```sql
-- Recent sessions
SELECT * FROM quickbooks_desktop_session_logs
ORDER BY created_at DESC LIMIT 10;

-- Pending invoices
SELECT * FROM quickbooks_desktop_invoice_sync
WHERE sync_status = 'pending';
```

### Supabase Dashboard
1. Go to Edge Functions section
2. View invocations, errors, logs
3. Monitor performance metrics

## Troubleshooting

### "Function not found"
```bash
# List deployed functions
supabase functions list

# Should show:
# - quickbooks-web-connector
# - quickbooks-desktop-handler
```

### "Authentication failed"
- Check `quickbooks_desktop_connections` table
- Verify username matches .QWC file
- Password is hashed, not plain text

### "No pending requests"
- Check `quickbooks_request_queue` table
- Verify requests have status='pending'
- Check organization_id matches

### CORS issues
- Both Edge Functions include CORS headers
- Verify Web Connector using correct URL
- Check Supabase logs for errors

## Next Steps

1. ✅ Edge Functions created
2. ✅ Frontend service updated
3. ✅ Database schema ready
4. ⏳ Deploy: `supabase functions deploy`
5. ⏳ Migrate DB: `npx supabase db push`
6. ⏳ Test with QB Desktop
7. ⏳ Customize item/customer mapping

You're ready to go! 🚀
