# Stripe Setup Guide: Seat-Based Pricing

## Your Pricing Structure

### Solo Plan (1 user)
- **Monthly:** $24.99/month
- **Annual:** $239.88/year ($19.99/month) - Save 20%

### Team Plan (2+ users)
- **Monthly:** $19.99/user/month
- **Annual:** $203.88/user/year ($16.99/user/month) - Save 15%

### Trial Period
- 14-day free trial for all plans
- No credit card required
- Auto-converts to paid after 14 days

---

## Part 1: Create Products in Stripe

### Step 1: Login to Stripe Dashboard
1. Go to https://dashboard.stripe.com/
2. Toggle to **Test Mode** (switch in top-right corner)

### Step 2: Create Solo Product

**A. Navigate to Products**
- Click **Products** in left sidebar
- Click **+ Add product**

**B. Enter Product Details:**
```
Name: WallQu Solo
Description: Perfect for individual contractors
```

**C. Add Monthly Price:**
- Price: $24.99
- Billing period: Monthly
- Currency: USD
- Click **Add price**

**D. Add Annual Price:**
- Click **+ Add another price**
- Price: $239.88
- Billing period: Yearly
- Currency: USD
- Click **Add price**

**E. Save Product**
- Click **Save product**
- ✅ **COPY** Product ID (starts with `prod_`)
- ✅ **COPY** both Price IDs (starts with `price_`)

### Step 3: Create Team Product

**A. Add New Product:**
- Click **+ Add product**

**B. Enter Product Details:**
```
Name: WallQu Team
Description: Collaborate with unlimited team members
```

**C. Add Monthly Price (METERED):**
- Price: $19.99
- Billing period: Monthly
- ✅ **CHECK:** "Usage is metered"
- Charge type: Per unit
- Unit name: `user`
- Currency: USD
- Click **Add price**

**D. Add Annual Price (METERED):**
- Click **+ Add another price**
- Price: $203.88
- Billing period: Yearly
- ✅ **CHECK:** "Usage is metered"
- Charge type: Per unit
- Unit name: `user`
- Currency: USD
- Click **Add price**

**E. Save Product**
- Click **Save product**
- ✅ **COPY** Product ID
- ✅ **COPY** both Price IDs

---

## Part 2: Configure Trial Settings

### Go to Billing Settings
1. Click **Settings** (gear icon)
2. Click **Billing** → **Trial periods**
3. Set: **Default trial: 14 days**
4. Enable: **Allow trials without payment method**
5. Click **Save**

---

## Part 3: Record Your IDs

**Copy and save these IDs - you'll need them:**

```javascript
// TEST MODE IDs
SOLO_PRODUCT_ID:     prod_________________
SOLO_PRICE_MONTHLY:  price________________
SOLO_PRICE_ANNUAL:   price________________

TEAM_PRODUCT_ID:     prod_________________
TEAM_PRICE_MONTHLY:  price________________
TEAM_PRICE_ANNUAL:   price________________
```

---

## Part 4: Test Your Setup

### Test 1: Solo Monthly Subscription
1. Products → "WallQu Solo"
2. Click **Create subscription**
3. Create test customer (email: solo@test.com)
4. Use test card: `4242 4242 4242 4242`
5. Select Monthly price
6. Verify: Shows "14-day trial"
7. Create subscription

**Expected:** Status = Trialing, $24.99 after trial

### Test 2: Team Subscription (3 users)
1. Products → "WallQu Team"
2. Click **Create subscription**
3. Create test customer (email: team@test.com)
4. Use test card: `4242 4242 4242 4242`
5. Select Monthly price
6. Set quantity: 3
7. Verify: Shows "14-day trial"
8. Create subscription

**Expected:** Status = Trialing, $59.97 (3 × $19.99) after trial

### Test 3: Update Quantity
1. Open Team subscription
2. Click **Update subscription**
3. Change quantity: 3 → 5
4. Save

**Expected:** Prorated charge, new total $99.95

---

## Pricing Table Reference

| Plan | Users | Monthly | Annual (total) | Savings |
|------|-------|---------|----------------|---------|
| Solo | 1 | $24.99 | $239.88/yr | $59.88/yr |
| Team | 2 | $39.98 | $407.76/yr | $71.88/yr |
| Team | 5 | $99.95 | $1,019.40/yr | $179.70/yr |
| Team | 10 | $199.90 | $2,038.80/yr | $359.40/yr |

---

## Test Cards

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 9995` | Fails (insufficient funds) |
| `4000 0000 0000 0002` | Declined |

Use any future date for expiry, any 3 digits for CVC.

---

## Next Steps

After completing setup:

1. ✅ Share your Product and Price IDs with me
2. I'll implement the billing logic in the app
3. I'll create the pricing page
4. We'll test end-to-end

---

## Questions?

**Q: Can't find "Usage is metered"?**
A: Select "Standard pricing" model first, then option appears.

**Q: Solo vs Team difference?**
A: Solo = fixed 1 user, Team = dynamic quantity (metered).

**Q: When to switch to Live Mode?**
A: After fully testing in Test Mode. You'll create products again in Live Mode.

Ready when you have your IDs! 🎯
