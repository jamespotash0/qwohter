//@ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface InviteData {
  email: string;
  organizationName: string;
  organizationId: string;
  inviteToken: string;
  inviterName: string;
  role: 'Admin' | 'Member';
}

//@ts-ignore
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
    //@ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    //@ts-ignore
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
    //@ts-ignore
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    //@ts-ignore
    const appUrl = Deno.env.get('APP_URL') || 'https://app.qwohter.com';

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

    // Create invite URL
    const inviteUrl = `${appUrl}/create-account?invite=${requestData.inviteToken}`;

    // Prepare email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #EE6C4D 0%, #d85a3d 100%); color: white; padding: 40px 30px; text-align: center; }
            .logo { font-size: 32px; font-weight: bold; margin: 0; }
            .content { background-color: #ffffff; padding: 40px 30px; }
            .invite-box { background: linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%); border: 2px solid #e9ecef; border-radius: 8px; padding: 30px; margin: 30px 0; text-align: center; }
            .button { display: inline-block; background-color: #EE6C4D; color: white; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 20px 0; }
            .button:hover { background-color: #d85a3d; }
            .info-row { margin: 15px 0; padding: 12px; background-color: #f8f9fa; border-radius: 4px; }
            .label { font-weight: 600; color: #555; display: inline-block; min-width: 100px; }
            .value { color: #333; }
            .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 14px; color: #6c757d; border-top: 1px solid #e9ecef; }
            .footer a { color: #EE6C4D; text-decoration: none; }
            .expiry { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; border-radius: 4px; font-size: 14px; }
            .greeting { font-size: 18px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="logo">Qwohter</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Team Invitation</p>
            </div>

            <div class="content">
              <div class="greeting">
                <strong>${requestData.inviterName}</strong> has invited you to join their team!
              </div>

              <div class="invite-box">
                <h2 style="margin: 0 0 20px 0; color: #333;">Join ${requestData.organizationName}</h2>

                <div class="info-row">
                  <span class="label">Organization:</span>
                  <span class="value">${requestData.organizationName}</span>
                </div>

                <div class="info-row">
                  <span class="label">Your Role:</span>
                  <span class="value">${requestData.role}</span>
                </div>

                <div class="info-row">
                  <span class="label">Invited By:</span>
                  <span class="value">${requestData.inviterName}</span>
                </div>

                <a href="${inviteUrl}" class="button">Accept Invitation</a>

                <div class="expiry">
                  ⏱️ This invitation expires in 7 days
                </div>
              </div>

              <h3 style="color: #333; margin-top: 30px;">What is Qwohter?</h3>
              <p style="color: #555; line-height: 1.8;">
                Qwohter is a professional quote management platform that helps teams create, track, and manage quotes efficiently.
                You'll have access to powerful tools for creating beautiful quotes, tracking analytics, and collaborating with your team.
              </p>

              <p style="color: #555; margin-top: 20px;">
                If you have any questions or need assistance, feel free to reach out to your team admin or contact our support team.
              </p>
            </div>

            <div class="footer">
              <p>This invitation was sent to <strong>${requestData.email}</strong></p>
              <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
              <p style="margin-top: 20px;">
                <a href="${appUrl}">Visit Qwohter</a> •
                <a href="mailto:support@qwohter.com">Contact Support</a>
              </p>
              <p style="margin-top: 20px; font-size: 12px; color: #adb5bd;">
                © ${new Date().getFullYear()} Qwohter. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Prepare plain text version for email clients that don't support HTML
    const emailText = `
${requestData.inviterName} has invited you to join ${requestData.organizationName} on Qwohter

Your Role: ${requestData.role}
Invited By: ${requestData.inviterName}

Accept your invitation by clicking the link below:
${inviteUrl}

This invitation expires in 7 days.

What is Qwohter?
Qwohter is a professional quote management platform that helps teams create, track, and manage quotes efficiently.

If you have any questions, contact your team admin or reach out to our support team.

This invitation was sent to ${requestData.email}
If you weren't expecting this invitation, you can safely ignore this email.
    `;

    // Send email using Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Qwohter Team <invites@qwohter.com>', // Update after domain verification
        to: [requestData.email],
        subject: `${requestData.inviterName} invited you to join ${requestData.organizationName} on Qwohter`,
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
