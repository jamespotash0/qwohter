# Billing System FAQ

## 1. Trial Handling

### Q: Given a subscription with a 14-day trial starting Dec 1, 2025, what should be the first billing date and amount?

**First billing date:** December 15, 2025 (trial_end)
**Amount:** $20 × number_of_active_users (e.g., 1 user = $20)

During trial, no charge is made. The first charge happens when `trial_end` is reached.

---

### Q: If the trial ends today, Dec 15, 2025, what should current_period_start and current_period_end be in the database?

```
current_period_start = 2025-12-15 (trial_end date = first billing date)
current_period_end   = 2026-01-15 (one month later for monthly billing)
trial_start          = 2025-12-01 (unchanged, historical)
trial_end            = 2025-12-15 (unchanged, historical)
stripe_subscription_status = 'Active'
```

---

### Q: How do I check whether a subscription is still trialing using only stripe_subscription_status?

```typescript
const isTrialing = subscription.stripe_subscription_status?.toLowerCase() === 'trialing';
```

Or in SQL:
```sql
SELECT * FROM subscriptions
WHERE LOWER(stripe_subscription_status) = 'trialing';
```

---

### Q: If a trial is extended by 7 days in Stripe, how should the DB update trial_end and current_period_start?

When Stripe sends `customer.subscription.updated` webhook:

```
trial_end = trial_end + 7 days (new extended date)
current_period_start = unchanged (still null or original)
current_period_end = unchanged
```

The `current_period_start` only updates when the trial ends and the first paid period begins.

---

## 2. Billing and Proration

### Q: If a subscription is set to bill monthly starting on the 15th, and the trial ends Dec 15, will Stripe generate a partial invoice? Why or why not?

**No partial invoice.**

The trial end date IS the billing anchor. When trial ends on Dec 15:
- Full monthly invoice for Dec 15 → Jan 15
- No proration because the billing cycle starts fresh

Proration only occurs when:
- Quantity changes mid-cycle
- Plan changes mid-cycle

---

### Q: What happens if a customer upgrades mid-cycle — when is proration applied?

Proration is applied **immediately** (with `proration_behavior: 'always_invoice'`):

```
Example:
- Jan 1: Started with 2 users → $40/month charged
- Jan 15: Added 1 user (mid-cycle)
- Immediate proration charge:
  - Daily rate: $20 ÷ 31 days = $0.645/user/day
  - Days remaining: 16 (Jan 15-31)
  - Proration: $0.645 × 16 = $10.32
- Feb 1: Full charge for 3 users: $60
```

---

### Q: How can I prevent proration from affecting the first invoice after a trial ends?

By design, there's no proration after trial ends because:
1. Trial period has $0 value
2. First billing period starts fresh at trial_end

If you want to ensure this, in Stripe checkout:
```typescript
subscription_data: {
  trial_end: trialEndTimestamp,
  billing_cycle_anchor: trialEndTimestamp, // Anchors billing to trial end
}
```

---

### Q: If current_period_end is misaligned with Stripe's billing cycle, how should the system adjust it?

**Always trust Stripe webhooks.** The `customer.subscription.updated` webhook contains:
- `current_period_start`
- `current_period_end`

Your webhook handler should always overwrite DB values with Stripe's values:
```typescript
await supabase.from('subscriptions').update({
  current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
}).eq('stripe_subscription_id', subscription.id);
```

---

## 3. Database Synchronization

### Q: When Stripe sends a customer.subscription.updated webhook, which fields should be updated in the DB?

```typescript
{
  stripe_subscription_status: status,           // 'active', 'trialing', etc.
  current_period_start: periodStart,            // From Stripe
  current_period_end: periodEnd,                // From Stripe
  trial_start: trialStart,                      // If present
  trial_end: trialEnd,                          // If present
  has_payment_method: hasPaymentMethod,         // Check customer's payment methods
  cancel_at_period_end: cancelAtPeriodEnd,      // Boolean
  is_active: ['active', 'trialing'].includes(status),
  updated_at: new Date().toISOString(),
}
```

