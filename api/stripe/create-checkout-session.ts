/**
 * Backend API Endpoint: Create Stripe Checkout Session
 *
 * This endpoint creates a Stripe Checkout session with per-user pricing.
 * It calculates the quantity based on active users in the organization.
 *
 * IMPORTANT: This must run server-side with STRIPE_SECRET_KEY
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe with secret key (server-side only!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for admin access
);

/**
 * Calculate subscription quantity based on organization user count
 */
async function calculateSubscriptionQuantity(organizationId: string): Promise<number> {
  const { count, error } = await supabase
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'Active');

  if (error) {
    console.error('Error counting active users:', error);
    return 1; // Default to 1 on error
  }

  // Ensure at least 1 user (minimum billing)
  return Math.max(1, count || 1);
}

/**
 * Main handler for creating checkout session
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ============================================================================
    // AUTHENTICATION: Verify user is authenticated
    // ============================================================================
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const {
      organizationId,
      priceId,
      quantity: providedQuantity, // Optional - if not provided, will calculate
      successUrl,
      cancelUrl,
    } = req.body;

    // Validate required fields
    if (!organizationId || !priceId || !successUrl || !cancelUrl) {
      return res.status(400).json({
        error: 'Missing required fields: organizationId, priceId, successUrl, cancelUrl',
      });
    }

    // ============================================================================
    // AUTHORIZATION: Verify user is Owner/Admin of this organization
    // ============================================================================
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('role, status')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Forbidden: Not a member of this organization' });
    }

    if (membership.status !== 'Active') {
      return res.status(403).json({ error: 'Forbidden: Membership not active' });
    }

    if (!['Owner', 'Admin'].includes(membership.role)) {
      return res.status(403).json({ error: 'Forbidden: Only Owner/Admin can manage billing' });
    }

    // Calculate quantity based on user count (or use provided quantity)
    const quantity = providedQuantity || await calculateSubscriptionQuantity(organizationId);

    console.log(`Creating checkout session for ${organizationId} with ${quantity} users`);

    // Get or create Stripe Customer
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, organization:organizations(name)')
      .eq('organization_id', organizationId)
      .single();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe Customer
      const customer = await stripe.customers.create({
        metadata: {
          organizationId,
          organizationName: subscription?.organization?.[0]?.name || 'Unknown',
        },
      });
      customerId = customer.id;

      // Update subscription with customer ID
      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('organization_id', organizationId);
    }

    // Create Stripe Checkout Session with calculated quantity
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity, // THIS IS THE KEY: Pass the calculated user count
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId,
        userCount: quantity.toString(),
      },
      // Optional: Allow user to adjust quantity during checkout
      // This lets them add more seats if needed
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    return res.status(200).json({
      sessionId: session.id,
      quantity, // Return quantity for client reference
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
