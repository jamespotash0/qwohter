/**
 * Signature Reminders Edge Function
 *
 * Sends reminder emails for unsigned proposals based on the reminder
 * configuration set when the signing request was created.
 *
 * Checks for signing tokens that:
 * - Are still pending/viewed (not yet signed)
 * - Have reminder_config with enabled: true
 * - Are past their reminder interval
 * - Haven't exceeded max reminders (default 3)
 * - Haven't expired
 *
 * Triggered via pg_cron every hour.
 */

// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

// @ts-ignore
serve(async (req) => {
  console.log('[signature-reminders] Processing...');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // @ts-ignore
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    // @ts-ignore
    const appUrl = Deno.env.get('APP_URL') || 'https://www.qwohter.com';

    if (!resendApiKey) {
      console.log('[signature-reminders] No RESEND_API_KEY configured, skipping');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'No email service' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Query tokens that might need reminders
    // Filter: pending/viewed status, has reminder_config, not null
    const { data: tokens, error } = await supabase
      .from('proposal_signing_tokens')
      .select(`
        id, access_token, organization_id, proposal_id,
        client_email, client_name, client_company,
        reminder_config, reminder_count, last_reminder_sent_at,
        sent_at, expires_at
      `)
      .in('status', ['Pending', 'Viewed'])
      .not('reminder_config', 'is', null);

    if (error) {
      console.error('[signature-reminders] Query error:', error);
      throw error;
    }

    if (!tokens || tokens.length === 0) {
      console.log('[signature-reminders] No tokens with reminders configured');
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sent = 0;
    let skipped = 0;
    const now = new Date();

    for (const token of tokens) {
      const config = token.reminder_config;
      if (!config?.enabled) { skipped++; continue; }

      const maxReminders = config.maxReminders || 3;
      const intervalDays = config.intervalDays || 3;
      const currentCount = token.reminder_count || 0;

      // Check max reminders reached
      if (currentCount >= maxReminders) { skipped++; continue; }

      // Check if expired
      if (token.expires_at && new Date(token.expires_at) < now) { skipped++; continue; }

      // Check if enough time has passed since last action
      const lastAction = token.last_reminder_sent_at || token.sent_at;
      if (!lastAction) { skipped++; continue; }

      const nextReminderDue = new Date(
        new Date(lastAction).getTime() + intervalDays * 24 * 60 * 60 * 1000
      );
      if (now < nextReminderDue) { skipped++; continue; }

      // Get proposal and org info for the email
      const { data: proposal } = await supabase
        .from('proposals')
        .select('proposal_number, project_name')
        .eq('id', token.proposal_id)
        .single();

      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', token.organization_id)
        .single();

      const signingUrl = `${appUrl}/sign/${token.access_token}`;
      const orgName = org?.name || 'Your contractor';
      const clientName = token.client_name || 'there';
      const proposalLabel = proposal?.proposal_number || 'Proposal';
      const projectLabel = proposal?.project_name || '';
      const reminderNumber = currentCount + 1;

      console.log(`[signature-reminders] Sending reminder #${reminderNumber} for token ${token.id}`);

      // Send reminder email via Resend
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${escapeHtml(orgName)} via Qwohter <noreply@qwohter.com>`,
            to: [token.client_email],
            subject: `Reminder: Please sign ${proposalLabel}${projectLabel ? ` - ${projectLabel}` : ''}`,
            html: `
              <!DOCTYPE html>
              <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                <h2 style="color: #1a1a1a; margin-bottom: 16px;">Signature Reminder</h2>
                <p>Hi ${escapeHtml(clientName)},</p>
                <p>This is a friendly reminder that <strong>${escapeHtml(orgName)}</strong> is awaiting your signature on <strong>${escapeHtml(proposalLabel)}</strong>${projectLabel ? ` for <strong>${escapeHtml(projectLabel)}</strong>` : ''}.</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${signingUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Review &amp; Sign Proposal
                  </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                  Or copy this link: <a href="${signingUrl}" style="color: #2563eb;">${signingUrl}</a>
                </p>
                <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
                <p style="color: #999; font-size: 12px;">Automated reminder from Qwohter.</p>
              </body>
              </html>
            `,
          }),
        });

        if (response.ok) {
          // Update token with reminder tracking
          await supabase
            .from('proposal_signing_tokens')
            .update({
              last_reminder_sent_at: now.toISOString(),
              reminder_count: reminderNumber,
            })
            .eq('id', token.id);

          // Log activity
          await supabase.from('proposal_signing_activity').insert({
            organization_id: token.organization_id,
            proposal_id: token.proposal_id,
            signing_token_id: token.id,
            event_type: 'Reminder',
            event_data: { reminder_number: reminderNumber },
          });

          sent++;
          console.log(`[signature-reminders] Reminder #${reminderNumber} sent to ${token.client_email}`);
        } else {
          const errorText = await response.text();
          console.error(`[signature-reminders] Email failed for token ${token.id}:`, errorText);
          skipped++;
        }
      } catch (emailError) {
        console.error(`[signature-reminders] Email error for token ${token.id}:`, emailError);
        skipped++;
      }
    }

    console.log(`[signature-reminders] Done. Sent: ${sent}, Skipped: ${skipped}, Total: ${tokens.length}`);

    return new Response(
      JSON.stringify({ success: true, sent, skipped, total: tokens.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[signature-reminders] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
