# Stripe-First Billing System

## Philosophy

**Stripe is the source of truth for ALL billing data.**

- ✅ **Store in Stripe**: Pricing, payment methods, invoices, billing history, user counts, trial periods
- ✅ **Store Locally**: Stripe Customer ID, Stripe Subscription ID, cached status, access flags
- ❌ **Never Store Locally**: Credit cards, payment details, sensitive billing data

## Why Stripe-First?

1. **Security**: No sensitive payment data in your database
2. **Compliance**: PCI compliance handled by Stripe
3. **Reliability**: Stripe's infrastructure for billing, not yours
4. **Features**: Free access to Stripe's customer portal, invoicing, analytics
5. **Truth**: One source of truth prevents sync issues

---

## Database Schema

### Tables

#### `subscription_plans` (Metadata Only)
Stores plan information for your UI only.

```sql
- id
- name ('Free', 'Professional')
- display_name
- description
- stripe_product_id ← Links to Stripe Product
- stripe_price_id_monthly ← Links to Stripe Price
- stripe_price_id_yearly ← Links to Stripe Price
- features (jsonb) ← For display only
```

**Important**: Actual pricing lives in Stripe. Local pricing is just for display.

#### `subscriptions` (References Only)
Stores Stripe references and access control.

```sql
- id
- organization_id (one subscription per org)
- plan_id

-- Stripe References
- stripe_customer_id ← Link to Stripe Customer
- stripe_subscription_id ← Link to Stripe Subscription

-- Cached Status (updated via webhooks)
- stripe_subscription_status ('active', 'past_due', 'canceled', 'trialing')
- current_period_end (for display only)

-- Access Control (local decisions)
- is_active
- access_blocked (manual override)
- access_blocked_reason
```

**No billing data stored here!** Everything comes from Stripe API.

---

## Billing Flow

### 1. User Selects Plan

```typescript
import { stripeService } from '@/services/stripeService';

// Get available plans (display info only)
const { data: plans } = await stripeService.getPlans();

// Show plans to user
// User selects: Professional, Monthly
```

### 2. Create Stripe Checkout Session

```typescript
// Redirect to Stripe Checkout (Stripe handles payment collection)
await stripeService.createCheckoutSession({
  organizationId: 'org-123',
  planId: 'professional-plan-id',
  priceId: 'price_xyz123', // Stripe Price ID for monthly
  successUrl: 'https://yourapp.com/billing/success',
  cancelUrl: 'https://yourapp.com/billing',
});

// User redirected to Stripe's secure checkout page
// User enters payment info directly to Stripe
// Stripe collects payment
```

### 3. Webhook Updates Local Cache

```typescript
// Stripe webhook: checkout.session.completed
// Your backend receives webhook event

// Update local subscription record with Stripe IDs
await stripeService.updateSubscription(subscriptionId, {
  stripe_subscription_id: 'sub_xyz123',
  stripe_subscription_status: 'active',
  current_period_end: '2025-11-05T00:00:00Z',
});
```

### 4. Access Control Check

```typescript
// Before allowing user to access app
const { isValid, reason } = await stripeService.hasValidSubscription('org-123');

if (!isValid) {
  // Redirect to billing page
  // Show message: reason
}

// Allow access
```

---

## Customer Self-Service Portal

Stripe provides a hosted customer portal for:
- Viewing invoices
- Updating payment methods
- Changing subscription plans
- Viewing billing history
- Canceling subscription

```typescript
// Redirect user to Stripe Customer Portal
await stripeService.createPortalSession({
  organizationId: 'org-123',
  returnUrl: 'https://yourapp.com/settings/billing',
});

// User can manage everything in Stripe's portal
// No custom UI needed for payment method management!
```

---

## Implementation Steps

### Step 1: Set Up Stripe Account

1. Create Stripe account: https://dashboard.stripe.com
2. Get API keys:
   - Publishable Key (safe for client-side)
   - Secret Key (server-side only, never expose)

### Step 2: Create Products and Prices in Stripe

```bash
# In Stripe Dashboard:
# Products → Add Product

# Professional Plan
- Name: Professional Plan
- Description: Per-user pricing
- Pricing:
  - Monthly: $12.99/user/month
  - Yearly: $119.88/user/year (save 23%)
```

Copy the Price IDs (e.g., `price_1A2B3C...`)

### Step 3: Update Local Database

```sql
-- Update subscription_plans with Stripe IDs
UPDATE subscription_plans
SET
  stripe_product_id = 'prod_xyz123',
  stripe_price_id_monthly = 'price_monthly_xyz',
  stripe_price_id_yearly = 'price_yearly_xyz'
WHERE name = 'Professional';
```

### Step 4: Install Stripe SDK

```bash
npm install stripe @stripe/stripe-js
```

### Step 5: Configure Environment Variables

```env
# Client-side (safe to expose)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Server-side only (NEVER expose)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Step 6: Create Backend API Endpoints

You need these server-side endpoints (using Stripe Secret Key):

#### `/api/stripe/create-checkout-session`
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createCheckoutSession(req, res) {
  const { organizationId, priceId, successUrl, cancelUrl } = req.body;

  // Get or create Stripe Customer
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('organization_id', organizationId)
    .single();

  let customerId = subscription?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { organizationId },
    });
    customerId = customer.id;
  }

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1, // Will be updated to user count later
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  res.json({ sessionId: session.id });
}
```

