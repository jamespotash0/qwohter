/**
 * Backend API Endpoint: Update Subscription Quantity
 *
 * Call this endpoint when users are added/removed from an organization
 * to update the Stripe subscription quantity (proration happens automatically)
 *
 * IMPORTANT: This must run server-side with STRIPE_SECRET_KEY
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe with secret key (server-side only!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    return 1;
  }

  return Math.max(1, count || 1);
}

/**
 * Update subscription quantity when users are added/removed
 *
 * Use case: Call this endpoint whenever:
 * - A user is added to an organization
 * - A user is removed from an organization
 * - A user's status changes to/from Active
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

    const { organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId required' });
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

    // Get subscription details
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('organization_id', organizationId)
      .single();

    if (subError || !subscription?.stripe_subscription_id) {
      return res.status(404).json({
        error: 'No active Stripe subscription found for this organization',
      });
    }

    // Calculate new quantity based on current user count
    const newQuantity = await calculateSubscriptionQuantity(organizationId);

    console.log(`Updating subscription ${subscription.stripe_subscription_id} to ${newQuantity} users`);

    // Retrieve the Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    );

    // Get the subscription item ID (the line item for the price)
    const subscriptionItemId = stripeSubscription.items.data[0]?.id;

    if (!subscriptionItemId) {
      return res.status(500).json({
        error: 'Could not find subscription item',
      });
    }

    // Update the quantity in Stripe
    // Stripe automatically handles proration!
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        items: [
          {
            id: subscriptionItemId,
            quantity: newQuantity,
          },
        ],
        proration_behavior: 'create_prorations', // Automatically prorate charges
        metadata: {
          userCount: newQuantity.toString(),
          lastUpdated: new Date().toISOString(),
        },
      }
    );

    console.log(`✅ Subscription updated: ${newQuantity} users, next invoice: $${(stripeSubscription.items.data[0]?.price.unit_amount || 0) * newQuantity / 100}`);

    return res.status(200).json({
      success: true,
      subscriptionId: subscription.stripe_subscription_id,
      oldQuantity: stripeSubscription.items.data[0]?.quantity || 0,
      newQuantity,
      message: `Subscription updated to ${newQuantity} users. Charges will be prorated automatically.`,
    });
  } catch (error) {
    console.error('Error updating subscription quantity:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * USAGE EXAMPLE:
 *
 * // When a user is added to an organization:
 * await fetch('/api/stripe/update-subscription-quantity', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ organizationId: 'org-123' }),
 * });
 *
 * // When a user is removed:
 * await fetch('/api/stripe/update-subscription-quantity', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ organizationId: 'org-123' }),
 * });
 */
