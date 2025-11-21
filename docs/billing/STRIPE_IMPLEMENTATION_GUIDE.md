# Stripe Billing Implementation Guide

**For:** Developers implementing complete Stripe billing
**Time Estimate:** 1-2 weeks with testing
**Prerequisites:** Stripe account, Supabase project, Node.js

---

## Table of Contents

1. [Quick Start Checklist](#quick-start-checklist)
2. [Step-by-Step Implementation](#step-by-step-implementation)
3. [Testing Guide](#testing-guide)
4. [Troubleshooting](#troubleshooting)
5. [Production Deployment](#production-deployment)

---

## Quick Start Checklist

### Before You Start
- [ ] Stripe account created
- [ ] Supabase project setup
- [ ] Environment variables configured
- [ ] Stripe CLI installed (`brew install stripe/stripe-cli/stripe`)
- [ ] Supabase CLI installed

### Week 1: Critical Infrastructure
- [ ] Deploy webhook Edge Function
- [ ] Configure Stripe webhook endpoint
- [ ] Create Stripe products (Individual + Team)
- [ ] Update database with real Stripe IDs
- [ ] Test all webhook events
- [ ] Automate seat syncing

### Week 2: Complete Flows
- [ ] Test proration scenarios
- [ ] Add payment method reminders
- [ ] Implement downgrade flow
- [ ] Set up scheduled sync job
- [ ] End-to-end testing

---

## Step-by-Step Implementation

### Step 1: Deploy Stripe Webhook (Day 1, 2 hours)

#### 1.1 Deploy Edge Function

```bash
# Navigate to Supabase directory
cd supabase

# Deploy the webhook function
supabase functions deploy stripe-webhook

# Output will show:
# Deployed Function stripe-webhook
# URL: https://[project-id].supabase.co/functions/v1/stripe-webhook
```

**Copy the URL** - You'll need it for Stripe configuration

#### 1.2 Configure Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Enter webhook URL: `https://[project-id].supabase.co/functions/v1/stripe-webhook`
5. **Select events to send:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_method.attached`
   - `payment_method.detached`
   - `customer.subscription.paused`
   - `customer.subscription.resumed`

6. Click **Add endpoint**

#### 1.3 Get Webhook Secret

After creating the endpoint:
1. Click on the endpoint in the Webhooks list
2. Click **Reveal** next to "Signing secret"
3. Copy the secret (starts with `whsec_...`)

#### 1.4 Add Secret to Supabase

```bash
# Set webhook secret
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Verify it's set
supabase secrets list
```

#### 1.5 Test Webhook

```bash
# Terminal 1: Listen to Stripe events
stripe listen --forward-to https://[project-id].supabase.co/functions/v1/stripe-webhook

# Terminal 2: Trigger test event
stripe trigger customer.subscription.created

# Check Terminal 1 for output:
# ✔ Webhook received: customer.subscription.created
```

**Verification:**
- Check Supabase logs: `supabase functions logs stripe-webhook`
- Check database: `SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 5;`

---

### Step 2: Create Stripe Products (Day 1, 1 hour)

#### 2.1 Create Individual Plan

```bash
# Create product
stripe products create \
  --name "Individual Plan" \
  --description "Perfect for solo users - Fixed price for 1 user"

# Copy the product ID (prod_...)
```

```bash
# Create monthly price
stripe prices create \
  --product prod_[PRODUCT_ID] \
  --unit-amount 2499 \
  --currency usd \
  --recurring[interval]=month \
  --nickname "Individual Monthly"

# Copy the price ID (price_...)
```

#### 2.2 Create Team Plan

```bash
# Create product
stripe products create \
  --name "Team Plan" \
  --description "For growing teams - Per-user pricing"

# Copy the product ID (prod_...)
```

```bash
# Create monthly price (metered/licensed)
stripe prices create \
  --product prod_[PRODUCT_ID] \
  --unit-amount 1999 \
  --currency usd \
  --recurring[interval]=month \
  --recurring[usage_type]=licensed \
  --nickname "Team Monthly Per User"

# Copy the price ID (price_...)
```

#### 2.3 Update Database

```sql
-- Update Individual Plan
UPDATE subscription_plans
SET
  stripe_product_id = 'prod_[YOUR_INDIVIDUAL_PRODUCT_ID]',
  stripe_price_id_monthly = 'price_[YOUR_INDIVIDUAL_PRICE_ID]'
WHERE name = 'Individual';

-- Update Team Plan
UPDATE subscription_plans
SET
  stripe_product_id = 'prod_[YOUR_TEAM_PRODUCT_ID]',
  stripe_price_id_monthly = 'price_[YOUR_TEAM_PRICE_ID]'
WHERE name = 'Team';

-- Verify
SELECT name, stripe_product_id, stripe_price_id_monthly
FROM subscription_plans;
```

#### 2.4 Update Environment Variables

```bash
# Add to .env.development
STRIPE_PRICE_ID_PER_USER_MONTHLY=price_[YOUR_TEAM_PRICE_ID]

# Set in Supabase secrets
supabase secrets set STRIPE_PRICE_ID_PER_USER_MONTHLY=price_[YOUR_TEAM_PRICE_ID]
```

---

### Step 3: Automate Seat Syncing (Day 2-3, 1 day)

#### 3.1 Update useOrganizations Hook

**File:** `src/hooks/queries/useOrganizations.ts`

Add helper function:

```typescript
import { supabase } from '@/lib/supabase';
import { useUser } from '@/auth';

// Add at top of file
const syncSeatsWithStripe = async (
  organizationId: string,
  action: 'add' | 'remove' | 'update',
  userId?: string
) => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-seats', {
      body: {
        action,
        organizationId,
        triggeredByUserId: userId
      }
    });

    if (error) {
      console.error('❌ Failed to sync seats with Stripe:', error);
      // Don't throw - seat sync shouldn't block user action
      return;
    }

    console.log('✅ Seats synced with Stripe:', data);
  } catch (error) {
    console.error('❌ Exception syncing seats:', error);
    // Don't throw - non-blocking
  }
};
```

#### 3.2 Update inviteMember Mutation

```typescript
export const useOrganizations = () => {
  const user = useUser();

  const inviteMember = useMutation({
    mutationFn: async ({
      email,
      role,
      organizationId
    }: {
      email: string;
      role: string;
      organizationId: string;
    }) => {
      // Existing invite logic
      const result = await organizationService.inviteMember(email, role, organizationId);

      // NEW: Sync seats with Stripe
      await syncSeatsWithStripe(organizationId, 'add', user?.id);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['organizations']);
      queryClient.invalidateQueries(['organization-members']);
      queryClient.invalidateQueries(['subscription']);
    }
  });

  // ... rest of hook
};
```

#### 3.3 Update removeMember Mutation

```typescript
const removeMember = useMutation({
  mutationFn: async ({
    memberId,
    organizationId
  }: {
    memberId: string;
    organizationId: string;
  }) => {
    // Existing remove logic
    const result = await organizationService.removeMember(memberId, organizationId);

    // NEW: Sync seats with Stripe
    await syncSeatsWithStripe(organizationId, 'remove', user?.id);

    return result;
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['organizations']);
    queryClient.invalidateQueries(['organization-members']);
    queryClient.invalidateQueries(['subscription']);
  }
});
```

#### 3.4 Update approveMember Mutation

```typescript
const approveMember = useMutation({
  mutationFn: async ({
    memberId,
    organizationId
  }: {
    memberId: string;
    organizationId: string;
  }) => {
    // Existing approve logic
    const result = await organizationService.approveMember(memberId, organizationId);

    // NEW: Sync seats with Stripe (adds a seat)
    await syncSeatsWithStripe(organizationId, 'add', user?.id);

    return result;
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['organizations']);
    queryClient.invalidateQueries(['organization-members']);
    queryClient.invalidateQueries(['subscription']);
  }
});
```

**Note:** Also update `deactivateMember()` if it exists

---

### Step 4: Set Up Scheduled Sync (Day 3, 2 hours)

#### 4.1 Create Migration

**File:** `supabase/migrations/[timestamp]_setup_seat_sync_cron.sql`

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create hourly sync job
SELECT cron.schedule(
  'sync-stripe-seat-quantities',
  '0 * * * *', -- Every hour on the hour
  $$
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-ID].supabase.co/functions/v1/sync-stripe-quantities',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer [YOUR-SERVICE-ROLE-KEY]'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;
```

