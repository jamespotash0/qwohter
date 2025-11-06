# The `is_active` Race Condition Fix

## Executive Summary

**Bug:** Frontend and backend subscription validation were out of sync, causing users to see the app UI but encounter permission errors when loading data.

**Root Cause:** JavaScript `hasValidSubscription()` didn't check `is_active` field, while database `has_valid_subscription()` did.

**Fix:** Added `is_active` check to JavaScript function to match database logic.

---

## Understanding `is_active`

### What is `is_active`?

The `is_active` field is a **master switch** for subscription access, set by Stripe webhooks:

```typescript
// From stripe-webhook/index.ts:162
is_active: ['active', 'trialing'].includes(status) && !isPaused
```

### When is it `false`?

1. **Subscription canceled** (`status = 'canceled'`)
2. **Subscription paused** (`isPaused = true`)
3. **Subscription past due** (`status = 'past_due'`)
4. **Subscription unpaid** (`status = 'unpaid'`)
5. **Any non-active status** (incomplete, incomplete_expired, etc.)

### When is it `true`?

Only when:
- Subscription status is 'active' OR 'trialing'
- AND subscription is not paused
- AND subscription is not blocked

---

## The Bug in Detail

### Two Validation Functions

#### Database Function (Correct) ✅
```sql
CREATE OR REPLACE FUNCTION has_valid_subscription(org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM subscriptions
    WHERE organization_id = org_id
    AND is_active = true              -- ✅ CHECKS is_active
    AND access_blocked = false
    AND stripe_subscription_status IN ('Active', 'Trialing')
  );
END;
$$
```

**Used by:** Row Level Security (RLS) policies

#### JavaScript Function (Bug) ❌
```typescript
// BEFORE FIX
export const hasValidSubscription = async (organizationId: string) => {
  const { data: subscription, error } = await getSubscription(organizationId);

  if (error || !subscription) {
    return { isValid: false, reason: 'No subscription found' };
  }

  if (subscription.access_blocked) {
    return { isValid: false, reason: 'Access blocked' };
  }

  // ❌ NEVER CHECKS is_active!

  const validStatuses = ['active', 'trialing'];
  const status = subscription.stripe_subscription_status?.toLowerCase();

  if (!status || !validStatuses.includes(status)) {
    return { isValid: false, reason: 'Invalid status' };
  }

  return { isValid: true };  // ❌ Can return true even when is_active = false!
}
```

**Used by:**
- SubscriptionPaywall.tsx
- Settings.tsx
- All frontend access control

---

## The Race Condition

### Scenario 1: Subscription Paused

```
T=0ms:  User clicks "Pause Subscription"
        └─> Stripe API called

T=50ms: Stripe processes pause
        └─> Webhook sent to your server

T=100ms: Webhook handler runs
         └─> Updates database:
             is_active: true → false
             stripe_subscription_status: 'Active' → 'Paused'

T=150ms: Frontend checks subscription
         Backend (SQL): is_active = false → BLOCKS ACCESS ✅
         Frontend (JS): status = 'Paused' → BLOCKS ACCESS ✅

         Result: Consistent! (But only because 'Paused' is not in validStatuses)
```

### Scenario 2: Subscription Canceled (The Bug!)

```
T=0ms:  User cancels subscription at period end
        └─> Stripe API called with cancel_at_period_end = true

T=50ms: Stripe webhook fires
        └─> Updates database:
            cancel_at_period_end: false → true
            is_active: true (STILL TRUE!)
            stripe_subscription_status: 'Active' (STILL ACTIVE!)

// User still has access until period ends - this is correct!

... [14 days later] ...

T=14d:  Billing period ends
        └─> Stripe webhook: customer.subscription.deleted

T=14d+50ms: Webhook handler starts processing
            └─> Updates database (in this order):
                1. is_active: true → false  (IMMEDIATE!)
                2. stripe_subscription_status: 'Active' → 'Canceled' (DELAYED!)

T=14d+75ms: Frontend checks subscription
            Database shows:
              is_active: false               ← Updated!
              stripe_subscription_status: 'Active'  ← Not yet updated!

            Backend (SQL): is_active = false → BLOCKS ACCESS ✅
            Frontend (JS): status = 'Active' → ALLOWS ACCESS ❌

            Result: INCONSISTENT! User sees UI, data fails to load!
```

### Scenario 3: Network Delay (Worse!)

```
T=0ms:  Subscription expires
        └─> Stripe webhook sent

T=0ms:  User loads app (before webhook arrives)
        └─> Reads cached subscription:
            is_active: true
            status: 'Active'
        Frontend: ALLOWS ACCESS ✅ (legitimate, webhook not arrived)
        Backend: ALLOWS ACCESS ✅

T=500ms: Webhook arrives (network delay)
         └─> Updates is_active: false

T=501ms: User clicks "Dashboard"
         Frontend: Re-checks subscription
         Database shows:
           is_active: false              ← Updated!
           status: 'Active'              ← Webhook still processing...

         Frontend (JS - BEFORE FIX): status = 'Active' → ALLOWS ❌
         Backend (SQL): is_active = false → BLOCKS ✅

         Result: User sees loading spinner, then permission errors!
```

---

## The Fix

### Added `is_active` Check

