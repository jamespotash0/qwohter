# Client Portal & E-Signature Feature Plan

## Overview

This feature has **TWO STAGES** with distinct purposes:

### Stage 1: Proposal Signing (Pre-Win)
E-signature functionality for proposals **without** requiring a client portal. Clients can sign proposals via:
- **Signing Link**: `/sign/:token` - lightweight page to view PDF and sign
- **Downloaded PDF**: Manual external sending (signature added when returned)

### Stage 2: Client Portal (Post-Win)
Full-featured portal created **only after a proposal is Won**. Includes:
- Project messaging (iMessage-style chat)
- Payment collection (Stripe)
- Document management
- Change orders / revisions

---

## Stage 1: Proposal Signing System

### User Requirements
- **Send for Signature**: Generate PDF from Google Doc, create signing link
- **Download PDF**: Export proposal as PDF for external sending
- **E-Signature**: Draw or type signature, embedded into PDF
- **Tracking**: Know when proposal was viewed, signed
- **Compliance**: Signer name, date, timestamp, IP address logged

### Signing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROPOSAL SIGNING FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User clicks "Send for Signature" or "Download PDF"          │
│                          │                                       │
│                          ▼                                       │
│  2. export-proposal-pdf (Edge Function)                         │
│     - Takes Google Doc ID                                        │
│     - Exports as PDF via Google Drive API                       │
│     - Stores unsigned PDF in Supabase Storage                   │
│     - Returns PDF URL                                            │
│                          │                                       │
│                          ▼                                       │
│  3a. Download PDF        OR    3b. Create signing link          │
│      (manual flow)             - Generate secure token           │
│                                - Store in proposal_signing_tokens│
│                                - Send email with link            │
│                                       │                          │
│                                       ▼                          │
│                          4. Client opens /sign/:token            │
│                             - Views PDF in browser               │
│                             - Draws or types signature           │
│                                       │                          │
│                                       ▼                          │
│                          5. submit-signature (Edge Function)     │
│                             - Receives signature PNG (base64)    │
│                             - Loads unsigned PDF                 │
│                             - Uses pdf-lib to embed signature    │
│                             - Adds signer name, date, timestamp  │
│                             - Stores signed PDF in Storage       │
│                             - Updates proposal status → Won      │
│                                       │                          │
│                                       ▼                          │
│                          6. Both parties notified via email      │
│                             - Signed PDF attached                │
└─────────────────────────────────────────────────────────────────┘
```

### Signature Block Embedded in PDF

```
┌─────────────────────────────────────────────────────────────────┐
│  ACCEPTANCE & SIGNATURE                                          │
│                                                                  │
│  By signing below, I accept this proposal and agree to the      │
│  terms and conditions stated herein.                            │
│                                                                  │
│  Signature: ═══════════════════════════                         │
│                 [signature image here]                          │
│                                                                  │
│  Name: John Smith                                                │
│  Date: January 7, 2026 at 2:34 PM EST                           │
│                                                                  │
│  ───────────────────────────────────────────────────────────────│
│  Signed electronically via WallQu                                │
│  IP: 192.168.1.1 | Document ID: abc123                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stage 2: Client Portal (Post-Win Only)

### User Requirements
- **Access**: Secure link per project (no client login required)
- **Messages**: Chat sidebar tied to portal (iMessage-style, can reference proposals)
- **Payments**: Stripe integration - full, deposit, or custom amounts
- **Documents**: View signed proposals, change orders
- **Notifications**: Full tracking - viewed, message sent, payment made

### Portal Structure (Stage 2)
```
/portal/:token
├── Documents Tab      → View signed proposals, change orders
├── Messages Sidebar   → Chat with org (iMessage-style)
└── Payments Tab       → Pay deposit/full/custom via Stripe
```

---

## Pages Being Created

