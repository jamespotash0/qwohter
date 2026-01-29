// @ts-ignore - Deno import
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore - Deno import
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
// @ts-ignore - Deno import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Auto-enroll organization in 14-day free trial
 * Creates actual Stripe subscription with trial_period_days: 14
 * No payment method required upfront
 */
//@ts-ignore
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // @ts-ignore
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });
    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract token and verify with service role client
    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { organizationId, userEmail, userName } = await req.json();

    console.log('Creating trial subscription:', { organizationId, userId: user.id });

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Missing organizationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is owner of this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'Active')
      .single();

    if (!membership || membership.role !== 'Owner') {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Owner permissions required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if organization has already used trial
    const { data: org } = await supabase
      .from('organizations')
      .select('name, has_used_trial')
      .eq('id', organizationId)
      .single();

    if (org?.has_used_trial) {
      return new Response(
        JSON.stringify({ error: 'Organization has already used free trial' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if subscription already exists
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id, stripe_customer_id, stripe_subscription_id')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existingSubscription?.stripe_subscription_id) {
      console.log('Organization already has Stripe subscription');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Subscription already exists',
          subscriptionId: existingSubscription.stripe_subscription_id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Create or reuse Stripe customer
    let customerId = existingSubscription?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail || user.email,
        name: userName || org?.name || 'Unknown',
        metadata: {
          organization_id: organizationId,
          user_id: user.id,
        },
      });
      customerId = customer.id;
      console.log('Created Stripe customer:', customerId);
    }

    // Get Team plan and price ID from database
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('id, stripe_price_id_monthly')
      .eq('name', 'Team')
      .single();

    if (!plan) {
      return new Response(
        JSON.stringify({ error: 'Team plan not found in database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const priceId = plan.stripe_price_id_monthly;

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Stripe price ID not configured for Team plan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count active users for initial quantity
    const { count } = await supabase
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'Active');

    const quantity = Math.max(1, count || 1);

    // Create Stripe subscription with 14-day trial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price: priceId,
        quantity: quantity,
      }],
      trial_period_days: 14,
      payment_behavior: 'default_incomplete', // No payment required upfront
      metadata: {
        organization_id: organizationId,
      },
    });

    console.log('Created Stripe subscription with trial:', subscription.id);

    // Get customer payment methods to check if payment method is attached
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    const hasPaymentMethod = paymentMethods.data.length > 0;

    // Capitalize Stripe status for database consistency (trialing → Trialing)
    const capitalizedStatus = subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1);

    // Create or update subscription record in database
    if (existingSubscription) {
      await supabase
        .from('subscriptions')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          stripe_subscription_status: capitalizedStatus,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
          trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          has_payment_method: hasPaymentMethod,
          plan_id: plan.id,
          number_of_active_users: quantity,
          is_active: true,
          access_blocked: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSubscription.id);
    } else {
      await supabase
        .from('subscriptions')
        .insert({
          organization_id: organizationId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          stripe_subscription_status: capitalizedStatus,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
          trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          has_payment_method: hasPaymentMethod,
          plan_id: plan.id,
          number_of_active_users: quantity,
          is_active: true,
          access_blocked: false,
        });
    }

    // Mark organization as having used trial
    await supabase
      .from('organizations')
      .update({ has_used_trial: true })
      .eq('id', organizationId);

    console.log('Trial subscription created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: subscription.id,
        customerId: customerId,
        trialEnd: new Date(subscription.trial_end! * 1000).toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating trial subscription:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create trial subscription'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