---

### Q: If the subscription status changes from trialing → active, what DB fields should be updated to reflect the first paid period?

```typescript
{
  stripe_subscription_status: 'Active',
  current_period_start: trialEndDate,           // First paid period starts at trial end
  current_period_end: trialEndDate + 1 month,   // One billing cycle later
  is_active: true,
  // trial_start and trial_end remain unchanged (historical record)
}
```

---

### Q: How do I calculate current_period_end from current_period_start and billing_interval?

```typescript
const calculatePeriodEnd = (periodStart: Date, interval: 'Monthly' | 'Yearly'): Date => {
  const end = new Date(periodStart);
  if (interval === 'Monthly') {
    end.setMonth(end.getMonth() + 1);
  } else {
    end.setFullYear(end.getFullYear() + 1);
  }
  return end;
};
```

**Note:** Always prefer Stripe's values from webhooks over manual calculations.

---

### Q: If a customer cancels mid-cycle, which fields in the DB should change?

**On cancel request (cancel_at_period_end = true):**
```typescript
{
  cancel_at_period_end: true,
  is_active: true,               // Still active until period end!
  // User keeps access until current_period_end
}
```

**When period actually ends (subscription.deleted webhook):**
```typescript
{
  stripe_subscription_status: 'Canceled',
  is_active: false,
  access_blocked: true,
  access_blocked_reason: 'Subscription canceled',
}
```

---

## 4. Access Control / Feature Logic

### Q: How do I determine whether a user should have full access if the subscription is trialing?

```typescript
const hasAccess = (subscription: Subscription): boolean => {
  // Trialing = full access
  if (subscription.stripe_subscription_status?.toLowerCase() === 'trialing') {
    // Check trial hasn't expired
    if (subscription.trial_end && new Date(subscription.trial_end) > new Date()) {
      return true;
    }
  }

  // Active = full access
  if (subscription.is_active && !subscription.access_blocked) {
    return true;
  }

  return false;
};
```

---

### Q: If access_blocked is true, what is the logic to override access for trials?

`access_blocked` should NOT be overridden for trials. However, during an active trial:
- `access_blocked` should be `false`
- If trial expires without payment, THEN `access_blocked` becomes `true`

```typescript
const shouldBlock = (subscription: Subscription): boolean => {
  // Explicit block always wins
  if (subscription.access_blocked) return true;

  // Check trial expiry
  if (subscription.stripe_subscription_status?.toLowerCase() === 'trialing') {
    if (subscription.trial_end && new Date(subscription.trial_end) < new Date()) {
      // Trial expired, check for payment method
      if (!subscription.has_payment_method) {
        return true; // Block - no payment method after trial
      }
    }
  }

  return false;
};
```

---

### Q: How do I handle edge cases where the trial ends and the payment fails?

Stripe sends `invoice.payment_failed` webhook:

```typescript
case 'invoice.payment_failed': {
  await supabase.from('subscriptions').update({
    access_blocked: true,
    access_blocked_reason: 'Payment failed',
    stripe_subscription_status: 'past_due',
  }).eq('stripe_customer_id', invoice.customer);
}
```

When payment succeeds later (`invoice.paid`):
```typescript
case 'invoice.paid': {
  await supabase.from('subscriptions').update({
    access_blocked: false,
    access_blocked_reason: null,
    stripe_subscription_status: 'Active',
  }).eq('stripe_customer_id', invoice.customer);
}
```

---

## 5. Edge Cases

### Q: If a subscription is created in the Stripe test clock with a trial, and I advance the clock 10 days, what should the DB reflect?

After advancing 10 days (assuming 14-day trial):

```
stripe_subscription_status = 'Trialing' (still in trial)
trial_start = original date
trial_end = original date + 14 days
current_period_start = null or trial_start
current_period_end = trial_end
is_active = true
```

If you advanced 15 days (past trial end):
```
stripe_subscription_status = 'Active'
current_period_start = trial_end date
current_period_end = trial_end + 1 month
is_active = true
```

