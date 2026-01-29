//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
//@ts-ignore
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Stripe-Signature',
};

//@ts-ignore
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    //@ts-ignore
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || Deno.env.get('STRIPE_SECRET_KEY_TEST') || '';
    //@ts-ignore
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Create crypto provider for Web Crypto API (required for Deno)
    const cryptoProvider = Stripe.createSubtleCryptoProvider();

    //@ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    //@ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signature = req.headers.get('Stripe-Signature');
    // @ts-ignore
    // Use production webhook secret first, fallback to CLI secret for local dev
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || Deno.env.get('STRIPE_CLI_WEBHOOK_SECRET');

    // Get raw body for signature verification
    const body = await req.text();

    // Verify webhook signature using async method with crypto provider
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature!,
        webhookSecret,
        undefined,
        cryptoProvider
      );
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

    console.log('Webhook event type:', event.type, 'event.id:', event.id);

    // Idempotency: skip already-processed events (Stripe retries on timeout)
    const { data: existingEvent } = await supabase
      .from('stripe_webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .maybeSingle();

    if (existingEvent) {
      console.log('Skipping already-processed event:', event.id);
      return new Response(
        JSON.stringify({ received: true, duplicate: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark event as processing (insert before handling to prevent concurrent duplicates)
    await supabase
      .from('stripe_webhook_events')
      .insert({ stripe_event_id: event.id, event_type: event.type });

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

        // Fetch the subscription from Stripe to get billing period and interval
        let currentPeriodStart = null;
        let currentPeriodEnd = null;
        let cancelAtPeriodEnd = false;
        let subscriptionStatus = 'Active';
        let billingInterval = 'Monthly';

        // Get quantity (number of seats)
        let quantity = 1; // Default to 1 seat

        if (stripeSubscriptionId) {
          try {
            const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

            // Safely convert Unix timestamps to ISO strings
            if (stripeSubscription.current_period_start) {
              const startDate = new Date(stripeSubscription.current_period_start * 1000);
              currentPeriodStart = isNaN(startDate.getTime()) ? null : startDate.toISOString();
            }
            if (stripeSubscription.current_period_end) {
              const endDate = new Date(stripeSubscription.current_period_end * 1000);
              currentPeriodEnd = isNaN(endDate.getTime()) ? null : endDate.toISOString();
            }
            cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end || false;

            // Stripe statuses are: trialing, active, incomplete, incomplete_expired, past_due, canceled, or unpaid
            // Capitalize first letter for database storage
            subscriptionStatus = stripeSubscription.status.charAt(0).toUpperCase() + stripeSubscription.status.slice(1);

            // Get billing interval from the subscription items
            const interval = stripeSubscription.items.data[0]?.price?.recurring?.interval;
            billingInterval = interval === 'year' ? 'Yearly' : 'Monthly';

            // Get quantity (number of seats) from the subscription item
            quantity = stripeSubscription.items.data[0]?.quantity || 1;

            console.log('Retrieved subscription details:', { currentPeriodStart, currentPeriodEnd, subscriptionStatus, billingInterval, quantity });
          } catch (err) {
            console.error('Failed to retrieve Stripe subscription:', err);
          }
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
              stripe_subscription_status: subscriptionStatus,
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              cancel_at_period_end: cancelAtPeriodEnd,
              billing_interval: billingInterval,
              number_of_active_users: quantity,
              is_active: true,
              plan_id: planId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingSubscription.id);

          console.log('Updated existing subscription:', existingSubscription.id, 'with quantity:', quantity);
        } else {
          // Create new subscription
          await supabase
            .from('subscriptions')
            .insert({
              organization_id: organizationId,
              plan_id: planId,
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: stripeSubscriptionId,
              stripe_subscription_status: subscriptionStatus,
              billing_interval: billingInterval,
              number_of_active_users: quantity,
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              cancel_at_period_end: cancelAtPeriodEnd,
              is_active: true,
            });

          console.log('Created new subscription for org:', organizationId, 'with number of users:', quantity);
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = subscription.id;
        const status = subscription.status;
        const displayStatus = status.charAt(0).toUpperCase() + status.slice(1);

        // Get customer payment methods
        const paymentMethods = await stripe.paymentMethods.list({
          customer: subscription.customer as string,
          type: 'card',
        });
        const hasPaymentMethod = paymentMethods.data.length > 0;

        // Safely convert Unix timestamps to ISO strings
        const safeToISOString = (unixTimestamp: number | undefined | null): string | null => {
          if (!unixTimestamp) return null;
          const date = new Date(unixTimestamp * 1000);
          return isNaN(date.getTime()) ? null : date.toISOString();
        };

        // Build update object, only including date fields if they have valid values
        // This prevents overwriting existing data with null
        const currentPeriodStartISO = safeToISOString(subscription.current_period_start);
        const currentPeriodEndISO = safeToISOString(subscription.current_period_end);
        const trialStartISO = safeToISOString(subscription.trial_start);
        const trialEndISO = safeToISOString(subscription.trial_end);

        // Determine is_active with grace period awareness
        let isActive = ['active', 'trialing'].includes(status);

        // Grace period: keep is_active=true for 3 days after trial expires
        // Stripe transitions trialing → incomplete → incomplete_expired when trial ends without payment
        // We preserve access so the client-side grace period logic can show warnings
        if (!isActive && ['incomplete', 'incomplete_expired', 'past_due'].includes(status)) {
          const trialEnd = subscription.trial_end;
          if (trialEnd) {
            const trialEndDate = new Date(trialEnd * 1000);
            const gracePeriodEnd = new Date(trialEndDate.getTime() + (3 * 24 * 60 * 60 * 1000));
            if (new Date() <= gracePeriodEnd) {
              isActive = true;
              console.log('Grace period active - keeping is_active=true until', gracePeriodEnd.toISOString());
            }
          }
        }

        const updateData: Record<string, any> = {
          stripe_subscription_status: displayStatus,
          has_payment_method: hasPaymentMethod,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        };

        // Only update date fields if they have valid values (don't overwrite with null)
        if (currentPeriodStartISO) updateData.current_period_start = currentPeriodStartISO;
        if (currentPeriodEndISO) updateData.current_period_end = currentPeriodEndISO;
        if (trialStartISO) updateData.trial_start = trialStartISO;
        if (trialEndISO) updateData.trial_end = trialEndISO;

        // Update subscription status and billing period
        await supabase
          .from('subscriptions')
          .update(updateData)
          .eq('stripe_subscription_id', stripeSubscriptionId);

        console.log('Updated subscription status:', stripeSubscriptionId, displayStatus, 'hasPayment:', hasPaymentMethod);
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

        // Safely convert Unix timestamps to ISO strings
        const toISO = (ts: number | undefined | null): string | null => {
          if (!ts) return null;
          const d = new Date(ts * 1000);
          return isNaN(d.getTime()) ? null : d.toISOString();
        };

        const createdDateFields: Record<string, string> = {};
        const periodStart = toISO(subscription.current_period_start);
        const periodEnd = toISO(subscription.current_period_end);
        const trialStart = toISO(subscription.trial_start);
        const trialEnd = toISO(subscription.trial_end);
        if (periodStart) createdDateFields.current_period_start = periodStart;
        if (periodEnd) createdDateFields.current_period_end = periodEnd;
        if (trialStart) createdDateFields.trial_start = trialStart;
        if (trialEnd) createdDateFields.trial_end = trialEnd;

        if (existing) {
          await supabase
            .from('subscriptions')
            .update({
              stripe_subscription_id: stripeSubscriptionId,
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_status: subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1),
              is_active: ['active', 'trialing'].includes(subscription.status),
              updated_at: new Date().toISOString(),
              ...createdDateFields,
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
              is_active: ['active', 'trialing'].includes(subscription.status),
              ...createdDateFields,
            });
        }

        console.log('Subscription created:', stripeSubscriptionId);
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Trial ending soon for subscription:', subscription.id);
        // Stripe handles sending trial-ending emails directly
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

        // Update billing period dates ONLY on actual subscription renewals
        // Skip prorated invoices (seat changes, plan upgrades) - they don't change the billing period
        // billing_reason: 'subscription_cycle' = renewal, 'subscription_update' = proration, 'subscription_create' = initial
        const isRenewalInvoice = invoice.billing_reason === 'subscription_cycle';

        if (invoice.subscription && isRenewalInvoice) {
          try {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);

            await supabase
              .from('subscriptions')
              .update({
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                stripe_subscription_status: subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1),
                updated_at: new Date().toISOString(),
              })
              .eq('stripe_subscription_id', subscription.id);

            console.log('Updated billing period from invoice.paid (renewal):', subscription.id);
          } catch (err) {
            console.error('Failed to update billing period from invoice.paid:', err);
          }
        } else if (invoice.subscription) {
          console.log('Skipping billing period update - not a renewal invoice:', invoice.billing_reason);
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

      case 'payment_method.attached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        const customerId = paymentMethod.customer as string;

        // Mark that customer has payment method
        await supabase
          .from('subscriptions')
          .update({
            has_payment_method: true,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        console.log('Payment method attached for customer:', customerId);
        break;
      }

      case 'setup_intent.succeeded': {
        // Customer Portal uses SetupIntents to add payment methods
        const setupIntent = event.data.object as Stripe.SetupIntent;
        const customerId = setupIntent.customer as string;

        if (customerId) {
          // Mark that customer has payment method
          await supabase
            .from('subscriptions')
            .update({
              has_payment_method: true,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', customerId);

          console.log('SetupIntent succeeded - payment method added for customer:', customerId);
        }
        break;
      }

      case 'payment_method.detached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        const customerId = paymentMethod.customer as string;

        // Check if customer has any remaining payment methods
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customerId,
          type: 'card',
        });
        const hasPaymentMethod = paymentMethods.data.length > 0;

        await supabase
          .from('subscriptions')
          .update({
            has_payment_method: hasPaymentMethod,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        console.log('Payment method detached for customer:', customerId, 'remaining:', hasPaymentMethod);
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