```typescript
// AFTER FIX
export const hasValidSubscription = async (organizationId: string) => {
  const { data: subscription, error } = await getSubscription(organizationId);

  if (error || !subscription) {
    return { isValid: false, reason: 'No subscription found' };
  }

  // Check 1: Manual override
  if (subscription.access_blocked) {
    return { isValid: false, reason: 'Access blocked' };
  }

  // Check 2: Master switch ✅ NEW!
  if (!subscription.is_active) {
    return {
      isValid: false,
      reason: 'Subscription is not active',
    };
  }

  // Check 3: Stripe status
  const validStatuses = ['active', 'trialing'];
  const status = subscription.stripe_subscription_status?.toLowerCase();

  if (!status || !validStatuses.includes(status)) {
    return { isValid: false, reason: 'Invalid status' };
  }

  return { isValid: true };
}
```

### Now Both Functions Match!

```
Database (SQL):
├─ is_active = true
├─ access_blocked = false
└─ status IN ('Active', 'Trialing')

JavaScript:
├─ access_blocked = false
├─ is_active = true          ✅ ADDED!
└─ status IN ('active', 'trialing')

Result: CONSISTENT! ✅
```

---

## Testing the Fix

### Test Case 1: Direct Database Update
```sql
-- Simulate webhook setting is_active to false
UPDATE subscriptions
SET is_active = false
WHERE organization_id = 'test-org-id';

-- Frontend should now block access immediately
```

**Expected:**
- ✅ Frontend: Access denied
- ✅ Backend: Access denied
- ✅ Console: Shows `isActive: false`

### Test Case 2: Paused Subscription
```typescript
// Pause subscription via Stripe
const subscription = await stripe.subscriptions.update(subId, {
  pause_collection: { behavior: 'void' }
});

// Webhook sets: is_active = false, status = 'Paused'
```

**Expected:**
- ✅ Frontend: Access denied (is_active = false)
- ✅ Backend: Access denied
- ✅ User sees paywall immediately

### Test Case 3: Canceled Subscription
```typescript
// Cancel subscription
const subscription = await stripe.subscriptions.update(subId, {
  cancel_at_period_end: true
});

// During grace period:
// is_active = true, cancel_at_period_end = true
```

**Expected:**
- ✅ Frontend: Access granted (is_active still true)
- ✅ Backend: Access granted
- ✅ User can use app until period ends

```typescript
// After period ends (webhook: customer.subscription.deleted)
// is_active = false, status = 'Canceled'
```

**Expected:**
- ✅ Frontend: Access denied (is_active = false)
- ✅ Backend: Access denied
- ✅ User sees paywall immediately

---

## Why This Matters

### Before Fix ❌
```
User Experience:
1. Subscription expires
2. User opens app
3. UI loads successfully ✅
4. Clicks "Dashboard"
5. Sees loading spinner
6. Gets error: "Permission denied" ❌
7. Confused: "I can see the app but can't use it?"
```

### After Fix ✅
```
User Experience:
1. Subscription expires
2. User opens app
3. Immediately sees paywall ✅
4. Clear message: "Your subscription has expired"
5. Option to reactivate
6. No confusing permission errors ✅
```

---

## Additional Benefits

### Improved Debugging
```typescript
// Console now shows:
{
  isActive: false,           // ← Can see the problem!
  accessBlocked: false,
  rawStatus: 'Active',
  lowercaseStatus: 'active',
  validStatuses: ['active', 'trialing'],
  isIncluded: true
}

// Clear diagnosis: "is_active is false, blocking access"
```

### Faster Blocking
```
Before: Wait for stripe_subscription_status to update
After:  Block as soon as is_active = false
Result: More responsive access control
```

### Consistency
```
Frontend validation = Backend validation
No more split-brain scenarios
Better user experience
```

---

## Related Code

### Database Function
- **Location:** `supabase/migrations/20251005000002_stripe_first_billing.sql:162`
- **Function:** `has_valid_subscription(org_id uuid)`

### JavaScript Function
- **Location:** `src/services/stripeService.ts:196`
- **Function:** `hasValidSubscription(organizationId: string)`

### Webhook Handler
- **Location:** `supabase/functions/stripe-webhook/index.ts:162`
- **Sets:** `is_active: ['active', 'trialing'].includes(status) && !isPaused`

### Usage
- **SubscriptionPaywall:** `src/components/common/SubscriptionPaywall.tsx:106`
- **Settings Page:** `src/pages/Settings.tsx:45`

---

## Deployment Notes

### Risk Assessment
- **Risk Level:** Medium
- **Impact:** All subscription validation
- **Breaking Changes:** None (only makes validation more strict)

### Rollout Plan
1. ✅ Fix implemented in `fix/race-conditions-critical` branch
2. ⏳ Test thoroughly in development
3. ⏳ Deploy to staging
4. ⏳ Verify fix works as expected
5. ⏳ Merge to main
6. ⏳ Deploy to production
7. ⏳ Monitor for issues

### Monitoring
Watch for:
- Unexpected paywall displays
- Permission errors (should decrease!)
- Subscription validation logs

---

## Future Improvements

### Consider Adding:
1. **Automated Tests**
   ```typescript
   describe('hasValidSubscription', () => {
     it('should block when is_active is false', async () => {
       const result = await hasValidSubscription(orgId);
       expect(result.isValid).toBe(false);
     });
   });
   ```

2. **Type Safety**
   ```typescript
   interface SubscriptionValidation {
     isValid: boolean;
     reason: string | null;
     checks: {
       exists: boolean;
       isActive: boolean;
       accessBlocked: boolean;
       validStatus: boolean;
     };
   }
   ```

3. **Metrics**
   - Track how often each validation check fails
   - Monitor race condition frequency
   - Alert on validation inconsistencies

---

## Conclusion

This fix ensures frontend and backend subscription validation are always in sync by checking the `is_active` master switch. This prevents race conditions where webhooks update database fields in different orders, causing inconsistent behavior.

**Result:** Users get immediate, consistent feedback about their subscription status, with no confusing permission errors.