### Public Pages (No Auth)
| Route | Page | Description |
|-------|------|-------------|
| `/sign/:token` | `ProposalSigningPage.tsx` | **Stage 1** - View PDF and sign |
| `/portal/:token` | `ClientPortalPage.tsx` | **Stage 2** - Full portal (post-win) |

### Internal Pages (Authenticated)
| Route | Component | Description |
|-------|-----------|-------------|
| - | `SendForSignatureDialog.tsx` | Send proposal for e-signature |
| - | `CreatePortalDialog.tsx` | Create portal for won project |
| - | `SigningActivityPanel.tsx` | View signing status, activity |

---

## Database Schema

### Stage 1 Tables (Proposal Signing)

**1. `proposal_signing_tokens`** - Secure tokens for signing links
```sql
CREATE TABLE proposal_signing_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  proposal_id uuid NOT NULL REFERENCES proposals(id),

  -- Secure access
  access_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Client info (who should sign)
  client_email text NOT NULL,
  client_name text,
  client_company text,

  -- Status
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'viewed', 'signed', 'expired', 'revoked')),

  -- PDF references
  unsigned_pdf_url text,        -- URL to unsigned PDF in storage
  unsigned_pdf_path text,       -- Storage path: {org_id}/proposals/{proposal_id}/unsigned.pdf

  -- Tracking
  sent_at timestamptz DEFAULT now(),
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  signed_at timestamptz,
  expires_at timestamptz,       -- Optional expiration

  -- Audit
  sent_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_signing_tokens_token ON proposal_signing_tokens(access_token);
CREATE INDEX idx_signing_tokens_proposal ON proposal_signing_tokens(proposal_id);
```

**2. `proposal_signatures`** - E-signature records
```sql
CREATE TABLE proposal_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  proposal_id uuid NOT NULL REFERENCES proposals(id),
  signing_token_id uuid REFERENCES proposal_signing_tokens(id),
  portal_id uuid REFERENCES client_portals(id),  -- NULL if via signing token

  -- Signer info
  signer_name text NOT NULL,
  signer_email text NOT NULL,
  signer_company text,

  -- Signature data
  signature_type text NOT NULL CHECK (signature_type IN ('draw', 'type')),
  signature_data text NOT NULL,  -- Base64 PNG for draw, styled text for type
  signature_font text,           -- Font name for typed signatures

  -- Signed document
  signed_pdf_url text,           -- Public URL to signed PDF
  signed_pdf_path text,          -- Storage path: {org_id}/proposals/{proposal_id}/signed.pdf

  -- Compliance / Audit trail
  signed_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_signatures_proposal ON proposal_signatures(proposal_id);
```

**3. `proposal_signing_activity`** - Activity log
```sql
CREATE TABLE proposal_signing_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  proposal_id uuid NOT NULL REFERENCES proposals(id),
  signing_token_id uuid REFERENCES proposal_signing_tokens(id),

  -- Event types: 'sent', 'viewed', 'signed', 'downloaded', 'reminder_sent', 'expired', 'revoked'
  event_type text NOT NULL,
  event_data jsonb,
  ip_address text,
  user_agent text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_signing_activity_proposal ON proposal_signing_activity(proposal_id);
```

### Stage 2 Tables (Client Portal - Post-Win)

**4. `client_portals`** - One portal per won project
```sql
CREATE TABLE client_portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),

  -- Secure access
  access_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Project info (created after proposal is Won)
  project_name text NOT NULL,
  project_id uuid REFERENCES projects(id),
  original_proposal_id uuid REFERENCES proposals(id),  -- The signed proposal

  -- Client info
  client_email text NOT NULL,
  client_name text,
  client_company text,

  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),

  -- Tracking
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  expires_at timestamptz,

  -- Audit
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_portals_token ON client_portals(access_token);
CREATE INDEX idx_portals_project ON client_portals(project_id);
```

