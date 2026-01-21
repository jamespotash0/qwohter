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

/**
 * Escape HTML special characters to prevent XSS/injection in email templates
 */
function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

// Build formatted task name with reference
function formatTaskName(title: string, metadata: Record<string, unknown>): string {
  // Remove "Reminder: " prefix if present
  const cleanTitle = title.replace(/^Reminder:\s*/i, '');
  const reference = metadata?.task_reference as string | undefined;
  return reference ? `${cleanTitle} [${reference}]` : cleanTitle;
}

// Generate email content for due notifications
function generateDueNotificationEmail(
  type: string,
  data: DueNotification,
  appUrl: string
): { subject: string; html: string; text: string } {
  const isReminder = type === 'reminder_due' || type === 'task_reminder' || type === 'reminder';
  const typeLabel = isReminder ? 'Task Reminder' : 'Task Due';
  const taskName = formatTaskName(data.title, data.metadata);

  // Subject: "Task Reminder - Testing [BO-1]"
  const subject = `${typeLabel} - ${escapeHtml(taskName)}`;

  // Clean message: "Reminder on Testing [BO-1]"
  const bodyMessage = isReminder
    ? `Reminder on ${escapeHtml(taskName)}`
    : `Your task ${escapeHtml(taskName)} is due`;

  // Build due date info if available
  let dueDateText = '';
  if (data.metadata?.due_date) {
    dueDateText = `Due: ${formatDateForEmail(data.metadata.due_date as string)}`;
    if (data.metadata.priority) {
      dueDateText += ` · Priority: ${escapeHtml(data.metadata.priority as string)}`;
    }
  }

  return {
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { padding: 32px 24px; border-bottom: 1px solid #e5e5e5; }
            .logo { font-size: 20px; font-weight: 600; color: #111; margin: 0; }
            .content { padding: 32px 24px; }
            .type-label { font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
            .message { font-size: 18px; font-weight: 500; color: #111; margin: 0 0 16px 0; }
            .due-info { font-size: 14px; color: #666; margin-bottom: 24px; }
            .button { display: inline-block; background-color: #111; color: #fff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px; }
            .footer { padding: 24px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #e5e5e5; }
            .footer a { color: #666; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <p class="logo">Qwohter</p>
            </div>
            <div class="content">
              <p class="type-label">${typeLabel}</p>
              <p class="message">${bodyMessage}</p>
              ${dueDateText ? `<p class="due-info">${dueDateText}</p>` : ''}
              ${data.link ? `<a href="${appUrl}${data.link}" class="button">View Details</a>` : ''}
            </div>
            <div class="footer">
              <p>Sent from <a href="${appUrl}">Qwohter</a></p>
              <p style="margin-top: 8px;">
                <a href="${appUrl}/settings?tab=notifications">Manage preferences</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `${typeLabel}\n\n${bodyMessage}\n\n${dueDateText ? dueDateText + '\n\n' : ''}View Details: ${appUrl}${data.link || '/dashboard'}`,
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
