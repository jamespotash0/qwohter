# Seat-Based Pricing Implementation Summary

## ✅ What's Been Completed

### 1. Database Schema
- **Migration**: `20251027000001_setup_seat_based_pricing.sql`
  - Created Solo and Team pricing plans in `subscription_plans` table
  - Added `number_of_active_users` column to `subscriptions` table
  - Created `calculate_active_users()` function for automatic user counting
  - Added database trigger to auto-update user count when memberships change
  - Set up 14-day trial configuration for both plans

### 2. Frontend UI
- **New BillingTab Component** ([BillingTab.tsx](src/components/features/settings/BillingTab.tsx))
  - Monthly/Yearly billing interval toggle
  - Pricing cards matching your design mockup
  - Solo Plan card (orange FREE badge)
  - Team Plan card (orange PRO badge)
  - Current plan highlighting
  - Features list with checkmarks
  - "Upgrade Plan" button that opens Stripe checkout
  - Billing History table with:
    - Plan name, amounts, purchase/end dates, status badges
    - Download and view invoice actions
    - Multi-select with export functionality
    - Search and filter capabilities

### 3. Stripe Integration
- **Enhanced stripeService** ([stripeService.ts](src/services/stripeService.ts))
  - `createCheckoutSession()` - Creates Stripe checkout for plan upgrades
  - `getInvoices()` - Fetches billing history from Stripe API
  - `calculateSubscriptionQuantity()` - Counts active users for metered billing
  - Supports both Solo (fixed price) and Team (per-user) pricing
  - Automatic quantity calculation based on active members

### 4. Dependencies
- ✅ Installed `@stripe/stripe-js` package
- ✅ Added `VITE_STRIPE_PUBLISHABLE_KEY` to `.env.example`
- ✅ Badge component already exists

### 5. Documentation
- **STRIPE_SETUP_GUIDE.md** - Step-by-step guide to create Stripe products
- **STRIPE_EDGE_FUNCTIONS_GUIDE.md** - Complete implementation guide for backend
- **PLAN_SEAT_BASED_PRICING.md** - Original comprehensive planning document

---

## 📋 What You Need to Do Next

### Step 1: Configure Stripe Products (30 minutes)

Follow [STRIPE_SETUP_GUIDE.md](STRIPE_SETUP_GUIDE.md):

1. Create Solo product in Stripe:
   - Monthly price: $24.99
   - Annual price: $239.88 ($19.99/month)

2. Create Team product with metered billing:
   - Monthly price: $19.99 per user
   - Annual price: $203.88 per user/year ($16.99/month)

3. Configure 14-day trial in Stripe Billing Settings

4. Copy the 6 IDs you'll get:
   - `prod_solo_xxxxx`
   - `price_solo_monthly_xxxxx`
   - `price_solo_annual_xxxxx`
   - `prod_team_xxxxx`
   - `price_team_monthly_xxxxx`
   - `price_team_annual_xxxxx`

### Step 2: Update Migration with Real Stripe IDs (5 minutes)

Edit [supabase/migrations/20251027000001_setup_seat_based_pricing.sql](supabase/migrations/20251027000001_setup_seat_based_pricing.sql):

Replace these placeholders:
```sql
stripe_product_id: 'prod_solo_placeholder'
stripe_price_id_monthly: 'price_solo_monthly_placeholder'
stripe_price_id_annual: 'price_solo_annual_placeholder'
```

With your actual Stripe IDs:
```sql
stripe_product_id: 'prod_solo_ABC123'
stripe_price_id_monthly: 'price_solo_monthly_XYZ789'
stripe_price_id_annual: 'price_solo_annual_DEF456'
```

### Step 3: Run the Migration (2 minutes)

```bash
# If using Supabase local development
supabase db reset

# Or apply just this migration
supabase migration up
```

### Step 4: Create Stripe Edge Functions (45 minutes)

Follow [STRIPE_EDGE_FUNCTIONS_GUIDE.md](STRIPE_EDGE_FUNCTIONS_GUIDE.md):

1. Create 3 Edge Functions:
   - `stripe-handler` - Creates checkout sessions
   - `get-invoices` - Fetches billing history
   - `stripe-webhooks` - Syncs subscription status

2. Set Stripe environment variables:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. Deploy the functions:
   ```bash
   supabase functions deploy stripe-handler
   supabase functions deploy get-invoices
   supabase functions deploy stripe-webhooks
   ```

4. Configure webhook endpoint in Stripe Dashboard

