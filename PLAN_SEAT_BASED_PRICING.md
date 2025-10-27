# Plan: Transition to Simple Seat-Based Pricing

## Executive Summary
Transition from tiered pricing model to simple seat-based pricing:
- **$X per user per month** (monthly commitment)
- **$Y per user per year** (yearly commitment, ~15-20% discount)
- Automatic billing based on active team member count
- View billing history directly in app (Stripe data)
- Simple landing page pricing

## Current State Analysis

### What We Have
- ✅ Stripe integration via `stripeService.ts`
- ✅ Subscription management in database
- ✅ User count calculation (`calculateSubscriptionQuantity`)
- ✅ Invoice fetching from Stripe
- ✅ BillingTab component with tier selection
- ❌ Tiered pricing model (Starter, Professional, Enterprise)
- ❌ Complex upgrade/downgrade logic

### What Needs to Change
1. **Database Schema**: Simplify subscription_plans table
2. **Stripe Products**: Create seat-based products
3. **Billing Logic**: Per-seat metered billing
4. **UI Components**: Update BillingTab and landing page
5. **Webhooks**: Handle seat count changes

---

## Architecture Design

### Pricing Model

```
Monthly Plan:
- Base: $15/user/month
- Billed monthly
- Cancel anytime

Annual Plan:
- Base: $12/user/month ($144/user/year)
- Billed annually
- 20% savings vs monthly
- Cancel anytime
```

### How It Works

**User Count Calculation:**
- Count = Active members in organization
- Excludes: Inactive/Pending members
- Updates: Automatically via webhooks

**Billing Flow:**
1. User adds/removes team members
2. Webhook updates Stripe subscription quantity
3. Stripe prorates charges automatically
4. Next invoice reflects new seat count

**Example:**
```
Jan 1: 5 users × $15 = $75/month
Jan 15: Add 2 users (prorate $15)
Feb 1: 7 users × $15 = $105/month
```

---

## Implementation Plan

### Phase 1: Stripe Setup
**Goal:** Create seat-based products in Stripe

**Tasks:**
1. Create Stripe Products:
   ```
   Product 1: "WallQu - Monthly"
   - Price: $15/user/month
   - Billing: Monthly
   - Type: Recurring, per-seat

   Product 2: "WallQu - Annual"
   - Price: $144/user/year
   - Billing: Yearly
   - Type: Recurring, per-seat
   ```

2. Configure Stripe:
   - Enable metered billing
   - Set proration behavior
   - Configure webhooks

**Deliverables:**
- Stripe Product IDs
- Stripe Price IDs (monthly & yearly)

---

### Phase 2: Database Schema Update
**Goal:** Simplify subscription model

**Migration Tasks:**

**A. Update subscription_plans table:**
```sql
-- Keep only 2 plans: Monthly & Annual
DELETE FROM subscription_plans WHERE name NOT IN ('monthly', 'annual');

-- Update plans to seat-based
UPDATE subscription_plans
SET
  name = 'monthly',
  display_name = 'Monthly Plan',
  description = '$15 per user per month',
  stripe_product_id = 'prod_XXXXX',  -- From Phase 1
  stripe_price_id_monthly = 'price_XXXXX',
  features = '["Unlimited quotes", "Team collaboration", "Analytics", "Priority support"]'
WHERE name = 'monthly';

UPDATE subscription_plans
SET
  name = 'annual',
  display_name = 'Annual Plan',
  description = '$12 per user per month (billed annually)',
  stripe_product_id = 'prod_YYYYY',  -- From Phase 1
  stripe_price_id_yearly = 'price_YYYYY',
  features = '["Unlimited quotes", "Team collaboration", "Analytics", "Priority support", "20% savings"]'
WHERE name = 'annual';
```

**B. Add seat tracking:**
```sql
-- Add seat count to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS seat_count integer DEFAULT 1;

-- Backfill existing subscriptions
UPDATE subscriptions s
SET seat_count = (
  SELECT COUNT(*)
  FROM memberships m
  WHERE m.organization_id = s.organization_id
    AND m.status = 'Active'
);
```

**Deliverables:**
- Migration SQL files
- Updated schema documentation

---

### Phase 3: Update stripeService.ts
**Goal:** Add seat-based billing functions

**New Functions:**

