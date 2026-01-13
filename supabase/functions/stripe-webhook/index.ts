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

// =============================================================================
// Payment Notification Helper
// =============================================================================

type PaymentNotificationType =
  | 'payment_success'
  | 'payment_failed'
  | 'trial_ending'
  | 'subscription_activated'
  | 'subscription_canceled'
  | 'subscription_renewed'
  | 'seat_count_changed';

interface PaymentNotificationData {
  amount?: number;
  currency?: string;
  planName?: string;
  daysRemaining?: number;
}

function getNotificationContent(
  eventType: PaymentNotificationType,
  data: PaymentNotificationData
): { title: string; message: string } {
  const formatAmount = (amount?: number, currency?: string): string => {
    if (!amount) return '';
    const dollars = amount / 100;
    return `$${dollars.toFixed(2)} ${(currency || 'USD').toUpperCase()}`;
  };

  const messages: Record<PaymentNotificationType, { title: string; message: string }> = {
    payment_success: {
      title: 'Payment Successful',
      message: data.amount
        ? `Your payment of ${formatAmount(data.amount, data.currency)} was processed successfully.`
        : 'Your payment was processed successfully.',
    },
    payment_failed: {
      title: 'Payment Failed',
      message: 'Your payment could not be processed. Please update your payment method to avoid service interruption.',
    },
    trial_ending: {
      title: 'Trial Ending Soon',
      message: `Your free trial ends in ${data.daysRemaining || 3} days. Add a payment method to continue using all features.`,
    },
    subscription_activated: {
      title: 'Subscription Activated',
      message: data.planName
        ? `Your ${data.planName} subscription is now active. Thank you for subscribing!`
        : 'Your subscription is now active. Thank you for subscribing!',
    },
    subscription_canceled: {
      title: 'Subscription Canceled',
      message: 'Your subscription has been canceled. You will have access until the end of your billing period.',
    },
    subscription_renewed: {
      title: 'Subscription Renewed',
      message: data.amount
        ? `Your subscription has been renewed. Amount charged: ${formatAmount(data.amount, data.currency)}.`
        : 'Your subscription has been renewed successfully.',
    },
    seat_count_changed: {
      title: 'Seat Count Updated',
      message: 'Your team seat count has been updated.',
    },
  };

  return messages[eventType];
}

async function createPaymentNotification(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  eventType: PaymentNotificationType,
  data: PaymentNotificationData = {}
): Promise<void> {
  try {
    // Get all Admins and Owners
    const { data: admins, error: fetchError } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('status', 'Active')
      .or('role.eq.Owner,role.eq.Admin');

    if (fetchError) {
      console.error('[createPaymentNotification] Failed to fetch admins:', fetchError);
      return;
    }

    if (!admins || admins.length === 0) {
      console.log('[createPaymentNotification] No admins/owners to notify');
      return;
    }

    const { title, message } = getNotificationContent(eventType, data);

    // Create notifications for each admin/owner
    for (const admin of admins) {
      const { error: insertError } = await supabase.from('notifications').insert({
        user_id: admin.user_id,
        organization_id: organizationId,
        type: eventType,
        title,
        message,
        link: '/settings?tab=billing',
        metadata: {
          amount: data.amount,
          currency: data.currency,
          plan_name: data.planName,
          days_remaining: data.daysRemaining,
        },
      });

      if (insertError) {
        console.error('[createPaymentNotification] Failed to create notification:', insertError);
      }
    }

    console.log(`[createPaymentNotification] Created ${eventType} notifications for ${admins.length} admins`);
  } catch (err) {
    console.error('[createPaymentNotification] Error:', err);
  }
}

