# Paywall Testing Guide

## Overview

The subscription paywall now protects all authenticated routes. When a trial ends or subscription becomes invalid, users will be blocked from accessing the app and redirected to choose a plan.

## How the Paywall Works

### Integration Point
- **Location:** [MainLayout.tsx](./src/components/common/layout/MainLayout.tsx:151-157)
- **Wraps:** All authenticated page content
- **Check:** Runs on every page load for users with an organization

### Validation Logic
The paywall checks subscription status via [hasValidSubscription()](./src/services/stripeService.ts:166-197):

```typescript
export const hasValidSubscription = async (organizationId: string) => {
  const { data: subscription, error } = await getSubscription(organizationId);

  // 1. Check if subscription exists
  if (error || !subscription) {
    return { isValid: false, reason: 'No subscription found' };
  }

  // 2. Check manual access block flag
  if (subscription.access_blocked) {
    return { isValid: false, reason: subscription.access_blocked_reason };
  }

  // 3. Check Stripe subscription status (cached from webhooks)
  const validStatuses = ['active', 'trialing'];
  if (!validStatuses.includes(subscription.stripe_subscription_status || '')) {
    return { isValid: false, reason: `Subscription status: ${subscription.stripe_subscription_status}` };
  }

  return { isValid: true, reason: null };
};
```

### Valid Subscription States
✅ **ALLOWED:**
- `stripe_subscription_status = 'active'`
- `stripe_subscription_status = 'trialing'`
- `access_blocked = false`

❌ **BLOCKED:**
- `stripe_subscription_status = 'past_due'`
- `stripe_subscription_status = 'canceled'`
- `stripe_subscription_status = 'incomplete'`
- `stripe_subscription_status = 'unpaid'`
- `access_blocked = true`

---

## Testing Trial Ended Scenario

### Method 1: Update Database Directly (Fastest)

1. **Go to Supabase Dashboard** → SQL Editor

2. **Find your organization's subscription:**
   ```sql
   SELECT id, organization_id, stripe_subscription_status, current_period_end
   FROM subscriptions
   WHERE organization_id = 'your-org-id-here';
   ```

3. **Simulate trial ended:**
   ```sql
   UPDATE subscriptions
   SET
     stripe_subscription_status = 'past_due',
     current_period_end = NOW() - INTERVAL '1 day'
   WHERE organization_id = 'your-org-id-here';
   ```

4. **Refresh the app** - Paywall should appear immediately

5. **Expected behavior:**
   - User blocked from all pages
   - Shown subscription required screen
   - "Choose a Plan" button redirects to `/subscription`

### Method 2: Use Stripe Test Mode (Most Realistic)

1. **Create test subscription in Stripe:**
   - Use test card: `4242 4242 4242 4242`
   - Set trial period to 1 day

2. **Use Stripe CLI to simulate trial end:**
   ```bash
   stripe trigger subscription.trial_ending
   ```

3. **Webhook updates local database:**
   - Stripe sends `customer.subscription.trial_will_end` event
   - Webhook updates `stripe_subscription_status` to match Stripe
   - Status changes from `'trialing'` → `'active'` or `'past_due'`

4. **Test paywall appears** when status not in valid list

### Method 3: Manual Access Block (Testing Override)

1. **Block access via Supabase:**
   ```sql
   UPDATE subscriptions
   SET
     access_blocked = true,
     access_blocked_reason = 'Testing paywall - trial ended'
   WHERE organization_id = 'your-org-id-here';
   ```

2. **Refresh the app** - Paywall appears with custom reason

3. **Restore access:**
   ```sql
   UPDATE subscriptions
   SET
     access_blocked = false,
     access_blocked_reason = null
   WHERE organization_id = 'your-org-id-here';
   ```

---

## Testing Different Subscription States

### Test Case 1: Active Subscription
```sql
UPDATE subscriptions
SET stripe_subscription_status = 'active'
WHERE organization_id = 'your-org-id-here';
```
**Expected:** ✅ Full access to app

### Test Case 2: Trial Period
```sql
UPDATE subscriptions
SET stripe_subscription_status = 'trialing'
WHERE organization_id = 'your-org-id-here';
```
**Expected:** ✅ Full access to app

### Test Case 3: Past Due Payment
```sql
UPDATE subscriptions
SET stripe_subscription_status = 'past_due'
WHERE organization_id = 'your-org-id-here';
```
**Expected:** ❌ Paywall blocks access
**Message:** "Subscription status: past_due"