#### 4.2 Apply Migration

```bash
# Apply migration locally
supabase db reset

# Or push to remote
supabase db push
```

#### 4.3 Verify Cron Job

```sql
-- Check if job is scheduled
SELECT
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname = 'sync-stripe-seat-quantities';

-- Check job runs (after 1 hour)
SELECT *
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'sync-stripe-seat-quantities'
)
ORDER BY start_time DESC
LIMIT 10;
```

---

### Step 5: Test Proration (Day 4, 1 day)

#### 5.1 Create Test Script

**File:** `scripts/test-proration.ts`

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_TEST!, {
  apiVersion: '2023-10-16'
});

async function testProration() {
  console.log('🧪 Testing Proration Scenarios\n');

  // 1. Create test customer
  const customer = await stripe.customers.create({
    email: 'test@example.com',
    name: 'Test Organization'
  });
  console.log('✅ Created customer:', customer.id);

  // 2. Create subscription with 2 seats
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{
      price: process.env.STRIPE_PRICE_ID_PER_USER_MONTHLY!,
      quantity: 2
    }],
    trial_period_days: 14
  });
  console.log('✅ Created subscription:', subscription.id);
  console.log('   Status:', subscription.status);
  console.log('   Quantity:', subscription.items.data[0].quantity);

  // 3. Convert trial to active (simulate trial ending)
  await stripe.subscriptions.update(subscription.id, {
    trial_end: 'now'
  });
  console.log('✅ Converted to active subscription');

  // 4. Add a seat mid-cycle
  console.log('\n📈 Adding 1 seat...');
  await stripe.subscriptions.update(subscription.id, {
    items: [{
      id: subscription.items.data[0].id,
      quantity: 3
    }],
    proration_behavior: 'always_invoice'
  });

  // 5. Check upcoming invoice for proration
  const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
    customer: customer.id
  });

  console.log('   Upcoming invoice total:', (upcomingInvoice.total / 100).toFixed(2), 'USD');
  const prorationLine = upcomingInvoice.lines.data.find(line => line.proration);
  if (prorationLine) {
    console.log('   Proration amount:', (prorationLine.amount / 100).toFixed(2), 'USD');
  }

  // 6. Remove a seat
  console.log('\n📉 Removing 1 seat...');
  await stripe.subscriptions.update(subscription.id, {
    items: [{
      id: subscription.items.data[0].id,
      quantity: 2
    }],
    proration_behavior: 'always_invoice'
  });

  // 7. Check credit
  const creditInvoice = await stripe.invoices.retrieveUpcoming({
    customer: customer.id
  });

  console.log('   New total:', (creditInvoice.total / 100).toFixed(2), 'USD');
  const creditLine = creditInvoice.lines.data.find(line => line.amount < 0);
  if (creditLine) {
    console.log('   Credit amount:', (Math.abs(creditLine.amount) / 100).toFixed(2), 'USD');
  }

  // 8. Cleanup
  console.log('\n🧹 Cleaning up test data...');
  await stripe.subscriptions.cancel(subscription.id);
  await stripe.customers.del(customer.id);
  console.log('✅ Test complete!');
}

