/**
 * Send For Signature Edge Function
 *
 * Creates a signing token, exports the proposal as PDF, and sends
 * an email to the client with a signing link.
 *
 * Flow:
 * 1. Validate user is admin/owner of organization
 * 2. Get proposal data and Google Doc ID
 * 3. Export Google Doc as PDF (calls export-proposal-pdf internally)
 * 4. Create signing token in database
 * 5. Send email with signing link to client
 * 6. Log activity
 */
//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Escape HTML special characters to prevent XSS/injection
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize error messages to prevent information disclosure
 * Returns user-friendly messages without exposing system details
 */
function sanitizeErrorMessage(error: unknown): { message: string; needsAuth: boolean } {
  if (!(error instanceof Error)) {
    return { message: 'An unexpected error occurred', needsAuth: false };
  }

  const rawMessage = error.message;

  // Check if this is an auth-related error
  const needsAuth = rawMessage.includes('connect') ||
                    rawMessage.includes('reconnect') ||
                    rawMessage.includes('expired');

  // Map specific error patterns to user-friendly messages
  if (rawMessage.includes('Google Doc not found')) {
    return { message: 'The associated document could not be found. Please regenerate the document.', needsAuth: false };
  }
  if (rawMessage.includes('Access denied')) {
    return { message: 'Access to the document was denied. Please check permissions.', needsAuth: false };
  }
  if (rawMessage.includes('Google Docs not configured')) {
    return { message: 'Google Docs is not configured. An admin needs to connect Google in Settings.', needsAuth: true };
  }
  if (rawMessage.includes('connection expired') || rawMessage.includes('reconnect')) {
    return { message: 'Google connection expired. Please reconnect in Settings.', needsAuth: true };
  }
  if (rawMessage.includes('refresh') && rawMessage.includes('token')) {
    return { message: 'Authentication expired. Please reconnect Google in Settings.', needsAuth: true };
  }

  // Default: return a generic message (don't expose internal details like stack traces)
  return { message: 'Failed to send for signature. Please try again.', needsAuth };
}

interface RequestBody {
  proposalId: string;
  organizationId: string;
  clientEmail: string;
  clientName?: string;
  clientCompany?: string;
  expiresInDays?: number;
  /** Custom email subject */
  emailSubject?: string;
  /** Custom email body */
  emailBody?: string;
  /** App URL for signing link (passed from frontend for localhost support) */
  appUrl?: string;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Get a valid access token for the organization, refreshing if expired
 */
async function getOrgAccessToken(
  supabaseAdmin: ReturnType<typeof createClient>,
  organizationId: string
): Promise<string> {
  console.log(`[getOrgAccessToken] Looking up token for org: ${organizationId}`);

  // Get token without filtering by is_valid - we'll try to refresh if invalid
  const { data: tokenData, error: tokenError } = await supabaseAdmin
    .from('google_oauth_tokens')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (tokenError || !tokenData) {
    throw new Error('Google Docs not configured. An admin needs to connect Google in Settings.');
  }

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(tokenData.token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;
  const isExpired = expiresAt.getTime() - bufferMs <= now.getTime();

  // Only use cached token if it's valid AND not expired
  if (tokenData.is_valid && !isExpired) {
    // Token still valid
    await supabaseAdmin
      .from('google_oauth_tokens')
      .update({ last_used_at: now.toISOString() })
      .eq('id', tokenData.id);

    return tokenData.access_token;
  }

  // Token expired or marked as invalid, try to refresh it
  console.log(`[getOrgAccessToken] Token needs refresh - is_valid: ${tokenData.is_valid}, isExpired: ${isExpired}`);
  //@ts-ignore
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  //@ts-ignore
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth not configured on server');
  }

  if (!tokenData.refresh_token) {
    await supabaseAdmin
      .from('google_oauth_tokens')
      .update({ is_valid: false })
      .eq('id', tokenData.id);

    throw new Error('Google connection expired. An admin needs to reconnect in Settings.');
  }

  console.log('[getOrgAccessToken] Token expired, refreshing...');

  const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokenData.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!refreshResponse.ok) {
    const error = await refreshResponse.text();
    console.error('[getOrgAccessToken] Refresh failed:', error);

    if (error.includes('invalid_grant') || error.includes('Token has been revoked')) {
      await supabaseAdmin
        .from('google_oauth_tokens')
        .update({ is_valid: false })
        .eq('id', tokenData.id);

      throw new Error('Google connection expired. An admin needs to reconnect in Settings.');
    }

    throw new Error('Failed to refresh Google token. Please try again.');
  }

