# Stripe Edge Functions Implementation Guide

This guide covers the Supabase Edge Functions needed for the seat-based pricing implementation.

## Overview

The new billing system uses Stripe.js on the frontend and requires three Edge Functions on the backend:

1. **stripe-handler** - Creates Stripe Checkout Sessions for new subscriptions
2. **get-invoices** - Fetches billing history from Stripe
3. **stripe-webhooks** (optional but recommended) - Handles Stripe webhook events

## Prerequisites

- Stripe account with test/live API keys
- Supabase project with Edge Functions enabled
- Stripe CLI (for webhook testing): `brew install stripe/stripe-cli/stripe`

## Environment Variables

Add these to your Supabase Edge Functions environment:

```bash
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_... # from Stripe webhook endpoint
```

To set environment variables in Supabase:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Edge Function 1: stripe-handler

Creates Stripe Checkout Sessions for new subscriptions.

### File: `supabase/functions/stripe-handler/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { organizationId, planId, priceId, quantity, successUrl, cancelUrl } = await req.json();

    if (!organizationId || !planId || !priceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create Stripe customer
    const { data: subscription } = await supabaseClient
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .single();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          organization_id: organizationId,
          user_id: user.id,
        },
      });
      customerId = customer.id;

      // Update subscription record with customer ID
      await supabaseClient
        .from('subscriptions')
        .upsert({
          organization_id: organizationId,
          plan_id: planId,
          stripe_customer_id: customerId,
          is_active: false,
          access_blocked: false,
        });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: quantity || 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14, // 14-day trial
        metadata: {
          organization_id: organizationId,
          plan_id: planId,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organization_id: organizationId,
        plan_id: planId,
        user_id: user.id,
      },
    });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

### Deploy:
```bash
supabase functions deploy stripe-handler
```

---

## Edge Function 2: get-invoices

Fetches invoice history from Stripe for billing history display.

### File: `supabase/functions/get-invoices/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { organizationId } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Missing organizationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get customer ID from subscription
    const { data: subscription } = await supabaseClient
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .single();

    if (!subscription?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ invoices: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 100,
    });

    // Transform invoices to match frontend interface
    const formattedInvoices = invoices.data.map((invoice) => ({
      id: invoice.id,
      invoice_pdf: invoice.invoice_pdf || '',
      billing_date: new Date(invoice.created * 1000).toISOString(),
      plan_name: invoice.lines.data[0]?.description || 'Unknown Plan',
      amount: invoice.amount_paid / 100, // Convert cents to dollars
      status: invoice.status === 'paid' ? 'Success' : invoice.status,
      period_start: new Date(invoice.period_start * 1000).toISOString(),
      period_end: new Date(invoice.period_end * 1000).toISOString(),
    }));

    return new Response(
      JSON.stringify({ invoices: formattedInvoices }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Get invoices error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

### Deploy:
```bash
supabase functions deploy get-invoices
```

---

## Edge Function 3: stripe-webhooks (Recommended)

Handles webhook events from Stripe to keep local subscription data in sync.

### File: `supabase/functions/stripe-webhooks/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  if (!signature || !webhookSecret) {
    return new Response('Webhook signature or secret missing', { status: 400 });
  }

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId = session.metadata?.organization_id;
        const planId = session.metadata?.plan_id;

        if (organizationId && session.subscription) {
          // Fetch the subscription to get current_period_end
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          // Update subscription record
          await supabaseAdmin
            .from('subscriptions')
            .update({
              stripe_subscription_id: subscription.id,
              stripe_subscription_status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              plan_id: planId,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('organization_id', organizationId);

          console.log(`✅ Subscription activated for org: ${organizationId}`);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const organizationId = subscription.metadata?.organization_id;

        if (organizationId) {
          const isActive = subscription.status === 'active' || subscription.status === 'trialing';

          await supabaseAdmin
            .from('subscriptions')
            .update({
              stripe_subscription_status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              is_active: isActive,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id);

          console.log(`✅ Subscription ${subscription.status} for org: ${organizationId}`);
        }
        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`💳 Invoice ${invoice.status} for customer: ${invoice.customer}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
});
```

### Deploy:
```bash
supabase functions deploy stripe-webhooks
```

### Configure Webhook in Stripe:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://[your-project-ref].supabase.co/functions/v1/stripe-webhooks`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret and add to Supabase:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

---

## Testing Edge Functions Locally

### 1. Start Supabase locally:
```bash
supabase start
supabase functions serve
```

### 2. Test stripe-handler:
```bash
curl -X POST http://localhost:54321/functions/v1/stripe-handler \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "test-org-id",
    "planId": "test-plan-id",
    "priceId": "price_test_123",
    "quantity": 1,
    "successUrl": "http://localhost:3000/success",
    "cancelUrl": "http://localhost:3000/cancel"
  }'
```

### 3. Test get-invoices:
```bash
curl -X POST http://localhost:54321/functions/v1/get-invoices \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "test-org-id"}'
```

### 4. Test webhooks with Stripe CLI:
```bash
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhooks
stripe trigger checkout.session.completed
```

---

## Deployment Checklist

- [ ] Create Edge Function files in `supabase/functions/`
- [ ] Set Stripe environment variables in Supabase
- [ ] Deploy all three Edge Functions
- [ ] Configure Stripe webhook endpoint
- [ ] Test checkout flow end-to-end
- [ ] Verify webhook events are being received
- [ ] Update migration with actual Stripe product/price IDs
- [ ] Test with Stripe test cards
- [ ] Enable production mode when ready

## Stripe Test Cards

- **Success**: `4242 4242 4242 4242`
- **Requires authentication**: `4000 0025 0000 3155`
- **Declined**: `4000 0000 0000 9995`

Use any future expiration date and any 3-digit CVC.

---

## Next Steps

1. Follow the STRIPE_SETUP_GUIDE.md to create products in Stripe
2. Get the Product IDs and Price IDs
3. Update the migration file with actual IDs (replace placeholders)
4. Deploy Edge Functions
5. Test the complete flow
6. Launch! 🚀
