/**
 * Process Notification Digest Edge Function
 *
 * Processes queued notifications and sends daily digest emails.
 * Should be triggered via cron job at regular intervals (e.g., every hour).
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

interface QueuedNotification {
  id: string;
  user_id: string;
  organization_id: string;
  notification_type: string;
  subject: string;
  body_html: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface UserDigestData {
  userId: string;
  email: string;
  name: string;
  notifications: QueuedNotification[];
}

// Generate digest email HTML
function generateDigestHtml(notifications: QueuedNotification[], userName: string): string {
  const groupedByType: Record<string, QueuedNotification[]> = {};

  for (const notif of notifications) {
    if (!groupedByType[notif.notification_type]) {
      groupedByType[notif.notification_type] = [];
    }
    groupedByType[notif.notification_type].push(notif);
  }

  const typeLabels: Record<string, string> = {
    signature_sent: 'Signature Requests Sent',
    signature_viewed: 'Documents Viewed',
    signature_signed: 'Documents Signed',
    proposal_submitted: 'Proposals Submitted',
    proposal_won: 'Proposals Won',
    proposal_rejected: 'Proposals Rejected',
    task_assigned: 'Tasks Assigned',
    update_mention: 'Mentions',
  };

  let sectionsHtml = '';
  for (const [type, items] of Object.entries(groupedByType)) {
    const label = typeLabels[type] || type;
    sectionsHtml += `
      <div style="margin-bottom: 24px;">
        <h3 style="color: #374151; font-size: 14px; font-weight: 600; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">
          ${label} (${items.length})
        </h3>
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px;">
          ${items.map(item => `
            <div style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #1f2937; font-size: 14px;">${item.subject}</p>
              <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 12px;">
                ${new Date(item.created_at).toLocaleString()}
              </p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #EE6C4D 0%, #d85a3d 100%); color: white; padding: 30px; text-align: center; }
          .logo { font-size: 24px; font-weight: bold; margin: 0 0 8px 0; }
          .content { background-color: #ffffff; padding: 30px; }
          .summary { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-bottom: 24px; border-radius: 4px; }
          .button { display: inline-block; background-color: #EE6C4D; color: white !important; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: bold; font-size: 14px; }
          .footer { background-color: #f8f9fa; padding: 24px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #e9ecef; }
          .footer a { color: #EE6C4D; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">Qwohter</h1>
            <p style="margin: 0; opacity: 0.95;">Daily Activity Digest</p>
          </div>
          <div class="content">
            <p style="font-size: 16px; margin-bottom: 24px;">
              Hi ${userName || 'there'},
            </p>
            <div class="summary">
              <strong>Summary:</strong> You have ${notifications.length} notification${notifications.length === 1 ? '' : 's'} from yesterday.
            </div>
            ${sectionsHtml}
            <div style="text-align: center; margin-top: 32px;">
              <a href="https://www.qwohter.com/dashboard" class="button" style="color: white !important;">View Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>This digest was sent from <a href="https://www.qwohter.com">Qwohter</a></p>
            <p style="margin-top: 12px;">
              <a href="https://www.qwohter.com/settings?tab=notifications">Manage notification preferences</a>
            </p>
            <p style="margin-top: 16px; font-size: 11px; color: #adb5bd;">
              © ${new Date().getFullYear()} Qwohter. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
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

    // Get current hour (UTC)
    const currentHour = new Date().getUTCHours();
    const hourString = currentHour.toString().padStart(2, '0') + ':00:00';

    console.log(`Processing digest for hour: ${hourString}`);

    // Find users with daily digest mode whose digest_time matches current hour
    const { data: usersWithDigest, error: prefError } = await supabase
      .from('notification_preferences')
      .select(`
        user_id,
        organization_id,
        digest_time,
        notification_email
      `)
      .eq('digest_mode', 'daily')
      .eq('email_enabled', true);

    if (prefError) {
      console.error('Error fetching preferences:', prefError);
      throw prefError;
    }

    if (!usersWithDigest || usersWithDigest.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No users with daily digest mode' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter users whose digest time matches current hour
    const eligibleUsers = usersWithDigest.filter(pref => {
      const prefHour = pref.digest_time?.substring(0, 2) || '09';
      return prefHour === currentHour.toString().padStart(2, '0');
    });

    if (eligibleUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: `No users scheduled for digest at ${hourString}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${eligibleUsers.length} users eligible for digest`);

    let processed = 0;
    let errors = 0;

    for (const userPref of eligibleUsers) {
      try {
        // Get pending notifications for this user
        const { data: notifications, error: notifError } = await supabase
          .from('email_notification_queue')
          .select('*')
          .eq('user_id', userPref.user_id)
          .eq('organization_id', userPref.organization_id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (notifError || !notifications || notifications.length === 0) {
          continue; // Skip users with no pending notifications
        }

        // Get user email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userPref.user_id)
          .single();

        if (!profile?.email) {
          console.error(`No email found for user ${userPref.user_id}`);
          continue;
        }

        // Determine recipient email (custom notification_email or default profile email)
        const recipientEmail = userPref.notification_email || profile.email;

        const userName = profile.full_name || 'there';

        // Generate digest email
        const digestHtml = generateDigestHtml(notifications, userName);

        // Send via Resend
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Qwohter Notifications <notifications@qwohter.com>',
            to: [recipientEmail],
            subject: `Your Qwohter Daily Digest - ${notifications.length} update${notifications.length === 1 ? '' : 's'}`,
            html: digestHtml,
          }),
        });

        if (!resendResponse.ok) {
          const errorData = await resendResponse.json();
          console.error(`Failed to send digest to ${recipientEmail}:`, errorData);
          errors++;
          continue;
        }

        // Mark notifications as sent
        const notificationIds = notifications.map(n => n.id);
        await supabase
          .from('email_notification_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .in('id', notificationIds);

        processed++;
        console.log(`Sent digest to ${recipientEmail} with ${notifications.length} notifications`);
      } catch (userError) {
        console.error(`Error processing digest for user ${userPref.user_id}:`, userError);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processed} digest emails, ${errors} errors`,
        processed,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-notification-digest:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
