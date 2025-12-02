# Billing System Sprint Plan

## Executive Summary

This document outlines the complete billing flow implementation for WallQu's seat-based subscription system at **$20/user/month**.

---

## Current State Analysis

### ✅ What We Have (Working)

| Feature | Status | Location |
|---------|--------|----------|
| Subscription DB schema | Complete | `supabase/migrations/20251005000002_stripe_first_billing.sql` |
| Stripe webhook handler | Working | `supabase/functions/stripe-webhook/index.ts` |
| Stripe service (client) | Working | `src/services/stripeService.ts` |
| BillingTab UI | Working (needs refactor) | `src/components/features/settings/BillingTab.tsx` |
| SubscriptionPaywall | Working | `src/components/common/SubscriptionPaywall.tsx` |
| Edge Functions | Most implemented | `supabase/functions/` |
| Invoice history display | Working | BillingTab |
| Manage Plan dialog | Working | BillingTab |
| Cancel subscription | Working | `cancel-subscription` Edge Function |
| Reactivate subscription | Edge function exists | `reactivate-subscription` (UI commented out) |

### ⚠️ What Needs Modification

| Feature | Issue | Action Needed |
|---------|-------|---------------|
| Trial enrollment | Creates Stripe sub immediately | Change to local-only until upgrade |
| Seat sync | Manual only | Add automatic sync on member status change |
| BillingTab | 1,487 lines | Extract into smaller components |
| Progress bar | Shows trial OR billing | Needs proper reset on new billing cycle |
| Resume subscription | UI commented out | Re-enable in UI |
| Billing history | Shows all invoices | Filter to only show cycle invoices, not prorations |

### ❌ What's Missing

| Feature | Priority | Sprint |
|---------|----------|--------|
| Local-only trial enrollment | High | Sprint 1 |
| Trial reminder system | High | Sprint 1 |
| Automatic seat sync on member join | High | Sprint 2 |
| Progress bar cycle reset logic | Medium | Sprint 2 |
| Payment failure notifications | Medium | Sprint 2 |
| Invoice filtering (cycle only) | Low | Sprint 3 |

---

## Flow Logic Implementation

### 1. Trial Flow

#### 1.1 New User/Owner Signup → Free Trial

**Current Behavior:** Creates Stripe subscription with 14-day trial immediately

**Target Behavior:** Local-only trial, no Stripe involvement until upgrade

```
User Signs Up
    ↓
Create Organization
    ↓
Create Subscription Record (LOCAL ONLY):
    - stripe_subscription_status: 'Trialing'
    - is_active: TRUE
    - trial_start: NOW()
    - trial_end: NOW() + 14 days
    - has_payment_method: FALSE
    - stripe_customer_id: NULL (no Stripe yet)
    - stripe_subscription_id: NULL (no Stripe yet)
    ↓
Mark Organization:
    - has_used_trial: TRUE
    ↓
User Has Access for 14 Days
```

**Database Changes:**
```sql
-- No changes needed, fields exist
-- Just need to NOT call Stripe on signup
```

**Code Changes:**
- Modify `src/services/organizationService.ts` → `createOrganization()` to create local subscription
- Remove call to `create-trial-subscription` Edge Function on signup
- Add local subscription record creation

---

#### 1.2 Trial Reminders & Upgrade Flow

**Reminder Schedule:**
| Day | Trigger | Message |
|-----|---------|---------|
| 7 | Trial halfway | "7 days left - explore features" |
| 3 | Trial ending soon | "3 days left - add payment to continue" |
| 1 | Trial ends tomorrow | "Trial ends tomorrow!" |
| 0 | Trial expired | "Trial expired - upgrade now" |
| -1 to -3 | Grace period | "Access expires in X days" |

**Reminder Locations:**
1. **AppSidebar** - Trial card (exists, needs enhancement)
2. **Dashboard** - Trial status card (exists)
3. **Toast notifications** - Using `useTrialReminder` hook (exists, needs scheduling)