```typescript
// services/stripeService.ts

/**
 * Create or update seat-based subscription
 */
export const createSeatBasedSubscription = async (
  organizationId: string,
  planType: 'monthly' | 'annual'
): Promise<{ data: any; error: string | null }> => {
  // 1. Get organization's Stripe customer
  // 2. Calculate current seat count
  // 3. Create Stripe subscription with quantity
  // 4. Store subscription reference locally
  // 5. Return checkout URL or subscription details
}

/**
 * Update seat count in Stripe
 */
export const updateSubscriptionSeats = async (
  organizationId: string,
  newSeatCount: number
): Promise<{ success: boolean; error: string | null }> => {
  // 1. Get Stripe subscription ID
  // 2. Update quantity via Stripe API
  // 3. Stripe handles proration automatically
  // 4. Update local cache
}

/**
 * Get billing history from Stripe
 */
export const getBillingHistory = async (
  organizationId: string
): Promise<{ data: Invoice[]; error: string | null }> => {
  // 1. Get Stripe customer ID
  // 2. Fetch invoices from Stripe API
  // 3. Transform to app format
  // 4. Include: date, amount, status, PDF URL, seat count
}

/**
 * Get upcoming invoice preview
 */
export const getUpcomingInvoice = async (
  organizationId: string
): Promise<{ data: any; error: string | null }> => {
  // Shows what next bill will be
  // Useful for showing "Adding 2 users will cost $30/month"
}
```

**Deliverables:**
- Updated `stripeService.ts`
- TypeScript interfaces for seat-based billing

---

### Phase 4: Update BillingTab Component
**Goal:** Simple seat-based UI

**UI Changes:**

**Current Plan Section:**
```typescript
<Card>
  <h3>Current Plan</h3>
  <div>
    <p>Monthly Plan</p>
    <p>5 active seats × $15 = $75/month</p>
    <p>Next billing: Feb 1, 2025</p>
  </div>
  <Button>Switch to Annual (Save 20%)</Button>
  <Button variant="ghost">Cancel Subscription</Button>
</Card>
```

**Billing History Section:**
```typescript
<Card>
  <h3>Billing History</h3>
  <Table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th>Seats</th>
        <th>Amount</th>
        <th>Status</th>
        <th>Invoice</th>
      </tr>
    </thead>
    <tbody>
      {invoices.map(invoice => (
        <tr>
          <td>{invoice.date}</td>
          <td>WallQu - Monthly</td>
          <td>{invoice.quantity} users</td>
          <td>${invoice.amount}</td>
          <td><Badge>{invoice.status}</Badge></td>
          <td><Button>Download PDF</Button></td>
        </tr>
      ))}
    </tbody>
  </Table>
</Card>
```

**Payment Method Section:**
```typescript
<Card>
  <h3>Payment Method</h3>
  <div className="flex items-center gap-4">
    <CreditCard />
    <div>
      <p>•••• •••• •••• 4242</p>
      <p>Expires 12/2025</p>
    </div>
    <Button>Update</Button>
  </div>
</Card>
```

**Deliverables:**
- Redesigned BillingTab.tsx
- Remove tier selection UI
- Add billing history table
- Add payment method management

---

### Phase 5: Webhook Handlers
**Goal:** Auto-update seat count when team changes

**Webhook Events to Handle:**

**A. Team Member Added:**
```typescript
// After adding member in TeamTab
const handleMemberAdded = async () => {
  // 1. Add member to database
  // 2. Calculate new seat count
  // 3. Call updateSubscriptionSeats(orgId, newCount)
  // 4. Stripe prorates automatically
  // 5. Show toast: "Subscription updated: 6 seats × $15 = $90/month"
}
```

**B. Team Member Removed:**
```typescript
// After deactivating member in TeamTab
const handleMemberRemoved = async () => {
  // 1. Deactivate member in database
  // 2. Calculate new seat count
  // 3. Call updateSubscriptionSeats(orgId, newCount)
  // 4. Stripe prorates credit
  // 5. Show toast: "Subscription updated: 4 seats × $15 = $60/month"
}
```

**C. Team Member Reactivated:**
```typescript
// After reactivating member
const handleMemberReactivated = async () => {
  // Same as handleMemberAdded
}
```

**Stripe Webhooks (Backend):**
```typescript
// Stripe webhook endpoint
POST /api/stripe/webhook

Events to handle:
- invoice.paid → Update subscription status
- invoice.payment_failed → Block access, notify owner
- customer.subscription.updated → Sync subscription data
- customer.subscription.deleted → Handle cancellation
```

**Deliverables:**
- Team action integration
- Stripe webhook endpoint
- Proration preview UI

---

### Phase 6: Landing Page Update
**Goal:** Simple, clear pricing page

**Design:**

