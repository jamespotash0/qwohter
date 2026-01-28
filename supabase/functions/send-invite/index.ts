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

interface InviteData {
  email: string;
  organizationName: string;
  organizationId: string;
  inviteToken: string;
  inviterName: string;
  role: 'Admin' | 'Member';
  appUrl?: string; // Optional: passed from frontend for dev environment support
}

// @ts-ignore
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client to verify user
    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get Resend API key from environment
    // @ts-ignore
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    // @ts-ignore
    const defaultAppUrl = Deno.env.get('APP_URL') || 'https://www.qwohter.com';

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const requestData: InviteData = await req.json();

    // Validate required fields
    if (!requestData.email || !requestData.organizationName || !requestData.inviteToken || !requestData.inviterName || !requestData.role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requestData.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify user has permission to invite (must be Admin or Owner)
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', requestData.organizationId)
      .single();

    if (membershipError || !membership || !['Owner', 'Admin'].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions to send invitations' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create invite URL - use frontend-provided URL for dev, otherwise default
    const appUrl = requestData.appUrl || defaultAppUrl;
    const inviteUrl = `${appUrl}/create-account?invite=${requestData.inviteToken}`;

    // Prepare email content - clean, minimal design
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .wrapper { padding: 40px 20px; }
            .container { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
            .content { padding: 40px 32px; }
            .logo { font-size: 20px; font-weight: 600; color: #171717; margin-bottom: 32px; }
            .invite-box { background: #fafafa; border: 1px solid #e5e5e5; border-radius: 8px; padding: 24px; margin-bottom: 24px; }
            .inviter { font-size: 15px; color: #171717; margin-bottom: 4px; }
            .org-name { font-size: 18px; font-weight: 600; color: #171717; }
            .button { display: inline-block; background-color: #171717; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px; }
            .footer { padding: 24px 32px; font-size: 12px; color: #888; border-top: 1px solid #f0f0f0; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="content">
                <div class="logo">Qwohter</div>

                <div class="invite-box">
                  <p class="inviter">${escapeHtml(requestData.inviterName)} invited you to join</p>
                  <p class="org-name">${escapeHtml(requestData.organizationName)}</p>
                </div>

                <a href="${inviteUrl}" class="button">Accept Invitation</a>
              </div>

              <div class="footer">
                <p style="margin: 0 0 8px 0;">Sent to ${escapeHtml(requestData.email)}</p>
                <p style="margin: 0;">If you didn't expect this, you can ignore it.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Prepare plain text version for email clients that don't support HTML
    // Note: Plain text doesn't need HTML escaping, but we keep original values
    const emailText = `
${requestData.inviterName} invited you to join ${requestData.organizationName}

Accept your invitation: ${inviteUrl}

Sent to ${requestData.email}
    `;

    // Send email using Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Qwohter Team <invites@qwohter.com>',
        to: [requestData.email],
        subject: `Join ${escapeHtml(requestData.organizationName)} on Qwohter`,
        html: emailHtml,
        text: emailText,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      return new Response(
        JSON.stringify({ error: 'Failed to send invitation email', details: resendData }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Invitation email sent successfully:', resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation sent successfully',
        emailId: resendData.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in send-invite function:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