**Upgrade Flow:**
```
Owner clicks "Upgrade" (Sidebar or BillingTab)
    ↓
Opens Stripe Checkout (stripe-handler Edge Function)
    - Creates Stripe Customer (if not exists)
    - Creates Stripe Subscription with trial_end set to current trial_end
    ↓
User enters payment info in Stripe Checkout
    ↓
Webhook: checkout.session.completed
    - Updates subscription record:
      - stripe_customer_id: [from Stripe]
      - stripe_subscription_id: [from Stripe]
      - has_payment_method: TRUE
    ↓
User returns to app
    ↓
Still in trial until trial_end
    ↓
Trial ends → First charge → Billing cycle starts
```

**Key Point:** User is NOT charged until `trial_end` passes. Adding payment just ensures automatic conversion.

---

### 2. Seat Management Flow

#### 2.1 Owner Invites Users

**Current Flow:** InviteBillingConfirmDialog shows pricing confirmation ✅

**Target Flow:**
```
Owner clicks "Invite Members" in TeamTab
    ↓
InviteBillingConfirmDialog opens
    - Step 1: Add emails (email + role + Add button)
    - Step 2: Confirmation shows:
      - List of emails
      - "2 team members × $20/month = +$40/month"
      - "Prorated charge for current billing period"
      - "Invites expire in 24 hours"
    ↓
Owner confirms → Invites sent
    ↓
Invitee accepts → Creates membership with status: 'Active'
    ↓
DB Trigger: update_subscription_user_count()
    - Increments number_of_active_users
    - Sets stripe_quantity_pending_sync: TRUE
    ↓
Frontend calls manage-seats Edge Function
    - Updates Stripe subscription quantity
    - Stripe prorates automatically
    ↓
Webhook: customer.subscription.updated
    - Syncs new quantity
    - Clears stripe_quantity_pending_sync
```

**Important:** Only **Active** members count. Pending invites don't trigger charges.

---

#### 2.2 Adding/Removing Members - Proration

**Adding a Member Mid-Cycle:**
```
Jan 1: Start with 2 users → $40/month charged
Jan 15: Add 1 user (midway)
    ↓
Stripe calculates proration:
    - Daily rate: $20 ÷ 31 days = $0.645/user/day
    - Days remaining: 16 (Jan 15-31)
    - Proration charge: $0.645 × 16 = $10.32
    ↓
Immediate charge: $10.32
Feb 1: Full charge for 3 users: $60
```

**Removing a Member Mid-Cycle:**
```
Jan 15: Remove 1 user (3 → 2 users)
    ↓
Stripe calculates credit:
    - Credit: $0.645 × 16 = $10.32
    ↓
Credit applied to account balance
    ↓
Member loses access IMMEDIATELY
Feb 1: Full charge for 2 users: $40 - $10.32 credit = $29.68
```

**Code:** `manage-seats` Edge Function handles this with `proration_behavior: 'always_invoice'`

---

#### 2.3 Cancel Subscription

**Flow:**
```
Owner clicks "Cancel Subscription" in Manage Plan
    ↓
Confirmation dialog: "You'll have access until [period_end]"
    ↓
Calls cancel-subscription Edge Function
    - Sets cancel_at_period_end: TRUE in Stripe
    ↓
Webhook: customer.subscription.updated
    - Updates local: cancel_at_period_end: TRUE
    ↓
UI shows: "Subscription canceling on [date]"
    ↓
Period ends → Webhook: customer.subscription.deleted
    - stripe_subscription_status: 'Canceled'
    - is_active: FALSE
    - access_blocked: TRUE
    - access_blocked_reason: 'Subscription canceled'
    ↓
Paywall displayed for all users
```

**No proration on cancellation** - user keeps access until period end.

---

#### 2.4 Resume Subscription Before Period Ends

**Flow:**
```
Owner sees "Canceling on [date]" banner
    ↓
Clicks "Resume Subscription"
    ↓
Calls reactivate-subscription Edge Function
    - Removes cancel_at_period_end in Stripe
    ↓
Webhook: customer.subscription.updated
    - cancel_at_period_end: FALSE
    ↓
UI updates: Normal subscription view
    ↓
Billing continues as normal
```

**Code:** Edge Function exists, need to re-enable UI button.

---

#### 2.5 Faulty Payment Method

