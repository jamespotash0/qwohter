# Seat Management Architecture (Auto-Sync Version)

## Core Principle

**`subscriptions.number_of_users` automatically syncs with active member count via database triggers**

```
Active memberships = subscriptions.number_of_users (always in sync)
```

## How It Works

### Database Trigger (Automatic)
```sql
-- When membership status changes, number_of_users auto-updates
UPDATE memberships SET status = 'Active' → subscriptions.number_of_users++
UPDATE memberships SET status = 'Inactive' → subscriptions.number_of_users--
```

### Stripe Billing (Manual/Edge Function)
```typescript
// Separate concern: Update Stripe to match the new count
await stripe.subscriptions.update(subscriptionId, {
  items: [{ id: itemId, quantity: newCount }],
  proration_behavior: 'always_invoice'
});
```

---

## Workflows

### 1. Approving a Member

```typescript
// In useMembership.ts - approveMember()

async function approveMember(membershipId: string) {
  // Step 1: Approve member (status: Pending → Active)
  await updateMemberStatus(membershipId, 'Active');

  // Step 2: Database trigger automatically updates number_of_users
  // subscriptions.number_of_users: 5 → 6

  // Step 3: Call Stripe to update billing (via Edge Function)
  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('id', membershipId)
    .single();

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('number_of_users, stripe_subscription_id')
    .eq('organization_id', membership.organization_id)
    .single();

  // Update Stripe to match new count
  await fetch('/functions/v1/sync-stripe-seats', {
    method: 'POST',
    body: JSON.stringify({
      subscriptionId: subscription.stripe_subscription_id,
      quantity: subscription.number_of_users, // Now 6
    })
  });

  // Stripe charges proration: $X for remaining days in billing period
  toast.success('Member approved. Billing updated.');
}
```

### 2. Removing a Member

```typescript
// In useMembership.ts - removeMember()

async function removeMember(membershipId: string) {
  // Step 1: Deactivate member (status: Active → Inactive)
  await updateMemberStatus(membershipId, 'Inactive');

  // Step 2: Database trigger automatically updates number_of_users
  // subscriptions.number_of_users: 6 → 5

  // Step 3: Call Stripe to update billing
  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('id', membershipId)
    .single();

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('number_of_users, stripe_subscription_id')
    .eq('organization_id', membership.organization_id)
    .single();

  // Update Stripe to match new count
  await fetch('/functions/v1/sync-stripe-seats', {
    method: 'POST',
    body: JSON.stringify({
      subscriptionId: subscription.stripe_subscription_id,
      quantity: subscription.number_of_users, // Now 5
    })
  });

  // Stripe credits proration: -$X for remaining days in billing period
  toast.success('Member removed. Billing credit applied.');
}
```

---

## New Edge Function: `sync-stripe-seats`

This replaces the complex `manage-seats` function with a simpler approach:

```typescript
// supabase/functions/sync-stripe-seats/index.ts

serve(async (req) => {
  const { subscriptionId, quantity } = await req.json();

  // Get Stripe subscription
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const currentQuantity = stripeSubscription.items.data[0].quantity;

  // If quantity hasn't changed, return early
  if (currentQuantity === quantity) {
    return new Response(JSON.stringify({ success: true, message: 'No change needed' }));
  }

  // Update Stripe subscription with proration
  await stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: stripeSubscription.items.data[0].id,
      quantity: quantity,
    }],
    proration_behavior: 'always_invoice',
  });

  // Log the change
  await supabase
    .from('subscription_seat_usage_events')
    .insert({
      subscription_id: localSubscriptionId,
      previous_seat_count: currentQuantity,
      new_seat_count: quantity,
      event_type: quantity > currentQuantity ? 'seat_added' : 'seat_removed',
    });

  return new Response(JSON.stringify({
    success: true,
    previousCount: currentQuantity,
    newCount: quantity
  }));
});
```

---

## Simplified Flow Diagram

```
User Action (Approve/Remove Member)
    ↓
Update memberships.status
    ↓
[DB Trigger] Auto-update subscriptions.number_of_users
    ↓
Call sync-stripe-seats Edge Function
    ↓
Update Stripe subscription quantity
    ↓
Stripe charges/credits proration
    ↓
[Webhook] Confirm sync (optional verification)
```

---

## Benefits of This Approach

✅ **Single source of truth:** Database controls the count
✅ **Automatic sync:** No manual calculation needed
✅ **Simplified logic:** No complex seat availability checks
✅ **Audit trail:** Every change logged in seat_usage_events
✅ **Proration:** Stripe handles billing math automatically

---

## What About Seat Limits?

If you want to enforce a maximum seat limit (e.g., plan allows max 10 users):

```sql
-- Add constraint check
ALTER TABLE memberships
ADD CONSTRAINT check_seat_limit
CHECK (
  (SELECT COUNT(*) FROM memberships WHERE organization_id = memberships.organization_id AND status = 'Active')
  <= (SELECT max_users FROM subscription_plans sp
      JOIN subscriptions s ON s.plan_id = sp.id
      WHERE s.organization_id = memberships.organization_id)
);
```

Or handle in application logic before approving:

```typescript
async function approveMember(membershipId: string) {
  // Check if organization has reached plan limit
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan:subscription_plans(max_users)')
    .eq('organization_id', orgId)
    .single();

  const { count: activeCount } = await supabase
    .from('memberships')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'Active');

  if (subscription.plan.max_users && activeCount >= subscription.plan.max_users) {
    throw new Error('Plan seat limit reached. Upgrade to add more members.');
  }

  // Proceed with approval...
}
```

---

## Summary

**Before (Complex):**
- Manual seat availability checks
- Separate add/remove seat functions
- Complex proration calculations
- Potential sync issues between DB and Stripe

**After (Simple):**
- Database trigger auto-syncs `number_of_users`
- Single `sync-stripe-seats` function
- Stripe handles all proration math
- Database is always the source of truth
- Stripe is updated to match database
