# Stripe Billing Setup Guide

Complete step-by-step guide to set up Stripe billing for Wall Quote Wizard.

---

## 📋 What's Been Implemented

✅ Database schema (Stripe-first approach)
✅ Frontend Stripe integration (`stripeService.ts`)
✅ Subscription page for onboarding (`/subscription`)
✅ Billing settings tab (Settings → Billing)
✅ Paywall component (optional)
✅ Price calculation based on active users
✅ Backend API examples for checkout and webhooks

---

## 🚀 Setup Checklist

### Step 1: Sign Up for Stripe

1. Go to https://dashboard.stripe.com/register
2. Create a Stripe account
3. Complete business information

### Step 2: Get API Keys

1. In Stripe Dashboard → **Developers → API keys**
2. Copy your keys:
   - **Publishable key**: `pk_test_...` (safe for client-side)
   - **Secret key**: `sk_test_...` (server-side only, NEVER expose!)

### Step 3: Add Keys to Environment Variables

Add these to your `.env` file:

```.env
# Stripe Keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Backend only (for API routes/webhooks)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

**Important**: The `VITE_` prefix makes it available to the frontend

### Step 4: Create Products and Prices in Stripe

#### Option A: Using Stripe Dashboard (Recommended for first time)

1. Go to Stripe Dashboard → **Products → Add Product**

2. **Create Professional Plan**:
   - **Name**: Professional Plan
   - **Description**: Per-user pricing for professional quote management
   - **Pricing Model**: Standard pricing
   - **Price**: $12.99
   - **Billing period**: Monthly
   - **Usage is metered**: No
   - Click "Save product"

3. **Add Yearly Price** to same product:
   - Click on the product you just created
   - Click "Add another price"
   - **Price**: $119.88 (or $9.99 × 12)
   - **Billing period**: Yearly
   - Click "Save"

4. **Copy the Price IDs**:
   - You'll see IDs like:
     - `price_1ABC123monthly` (monthly price ID)
     - `price_1DEF456yearly` (yearly price ID)
   - Keep these handy for the next step

#### Option B: Using Stripe CLI (Advanced)

```bash
# Create product
stripe products create \
  --name="Professional Plan" \
  --description="Per-user pricing"

# Create monthly price
stripe prices create \
  --product=prod_XXX \
  --unit-amount=1299 \
  --currency=usd \
  --recurring[interval]=month

# Create yearly price
stripe prices create \
  --product=prod_XXX \
  --unit-amount=11988 \
  --currency=usd \
  --recurring[interval]=year
```

### Step 5: Update Database with Stripe IDs

Run this SQL in Supabase SQL Editor:

```sql
-- Update Professional plan with Stripe IDs
UPDATE subscription_plans
SET
  stripe_product_id = 'prod_YOUR_PRODUCT_ID',
  stripe_price_id_monthly = 'price_YOUR_MONTHLY_PRICE_ID',
  stripe_price_id_yearly = 'price_YOUR_YEARLY_PRICE_ID'
WHERE name = 'Professional';

-- Verify
SELECT name, stripe_product_id, stripe_price_id_monthly, stripe_price_id_yearly
FROM subscription_plans;
```

### Step 6: Run Database Migration

```bash
cd wall-quote-wizard
supabase db push

# Or apply manually
psql -f supabase/migrations/20251005000002_stripe_first_billing.sql
```

### Step 7: Set Up Backend API

Your backend needs these endpoints:

#### Create API Directory Structure

```
api/
├── stripe/
│   ├── create-checkout-session.ts
│   ├── create-portal-session.ts
│   ├── update-subscription-quantity.ts
│   └── webhook.ts
```

I've already created example files in `api/stripe/` - copy them to your backend.

#### Deploy Backend (Choose your platform)

**Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Netlify:**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy functions
netlify deploy --prod
```

**Custom Node.js Server:**
```javascript
// server.js
const express = require('express');
const app = express();

app.post('/api/stripe/create-checkout-session', require('./api/stripe/create-checkout-session'));
app.post('/api/stripe/create-portal-session', require('./api/stripe/create-portal-session'));
app.post('/api/stripe/webhook', require('./api/stripe/webhook'));

app.listen(3001, () => console.log('Backend running on :3001'));
```

### Step 8: Configure Stripe Webhooks

1. **Stripe Dashboard → Developers → Webhooks → Add endpoint**

2. **Endpoint URL**: `https://your-backend.com/api/stripe/webhook`

3. **Select events to listen for**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

4. **Copy Webhook Signing Secret**:
   - After creating the endpoint, copy the signing secret (starts with `whsec_...`)
   - Add to your `.env`:
     ```
     STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
     ```

