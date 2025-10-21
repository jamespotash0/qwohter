import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    // Verify authentication using anon key
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
    const { organizationId, planId, priceId, quantity, successUrl, cancelUrl } = await req.json();

    console.log('Creating checkout session:', { organizationId, planId, priceId, quantity, userId: user.id });

    // Validate inputs
    if (!organizationId || !planId || !priceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Use service role client for database operations (bypasses RLS for efficiency)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user has Admin/Owner permissions for this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'Active')
      .single();

    if (!membership || !['Owner', 'Admin'].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin or Owner permissions required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if organization already has a Stripe customer
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .single();

    let customerId = existingSubscription?.stripe_customer_id;

    // Create customer if it doesn't exist
    if (!customerId) {
      // Get organization details
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single();

      const customer = await stripe.customers.create({
        metadata: {
          organization_id: organizationId,
        },
        name: org?.name || 'Unknown Organization',
      });

      customerId = customer.id;
      console.log('Created new Stripe customer:', customerId);
    }

    // Create Checkout Session with per-user quantity
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: quantity || 1, // Use calculated quantity
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${Deno.env.get('FRONTEND_URL')}/settings?tab=billing&success=true`,
      cancel_url: cancelUrl || `${Deno.env.get('FRONTEND_URL')}/subscription`,
      metadata: {
        organization_id: organizationId,
        plan_id: planId,
      },
      subscription_data: {
        metadata: {
          organization_id: organizationId,
          plan_id: planId,
        },
      },
      allow_promotion_codes: true,
    });

    console.log('Created checkout session:', session.id);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create checkout session'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
