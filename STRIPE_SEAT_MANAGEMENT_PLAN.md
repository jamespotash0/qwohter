# Stripe Seat-Based Billing - Implementation Plan (Simplified Architecture)

## Overview

This plan implements automatic seat-based billing with Stripe proration using a **database-first approach**:
- Database triggers automatically sync `subscriptions.number_of_users` with active member count
- Edge Functions sync Stripe billing to match the database
- All proration is handled automatically by Stripe

---

## Architecture Principles

### 🎯 Core Concept
```
Database = Source of Truth
  ↓ (trigger)
subscriptions.number_of_users = COUNT(Active Members)
  ↓ (API call)
Stripe subscription.quantity = number_of_users
  ↓ (automatic)
Stripe handles all proration math
```

### Key Components

1. **Database Trigger** - Auto-syncs `number_of_users` with active members
2. **Edge Function** - Updates Stripe to match database count
3. **Stripe Webhooks** - Confirms sync and handles edge cases
4. **Audit Trail** - Logs all seat changes

---

## Phase 1: Database Schema (✅ COMPLETED)

### Migration 1: Seat Usage Events Table
**File**: `20251029000002_create_seat_usage_events_table.sql`

```sql
CREATE TABLE subscription_seat_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  previous_seat_count INTEGER NOT NULL,
  new_seat_count INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('seat_added', 'seat_removed', 'seat_count_updated')),
  triggered_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'America/New_York')
);
```

**Purpose**: Audit trail of all seat count changes

### Migration 2: Auto-Sync Trigger
**File**: `20251029000003_auto_sync_number_of_users.sql`

```sql
CREATE FUNCTION sync_subscription_user_count()
-- Automatically recounts Active members and updates subscriptions.number_of_users

CREATE TRIGGER sync_user_count_on_insert -- On new member
CREATE TRIGGER sync_user_count_on_update -- On status change (Pending→Active, Active→Inactive)
CREATE TRIGGER sync_user_count_on_delete -- On member removal
```

**Purpose**: Keep `number_of_users` always in sync with active member count

---

## Phase 2: Edge Function for Stripe Sync

### New Edge Function: `sync-stripe-seats`

**File**: `supabase/functions/sync-stripe-seats/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || Deno.env.get('STRIPE_SECRET_KEY_TEST') || '';
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { organizationId } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'organizationId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get subscription from database (with current number_of_users)
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id, number_of_users')
      .eq('organization_id', organizationId)
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscription.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: 'No Stripe subscription found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    const currentStripeQuantity = stripeSubscription.items.data[0]?.quantity || 1;
    const targetQuantity = subscription.number_of_users || 1;

    console.log('Syncing seats:', {
      organizationId,
      currentStripeQuantity,
      targetQuantity,
      change: targetQuantity - currentStripeQuantity,
    });

    // If already in sync, return early
    if (currentStripeQuantity === targetQuantity) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Already in sync',
          quantity: targetQuantity,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update Stripe subscription quantity with proration
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        items: [{
          id: stripeSubscription.items.data[0].id,
          quantity: targetQuantity,
        }],
        proration_behavior: 'always_invoice', // Always create proration invoice
      }
    );

    console.log('Stripe subscription updated:', {
      subscriptionId: subscription.stripe_subscription_id,
      previousQuantity: currentStripeQuantity,
      newQuantity: targetQuantity,
    });

    // Create audit event
    await supabase
      .from('subscription_seat_usage_events')
      .insert({
        subscription_id: subscription.id,
        previous_seat_count: currentStripeQuantity,
        new_seat_count: targetQuantity,
        event_type: targetQuantity > currentStripeQuantity ? 'seat_added' : 'seat_removed',
      });

    return new Response(
      JSON.stringify({
        success: true,
        previousQuantity: currentStripeQuantity,
        newQuantity: targetQuantity,
        change: targetQuantity - currentStripeQuantity,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync seats error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Purpose**: Syncs Stripe subscription quantity to match database count

---

## Phase 3: Frontend Integration

### Update `stripeService.ts`

Add new method to sync Stripe with database:

```typescript
/**
 * Sync Stripe subscription quantity with database count
 * Call this after any membership status change
 */
