-- Set default subscription status for existing subscriptions
-- This fixes the paywall issue where stripe_subscription_status is NULL

-- Update all subscriptions that don't have a status set
-- If they're active and not blocked, set them to 'Active'
UPDATE public.subscriptions
SET stripe_subscription_status = 'Active'
WHERE stripe_subscription_status IS NULL
  AND is_active = true
  AND access_blocked = false;

-- For any that are Inactive or Blocked, mark as 'Canceled'
UPDATE public.subscriptions
SET stripe_subscription_status = 'Canceled'
WHERE stripe_subscription_status IS NULL
  AND (is_active = false OR access_blocked = true);

-- Add a helpful comment
COMMENT ON COLUMN public.subscriptions.stripe_subscription_status IS
'Subscription status from Stripe: Active, Trialing, Past Due, Canceled, Incomplete, etc. Must be set for access control to work.';
