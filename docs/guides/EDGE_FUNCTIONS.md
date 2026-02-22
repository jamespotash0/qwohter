# Edge Functions Guide

## Overview

Supabase Edge Functions run on Deno at the edge. Used for:
- External API integrations (Stripe, Resend, Google)
- Complex operations requiring service role
- Webhook handlers
- Background processing

## Directory Structure

```
supabase/functions/
├── _shared/                    # Shared utilities
│   ├── cors.ts                 # CORS headers
│   ├── supabase.ts             # Client helpers
│   └── validation.ts           # Input validation
├── stripe-webhook/
│   └── index.ts
├── send-notification-email/
│   └── index.ts
├── generate-google-doc/
│   └── index.ts
└── ...
```

## Edge Functions Reference

### Stripe

| Function | Purpose | Auth |
|----------|---------|------|
| `stripe-webhook` | Handle Stripe events | Signature verification |
| `stripe-handler` | Create checkout sessions | JWT required |
| `create-portal-session` | Generate portal URL | JWT required |
| `manage-seats` | Update seat count | JWT required |

### Notifications

| Function | Purpose | Auth |
|----------|---------|------|
| `send-notification-email` | Send email via Resend | JWT required |
| `process-notification-retry` | Retry failed emails | Service role (cron) |

### Google Integration

| Function | Purpose | Auth |
|----------|---------|------|
| `generate-google-doc` | Create/update documents | JWT required |
| `google-oauth-callback` | OAuth code exchange | None (redirect) |
| `google-disconnect` | Revoke tokens | JWT required |
| `check-google-doc` | Verify doc accessibility | JWT required |
| `google-list-drive-files` | List Drive files | JWT required |
| `google-risc-receiver` | Security events | Google verification |

### Proposals

| Function | Purpose | Auth |
|----------|---------|------|
| `send-for-signature` | Create signing token, scan PDF for signature markers, compute hash, send email | JWT required |
| `submit-signature` | Verify PDF hash, embed signature at detected position, process signing | Token verification |
| `signature-reminders` | Send reminder emails for pending signatures (cron-triggered hourly via pg_cron) | Service role (cron) |

## Function Template

### Authenticated Endpoint

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse and validate input
    const { organizationId, ...data } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Missing organizationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verify organization membership
    const { data: membership, error: memberError } = await supabase
      .from('memberships')
      .select('role, status')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (memberError || !membership || membership.status !== 'Active') {
      return new Response(
        JSON.stringify({ error: 'Not authorized for this organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Perform operation
    // ... your logic here

    // 5. Return success
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Webhook Endpoint (No JWT)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('Missing signature', { status: 400 });
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

    // Verify signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response('Invalid signature', { status: 400 });
    }

    // Handle event
    switch (event.type) {
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;
      // ... other events
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook handler failed', { status: 500 });
  }
});
```

## config.toml

```toml
[functions.stripe-webhook]
verify_jwt = false

[functions.google-oauth-callback]
verify_jwt = false

[functions.google-risc-receiver]
verify_jwt = false

[functions.submit-signature]
verify_jwt = false  # Uses token verification instead

[functions.signature-reminders]
verify_jwt = false  # Triggered by pg_cron with service role

# All others default to verify_jwt = true
```

## Environment Secrets

Set via Supabase Dashboard → Edge Functions → Secrets:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend
RESEND_API_KEY=re_...

# Google
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...

# App
APP_URL=https://www.qwohter.com
```

## Local Development

```bash
# Start Supabase
supabase start

# Serve functions locally
supabase functions serve

# Test specific function
supabase functions serve my-function --env-file .env.local
```

## Invoking from Frontend

```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: {
    organizationId: 'org-123',
    // ... other params
  },
});

if (error) {
  console.error('Function error:', error);
  throw error;
}
```

## Error Handling

```typescript
// Standard error response format
return new Response(
  JSON.stringify({
    error: 'Human-readable error message',
    code: 'ERROR_CODE',  // Optional error code
    details: { ... },    // Optional additional details
  }),
  {
    status: 400,  // or 401, 403, 500
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  }
);
```

## CORS Headers

**Location:** `supabase/functions/_shared/cors.ts`

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
```

## Key Files

- `supabase/config.toml` - Function configuration
- `supabase/functions/_shared/` - Shared utilities
- Individual function directories under `supabase/functions/`
