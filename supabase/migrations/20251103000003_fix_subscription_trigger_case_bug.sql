-- Fix critical bug in subscription trigger
-- The trigger was using LOWER() but comparing against capitalized strings
-- This caused is_active to ALWAYS be set to false

-- Drop the broken trigger
DROP TRIGGER IF EXISTS set_subscription_is_active ON subscriptions;

-- Fix the function to use case-insensitive comparison
CREATE OR REPLACE FUNCTION update_subscription_is_active()
RETURNS TRIGGER AS $$
BEGIN
  -- Set is_active based on stripe_subscription_status
  -- Case-insensitive comparison (Stripe returns lowercase, webhook capitalizes)
  -- This handles both 'active'/'Active' and 'trialing'/'Trialing'
  NEW.is_active := LOWER(NEW.stripe_subscription_status) IN ('active', 'trialing');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER set_subscription_is_active
  BEFORE INSERT OR UPDATE OF stripe_subscription_status
  ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_is_active();

-- Fix existing records that have wrong is_active values
UPDATE subscriptions
SET is_active = (LOWER(stripe_subscription_status) IN ('active', 'trialing'))
WHERE
  stripe_subscription_status IS NOT NULL
  AND is_active != (LOWER(stripe_subscription_status) IN ('active', 'trialing'));

COMMENT ON FUNCTION update_subscription_is_active() IS 'Automatically sets is_active based on stripe_subscription_status (FIXED: case-insensitive lowercase comparison)';

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE '✅ CRITICAL BUG FIXED: Subscription trigger now uses case-insensitive comparison';
  RAISE NOTICE '   Before: LOWER(status) IN (''Active'', ''Trialing'') - ALWAYS FALSE (case mismatch)';
  RAISE NOTICE '   After:  LOWER(status) IN (''active'', ''trialing'') - WORKS CORRECTLY';
END $$;
