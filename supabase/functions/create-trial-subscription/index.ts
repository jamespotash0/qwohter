import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
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
    //@ts-ignore
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });
    //@ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    //@ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    //@ts-ignore
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
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

    // Get the per-user price ID from environment
    //@ts-ignore
    const priceId = Deno.env.get('STRIPE_PRICE_ID_PER_USER_MONTHLY');

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Stripe price ID not configured' }),
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

    // Get or create Team plan reference
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', 'Team')
      .single();

    if (!plan) {
      return new Response(
        JSON.stringify({ error: 'Team plan not found in database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or update subscription record in database
    if (existingSubscription) {
      await supabase
        .from('subscriptions')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          stripe_subscription_status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          plan_id: plan.id,
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
          stripe_subscription_status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          plan_id: plan.id,
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
