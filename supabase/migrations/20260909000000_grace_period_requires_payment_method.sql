-- Payment-failure grace periods require a payment method on file: a trial that
-- ends without a card fails its first invoice like any other payment failure,
-- which kept never-paying accounts active for weeks.

CREATE OR REPLACE FUNCTION public.update_subscription_is_active() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Set is_active based on stripe_subscription_status
  -- Case-insensitive comparison (Stripe returns lowercase, webhook capitalizes)
  NEW.is_active := LOWER(NEW.stripe_subscription_status) IN ('active', 'trialing');

  -- Grace period: keep is_active=true if grace_period_end is still in the
  -- future AND there is a payment method to retry.
  IF NOT NEW.is_active
     AND NEW.grace_period_end IS NOT NULL
     AND NEW.grace_period_end > now()
     AND COALESCE(NEW.has_payment_method, false) THEN
    NEW.is_active := true;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_valid_subscription(org_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.organization_id = org_id
    AND s.access_blocked = false
    AND (
      -- Normal active access
      (s.is_active = true AND LOWER(s.stripe_subscription_status) IN ('active', 'trialing'))
      OR
      -- Grace period access, for a customer with a card we can retry
      (s.grace_period_end IS NOT NULL
       AND s.grace_period_end > now()
       AND COALESCE(s.has_payment_method, false))
    )
  );
END;
$$;

-- Retire grace periods already granted to trials that never converted.
UPDATE public.subscriptions
SET grace_period_end = NULL,
    is_active = false,
    access_blocked_reason = 'No payment method',
    updated_at = now()
WHERE grace_period_end IS NOT NULL
  AND COALESCE(has_payment_method, false) = false
  AND LOWER(stripe_subscription_status) NOT IN ('active', 'trialing');

-- Existing grace periods were anchored on current_period_end, which Stripe had
-- already advanced past the unpaid period — so they run weeks longer than the
-- 7 days intended. Clamp the ones still open back to at most 7 days from now.
UPDATE public.subscriptions
SET grace_period_end = now() + interval '7 days',
    updated_at = now()
WHERE grace_period_end > now() + interval '7 days';