async function getOrganizationIdFromCustomer(
  supabase: ReturnType<typeof createClient>,
  stripeCustomerId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('organization_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();

  if (error || !data) {
    console.error('[getOrganizationIdFromCustomer] Not found:', stripeCustomerId);
    return null;
  }

  return data.organization_id;
}

async function getOrganizationIdFromSubscription(
  supabase: ReturnType<typeof createClient>,
  stripeSubscriptionId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('organization_id')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .single();

  if (error || !data) {
    console.error('[getOrganizationIdFromSubscription] Not found:', stripeSubscriptionId);
    return null;
  }

  return data.organization_id;
}
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
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || Deno.env.get('STRIPE_CLI_WEBHOOK_SECRET') || '';

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
            currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000).toISOString();
            currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString();
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

        // Send subscription activated notification
        await createPaymentNotification(supabase, organizationId, 'subscription_activated', {
          planName: billingInterval === 'Yearly' ? 'Annual' : 'Monthly',
        });

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = subscription.id;
        const status = subscription.status;

        // Check if subscription is paused
        const isPaused = subscription.pause_collection !== null && subscription.pause_collection !== undefined;
        const displayStatus = isPaused ? 'Paused' : status.charAt(0).toUpperCase() + status.slice(1);

        // Get customer payment methods
        const paymentMethods = await stripe.paymentMethods.list({
          customer: subscription.customer as string,
          type: 'card',
        });
        const hasPaymentMethod = paymentMethods.data.length > 0;

        // Update subscription status and billing period
        await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_status: displayStatus,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            has_payment_method: hasPaymentMethod,
            cancel_at_period_end: subscription.cancel_at_period_end || false,
            is_active: ['active', 'trialing'].includes(status) && !isPaused,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', stripeSubscriptionId);

        console.log('Updated subscription status:', stripeSubscriptionId, displayStatus, 'isPaused:', isPaused, 'hasPayment:', hasPaymentMethod);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = subscription.id;

        // Get organization ID before updating
        const deletedOrgId = await getOrganizationIdFromSubscription(supabase, stripeSubscriptionId);

        // Mark subscription as inactive
        await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_status: 'Canceled',
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', stripeSubscriptionId);

        // Send subscription canceled notification
        if (deletedOrgId) {
          await createPaymentNotification(supabase, deletedOrgId, 'subscription_canceled');
        }

        console.log('Canceled subscription:', stripeSubscriptionId);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment succeeded for invoice:', invoice.id);

        // Send payment success notification (only for actual charges, not $0 invoices)
        if (invoice.amount_paid > 0 && invoice.customer) {
          const paymentOrgId = await getOrganizationIdFromCustomer(supabase, invoice.customer as string);
          if (paymentOrgId) {
            await createPaymentNotification(supabase, paymentOrgId, 'payment_success', {
              amount: invoice.amount_paid,
              currency: invoice.currency,
            });
          }
        }

        // Check if subscription should be paused after this payment
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);

          // If pause_at_period_end metadata is set, pause the subscription now
          if (subscription.metadata?.pause_at_period_end === 'true') {
            console.log('Pausing subscription after payment:', subscription.id);

            await stripe.subscriptions.update(subscription.id, {
              pause_collection: {
                behavior: 'void',
              },
              metadata: {
                pause_at_period_end: null as any, // Clear the flag
              },
            });

            // Update database
            await supabase
              .from('subscriptions')
              .update({
                stripe_subscription_status: 'Paused',
                pause_at_period_end: false,
                is_active: false,
                updated_at: new Date().toISOString(),
              })
              .eq('stripe_subscription_id', subscription.id);

            console.log('Subscription paused:', subscription.id);
          }
        }

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

        // Send payment failed notification
        const failedOrgId = await getOrganizationIdFromCustomer(supabase, stripeCustomerId);
        if (failedOrgId) {
          await createPaymentNotification(supabase, failedOrgId, 'payment_failed');
        }

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

        // Send trial ending notification
        const trialOrgId = await getOrganizationIdFromSubscription(supabase, subscription.id);
        if (trialOrgId) {
          // Calculate days remaining (Stripe sends this event 3 days before trial ends)
          const daysRemaining = subscription.trial_end
            ? Math.ceil((subscription.trial_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
            : 3;

          await createPaymentNotification(supabase, trialOrgId, 'trial_ending', {
            daysRemaining: Math.max(daysRemaining, 1),
          });
        }

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