**5. `portal_messages`** - Chat messages (iMessage-style)
```sql
CREATE TABLE portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid NOT NULL REFERENCES client_portals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id),

  content text NOT NULL,

  -- Sender
  is_client_message boolean NOT NULL DEFAULT false,
  client_name text,
  user_id uuid REFERENCES profiles(id),

  -- Read tracking
  read_at timestamptz,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_portal_messages_portal ON portal_messages(portal_id);
```

**6. `portal_payments`** - Stripe payments
```sql
CREATE TABLE portal_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid NOT NULL REFERENCES client_portals(id),
  proposal_id uuid REFERENCES proposals(id),  -- Optional link to specific proposal
  organization_id uuid NOT NULL REFERENCES organizations(id),

  -- Stripe IDs
  stripe_payment_intent_id text UNIQUE,
  stripe_customer_id text,

  -- Amount
  amount_cents integer NOT NULL,
  currency text DEFAULT 'usd',

  -- Payment type
  payment_type text NOT NULL CHECK (payment_type IN ('full', 'deposit', 'custom')),
  deposit_percentage integer,  -- If deposit (e.g., 50)

  -- Status
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),

  -- Details
  description text,
  payer_name text,
  payer_email text,

  -- Timestamps
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

**6. `portal_activity`** - Activity log for tracking
```sql
CREATE TABLE portal_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid NOT NULL REFERENCES client_portals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id),

  event_type text NOT NULL,  -- viewed, message_sent, proposal_signed, payment_made, etc.
  event_data jsonb,
  ip_address text,

  created_at timestamptz DEFAULT now()
);
```

### Migration Files
- `supabase/migrations/20260107_01_create_client_portals.sql`
- `supabase/migrations/20260107_02_create_portal_proposals.sql`
- `supabase/migrations/20260107_03_create_portal_messages.sql`
- `supabase/migrations/20260107_04_create_proposal_signatures.sql`
- `supabase/migrations/20260107_05_create_portal_payments.sql`
- `supabase/migrations/20260107_06_create_portal_activity.sql`
- `supabase/migrations/20260107_07_client_portal_rls.sql`

---

## Edge Functions

### Stage 1: Proposal Signing Functions
| Function | Purpose | Auth |
|----------|---------|------|
| `export-proposal-pdf` | Export Google Doc to PDF, store in Supabase | Authenticated |
| `send-for-signature` | Create signing token, send email with link | Authenticated |
| `get-signing-data` | Fetch unsigned PDF + proposal info | Public (token) |
| `submit-signature` | Embed signature in PDF, save, email both | Public (token) |
| `track-signing-view` | Record view event, notify org | Public (token) |
| `send-signing-reminder` | Resend signing link email | Authenticated |

### Stage 2: Client Portal Functions
| Function | Purpose | Auth |
|----------|---------|------|
| `create-client-portal` | Create portal for won project | Authenticated |
| `get-portal-data` | Fetch portal + documents | Public (token) |
| `submit-portal-message` | Add message to chat | Public (token) |

### Stripe Connect Functions (Stage 2)
| Function | Purpose | Auth |
|----------|---------|------|
| `create-stripe-connect-link` | Generate onboarding URL for org | Authenticated |
| `stripe-connect-webhook` | Handle account.updated events | Stripe signature |
| `create-payment-intent` | Create payment with destination charge | Public (token) |
| `portal-payment-webhook` | Handle payment succeeded/failed | Stripe signature |

### Files to Create
```
supabase/functions/
│
│ # Stage 1: Proposal Signing
├── export-proposal-pdf/index.ts      # Export Google Doc → PDF
├── send-for-signature/index.ts       # Create token, send email
├── get-signing-data/index.ts         # Fetch PDF + info for signing page
├── submit-signature/index.ts         # Embed signature, update status
├── track-signing-view/index.ts       # Record view event
├── send-signing-reminder/index.ts    # Resend email
│
│ # Stage 2: Client Portal
├── create-client-portal/index.ts
├── get-portal-data/index.ts
├── submit-portal-message/index.ts
│
│ # Stripe Connect (Stage 2)
├── create-stripe-connect-link/index.ts
├── stripe-connect-webhook/index.ts
├── create-payment-intent/index.ts
└── portal-payment-webhook/index.ts
```

### PDF Export & Signature Flow (Technical)

**`export-proposal-pdf` function:**
```typescript
// 1. Validate user and get proposal
// 2. Get Google Doc ID from proposal
// 3. Get org's Google access token
// 4. Export Google Doc as PDF via Drive API:
//    GET https://www.googleapis.com/drive/v3/files/{docId}/export?mimeType=application/pdf
// 5. Upload PDF to Supabase Storage: {org_id}/proposals/{proposal_id}/unsigned.pdf
// 6. Return PDF URL
```

**`submit-signature` function:**
```typescript
// 1. Validate signing token
// 2. Fetch unsigned PDF from Supabase Storage
// 3. Use pdf-lib to embed signature:
//    - Load PDF bytes
//    - Add new page OR embed at last page
//    - Draw signature image (PNG from canvas)
//    - Add text: signer name, date, timestamp, IP
//    - Add footer: "Signed electronically via WallQu"
// 4. Upload signed PDF to Storage: {org_id}/proposals/{proposal_id}/signed.pdf
// 5. Create proposal_signatures record
// 6. Update signing_token status → 'signed'
// 7. Update proposal status → 'Won'
// 8. Send email with signed PDF to org + client
```

**Dependencies for Edge Functions:**
- `pdf-lib` - Manipulate PDFs (embed images, add text)
- `@pdf-lib/fontkit` - Custom fonts for typed signatures

---

## Phase 3: Frontend Services & Types

### Services
```
src/services/
├── clientPortalService.ts      # Public API (no auth) - for portal page
└── portalManagementService.ts  # Internal API (authenticated) - for org users
```

### React Query Hooks
```
src/hooks/queries/
├── useClientPortal.ts          # Client-facing portal data
└── usePortalManagement.ts      # Internal portal management
```

### Types
```typescript
// src/lib/types/clientPortal.ts
interface ClientPortal { ... }
interface PortalProposal { ... }
interface PortalMessage { ... }
interface ProposalSignature { ... }
interface PortalPayment { ... }
interface PortalActivity { ... }
```

---

## Phase 4: Client Portal UI (Public)

**Route**: `/portal/:token`

### Component Structure
```
src/features/client-portal/
├── pages/
│   └── ClientPortalPage.tsx         # Main page with layout
├── components/
│   ├── layout/
│   │   ├── PortalLayout.tsx         # Header, tabs, sidebar layout
│   │   └── PortalHeader.tsx         # Logo, project name
│   ├── proposals/
│   │   ├── ProposalsTab.tsx         # List of proposal revisions
│   │   ├── ProposalViewer.tsx       # Read-only proposal view
│   │   └── ProposalCard.tsx         # Proposal summary card
│   ├── messages/
│   │   ├── MessagesSidebar.tsx      # iMessage-style sidebar
│   │   ├── MessageThread.tsx        # Message list
│   │   ├── MessageBubble.tsx        # Individual message
│   │   └── MessageInput.tsx         # Compose new message
│   ├── payments/
│   │   ├── PaymentsTab.tsx          # Payment history + make payment
│   │   ├── PaymentForm.tsx          # Stripe payment form
│   │   ├── PaymentHistory.tsx       # Past payments list
│   │   └── PaymentCard.tsx          # Payment summary
│   └── signature/
│       ├── SignatureCapture.tsx     # Main signature component
│       ├── SignatureCanvas.tsx      # Draw mode (canvas)
│       ├── SignatureTyped.tsx       # Type mode (font selection)
│       └── SignaturePreview.tsx     # Confirm before submit
└── hooks/
    └── usePortalState.ts            # Portal state management