**Detection Flow:**
```
Billing date arrives
    ↓
Stripe attempts charge → FAILS
    ↓
Webhook: invoice.payment_failed
    - stripe_subscription_status: 'past_due'
    - access_blocked: TRUE
    - access_blocked_reason: 'Payment failed'
    ↓
Paywall displayed with message:
    "Payment failed. Please update your payment method."
    ↓
Owner clicks "Update Payment Method"
    ↓
Opens Stripe Customer Portal (create-portal-session)
    ↓
Owner updates card
    ↓
Stripe retries charge → SUCCESS
    ↓
Webhook: invoice.payment_succeeded
    - access_blocked: FALSE
    - stripe_subscription_status: 'active'
    ↓
Paywall removed, access restored
```

---

#### 2.6 Blocked Access - Paywall Display

**Blocking Conditions:**
| Condition | Blocked? | Message |
|-----------|----------|---------|
| `access_blocked = TRUE` | Yes | Shows `access_blocked_reason` |
| `stripe_subscription_status = 'canceled'` | Yes | "Subscription canceled" |
| `stripe_subscription_status = 'past_due'` | Yes | "Payment failed" |
| `stripe_subscription_status = 'unpaid'` | Yes | "Payment required" |
| Trial expired + no payment | Yes | "Trial expired" |
| Grace period expired | Yes | "Add payment method" |

**Owner View:**
- Billing section accessible
- Sign out accessible
- All other features blocked

**Non-Owner View:**
- Everything blocked
- Message: "Please contact your organization owner"

---

#### 2.7 UI - Plan & Billing Settings Tab

**Current State:** BillingTab.tsx has most features but needs refinement

**Progress Bar Logic:**
```typescript
// Determine what period to show
if (subscription.stripe_subscription_status === 'trialing') {
  // Show trial progress
  startDate = subscription.trial_start;
  endDate = subscription.trial_end;
  label = "Free Trial";
} else if (subscription.stripe_subscription_status === 'active') {
  // Show billing cycle progress
  startDate = subscription.current_period_start;
  endDate = subscription.current_period_end;
  label = "Current Billing Period";
}

// Calculate progress percentage
const totalDays = daysBetween(startDate, endDate);
const elapsedDays = daysBetween(startDate, now);
const progressPercent = (elapsedDays / totalDays) * 100;
```

**Automatic Renewal Display:**
- Webhook `customer.subscription.updated` receives new `current_period_start` and `current_period_end`
- These are synced to database automatically
- UI reads from database via React Query
- Progress bar automatically shows new cycle

**Manage Plan Button:**
| State | Button Text | Action |
|-------|-------------|--------|
| Trialing | "Upgrade" | Opens Stripe Checkout |
| Active | "Manage Plan" | Opens Manage Plan dialog |
| Canceling | "Resume" | Calls reactivate-subscription |
| Canceled | "Resubscribe" | Opens Stripe Checkout |

**Billing History Filtering:**
```typescript
// Filter to only show cycle invoices, not prorations
const cycleInvoices = invoices.filter(inv =>
  inv.billing_reason === 'subscription_cycle' ||
  inv.billing_reason === 'subscription_create'
);
```

---

## Sprint Breakdown

### Sprint 1: Trial System (Foundation)
**Duration:** 3-5 days

| Task | Priority | Complexity |
|------|----------|------------|
| 1.1 Modify signup to create local-only subscription | High | Medium |
| 1.2 Remove automatic Stripe subscription on signup | High | Low |
| 1.3 Update `createOrganization` service | High | Medium |
| 1.4 Implement trial progress bar reset logic | High | Low |
| 1.5 Add trial reminder toasts (day 7, 3, 1) | Medium | Medium |
| 1.6 Enhance AppSidebar trial card | Medium | Low |

**Deliverables:**
- [ ] New users get 14-day local trial without Stripe involvement
- [ ] Trial reminders appear at correct intervals
- [ ] Progress bar shows trial countdown correctly

---

### Sprint 2: Seat Management & Sync
**Duration:** 5-7 days

| Task | Priority | Complexity |
|------|----------|------------|
| 2.1 Automatic seat sync when member becomes Active | High | Medium |
| 2.2 InviteBillingConfirmDialog (already done ✅) | High | Done |
| 2.3 Re-enable Resume subscription UI | High | Low |
| 2.4 Add seat change confirmation before removal | Medium | Medium |
| 2.5 Display proration estimate in UI | Low | High |

