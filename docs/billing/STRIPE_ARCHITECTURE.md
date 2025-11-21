# Stripe Billing Architecture - Complete Overview

**Last Updated:** 2025-11-20
**Status:** 60% Complete
**Target:** 95% Complete (1-2 weeks)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Pricing Model](#pricing-model)
3. [Current Implementation Status](#current-implementation-status)
4. [Architecture Components](#architecture-components)
5. [Database Schema](#database-schema)
6. [User Journey Maps](#user-journey-maps)
7. [State Management](#state-management)
8. [Seat Syncing System](#seat-syncing-system)
9. [Proration System](#proration-system)
10. [Idempotency](#idempotency)
11. [Security & Access Control](#security--access-control)
12. [Critical Gaps](#critical-gaps)
13. [Environment Variables](#environment-variables)

---

## Executive Summary

### What We Have ✅

- **Stripe-First Architecture** - Stripe is the source of truth for all billing data
- **Seat-Based Pricing** - $20/user/month (1-100+ users)
- **Auto-Trial System** - 14-day free trial with 3-day grace period
- **Complete UI** - BillingTab and SubscriptionPaywall components
- **10 Edge Functions** - Webhook, seats, trial, portal, cancel, etc.
- **Realtime Updates** - Supabase subscriptions for instant UI sync
- **React Query** - Data fetching and server state management
- **Database Triggers** - Automatic local seat count updates

### What We Need ❌

1. **Webhook Deployment** (BLOCKING) - Edge Function exists but not deployed
2. **Automated Seat Sync** - Currently manual, needs automation
3. **Scheduled Sync Job** - Hourly cron job to prevent drift
4. **Proration Testing** - End-to-end validation needed
5. **Real Stripe Products** - Currently using placeholder IDs

---

## Pricing Model

### Simple Per-User Pricing

**Plan:** Team Plan (Only)
**Price:** $20/user/month
**Minimum:** 1 user
**Maximum:** Unlimited

```
1 user  = $20/month
2 users = $40/month
5 users = $100/month
10 users = $200/month
100 users = $2,000/month
```

**No Tiers, No Discounts** - Linear pricing at all scales

### Key Characteristics

- **Metered Billing** - Quantity changes take effect immediately with proration
- **Pay As You Grow** - Add users anytime, pay for what you use
- **No Minimum Commitment** - Can start with 1 user
- **Automatic Scaling** - System handles 1 to 1000+ users seamlessly

---

## Current Implementation Status

### Service Layer (`/src/services/stripeService.ts`)

**✅ Complete and Well-Designed**

```typescript
// Key Functions:
stripeService.getPlans()                    // Fetch available plans
stripeService.getSubscription(orgId)        // Get org subscription
stripeService.hasValidSubscription(orgId)   // Check access (with grace period)
stripeService.calculateSubscriptionQuantity(orgId) // Count active users
stripeService.createCheckoutSession()       // Stripe Checkout redirect
stripeService.createPortalSession()         // Customer Portal redirect
stripeService.createTrialSubscription()     // Auto-enroll in 14-day trial
```

**Philosophy:** "Stripe is the source of truth for ALL billing data"

---

### Edge Functions (`/supabase/functions/`)

**✅ Comprehensive Implementation**

| Function | Status | Purpose |
|----------|--------|---------|
| `stripe-webhook` | ⚠️ Not Deployed | Handles all Stripe webhook events |
| `create-trial-subscription` | ✅ Working | Auto-enrolls orgs in 14-day trial |
| `manage-seats` | ✅ Working | Updates Stripe subscription quantity |
| `create-portal-session` | ✅ Working | Creates Customer Portal session |
| `cancel-subscription` | ✅ Working | Cancels subscription at period end |
| `reactivate-subscription` | ✅ Working | Reactivates cancelled subscription |
| `pause-subscription` | ✅ Working | Pauses subscription (UI disabled) |
| `resume-subscription` | ✅ Working | Resumes paused subscription |
| `get-invoices` | ✅ Working | Fetches invoices from Stripe |
| `sync-stripe-quantities` | ⚠️ Not Scheduled | Scheduled sync for quantity drift |

**Webhook Events Handled:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `payment_method.attached`
- `payment_method.detached`

---

### UI Components

#### BillingTab (`/src/components/features/settings/BillingTab.tsx`)

**✅ Complete - 1444 lines**

**Features:**
- Plan cards with pricing display
- Subscription status and countdown
- Trial period progress bar
- Grace period warnings
- Invoice history table with bulk download
- Cancel/reactivate subscription dialogs
- LocalStorage caching (5min TTL)
- Realtime Supabase subscriptions

**Cache Keys:**
```typescript
'billing_subscription_cache'  // Subscription details
'billing_user_count_cache'    // Active user count
'billing_invoices_cache'      // Invoice list
'billing_plans_cache'         // Available plans
```

#### SubscriptionPaywall (`/src/components/common/SubscriptionPaywall.tsx`)

**✅ Complete - 456 lines**

**Strategy:** Validate-first approach
- Shows loading spinner (200ms)
- Validates subscription
- Shows definitive UI (content or paywall)
- Realtime handles future changes

**Access Checks:**
```typescript
// Valid statuses
'active'    // Paid subscription
'trialing'  // In trial period

// Blocked statuses
'canceled'      // Subscription ended
'past_due'      // Payment failed
'access_blocked' // Manual override
```

**Grace Period Logic:**
```typescript
if (isExpired && !hasPaymentMethod) {
  const gracePeriodEnd = trialEnd + 3 days;
  const inGracePeriod = now <= gracePeriodEnd;

  if (inGracePeriod) {
    return { isValid: true, inGracePeriod: true };
  }
}
```

---

## Architecture Components

### Data Flow

```
User Action
    ↓
Frontend (React)
    ↓
Zustand Store / React Query
    ↓
Supabase Client
    ↓
Edge Function (Service Role)
    ↓
Stripe API
    ↓
Webhook Event
    ↓
stripe-webhook Edge Function
    ↓
Supabase Database
    ↓
Realtime Subscription
    ↓
Frontend Auto-Updates
```

### Stripe-First Philosophy

**Stripe = Source of Truth**
```
Stripe Subscription
    ↓ (webhook)
Local Database (cache only)
    ↓ (realtime)
Frontend UI
```

**Benefits:**
- No data inconsistencies
- Stripe handles billing logic
- Local DB is just a read replica
- Webhooks keep everything in sync

---

## Database Schema

### Core Tables

#### `subscription_plans`

```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,              -- 'Individual', 'Team'
  display_name TEXT NOT NULL,
  description TEXT,
  stripe_product_id TEXT NOT NULL,
  stripe_price_id_monthly TEXT NOT NULL,
  stripe_price_id_yearly TEXT,
  price_per_month NUMERIC(10,2) NOT NULL,
  price_per_yearly NUMERIC(10,2),
  min_users INTEGER DEFAULT 1,
  max_users INTEGER,
  features JSONB NOT NULL,                -- { features: [...], per_user_pricing: bool }
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Current Plan:**
```sql
-- Team Plan (Only Plan)
name: 'Team'
price: $20/user/month
min_users: 1
max_users: null (unlimited)
per_user_pricing: true
stripe_usage_type: 'licensed' (metered billing)

-- Pricing Examples:
-- 1 user  = $20/month
-- 2 users = $40/month
-- 5 users = $100/month
-- 10 users = $200/month
```

#### `subscriptions`

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id),
  plan_id UUID REFERENCES subscription_plans(id),

  -- Stripe Data
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_subscription_status TEXT,        -- 'Active', 'Trialing', 'Canceled', etc.

  -- Seat Management
  number_of_active_users INTEGER DEFAULT 0,
  stripe_quantity_pending_sync BOOLEAN DEFAULT FALSE,

  -- Billing Periods
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- Payment Status
  has_payment_method BOOLEAN DEFAULT FALSE,
  billing_interval TEXT DEFAULT 'Monthly', -- 'Monthly', 'Yearly'

  -- Subscription Control
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  pause_at_period_end BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Access Control
  access_blocked BOOLEAN DEFAULT FALSE,
  access_blocked_reason TEXT,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `subscription_seat_usage_events`

```sql
CREATE TABLE subscription_seat_usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  event_type TEXT NOT NULL,               -- 'seat_added', 'seat_removed', 'seat_count_updated'
  previous_seat_count INTEGER,
  new_seat_count INTEGER,
  triggered_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Audit trail for all seat changes

#### `organizations` Extension

```sql
ALTER TABLE organizations
ADD COLUMN has_used_trial BOOLEAN DEFAULT FALSE;
```

**Purpose:** Prevent multiple trials per organization

---

### Field Explanations & Paywall Logic

#### `subscription_plans` Table - Field Breakdown

| Field | Type | Purpose | Example Value |
|-------|------|---------|---------------|
| `id` | UUID | Primary key for the plan | `550e8400-e29b-41d4-a716-...` |
| `name` | TEXT | Internal identifier (unique) | `'Team'` |
| `display_name` | TEXT | User-facing name shown in UI | `'Team Plan'` |
| `description` | TEXT | Marketing description | `'$20/user/month for unlimited users'` |
| `stripe_product_id` | TEXT | Stripe Product ID | `'prod_ABC123'` |
| `stripe_price_id_monthly` | TEXT | Stripe Price ID for monthly billing | `'price_XYZ789'` |
| `stripe_price_id_yearly` | TEXT | Stripe Price ID for yearly billing (nullable) | `null` (not used currently) |
| `price_per_month` | NUMERIC | Monthly price per user | `20.00` |
| `price_per_yearly` | NUMERIC | Yearly price per user (nullable) | `null` (not used currently) |
| `min_users` | INTEGER | Minimum users allowed | `1` |
| `max_users` | INTEGER | Maximum users (null = unlimited) | `null` |
| `features` | JSONB | Plan features and configuration | `{"features": ["Unlimited quotes", "PDF export"], "per_user_pricing": true}` |
| `is_active` | BOOLEAN | Whether plan is available for signup | `true` |
| `sort_order` | INTEGER | Display order in pricing page | `0` |
| `created_at` | TIMESTAMPTZ | When plan was created | `2025-01-15 10:30:00+00` |
| `updated_at` | TIMESTAMPTZ | Last update timestamp | `2025-01-20 14:22:00+00` |

**Usage in Application:**
- **BillingTab**: Displays available plans from `subscription_plans` where `is_active = true`
- **Pricing Calculations**: Uses `price_per_month` and `features.per_user_pricing` to calculate costs
- **Stripe Integration**: Uses `stripe_product_id` and `stripe_price_id_monthly` to create subscriptions

#### `subscriptions` Table - Field Breakdown

| Field | Type | Purpose | Paywall Impact | Example Value |
|-------|------|---------|----------------|---------------|
| `id` | UUID | Primary key | None | `550e8400-e29b-41d4-a716-...` |
| `organization_id` | UUID | Links to organization (UNIQUE) | **Paywall checks this to find subscription** | `org_123` |
| `plan_id` | UUID | Links to subscription_plans | Determines features available | `plan_456` |
| **Stripe Data** |
| `stripe_customer_id` | TEXT | Stripe Customer ID | Used to open billing portal | `'cus_ABC123'` |
| `stripe_subscription_id` | TEXT | Stripe Subscription ID | Used to update/cancel subscription | `'sub_XYZ789'` |
| `stripe_subscription_status` | TEXT | **Stripe status** | **CRITICAL: Paywall checks this** | `'Active'`, `'Trialing'`, `'Canceled'`, `'Past Due'` |
| **Seat Management** |
| `number_of_active_users` | INTEGER | Current active members | Used to calculate billing quantity | `5` |
| `stripe_quantity_pending_sync` | BOOLEAN | Needs sync with Stripe | Triggers seat sync job | `false` |
| **Billing Periods** |
| `current_period_start` | TIMESTAMPTZ | Current billing period start | Displayed in UI | `2025-01-01 00:00:00+00` |
| `current_period_end` | TIMESTAMPTZ | Current billing period end | Shows "Next billing date" | `2025-02-01 00:00:00+00` |
| `trial_start` | TIMESTAMPTZ | Trial start date | Used to calculate trial progress | `2025-01-01 00:00:00+00` |
| `trial_end` | TIMESTAMPTZ | **Trial expiration date** | **Paywall checks this** | `2025-01-15 00:00:00+00` |
| **Payment Status** |
| `has_payment_method` | BOOLEAN | **Has valid payment method** | **Paywall checks this during trial** | `true` |
| `billing_interval` | TEXT | Monthly or Yearly | Displayed in UI | `'Monthly'` |
| **Subscription Control** |
| `cancel_at_period_end` | BOOLEAN | Will cancel at period end | Shows "Canceling" badge in UI | `false` |
| `pause_at_period_end` | BOOLEAN | Will pause at period end | Shows "Pausing" badge in UI | `false` |
| `is_active` | BOOLEAN | Subscription is active | **Paywall checks this** | `true` |
| **Access Control** |
| `access_blocked` | BOOLEAN | **User access is blocked** | **PRIMARY PAYWALL CHECK** | `false` |
| `access_blocked_reason` | TEXT | **Why access is blocked** | **Shown in paywall UI** | `'Payment failed'`, `'Trial expired'`, `null` |
| **Other** |
| `metadata` | JSONB | Extra data (flexible) | Custom tracking | `{}` |
| `created_at` | TIMESTAMPTZ | Subscription created | Audit trail | `2025-01-01 00:00:00+00` |
| `updated_at` | TIMESTAMPTZ | Last updated | Change tracking | `2025-01-20 14:22:00+00` |

---

### Paywall Logic - How It Works

#### The Paywall Component

**File:** `/src/components/common/SubscriptionPaywall.tsx`

**Primary Check:**
```typescript
// 1. Fetch subscription for current organization
const { data: subscription } = useQuery({
  queryKey: ['subscription', organizationId],
  queryFn: () => stripeService.getSubscription(organizationId)
});

// 2. Check access_blocked field
if (subscription?.access_blocked) {
  return <PaywallUI reason={subscription.access_blocked_reason} />;
}

// 3. If not blocked, allow access
return <>{children}</>;
```

**What the Paywall Checks (in order):**

1. **Does organization have a subscription?**
   ```sql
   SELECT * FROM subscriptions WHERE organization_id = ?
   ```
   - No subscription → Show signup flow
   - Has subscription → Continue checks

2. **Is access explicitly blocked?**
   ```sql
   SELECT access_blocked, access_blocked_reason FROM subscriptions
   WHERE organization_id = ?
   ```
   - `access_blocked = true` → **BLOCK ACCESS**, show reason
   - `access_blocked = false` → Continue checks

3. **What's the subscription status?**
   ```sql
   SELECT stripe_subscription_status FROM subscriptions
   WHERE organization_id = ?
   ```
   - `'Active'` → **ALLOW ACCESS** ✅
   - `'Trialing'` → Check trial expiration (continue)
   - `'Past Due'` → **BLOCK ACCESS** (payment failed) ❌
   - `'Canceled'` → **BLOCK ACCESS** ❌
   - `'Unpaid'` → **BLOCK ACCESS** ❌

4. **If Trialing, check trial expiration:**
   ```sql
   SELECT trial_end, has_payment_method FROM subscriptions
   WHERE organization_id = ?
   AND stripe_subscription_status = 'Trialing'
   ```
   - `trial_end > NOW()` → **ALLOW ACCESS** ✅ (trial active)
   - `trial_end < NOW()` AND `has_payment_method = true` → **ALLOW ACCESS** ✅ (grace period, has card)
   - `trial_end < NOW()` AND `has_payment_method = false` → **BLOCK ACCESS** ❌ (trial expired, no card)

5. **Grace Period (3 days after trial):**
   ```typescript
   const gracePeriodDays = 3;
   const trialEndDate = new Date(subscription.trial_end);
   const gracePeriodEnd = new Date(trialEndDate.getTime() + (gracePeriodDays * 24 * 60 * 60 * 1000));

   if (NOW() < gracePeriodEnd && subscription.has_payment_method) {
     // Allow access during grace period
     return <>{children}</>;
   } else {
     // Block access after grace period
     return <PaywallUI />;
   }
   ```

#### Simplified Paywall Decision Tree

```
Is subscription found?
  ├─ No → BLOCK (Show signup)
  └─ Yes → Check access_blocked
      ├─ access_blocked = true → BLOCK (Show reason)
      └─ access_blocked = false → Check status
          ├─ status = 'Active' → ALLOW ✅
          ├─ status = 'Trialing' → Check trial_end
          │   ├─ trial_end > NOW() → ALLOW ✅
          │   └─ trial_end < NOW() → Check grace period
          │       ├─ Within 3 days AND has_payment_method → ALLOW ✅
          │       └─ After 3 days OR no payment method → BLOCK ❌
          ├─ status = 'Past Due' → BLOCK ❌ (Payment failed)
          ├─ status = 'Canceled' → BLOCK ❌
          └─ status = 'Unpaid' → BLOCK ❌
```

---

### What Changes When Events Happen

#### Event 1: New Organization Signup

**Trigger:** User creates organization

**Changes:**
```sql
-- 1. Organization created
INSERT INTO organizations (name, ...)
VALUES ('Acme Corp', ...);

-- 2. Trial subscription created via create-trial-subscription Edge Function
INSERT INTO subscriptions (
  organization_id,
  stripe_customer_id,
  stripe_subscription_id,
  stripe_subscription_status,  -- 'Trialing'
  trial_start,                  -- NOW()
  trial_end,                    -- NOW() + 14 days
  number_of_active_users,       -- 1 (creator)
  access_blocked,               -- FALSE
  has_payment_method            -- FALSE
) VALUES (...);
```

**Paywall Impact:** User has 14 days of access ✅

---

#### Event 2: User Adds Payment Method

**Trigger:** User clicks "Add Payment Method" in BillingTab

**Changes:**
```sql
-- Webhook: customer.updated
UPDATE subscriptions
SET
  has_payment_method = TRUE,     -- Now has card on file
  updated_at = NOW()
WHERE stripe_customer_id = 'cus_ABC123';
```

**Paywall Impact:** Extends access through 3-day grace period ✅

---

#### Event 3: Trial Expires (Has Payment Method)

**Trigger:** `trial_end` date passes, Stripe auto-converts to paid

**Changes:**
```sql
-- Webhook: customer.subscription.updated
UPDATE subscriptions
SET
  stripe_subscription_status = 'Active',  -- Changed from 'Trialing'
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '1 month',
  trial_start = NULL,                      -- Clear trial fields
  trial_end = NULL,
  updated_at = NOW()
WHERE stripe_subscription_id = 'sub_XYZ789';
```

**Paywall Impact:** Seamless transition, user keeps access ✅

---

#### Event 4: Trial Expires (No Payment Method)

**Trigger:** `trial_end` + 3 days passes, no card added

**Changes:**
```sql
-- Manual check or scheduled job
UPDATE subscriptions
SET
  access_blocked = TRUE,
  access_blocked_reason = 'Trial expired. Please add a payment method.',
  updated_at = NOW()
WHERE organization_id = 'org_123'
AND stripe_subscription_status = 'Trialing'
AND trial_end < NOW() - INTERVAL '3 days'
AND has_payment_method = FALSE;
```

**Paywall Impact:** Access blocked, paywall shows "Trial expired" ❌

---

#### Event 5: Payment Fails

**Trigger:** Stripe fails to charge card on billing date

**Changes:**
```sql
-- Webhook: invoice.payment_failed
UPDATE subscriptions
SET
  stripe_subscription_status = 'Past Due',  -- Changed from 'Active'
  access_blocked = TRUE,                     -- Block access
  access_blocked_reason = 'Payment failed. Please update your payment method.',
  updated_at = NOW()
WHERE stripe_subscription_id = 'sub_XYZ789';
```

**Paywall Impact:** Immediate access block, paywall shows "Payment failed" ❌

---

#### Event 6: Payment Succeeds (After Failure)

**Trigger:** User updates card, payment goes through

**Changes:**
```sql
-- Webhook: invoice.payment_succeeded
UPDATE subscriptions
SET
  stripe_subscription_status = 'Active',     -- Restored
  access_blocked = FALSE,                     -- Unblock access
  access_blocked_reason = NULL,               -- Clear reason
  current_period_start = ...,
  current_period_end = ...,
  updated_at = NOW()
WHERE stripe_subscription_id = 'sub_XYZ789';
```

**Paywall Impact:** Access restored immediately ✅

**Realtime Update:**
```typescript
// Supabase realtime triggers cache invalidation
supabase.channel('billing-updates')
  .on('postgres_changes', { table: 'subscriptions' }, () => {
    queryClient.invalidateQueries(['subscription']);
    // UI updates automatically, paywall disappears
  });
```

---

#### Event 7: User Added to Organization

**Trigger:** Owner invites new member

**Changes:**
```sql
-- 1. Member added to memberships table
INSERT INTO memberships (organization_id, user_id, status)
VALUES ('org_123', 'user_789', 'Active');

-- 2. DB Trigger: update_subscription_user_count()
UPDATE subscriptions
SET
  number_of_active_users = number_of_active_users + 1,  -- 5 → 6
  stripe_quantity_pending_sync = TRUE,                  -- Flag for sync
  updated_at = NOW()
WHERE organization_id = 'org_123';

-- 3. Frontend calls manage-seats Edge Function
-- (Or scheduled job picks it up)

-- 4. manage-seats Edge Function updates Stripe
stripe.subscriptions.update('sub_XYZ789', {
  items: [{ id: 'si_ABC', quantity: 6 }],  -- Update quantity
  proration_behavior: 'always_invoice'      // Immediate charge
});

-- 5. Webhook: customer.subscription.updated
UPDATE subscriptions
SET
  stripe_quantity_pending_sync = FALSE,  -- Sync complete
  updated_at = NOW()
WHERE stripe_subscription_id = 'sub_XYZ789';
```

**Paywall Impact:** No impact on access, billing updated ✅

**Invoice:** Immediate proration charge for new user (remainder of month)

---

#### Event 8: Subscription Canceled

**Trigger:** User clicks "Cancel Subscription" in BillingTab

**Changes:**
```sql
-- Webhook: customer.subscription.updated
UPDATE subscriptions
SET
  cancel_at_period_end = TRUE,  -- Will cancel at period end
  updated_at = NOW()
WHERE stripe_subscription_id = 'sub_XYZ789';
```

**Paywall Impact:** Access continues until `current_period_end` ✅

**Then, at period end:**
```sql
-- Webhook: customer.subscription.deleted
UPDATE subscriptions
SET
  stripe_subscription_status = 'Canceled',
  access_blocked = TRUE,
  access_blocked_reason = 'Subscription canceled.',
  is_active = FALSE,
  updated_at = NOW()
WHERE stripe_subscription_id = 'sub_XYZ789';
```

**Paywall Impact:** Access blocked at period end ❌

---

### Key Takeaways

1. **`access_blocked` is the PRIMARY gate** - If `true`, paywall blocks immediately
2. **`stripe_subscription_status` is the SECONDARY check** - Determines if subscription is valid
3. **`trial_end` + `has_payment_method` control grace period** - 3 days after trial to add card
4. **Webhooks drive all state changes** - Every Stripe event updates the database
5. **Realtime updates remove paywall instantly** - When payment succeeds, UI updates in < 1 second
6. **Seat changes are tracked but don't block access** - Only billing is affected

---

### Database Functions & Triggers

#### Function: `calculate_active_users()`

```sql
CREATE OR REPLACE FUNCTION calculate_active_users(org_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM memberships
    WHERE organization_id = org_id
    AND status = 'Active'
  );
END;
$$ LANGUAGE plpgsql;
```

**Purpose:** Count active members for seat calculation

#### Function: `update_subscription_user_count()`

```sql
CREATE OR REPLACE FUNCTION update_subscription_user_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE subscriptions
  SET number_of_active_users = calculate_active_users(
    COALESCE(NEW.organization_id, OLD.organization_id)
  )
  WHERE organization_id = COALESCE(NEW.organization_id, OLD.organization_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

**Trigger:**
```sql
CREATE TRIGGER trigger_update_subscription_user_count
  AFTER INSERT OR UPDATE OF status OR DELETE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_user_count();
```

**Purpose:** Auto-update local seat count when members added/removed

#### Function: `mark_stripe_quantity_for_sync()`

```sql
CREATE OR REPLACE FUNCTION mark_stripe_quantity_for_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.number_of_active_users != OLD.number_of_active_users THEN
    NEW.stripe_quantity_pending_sync := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Trigger:**
```sql
CREATE TRIGGER mark_quantity_sync_needed
  BEFORE UPDATE OF number_of_active_users ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION mark_stripe_quantity_for_sync();
```

**Purpose:** Flag subscriptions needing Stripe sync

#### View: `subscriptions_pending_sync`

```sql
CREATE VIEW subscriptions_pending_sync AS
SELECT *
FROM subscriptions
WHERE stripe_quantity_pending_sync = TRUE
AND stripe_subscription_id IS NOT NULL;
```

**Purpose:** Query subscriptions needing sync

---

## User Journey Maps

### Path A: New Signup → Trial → Paid

```
1. User Signs Up
   ↓
2. Creates Organization
   ↓
3. Company Info Form Submitted
   ↓
4. ✅ AUTO: createTrialSubscription() called
   - Creates Stripe subscription (status: trialing)
   - Sets trial_end = NOW() + 14 days
   - Sets has_payment_method = false
   - Marks has_used_trial = true on org
   ↓
5. User Explores App (14 Days Free)
   ↓
6. Day 7, 3, 1: Email Reminders
   - "Your trial ends soon - Add payment method"
   ↓
7. User Adds Payment via Customer Portal
   - webhook: payment_method.attached
   - Updates has_payment_method = true
   ↓
8. Trial Ends (Day 14)
   - webhook: customer.subscription.updated
   - Status: trialing → active
   - First invoice created
   ↓
9. Ongoing: Monthly Billing Continues
```

**Paywall Checks:**
- On every app load: `checkSubscription()`
- Realtime listener for subscription changes
- Cache invalidated on subscription updates

---

### Path B: Trial Expires → Grace Period → Paywall

```
1. Trial Ends Without Payment Method
   ↓
2. hasValidSubscription() = TRUE
   - Grace period active (3 days)
   - Shows warning: "3 days remaining"
   - User still has full access
   ↓
3. Grace Period Expires (Trial + 3 days)
   ↓
4. hasValidSubscription() = FALSE
   ↓
5. SubscriptionPaywall Renders
   - Owner: "Add payment method" CTA → Customer Portal
   - Member: "Contact owner to add payment"
   ↓
6. Owner Adds Payment → Subscription Reactivated
   ↓
7. Access Restored Immediately
   - Via realtime listener
```

**Grace Period Implementation:**
```typescript
// stripeService.hasValidSubscription()
const gracePeriodDays = 3;
const gracePeriodEnd = new Date(
  trialEnd.getTime() + (gracePeriodDays * 24 * 60 * 60 * 1000)
);

if (now <= gracePeriodEnd) {
  return {
    isValid: true,
    inGracePeriod: true,
    graceDaysRemaining: Math.ceil(
      (gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
  };
}
```

---

### Path C: Active Subscription → Add/Remove Users

```
1. Owner Invites New User
   ↓
2. ✅ USER ADDED: inviteMember() or member just joins succeed -> member status = active
   ↓
3. ✅ DB TRIGGER: update_subscription_user_count()
   - Increments subscriptions.number_of_active_users
   ↓
4. ✅ DB TRIGGER: mark_quantity_sync_needed()
   - Sets stripe_quantity_pending_sync = TRUE
   ↓
5. ❌ MISSING: Auto-call manage-seats Edge Function
   - Should call: POST /functions/v1/manage-seats
   - Body: { action: 'add', organizationId, triggeredByUserId }
   ↓
6. manage-seats Updates Stripe Subscription
   - Calls stripe.subscriptions.update()
   - Sets proration_behavior: 'always_invoice'
   - Stripe prorates the charge
   ↓
7. webhook: customer.subscription.updated
   - Updates DB with new quantity
   - Sets stripe_quantity_pending_sync = FALSE
```

**Implementation Gap:**

Currently missing automatic call to manage-seats. Needs:

```typescript
// Add to src/hooks/queries/useOrganizations.ts
const inviteMember = async (email, role) => {
  const result = await inviteMemberAPI(email, role);

  // NEW: Auto-sync seats
  await supabase.functions.invoke('manage-seats', {
    body: {
      action: 'add',
      organizationId: currentOrgId,
      triggeredByUserId: userId
    }
  });

  return result;
};
```

---

### Path D: Failed Payment → Recovery

```
1. Monthly Billing Date Arrives
   ↓
2. Stripe Attempts to Charge Card
   ↓
3. Payment Fails (Declined Card)
   ↓
4. webhook: invoice.payment_failed
   - Sets status = 'past_due'
   - Sets access_blocked = true
   - Sets access_blocked_reason = 'Payment failed'
   ↓
5. Stripe Auto-Retries (Smart Retries)
   ↓
6. User Sees Paywall
   - "Payment failed. Update payment method."
   ↓
7. Owner Updates Card in Customer Portal
   ↓
8. webhook: payment_method.attached
   ↓
9. Stripe Retries Payment
   ↓
10. webhook: invoice.payment_succeeded
    - Sets status = 'active'
    - Sets access_blocked = false
    ↓
11. Access Restored Immediately
```

**Missing Features:**
- Email notifications for failed payment
- Dunning management UI
- Retry payment CTA in app

---

## State Management

**Architecture (v3.0.0):**
- **React Query** - Server state and data fetching (subscriptions, invoices, etc.)
- **Zustand** - UI state only (sidebar open/closed, theme, etc.)
- **LocalStorage** - Cache layer for BillingTab (5min TTL)

### React Query for Billing Data

**Primary State Management:**
```typescript
// All billing data managed by React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch subscription
const { data: subscription } = useQuery({
  queryKey: ['subscription', organizationId],
  queryFn: () => stripeService.getSubscription(organizationId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Fetch invoices
const { data: invoices } = useQuery({
  queryKey: ['invoices', organizationId],
  queryFn: () => stripeService.getInvoices(organizationId),
  staleTime: 5 * 60 * 1000,
});

// Update subscription (mutation)
const updateSeatsMutation = useMutation({
  mutationFn: (data) => supabase.functions.invoke('manage-seats', { body: data }),
  onSuccess: () => {
    queryClient.invalidateQueries(['subscription']);
  }
});
```

**Benefits:**
- Automatic caching and background refetching
- Optimistic updates
- Cache invalidation on mutations
- Automatic retry on failure
- Deduplication of concurrent requests

### Zustand for UI State Only

**File:** `/src/stores/ui/uiStore.ts` (v3.0.0)

**UI State (NOT billing data):**
```typescript
interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarState: 'expanded' | 'collapsed' | 'hidden';
  modals: {
    isOpen: boolean;
    type: string | null;
  };
  // NO subscription data, NO billing data
}
```

**What Zustand Does:**
- Theme management
- Sidebar state
- Modal open/close
- UI preferences
- Loading overlays

**What Zustand Does NOT Do:**
- Fetching subscription data (React Query)
- Caching API responses (React Query)
- Managing billing state (React Query)

### Cache Strategy

**React Query Cache:**
```typescript
// Automatic caching with stale-time
queryClient.setQueryDefaults(['subscription'], {
  staleTime: 5 * 60 * 1000, // 5 min
  cacheTime: 10 * 60 * 1000, // 10 min
});
```

**LocalStorage Cache (BillingTab only):**
```typescript
// Additional LocalStorage cache for offline fallback
'billing_subscription_cache'   // TTL: 5 minutes
'billing_user_count_cache'     // TTL: 5 minutes
'billing_invoices_cache'       // TTL: 5 minutes
'billing_plans_cache'          // TTL: 15 minutes
```

**Realtime Invalidation:**
```typescript
// Supabase realtime → Invalidate React Query cache
supabase
  .channel('billing-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'subscriptions',
    filter: `organization_id=eq.${orgId}`
  }, (payload) => {
    // Invalidate React Query cache
    queryClient.invalidateQueries(['subscription', orgId]);
    queryClient.invalidateQueries(['invoices', orgId]);

    // Clear LocalStorage backup
    localStorage.removeItem('billing_subscription_cache');
  })
  .subscribe();
```

**Cache Flow:**
```
1. React Query checks cache → Hit? Return cached data
2. Cache miss or stale → Fetch from API
3. Realtime event → Invalidate cache → Auto-refetch
4. Mutation → Invalidate related queries → Refetch
```

---

## Seat Syncing System

### Current Flow

```
User Action (invite/remove)
    ↓
DB Trigger: update_subscription_user_count()
    ↓
Local Count Updated (subscriptions.number_of_active_users)
    ↓
DB Trigger: mark_quantity_sync_needed()
    ↓
Flag Set (stripe_quantity_pending_sync = TRUE)
    ↓
❌ MISSING: Auto-call manage-seats Edge Function
    ↓
Stripe Subscription Updated (manual or scheduled)
```

### The Missing Link

**Problem:** No automatic call from DB trigger to Edge Function

**Solution Options:**

#### Option A: Frontend Call (Recommended)
```typescript
// In useOrganizations hook
const inviteMember = useMutation({
  mutationFn: async ({ email, role }) => {
    const result = await organizationService.inviteMember(email, role);

    // Sync seats with Stripe
    await supabase.functions.invoke('manage-seats', {
      body: { action: 'add', organizationId: currentOrgId }
    });

    return result;
  }
});
```

#### Option B: Scheduled Sync (Backup)
```sql
-- Hourly cron job
SELECT cron.schedule(
  'sync-stripe-seats',
  '0 * * * *',
  $$
  SELECT net.http_post(
    'https://[project].supabase.co/functions/v1/sync-stripe-quantities'
  );
  $$
);
```

#### Option C: Database HTTP Call (Advanced)
```sql
CREATE OR REPLACE FUNCTION trigger_stripe_seat_sync()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    'https://[project].supabase.co/functions/v1/manage-seats',
    json_build_object('action', 'update', 'organizationId', NEW.organization_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Recommendation:** Use Option A + Option B

---

## Proration System

### How Stripe Calculates Proration

When you add or remove users mid-billing cycle, Stripe automatically prorates charges based on **days remaining** in the current billing period.

#### Daily Rate Calculation

```
Daily Rate = (Price per User) ÷ (Days in Billing Period)
Proration = Daily Rate × Days Remaining × Quantity Change
```

#### Example: Adding a User Mid-Cycle

**Scenario:**
- Billing period: January 1-31 (31 days)
- Current subscription: 2 users @ $20/user = $40/month
- User added: January 15 (midway through month)

**Calculation:**
```
Daily rate = $20 ÷ 31 days = $0.645/user/day
Days remaining = 17 days (Jan 15-31)
Proration charge = $0.645 × 17 days = $10.97
```

**What Happens:**
1. Immediate charge: **$10.97** (prorated for 17 days)
2. Next billing cycle (Feb 1): Full **$60** charged for 3 users
3. Invoice shows: "Added 1 user on Jan 15 (prorated)"

#### Example: Removing a User Mid-Cycle

**Scenario:**
- Same billing period: January 1-31 (31 days)
- Current subscription: 3 users @ $20/user = $60/month
- User removed: January 17 (2 days after adding)

**Calculation:**
```
Daily rate = $20 ÷ 31 days = $0.645/user/day
Days remaining = 15 days (Jan 17-31)
Proration credit = $0.645 × 15 days = $9.68
```

**What Happens:**
1. **Credit issued: $9.68** (applied to account balance)
2. Next billing cycle (Feb 1): **$40** charged for 2 users
3. If credit exists, it's applied to the $40 invoice

#### Important Notes

**Charged for Remainder of Month:**
- When you add a user, you're charged immediately for the **remaining days** in the current period
- When you remove a user, you receive a credit for the **unused days**
- Credits roll over to the next invoice (not refunded unless subscription cancelled)

**Minimum Charge:**
- Even if a user stays for 1 day, you're charged for that 1 day
- If removed the next day, you get credit for remaining days
- **No refunds for partial days** - Stripe rounds to nearest day

**Proration Behavior:**
```typescript
// In manage-seats Edge Function
await stripe.subscriptions.update(subscriptionId, {
  items: [{
    id: subscriptionItemId,
    quantity: newQuantity
  }],
  proration_behavior: 'always_invoice',  // Key setting
  billing_cycle_anchor: 'unchanged'      // Keep same billing date
});
```

**Proration Behavior Options:**
- `always_invoice` - Immediate charge/credit (recommended for transparency)
- `create_prorations` - Charge/credit on next invoice
- `none` - No proration (not recommended for seat-based billing)

### Visual Flow

```
Jan 1: Charge $40 (2 users) for Jan 1-31
          ↓
Jan 15: Add user → Immediate charge $10.97 (17 days remaining)
          ↓
Jan 17: Remove user → Credit $9.68 (15 days remaining)
          ↓
Feb 1: Charge $40 (2 users) for Feb 1-28
       Applied credit: -$9.68
       Final charge: $30.32
```

### Database Tracking

Proration events are logged in `subscription_seat_usage_events`:

```sql
SELECT
  created_at,
  event_type,
  previous_seat_count,
  new_seat_count,
  triggered_by_user_id,
  metadata
FROM subscription_seat_usage_events
WHERE subscription_id = 'sub_123'
ORDER BY created_at DESC;
```

**Example Output:**
```
2025-01-17 | seat_removed | 3 | 2 | user_456 | {"credit_issued": "$9.68"}
2025-01-15 | seat_added   | 2 | 3 | user_789 | {"charge_amount": "$10.97"}
2025-01-01 | subscription_created | 0 | 2 | user_123 | {"initial_charge": "$40"}
```

---

## Idempotency

### What is Idempotency?

**Idempotency** ensures that performing the same operation multiple times has the same effect as performing it once. This prevents duplicate charges, double updates, and data inconsistencies.

### Why It Matters

**Without Idempotency:**
```
User clicks "Add Member" button twice quickly
  → 2 API calls to add same user
  → 2 seat additions in Stripe
  → Double charge to customer
```

**With Idempotency:**
```
User clicks "Add Member" button twice quickly
  → 2 API calls with same idempotency key
  → Stripe processes first, ignores second
  → Single charge to customer
```

### Stripe's Idempotency Key System

Stripe uses **idempotency keys** to prevent duplicate API requests:

```typescript
// Example: Creating a subscription with idempotency key
const subscription = await stripe.subscriptions.create(
  {
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: 14
  },
  {
    idempotencyKey: `create_sub_${organizationId}_${timestamp}`
  }
);
```

**How It Works:**
1. First request with key `abc123` → Stripe processes and stores result
2. Second request with same key `abc123` → Stripe returns stored result (no new charge)
3. Different key `abc456` → Stripe processes as new request

**Key Lifetime:** 24 hours (after that, same key can be reused)

### Idempotency in WallQu

#### 1. Webhook Event Processing

**Problem:** Stripe may send the same webhook event multiple times (network issues, retries)

**Solution:** Store event IDs and skip duplicates

```typescript
// In stripe-webhook Edge Function
const processWebhook = async (event: Stripe.Event) => {
  // Check if we've already processed this event
  const { data: existing } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();

  if (existing) {
    console.log(`Event ${event.id} already processed, skipping`);
    return { status: 200, message: 'Already processed' };
  }

  // Process the event
  await handleEvent(event);

  // Mark as processed
  await supabase
    .from('stripe_webhook_events')
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processed: true,
      processed_at: new Date().toISOString()
    });
};
```

**Database Constraint:**
```sql
-- Prevent duplicate event processing
ALTER TABLE stripe_webhook_events
ADD CONSTRAINT unique_stripe_event_id UNIQUE (stripe_event_id);
```

#### 2. Seat Sync Operations

**Problem:** Multiple rapid user invitations could trigger duplicate Stripe updates

**Solution:** Use organization ID + timestamp as idempotency key

```typescript
// In manage-seats Edge Function
const updateStripeSeats = async (
  subscriptionId: string,
  newQuantity: number,
  organizationId: string
) => {
  const idempotencyKey = `update_seats_${organizationId}_${Date.now()}`;

  await stripe.subscriptions.update(
    subscriptionId,
    {
      items: [{ id: subscriptionItemId, quantity: newQuantity }],
      proration_behavior: 'always_invoice'
    },
    { idempotencyKey }
  );
};
```

**Alternative: Database-Level Deduplication**

```typescript
// Use flag to prevent concurrent updates
const { data: subscription } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('organization_id', organizationId)
  .single();

if (subscription.stripe_quantity_pending_sync) {
  // Already syncing, skip this request
  return { status: 200, message: 'Sync already in progress' };
}

// Mark as syncing
await supabase
  .from('subscriptions')
  .update({ stripe_quantity_pending_sync: true })
  .eq('organization_id', organizationId);

// Perform sync
await updateStripeSeats(...);

// Mark as synced
await supabase
  .from('subscriptions')
  .update({ stripe_quantity_pending_sync: false })
  .eq('organization_id', organizationId);
```

#### 3. Subscription Creation

**Problem:** User might refresh page during signup, triggering duplicate trial creation

**Solution:** Database constraint + idempotency key

```sql
-- Database constraint: One subscription per organization
ALTER TABLE subscriptions
ADD CONSTRAINT unique_org_subscription
UNIQUE (organization_id);
```

```typescript
// In create-trial-subscription Edge Function
const createTrialSubscription = async (organizationId: string) => {
  // Check if subscription already exists
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('organization_id', organizationId)
    .single();

  if (existing) {
    console.log('Subscription already exists, returning existing');
    return existing;
  }

  // Create with idempotency key
  const idempotencyKey = `create_trial_${organizationId}`;

  const stripeSubscription = await stripe.subscriptions.create(
    {
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 14
    },
    { idempotencyKey }
  );

  // Store in database (protected by unique constraint)
  return supabase.from('subscriptions').insert({
    organization_id: organizationId,
    stripe_subscription_id: stripeSubscription.id,
    stripe_subscription_status: 'Trialing'
  });
};
```

### Idempotency Best Practices

1. **Always use idempotency keys for Stripe API calls** that modify data (create, update)
2. **Store and check event IDs** before processing webhooks
3. **Use database constraints** to prevent duplicate records
4. **Log idempotency conflicts** for monitoring and debugging
5. **Return the same response** for duplicate requests (don't error)

### Monitoring Idempotency

```sql
-- Check for duplicate webhook events (should be 0)
SELECT stripe_event_id, COUNT(*)
FROM stripe_webhook_events
GROUP BY stripe_event_id
HAVING COUNT(*) > 1;

-- Check for failed idempotency (multiple attempts)
SELECT
  organization_id,
  COUNT(*) as retry_count,
  MAX(created_at) as last_attempt
FROM subscription_seat_usage_events
WHERE event_type = 'seat_sync_attempted'
GROUP BY organization_id
HAVING COUNT(*) > 3
ORDER BY retry_count DESC;
```

---

## Security & Access Control

### RLS Policies

#### `subscription_plans`
```sql
-- Anyone can view plans
CREATE POLICY "Plans are viewable by everyone"
ON subscription_plans FOR SELECT
USING (true);
```

#### `subscriptions`
```sql
-- Members can view their org's subscription
CREATE POLICY "Members can view their org subscription"
ON subscriptions FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
  )
);

-- Owners can update their org's subscription
CREATE POLICY "Owners can update their org subscription"
ON subscriptions FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id
    FROM memberships
    WHERE user_id = auth.uid()
    AND role = 'Owner'
    AND status = 'Active'
  )
);
```

**Note:** Webhooks use service_role key (bypasses RLS)

### Billing Access Control

```typescript
// Only Owner/Admin can access billing
const canAccessBilling = currentUser?.role === 'Owner' ||
                         currentUser?.role === 'Admin';

if (!canAccessBilling) {
  return <AccessDenied message="Only owners can manage billing" />;
}
```

---

## Critical Gaps

### 1. Webhook Not Deployed ⚠️ BLOCKING

**Status:** Code exists, not deployed

**Impact:**
- Subscription status won't update automatically
- Payment failures won't be detected
- User won't see updated billing info

**Solution:**
```bash
cd supabase
supabase functions deploy stripe-webhook
# Configure in Stripe Dashboard
# Add webhook secret to env vars
```

### 2. Seat Sync Not Automated ⚠️ HIGH PRIORITY

**Status:** Manual trigger only

**Impact:**
- Stripe quantity may diverge from actual users
- Billing inaccurate
- Requires manual intervention

**Solution:** Add seat sync calls to member management functions

### 3. No Scheduled Sync Job ⚠️ MEDIUM PRIORITY

**Status:** Function exists, not scheduled

**Impact:**
- Quantity drift over time
- No backup for failed syncs

**Solution:** Set up hourly cron job

### 4. Proration Not Tested ⚠️ MEDIUM PRIORITY

**Status:** Code exists, not validated

**Impact:**
- Potential billing errors
- Customer complaints

**Solution:** End-to-end testing in test mode

### 5. Placeholder Stripe IDs ⚠️ HIGH PRIORITY

**Status:** Using test IDs

**Impact:**
- Can't go to production
- No real billing

**Solution:** Create real Stripe products and update DB

---

## Environment Variables

### Required Variables

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_SECRET_KEY_TEST=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...

# Stripe Webhook
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Product IDs (after creation)
STRIPE_PRICE_ID_PER_USER_MONTHLY=price_...
STRIPE_PRODUCT_ID_INDIVIDUAL=prod_...
STRIPE_PRODUCT_ID_TEAM=prod_...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
```

### Setting Secrets

```bash
# Set Supabase secrets
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Verify secrets
supabase secrets list
```

---

## Next Steps

### Phase 1: Deploy Critical Infrastructure (Week 1)

1. **Deploy webhook** (2 hours)
2. **Create Stripe products** (1 hour)
3. **Test webhook events** (2 hours)
4. **Update database with real IDs** (30 min)

### Phase 2: Automate Seat Syncing (Week 1-2)

1. **Add seat sync to member functions** (1 day)
2. **Create scheduled sync job** (2 hours)
3. **Test proration** (1 day)

### Phase 3: Complete User Journeys (Week 2-3)

1. **Payment reminders** (2 days)
2. **Downgrade flow** (1 day)
3. **Dunning management** (2 days)
4. **Cancellation feedback** (1 day)

### Phase 4: Monitoring & Analytics (Week 3-4)

1. **Webhook monitoring** (1 day)
2. **Subscription analytics** (1 day)
3. **Billing dashboard** (2 days)
4. **Alert setup** (1 day)

---

## Reference Documentation

### Related Files

- `/PAYWALL_UX_STRATEGIES.md` - Paywall UX analysis
- `/src/services/stripeService.ts` - Stripe service layer
- `/supabase/functions/stripe-webhook/` - Webhook handler
- `/src/components/features/settings/BillingTab.tsx` - Billing UI
- `/src/components/common/SubscriptionPaywall.tsx` - Paywall component

### External Resources

- [Stripe Subscriptions Guide](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**Document Version:** 1.0
**For Questions:** Refer to implementation guide or contact billing team