  const newTokens: GoogleTokenResponse = await refreshResponse.json();
  const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

  // Update tokens in database - also set is_valid: true since refresh succeeded
  await supabaseAdmin
    .from('google_oauth_tokens')
    .update({
      access_token: newTokens.access_token,
      token_expires_at: newExpiresAt,
      last_used_at: new Date().toISOString(),
      is_valid: true, // Mark as valid after successful refresh
    })
    .eq('id', tokenData.id);

  console.log('[getOrgAccessToken] Token refreshed successfully');
  return newTokens.access_token;
}

/**
 * Export a Google Doc as PDF
 * Handles the new Google Docs tabs feature by exporting with includeTabsContent=false
 */
async function exportGoogleDocAsPdf(
  accessToken: string,
  docId: string
): Promise<Uint8Array> {
  console.log(`[exportGoogleDocAsPdf] Exporting doc ${docId} as PDF...`);

  // First, get the document to find the first tab ID (for docs with tabs)
  let tabId: string | null = null;
  try {
    const docsResponse = await fetch(
      `https://docs.googleapis.com/v1/documents/${docId}?includeTabsContent=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (docsResponse.ok) {
      const docData = await docsResponse.json();
      // Get the first tab ID if tabs exist
      if (docData.tabs && docData.tabs.length > 0) {
        tabId = docData.tabs[0].tabProperties?.tabId;
        console.log(`[exportGoogleDocAsPdf] Found tab ID: ${tabId}`);
      }
    }
  } catch (e) {
    console.log('[exportGoogleDocAsPdf] Could not get tab info, using default export');
  }

  // Try export with tab parameter if we have a tab ID
  let response: Response;

  if (tabId) {
    // Export specific tab using the download URL with tab parameter
    const tabExportUrl = `https://docs.google.com/document/d/${docId}/export?format=pdf&tab=${tabId}`;
    console.log(`[exportGoogleDocAsPdf] Trying tab-specific export...`);

    response = await fetch(tabExportUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      redirect: 'follow',
    });
  } else {
    // No tabs, use standard Drive API export
    response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=application/pdf`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  }

  // If tab export failed, fallback to Drive API
  if (!response.ok && tabId) {
    console.log('[exportGoogleDocAsPdf] Tab export failed, trying Drive API...');
    response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=application/pdf`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[exportGoogleDocAsPdf] Export failed:', errorText);

    if (response.status === 404) {
      throw new Error('Google Doc not found. Make sure the document still exists.');
    }
    if (response.status === 403) {
      throw new Error('Access denied to Google Doc. Check permissions.');
    }

    throw new Error(`Failed to export PDF: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  console.log(`[exportGoogleDocAsPdf] PDF exported, size: ${arrayBuffer.byteLength} bytes`);

  return new Uint8Array(arrayBuffer);
}

/**
 * Upload PDF to Supabase Storage
 * Each signing request creates a unique PDF file with timestamp
 */
async function uploadPdfToStorage(
  supabaseAdmin: ReturnType<typeof createClient>,
  organizationId: string,
  proposalId: string,
  proposalNumber: string,
  pdfBytes: Uint8Array
): Promise<{ url: string; path: string }> {
  // Create unique filename with proposal number and timestamp
  // Format: P-001_unsigned_2024-01-15_103045.pdf
  const timestamp = new Date().toISOString()
    .replace(/:/g, '')      // Remove colons (invalid in some systems)
    .replace(/\.\d{3}Z$/, '') // Remove milliseconds
    .replace('T', '_');     // Replace T with underscore

  const safeProposalNumber = (proposalNumber || 'proposal').replace(/[^a-zA-Z0-9-]/g, '_');
  const filename = `${safeProposalNumber}_unsigned_${timestamp}.pdf`;
  const storagePath = `${organizationId}/proposals/${proposalId}/${filename}`;

  console.log(`[uploadPdfToStorage] Uploading to: ${storagePath}`);

  // Upload to storage (no upsert - each signing request creates new file)
  const { error: uploadError } = await supabaseAdmin.storage
    .from('proposal-documents')
    .upload(storagePath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    console.error('[uploadPdfToStorage] Upload failed:', uploadError);
    throw new Error(`Failed to upload PDF: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabaseAdmin.storage
    .from('proposal-documents')
    .getPublicUrl(storagePath);

  console.log(`[uploadPdfToStorage] Upload complete, URL: ${urlData.publicUrl}`);

  return {
    url: urlData.publicUrl,
    path: storagePath,
  };
}

/**
 * Send signing request email
 */
async function sendSigningEmail(params: {
  resendApiKey: string;
  to: string;
  clientName: string | undefined;
  proposalNumber: string;
  projectName: string;
  organizationName: string;
  signingUrl: string;
  customSubject?: string;
  customBody?: string;
}): Promise<void> {
  const {
    resendApiKey,
    to,
    clientName,
    proposalNumber,
    projectName,
    organizationName,
    signingUrl,
    customSubject,
    customBody,
  } = params;

  console.log(`[sendSigningEmail] Sending to: ${to}`);

  const displayName = clientName || 'there';

  // Email appears from the organization, reply goes to Qwohter
  const fromAddress = `${organizationName} via Qwohter <noreply@qwohter.com>`;

  // Use custom subject or default (escape HTML in custom subject)
  const subject = customSubject
    ? escapeHtml(customSubject)
    : `Please sign: ${escapeHtml(proposalNumber)} - ${escapeHtml(projectName)}`;

  // Convert custom body to HTML (escape HTML to prevent injection, then replace newlines)
  const bodyHtml = customBody
    ? escapeHtml(customBody).split('\n').map(line => `<p style="margin: 0 0 12px 0;">${line || '&nbsp;'}</p>`).join('')
    : `
      <p>Hi ${escapeHtml(displayName)},</p>

      <p><strong>${escapeHtml(organizationName)}</strong> has sent you a proposal for your review and signature.</p>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Proposal:</strong> ${escapeHtml(proposalNumber)}</p>
        <p style="margin: 0;"><strong>Project:</strong> ${escapeHtml(projectName)}</p>
      </div>

      <p>Please review the proposal and sign electronically by clicking the button below:</p>
    `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [to],
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Signature Requested</h2>

          ${bodyHtml}

          <a href="${signingUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0;">
            Review & Sign Proposal
          </a>

          <p style="color: #666; font-size: 14px; margin-top: 32px;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${signingUrl}" style="color: #2563eb;">${signingUrl}</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />

          <p style="color: #999; font-size: 12px;">
            This is an automated message from Qwohter. If you have questions about this proposal,
            please contact ${escapeHtml(organizationName)} directly.
          </p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[sendSigningEmail] Failed:', error);
    throw new Error('Failed to send signing email');
  }

  console.log('[sendSigningEmail] Email sent successfully');
}

//@ts-ignore
serve(async (req) => {
  console.log('[send-for-signature] Request received');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    //@ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    //@ts-ignore
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    //@ts-ignore
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    //@ts-ignore
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { proposalId, organizationId, clientEmail, clientName, clientCompany, expiresInDays, emailSubject, emailBody, appUrl: clientAppUrl } = body;

    if (!proposalId || !organizationId || !clientEmail) {
      return new Response(
        JSON.stringify({ error: 'proposalId, organizationId, and clientEmail are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get proposal data
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('id, google_doc_id, proposal_number, project_name, client_name, client_company')
      .eq('id', proposalId)
      .eq('organization_id', organizationId)
      .single();

    if (proposalError || !proposal) {
      return new Response(JSON.stringify({ error: 'Proposal not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!proposal.google_doc_id) {
      return new Response(
        JSON.stringify({ error: 'No Google Doc associated with this proposal. Generate a document first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get organization info for email (using admin client to bypass RLS)
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    console.log('[send-for-signature] Org lookup result:', { org, orgError });

    const organizationName = org?.name || 'Your contractor';

    // Export Google Doc as PDF
    console.log('[send-for-signature] Exporting Google Doc as PDF...');
    const accessToken = await getOrgAccessToken(supabaseAdmin, organizationId);
    const pdfBytes = await exportGoogleDocAsPdf(accessToken, proposal.google_doc_id);

    // Upload PDF to storage (unique filename per signing request)
    console.log('[send-for-signature] Uploading PDF to storage...');
    const { url: pdfUrl, path: pdfPath } = await uploadPdfToStorage(
      supabaseAdmin,
      organizationId,
      proposalId,
      proposal.proposal_number || 'proposal',
      pdfBytes
    );

    // Calculate expiration
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Generate signing access token
    const signingAccessToken = crypto.randomUUID();

    // Create signing token
    console.log('[send-for-signature] Creating signing token...');
    const { data: signingToken, error: tokenError } = await supabaseAdmin
      .from('proposal_signing_tokens')
      .insert({
        organization_id: organizationId,
        proposal_id: proposalId,
        access_token: signingAccessToken,
        client_email: clientEmail,
        client_name: clientName || proposal.client_name,
        client_company: clientCompany || proposal.client_company,
        status: 'Pending',
        unsigned_pdf_url: pdfUrl,
        unsigned_pdf_path: pdfPath,
        expires_at: expiresAt,
        sent_by: user.id,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (tokenError || !signingToken) {
      console.error('[send-for-signature] Failed to create token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to create signing token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build signing URL (prefer client-provided URL for localhost support, fallback to env var)
    //@ts-ignore
    const appUrl = clientAppUrl || Deno.env.get('APP_URL') || 'https://www.qwohter.com';
    const signingUrl = `${appUrl}/sign/${signingToken.access_token}`;

    // Send email if Resend is configured
    let emailSent = false;
    let emailErrorMsg: string | null = null;

    if (resendApiKey) {
      console.log('[send-for-signature] Sending email...');
      try {
        await sendSigningEmail({
          resendApiKey,
          to: clientEmail,
          clientName: clientName || proposal.client_name,
          proposalNumber: proposal.proposal_number || 'Proposal',
          projectName: proposal.project_name || 'Your Project',
          organizationName,
          signingUrl,
          customSubject: emailSubject,
          customBody: emailBody,
        });
        emailSent = true;
      } catch (err) {
        console.error('[send-for-signature] Email failed:', err);
        emailErrorMsg = err instanceof Error ? err.message : 'Failed to send email';
        // Don't fail the whole request, just track the error
      }
    } else {
      console.log('[send-for-signature] No RESEND_API_KEY configured, skipping email');
      emailErrorMsg = 'Email service not configured';
    }

    // Log activity
    await supabaseAdmin.from('proposal_signing_activity').insert({
      organization_id: organizationId,
      proposal_id: proposalId,
      signing_token_id: signingToken.id,
      event_type: 'Sent',
      event_data: {
        sent_to: clientEmail,
        sent_by_user_id: user.id,
        custom_body: emailBody || null,
      },
    });

    // Send notification email to user (non-blocking)
    try {
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single();

      if (userProfile?.email) {
        // Call send-notification-email function
        const notificationUrl = `${supabaseUrl}/functions/v1/send-notification-email`;
        fetch(notificationUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            organizationId,
            notificationType: 'signature_sent',
            recipientEmail: userProfile.email,
            recipientName: userProfile.full_name || 'User',
            data: {
              proposalNumber: proposal.proposal_number,
              proposalName: proposal.project_name,
              signerEmail: clientEmail,
              signerName: clientName || proposal.client_name,
              link: `/proposals/${proposalId}`,
            },
          }),
        }).catch(err => console.error('[send-for-signature] Notification error:', err));
      }
    } catch (notifError) {
      console.error('[send-for-signature] Failed to send notification:', notifError);
      // Don't fail the request for notification errors
    }

    console.log('[send-for-signature] Success!');

    return new Response(
      JSON.stringify({
        success: true,
        signingTokenId: signingToken.id,
        signingUrl,
        expiresAt,
        emailSent,
        emailError: emailErrorMsg,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    // Log the full error for debugging (server-side only)
    console.error('[send-for-signature] Error:', error);

    // Sanitize error message before sending to client (prevents information disclosure)
    const { message, needsAuth } = sanitizeErrorMessage(error);

    return new Response(
      JSON.stringify({
        error: message,
        needsAuth,
      }),
      {
        status: needsAuth ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
