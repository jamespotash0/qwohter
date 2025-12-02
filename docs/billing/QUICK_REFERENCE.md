# Stripe Billing Quick Reference

**TL;DR:** 60% complete. Deploy webhook, automate seat sync, test proration. 1-2 weeks to production.

---

## Critical Path to Production

1. **Deploy webhook** (2 hours) → Subscription status updates work
2. **Automate seat sync** (1 day) → Billing accuracy
3. **Test proration** (1 day) → No billing surprises
4. **Create real Stripe products** (1 hour) → Can accept payments

**Total:** ~3 days of focused work

---

## Quick Commands

### Deploy Webhook
```bash
cd supabase
supabase functions deploy stripe-webhook
# Add endpoint in Stripe Dashboard
# URL: https://[project].supabase.co/functions/v1/stripe-webhook
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### Create Stripe Products
```bash
# Individual Plan
stripe products create --name "Individual Plan"
stripe prices create --product prod_... --unit-amount 2499 --currency usd --recurring[interval]=month

# Team Plan
stripe products create --name "Team Plan"
stripe prices create --product prod_... --unit-amount 1999 --currency usd --recurring[interval]=month --recurring[usage_type]=licensed
```

### Test Webhook
```bash
stripe listen --forward-to https://[project].supabase.co/functions/v1/stripe-webhook
stripe trigger customer.subscription.created
```

### View Logs
```bash
supabase functions logs stripe-webhook
stripe logs tail
```

---

## User Flows at a Glance

### Signup → Trial → Paid
```
Signup → Auto-trial (14 days) → Grace period (3 days) → Paywall or Paid
```

### Add User → Bill
```
Invite user → DB trigger updates count → Frontend calls manage-seats → Stripe prorates
```

### Failed Payment
```
Payment fails → Webhook blocks access → Customer updates card → Access restored
```

---

## Key Files

| File | Purpose |
|------|---------|
| `/src/services/stripeService.ts` | Stripe API wrapper |
| `/supabase/functions/stripe-webhook/` | Webhook handler |
| `/supabase/functions/manage-seats/` | Seat sync |
| `/src/components/features/settings/BillingTab.tsx` | Billing UI |
| `/src/components/common/SubscriptionPaywall.tsx` | Access control |
| `/src/hooks/queries/useOrganizations.ts` | Member management |

---

## Database Quick Queries

```sql
-- Check subscription status
SELECT
  o.name AS organization,
  s.stripe_subscription_status AS status,
  s.number_of_active_users AS seats,
  s.trial_end,
  s.has_payment_method
FROM subscriptions s
JOIN organizations o ON o.id = s.organization_id
ORDER BY s.created_at DESC
LIMIT 10;

-- Find subscriptions needing sync
SELECT * FROM subscriptions_pending_sync;

-- View seat changes
SELECT * FROM subscription_seat_usage_events
ORDER BY created_at DESC
LIMIT 20;

-- Check trial status
SELECT
  o.name,
  s.trial_end,
  s.has_payment_method,
  EXTRACT(DAY FROM (s.trial_end - NOW())) AS days_remaining
FROM subscriptions s
JOIN organizations o ON o.id = s.organization_id
WHERE s.stripe_subscription_status = 'Trialing'
ORDER BY s.trial_end;
```

---

## Environment Variables Checklist

```bash
# Required for Production
✓ STRIPE_SECRET_KEY=sk_live_...
✓ VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
✓ STRIPE_WEBHOOK_SECRET=whsec_...
✓ STRIPE_PRICE_ID_PER_USER_MONTHLY=price_...
✓ SUPABASE_URL=https://...
✓ SUPABASE_SERVICE_ROLE_KEY=eyJ...
✓ SUPABASE_ANON_KEY=eyJ...
```

---

## Common Issues & Fixes

### Webhook not working
```bash
# Check if deployed
supabase functions list

# Check logs
supabase functions logs stripe-webhook

# Verify secret
supabase secrets list | grep STRIPE
```

### Seats not syncing
```typescript
// Add to inviteMember() in useOrganizations.ts
await supabase.functions.invoke('manage-seats', {
  body: { action: 'add', organizationId, triggeredByUserId: userId }
});
```

### Proration not showing
- Ensure subscription is active (not trialing)
- Check `proration_behavior: 'always_invoice'`
- Verify price is set to `licensed` usage type

---

## Stripe Test Cards

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient funds: 4000 0000 0000 9995
Expired: 4000 0000 0000 0069
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/functions/v1/stripe-webhook` | POST | Webhook handler |
| `/functions/v1/create-trial-subscription` | POST | Start trial |
| `/functions/v1/manage-seats` | POST | Update seats |
| `/functions/v1/create-portal-session` | POST | Billing portal |
| `/functions/v1/cancel-subscription` | POST | Cancel sub |
| `/functions/v1/reactivate-subscription` | POST | Reactivate |
| `/functions/v1/get-invoices` | GET | Fetch invoices |

---

## Monitoring Queries

```sql
-- Webhook health (last 24 hours)
SELECT
  COUNT(*) AS total_events,
  COUNT(*) FILTER (WHERE processed = true) AS processed,
  COUNT(*) FILTER (WHERE processed = false) AS failed
FROM stripe_webhook_events
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Active subscriptions breakdown
SELECT
  stripe_subscription_status,
  COUNT(*) AS count
FROM subscriptions
GROUP BY stripe_subscription_status;

-- Revenue metrics
SELECT
  COUNT(*) FILTER (WHERE stripe_subscription_status = 'Active') AS paid_subs,
  COUNT(*) FILTER (WHERE stripe_subscription_status = 'Trialing') AS trials,
  SUM(number_of_active_users) FILTER (WHERE stripe_subscription_status = 'Active') AS total_paid_seats
FROM subscriptions;

-- Seat sync lag
SELECT COUNT(*) AS needs_sync
FROM subscriptions
WHERE stripe_quantity_pending_sync = true;
```

---

## Support Snippets

### User can't access app
```sql
-- Check subscription
SELECT
  stripe_subscription_status,
  access_blocked,
  access_blocked_reason,
  trial_end,
  has_payment_method
FROM subscriptions
WHERE organization_id = '[ORG_ID]';

-- Manually restore access (use with caution)
UPDATE subscriptions
SET access_blocked = false,
    access_blocked_reason = null
WHERE organization_id = '[ORG_ID]';
```

### Billing dispute
```sql
-- Get full billing history
SELECT
  created_at,
  event_type,
  previous_seat_count,
  new_seat_count,
  triggered_by_user_id
FROM subscription_seat_usage_events
WHERE subscription_id = (
  SELECT id FROM subscriptions WHERE organization_id = '[ORG_ID]'
)
ORDER BY created_at;
```

---

## Next Steps

1. Read [STRIPE_ARCHITECTURE.md](./STRIPE_ARCHITECTURE.md) for full context
2. Follow [STRIPE_IMPLEMENTATION_GUIDE.md](./STRIPE_IMPLEMENTATION_GUIDE.md) step-by-step
3. Test thoroughly in test mode
4. Deploy to production

---

**Need Help?**
- [Stripe Documentation](https://stripe.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- Check `#billing` channel in team Slack
