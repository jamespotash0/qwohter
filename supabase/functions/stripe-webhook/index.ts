import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

    // Get raw body for signature verification
    const body = await req.text();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Webhook event type:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Get organization and plan IDs from metadata
        const organizationId = session.metadata?.organization_id;
        const planId = session.metadata?.plan_id;
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        if (!organizationId || !planId) {
          console.error('Missing metadata:', session.metadata);
          break;
        }

        // Check if subscription already exists
        const { data: existingSubscription } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('organization_id', organizationId)
          .single();

        if (existingSubscription) {
          // Update existing subscription
          await supabase
            .from('subscriptions')
            .update({
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: stripeSubscriptionId,
              stripe_subscription_status: 'Active',
              is_active: true,
              plan_id: planId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingSubscription.id);

          console.log('Updated existing subscription:', existingSubscription.id);
        } else {
          // Create new subscription
          await supabase
            .from('subscriptions')
            .insert({
              organization_id: organizationId,
              plan_id: planId,
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: stripeSubscriptionId,
              stripe_subscription_status: 'Active',
              is_active: true,
            });

          console.log('Created new subscription for org:', organizationId);
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = subscription.id;
        const status = subscription.status;

        // Update subscription status
        await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_status: status.charAt(0).toUpperCase() + status.slice(1),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            is_active: ['active', 'trialing'].includes(status),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', stripeSubscriptionId);

        console.log('Updated subscription status:', stripeSubscriptionId, status);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = subscription.id;

        // Mark subscription as inactive
        await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_status: 'Canceled',
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', stripeSubscriptionId);

        console.log('Canceled subscription:', stripeSubscriptionId);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment succeeded for invoice:', invoice.id);
        // Optionally update payment records or send confirmation email
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId = invoice.customer as string;

        // Mark subscription for attention
        await supabase
          .from('subscriptions')
          .update({
            access_blocked: true,
            access_blocked_reason: 'Payment failed',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', stripeCustomerId);

        console.log('Payment failed for customer:', stripeCustomerId);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = subscription.id;
        const stripeCustomerId = subscription.customer as string;
        const organizationId = subscription.metadata?.organization_id;
        const planId = subscription.metadata?.plan_id;

        if (!organizationId || !planId) {
          console.error('Missing metadata on subscription.created:', subscription.metadata);
          break;
        }

        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('organization_id', organizationId)
          .single();

        if (existing) {
          await supabase
            .from('subscriptions')
            .update({
              stripe_subscription_id: stripeSubscriptionId,
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_status: subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              is_active: ['active', 'trialing'].includes(subscription.status),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('subscriptions')
            .insert({
              organization_id: organizationId,
              plan_id: planId,
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: stripeSubscriptionId,
              stripe_subscription_status: subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              is_active: ['active', 'trialing'].includes(subscription.status),
            });
        }

        console.log('Subscription created:', stripeSubscriptionId);
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Trial ending soon for subscription:', subscription.id);
        break;
      }

      case 'customer.subscription.paused': {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_status: 'Paused',
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        console.log('Subscription paused:', subscription.id);
        break;
      }

      case 'customer.subscription.resumed': {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_status: 'Active',
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        console.log('Subscription resumed:', subscription.id);
        break;
      }

      case 'invoice.finalized': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice finalized:', invoice.id);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;

        // Restore access if it was blocked due to payment failure
        if (invoice.customer) {
          await supabase
            .from('subscriptions')
            .update({
              access_blocked: false,
              access_blocked_reason: null,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', invoice.customer as string)
            .eq('access_blocked_reason', 'Payment failed');
        }

        console.log('Invoice paid:', invoice.id);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', paymentIntent.id);
        break;
      }

      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge;
        console.log('Charge succeeded:', charge.id);
        break;
      }

      case 'charge.failed': {
        const charge = event.data.object as Stripe.Charge;
        console.log('Charge failed:', charge.id);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log('Charge refunded:', charge.id);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
