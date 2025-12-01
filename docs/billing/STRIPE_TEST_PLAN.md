# Stripe Billing Test Plan

Run these tests with Stripe CLI forwarding:
```bash
stripe listen --forward-to https://piuwrlaoxuefmiisuamc.supabase.co/functions/v1/stripe-webhook
```

Use Stripe test cards: https://docs.stripe.com/testing#cards

---

## 1. New Subscription Flow

### 1.1 Checkout Session Completed
**Trigger:** Complete a subscription checkout in your app
**Webhook:** `checkout.session.completed`

**Verify in database (subscriptions table):**
- [ ] `stripe_customer_id` is set
- [ ] `stripe_subscription_id` is set
- [ ] `stripe_subscription_status` = 'Active' or 'Trialing'
- [ ] `current_period_start` is set
- [ ] `current_period_end` is set
- [ ] `is_active` = true
- [ ] `number_of_active_users` matches quantity

**CLI trigger:**
```bash
stripe trigger checkout.session.completed
```

---

### 1.2 Subscription Created
**Webhook:** `customer.subscription.created`

**Verify:**
- [ ] Subscription record created/updated
- [ ] Status reflects Stripe status

**CLI trigger:**
```bash
stripe trigger customer.subscription.created
```

---

## 2. Trial Flow

### 2.1 Trial Starting
**Trigger:** Create subscription with trial period

**Verify:**
- [ ] `stripe_subscription_status` = 'Trialing'
- [ ] `trial_start` is set
- [ ] `trial_end` is set (14 days from now)
- [ ] `is_active` = true

### 2.2 Trial Ending Soon
**Webhook:** `customer.subscription.trial_will_end`

**Verify:**
- [ ] Event logged (currently just logs, no action)

**CLI trigger:**
```bash
stripe trigger customer.subscription.trial_will_end
```

### 2.3 Trial Expired → First Charge
**Trigger:** Trial period ends, first payment processes

**Verify:**
- [ ] `stripe_subscription_status` = 'Active'
- [ ] `trial_end` remains set (historical)
- [ ] `current_period_start` = trial_end date

---

## 3. Subscription Updates

### 3.1 Subscription Updated (General)
**Webhook:** `customer.subscription.updated`

**Verify:**
- [ ] `current_period_start` updated
- [ ] `current_period_end` updated
- [ ] `has_payment_method` accurate
- [ ] `cancel_at_period_end` accurate
- [ ] `is_active` accurate

**CLI trigger:**
```bash
stripe trigger customer.subscription.updated
```

### 3.2 Quantity/Seats Changed
**Trigger:** Add or remove team members

**Verify:**
- [ ] `number_of_active_users` matches new quantity
- [ ] Proration invoice created (check Stripe dashboard)

---

## 4. Payment Events

### 4.1 Payment Succeeded
**Webhook:** `invoice.payment_succeeded`

**Verify:**
- [ ] Event logged
- [ ] If was past_due, subscription continues

**CLI trigger:**
```bash
stripe trigger invoice.payment_succeeded
```

### 4.2 Payment Failed
**Webhook:** `invoice.payment_failed`

**Verify:**
- [ ] `access_blocked` = true
- [ ] `access_blocked_reason` = 'Payment failed'
- [ ] Paywall shows in app

**CLI trigger:**
```bash
stripe trigger invoice.payment_failed
```

**Test card for decline:**
```
4000000000000002
```

### 4.3 Invoice Paid (Restores Access)
**Webhook:** `invoice.paid`

**Verify:**
- [ ] `access_blocked` = false
- [ ] `access_blocked_reason` = null
- [ ] Paywall removed

**CLI trigger:**
```bash
stripe trigger invoice.paid
```

---

## 5. Cancellation Flow

### 5.1 Cancel at Period End
**Trigger:** User clicks "Cancel Subscription" in app

**Verify:**
- [ ] `cancel_at_period_end` = true
- [ ] `is_active` = true (still active until period end)
- [ ] UI shows "Canceling on [date]"

### 5.2 Subscription Deleted (Period Ended)
**Webhook:** `customer.subscription.deleted`

**Verify:**
- [ ] `stripe_subscription_status` = 'Canceled'
- [ ] `is_active` = false
- [ ] Paywall shows

**CLI trigger:**
```bash
stripe trigger customer.subscription.deleted
```

---

## 6. Resume/Reactivate Flow

### 6.1 Resume Before Period End
**Trigger:** User clicks "Resume Subscription" while canceling

**Verify:**
- [ ] `cancel_at_period_end` = false
- [ ] `is_active` = true
- [ ] UI returns to normal subscription view

### 6.2 Resubscribe After Canceled
**Trigger:** User goes through checkout again after full cancellation

**Verify:**
- [ ] New `stripe_subscription_id` created
- [ ] `stripe_subscription_status` = 'Active'
- [ ] `is_active` = true

---

## 7. Pause/Resume Flow

