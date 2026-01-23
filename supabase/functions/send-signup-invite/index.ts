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

interface SignupInviteData {
  email: string;
  inviteToken: string;
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

    // Verify user is a super admin (check profiles table for is_super_admin flag)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Super admin access required.' }),
        {
          status: 403,
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
    const requestData: SignupInviteData = await req.json();

    // Validate required fields
    if (!requestData.email || !requestData.inviteToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email and inviteToken' }),
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

    // Create signup URL - use frontend-provided URL for dev, otherwise default
    const appUrl = requestData.appUrl || defaultAppUrl;
    const signupUrl = `${appUrl}/create-account?appinvite=${requestData.inviteToken}`;

    // Prepare email content - clean, minimal design
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .wrapper { padding: 40px 20px; }
            .container { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
            .content { padding: 40px 32px; text-align: center; }
            .logo { font-size: 24px; font-weight: 600; color: #171717; margin-bottom: 32px; }
            .message { font-size: 16px; color: #171717; margin-bottom: 32px; line-height: 1.6; }
            .button { display: inline-block; background-color: #EE6C4D; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; }
            .button:hover { background-color: #d85a3d; }
            .footer { padding: 24px 32px; font-size: 12px; color: #888; border-top: 1px solid #f0f0f0; text-align: center; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="content">
                <div class="logo">Qwohter</div>

                <p class="message">
                  You have been invited to Sign Up for Qwohter and create your account today.
                </p>

                <a href="${signupUrl}" class="button">Create Your Account</a>
              </div>

              <div class="footer">
                <p style="margin: 0 0 8px 0;">Sent to ${escapeHtml(requestData.email)}</p>
                <p style="margin: 0;">If you didn't expect this invitation, you can ignore it.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Prepare plain text version for email clients that don't support HTML
    const emailText = `
You have been invited to Sign Up for Qwohter and create your account today.

Create your account: ${signupUrl}

Sent to ${requestData.email}
    `.trim();

    // Send email using Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Qwohter <invites@qwohter.com>',
        to: [requestData.email],
        subject: 'Qwohter Sign-up Link',
        html: emailHtml,
        text: emailText,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);

      // Track email error in the signup_invites table
      await supabase
        .from('signup_invites')
        .update({
          email_error: resendData.message || 'Failed to send email',
          updated_at: new Date().toISOString(),
        })
        .eq('token', requestData.inviteToken);

      return new Response(
        JSON.stringify({ error: 'Failed to send invitation email', details: resendData }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Track successful email send in the signup_invites table
    await supabase
      .from('signup_invites')
      .update({
        email_sent_at: new Date().toISOString(),
        email_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('token', requestData.inviteToken);

    console.log('Signup invitation email sent successfully:', resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Signup invitation sent successfully',
        emailId: resendData.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in send-signup-invite function:', error);

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