### Step 5: Add Environment Variable Locally (1 minute)

Create/update your `.env` file:
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51...
```

Get your publishable key from: Stripe Dashboard → Developers → API keys

### Step 6: Test Everything (30 minutes)

1. **Start your dev server**:
   ```bash
   npm run dev
   ```

2. **Navigate to Settings → Billing tab**

3. **Verify the UI**:
   - [ ] Monthly/Yearly toggle works
   - [ ] Solo and Team cards display correctly
   - [ ] Prices update when toggling billing interval
   - [ ] User count shows correctly on Team card

4. **Test Upgrade Flow**:
   - [ ] Click "Upgrade Plan" on Solo card
   - [ ] Should redirect to Stripe Checkout
   - [ ] Use test card: `4242 4242 4242 4242`
   - [ ] Complete checkout
   - [ ] Verify redirect back to your app
   - [ ] Check subscription status in database

5. **Test Billing History**:
   - [ ] After completing a test purchase, billing history should populate
   - [ ] Download invoice button should work
   - [ ] View invoice button should open PDF

---

## 🎯 Pricing Structure

### Solo Plan (1 user)
- **Monthly**: $24.99/month
- **Annual**: $239.88/year ($19.99/month equivalent)
- **Trial**: 14 days free
- **Features**:
  - All core features included
  - Unlimited quotes
  - PDF export
  - Basic analytics
  - Email support

### Team Plan (2+ users)
- **Monthly**: $19.99 per user/month
- **Annual**: $203.88 per user/year ($16.99/month equivalent)
- **Trial**: 14 days free
- **Billing**: Metered - automatically adjusts when you add/remove team members
- **Features**:
  - All Solo features
  - Team collaboration
  - Advanced analytics
  - Department management
  - Priority support
  - Custom branding

---

## 🔧 Technical Architecture

### Frontend Flow
1. User clicks "Upgrade Plan"
2. `BillingTab.tsx` calls `stripeService.createCheckoutSession()`
3. Service calls Supabase Edge Function `stripe-handler`
4. Edge Function creates Stripe Checkout Session
5. User redirected to Stripe's hosted checkout
6. After payment, redirected back to success URL

### Backend Flow
1. Stripe Checkout Session created with:
   - Customer ID (from subscription record or newly created)
   - Price ID (monthly or annual)
   - Quantity (1 for Solo, active user count for Team)
   - 14-day trial period
   - Metadata (org ID, plan ID)

2. When checkout completes:
   - Stripe sends webhook to `stripe-webhooks` Edge Function
   - Webhook updates subscription record in database:
     - Sets `stripe_subscription_id`
     - Sets `stripe_subscription_status` to "active" or "trialing"
     - Sets `current_period_end`
     - Sets `is_active` to true

3. User count auto-updates:
   - When memberships change (add/remove/activate/deactivate)
   - Database trigger recalculates active user count
   - Updates `subscriptions.number_of_active_users`
   - For Team plans, this affects next billing cycle

---

## 📊 Database Triggers

### `trigger_update_subscription_user_count`
- **Fires on**: INSERT, UPDATE (status column), DELETE on `memberships` table
- **Action**: Recalculates and updates `subscriptions.number_of_active_users`
- **Purpose**: Keeps user count in sync for metered billing

Example flow:
1. Admin adds new team member → Status = 'Active'
2. Trigger fires → Recounts active users (was 3, now 4)
3. Updates subscription: `number_of_active_users = 4`
4. Next Stripe invoice will charge for 4 users (if on Team plan)

---

## 🧪 Testing Checklist

### Pre-Deployment Testing
- [ ] Solo plan displays correct monthly price ($24.99)
- [ ] Solo plan displays correct annual price ($19.99/month, $239.88/year)
- [ ] Team plan displays correct monthly price ($19.99/user)
- [ ] Team plan displays correct annual price ($16.99/user/month, $203.88/user/year)
- [ ] User count updates when team members added/removed
- [ ] Checkout session creates successfully
- [ ] Stripe test payment completes
- [ ] Webhook updates subscription status
- [ ] Billing history populates after payment
- [ ] Invoice download works

### Post-Deployment Testing
- [ ] Test with real payment method in test mode
- [ ] Verify trial period starts correctly (14 days)
- [ ] Test adding users mid-trial (should not affect trial)
- [ ] Test adding users after trial ends (should prorate)
- [ ] Test downgrading from Team to Solo
- [ ] Test cancellation flow
- [ ] Verify access blocked when subscription expires

---

## 🚀 Production Launch Checklist

Before switching to live mode:

1. **Stripe Configuration**
   - [ ] Create live products (not test products)
   - [ ] Update migration with live product/price IDs
   - [ ] Configure live webhook endpoint
   - [ ] Set live Stripe secret key in Supabase
   - [ ] Update frontend with live publishable key

2. **Security**
   - [ ] Verify all API keys are in environment variables (not hardcoded)
   - [ ] Test webhook signature verification
   - [ ] Ensure only authenticated users can create checkouts
   - [ ] Verify organization ownership before allowing upgrades

3. **Monitoring**
   - [ ] Set up Stripe email notifications
   - [ ] Monitor webhook delivery in Stripe Dashboard
   - [ ] Set up alerts for failed payments
   - [ ] Track subscription status changes

4. **User Experience**
   - [ ] Test complete user journey
   - [ ] Verify success/cancel redirects work
   - [ ] Test email receipts from Stripe
   - [ ] Ensure billing history updates in real-time

5. **Documentation**
   - [ ] Update user-facing docs with pricing info
   - [ ] Create help articles for billing questions
   - [ ] Document cancellation policy
   - [ ] Add FAQ about trials and billing

---

## 📁 Key Files Reference

### Frontend
- [src/components/features/settings/BillingTab.tsx](src/components/features/settings/BillingTab.tsx) - Main billing UI
- [src/services/stripeService.ts](src/services/stripeService.ts) - Stripe API integration
- [.env.example](.env.example) - Environment variables template

### Backend
- [supabase/migrations/20251027000001_setup_seat_based_pricing.sql](supabase/migrations/20251027000001_setup_seat_based_pricing.sql) - Database schema
- `supabase/functions/stripe-handler/index.ts` - Checkout session creation (to be created)
- `supabase/functions/get-invoices/index.ts` - Invoice fetching (to be created)
- `supabase/functions/stripe-webhooks/index.ts` - Webhook handling (to be created)

### Documentation
- [STRIPE_SETUP_GUIDE.md](STRIPE_SETUP_GUIDE.md) - Stripe product creation guide
- [STRIPE_EDGE_FUNCTIONS_GUIDE.md](STRIPE_EDGE_FUNCTIONS_GUIDE.md) - Backend implementation guide
- [PLAN_SEAT_BASED_PRICING.md](PLAN_SEAT_BASED_PRICING.md) - Original planning document

---

## 💡 Tips & Best Practices

1. **Always use test mode first** - Stripe has comprehensive test card numbers
2. **Monitor webhook delivery** - Check Stripe Dashboard for webhook status
3. **Handle edge cases** - What happens if webhook fails? Implement retry logic
4. **Proration is automatic** - Stripe handles proration when adding/removing users
5. **Trial period is generous** - 14 days gives users time to evaluate
6. **Keep it simple** - No complex tier upgrades, just per-user billing
7. **Communicate clearly** - Make pricing transparent on landing page

---

## 🆘 Troubleshooting

### Issue: Checkout button doesn't work
- **Check**: Browser console for errors
- **Verify**: `VITE_STRIPE_PUBLISHABLE_KEY` is set in `.env`
- **Verify**: Edge Function `stripe-handler` is deployed
- **Verify**: Stripe product/price IDs are not placeholders

### Issue: Webhook not firing
- **Check**: Webhook endpoint URL is correct
- **Check**: Webhook signing secret is set in Supabase
- **Check**: Events are selected in Stripe webhook configuration
- **Test**: Use Stripe CLI to trigger test events

### Issue: User count not updating
- **Check**: Database trigger exists: `trigger_update_subscription_user_count`
- **Check**: Migration ran successfully
- **Verify**: Memberships table has status column
- **Test**: Manually add a member and check subscription record

### Issue: Invoices not showing
- **Check**: `stripe_customer_id` exists in subscription record
- **Check**: Edge Function `get-invoices` is deployed
- **Check**: Stripe API key has correct permissions
- **Test**: Call Edge Function directly with curl

---

## 📞 Support Resources

- **Stripe Docs**: https://stripe.com/docs
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Stripe Testing**: https://stripe.com/docs/testing
- **Webhook Testing**: https://stripe.com/docs/webhooks/test

---

**Status**: ✅ Frontend complete, backend guide ready, waiting for Stripe configuration

**Next Action**: Follow Step 1 above to create Stripe products and get your IDs!