### 7.1 Subscription Paused
**Webhook:** `customer.subscription.paused`

**Verify:**
- [ ] `stripe_subscription_status` = 'Paused'
- [ ] `is_active` = false

**CLI trigger:**
```bash
stripe trigger customer.subscription.paused
```

### 7.2 Subscription Resumed
**Webhook:** `customer.subscription.resumed`

**Verify:**
- [ ] `stripe_subscription_status` = 'Active'
- [ ] `is_active` = true

**CLI trigger:**
```bash
stripe trigger customer.subscription.resumed
```

---

## 8. Payment Method Events

### 8.1 Payment Method Attached
**Webhook:** `payment_method.attached`

**Verify:**
- [ ] `has_payment_method` = true

**CLI trigger:**
```bash
stripe trigger payment_method.attached
```

### 8.2 Payment Method Detached
**Webhook:** `payment_method.detached`

**Verify:**
- [ ] `has_payment_method` = false (if no other cards)

---

## 9. Seat Management Tests

### 9.1 Invite Team Member (Owner)
**Steps:**
1. Go to Settings → Team
2. Click "Invite Member"
3. Enter email, select role
4. Click "Add"

**Verify:**
- [ ] InviteBillingConfirmDialog shows
- [ ] Shows correct price (+$20 per user)
- [ ] Shows 24-hour expiration warning

### 9.2 Accept Invite (New Member)
**Steps:**
1. Check email for invite
2. Click invite link
3. Create account or sign in

**Verify:**
- [ ] Member added with status 'Active'
- [ ] `number_of_active_users` incremented
- [ ] Stripe quantity updated (check Stripe dashboard)
- [ ] Proration charge created

### 9.3 Remove Team Member
**Steps:**
1. Go to Settings → Team
2. Click remove on a member

**Verify:**
- [ ] Member status changed to 'Removed'
- [ ] `number_of_active_users` decremented
- [ ] Stripe quantity updated
- [ ] Proration credit applied

---

## 10. Paywall Tests

### 10.1 Access Blocked - Payment Failed
**Setup:** Trigger `invoice.payment_failed`

**Verify:**
- [ ] Owner sees paywall with "Payment failed" message
- [ ] Owner can access Settings → Billing
- [ ] Owner sees "Update Payment Method" option
- [ ] Non-owner sees "Contact your organization owner"

### 10.2 Access Blocked - Subscription Canceled
**Setup:** Trigger `customer.subscription.deleted`

**Verify:**
- [ ] All users see paywall
- [ ] Owner can access billing to resubscribe
- [ ] Non-owners fully blocked

### 10.3 Access Blocked - Trial Expired
**Setup:** Set `trial_end` to past date, no payment method

**Verify:**
- [ ] Paywall shows "Trial expired"
- [ ] Owner can upgrade
- [ ] Non-owners see contact message

---

## 11. UI Tests

### 11.1 BillingTab - Active Subscription
**Verify:**
- [ ] Shows current plan name
- [ ] Shows billing cycle progress bar
- [ ] Shows next billing date
- [ ] Shows seat count
- [ ] "Manage Plan" button works

### 11.2 BillingTab - Trialing
**Verify:**
- [ ] Shows "Free Trial" label
- [ ] Shows trial progress bar
- [ ] Shows days remaining
- [ ] "Upgrade" button works

### 11.3 BillingTab - Canceling
**Verify:**
- [ ] Shows "Canceling on [date]"
- [ ] Shows "Resume Subscription" button
- [ ] Resume button works

### 11.4 Billing History
**Verify:**
- [ ] Shows invoice list
- [ ] Invoices are clickable
- [ ] Shows correct amounts

---

## Test Cards Reference

| Scenario | Card Number |
|----------|-------------|
| Success | 4242424242424242 |
| Decline | 4000000000000002 |
| Insufficient funds | 4000000000009995 |
| Expired card | 4000000000000069 |
| Requires auth (3DS) | 4000002500003155 |

**For all cards:**
- Expiry: Any future date (e.g., 12/34)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 12345)

---

## Webhook Event Checklist

Run each and verify no errors in Stripe CLI output:

```bash
# Core subscription events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted

# Trial events
stripe trigger customer.subscription.trial_will_end

# Payment events
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
stripe trigger invoice.paid
stripe trigger invoice.finalized

# Payment intent events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed

# Charge events
stripe trigger charge.succeeded
stripe trigger charge.failed
stripe trigger charge.refunded

# Payment method events
stripe trigger payment_method.attached

# Pause/resume
stripe trigger customer.subscription.paused
stripe trigger customer.subscription.resumed
```

---

## Debugging Tips

1. **Check Stripe CLI output** for webhook responses
2. **Check Supabase Edge Function logs** in Supabase dashboard
3. **Check database** directly in Supabase Table Editor
4. **Check browser console** for React Query errors
5. **Use Stripe Dashboard** → Developers → Events to see all events
