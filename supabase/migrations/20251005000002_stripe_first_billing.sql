-- Stripe-First Billing System
-- Minimal local storage - Stripe is the source of truth
-- Only stores: plan metadata, Stripe references, and access control flags

-- ============================================================================
-- 1. SUBSCRIPTION PLANS TABLE (Metadata Only)
-- ============================================================================
-- Stores plan metadata for display purposes only
-- Actual pricing and billing handled entirely in Stripe
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE, -- 'Free', 'Professional'
  display_name text NOT NULL,
  description text,

  -- Stripe Product/Price IDs (source of truth for pricing)
  stripe_product_id text, -- Stripe Product ID
  stripe_price_id_monthly text, -- Stripe Price ID for monthly billing
  stripe_price_id_yearly text, -- Stripe Price ID for yearly billing

  -- Display information only (actual prices from Stripe)
  features jsonb DEFAULT '[]', -- Feature list for UI
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Default plans (actual pricing in Stripe)
INSERT INTO public.subscription_plans (name, display_name, description, features, sort_order)
VALUES
  (
    'Free',
    'Free Trial',
    '30-day free trial - All features included',
    '["30-day free trial", "Unlimited users", "Unlimited quotes", "All templates", "Priority support", "Logo upload", "Custom branding", "Advanced analytics", "Email reminders"]',
    1
  ),
  (
    'Professional',
    'Professional Plan',
    'Everything you need to manage quotes professionally',
    '["Unlimited users", "Unlimited quotes", "All templates", "Priority support", "Logo upload", "Custom branding", "Advanced analytics", "Email reminders", "Dedicated account support"]',
    2
  )
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. SUBSCRIPTIONS TABLE (Stripe References Only)
-- ============================================================================
-- Stores ONLY Stripe references and access control
-- All billing data lives in Stripe
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan_id uuid REFERENCES public.subscription_plans(id) NOT NULL,

  -- Stripe references (source of truth)
  stripe_customer_id text UNIQUE, -- Link to Stripe Customer
  stripe_subscription_id text UNIQUE, -- Link to Stripe Subscription

  -- Cached status from Stripe (updated via webhooks)
  stripe_subscription_status text, -- 'active', 'past_due', 'canceled', 'incomplete', 'trialing'
  current_period_end timestamptz, -- From Stripe, used for display only

  -- Access control (local decision making)
  is_active boolean DEFAULT true,
  access_blocked boolean DEFAULT false,
  access_blocked_reason text,

  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 3. CLEAN UP MEMBERSHIPS TABLE
-- ============================================================================
-- Remove any billing fields from memberships if they exist
ALTER TABLE public.memberships
  DROP COLUMN IF EXISTS plan,
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS trial_ends_at;

-- ============================================================================
-- 4. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);

-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans_select_policy" ON public.subscription_plans;
DROP POLICY IF EXISTS "subscriptions_select_policy" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_policy" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_policy" ON public.subscriptions;

-- SUBSCRIPTION PLANS: Everyone can view active plans
CREATE POLICY "subscription_plans_select_policy" ON public.subscription_plans
FOR SELECT USING (is_active = true);

-- SUBSCRIPTIONS: Members can view their organization's subscription
CREATE POLICY "subscriptions_select_policy" ON public.subscriptions
FOR SELECT USING (
  organization_id IN (
    SELECT m.organization_id
    FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.status = 'Active'
  )
);

-- SUBSCRIPTIONS: Owners/Admins can create subscriptions
CREATE POLICY "subscriptions_insert_policy" ON public.subscriptions
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  organization_id IN (
    SELECT m.organization_id
    FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('Owner')
    AND m.status = 'Active'
  )
);

-- SUBSCRIPTIONS: Owners/Admins can update OR system (for webhook processing)
-- Note: Webhooks should use service_role key which bypasses RLS
CREATE POLICY "subscriptions_update_policy" ON public.subscriptions
FOR UPDATE USING (
  organization_id IN (
    SELECT m.organization_id
    FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('Owner')
    AND m.status = 'Active'
  )
);

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Check if organization has valid Stripe subscription
CREATE OR REPLACE FUNCTION has_valid_subscription(org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.organization_id = org_id
    AND s.is_active = true
    AND s.access_blocked = false
    AND s.stripe_subscription_status IN ('Active', 'Trialing')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Block access (manual override)
CREATE OR REPLACE FUNCTION block_access(org_id uuid, reason text)
RETURNS void AS $$
BEGIN
  UPDATE public.subscriptions
  SET access_blocked = true,
      access_blocked_reason = reason,
      updated_at = now()
  WHERE organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore access
CREATE OR REPLACE FUNCTION restore_access(org_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.subscriptions
  SET access_blocked = false,
      access_blocked_reason = NULL,
      updated_at = now()
  WHERE organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. GRANTS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;

-- ============================================================================
-- SUCCESS
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Stripe-First Billing System Created!';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Tables:';
  RAISE NOTICE '  - subscription_plans: Plan metadata for UI';
  RAISE NOTICE '  - subscriptions: Stripe references + access control';
  RAISE NOTICE '';
  RAISE NOTICE '🔑 Key Principles:';
  RAISE NOTICE '  - Stripe is the source of truth for ALL billing data';
  RAISE NOTICE '  - Local DB stores only: Stripe IDs, cached status, access flags';
  RAISE NOTICE '  - Use Stripe API for: pricing, invoices, payment history, user counts';
  RAISE NOTICE '  - Webhooks update cached status in real-time';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Plans:';
  RAISE NOTICE '  - Free: 30-day trial';
  RAISE NOTICE '  - Professional: Per-user pricing (configured in Stripe)';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Next Steps:';
  RAISE NOTICE '  1. Create products and prices in Stripe Dashboard';
  RAISE NOTICE '  2. Update subscription_plans with Stripe Product/Price IDs';
  RAISE NOTICE '  3. Set up Stripe webhook endpoint';
  RAISE NOTICE '  4. Install Stripe SDK: npm install stripe @stripe/stripe-js';
END $$;
