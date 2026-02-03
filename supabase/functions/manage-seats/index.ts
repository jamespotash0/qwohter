//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
//@ts-ignore
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

//@ts-ignore
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Stripe
    //@ts-ignore
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || Deno.env.get('STRIPE_SECRET_KEY_TEST') || '';
    //@ts-ignore
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Initialize Supabase
    //@ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    //@ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { action, organizationId, memberId, triggeredByUserId, quantity } = await req.json();

    // Validate required parameters
    if (!action || !organizationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if subscription has Stripe ID
    if (!subscription.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: 'No active Stripe subscription' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    const currentQuantity = stripeSubscription.items.data[0]?.quantity || 1;

    let newQuantity = currentQuantity;
    let proratedAmount = 0;

    // Determine new quantity based on action
    switch (action) {
      case 'add':
        newQuantity = currentQuantity + 1;
        break;
      case 'remove':
        newQuantity = Math.max(1, currentQuantity - 1); // Never go below 1
        break;
      case 'update':
        if (!quantity || quantity < 1) {
          return new Response(
            JSON.stringify({ error: 'Invalid quantity' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        newQuantity = quantity;
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // If quantity hasn't changed, return early
    if (newQuantity === currentQuantity) {
      return new Response(
        JSON.stringify({
          success: true,
          previousQuantity: currentQuantity,
          newQuantity: currentQuantity,
          proratedAmount: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update Stripe subscription quantity with proration
    // Idempotency key prevents duplicate proration invoices from concurrent requests
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        items: [{
          id: stripeSubscription.items.data[0].id,
          quantity: newQuantity,
        }],
        proration_behavior: 'always_invoice', // Always create proration invoice
      },
      {
        idempotencyKey: `seats-${subscription.stripe_subscription_id}-${action}-${newQuantity}-${Math.floor(Date.now() / 30000)}`,
      }
    );

    // Get the upcoming invoice to calculate proration amount
    try {
      const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        customer: stripeSubscription.customer as string,
        subscription: subscription.stripe_subscription_id,
      });

      // Sum up proration amounts from invoice line items
      const prorationLines = upcomingInvoice.lines.data.filter(line => line.proration);
      proratedAmount = prorationLines.reduce((sum, line) => sum + (line.amount / 100), 0);

      console.log('Proration calculation:', {
        currentQuantity,
        newQuantity,
        proratedAmount,
        prorationLines: prorationLines.length,
      });
    } catch (err) {
      console.error('Failed to retrieve upcoming invoice for proration:', err);
      // Continue without proration amount - this is non-critical
    }

    // Update local database and clear pending sync flag
    await supabase
      .from('subscriptions')
      .update({
        number_of_active_users: newQuantity,
        stripe_quantity_pending_sync: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    // Create seat usage event for audit trail
    const eventType = action === 'add' ? 'seat_added' : action === 'remove' ? 'seat_removed' : 'seat_count_updated';
    const { data: eventData } = await supabase
      .from('subscription_seat_usage_events')
      .insert({
        subscription_id: subscription.id,
        event_type: eventType,
        previous_seat_count: currentQuantity,
        new_seat_count: newQuantity,
        triggered_by_user_id: triggeredByUserId || null,
      })
      .select()
      .single();

    console.log('Seat management complete:', {
      action,
      previousQuantity: currentQuantity,
      newQuantity,
      proratedAmount,
      eventId: eventData?.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        previousQuantity: currentQuantity,
        newQuantity,
        proratedAmount,
        eventId: eventData?.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Manage seats error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