testProration().catch(console.error);
```

#### 5.2 Run Test

```bash
# Run test script
npm run ts-node scripts/test-proration.ts

# Or with tsx
npx tsx scripts/test-proration.ts
```

**Expected Output:**
```
🧪 Testing Proration Scenarios

✅ Created customer: cus_...
✅ Created subscription: sub_...
   Status: trialing
   Quantity: 2
✅ Converted to active subscription

📈 Adding 1 seat...
   Upcoming invoice total: 19.99 USD
   Proration amount: 9.99 USD

📉 Removing 1 seat...
   New total: 19.99 USD
   Credit amount: 9.99 USD

🧹 Cleaning up test data...
✅ Test complete!
```

#### 5.3 Verify in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Check **Billing** → **Subscriptions**
3. Look for test subscription
4. Verify proration invoices created

---

### Step 6: Add Payment Reminders (Day 5-7, 2 days)

#### 6.1 Create useTrialReminders Hook

**File:** `src/hooks/useTrialReminders.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface TrialReminderState {
  showReminder: boolean;
  daysRemaining: number;
  trialEnd: Date | null;
}

export const useTrialReminders = (organizationId: string): TrialReminderState => {
  const [state, setState] = useState<TrialReminderState>({
    showReminder: false,
    daysRemaining: 0,
    trialEnd: null
  });

  useEffect(() => {
    const checkTrial = async () => {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('trial_end, has_payment_method, stripe_subscription_status')
        .eq('organization_id', organizationId)
        .single();

      if (!subscription) return;
      if (subscription.has_payment_method) return;
      if (subscription.stripe_subscription_status !== 'Trialing') return;

      const trialEnd = new Date(subscription.trial_end);
      const now = new Date();
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      setState({
        showReminder: [7, 3, 1].includes(daysLeft) || daysLeft <= 0,
        daysRemaining: Math.max(0, daysLeft),
        trialEnd
      });
    };

    checkTrial();
    const interval = setInterval(checkTrial, 1000 * 60 * 60); // Check hourly

    return () => clearInterval(interval);
  }, [organizationId]);

  return state;
};
```

#### 6.2 Add Reminder Banner to Dashboard

**File:** `src/pages/Dashboard.tsx`

```typescript
import { useTrialReminders } from '@/hooks/useTrialReminders';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useCurrentOrganization();
  const { showReminder, daysRemaining } = useTrialReminders(currentOrganization?.id || '');

  return (
    <div className="dashboard">
      {/* Trial Reminder Banner */}
      {showReminder && (
        <Alert variant="warning" className="mb-6">
          <AlertTitle>Your Trial is Ending Soon</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {daysRemaining > 0
                ? `Your trial ends in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}. Add a payment method to continue using QWOHTER.`
                : 'Your trial has ended. Add a payment method to restore access.'
              }
            </span>
            <Button onClick={() => navigate('/settings/billing')}>
              Add Payment Method
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Rest of dashboard */}
    </div>
  );
};
```

#### 6.3 Email Reminders (Optional)

**File:** `supabase/functions/send-trial-reminders/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  try {
    // Find trials ending in 7, 3, or 1 days
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select(`
        *,
        organizations (
          name,
          members:memberships (
            users:user_id (
              email,
              full_name
            )
          )
        )
      `)
      .eq('stripe_subscription_status', 'Trialing')
      .eq('has_payment_method', false);

    const now = new Date();
    const reminders = [];

    for (const sub of subscriptions || []) {
      const trialEnd = new Date(sub.trial_end);
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if ([7, 3, 1].includes(daysLeft)) {
        // Send email to organization owner
        const owner = sub.organizations.members.find(m => m.role === 'Owner');
        if (owner?.users?.email) {
          reminders.push({
            to: owner.users.email,
            subject: `Your QWOHTER trial ends in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`,
            html: `
              <h2>Hi ${owner.users.full_name},</h2>
              <p>Your QWOHTER trial ends in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}.</p>
              <p>Add a payment method to continue using all features.</p>
              <a href="${Deno.env.get('APP_URL')}/settings/billing">Add Payment Method</a>
            `
          });
        }
      }
    }

    // Send emails (integrate with your email service)
    console.log(`Sending ${reminders.length} trial reminder emails`);

    return new Response(JSON.stringify({ sent: reminders.length }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
});
```

**Schedule daily:**
```sql
SELECT cron.schedule(
  'send-trial-reminders',
  '0 9 * * *', -- Daily at 9 AM
  $$
  SELECT net.http_post(
    'https://[project].supabase.co/functions/v1/send-trial-reminders'
  );
  $$
);
```

---

## Testing Guide

### Manual Testing Checklist

#### Webhook Tests
```bash
# Test each event
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
stripe trigger payment_method.attached

# Verify each in database
SELECT * FROM subscriptions ORDER BY updated_at DESC LIMIT 1;
```

#### Trial Flow
- [ ] Create new organization → Trial auto-created
- [ ] Trial countdown shows 14 days
- [ ] Grace period activates after trial
- [ ] Paywall blocks after grace period
- [ ] Adding payment during trial works
- [ ] Trial converts to paid correctly

#### Seat Management
- [ ] Add user → DB count increases
- [ ] Add user → Stripe quantity increases
- [ ] Remove user → DB count decreases
- [ ] Remove user → Stripe quantity decreases
- [ ] Proration charge appears
- [ ] Individual plan blocks 2+ users
- [ ] Team plan allows unlimited users

#### Payment Scenarios
- [ ] Successful payment processes
- [ ] Failed payment blocks access
- [ ] Update payment method works
- [ ] Customer portal accessible
- [ ] Invoices display correctly

#### UI Tests
- [ ] Paywall shows for invalid subscription
- [ ] Grace period message displays
- [ ] Trial countdown accurate
- [ ] Billing tab loads
- [ ] Cancel subscription works
- [ ] Reactivate subscription works
- [ ] Realtime updates work

---

## Troubleshooting

### Webhook Not Receiving Events

**Check:**
```bash
# View Stripe webhook logs
stripe logs tail --filter-event-type customer.subscription.updated

# View Supabase function logs
supabase functions logs stripe-webhook

# Test webhook signature
curl -X POST https://[project].supabase.co/functions/v1/stripe-webhook \
  -H "stripe-signature: [test-signature]" \
  -d '{"type": "customer.subscription.updated"}'
```

**Common Issues:**
- Webhook secret not set: `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`
- Function not deployed: `supabase functions deploy stripe-webhook`
- Firewall blocking: Check Supabase network settings

### Seats Not Syncing

**Check:**
```sql
-- View subscriptions pending sync
SELECT * FROM subscriptions_pending_sync;

-- Check seat count vs Stripe
SELECT
  s.organization_id,
  s.number_of_active_users AS db_count,
  s.stripe_subscription_id,
  COUNT(m.id) AS actual_count
FROM subscriptions s
LEFT JOIN memberships m ON m.organization_id = s.organization_id AND m.status = 'Active'
GROUP BY s.id;
```

**Manual Sync:**
```bash
# Trigger sync for specific org
curl -X POST https://[project].supabase.co/functions/v1/manage-seats \
  -H "Authorization: Bearer [anon-key]" \
  -d '{"action": "update", "organizationId": "[org-id]"}'
```

### Proration Not Working

**Check Stripe Dashboard:**
1. Go to Billing → Subscriptions
2. Click on subscription
3. View "Upcoming invoice"
4. Check for proration line items

**Common Issues:**
- `proration_behavior` not set
- Subscription in trial (proration only works in active)
- Price not set to licensed metering

---

## Production Deployment

### Pre-Launch Checklist

- [ ] All webhook events tested
- [ ] Proration validated
- [ ] Seat sync automated
- [ ] Scheduled jobs running
- [ ] Real Stripe products configured
- [ ] Environment variables set
- [ ] Error monitoring enabled
- [ ] Backup plan documented

### Environment Variables

```bash
# Production Stripe keys
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Production Supabase
SUPABASE_URL=https://prod-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
```

### Monitoring Setup

```typescript
// Add to monitoring dashboard
const billingMetrics = {
  webhookSuccessRate: 'stripe_webhooks_success / stripe_webhooks_total',
  seatSyncLag: 'COUNT(subscriptions WHERE stripe_quantity_pending_sync = true)',
  trialConversionRate: 'trials_converted / trials_started',
  churnRate: 'subscriptions_cancelled / subscriptions_active'
};
```

### Support Runbook

```markdown
## Issue: Payment Failed

1. Check subscription status in Stripe Dashboard
2. View failed payment in Stripe
3. Check customer payment methods
4. Retry payment manually if needed
5. Contact customer with clear instructions

## Issue: Seat Count Mismatch

1. Query: SELECT * FROM subscriptions_pending_sync;
2. Manually trigger sync via manage-seats
3. Verify in Stripe Dashboard
4. Check audit log: SELECT * FROM subscription_seat_usage_events;
```

---

## Additional Resources

- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Architecture Document](./STRIPE_ARCHITECTURE.md)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-20