```

### Portal States
1. **Loading** → Fetching portal data
2. **Invalid/Expired** → Error page with contact info
3. **Active** → Portal with tabs:
   - Proposals (default)
   - Payments
4. **Messages Sidebar** → Always visible, collapsible

---

## Phase 5: Internal Dashboard Updates

### New Components
```
src/features/proposals/components/
├── portal/
│   ├── CreatePortalDialog.tsx       # Create portal for project
│   ├── PortalStatusBadge.tsx        # Show portal status on proposal
│   └── PortalActivityPanel.tsx      # View activity, messages, payments
```

### Files to Modify
- `src/features/proposals/components/table/EnhancedProposalsTable.tsx`
  - Add "Create Portal" / "View Portal" action
  - Show portal status indicator
  - Show unread messages badge

- `src/router/AppRouter.tsx`
  - Add public route: `/portal/:token`

---

## Phase 6: Stripe Connect Express Integration

### Org Onboarding (Settings Page)
Organizations connect their bank account via Stripe Connect Express:
1. Org clicks "Connect Bank Account" in Settings → Payments
2. Redirects to Stripe's hosted onboarding form
3. Org enters: Business info, bank account (TD, Chase, any bank), identity verification
4. Returns to app with connected account ID stored
5. Money from client payments goes directly to org's bank

**No Stripe account needed** - just bank details. Stripe handles compliance.

### Database Addition
```sql
-- Add to organizations table or create new table
ALTER TABLE organizations ADD COLUMN stripe_connect_account_id text;
ALTER TABLE organizations ADD COLUMN stripe_connect_status text
  CHECK (stripe_connect_status IN ('not_connected', 'pending', 'active', 'restricted'));
