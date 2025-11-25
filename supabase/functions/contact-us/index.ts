//@ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ContactUsData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
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
    // Get Resend API key from environment
    //@ts-ignore
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

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
    const requestData: ContactUsData = await req.json();

    // Validate required fields
    if (!requestData.firstName || !requestData.lastName || !requestData.email || !requestData.phone || !requestData.message) {
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

    // Prepare email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #EE6C4D; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #555; }
            .value { color: #333; margin-top: 5px; }
            .message-box { background-color: white; padding: 15px; border-radius: 4px; border-left: 4px solid #EE6C4D; margin-top: 5px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd; font-size: 12px; color: #777; }
            .tag { display: inline-block; background-color: #EE6C4D; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-bottom: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">New Contact Form Submission</h1>
            </div>
            <div class="content">
              <span class="tag">CONTACT US</span>

              <div class="field">
                <div class="label">Name:</div>
                <div class="value">${requestData.firstName} ${requestData.lastName}</div>
              </div>

              <div class="field">
                <div class="label">Email:</div>
                <div class="value"><a href="mailto:${requestData.email}">${requestData.email}</a></div>
              </div>

              <div class="field">
                <div class="label">Phone:</div>
                <div class="value"><a href="tel:${requestData.phone}">${requestData.phone}</a></div>
              </div>

              <div class="field">
                <div class="label">Message:</div>
                <div class="message-box">${requestData.message.replace(/\n/g, '<br>')}</div>
              </div>

              <div class="footer">
                <p>This message was submitted from the Qwohter Contact Us page.</p>
                <p><strong>Response Time:</strong> We aim to respond within 24 hours</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Qwohter Contact <onboarding@resend.dev>', // Change to 'contact@qwohter.com' after domain verification
        to: ['james.potash0@gmail.com'], // Change to contact/support email
        reply_to: requestData.email,
        subject: `Contact Form: Message from ${requestData.firstName} ${requestData.lastName}`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: resendData }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Email sent successfully:', resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Contact form submitted successfully',
        emailId: resendData.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in contact-sales function:', error);

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