**Deliverables:**
- [ ] Seats auto-sync to Stripe when members join/leave
- [ ] Resume subscription button working
- [ ] Confirmation shows pricing impact

---

### Sprint 3: Billing UI Polish
**Duration:** 3-5 days

| Task | Priority | Complexity |
|------|----------|------------|
| 3.1 Filter billing history to cycle invoices only | Medium | Low |
| 3.2 Extract BillingTab into smaller components | Medium | Medium |
| 3.3 Add billing period auto-renewal display | Medium | Low |
| 3.4 Improve Manage Plan dialog | Low | Low |
| 3.5 Add payment method status indicator | Low | Low |

**Deliverables:**
- [ ] Clean billing history (no proration line items)
- [ ] BillingTab under 500 lines
- [ ] Progress bar resets correctly each cycle

---

### Sprint 4: Payment Failures & Recovery
**Duration:** 3-5 days

| Task | Priority | Complexity |
|------|----------|------------|
| 4.1 Payment failure notification banner | High | Low |
| 4.2 "Update Payment Method" button in paywall | High | Low |
| 4.3 Retry status display | Medium | Medium |
| 4.4 Email notifications for payment failures | Low | High |

**Deliverables:**
- [ ] Clear messaging when payment fails
- [ ] Easy path to update payment method
- [ ] Access restored automatically on successful retry

---

## Database Schema (Current - No Changes Needed)

```sql
-- subscriptions table (already exists)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  organization_id UUID UNIQUE REFERENCES organizations(id),
  plan_id UUID REFERENCES subscription_plans(id),

  -- Stripe Data (NULL during trial-only)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_subscription_status TEXT,  -- 'trialing', 'active', 'canceled', 'past_due'

  -- Seat Management
  number_of_active_users INTEGER DEFAULT 0,
  stripe_quantity_pending_sync BOOLEAN DEFAULT FALSE,

  -- Billing Periods
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- Payment
  has_payment_method BOOLEAN DEFAULT FALSE,
  billing_interval TEXT DEFAULT 'Monthly',

  -- Subscription Control
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Access Control
  access_blocked BOOLEAN DEFAULT FALSE,
  access_blocked_reason TEXT
);

-- organizations table addition (already exists)
ALTER TABLE organizations
ADD COLUMN has_used_trial BOOLEAN DEFAULT FALSE;
```

---

## Key Files to Modify

| File | Changes |
|------|---------|
| `src/services/organizationService.ts` | Add local subscription creation on signup |
| `src/hooks/queries/useOrganization.ts` | Add `useInviteMember` seat sync call |
| `src/components/features/settings/BillingTab.tsx` | Filter invoices, extract components |
| `src/components/common/SubscriptionPaywall.tsx` | Add "Update Payment Method" for payment failures |
| `src/components/features/settings/TeamTab.tsx` | Automatic seat sync on member activation |
| `supabase/functions/stripe-handler/index.ts` | Handle trial-to-paid conversion |

---

## Testing Checklist

### Trial Flow
- [ ] New signup creates local subscription (no Stripe)
- [ ] Trial countdown shows correctly
- [ ] Trial reminders appear at day 7, 3, 1
- [ ] Upgrade creates Stripe subscription with correct trial_end
- [ ] First charge happens after trial_end

### Seat Management
- [ ] Invite dialog shows correct pricing
- [ ] Pending invites don't trigger charges
- [ ] Active members trigger seat sync
- [ ] Removed members lose access immediately
- [ ] Proration charges/credits applied correctly

### Subscription Lifecycle
- [ ] Cancel keeps access until period end
- [ ] Resume removes cancel_at_period_end
- [ ] Payment failure blocks access
- [ ] Payment success restores access
- [ ] Billing cycle resets progress bar

### Paywall
- [ ] Blocked users see paywall
- [ ] Owner can access billing
- [ ] Non-owners see contact message
- [ ] Payment method update link works

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Trial-to-paid conversion | Track % |
| Average seats per org | Monitor growth |
| Payment failure recovery | < 48 hours |
| Churn rate | Track cancellations |
| Support tickets (billing) | Minimize |
