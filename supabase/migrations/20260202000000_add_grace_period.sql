-- Add grace_period_end column for payment failure grace periods
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS grace_period_end timestamptz;

COMMENT ON COLUMN public.subscriptions.grace_period_end
  IS 'End of grace period after payment failure. Access allowed until this date.';

-- Update trigger: keep is_active=true during grace period
CREATE OR REPLACE FUNCTION public.update_subscription_is_active() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Set is_active based on stripe_subscription_status
  -- Case-insensitive comparison (Stripe returns lowercase, webhook capitalizes)
  NEW.is_active := LOWER(NEW.stripe_subscription_status) IN ('active', 'trialing');

  -- Grace period: keep is_active=true if grace_period_end is still in the future
  IF NOT NEW.is_active AND NEW.grace_period_end IS NOT NULL AND NEW.grace_period_end > now() THEN
    NEW.is_active := true;
  END IF;

  RETURN NEW;
END;
$$;

-- Update RLS helper: allow access during grace period
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
      -- Grace period access
      (s.grace_period_end IS NOT NULL AND s.grace_period_end > now())
    )
  );
END;
$$;