```markdown
# Pricing

## Simple, transparent pricing that scales with your team

### $15 per user/month
**Billed monthly**
- Cancel anytime
- All features included
- Unlimited quotes
- Team collaboration
- Analytics & reporting
- Priority support

[Start Free Trial] [Contact Sales]

### $12 per user/month
**Billed annually**
- **Save 20%** vs monthly
- All features included
- Unlimited quotes
- Team collaboration
- Analytics & reporting
- Priority support
- Priority onboarding

[Start Free Trial] [Contact Sales]

---

## FAQ

**How does billing work?**
You're charged based on the number of active team members in your organization.
Add or remove users anytime - we'll automatically prorate charges.

**Can I switch between monthly and annual?**
Yes! Switch anytime from your billing settings.

**What happens if I add users mid-month?**
We'll prorate the charge for the remainder of the month.

**Can I cancel anytime?**
Yes, no long-term commitments required.
```

**Deliverables:**
- New pricing page component
- Update marketing site
- Add seat calculator widget

---

## Migration Strategy

### For Existing Customers

**Option 1: Grandfather existing customers**
- Keep current tier until they change
- One-time migration offer

**Option 2: Automatic migration**
```
Starter (3 users) → $15×3 = $45/month (was $29)
Professional (10 users) → $15×10 = $150/month (was $99)
Enterprise (unlimited) → Custom pricing
```

**Recommendation:** Option 1 with email campaign

---

## Testing Checklist

### Stripe Testing
- [ ] Create test products in Stripe test mode
- [ ] Test subscription creation with different seat counts
- [ ] Test adding seats (proration)
- [ ] Test removing seats (credit)
- [ ] Test monthly → annual switch
- [ ] Test annual → monthly switch
- [ ] Test payment failures
- [ ] Test subscription cancellation

### App Testing
- [ ] Add team member → Stripe updated
- [ ] Remove team member → Stripe updated
- [ ] Reactivate member → Stripe updated
- [ ] View billing history
- [ ] Download invoices
- [ ] Update payment method
- [ ] Cancel subscription
- [ ] Blocked access when payment fails

### Edge Cases
- [ ] Add 10 users at once
- [ ] Remove all users but one
- [ ] Payment fails mid-billing cycle
- [ ] Cancel then resubscribe
- [ ] Change plan immediately after adding users

---

## Rollout Plan

### Week 1: Stripe Setup
- Create products and prices
- Configure webhooks
- Test in Stripe test mode

### Week 2: Backend
- Database migrations
- Update stripeService.ts
- Create webhook handlers
- Integration testing

### Week 3: Frontend
- Update BillingTab component
- Add billing history UI
- Update TeamTab integration
- Component testing

### Week 4: Landing Page
- Design new pricing page
- Update marketing copy
- A/B testing setup

### Week 5: Testing
- End-to-end testing
- Security review
- Performance testing
- Beta user testing

### Week 6: Launch
- Migrate existing customers
- Deploy to production
- Monitor metrics
- Customer support ready

---

## Success Metrics

### Business Goals
- Increase MRR by 30% (more predictable)
- Reduce churn (simpler = better)
- Increase team size per customer

### Technical Goals
- < 5s billing page load time
- 99.9% webhook processing success
- Zero billing errors

### User Experience
- Users understand pricing instantly
- Self-service billing (no support tickets)
- Transparent invoicing

---

## Questions to Answer

1. **What's the price point?**
   - $15/user/month? $20? $25?
   - Research competitor pricing

2. **Free tier?**
   - 1-2 users free forever?
   - 14-day trial then paid?

3. **Minimums?**
   - Minimum 3 seats? Or allow 1?

4. **Discounts?**
   - Annual: 20% off?
   - Volume: 50+ users get discount?
   - Non-profit/education pricing?

5. **Add-ons?**
   - Advanced analytics: +$5/user?
   - API access: +$10/month flat?
   - White-label: Custom pricing?

---

## Technical Debt to Address

- [ ] Remove old tier-based code
- [ ] Clean up subscription_plans table
- [ ] Archive old migration files
- [ ] Update documentation
- [ ] Remove unused Stripe products

---

## Next Steps

1. **Decide on pricing:** $X/user/month
2. **Create Stripe products:** Get product/price IDs
3. **Start with Phase 1:** Stripe setup
4. **Weekly review:** Track progress against plan

---

## Resources

- [Stripe Metered Billing Docs](https://stripe.com/docs/billing/subscriptions/metered-billing)
- [Stripe Proration Guide](https://stripe.com/docs/billing/subscriptions/prorations)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- Current implementation: `src/services/stripeService.ts`