---

### Q: What happens if a customer has multiple subscriptions with overlapping trials?

**This shouldn't happen in a seat-based model.** Each organization should have exactly one subscription.

If it does happen:
- Check for existing subscription before creating new one
- The webhook handler matches by `stripe_subscription_id`, so each subscription updates independently
- Your application logic should enforce one subscription per organization

---

### Q: If the billing cycle anchor is changed mid-subscription, how should current_period_start / current_period_end update in the DB?

When Stripe changes the anchor, it sends `customer.subscription.updated` with new period dates.

Your webhook handler should trust Stripe's values:
```typescript
current_period_start = subscription.current_period_start (from webhook)
current_period_end = subscription.current_period_end (from webhook)
```

Stripe may also create a prorated invoice for the period adjustment.

---

## 6. Reporting / Analytics

### Q: How do I calculate remaining trial days for a subscription in the DB?

```typescript
const getRemainingTrialDays = (subscription: Subscription): number => {
  if (!subscription.trial_end) return 0;
  if (subscription.stripe_subscription_status?.toLowerCase() !== 'trialing') return 0;

  const now = new Date();
  const trialEnd = new Date(subscription.trial_end);
  const diffMs = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
};
```

SQL:
```sql
SELECT
  organization_id,
  GREATEST(0, EXTRACT(DAY FROM (trial_end - NOW()))) as days_remaining
FROM subscriptions
WHERE stripe_subscription_status = 'Trialing';
```

---

### Q: How do I determine the next invoice date using current_period_end and billing_interval?

The next invoice date is simply `current_period_end`:

```typescript
const nextInvoiceDate = subscription.current_period_end;
```

For calculating future invoices:
```typescript
const getNextInvoiceDates = (periodEnd: Date, interval: 'Monthly' | 'Yearly', count: number): Date[] => {
  const dates: Date[] = [];
  let current = new Date(periodEnd);

  for (let i = 0; i < count; i++) {
    dates.push(new Date(current));
    if (interval === 'Monthly') {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setFullYear(current.getFullYear() + 1);
    }
  }

  return dates;
};
```

---

### Q: If I need to generate a report of all subscriptions that will transition from trial to active in the next week, how do I query it?

```sql
SELECT
  s.id,
  s.organization_id,
  o.name as organization_name,
  s.trial_end,
  s.has_payment_method,
  s.number_of_active_users,
  (s.number_of_active_users * 20) as expected_first_charge
FROM subscriptions s
JOIN organizations o ON s.organization_id = o.id
WHERE
  s.stripe_subscription_status = 'Trialing'
  AND s.trial_end BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY s.trial_end ASC;
```

To segment by payment method status:
```sql
-- Trials ending soon WITH payment method (will convert)
SELECT * FROM subscriptions
WHERE stripe_subscription_status = 'Trialing'
  AND trial_end BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND has_payment_method = true;

-- Trials ending soon WITHOUT payment method (at risk of churn)
SELECT * FROM subscriptions
WHERE stripe_subscription_status = 'Trialing'
  AND trial_end BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND has_payment_method = false;
```

---

## Quick Reference: Field Update Matrix

| Event | status | period_start | period_end | trial_end | is_active | access_blocked |
|-------|--------|--------------|------------|-----------|-----------|----------------|
| Checkout completed (trial) | Trialing | trial_start | trial_end | +14 days | true | false |
| Trial ends, payment succeeds | Active | trial_end | +1 month | unchanged | true | false |
| Trial ends, payment fails | past_due | trial_end | +1 month | unchanged | true | true |
| Cancel requested | unchanged | unchanged | unchanged | unchanged | true | false |
| Period ends after cancel | Canceled | unchanged | unchanged | unchanged | false | true |
| Payment fails mid-cycle | past_due | unchanged | unchanged | unchanged | true | true |
| Payment recovers | Active | unchanged | unchanged | unchanged | true | false |