#### `/api/stripe/create-portal-session`
```typescript
export async function createPortalSession(req, res) {
  const { organizationId, returnUrl } = req.body;

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('organization_id', organizationId)
    .single();

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: returnUrl,
  });

  res.json({ url: session.url });
}
```

#### `/api/stripe/webhook`
```typescript
export async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case 'checkout.session.completed':
      // Update local subscription with Stripe IDs
      const session = event.data.object;
      await supabase
        .from('subscriptions')
        .update({
          stripe_subscription_id: session.subscription,
          stripe_subscription_status: 'active',
        })
        .eq('stripe_customer_id', session.customer);
      break;

    case 'customer.subscription.updated':
      // Update subscription status
      const subscription = event.data.object;
      await supabase
        .from('subscriptions')
        .update({
          stripe_subscription_status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);
      break;

    case 'customer.subscription.deleted':
      // Mark subscription as canceled
      const canceledSub = event.data.object;
      await supabase
        .from('subscriptions')
        .update({
          stripe_subscription_status: 'canceled',
          is_active: false,
        })
        .eq('stripe_subscription_id', canceledSub.id);
      break;

    case 'invoice.payment_failed':
      // Payment failed - could block access after X attempts
      const invoice = event.data.object;
      // Handle payment failure
      break;

    case 'invoice.payment_succeeded':
      // Payment succeeded - ensure access is enabled
      const paidInvoice = event.data.object;
      // Restore access if blocked
      break;
  }

  res.json({ received: true });
}
```

### Step 7: Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourapp.com/api/stripe/webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret → Add to `.env` as `STRIPE_WEBHOOK_SECRET`

---

## Per-User Pricing

Stripe supports metered billing for per-user pricing:

### Option 1: Update Subscription Quantity

```typescript
// When user count changes
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Count active users
const { count } = await supabase
  .from('memberships')
  .select('id', { count: 'exact' })
  .eq('organization_id', organizationId)
  .eq('status', 'Active');

// Update Stripe subscription quantity
await stripe.subscriptions.update(subscriptionId, {
  items: [
    {
      id: subscriptionItemId,
      quantity: count,
    },
  ],
});

// Stripe automatically prorates and bills correct amount
```

### Option 2: Metered Billing

```typescript
// Report usage to Stripe
await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
  quantity: activeUserCount,
  timestamp: Math.floor(Date.now() / 1000),
  action: 'set', // Set to exact count
});

// Stripe bills at end of period based on usage
```

---

## Example UI Flow

### Billing Settings Page

```typescript
import { stripeService } from '@/services/stripeService';

function BillingSettings() {
  const organizationId = useOrganizationId();

  // Get local subscription reference
  const { data: subscription } = useQuery(['subscription'], () =>
    stripeService.getSubscription(organizationId)
  );

  // Get plan details (display only)
  const plan = subscription?.plan;

  return (
    <div>
      <h2>Current Plan: {plan?.display_name}</h2>
      <p>Status: {subscription?.stripe_subscription_status}</p>
      <p>Renews: {subscription?.current_period_end}</p>

      {/* Manage in Stripe Portal */}
      <Button
        onClick={() =>
          stripeService.createPortalSession({
            organizationId,
            returnUrl: window.location.href,
          })
        }
      >
        Manage Subscription
      </Button>

      {/* Upgrade Plan */}
      <Button
        onClick={() =>
          stripeService.createCheckoutSession({
            organizationId,
            planId: 'pro-plan-id',
            priceId: 'price_monthly',
            successUrl: `${window.location.origin}/billing/success`,
            cancelUrl: window.location.href,
          })
        }
      >
        Upgrade to Professional
      </Button>
    </div>
  );
}
```

---

## Security Best Practices

1. **Never expose Stripe Secret Key**
   - Use server-side endpoints only
   - Never send to client

2. **Verify webhook signatures**
   - Always validate `stripe-signature` header
   - Prevents fake webhook events

3. **Use Stripe's hosted pages**
   - Checkout: Stripe collects payment
   - Customer Portal: Stripe manages billing
   - No PCI compliance burden

4. **Validate on server**
   - Client can request, but server validates
   - Check organization ownership before creating sessions

---

## Testing

### Test Mode

Stripe provides test mode with test credit cards:

```
Test Card: 4242 4242 4242 4242
Any future expiration date
Any 3-digit CVC
```

### Test Webhooks

Use Stripe CLI to test webhooks locally:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
```

---

## Summary

### ✅ DO
- Store Stripe IDs (customer, subscription) locally
- Cache subscription status for fast access checks
- Use Stripe Customer Portal for self-service
- Let Stripe handle all payment collection
- Use webhooks to sync status
- Query Stripe API for billing history/invoices

### ❌ DON'T
- Store credit card info
- Build custom payment forms
- Store invoices/payment history locally
- Calculate pricing locally (use Stripe)
- Skip webhook signature verification

---

## Next Steps

1. ✅ Database migration applied
2. ✅ TypeScript types updated
3. ✅ Stripe service created
4. ⏳ Create Stripe account
5. ⏳ Create products/prices in Stripe
6. ⏳ Install Stripe SDK: `npm install stripe @stripe/stripe-js`
7. ⏳ Create backend API endpoints
8. ⏳ Configure webhook endpoint
9. ⏳ Build billing UI components
10. ⏳ Test with Stripe test mode

---

**Questions?** Check [Stripe Documentation](https://stripe.com/docs)