ALTER TABLE organizations ADD COLUMN stripe_connect_onboarded_at timestamptz;
```

### Payment Options with Fee Display
Client sees clear fee breakdown when paying:

```
┌─────────────────────────────────────────────────────┐
│  Payment Method                                      │
├─────────────────────────────────────────────────────┤
│  ○ Pay by Card (Debit/Credit)                       │
│     Processing fee: 2.9% + $0.30                    │
│     You pay: $10,290.30                             │
│                                                      │
│  ○ Pay by Bank (ACH) - Recommended for large amounts│
│     Processing fee: 0.8% (max $5.00)                │
│     You pay: $10,005.00                             │
└─────────────────────────────────────────────────────┘
                          Proposal Total: $10,000.00
```

### Fee Handling Options (Org Settings)
```
○ Organization absorbs fees (client pays exact amount)
○ Pass fees to client (client pays amount + processing fee)
```

### Payment Flow
```
1. Client clicks "Make Payment" in portal
2. Selects amount: Full | Deposit (%) | Custom
3. Selects method: Card or ACH Bank Transfer
4. Sees fee breakdown clearly
5. Frontend calls create-payment-intent edge function
6. Edge function:
   - Creates PaymentIntent with org's connected account
   - Uses "destination charge" model (money → org's bank)
   - Calculates fees based on org's settings
7. Frontend uses Stripe Elements (card) or Stripe Financial Connections (ACH)
8. Payment processed by Stripe
9. Stripe deposits to org's connected bank account
10. Webhook updates portal_payments table
11. Both org and client notified via email
```

### Edge Functions for Payments
- `supabase/functions/create-stripe-connect-link/index.ts` - Generate onboarding link
- `supabase/functions/stripe-connect-webhook/index.ts` - Handle account.updated events
- `supabase/functions/create-payment-intent/index.ts` - Create payment with destination
- `supabase/functions/portal-payment-webhook/index.ts` - Handle payment events

### Frontend Components
```
src/features/settings/components/
└── payments/
    ├── StripeConnectSetup.tsx      # Onboarding UI for orgs
    ├── ConnectedAccountStatus.tsx  # Show connection status
    └── PaymentFeeSettings.tsx      # Fee handling preferences

src/features/client-portal/components/payments/
├── PaymentMethodSelector.tsx       # Card vs ACH selection
├── FeeBreakdown.tsx               # Clear fee display
├── CardPaymentForm.tsx            # Stripe Elements for cards
└── ACHPaymentForm.tsx             # Stripe Financial Connections for bank
```

### Stripe API Keys Needed
```bash
# Platform keys (your WallQu account)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# For Connect
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...  # Separate webhook for Connect events
```

---

## Phase 7: Email Templates

| Email | Trigger | Recipient |
|-------|---------|-----------|
| Portal Created | Portal sent to client | Client |
| Portal Viewed | Client opens portal | Org owner |
| New Message | Client sends message | Org owner |
| Proposal Signed | Client signs | Org owner |
| Payment Received | Payment succeeds | Org owner + Client |
| Reminder | Manual send | Client |

---

## Implementation Order

### Step 1: Database (2-3 hours)
1. Create all migration files
2. Add RLS policies for public access via token
3. Create storage bucket for signatures
4. Run migrations

### Step 2: Edge Functions (4-6 hours)
1. `create-client-portal`
2. `get-portal-data`
3. `track-portal-view`
4. `submit-portal-message`
5. `submit-signature`

### Step 3: Types & Services (2 hours)
1. Create type definitions
2. Create `clientPortalService.ts`
3. Create `portalManagementService.ts`
4. Create React Query hooks

### Step 4: Client Portal UI (8-10 hours)
1. Create `ClientPortalPage.tsx` + route
2. Build `PortalLayout.tsx` with tabs
3. Build `ProposalsTab.tsx` + `ProposalViewer.tsx`
4. Build `MessagesSidebar.tsx` (iMessage style)
5. Build `SignatureCapture.tsx` (draw + type modes)
6. Build `PaymentsTab.tsx` (without Stripe first)

### Step 5: Stripe Payments (4-6 hours)
1. Set up Stripe in Supabase
2. Create `create-payment-intent` edge function
3. Create `portal-payment-webhook` edge function
4. Build `PaymentForm.tsx` with Stripe Elements
5. Test payment flow

### Step 6: Internal Dashboard (3-4 hours)
1. Create `CreatePortalDialog.tsx`
2. Update `EnhancedProposalsTable.tsx`
3. Create `PortalActivityPanel.tsx`

### Step 7: Email Templates & Polish (2-3 hours)
1. Design email templates
2. Mobile responsiveness
3. Error handling
4. Loading states

---

## Key Reference Files

| Purpose | File |
|---------|------|
| Edge function pattern | `supabase/functions/send-invite/index.ts` |
| Canvas pattern | `src/components/common/uploads/LogoUpload.tsx` |
| Service pattern | `src/services/proposalsService.ts` |
| React Query hooks | `src/hooks/queries/useProposals.ts` |
| Stripe webhook | `supabase/functions/stripe-webhook/index.ts` |
| Router config | `src/router/AppRouter.tsx` |
| RLS policies | `supabase/migrations/04_apply_rls_policies.sql` |

---

## Security

- 256-bit random tokens (`gen_random_bytes(32)`)
- Token validation on every request
- Optional link expiration
- Immediate revocation capability
- IP address logging for signatures and payments
- Rate limiting on edge functions
- Stripe webhook signature verification
- HTTPS only

---

## Query Keys

```typescript
// Add to src/lib/queryClient.ts
clientPortal: {
  all: ['clientPortal'],
  data: (token: string) => ['clientPortal', 'data', token],
  messages: (token: string) => ['clientPortal', 'messages', token],
  payments: (token: string) => ['clientPortal', 'payments', token],
},
portalManagement: {
  all: ['portalManagement'],
  forProposal: (proposalId: string) => ['portalManagement', 'proposal', proposalId],
  activity: (portalId: string) => ['portalManagement', 'activity', portalId],
},
```

---

## Environment Variables Needed

```bash
# Stripe (add to Supabase secrets)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# For Connect
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...

# Already exists
RESEND_API_KEY=re_...
```
