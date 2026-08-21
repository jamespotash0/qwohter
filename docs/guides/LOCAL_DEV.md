# Local Development Setup

Complete guide for running Qwohter locally.

---

## Prerequisites

| Tool | Install |
|------|---------|
| Node.js 18+ | [nodejs.org](https://nodejs.org) |
| Supabase CLI | `npm install -g supabase` |
| Stripe CLI | `brew install stripe/stripe-cli/stripe` |
| Docker | Required by Supabase CLI ([docker.com](https://docker.com)) |

---

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Environment Files

There are **three** environment files that need to be configured. None of these should be committed to git.

### Frontend: `.env.development.local`

Vite loads `.env.development` automatically in dev mode. Create `.env.development.local` to override with local Supabase values:

```bash
# .env.development.local
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<your-local-anon-key>   # Get from: supabase status
```

> **How Vite loads env files:** `.env.development` (shared defaults) is loaded first, then `.env.development.local` (your local overrides) is layered on top. The `.local` file takes precedence and is gitignored.

### Edge Functions: `supabase/.env`

This file is automatically read by `supabase functions serve`. Add all secrets your edge functions need:

```bash
# supabase/.env

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_CLI_WEBHOOK_SECRET=whsec_...

# Resend (email)
RESEND_API_KEY=re_...

# App URL (used for links in emails)
APP_URL=http://localhost:8080

# Mapbox
MAPBOX_PUBLIC_TOKEN=pk_...
```

> **Where to get these keys:**
> - `STRIPE_SECRET_KEY` — [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) (use test mode)
> - `STRIPE_CLI_WEBHOOK_SECRET` — Output of `stripe listen` (starts with `whsec_`)
> - `RESEND_API_KEY` — [Resend Dashboard](https://resend.com) → API Keys → Create API Key (starts with `re_`)
> - `MAPBOX_PUBLIC_TOKEN` — [Mapbox Account](https://account.mapbox.com/access-tokens/)

### Production overrides: `.env.production`

Used only for production builds. Points to the hosted Supabase instance.

---

## 3. Start Local Services

Start services in this order:

### Step 1: Start Supabase

```bash
supabase start
```

This starts local PostgreSQL, Auth, Storage, and the API gateway on `http://127.0.0.1:54321`.

After it starts, note the `anon key` and `service_role key` from the output (or run `supabase status`). Add the `anon key` to `.env.development.local` as `VITE_SUPABASE_ANON_KEY`.

### Step 2: Serve Edge Functions

```bash
supabase functions serve
```

This serves all edge functions at `http://127.0.0.1:54321/functions/v1/<function-name>` and automatically reads secrets from `supabase/.env`.

> **Note:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by the CLI. You do not need to set them in `supabase/.env`.

### Step 3: Start Stripe Webhook Listener (optional)

Only needed if testing Stripe webhooks (subscriptions, payments):

```bash
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
```

Copy the `whsec_...` secret it outputs into `supabase/.env` as `STRIPE_CLI_WEBHOOK_SECRET`, then restart `supabase functions serve`.

### Step 4: Start Vite Dev Server

```bash
npm run dev
```

App runs at `http://localhost:8080` (or the port shown in terminal).

---

## 4. Reset Local Database

To reset the database and re-run all migrations + seed data:

```bash
supabase db reset
```

---

## Edge Functions Reference

All edge functions live in `supabase/functions/<name>/index.ts`. The local gateway routes requests to `http://127.0.0.1:54321/functions/v1/<name>`.

| Function | Purpose | Required Secrets |
|----------|---------|-----------------|
| `send-invite` | Team invitation emails | `RESEND_API_KEY` |
| `send-notification-email` | Notification emails | `RESEND_API_KEY` |
| `send-signup-invite` | Signup invitation emails | `RESEND_API_KEY` |
| `contact-us` | Contact form emails | `RESEND_API_KEY` |
| `stripe-handler` | Create checkout sessions | `STRIPE_SECRET_KEY` |
| `stripe-webhook` | Process Stripe events | `STRIPE_SECRET_KEY`, `STRIPE_CLI_WEBHOOK_SECRET` |
| `create-portal-session` | Stripe customer portal | `STRIPE_SECRET_KEY` |
| `create-trial-subscription` | Free trial setup | `STRIPE_SECRET_KEY` |
| `get-invoices` | Fetch Stripe invoices | `STRIPE_SECRET_KEY` |
| `manage-seats` | Seat-based billing | `STRIPE_SECRET_KEY` |
| `sync-stripe-quantities` | Sync seat counts | `STRIPE_SECRET_KEY` |
| `ip-tracking` | Rate limiting IP detection | _(none)_ |
| `dev-impersonate` | Dev-only user impersonation | _(none)_ |
| `export-proposal-pdf` | PDF generation | _(none)_ |
| `generate-google-doc` | Google Docs integration | Google OAuth secrets |
| `google-oauth-callback` | Google OAuth flow | Google OAuth secrets |
| `get-mapbox-token` | Mapbox proxy | `MAPBOX_PUBLIC_TOKEN` |

---

## Troubleshooting

### CORS errors calling edge functions

Edge function calls from the frontend must go through `http://127.0.0.1:54321/functions/v1/<name>`. If the URL is missing `/functions/v1/`, the request hits the API gateway root which doesn't return CORS headers. Verify `VITE_SUPABASE_URL` is set correctly.

### "Email service not configured"

`RESEND_API_KEY` is not set in `supabase/.env`. Add it and restart `supabase functions serve`.

### "Stripe secret key not configured"

`STRIPE_SECRET_KEY` is not set in `supabase/.env`. Add your test-mode secret key from the Stripe Dashboard.

### Edge function changes not reflecting

Restart `supabase functions serve`. The CLI watches for file changes but occasionally needs a restart for env changes.

### Database migrations out of sync

```bash
supabase db reset
```

This drops and recreates the local database with all migrations applied.