export const syncStripeSeats = async (organizationId: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const functionsUrl = supabaseUrl?.replace('.supabase.co', '.supabase.co/functions/v1') || '';

    const response = await fetch(`${functionsUrl}/sync-stripe-seats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ organizationId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json();

    if (result.error) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      previousQuantity: result.previousQuantity,
      newQuantity: result.newQuantity,
      change: result.change,
    };
  } catch (error) {
    console.error('Error syncing Stripe seats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
```

### Update `useMembership.ts`

Modify member operations to sync Stripe after status changes:

```typescript
const updateMemberStatus = async (membershipId: string, status: 'Pending' | 'Active' | 'Suspended' | 'Inactive') => {
  try {
    // Get membership details before update
    const membership = organizationMembers.find(m => m.id === membershipId);
    if (!membership) {
      throw new Error('Membership not found');
    }

    const oldStatus = membership.status;

    // Update membership status
    const { data, error } = await supabase
      .from('memberships')
      .update({
        status,
        updated_at: new Date().toISOString(),
        joined_at: status === 'Active' ? new Date().toISOString() : undefined
      })
      .eq('id', membershipId)
      .select()
      .single();

    if (error) throw error;

    // Update local state
    setOrganizationMembers(prev => prev.map(member =>
      member.id === membershipId ? { ...member, status } : member
    ));

    if (currentMembership?.id === membershipId) {
      setCurrentMembership(prev => prev ? { ...prev, status } : null);
    }

    // If status changed to/from Active, sync Stripe billing
    const statusChanged = oldStatus !== status;
    const involvesActive = oldStatus === 'Active' || status === 'Active';

    if (statusChanged && involvesActive) {
      console.log('Syncing Stripe seats after status change:', { oldStatus, status });

      // Sync Stripe in background (don't block UI)
      syncStripeSeats(membership.organization_id)
        .then(result => {
          if (result.success) {
            const change = result.change || 0;
            if (change > 0) {
              toast({
                title: "Billing updated",
                description: `Added ${change} seat${change !== 1 ? 's' : ''}. Proration will appear on next invoice.`,
              });
            } else if (change < 0) {
              toast({
                title: "Billing updated",
                description: `Removed ${Math.abs(change)} seat${Math.abs(change) !== 1 ? 's' : ''}. Credit will appear on next invoice.`,
              });
            }
          } else {
            console.error('Failed to sync Stripe:', result.error);
            // Don't show error to user - billing will sync via webhook
          }
        })
        .catch(err => {
          console.error('Error syncing Stripe:', err);
        });
    }

    toast({
      title: "Status updated",
      description: `Member status has been updated to ${status}.`,
    });

    return data;
  } catch (error: any) {
    toast({
      title: "Error updating status",
      description: error.message,
      variant: "destructive",
    });
    throw error;
  }
};
```

---

## Phase 4: Webhook Updates

### Update `stripe-webhook/index.ts`

Add handling for when Stripe subscription quantity changes externally:

```typescript
// In the webhook handler, add case for customer.subscription.updated

case 'customer.subscription.updated': {
  const subscription = event.data.object as Stripe.Subscription;
  const newQuantity = subscription.items.data[0]?.quantity || 1;

  // Update local database
  const { data: localSub } = await supabase
    .from('subscriptions')
    .select('id, number_of_users')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (localSub && localSub.number_of_users !== newQuantity) {
    console.log('Subscription quantity changed in Stripe:', {
      subscriptionId: subscription.id,
      oldQuantity: localSub.number_of_users,
      newQuantity: newQuantity,
    });

    // Update database to match Stripe
    await supabase
      .from('subscriptions')
      .update({ number_of_users: newQuantity })
      .eq('id', localSub.id);

    // Log the change
    await supabase
      .from('subscription_seat_usage_events')
      .insert({
        subscription_id: localSub.id,
        previous_seat_count: localSub.number_of_users,
        new_seat_count: newQuantity,
        event_type: 'seat_count_updated',
      });
  }
  break;
}
```

---

## Workflow Diagrams

### Approving a Member (Pending → Active)

```
1. Admin clicks "Approve Member"
   ↓
2. UPDATE memberships SET status = 'Active'
   ↓
3. [DB Trigger] Recount active members
   subscriptions.number_of_users: 5 → 6
   ↓
4. Call sync-stripe-seats Edge Function
   ↓
5. Edge Function updates Stripe
   stripe.subscriptions.update(quantity: 6)
   ↓
6. Stripe charges proration ($X for remaining days)
   ↓
7. [Webhook] Confirms quantity updated
   ↓
8. [Audit] Log seat_usage_event
```

### Deactivating a Member (Active → Inactive)

```
1. Admin clicks "Deactivate Member"
   ↓
2. UPDATE memberships SET status = 'Inactive'
   ↓
3. [DB Trigger] Recount active members
   subscriptions.number_of_users: 6 → 5
   ↓
4. Call sync-stripe-seats Edge Function
   ↓
5. Edge Function updates Stripe
   stripe.subscriptions.update(quantity: 5)
   ↓
6. Stripe credits proration (-$X for remaining days)
   ↓
7. [Webhook] Confirms quantity updated
   ↓
8. [Audit] Log seat_usage_event
```

### Deleting a Member

```
1. Admin clicks "Remove Member"
   ↓
2. DELETE FROM memberships WHERE id = ?
   ↓
3. [DB Trigger] Recount active members
   subscriptions.number_of_users: 6 → 5
   ↓
4. Call sync-stripe-seats Edge Function
   (same as deactivate flow)
```

---

## Benefits of This Architecture

### ✅ Simplicity
- Database trigger handles all counting logic
- No manual seat availability checks needed
- Single Edge Function for all Stripe sync operations

### ✅ Accuracy
- Full recount on every change (not increment/decrement)
- Database is always the source of truth
- Stripe is updated to match database

### ✅ Automatic Proration
- Stripe handles all billing math
- Charges prorated amount for seat additions
- Credits prorated amount for seat removals

### ✅ Audit Trail
- Every seat change is logged
- Can view full history of billing adjustments
- Easy to debug billing discrepancies

### ✅ Resilience
- If Edge Function fails, webhook will sync on next Stripe update
- Database trigger always runs (can't be skipped)
- No possibility of database/Stripe getting out of sync

---

## Testing Checklist

### Database Trigger Tests
- [ ] Create member with status='Pending' → number_of_users unchanged
- [ ] Update member Pending→Active → number_of_users increases
- [ ] Update member Active→Inactive → number_of_users decreases
- [ ] Update member Inactive→Active → number_of_users increases
- [ ] Delete Active member → number_of_users decreases
- [ ] Delete Pending member → number_of_users unchanged

### Stripe Sync Tests
- [ ] Approve member → Stripe quantity increases, proration charged
- [ ] Deactivate member → Stripe quantity decreases, proration credited
- [ ] Remove member → Stripe quantity decreases, proration credited
- [ ] Multiple rapid changes → Final count matches after all syncs

### Edge Cases
- [ ] Member status changes multiple times quickly
- [ ] Organization has no Stripe subscription yet
- [ ] Stripe API call fails → Error handled gracefully
- [ ] Webhook arrives before Edge Function completes → No duplicate updates

### UI Tests
- [ ] Toast notification shows billing update
- [ ] Seat count updates in real-time
- [ ] Proration amounts displayed correctly
- [ ] Error messages are user-friendly

---

## Deployment Steps

1. **Run Database Migrations**
   ```bash
   # Apply both migrations
   supabase db push
   ```

2. **Deploy Edge Function**
   ```bash
   supabase functions deploy sync-stripe-seats
   ```

3. **Update Frontend Code**
   - Deploy updated `stripeService.ts`
   - Deploy updated `useMembership.ts`

4. **Test in Staging**
   - Use Stripe test mode
   - Approve/remove test members
   - Verify proration amounts

5. **Deploy to Production**
   - Switch to Stripe live mode
   - Monitor logs for first 24 hours
   - Verify webhook events processing correctly

---

## Monitoring & Observability

### Key Metrics to Track
- Seat count changes per day
- Stripe sync success rate
- Proration amounts (total revenue impact)
- Webhook processing latency

### Logs to Monitor
```sql
-- View recent seat changes
SELECT
  created_at,
  event_type,
  previous_seat_count,
  new_seat_count,
  new_seat_count - previous_seat_count as change
FROM subscription_seat_usage_events
ORDER BY created_at DESC
LIMIT 50;

-- Check for sync discrepancies
SELECT
  o.name as organization,
  s.number_of_users as db_count,
  COUNT(m.id) FILTER (WHERE m.status = 'Active') as actual_active_count,
  s.number_of_users - COUNT(m.id) FILTER (WHERE m.status = 'Active') as difference
FROM subscriptions s
JOIN organizations o ON o.id = s.organization_id
LEFT JOIN memberships m ON m.organization_id = s.organization_id
GROUP BY s.id, o.name
HAVING s.number_of_users != COUNT(m.id) FILTER (WHERE m.status = 'Active');
```

---

## Rollback Plan

If issues arise:

1. **Disable Triggers (Emergency)**
   ```sql
   ALTER TABLE memberships DISABLE TRIGGER sync_user_count_on_insert;
   ALTER TABLE memberships DISABLE TRIGGER sync_user_count_on_update;
   ALTER TABLE memberships DISABLE TRIGGER sync_user_count_on_delete;
   ```

2. **Stop Calling Edge Function**
   - Comment out `syncStripeSeats()` calls in `useMembership.ts`
   - Deploy frontend update

3. **Manual Sync Script**
   ```sql
   -- If needed, manually sync all organizations
   UPDATE subscriptions s
   SET number_of_users = (
     SELECT COUNT(*)
     FROM memberships m
     WHERE m.organization_id = s.organization_id
       AND m.status = 'Active'
   );
   ```

---

## Future Enhancements

### Phase 5: Proactive Seat Management
- Warn admins when approaching seat limit
- Suggest optimal seat count based on usage patterns
- Auto-upgrade flow when seats are needed

### Phase 6: Advanced Analytics
- Seat utilization dashboard
- Cost per active user over time
- Billing forecast based on team growth

### Phase 7: Self-Service Seat Management
- Allow admins to pre-purchase seats
- Seat reservation system for planned hires
- Flexible seat allocation across departments

---

## Summary

This simplified architecture leverages database triggers to automatically manage seat counts, making the billing system:
- **Automatic** - Counts sync without manual intervention
- **Accurate** - Full recounts ensure correctness
- **Simple** - Single Edge Function handles all Stripe updates
- **Resilient** - Multiple layers of sync (trigger + Edge Function + webhook)

The database is the source of truth, and Stripe is kept in sync to handle billing automatically with proration.
