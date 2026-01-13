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

type NotificationType =
  | 'signature_sent'
  | 'signature_viewed'
  | 'signature_signed'
  | 'proposal_submitted'
  | 'proposal_won'
  | 'proposal_rejected'
  | 'task_assigned'
  | 'update_mention';

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
  task_assigned: 'email_on_task_assigned',
  update_mention: 'email_on_mention',
};

// Generate email content based on notification type
function generateEmailContent(
  notificationType: NotificationType,
  data: NotificationEmailRequest['data'],
  appUrl: string
): { subject: string; html: string; text: string } {
  const templates: Record<NotificationType, () => { subject: string; html: string; text: string }> = {
    signature_sent: () => ({
      subject: `[Notification] Signature Request Sent - ${data.proposalNumber || 'Proposal'}`,
      html: createEmailHtml({
        bodyContent: `
          <p>Your document <strong>${data.proposalNumber || 'proposal'}</strong> has been sent to <strong>${data.signerEmail}</strong> for signature.</p>
          <p>You'll be notified when they view or sign the document.</p>
        `,
        ctaButton: data.link ? { text: 'View Proposal', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `Signature request sent for ${data.proposalNumber || 'your proposal'} to ${data.signerEmail}.`,
    }),

    signature_viewed: () => ({
      subject: `[Notification] ${data.proposalNumber || 'Proposal'} Viewed`,
      html: createEmailHtml({
        bodyContent: `
          <p><strong>${data.signerName || 'Your client'}</strong> has opened and viewed your document <strong>${data.proposalNumber}</strong>.</p>
          <p>They may sign it soon!</p>
        `,
        ctaButton: data.link ? { text: 'View Proposal', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `${data.signerName || 'Client'} has viewed ${data.proposalNumber || 'your proposal'}.`,
    }),

    signature_signed: () => ({
      subject: `[Notification] ${data.proposalNumber || 'Proposal'} Signed`,
      html: createEmailHtml({
        bodyContent: `
          <p>Great news! <strong>${data.signerName || 'Your client'}</strong> (${data.signerEmail}) has signed your document <strong>${data.proposalNumber}</strong>.</p>
          <p>The signed copy is now available in your dashboard.</p>
        `,
        ctaButton: data.link ? { text: 'View Signed Document', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `${data.signerName || 'Client'} has signed ${data.proposalNumber || 'your proposal'}!`,
    }),

    proposal_submitted: () => ({
      subject: `[Notification] ${data.proposalNumber || 'Proposal'} Submitted`,
      html: createEmailHtml({
        bodyContent: `
          <p>Proposal <strong>${data.proposalNumber}</strong> ${data.proposalName ? `(${data.proposalName})` : ''} has been submitted.</p>
        `,
        ctaButton: data.link ? { text: 'View Proposal', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `Proposal ${data.proposalNumber} has been submitted.`,
    }),

    proposal_won: () => ({
      subject: `[Notification] ${data.proposalNumber || 'Proposal'} Won`,
      html: createEmailHtml({
        bodyContent: `
          <p>Congratulations! Proposal <strong>${data.proposalNumber}</strong> ${data.proposalName ? `(${data.proposalName})` : ''} has been marked as won!</p>
        `,
        ctaButton: data.link ? { text: 'View Proposal', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `Congratulations! Proposal ${data.proposalNumber} has been won!`,
    }),

    proposal_rejected: () => ({
      subject: `[Notification] ${data.proposalNumber || 'Proposal'} Rejected`,
      html: createEmailHtml({
        bodyContent: `
          <p>Proposal <strong>${data.proposalNumber}</strong> ${data.proposalName ? `(${data.proposalName})` : ''} has been marked as rejected.</p>
        `,
        ctaButton: data.link ? { text: 'View Proposal', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `Proposal ${data.proposalNumber} has been rejected.`,
    }),

    task_assigned: () => ({
      subject: `[Notification] Task Assigned - ${data.taskTitle || 'New Task'}`,
      html: createEmailHtml({
        bodyContent: `
          <p><strong>${data.actorName || 'A team member'}</strong> assigned you a task:</p>
          <p style="padding: 12px; background: #f3f4f6; border-radius: 6px;"><strong>${data.taskTitle}</strong></p>
          ${data.projectName ? `<p>Project: ${data.projectName}</p>` : ''}
        `,
        ctaButton: data.link ? { text: 'View Task', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `${data.actorName || 'A team member'} assigned you a task: ${data.taskTitle}`,
    }),

    update_mention: () => ({
      subject: `[Notification] You Were Mentioned`,
      html: createEmailHtml({
        bodyContent: `
          <p><strong>${data.mentionedBy || 'A team member'}</strong> mentioned you in a comment:</p>
          ${data.commentPreview ? `<p style="padding: 12px; background: #f3f4f6; border-radius: 6px; font-style: italic;">"${data.commentPreview}"</p>` : ''}
        `,
        ctaButton: data.link ? { text: 'View Comment', url: `${appUrl}${data.link}` } : undefined,
      }),
      text: `${data.mentionedBy || 'Someone'} mentioned you in a comment.`,
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

    // Check digest mode
    const digestMode = preferences?.digest_mode || 'instant';

    if (digestMode === 'daily') {
      // Queue for digest
      const { error: queueError } = await supabase
        .from('email_notification_queue')
        .insert({
          user_id: requestData.userId,
          organization_id: requestData.organizationId,
          notification_type: requestData.notificationType,
          subject: emailContent.subject,
          body_html: emailContent.html,
          body_text: emailContent.text,
          metadata: requestData.data,
          status: 'pending',
        });

      if (queueError) {
        console.error('Failed to queue notification:', queueError);
        throw queueError;
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Notification queued for digest' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: resendData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
