//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
//@ts-ignore
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * Scheduled Edge Function to sync subscription quantities to Stripe
 *
 * This function runs periodically (e.g., every hour) to:
 * 1. Find subscriptions where stripe_quantity_pending_sync = true
 * 2. Compare local number_of_users with Stripe subscription quantity
 * 3. Update Stripe subscription quantity with proration
 * 4. Clear the pending_sync flag
 *
 * Schedule: Run via Supabase cron job or external scheduler
 * Example cron: "0 * * * *" (every hour)
 */
//@ts-ignore
serve(async (req) => {
  try {
    //@ts-ignore
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || Deno.env.get('STRIPE_SECRET_KEY_TEST') || '';
    //@ts-ignore
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    //@ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    //@ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Starting Stripe quantity sync...');

    // Get all subscriptions pending sync
    const { data: subscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, organization_id, stripe_subscription_id, number_of_users')
      .eq('stripe_quantity_pending_sync', true)
      .not('stripe_subscription_id', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('✅ No subscriptions pending sync');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No subscriptions pending sync',
          synced: 0,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📊 Found ${subscriptions.length} subscriptions to sync`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        // Get current Stripe subscription
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripe_subscription_id
        );

        const currentStripeQuantity = stripeSubscription.items.data[0]?.quantity || 1;
        const localQuantity = subscription.number_of_users || 1;

        // Only update if quantities differ
        if (currentStripeQuantity !== localQuantity) {
          console.log(`🔧 Updating subscription ${subscription.stripe_subscription_id}: ${currentStripeQuantity} → ${localQuantity}`);

          // Update Stripe subscription quantity with proration
          await stripe.subscriptions.update(
            subscription.stripe_subscription_id,
            {
              items: [{
                id: stripeSubscription.items.data[0].id,
                quantity: localQuantity,
              }],
              proration_behavior: 'always_invoice', // Create proration invoice
            }
          );

          successCount++;
          results.push({
            organization_id: subscription.organization_id,
            old_quantity: currentStripeQuantity,
            new_quantity: localQuantity,
            status: 'updated',
          });
        } else {
          console.log(`✓ Subscription ${subscription.stripe_subscription_id} already in sync (${localQuantity})`);
          results.push({
            organization_id: subscription.organization_id,
            quantity: localQuantity,
            status: 'already_synced',
          });
        }

        // Clear the pending sync flag
        await supabase
          .from('subscriptions')
          .update({
            stripe_quantity_pending_sync: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

      } catch (error) {
        console.error(`❌ Failed to sync subscription ${subscription.organization_id}:`, error);
        errorCount++;
        results.push({
          organization_id: subscription.organization_id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`✅ Sync complete: ${successCount} updated, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: successCount,
        errors: errorCount,
        total: subscriptions.length,
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
