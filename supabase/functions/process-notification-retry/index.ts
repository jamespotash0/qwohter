/**
 * Process Notification Retry Edge Function
 *
 * Retries failed notifications with exponential backoff.
 * Should be triggered via cron job at regular intervals (e.g., every 5 minutes).
 *
 * Retry strategy:
 * - 1st retry: 5 minutes after failure
 * - 2nd retry: 15 minutes after (5 * 3)
 * - 3rd retry: 45 minutes after (15 * 3)
 * - 4th retry: 2.25 hours after (45 * 3)
 * - 5th retry: 6.75 hours after
 * - Max retries: 5 (then marked as failed)
 */

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_RETRIES = 5;
const BACKOFF_MULTIPLIER = 3;
const INITIAL_RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutes

interface QueuedNotification {
  id: string;
  user_id: string;
  organization_id: string;
  channel: string;
  notification_type: string;
  subject: string;
  body_html: string;
  body_text?: string;
  metadata: Record<string, unknown>;
  retry_count: number;
}

// @ts-ignore
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // @ts-ignore
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get pending notifications that are ready for retry
    const now = new Date().toISOString();
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('notification_retry_queue')
      .select('*')
      .in('status', ['pending', 'retrying'])
      .lte('next_retry_at', now)
      .lt('retry_count', MAX_RETRIES)
      .order('next_retry_at', { ascending: true })
      .limit(50); // Process in batches

    if (fetchError) {
      console.error('Error fetching retry queue:', fetchError);
      throw fetchError;
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No notifications to retry', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${pendingNotifications.length} notifications for retry`);

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const notification of pendingNotifications as QueuedNotification[]) {
      try {
        // Only handle email channel for now
        if (notification.channel !== 'email') {
          console.log(`Skipping non-email notification: ${notification.id}`);
          continue;
        }

        // Get user's notification email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', notification.user_id)
          .single();

        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('notification_email')
          .eq('user_id', notification.user_id)
          .eq('organization_id', notification.organization_id)
          .single();

        const recipientEmail = prefs?.notification_email || profile?.email;

        if (!recipientEmail) {
          console.error(`No email for user ${notification.user_id}, marking as failed`);
          await supabase
            .from('notification_retry_queue')
            .update({
              status: 'failed',
              last_error: 'No email address found for user',
            })
            .eq('id', notification.id);
          failed++;
          continue;
        }

        // Attempt to send
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Qwohter Notifications <notifications@qwohter.com>',
            to: [recipientEmail],
            subject: notification.subject,
            html: notification.body_html,
            text: notification.body_text,
          }),
        });

        if (resendResponse.ok) {
          // Success! Mark as sent
          await supabase
            .from('notification_retry_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', notification.id);

          console.log(`Retry succeeded for notification ${notification.id}`);
          succeeded++;
        } else {
          // Failed again
          const errorData = await resendResponse.json();
          const newRetryCount = notification.retry_count + 1;

          if (newRetryCount >= MAX_RETRIES) {
            // Max retries reached, mark as permanently failed
            await supabase
              .from('notification_retry_queue')
              .update({
                status: 'failed',
                retry_count: newRetryCount,
                last_error: JSON.stringify(errorData),
              })
              .eq('id', notification.id);

            console.error(`Max retries reached for notification ${notification.id}`);
            failed++;
          } else {
            // Schedule next retry with exponential backoff
            const nextRetryDelay = INITIAL_RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, newRetryCount - 1);
            const nextRetryAt = new Date(Date.now() + nextRetryDelay).toISOString();

            await supabase
              .from('notification_retry_queue')
              .update({
                status: 'retrying',
                retry_count: newRetryCount,
                next_retry_at: nextRetryAt,
                last_error: JSON.stringify(errorData),
              })
              .eq('id', notification.id);

            console.log(`Scheduled retry ${newRetryCount}/${MAX_RETRIES} for notification ${notification.id} at ${nextRetryAt}`);
          }
        }

        processed++;
      } catch (notifError) {
        console.error(`Error processing notification ${notification.id}:`, notifError);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processed} notifications: ${succeeded} succeeded, ${failed} failed`,
        processed,
        succeeded,
        failed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-notification-retry:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
