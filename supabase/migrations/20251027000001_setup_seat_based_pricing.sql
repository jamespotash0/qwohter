-- Setup seat-based pricing with Solo and Team plans
-- This migration replaces the old tiered pricing structure

-- First, clear existing plans (if any)
TRUNCATE TABLE public.subscription_plans CASCADE;

-- Insert Solo plan (1 user)
INSERT INTO public.subscription_plans (
  name,
  display_name,
  description,
  stripe_product_id,
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  price_per_month,
  price_per_yearly,
  min_users,
  max_users,
  is_active,
  sort_order,
  features,
  created_at,
  updated_at
) VALUES (
  'Solo',
  'Solo Plan',
  'Perfect for individual professionals getting started',
  'prod_solo_placeholder', -- Replace with actual Stripe product ID
  'price_solo_monthly_placeholder', -- Replace with actual Stripe monthly price ID
  'price_solo_annual_placeholder', -- Replace with actual Stripe annual price ID
  24.99,
  239.88, -- $19.99/month * 12 months
  1,
  true,
  1,
  jsonb_build_object(
    'trial_days', 14,
    'features', jsonb_build_array(
      'All core features included',
      'Unlimited quotes',
      'PDF export',
      'Basic analytics',
      'Email support'
    )
  ),
  now(),
  now()
);

-- Insert Team plan (2+ users, metered billing)
INSERT INTO public.subscription_plans (
  name,
  display_name,
  description,
  stripe_product_id,
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  price_per_month,
  price_per_yearly,
  min_users,
  max_users,
  is_active,
  sort_order,
  features,
  created_at,
  updated_at
) VALUES (
  'Team',
  'Team Plan',
  'For growing teams that need collaboration',
  'prod_team_placeholder', -- Replace with actual Stripe product ID
  'price_team_monthly_placeholder', -- Replace with actual Stripe monthly price ID (metered)
  'price_team_annual_placeholder', -- Replace with actual Stripe annual price ID (metered)
  19.99, -- Per user per month
  203.88, -- $16.99/month * 12 months per user
  2,
  null,
  true,
  2,
  jsonb_build_object(
    'per_user_pricing', true,
    'trial_days', 14,
    'features', jsonb_build_array(
      'All Solo features',
      'Team collaboration',
      'Advanced analytics',
      'Department management',
      'Priority support',
      'Custom branding'
    )
  ),
  now(),
  now()
);

-- Update subscriptions table to ensure it has number_of_active_users column
-- (User mentioned they already added this)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name = 'number_of_active_users'
  ) THEN
    ALTER TABLE public.subscriptions
    ADD COLUMN number_of_active_users integer DEFAULT 1;

    COMMENT ON COLUMN public.subscriptions.number_of_active_users IS
    'Calculated count of active users in the organization. Used for metered billing.';
  END IF;
END $$;

-- Add a function to automatically calculate active users for an organization
CREATE OR REPLACE FUNCTION calculate_active_users(org_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_count integer;
BEGIN
  SELECT COUNT(*)
  INTO active_count
  FROM public.memberships
  WHERE organization_id = org_id
    AND status = 'Active';

  RETURN COALESCE(active_count, 0);
END;
$$;

-- Add a trigger to update number_of_active_users when memberships change
CREATE OR REPLACE FUNCTION update_subscription_user_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id uuid;
  new_count integer;
BEGIN
  -- Get the organization_id from the membership change
  org_id := COALESCE(NEW.organization_id, OLD.organization_id);

  -- Calculate the new active user count
  new_count := calculate_active_users(org_id);

  -- Update the subscription
  UPDATE public.subscriptions
  SET
    number_of_active_users = new_count,
    updated_at = now()
  WHERE organization_id = org_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_subscription_user_count ON public.memberships;

-- Create trigger on memberships table
CREATE TRIGGER trigger_update_subscription_user_count
  AFTER INSERT OR UPDATE OF status OR DELETE
  ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_user_count();

-- Initialize number_of_active_users for existing subscriptions
UPDATE public.subscriptions
SET number_of_active_users = calculate_active_users(organization_id)
WHERE number_of_active_users IS NULL OR number_of_active_users = 0;

COMMENT ON FUNCTION calculate_active_users(uuid) IS
'Calculates the number of active users (Active status) in an organization';

COMMENT ON FUNCTION update_subscription_user_count() IS
'Trigger function that updates subscription user count when memberships change';
