# Billing & Subscriptions

> **Location:** `src/services/stripeService.ts`, `src/components/features/settings/BillingTab.tsx`

## Architecture

**Stripe-first approach:** Stripe is the source of truth for subscription state.

```
User Action → stripeService.ts → Supabase Edge Function → Stripe API
                                                              ↓
                                                    Stripe Webhook
                                                              ↓
                                              stripe-webhook Edge Function
                                                              ↓
                                                    Update subscriptions table
```

## Data Model

```typescript
interface Subscription {
  id: string;
  organization_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_subscription_status: SubscriptionStatus;
  stripe_price_id?: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  has_payment_method: boolean;
  is_active: boolean;
  access_blocked: boolean;
  trial_ends_at?: string;
  seat_count: number;
  created_at: string;
  updated_at: string;
}

type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired';
```

## Pricing Model

- **Per-seat pricing:** $20/user/month
- **14-day free trial** (local-only until payment method added)
- **3-day grace period** after trial expiry
- **Proration** for mid-cycle seat changes

## Subscription States

| Status | Access | Description |
|--------|--------|-------------|
| `trialing` | ✅ Full | Free trial period |
| `active` | ✅ Full | Paid and current |
| `past_due` | ⚠️ Limited | Payment failed, retry pending |
| `canceled` | ❌ None | Subscription ended |
| `unpaid` | ❌ None | Payment permanently failed |

## Trial Flow

```
1. Organization created → Local trial starts (14 days)
2. User adds payment method → Stripe trial created
3. Trial ends → Auto-converts to paid subscription
4. No payment method at trial end → 3-day grace period
5. Grace period ends → Access blocked
```

## Edge Functions

| Function | Purpose |
|----------|---------|
| `stripe-webhook` | Handle Stripe events (subscription updates, payments) |
| `stripe-handler` | Create checkout sessions |
| `create-portal-session` | Generate Stripe Customer Portal URL |
| `manage-seats` | Update seat count with proration |

## Stripe Webhook Events (Detailed)

**Location:** `supabase/functions/stripe-webhook/index.ts`

### Event Processing Flow

```
Stripe Event → Webhook Endpoint → Verify Signature → Route by Event Type
                                                            ↓
                                              Handle Event (DB updates, notifications)
                                                            ↓
                                              Return 200 OK (or error)
```

### Handled Events

#### Checkout Completion
**Event:** `checkout.session.completed`

When triggered: User completes Stripe checkout after adding payment method

Actions:
1. Extract `organization_id` from session metadata
2. Update subscriptions table with Stripe IDs
3. Set subscription to `active` status
4. Clear any `access_blocked` flags
5. Create success notification for organization

```typescript
// What gets updated:
{
  stripe_customer_id: session.customer,
  stripe_subscription_id: session.subscription,
  stripe_subscription_status: 'active',
  has_payment_method: true,
  is_active: true,
  access_blocked: false
}
```

#### Subscription Created
**Event:** `customer.subscription.created`

When triggered: New subscription created via API or Checkout

Actions:
1. Sync subscription data to database
2. Set `current_period_start` and `current_period_end`
3. Record seat count from `quantity`
4. Create notification for admins/owners

#### Subscription Updated
**Event:** `customer.subscription.updated`

When triggered:
- Plan change
- Seat quantity change
- Status change (trial → active, active → past_due)
- Cancellation scheduled

Actions:
1. Update subscription status
2. Sync billing period dates
3. Update `cancel_at_period_end` flag
4. Update seat count
5. Create notification describing change

```typescript
// Status transitions to watch:
// 'trialing' → 'active'     (Trial converted)
// 'active' → 'past_due'     (Payment failed)
// 'past_due' → 'active'     (Payment recovered)
// 'active' → 'canceled'     (Subscription ended)
```

#### Subscription Deleted
**Event:** `customer.subscription.deleted`

When triggered: Subscription permanently ends (after cancellation period)

Actions:
1. Set `is_active: false`
2. Set `access_blocked: true`
3. Update status to `canceled`
4. Create notification informing of access loss

#### Trial Ending Soon
**Event:** `customer.subscription.trial_will_end`

When triggered: 3 days before trial ends (Stripe default)

Actions:
1. Create notification warning admins/owners
2. Include trial end date in notification
3. Prompt user to ensure payment method is valid

#### Invoice Payment Succeeded
**Event:** `invoice.payment_succeeded`

When triggered: Any successful payment (subscription renewal, upgrade, etc.)

Actions:
1. Update `current_period_start` and `current_period_end`
2. Ensure `is_active: true`
3. Clear any `past_due` status
4. Create payment success notification

