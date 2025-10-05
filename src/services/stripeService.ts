/**
 * Stripe-First Billing Service
 *
 * Philosophy:
 * - Stripe is the source of truth for ALL billing data
 * - Local database stores ONLY: Stripe IDs, cached status, and access flags
 * - All pricing, invoices, payment history, and user counts come from Stripe API
 * - Webhooks keep local cache in sync with Stripe
 */

import { supabase } from '@/integrations/supabase/client';
import { loadStripe, Stripe } from '@stripe/stripe-js';

// Type definitions
interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  features: string[] | string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  current_period_end: string | null;
  is_active: boolean;
  access_blocked: boolean;
  access_blocked_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

// Initialize Stripe (client-side)
let stripePromise: Promise<Stripe | null>;
export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error('Stripe publishable key not configured');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

// ============================================================================
// PLAN MANAGEMENT
// ============================================================================

/**
 * Get all available subscription plans
 * Plans stored locally for display purposes only
 * Actual pricing comes from Stripe
 */
export const getPlans = async (): Promise<{ data: SubscriptionPlan[] | null; error: string | null }> => {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching plans:', error);
    return { data: null, error: error.message };
  }

  return { data: data as SubscriptionPlan[], error: null };
};

/**
 * Get a specific plan by name
 */
export const getPlanByName = async (name: string) => {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('name', name)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching plan:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

// ============================================================================
// SUBSCRIPTION MANAGEMENT (Local References Only)
// ============================================================================

/**
 * Get organization's subscription (local reference)
 * For full billing details, use getStripeSubscription()
 */
export const getSubscription = async (organizationId: string): Promise<{ data: Subscription | null; error: string | null }> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plan:subscription_plans(*)
    `)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    console.error('Error fetching subscription:', error);
    return { data: null, error: error.message };
  }

  return { data: data as Subscription, error: null };
};

/**
 * Create initial subscription record
 * This creates the local reference - actual Stripe subscription created via Stripe Checkout
 */
export const createSubscription = async (params: {
  organizationId: string;
  planId: string;
  stripeCustomerId?: string;
}) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      organization_id: params.organizationId,
      plan_id: params.planId,
      stripe_customer_id: params.stripeCustomerId || null,
      is_active: true,
      access_blocked: false,
    } as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating subscription:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

/**
 * Update subscription with Stripe details
 * Called by webhook handlers to sync local cache with Stripe
 */
export const updateSubscription = async (
  subscriptionId: string,
  updates: {
    stripe_subscription_id?: string;
    stripe_subscription_status?: string;
    current_period_end?: string;
    plan_id?: string;
    is_active?: boolean;
  }
) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating subscription:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
};

// ============================================================================
// ACCESS CONTROL
// ============================================================================

/**
 * Check if organization has valid subscription
 * Uses local cache for fast access control decisions
 */
export const hasValidSubscription = async (organizationId: string) => {
  const { data: subscription, error } = await getSubscription(organizationId);

  if (error || !subscription) {
    return {
      isValid: false,
      reason: 'No subscription found',
    };
  }

  // Check access blocked flag (manual override)
  if (subscription.access_blocked) {
    return {
      isValid: false,
      reason: subscription.access_blocked_reason || 'Access blocked',
    };
  }

  // Check subscription status (cached from Stripe)
  // Note: Stripe uses lowercase, but we may have capitalized versions in DB
  const validStatuses = ['Active', 'Trialing'];
  if (!subscription.stripe_subscription_status || !validStatuses.includes(subscription.stripe_subscription_status)) {
    return {
      isValid: false,
      reason: subscription.stripe_subscription_status
        ? `Subscription status: ${subscription.stripe_subscription_status}`
        : 'No subscription status set',
    };
  }

  return {
    isValid: true,
    reason: null,
  };
};

/**
 * Block organization access (manual override)
 */
export const blockAccess = async (organizationId: string, reason: string) => {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      access_blocked: true,
      access_blocked_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error blocking access:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
};

/**
 * Restore organization access
 */
export const restoreAccess = async (organizationId: string) => {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      access_blocked: false,
      access_blocked_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error restoring access:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
};

// ============================================================================
// PRICING CALCULATION
// ============================================================================

/**
 * Calculate subscription quantity based on organization user count
 * For per-user pricing, this determines how many "seats" to charge for
 */
export const calculateSubscriptionQuantity = async (organizationId: string) => {
  const { count, error } = await supabase
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'Active');

  if (error) {
    console.error('Error counting active users:', error);
    return { quantity: 1, error: error.message }; // Default to 1 on error
  }

  // Ensure at least 1 user (minimum billing)
  const quantity = Math.max(1, count || 1);

  return { quantity, error: null };
};

// ============================================================================
// STRIPE CHECKOUT (Client-Side)
// ============================================================================

/**
 * Create Stripe Checkout Session
 * This redirects user to Stripe-hosted checkout page
 * Stripe handles all payment collection securely
 */
export const createCheckoutSession = async (params: {
  organizationId: string;
  planId: string;
  priceId: string; // Stripe Price ID (monthly or yearly)
  successUrl: string;
  cancelUrl: string;
  quantity?: number; // Optional - if not provided, will calculate from user count
}) => {
  try {
    // Calculate quantity if not provided
    let quantity = params.quantity;
    if (!quantity) {
      const { quantity: calculatedQuantity, error } = await calculateSubscriptionQuantity(params.organizationId);
      if (error) {
        console.warn('Failed to calculate quantity, defaulting to 1:', error);
      }
      quantity = calculatedQuantity;
    }

    // Get current user's session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { sessionId: null, error: 'Not authenticated' };
    }

    // Call Supabase Edge Function to create checkout session
    // This endpoint should use Stripe Secret Key (server-side only)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const functionsUrl = supabaseUrl?.replace('.supabase.co', '.supabase.co/functions/v1') || '';

    const response = await fetch(`${functionsUrl}/create-stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        organizationId: params.organizationId,
        planId: params.planId,
        priceId: params.priceId,
        quantity, // Pass the calculated user count
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { sessionId: null, error: `HTTP ${response.status}: ${errorText}` };
    }

    const { sessionId, error } = await response.json();

    if (error) {
      return { sessionId: null, error };
    }

    // Redirect to Stripe Checkout
    const stripe = await getStripe();
    if (!stripe) {
      return { sessionId: null, error: 'Stripe not initialized' };
    }

    const { error: redirectError } = await stripe.redirectToCheckout({
      sessionId,
    });

    if (redirectError) {
      return { sessionId: null, error: redirectError.message };
    }

    return { sessionId, error: null };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return {
      sessionId: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Create Stripe Customer Portal Session
 * Allows customers to manage their subscription, payment methods, and billing history
 * All managed by Stripe's hosted portal
 */
export const createPortalSession = async (params: {
  organizationId: string;
  returnUrl: string;
}) => {
  try {
    // Call your backend endpoint to create portal session
    const response = await fetch('/api/stripe/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organizationId: params.organizationId,
        returnUrl: params.returnUrl,
      }),
    });

    const { url, error } = await response.json();

    if (error) {
      return { url: null, error };
    }

    // Redirect to Stripe Customer Portal
    window.location.href = url;

    return { url, error: null };
  } catch (error) {
    console.error('Error creating portal session:', error);
    return {
      url: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// ============================================================================
// EXPORT SERVICE OBJECT
// ============================================================================

export const stripeService = {
  // Plans
  getPlans,
  getPlanByName,

  // Subscriptions (Local References)
  getSubscription,
  createSubscription,
  updateSubscription,

  // Access Control
  hasValidSubscription,
  blockAccess,
  restoreAccess,

  // Pricing
  calculateSubscriptionQuantity,

  // Stripe Checkout
  createCheckoutSession,
  createPortalSession,

  // Stripe Client
  getStripe,
};
