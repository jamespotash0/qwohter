/**
 * Check Due Notifications Edge Function
 *
 * Checks for reminders and tasks that are due and creates notifications.
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

interface DueNotification {
  notification_type: string;
  user_id: string;
  organization_id: string;
  title: string;
  message: string;
  link: string;
  metadata: Record<string, unknown>;
}

interface NotificationPreferences {
  email_enabled: boolean;
  digest_mode: 'instant' | 'daily';
  email_on_reminder_due: boolean;
  email_on_task_due: boolean;
  notification_email?: string | null;
}

// Generate email content for due notifications
function generateDueNotificationEmail(
  type: string,
  data: DueNotification,
  appUrl: string
): { subject: string; html: string; text: string } {
  const isReminder = type === 'reminder_due';
  const headerColor = isReminder ? '#F59E0B' : '#EF4444';
  const headerTitle = isReminder ? 'Reminder Due' : 'Task Due';

  return {
    subject: data.title,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: ${headerColor}; color: white; padding: 30px; text-align: center; }
            .logo { font-size: 24px; font-weight: bold; margin: 0 0 8px 0; }
            .header-title { font-size: 18px; margin: 0; opacity: 0.95; }
            .content { background-color: #ffffff; padding: 30px; }
            .button { display: inline-block; background-color: ${headerColor}; color: white !important; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: bold; font-size: 14px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 24px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #e9ecef; }
            .footer a { color: #EE6C4D; text-decoration: none; }
            .info-box { background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="logo">Qwohter</h1>
              <p class="header-title">${headerTitle}</p>
            </div>
            <div class="content">
              <h2 style="margin-top: 0;">${data.title}</h2>
              <p>${data.message}</p>
              ${data.metadata?.due_date ? `
                <div class="info-box">
                  <strong>Due:</strong> ${new Date(data.metadata.due_date as string).toLocaleString()}
                  ${data.metadata.priority ? `<br><strong>Priority:</strong> ${data.metadata.priority}` : ''}
                </div>
              ` : ''}
              ${data.link ? `
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${appUrl}${data.link}" class="button" style="color: white !important;">View Details</a>
                </div>
              ` : ''}
            </div>
            <div class="footer">
              <p>This notification was sent from <a href="https://www.qwohter.com">Qwohter</a></p>
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
    `,
    text: `${data.title}\n\n${data.message}\n\nView in Qwohter: ${appUrl}${data.link || '/dashboard'}`,
  };
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
    // @ts-ignore
    const appUrl = Deno.env.get('APP_URL') || 'https://www.qwohter.com';

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Checking for due notifications...');

    // Call the database function to get due notifications
    const { data: dueNotifications, error: dueError } = await supabase
      .rpc('check_due_notifications');

    if (dueError) {
      console.error('Error checking due notifications:', dueError);
      throw dueError;
    }

    if (!dueNotifications || dueNotifications.length === 0) {
      console.log('No due notifications found');
      return new Response(
        JSON.stringify({ success: true, message: 'No due notifications', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${dueNotifications.length} due notifications`);

    let processed = 0;
    let errors = 0;
    let skipped = 0;

    for (const notification of dueNotifications as DueNotification[]) {
      try {
        // Create in-app notification
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: notification.user_id,
            organization_id: notification.organization_id,
            type: notification.notification_type,
            title: notification.title,
            message: notification.message,
            link: notification.link,
            metadata: notification.metadata,
            is_read: false,
          });

        if (notifError) {
          console.error('Error creating in-app notification:', notifError);
          errors++;
          continue;
        }

        // Check user's email preferences
        const { data: preferences } = await supabase
          .from('notification_preferences')
          .select('email_enabled, digest_mode, email_on_reminder_due, email_on_task_due, notification_email')
          .eq('user_id', notification.user_id)
          .eq('organization_id', notification.organization_id)
          .single();

        // Apply default preferences if none exist
        const userPrefs: NotificationPreferences = preferences || {
          email_enabled: true,
          digest_mode: 'instant',
          email_on_reminder_due: true,
          email_on_task_due: true,
        };

        // Check if email is enabled globally
        if (!userPrefs.email_enabled) {
          console.log(`Email disabled for user ${notification.user_id}`);
          skipped++;
          processed++;
          continue;
        }

        // Check if this specific notification type is enabled
        const isEnabled = notification.notification_type === 'reminder_due'
          ? userPrefs.email_on_reminder_due
          : userPrefs.email_on_task_due;

        if (!isEnabled) {
          console.log(`${notification.notification_type} emails disabled for user ${notification.user_id}`);
          skipped++;
          processed++;
          continue;
        }

        // Get user's email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', notification.user_id)
          .single();

        if (!profile?.email) {
          console.error(`No email found for user ${notification.user_id}`);
          errors++;
          continue;
        }

        // Determine recipient email (custom notification_email or default profile email)
        const recipientEmail = userPrefs.notification_email || profile.email;

        // Generate email content
        const emailContent = generateDueNotificationEmail(
          notification.notification_type,
          notification,
          appUrl
        );

        // Check digest mode
        if (userPrefs.digest_mode === 'daily') {
          // Queue for digest
          const { error: queueError } = await supabase
            .from('email_notification_queue')
            .insert({
              user_id: notification.user_id,
              organization_id: notification.organization_id,
              notification_type: notification.notification_type,
              subject: emailContent.subject,
              body_html: emailContent.html,
              body_text: emailContent.text,
              metadata: notification.metadata,
              status: 'pending',
            });

          if (queueError) {
            console.error('Failed to queue notification:', queueError);
            errors++;
            continue;
          }

          console.log(`Queued ${notification.notification_type} for user ${recipientEmail}`);
        } else {
          // Send immediately via Resend
          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Qwohter Notifications <notifications@qwohter.com>',
              to: [recipientEmail],
              subject: emailContent.subject,
              html: emailContent.html,
              text: emailContent.text,
            }),
          });

          if (!resendResponse.ok) {
            const errorData = await resendResponse.json();
            console.error(`Failed to send email to ${recipientEmail}:`, errorData);
            errors++;
            continue;
          }

          console.log(`Sent ${notification.notification_type} email to ${recipientEmail}`);
        }

        processed++;
      } catch (notifError) {
        console.error(`Error processing notification:`, notifError);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processed} notifications, ${skipped} skipped (disabled), ${errors} errors`,
        total: dueNotifications.length,
        processed,
        skipped,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-due-notifications:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
