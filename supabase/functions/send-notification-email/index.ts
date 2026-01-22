/**
 * Send Notification Email Edge Function
 *
 * Sends email notifications based on user preferences.
 * - If instant mode: sends immediately via Resend
 * - If digest mode: queues for daily digest
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

type NotificationType =
  | 'signature_sent'
  | 'signature_viewed'
  | 'signature_signed'
  | 'proposal_submitted'
  | 'proposal_won'
  | 'proposal_rejected'
  | 'approval_requested'
  | 'approval_approved'
  | 'approval_rejected'
  | 'task_assigned'
  | 'update_mention'
  // Member events
  | 'member_joined'
  // Payment/Subscription events
  | 'payment_success'
  | 'payment_failed'
  | 'trial_ending'
  | 'subscription_activated'
  | 'subscription_canceled'
  | 'subscription_renewed'
  | 'seat_count_changed';

interface NotificationEmailRequest {
  userId: string;
  organizationId: string;
  notificationType: NotificationType;
  recipientEmail: string;
  recipientName: string;
  data: {
    proposalNumber?: string;
    proposalName?: string;
    signerName?: string;
    signerEmail?: string;
    actorName?: string;
    fromStatus?: string;
    toStatus?: string;
    link?: string;
    taskTitle?: string;
    projectName?: string;
    mentionedBy?: string;
    commentPreview?: string;
    // Member joined
    memberName?: string;
    memberEmail?: string;
    memberRole?: string;
    // Payment/Subscription
    amount?: number;
    currency?: string;
    planName?: string;
    daysRemaining?: number;
    oldSeatCount?: number;
    newSeatCount?: number;
    [key: string]: unknown;
  };
}

// Map notification type to preference field
const preferenceFieldMap: Record<NotificationType, string> = {
  signature_sent: 'email_on_signature_sent',
  signature_viewed: 'email_on_signature_viewed',
  signature_signed: 'email_on_signature_signed',
  proposal_submitted: 'email_on_proposal_submitted',
  proposal_won: 'email_on_proposal_won',
  proposal_rejected: 'email_on_proposal_rejected',
  approval_requested: 'email_on_proposal_submitted', // Use submitted preference for approval requests
  approval_approved: 'email_on_proposal_submitted',
  approval_rejected: 'email_on_proposal_rejected',
  task_assigned: 'email_on_task_assigned',
  update_mention: 'email_on_mention',
  // Member events
  member_joined: 'email_on_member_joined',
  // Payment/Subscription events
  payment_success: 'email_on_payment_success',
  payment_failed: 'email_on_payment_failed',
  trial_ending: 'email_on_trial_ending',
  subscription_activated: 'email_on_subscription_activated',
  subscription_canceled: 'email_on_subscription_canceled',
  subscription_renewed: 'email_on_subscription_renewed',
  seat_count_changed: 'email_on_seat_count_changed',
};

// Generate email content based on notification type
function generateEmailContent(
  notificationType: NotificationType,
  data: NotificationEmailRequest['data'],
  appUrl: string
): { subject: string; html: string; text: string } {
  const templates: Record<NotificationType, () => { subject: string; html: string; text: string }> = {
    signature_sent: () => ({
      subject: `[Notification] Signature Request Sent - ${escapeHtml(data.proposalNumber) || 'Proposal'}`,
      html: createEmailHtml({
        bodyContent: `
          <p>Your document <strong>${escapeHtml(data.proposalNumber) || 'proposal'}</strong> has been sent to <strong>${escapeHtml(data.signerEmail)}</strong> for signature.</p>
          <p>You'll be notified when they view or sign the document.</p>
        `,
        ctaButton: data.link ? { text: 'View Proposal', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `Signature request sent for ${data.proposalNumber || 'your proposal'} to ${data.signerEmail}.`,
    }),

    signature_viewed: () => ({
      subject: `[Notification] ${escapeHtml(data.proposalNumber) || 'Proposal'} Viewed`,
      html: createEmailHtml({
        bodyContent: `
          <p><strong>${escapeHtml(data.signerName) || 'Your client'}</strong> has opened and viewed your document <strong>${escapeHtml(data.proposalNumber)}</strong>.</p>
          <p>They may sign it soon!</p>
        `,
        ctaButton: data.link ? { text: 'View Proposal', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `${data.signerName || 'Client'} has viewed ${data.proposalNumber || 'your proposal'}.`,
    }),

    signature_signed: () => ({
      subject: `[Notification] ${escapeHtml(data.proposalNumber) || 'Proposal'} Signed`,
      html: createEmailHtml({
        bodyContent: `
          <p>Great news! <strong>${escapeHtml(data.signerName) || 'Your client'}</strong> (${escapeHtml(data.signerEmail)}) has signed your document <strong>${escapeHtml(data.proposalNumber)}</strong>.</p>
          <p>The signed copy is now available in your dashboard.</p>
        `,
        ctaButton: data.link ? { text: 'View Signed Document', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `${data.signerName || 'Client'} has signed ${data.proposalNumber || 'your proposal'}!`,
    }),

    proposal_submitted: () => ({
      subject: `[Notification] ${escapeHtml(data.proposalNumber) || 'Proposal'} Submitted`,
      html: createEmailHtml({
        bodyContent: `
          <p>Proposal <strong>${escapeHtml(data.proposalNumber)}</strong> ${data.proposalName ? `(${escapeHtml(data.proposalName)})` : ''} has been submitted.</p>
        `,
        ctaButton: data.link ? { text: 'View Proposal', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `Proposal ${data.proposalNumber} has been submitted.`,
    }),

    proposal_won: () => ({
      subject: `[Notification] ${escapeHtml(data.proposalNumber) || 'Proposal'} Won`,
      html: createEmailHtml({
        bodyContent: `
          <p>Congratulations! Proposal <strong>${escapeHtml(data.proposalNumber)}</strong> ${data.proposalName ? `(${escapeHtml(data.proposalName)})` : ''} has been marked as won!</p>
        `,
        ctaButton: data.link ? { text: 'View Proposal', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `Congratulations! Proposal ${data.proposalNumber} has been won!`,
    }),

    proposal_rejected: () => ({
      subject: `[Notification] ${escapeHtml(data.proposalNumber) || 'Proposal'} Rejected`,
      html: createEmailHtml({
        bodyContent: `
          <p>Proposal <strong>${escapeHtml(data.proposalNumber)}</strong> ${data.proposalName ? `(${escapeHtml(data.proposalName)})` : ''} has been marked as rejected.</p>
        `,
        ctaButton: data.link ? { text: 'View Proposal', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `Proposal ${data.proposalNumber} has been rejected.`,
    }),

    task_assigned: () => ({
      subject: `[Notification] Task Assigned - ${escapeHtml(data.taskTitle) || 'New Task'}`,
      html: createEmailHtml({
        bodyContent: `
          <p><strong>${escapeHtml(data.actorName) || 'A team member'}</strong> assigned you a task:</p>
          <p style="padding: 12px; background: #f3f4f6; border-radius: 6px;"><strong>${escapeHtml(data.taskTitle)}</strong></p>
          ${data.projectName ? `<p>Project: ${escapeHtml(data.projectName)}</p>` : ''}
        `,
        ctaButton: data.link ? { text: 'View Task', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `${data.actorName || 'A team member'} assigned you a task: ${data.taskTitle}`,
    }),

    update_mention: () => ({
      subject: `[Notification] You Were Mentioned`,
      html: createEmailHtml({
        bodyContent: `
          <p><strong>${escapeHtml(data.mentionedBy) || 'A team member'}</strong> mentioned you in a comment:</p>
          ${data.commentPreview ? `<p style="padding: 12px; background: #f3f4f6; border-radius: 6px; font-style: italic;">"${escapeHtml(data.commentPreview)}"</p>` : ''}
        `,
        ctaButton: data.link ? { text: 'View Comment', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `${data.mentionedBy || 'Someone'} mentioned you in a comment.`,
    }),

    approval_requested: () => ({
      subject: `[Notification] Approval Requested - ${escapeHtml(data.proposalNumber) || 'Proposal'}`,
      html: createEmailHtml({
        bodyContent: `
          <p><strong>${escapeHtml(data.actorName) || 'A team member'}</strong> has requested approval for proposal <strong>${escapeHtml(data.proposalNumber)}</strong>${data.proposalName ? ` (${escapeHtml(data.proposalName)})` : ''}.</p>
          <p>Please review and approve or reject this proposal.</p>
        `,
        ctaButton: data.link ? { text: 'Review Proposal', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `${data.actorName || 'A team member'} requested approval for proposal ${data.proposalNumber}.`,
    }),

    approval_approved: () => ({
      subject: `[Notification] ${escapeHtml(data.proposalNumber) || 'Proposal'} Approved`,
      html: createEmailHtml({
        bodyContent: `
          <p>Great news! <strong>${escapeHtml(data.actorName) || 'An admin'}</strong> has approved your proposal <strong>${escapeHtml(data.proposalNumber)}</strong>${data.proposalName ? ` (${escapeHtml(data.proposalName)})` : ''}.</p>
          <p>The proposal has been submitted.</p>
        `,
        ctaButton: data.link ? { text: 'View Proposal', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `Your proposal ${data.proposalNumber} has been approved and submitted.`,
    }),

    approval_rejected: () => ({
      subject: `[Notification] ${escapeHtml(data.proposalNumber) || 'Proposal'} Not Approved`,
      html: createEmailHtml({
        bodyContent: `
          <p><strong>${escapeHtml(data.actorName) || 'An admin'}</strong> has not approved your proposal <strong>${escapeHtml(data.proposalNumber)}</strong>${data.proposalName ? ` (${escapeHtml(data.proposalName)})` : ''}.</p>
          <p>The proposal has been returned to draft status for revisions.</p>
        `,
        ctaButton: data.link ? { text: 'View Proposal', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `Your proposal ${data.proposalNumber} was not approved and has been returned to draft.`,
    }),

    // Member events
    member_joined: () => ({
      subject: `[Notification] New Team Member Joined`,
      html: createEmailHtml({
        bodyContent: `
          <p><strong>${escapeHtml(data.memberName) || 'A new member'}</strong> (${escapeHtml(data.memberEmail)}) has joined your team as <strong>${escapeHtml(data.memberRole) || 'Member'}</strong>.</p>
          <p>You can view and manage your team in Settings.</p>
        `,
        ctaButton: { text: 'View Team', url: `${appUrl}/settings?tab=team` },
      }),
      text: `${data.memberName || 'A new member'} has joined your team as ${data.memberRole || 'Member'}.`,
    }),

    // Payment/Subscription events
    payment_success: () => {
      const formatAmount = (amount?: number, currency?: string): string => {
        if (!amount) return '';
        const dollars = amount / 100;
        return `$${dollars.toFixed(2)} ${(currency || 'USD').toUpperCase()}`;
      };
      return {
        subject: `[Notification] Payment Successful`,
        html: createEmailHtml({
          bodyContent: `
            <p>Your payment has been processed successfully.</p>
            ${data.amount ? `<p style="font-size: 24px; font-weight: bold; color: #22c55e;">${formatAmount(data.amount, data.currency)}</p>` : ''}
            <p>Thank you for your continued subscription!</p>
          `,
          ctaButton: { text: 'View Billing', url: `${appUrl}/settings?tab=billing` },
        }),
        text: data.amount ? `Your payment of ${formatAmount(data.amount, data.currency)} was successful.` : 'Your payment was successful.',
      };
    },

    payment_failed: () => ({
      subject: `[Notification] Payment Failed - Action Required`,
      html: createEmailHtml({
        bodyContent: `
          <p style="color: #ef4444;"><strong>Your payment could not be processed.</strong></p>
          <p>Please update your payment method to avoid service interruption.</p>
          <p>Your access may be limited until payment is resolved.</p>
        `,
        ctaButton: { text: 'Update Payment Method', url: `${appUrl}/settings?tab=billing` },
      }),
      text: 'Your payment failed. Please update your payment method to avoid service interruption.',
    }),

    trial_ending: () => ({
      subject: `[Notification] Your Free Trial Ends in ${data.daysRemaining || 3} Days`,
      html: createEmailHtml({
        bodyContent: `
          <p>Your free trial ends in <strong>${data.daysRemaining || 3} days</strong>.</p>
          <p>Add a payment method now to continue using all features without interruption.</p>
          <p>After your trial ends, you'll need an active subscription to access your account.</p>
        `,
        ctaButton: { text: 'Add Payment Method', url: `${appUrl}/settings?tab=billing` },
      }),
      text: `Your free trial ends in ${data.daysRemaining || 3} days. Add a payment method to continue.`,
    }),

    subscription_activated: () => ({
      subject: `[Notification] Subscription Activated`,
      html: createEmailHtml({
        bodyContent: `
          <p style="color: #22c55e;"><strong>Your subscription is now active!</strong></p>
          ${data.planName ? `<p>Plan: ${escapeHtml(data.planName)}</p>` : ''}
          <p>Thank you for subscribing! You now have full access to all features.</p>
        `,
        ctaButton: { text: 'Go to Dashboard', url: `${appUrl}/dashboard` },
      }),
      text: `Your ${data.planName || ''} subscription is now active. Thank you for subscribing!`,
    }),

    subscription_canceled: () => ({
      subject: `[Notification] Subscription Canceled`,
      html: createEmailHtml({
        bodyContent: `
          <p>Your subscription has been canceled.</p>
          <p>You will continue to have access until the end of your current billing period.</p>
          <p>We're sorry to see you go! You can reactivate anytime from your billing settings.</p>
        `,
        ctaButton: { text: 'View Billing', url: `${appUrl}/settings?tab=billing` },
      }),
      text: 'Your subscription has been canceled. You have access until the end of your billing period.',
    }),

    subscription_renewed: () => {
      const formatAmount = (amount?: number, currency?: string): string => {
        if (!amount) return '';
        const dollars = amount / 100;
        return `$${dollars.toFixed(2)} ${(currency || 'USD').toUpperCase()}`;
      };
      return {
        subject: `[Notification] Subscription Renewed`,
        html: createEmailHtml({
          bodyContent: `
            <p>Your subscription has been renewed successfully.</p>
            ${data.amount ? `<p>Amount charged: <strong>${formatAmount(data.amount, data.currency)}</strong></p>` : ''}
            <p>Thank you for your continued support!</p>
          `,
          ctaButton: { text: 'View Billing', url: `${appUrl}/settings?tab=billing` },
        }),
        text: data.amount ? `Your subscription has been renewed. Amount charged: ${formatAmount(data.amount, data.currency)}.` : 'Your subscription has been renewed.',
      };
    },

    seat_count_changed: () => ({
      subject: `[Notification] Team Seat Count Updated`,
      html: createEmailHtml({
        bodyContent: `
          <p>Your team seat count has been updated.</p>
          ${data.oldSeatCount !== undefined && data.newSeatCount !== undefined
            ? `<p>Changed from <strong>${data.oldSeatCount}</strong> to <strong>${data.newSeatCount}</strong> seats.</p>`
            : '<p>Your billing will be adjusted accordingly.</p>'
          }
        `,
        ctaButton: { text: 'View Billing', url: `${appUrl}/settings?tab=billing` },
      }),
      text: data.oldSeatCount !== undefined && data.newSeatCount !== undefined
        ? `Your team size changed from ${data.oldSeatCount} to ${data.newSeatCount} seats.`
        : 'Your team seat count has been updated.',
    }),
  };

  return templates[notificationType]();
}

// Create HTML email template - Simple box design
function createEmailHtml(params: {
  bodyContent: string;
  ctaButton?: { text: string; url: string };
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; }
          .logo-section { padding: 24px 30px 16px 30px; border-bottom: 1px solid #eee; }
          .logo { font-size: 22px; font-weight: 700; color: #EE6C4D; margin: 0; }
          .content { padding: 24px 30px; }
          .content p { margin: 0 0 12px 0; }
          .content p:last-child { margin-bottom: 0; }
          .button { display: inline-block; background-color: #EE6C4D; color: white !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; margin: 20px 0 8px 0; }
          .button:hover { background-color: #d85a3d; }
          .footer { padding: 20px 30px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; }
          .footer a { color: #EE6C4D; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo-section">
            <p class="logo">Qwohter</p>
          </div>
          <div class="content">
            ${params.bodyContent}
            ${params.ctaButton ? `
              <div style="margin-top: 20px;">
                <a href="${params.ctaButton.url}" class="button" style="color: white !important;">${params.ctaButton.text}</a>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p style="margin: 0 0 8px 0;">This notification was sent from <a href="https://www.qwohter.com">Qwohter</a></p>
            <p style="margin: 0;">
              <a href="https://www.qwohter.com/settings?tab=notifications">Manage notification preferences</a>
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
    const requestData: NotificationEmailRequest = await req.json();

    // Validate required fields
    if (!requestData.userId || !requestData.organizationId || !requestData.notificationType || !requestData.recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's notification preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', requestData.userId)
      .eq('organization_id', requestData.organizationId)
      .single();

    // Check if email is enabled globally
    if (preferences && !preferences.email_enabled) {
      return new Response(
        JSON.stringify({ success: true, message: 'Email notifications disabled by user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this specific notification type is enabled
    const preferenceField = preferenceFieldMap[requestData.notificationType];
    if (preferences && preferenceField && preferences[preferenceField] === false) {
      return new Response(
        JSON.stringify({ success: true, message: 'This notification type is disabled by user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate email content
    const emailContent = generateEmailContent(requestData.notificationType, requestData.data, appUrl);

    // Determine recipient email (custom notification_email or default)
    const recipientEmail = preferences?.notification_email || requestData.recipientEmail;

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

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);

      // Queue for retry
      await supabase
        .from('notification_retry_queue')
        .insert({
          user_id: requestData.userId,
          organization_id: requestData.organizationId,
          channel: 'email',
          notification_type: requestData.notificationType,
          subject: emailContent.subject,
          body_html: emailContent.html,
          body_text: emailContent.text,
          metadata: requestData.data,
          status: 'Pending',
          last_error: JSON.stringify(resendData),
          next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Retry in 5 min
        });

      return new Response(
        JSON.stringify({ success: true, message: 'Failed to send, queued for retry' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Notification email sent successfully:', resendData);

    return new Response(
      JSON.stringify({ success: true, emailId: resendData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-notification-email:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
