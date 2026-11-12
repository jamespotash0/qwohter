# Environment Variables

## Frontend (Vite)

All client-side variables must be prefixed with `VITE_`.

**Location:** `.env` or `.env.local`

```bash
# Required - Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Required - Stripe (publishable key)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...

# Optional - Sentry
VITE_SENTRY_DSN=https://...@sentry.io/...

# Optional - PostHog (Product Analytics)
VITE_POSTHOG_KEY=phc_...
VITE_POSTHOG_HOST=https://us.i.posthog.com

# Optional - Google
VITE_GOOGLE_CLIENT_ID=...googleusercontent.com
```

### Usage in Code

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
```

## Edge Functions (Supabase Secrets)

Set via Supabase Dashboard → Settings → Edge Functions → Secrets

Or via CLI:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_...
```

### Stripe

```bash
STRIPE_SECRET_KEY=sk_live_...           # or sk_test_... for development
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook signing secret
STRIPE_PRICE_ID=price_...               # Default subscription price
```

### Resend (Email)

```bash
RESEND_API_KEY=re_...
```

### Google OAuth

```bash
GOOGLE_OAUTH_CLIENT_ID=...googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-...
```

### Carrier tracking

All optional. With none of them set, shipments are still recorded and their
status is moved by hand — the back office does not fall over because nobody has
bought a tracking subscription.

```bash
TRACKING_PROVIDER=aftership             # aftership (default) | easypost | manual
AFTERSHIP_API_KEY=asat_...              # required when provider is aftership
AFTERSHIP_API_VERSION=2025-07           # URL-segment API version; bump without a deploy
EASYPOST_API_KEY=EZAK...                # required when provider is easypost
TRACKING_WEBHOOK_SECRET=...             # shared secret for the tracking-webhook endpoint
```

`TRACKING_WEBHOOK_SECRET` is compared in constant time against a `?token=` query
parameter (or an `x-tracking-token` header). Without it set, `tracking-webhook`
refuses every call rather than accepting unauthenticated status writes. Give the
provider the URL as:

```
https://<project>.supabase.co/functions/v1/tracking-webhook?token=<secret>
```

The hourly poller reaches its edge function through pg_cron, which reads two
**Supabase Vault** secrets rather than environment variables:

```sql
select vault.create_secret('https://<project>.supabase.co/functions/v1', 'edge_functions_base_url');
select vault.create_secret('<service role key>', 'service_role_key');
```

Without `edge_functions_base_url` the scheduled job logs a warning and does
nothing — deliberately, so a misconfigured environment fails loudly instead of
silently never polling. `track-shipment` still works from the UI meanwhile.

### Application

```bash
APP_URL=https://www.qwohter.com         # Base URL for links in emails
```

### Usage in Edge Functions

```typescript
const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
const resendKey = Deno.env.get('RESEND_API_KEY');
```

## Supabase Auth (SMTP)

Configure in Supabase Dashboard → Authentication → SMTP Settings

For Resend:

```
Host: smtp.resend.com
Port: 465
Username: resend
Password: <RESEND_API_KEY>
Sender email: noreply@qwohter.com
Sender name: Qwohter
```

## Local Development

### Dev Scripts

| Command | Database | Env File |
|---------|----------|----------|
| `npm run dev` | Remote Supabase (production) | `.env.development` |
| `npm run dev:local` | Local Supabase (`127.0.0.1:54321`) | `.env.localdb` |

`dev:local` uses Vite's `--mode localdb` to load `.env.localdb` instead of `.env.development`. Both modes get identical dev settings (sourcemaps, no minification, `__DEV__` = true).

### .env.localdb

```bash
# Local Supabase (used by npm run dev:local)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local anon key from supabase start>
```

### Edge Functions Local

Create `supabase/.env.local`:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
APP_URL=http://localhost:5173
```

Run with:

```bash
supabase functions serve --env-file supabase/.env.local
```

## Vercel (Production)

Set in Vercel Dashboard → Project → Settings → Environment Variables

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_SENTRY_DSN=https://...
VITE_POSTHOG_KEY=phc_...
VITE_POSTHOG_HOST=https://us.i.posthog.com
VITE_GOOGLE_CLIENT_ID=...
```

## Validation

### Frontend Startup

```typescript
// src/config/env.ts
const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY',
];

for (const key of required) {
  if (!import.meta.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
```

### Edge Function Startup

```typescript
const required = ['STRIPE_SECRET_KEY', 'RESEND_API_KEY'];

for (const key of required) {
  if (!Deno.env.get(key)) {
    throw new Error(`Missing required secret: ${key}`);
  }
}
```

## Security Notes

1. **Never commit secrets** - Use `.env.local` (gitignored)
2. **Never expose server secrets** - Don't prefix with `VITE_`
3. **Rotate compromised keys** - Immediately if leaked
4. **Use test keys** for development - Stripe test mode, etc.
