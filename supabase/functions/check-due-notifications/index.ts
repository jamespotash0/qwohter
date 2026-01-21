/**
 * Check Due Notifications Edge Function
 *
 * SINGLE SOURCE OF TRUTH for processing scheduled notifications.
 * Handles BOTH in-app notifications AND emails to avoid race conditions.
 *
 * Flow:
 * 1. Query due notifications from scheduled_notifications table
 * 2. Create in-app notification for each
 * 3. Send email (respecting user preferences)
 * 4. Mark scheduled notification as sent
 *
 * Triggered via pg_cron every 5 minutes.
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
  scheduled_notification_id: string;
}

interface NotificationPreferences {
  email_enabled: boolean;
  email_on_reminder_due: boolean;
  email_on_task_due: boolean;
  email_on_task_reminder: boolean;
  notification_email?: string | null;
}

// Format date for email display (uses Eastern Time as server default)
function formatDateForEmail(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    // Fallback if date is invalid
    return new Date(dateStr).toLocaleDateString();
  }
}

// Generate email content for due notifications
function generateDueNotificationEmail(
  type: string,
  data: DueNotification,
  appUrl: string
): { subject: string; html: string; text: string } {
  const isReminder = type === 'reminder_due' || type === 'task_reminder' || type === 'reminder';
  const headerColor = isReminder ? '#F59E0B' : '#EF4444';
  const headerTitle = type === 'task_reminder' || type === 'reminder' ? 'Task Reminder' : (type === 'reminder_due' ? 'Reminder Due' : 'Task Due');

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
                  <strong>Due:</strong> ${formatDateForEmail(data.metadata.due_date as string)}
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

    // Parse request body to check source
    let body: { source?: string } = {};
    try {
      const clonedReq = req.clone();
      body = await clonedReq.json();
    } catch {
      // No body or invalid JSON - that's fine
    }

    const isFromCron = body?.source === 'pg_cron';
    if (isFromCron) {
      console.log('Called from pg_cron');
    }

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Checking for due notifications from scheduled_notifications...');

    // Call the database function to get due notifications from scheduled_notifications
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
    let inAppCreated = 0;
    let emailsSent = 0;
    let errors = 0;
    let skipped = 0;
    const processedNotificationIds: string[] = [];

    for (const notification of dueNotifications as DueNotification[]) {
      try {
        // =================================================================
        // STEP 1: Create in-app notification (always, regardless of email prefs)
        // =================================================================
        const { error: inAppError } = await supabase
          .from('notifications')
          .insert({
            user_id: notification.user_id,
            organization_id: notification.organization_id,
            type: notification.notification_type,
            title: notification.title,
            message: notification.message || '',
            link: notification.link,
            metadata: notification.metadata,
            is_read: false,
            created_at: new Date().toISOString(),
          });

        if (inAppError) {
          // Log but don't fail - might be duplicate
          if (!inAppError.message?.includes('duplicate')) {
            console.error(`Error creating in-app notification:`, inAppError);
          }
        } else {
          inAppCreated++;
          console.log(`Created in-app notification for user ${notification.user_id}`);
        }

        // =================================================================
        // STEP 2: Check user's email preferences
        const { data: preferences } = await supabase
          .from('notification_preferences')
          .select('email_enabled, email_on_reminder_due, email_on_task_due, email_on_task_reminder, notification_email')
          .eq('user_id', notification.user_id)
          .eq('organization_id', notification.organization_id)
          .single();

        // Apply default preferences if none exist
        const userPrefs: NotificationPreferences = preferences || {
          email_enabled: true,
          email_on_reminder_due: true,
          email_on_task_due: true,
          email_on_task_reminder: true,
        };

        // Check if email is enabled globally
        if (!userPrefs.email_enabled) {
          console.log(`Email disabled for user ${notification.user_id}`);
          // Still count as processed - mark the notification as sent
          if (notification.scheduled_notification_id) {
            processedNotificationIds.push(notification.scheduled_notification_id);
          }
          skipped++;
          processed++;
          continue;
        }

        // Check if this specific notification type is enabled
        let isEnabled = true;
        switch (notification.notification_type) {
          case 'reminder_due':
          case 'reminder':
            isEnabled = userPrefs.email_on_reminder_due || userPrefs.email_on_task_reminder;
            break;
          case 'task_reminder':
            isEnabled = userPrefs.email_on_task_reminder;
            break;
          case 'task_due':
            isEnabled = userPrefs.email_on_task_due;
            break;
        }

        if (!isEnabled) {
          console.log(`${notification.notification_type} emails disabled for user ${notification.user_id}`);
          // Still mark as processed
          if (notification.scheduled_notification_id) {
            processedNotificationIds.push(notification.scheduled_notification_id);
          }
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

        // Send email via Resend
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

          // Queue for retry
          await supabase
            .from('notification_retry_queue')
            .insert({
              user_id: notification.user_id,
              organization_id: notification.organization_id,
              channel: 'email',
              notification_type: notification.notification_type,
              subject: emailContent.subject,
              body_html: emailContent.html,
              body_text: emailContent.text,
              metadata: notification.metadata,
              status: 'pending',
              last_error: JSON.stringify(errorData),
              next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Retry in 5 min
            });

          console.log(`Queued ${notification.notification_type} for retry`);
          errors++;
          continue;
        }

        console.log(`Sent ${notification.notification_type} email to ${recipientEmail}`);
        emailsSent++;

        // Track processed notification ID
        if (notification.scheduled_notification_id) {
          processedNotificationIds.push(notification.scheduled_notification_id);
        }

        processed++;
      } catch (notifError) {
        console.error(`Error processing notification:`, notifError);
        errors++;
      }
    }

    // Mark scheduled notifications as sent using the new function
    if (processedNotificationIds.length > 0) {
      const { data: markedCount, error: markError } = await supabase
        .rpc('mark_scheduled_notifications_sent', { notification_ids: processedNotificationIds });

      if (markError) {
        console.error('Error marking scheduled notifications as sent:', markError);
      } else {
        console.log(`Marked ${markedCount} scheduled notifications as sent`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processed} notifications: ${inAppCreated} in-app, ${emailsSent} emails, ${skipped} skipped, ${errors} errors`,
        total: dueNotifications.length,
        processed,
        inAppCreated,
        emailsSent,
        skipped,
        errors,
        notificationsMarked: processedNotificationIds.length,
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