```typescript
// Notification includes:
{
  title: "Payment Successful",
  message: "Your payment of $X.XX was processed successfully",
  type: "info"
}
```

#### Invoice Payment Failed
**Event:** `invoice.payment_failed`

When triggered: Payment attempt fails (card declined, insufficient funds, etc.)

Actions:
1. Update status to `past_due`
2. Create urgent notification for admins/owners
3. Include payment recovery instructions

```typescript
// Notification includes:
{
  title: "Payment Failed",
  message: "Please update your payment method to avoid service interruption",
  type: "warning"
}
```

**Note:** Stripe auto-retries failed payments. After exhausting retries (~3 weeks), subscription moves to `unpaid` or `canceled`.

#### Payment Method Attached
**Event:** `payment_method.attached`

When triggered: User adds a new payment method

Actions:
1. Set `has_payment_method: true`
2. If trial was in grace period, may trigger subscription creation

#### Payment Method Detached
**Event:** `payment_method.detached`

When triggered: Payment method removed or expired

Actions:
1. Check if other payment methods exist
2. If no methods remain, set `has_payment_method: false`
3. Create notification if subscription is active

### When Users Are Charged

| Event | Charge Timing |
|-------|---------------|
| Trial end | Automatically at trial expiration |
| Subscription renewal | Start of each billing period |
| Seat added | Immediately (prorated for current period) |
| Plan upgrade | Immediately (prorated) |
| Plan downgrade | At next billing period |
| Seat removed | Credit applied to next invoice |

### Proration Logic

```
Adding seat mid-cycle:
  Days remaining = 15 (of 30-day period)
  Monthly rate = $20/seat
  Charge = $20 × (15/30) = $10 immediate charge

Removing seat mid-cycle:
  Days remaining = 15 (of 30-day period)
  Monthly rate = $20/seat
  Credit = $20 × (15/30) = $10 credit on next invoice
```

### Webhook Security

```typescript
// Signature verification (required)
const signature = req.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  Deno.env.get('STRIPE_WEBHOOK_SECRET')
);

// If signature invalid → 400 error
// If event processed → 200 OK
```

### Error Handling

- Webhook returns 200 even for processing errors (to prevent Stripe retries)
- Errors logged to console for debugging
- Critical errors may trigger admin notifications

## Seat Management

```typescript
// Add seat (when inviting member)
await supabase.functions.invoke('manage-seats', {
  body: {
    organizationId,
    action: 'add',
    quantity: 1
  }
});

// Remove seat (when removing member)
await supabase.functions.invoke('manage-seats', {
  body: {
    organizationId,
    action: 'remove',
    quantity: 1
  }
});
```

Proration is automatic - Stripe calculates credits/charges.

## Stripe Customer Portal

Users manage their subscription via Stripe's hosted portal:

```typescript
const { url } = await supabase.functions.invoke('create-portal-session', {
  body: { organizationId }
});
window.location.href = url;
```

Portal allows:
- Update payment method
- View invoices
- Cancel subscription
- Update billing info

## Payment Recovery

When payment fails:

1. Stripe automatically retries (up to 4 times over ~3 weeks)
2. User receives email notifications
3. Status changes to `past_due`
4. After all retries fail → `unpaid` → Access blocked

## React Query Hooks

**Location:** `src/hooks/queries/useSubscription.ts`

| Hook | Purpose |
|------|---------|
| `useSubscription(orgId)` | Get current subscription |
| `useCreateCheckoutSession()` | Start new subscription |
| `useCreatePortalSession()` | Get billing portal URL |
| `useUpdateSeats()` | Change seat count |

## Billing UI Components

**Location:** `src/components/features/settings/BillingTab.tsx`

- Current plan display
- Usage (seats used / total)
- Next billing date
- Payment method status
- "Manage Subscription" button → Stripe Portal
- Invoice history

## Paywall

Users without active subscription see paywall:

```typescript
// Check access
const hasAccess = subscription?.is_active && !subscription?.access_blocked;

if (!hasAccess) {
  return <PaywallScreen />;
}
```

## Key Files

- `src/services/stripeService.ts` - Stripe operations
- `src/hooks/queries/useSubscription.ts` - React Query hooks
- `src/components/features/settings/BillingTab.tsx` - Billing UI
- `supabase/functions/stripe-webhook/` - Webhook handler
- `supabase/functions/stripe-handler/` - Checkout sessions
- `supabase/functions/create-portal-session/` - Portal access
- `supabase/functions/manage-seats/` - Seat management