### Test Case 4: Canceled Subscription
```sql
UPDATE subscriptions
SET stripe_subscription_status = 'canceled'
WHERE organization_id = 'your-org-id-here';
```
**Expected:** ❌ Paywall blocks access
**Message:** "Subscription status: canceled"

### Test Case 5: No Subscription Record
```sql
DELETE FROM subscriptions
WHERE organization_id = 'your-org-id-here';
```
**Expected:** ❌ Paywall blocks access
**Message:** "No subscription found"

---

## Paywall UI Components

### Blocked Screen
When subscription is invalid, users see:

- **Icon:** Alert circle (orange)
- **Title:** "Subscription Required"
- **Description:** Reason for block (from validation logic)
- **Actions:**
  - Primary: "Choose a Plan" → `/subscription`
  - Secondary: "Go to Settings" → `/settings`

### Routes Protected
All routes except:
- `/` (landing)
- `/sign-in`
- `/create-account`
- `/auth`
- `/forgot-password`
- `/reset-password`
- `/pending-approval`
- `/access-denied`
- `/demo-contact`
- `/subscription` ← **Paywall does NOT block this route!**

---

## Integration with Stripe Webhooks

The paywall relies on webhooks to keep subscription status in sync:

### Key Webhook Events

1. **`customer.subscription.created`**
   - Creates subscription record
   - Sets status to `'trialing'` or `'active'`

2. **`customer.subscription.updated`**
   - Updates `stripe_subscription_status`
   - Updates `current_period_end`

3. **`customer.subscription.trial_will_end`**
   - Warning 3 days before trial ends
   - Optional: Send email reminder

4. **`customer.subscription.deleted`**
   - Sets status to `'canceled'`
   - **Triggers paywall immediately**

5. **`invoice.payment_failed`**
   - Sets status to `'past_due'`
   - **Triggers paywall immediately**

### Webhook Handler Location
- **File:** `api/stripe/webhook.ts` (needs to be created)
- **Updates:** `subscriptions` table in Supabase
- **Endpoint:** `POST /api/stripe/webhook`

---

## Troubleshooting

### Paywall Not Appearing When Expected

**Check 1: Subscription Status**
```sql
SELECT stripe_subscription_status, access_blocked
FROM subscriptions
WHERE organization_id = 'your-org-id';
```

**Check 2: Organization ID in MainLayout**
- Open browser DevTools → Console
- Look for: `currentOrganization` value
- If null, paywall won't initialize

**Check 3: Routes Configuration**
- Verify route is not in excluded list ([MainLayout.tsx:40-46](./src/components/common/layout/MainLayout.tsx:40-46))

### Paywall Appearing When It Shouldn't

**Check 1: Verify Valid Status**
```sql
SELECT stripe_subscription_status
FROM subscriptions
WHERE organization_id = 'your-org-id';
```
Should be `'active'` or `'trialing'`

**Check 2: Check Access Block Flag**
```sql
SELECT access_blocked, access_blocked_reason
FROM subscriptions
WHERE organization_id = 'your-org-id';
```
Should be `false` or `null`

**Fix:**
```sql
UPDATE subscriptions
SET
  stripe_subscription_status = 'active',
  access_blocked = false,
  access_blocked_reason = null
WHERE organization_id = 'your-org-id';
```

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Set up Stripe webhook endpoint
- [ ] Configure webhook secret in environment variables
- [ ] Test all webhook events in Stripe test mode
- [ ] Verify RLS policies allow subscription reads
- [ ] Test trial end scenario with real Stripe data
- [ ] Ensure `/subscription` route is always accessible
- [ ] Test paywall with different subscription states
- [ ] Add error tracking for failed subscription checks (Sentry)
- [ ] Document customer support process for access issues

---

## FAQ

**Q: What happens during the grace period after trial ends?**
A: Stripe typically provides a grace period. The `stripe_subscription_status` remains `'trialing'` until the actual end date. Once trial ends, Stripe changes status and webhook updates database → paywall triggers.

**Q: Can admins bypass the paywall?**
A: No. The paywall checks organization subscription, not individual user roles. All users in an org with invalid subscription are blocked.

**Q: What if Stripe webhook fails to update the database?**
A: The paywall uses cached data from `subscriptions` table. If webhook fails, status won't update and users keep their current access until next successful webhook. Implement webhook retry logic and monitoring.

**Q: How do we restore access after payment?**
A: When payment succeeds, Stripe sends `invoice.payment_succeeded` webhook → updates status to `'active'` → paywall automatically allows access on next page load.

---

**Last Updated:** 2025-10-06
**Status:** Paywall integrated and ready for testing