5. **Test webhook locally** (optional):
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe

   # Forward webhooks to local server
   stripe listen --forward-to localhost:3001/api/stripe/webhook

   # Test events
   stripe trigger checkout.session.completed
   ```

---

## 🧪 Testing the Complete Flow

### Test Mode (Recommended First)

Use Stripe test mode with test credit cards:

**Test Card Numbers:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

**Test Details:**
- Any future expiration date (e.g., 12/34)
- Any 3-digit CVC (e.g., 123)
- Any ZIP code (e.g., 12345)

### Testing Checklist

1. ✅ **User Flow**:
   - Create account
   - Create organization
   - Get redirected to `/subscription` page
   - See pricing for your user count
   - Click "Select Plan"
   - Redirected to Stripe Checkout
   - Enter test card
   - Complete checkout
   - Redirected back to dashboard

2. ✅ **Settings → Billing Tab**:
   - See current subscription
   - See user count
   - Click "Manage Billing" → Opens Stripe Customer Portal
   - View invoices
   - Update payment method
   - Cancel subscription

3. ✅ **Adding/Removing Users**:
   - Add a user to your organization
   - Call `/api/stripe/update-subscription-quantity`
   - Check Stripe Dashboard → Customers → Your customer
   - Verify quantity updated
   - Next invoice should reflect new user count

4. ✅ **Webhook Processing**:
   - Make a test payment
   - Check Supabase `subscriptions` table
   - Verify `stripe_subscription_status` updated to "active"
   - Verify `stripe_subscription_id` populated

---

## 🎯 Integration Points

### After User Creates Organization

In your organization creation flow, redirect to subscription page:

```typescript
// After organization is created
navigate('/subscription');
```

### In Dashboard (Optional Paywall)

Wrap protected content with the paywall:

```typescript
import { SubscriptionPaywall } from '@/components/common/SubscriptionPaywall';

function Dashboard() {
  const { organization } = useOrganizations();

  return (
    <SubscriptionPaywall organizationId={organization?.id}>
      {/* Your dashboard content */}
    </SubscriptionPaywall>
  );
}
```

### When Adding/Removing Users

Call the update endpoint:

```typescript
// After user joins organization
await fetch('/api/stripe/update-subscription-quantity', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ organizationId: 'org-123' }),
});
```

---

## 📊 Pricing Model

### How It Works

- **Per-User Pricing**: Each active user in an organization is a "seat"
- **Automatic Calculation**: System counts active memberships automatically
- **Proration**: Stripe automatically prorates when users are added/removed mid-billing

### Example Pricing

**Monthly Plan: $12.99/user/month**
- 1 user = $12.99/month
- 5 users = $64.95/month
- 10 users = $129.90/month

**Yearly Plan: $9.99/user/month ($119.88/year) - Save 23%**
- 1 user = $119.88/year
- 5 users = $599.40/year
- 10 users = $1,198.80/year

### When Adding a User Mid-Cycle

Example: Monthly plan with 5 users ($64.95/month), 15 days into billing period

1. Add 6th user
2. Stripe calculates prorated charge:
   - 6th user for remaining 15 days = ~$6.50
3. Next full invoice: $77.94 (6 users × $12.99)

---

## 🔒 Security Best Practices

### ✅ DO

- Store only Stripe IDs locally (customer_id, subscription_id)
- Use Stripe Customer Portal for payment management
- Validate webhook signatures
- Use service_role key for webhook handlers (bypasses RLS)
- Keep secret keys in environment variables
- Use HTTPS for webhook endpoints

### ❌ DON'T

- Store credit card numbers
- Store payment history locally (query Stripe API instead)
- Skip webhook signature verification
- Expose secret keys to frontend
- Trust client-side data for billing decisions

---

## 🐛 Troubleshooting

### Issue: Checkout session not creating

**Check:**
1. `VITE_STRIPE_PUBLISHABLE_KEY` in `.env`
2. Backend API endpoint is accessible
3. `stripe_price_id_monthly` populated in database
4. Browser console for errors

### Issue: Webhook not working

**Check:**
1. Webhook endpoint URL is correct and accessible
2. Webhook signing secret in `.env`
3. Selected correct events in Stripe Dashboard
4. Verify signature in webhook handler
5. Check Stripe Dashboard → Developers → Webhooks → Events log

### Issue: Subscription not showing in settings

**Check:**
1. Webhook `checkout.session.completed` fired
2. `subscriptions` table has row for organization
3. `stripe_subscription_id` populated
4. RLS policies allow reading subscriptions

### Issue: User count incorrect

**Check:**
1. Count active memberships:
   ```sql
   SELECT COUNT(*) FROM memberships
   WHERE organization_id = 'org-id' AND status = 'Active';
   ```
2. Call `calculateSubscriptionQuantity()` to verify
3. Update subscription quantity via API endpoint

---

## 📚 Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Proration Behavior](https://stripe.com/docs/billing/subscriptions/prorations)

---

## 🎉 You're Done!

Your Stripe billing system is now ready. Users can:
- ✅ Select plans based on their organization size
- ✅ Pay securely via Stripe Checkout
- ✅ Manage billing via Stripe Customer Portal
- ✅ Get automatically charged based on active users
- ✅ Receive prorated charges when adding/removing users

**Next Steps:**
1. Test in Stripe test mode
2. Switch to live mode when ready
3. Monitor Stripe Dashboard for subscriptions
4. Set up email notifications for payment failures
5. Configure trial periods if needed

---

**Questions?** Check the [Stripe Dashboard](https://dashboard.stripe.com) or review the code in:
- `src/services/stripeService.ts`
- `src/pages/Subscription.tsx`
- `src/components/features/settings/BillingTab.tsx`
- `api/stripe/*`
