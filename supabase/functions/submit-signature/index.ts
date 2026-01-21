/**
 * Submit Signature Edge Function
 *
 * Embeds an e-signature into a proposal PDF and updates proposal status.
 * This is a PUBLIC endpoint - authentication is via signing token, not user auth.
 *
 * Flow:
 * 1. Validate signing token
 * 2. Fetch unsigned PDF from Supabase Storage
 * 3. Use pdf-lib to embed signature image + metadata
 * 4. Store signed PDF in Supabase Storage
 * 5. Update proposal status to "Won"
 * 6. Send email notifications to both parties
 */
//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
//@ts-ignore
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

interface RequestBody {
  token: string;              // Signing token for validation
  signatureData: string;      // Base64 PNG image of signature
  signatureType: 'draw' | 'type';
  signatureFont?: string;     // Font name if typed
  signerName: string;
  signerEmail: string;
  signerCompany?: string;
}

/**
 * Signature embedding mode
 * - 'page': Add a new signature page at the end (default - cleanest approach)
 * - 'overlay': Place signature at bottom of last page
 * - 'position': Place signature at specific coordinates
 */
type SignatureMode = 'page' | 'overlay' | 'position';

interface SignaturePosition {
  pageIndex: number;  // 0-based page index
  x: number;          // X coordinate from left
  y: number;          // Y coordinate from bottom
}

// ============================================================================
// Google Drive Integration
// ============================================================================

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Get a valid Google access token for the organization
 * Refreshes the token if expired
 */
async function getOrgGoogleAccessToken(
  supabaseAdmin: ReturnType<typeof createClient>,
  organizationId: string
): Promise<{ accessToken: string; folderId: string | null } | null> {
  console.log(`[getOrgGoogleAccessToken] Looking up token for org: ${organizationId}`);

  // Get org-level token from database (don't filter by is_valid - we'll try to refresh if invalid)
  const { data: tokenData, error: tokenError } = await supabaseAdmin
    .from('google_oauth_tokens')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (tokenError || !tokenData) {
    console.log('[getOrgGoogleAccessToken] No Google token found for organization');
    return null;
  }

  const folderId = tokenData.drive_folder_id;

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(tokenData.token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutes
  const isExpired = expiresAt.getTime() - bufferMs <= now.getTime();

  // Only use cached token if it's valid AND not expired
  if (tokenData.is_valid && !isExpired) {
    // Token is still valid
    await supabaseAdmin
      .from('google_oauth_tokens')
      .update({ last_used_at: now.toISOString() })
      .eq('id', tokenData.id);

    return { accessToken: tokenData.access_token, folderId };
  }

  // Token expired or marked as invalid, need to refresh
  console.log(`[getOrgGoogleAccessToken] Token needs refresh - is_valid: ${tokenData.is_valid}, isExpired: ${isExpired}`);
  //@ts-ignore
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  //@ts-ignore
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret || !tokenData.refresh_token) {
    console.log('[getOrgGoogleAccessToken] Cannot refresh token - missing credentials or refresh token');
    return null;
  }

  console.log('[getOrgGoogleAccessToken] Token expired, attempting refresh...');

  try {
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
      console.error('[getOrgGoogleAccessToken] Token refresh failed:', error);
      return null;
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

    console.log('[getOrgGoogleAccessToken] Token refreshed successfully');
    return { accessToken: newTokens.access_token, folderId };
  } catch (error) {
    console.error('[getOrgGoogleAccessToken] Token refresh error:', error);
    return null;
  }
}

/**
 * Get or create a proposal-specific folder in Google Drive
 * Folder name format: "{proposal_number}_{project_name}" or just "{proposal_number}"
 */
async function getOrCreateProposalFolder(
  accessToken: string,
  parentFolderId: string | null,
  proposalNumber: string,
  projectName: string | null
): Promise<string | null> {
  // Build folder name: "P-001_Project Name" or just "P-001"
  const sanitizedProject = projectName
    ? projectName.replace(/[<>:"/\\|?*]/g, '').trim().substring(0, 50)
    : null;
  const folderName = sanitizedProject
    ? `${proposalNumber}_${sanitizedProject}`
    : proposalNumber;

  console.log(`[getOrCreateProposalFolder] Looking for folder: ${folderName}`);

  try {
    // Search for existing folder with this name in parent
    const searchQuery = parentFolderId
      ? `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.files && searchData.files.length > 0) {
        console.log(`[getOrCreateProposalFolder] Found existing folder: ${searchData.files[0].id}`);
        return searchData.files[0].id;
      }
    }

    // Folder doesn't exist, create it
    console.log(`[getOrCreateProposalFolder] Creating new folder: ${folderName}`);

    const metadata: { name: string; mimeType: string; parents?: string[] } = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

    const createResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files?fields=id',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('[getOrCreateProposalFolder] Failed to create folder:', error);
      return null;
    }

    const createData = await createResponse.json();
    console.log(`[getOrCreateProposalFolder] Created folder: ${createData.id}`);
    return createData.id;
  } catch (error) {
    console.error('[getOrCreateProposalFolder] Error:', error);
    return null;
  }
}

/**
 * Upload a PDF file to Google Drive
 * Returns the Drive file URL if successful, null otherwise
 */
async function uploadSignedPdfToDrive(
  accessToken: string,
  folderId: string | null,
  pdfBytes: Uint8Array,
  fileName: string
): Promise<{ fileId: string; webViewLink: string } | null> {
  console.log(`[uploadSignedPdfToDrive] Uploading ${fileName} to Google Drive...`);

  try {
    // Create multipart upload with metadata and file content
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    // File metadata
    const metadata: { name: string; mimeType: string; parents?: string[] } = {
      name: fileName,
      mimeType: 'application/pdf',
    };

    if (folderId) {
      metadata.parents = [folderId];
    }

    // Build multipart body
    const metadataStr = JSON.stringify(metadata);
    const base64Data = btoa(String.fromCharCode(...pdfBytes));

    const requestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      metadataStr +
      delimiter +
      'Content-Type: application/pdf\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      base64Data +
      closeDelimiter;

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        body: requestBody,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[uploadSignedPdfToDrive] Upload failed:', error);
      return null;
    }

    const data = await response.json();
    console.log(`[uploadSignedPdfToDrive] Uploaded successfully: ${data.webViewLink}`);

    return {
      fileId: data.id,
      webViewLink: data.webViewLink,
    };
  } catch (error) {
    console.error('[uploadSignedPdfToDrive] Error:', error);
    return null;
  }
}

/**
 * Embed signature into PDF using pdf-lib
 *
 * Modes:
 * - 'page' (default): Adds a dedicated signature page at the end
 * - 'overlay': Places signature block at bottom of last page
 * - 'position': Places signature at exact coordinates (use with template markers)
 */
async function embedSignatureInPdf(
  pdfBytes: Uint8Array,
  signatureBase64: string,
  signerName: string,
  signerEmail: string,
  signedAt: Date,
  ipAddress: string,
  proposalNumber: string,
  projectName: string,
  mode: SignatureMode = 'page',
  position?: SignaturePosition
): Promise<Uint8Array> {
  console.log(`[embedSignatureInPdf] Loading PDF, mode: ${mode}...`);

  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Load fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Decode signature image (remove data URL prefix if present)
  const base64Data = signatureBase64.replace(/^data:image\/png;base64,/, '');
  const signatureImageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

  // Format date/time
  const dateStr = signedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = signedAt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  if (mode === 'page') {
    // === MODE: Add dedicated signature page ===
    await addSignaturePage(
      pdfDoc, signatureImage, helvetica, helveticaBold,
      signerName, signerEmail, dateStr, timeStr, ipAddress,
      proposalNumber, projectName
    );
  } else if (mode === 'overlay') {
    // === MODE: Overlay on last page ===
    // This overlays on the {{SIGNATURE_BLOCK}} placeholder that was inserted
    // during document generation. Position at bottom portion of page where
    // signature boxes are typically located.
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    await drawSignatureBlock(
      lastPage, signatureImage, helvetica, helveticaBold,
      signerName, dateStr, timeStr, ipAddress,
      72, 144  // 1 inch from left, 2 inches from bottom
    );
  } else if (mode === 'position' && position) {
    // === MODE: Exact position (default - places signature at specific coordinates) ===
    const pages = pdfDoc.getPages();
    // pageIndex -1 means last page, otherwise use the specified index
    const pageIdx = position.pageIndex < 0 ? pages.length - 1 : position.pageIndex;
    const targetPage = pages[pageIdx] || pages[pages.length - 1];
    await drawSignatureBlock(
      targetPage, signatureImage, helvetica, helveticaBold,
      signerName, dateStr, timeStr, ipAddress,
      position.x, position.y
    );
  }

  console.log('[embedSignatureInPdf] Signature embedded successfully');
  return await pdfDoc.save();
}

/**
 * Add a dedicated signature page at the end of the PDF
 * This is the cleanest approach - works regardless of template layout
 */
async function addSignaturePage(
  pdfDoc: any,
  signatureImage: any,
  helvetica: any,
  helveticaBold: any,
  signerName: string,
  _signerEmail: string,
  dateStr: string,
  timeStr: string,
  ipAddress: string,
  _proposalNumber: string,
  _projectName: string
): Promise<void> {
  // Add new page (letter size: 612 x 792 points)
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const margin = 72;  // 1 inch margins

  let y = height - margin;

  // Header
  page.drawText('PROPOSAL ACCEPTANCE', {
    x: margin,
    y,
    size: 18,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 30;

  // Divider line
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 40;

  // Acceptance text
  const acceptanceText = 'By signing below, I acknowledge that I have reviewed the above proposal ' +
    'and agree to the terms, conditions, and pricing stated therein. This electronic signature ' +
    'is legally binding and has the same effect as a handwritten signature.';

  // Word wrap the acceptance text
  const words = acceptanceText.split(' ');
  let line = '';
  const maxWidth = width - (margin * 2);

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    const textWidth = helvetica.widthOfTextAtSize(testLine, 10);

    if (textWidth > maxWidth && line) {
      page.drawText(line, {
        x: margin,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 16;
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) {
    page.drawText(line, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 16;
  }
  y -= 30;

  // Signature section
  page.drawText('SIGNATURE', {
    x: margin,
    y,
    size: 12,
    font: helveticaBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 25;

  // Signature image
  const sigWidth = 200;
  const sigHeight = 60;
  page.drawImage(signatureImage, {
    x: margin,
    y: y - sigHeight,
    width: sigWidth,
    height: sigHeight,
  });

  // Signature line
  page.drawLine({
    start: { x: margin, y: y - sigHeight - 5 },
    end: { x: margin + 250, y: y - sigHeight - 5 },
    thickness: 1,
    color: rgb(0.5, 0.5, 0.5),
  });
  y -= sigHeight + 25;

  // Signer details
  page.drawText(`Name: ${signerName}`, {
    x: margin,
    y,
    size: 11,
    font: helvetica,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 18;

  page.drawText(`Date: ${dateStr}`, {
    x: margin,
    y,
    size: 11,
    font: helvetica,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 18;

  page.drawText(`Time: ${timeStr}`, {
    x: margin,
    y,
    size: 11,
    font: helvetica,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 40;

  // Divider
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  });
  y -= 20;

  // Compliance footer
  page.drawText('Electronic Signature Record', {
    x: margin,
    y,
    size: 9,
    font: helveticaBold,
    color: rgb(0.5, 0.5, 0.5),
  });
  y -= 14;

  page.drawText(`IP Address: ${ipAddress}`, {
    x: margin,
    y,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });
  y -= 12;

  page.drawText('This document was signed electronically via Qwohter E-Signature.', {
    x: margin,
    y,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });
  y -= 12;

  page.drawText('Electronic signatures are legally binding under the ESIGN Act and UETA.', {
    x: margin,
    y,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });
}

/**
 * Draw signature at a specific position on a page
 * Used for position mode - places signature directly on existing "Signed By:_____" line
 *
 * The x,y coordinates should point to where the signature should start
 * (typically after the "Signed By:" text, on the underline)
 */
async function drawSignatureBlock(
  page: any,
  signatureImage: any,
  helvetica: any,
  _helveticaBold: any,  // Kept for API compatibility
  signerName: string,
  dateStr: string,
  timeStr: string,
  ipAddress: string,
  x: number,
  y: number
): Promise<void> {
  // Draw signature image directly at the specified position
  // No background - preserves existing "Signed By:" or "Signature:" text
  const sigWidth = 180;
  const sigHeight = 50;
  page.drawImage(signatureImage, {
    x,
    y: y - 10,  // Slight offset down to sit on the line
    width: sigWidth,
    height: sigHeight,
  });

  // Small compliance text below signature (nearly invisible but legally useful)
  page.drawText(`${signerName} | ${dateStr} ${timeStr} | ${ipAddress}`, {
    x,
    y: y - 18,
    size: 5,
    font: helvetica,
    color: rgb(0.7, 0.7, 0.7),
  });
}

/**
 * Send notification emails to org and client
 */
async function sendSignatureNotifications(
  resendApiKey: string,
  orgEmail: string,
  clientEmail: string,
  proposalNumber: string,
  projectName: string,
  signerName: string,
  signedPdfUrl: string
): Promise<void> {
  console.log('[sendSignatureNotifications] Sending emails...');

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; }
          .content { background-color: #ffffff; padding: 40px 30px; }
          .success-icon { font-size: 48px; margin-bottom: 15px; }
          .button { display: inline-block; background-color: #10b981; color: white !important; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 20px 0; }
          .info-box { background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 14px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">✓</div>
            <h1 style="margin: 0;">Proposal Signed!</h1>
          </div>

          <div class="content">
            <p>Great news! <strong>${escapeHtml(signerName)}</strong> has signed the proposal.</p>

            <div class="info-box">
              <p style="margin: 0;"><strong>Proposal:</strong> ${escapeHtml(proposalNumber)}</p>
              <p style="margin: 5px 0 0 0;"><strong>Project:</strong> ${escapeHtml(projectName) || 'N/A'}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${signedPdfUrl}" class="button" style="color: white !important;">Download Signed PDF</a>
            </div>

            <p style="color: #555; font-size: 14px;">
              A copy of the signed document has been attached to this email and stored securely in your account.
            </p>
          </div>

          <div class="footer">
            <p>This is an automated notification from Qwohter.</p>
            <p style="font-size: 12px; color: #adb5bd;">© ${new Date().getFullYear()} Qwohter. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  // Send to organization
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Qwohter <notifications@qwohter.com>',
      to: [orgEmail],
      subject: `✓ Proposal ${escapeHtml(proposalNumber)} Signed by ${escapeHtml(signerName)}`,
      html: emailHtml,
    }),
  });

  // Send to client (confirmation)
  const clientHtml = emailHtml.replace(
    'Great news!',
    'Thank you for signing!'
  ).replace(
    `<strong>${escapeHtml(signerName)}</strong> has signed the proposal.`,
    `You have successfully signed the proposal. A copy is attached for your records.`
  );

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Qwohter <notifications@qwohter.com>',
      to: [clientEmail],
      subject: `Your Signed Proposal - ${escapeHtml(proposalNumber)}`,
      html: clientHtml,
    }),
  });

  console.log('[sendSignatureNotifications] Emails sent successfully');
}

//@ts-ignore
serve(async (req) => {
  console.log('[submit-signature] Request received');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { token, signatureData, signatureType, signatureFont, signerName, signerEmail, signerCompany } = body;

    // Validate required fields
    if (!token || !signatureData || !signerName || !signerEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: token, signatureData, signerName, signerEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP address
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      req.headers.get('x-real-ip') ||
                      'Unknown';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    //@ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    //@ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    //@ts-ignore
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate signing token
    console.log('[submit-signature] Validating token...');
    const { data: signingToken, error: tokenError } = await supabase
      .from('proposal_signing_tokens')
      .select('*')
      .eq('access_token', token)
      .single();

    if (tokenError || !signingToken) {
      console.error('[submit-signature] Invalid token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired signing link' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check token status
    if (signingToken.status === 'signed') {
      return new Response(
        JSON.stringify({ error: 'This proposal has already been signed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (signingToken.status === 'expired' || signingToken.status === 'revoked') {
      return new Response(
        JSON.stringify({ error: 'This signing link is no longer valid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (signingToken.expires_at && new Date(signingToken.expires_at) < new Date()) {
      await supabase
        .from('proposal_signing_tokens')
        .update({ status: 'expired' })
        .eq('id', signingToken.id);

      return new Response(
        JSON.stringify({ error: 'This signing link has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get proposal data (including created_by for notification routing)
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('id, proposal_number, project_name, organization_id, form_data, created_by')
      .eq('id', signingToken.proposal_id)
      .single();

    if (proposalError || !proposal) {
      console.error('[submit-signature] Proposal not found:', proposalError);
      return new Response(
        JSON.stringify({ error: 'Proposal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = proposal.organization_id;

    // Get organization data (optional - for email notifications)
    let organization = { name: 'Company', organization_info: null as Record<string, unknown> | null };
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id, name, organization_info')
      .eq('id', organizationId)
      .single();

    if (orgData) {
      organization = orgData;
    }

    // Fetch unsigned PDF from storage
    console.log('[submit-signature] Fetching unsigned PDF...');
    const unsignedPdfPath = signingToken.unsigned_pdf_path;

    if (!unsignedPdfPath) {
      return new Response(
        JSON.stringify({ error: 'Unsigned PDF not found. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('proposal-documents')
      .download(unsignedPdfPath);

    if (downloadError || !pdfData) {
      console.error('[submit-signature] Failed to download PDF:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve proposal PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert to Uint8Array
    const pdfBytes = new Uint8Array(await pdfData.arrayBuffer());
    const signedAt = new Date();

    // Determine signature mode - default to 'page' which adds a separate signature page
    // This is the cleanest approach that works regardless of document layout
    const signatureConfig = proposal.form_data?.signature_config || {};
    // Default to 'page' mode - adds a dedicated signature page at the end
    const signatureMode: SignatureMode = signatureConfig.mode || 'page';
    const signaturePosition: SignaturePosition | undefined = signatureConfig.position;

    console.log(`[submit-signature] Using signature mode: ${signatureMode}, position:`, signaturePosition);

    // Embed signature into PDF
    const signedPdfBytes = await embedSignatureInPdf(
      pdfBytes,
      signatureData,
      signerName,
      signerEmail,
      signedAt,
      ipAddress,
      proposal.proposal_number || 'N/A',
      proposal.project_name || '',
      signatureMode,
      signaturePosition
    );

    // Upload signed PDF (use same filename as unsigned but with "signed" instead)
    const signedPdfPath = unsignedPdfPath.replace('_unsigned_', '_signed_');
    console.log('[submit-signature] Uploading signed PDF to:', signedPdfPath);

    const { error: uploadError } = await supabase.storage
      .from('proposal-documents')
      .upload(signedPdfPath, signedPdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('[submit-signature] Upload failed:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to save signed document' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate signed URL for signed PDF (valid for 7 days - longer since this is for download)
    // Private bucket requires signed URLs for access
    let signedPdfUrl = '';

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('proposal-documents')
      .createSignedUrl(signedPdfPath, 604800); // 7 days in seconds

    if (signedUrlError) {
      console.error('[submit-signature] Failed to create signed URL:', signedUrlError);
      // Fall back to public URL attempt
      const { data: urlData } = supabase.storage
        .from('proposal-documents')
        .getPublicUrl(signedPdfPath);
      signedPdfUrl = urlData.publicUrl;
    } else {
      signedPdfUrl = signedUrlData.signedUrl;
    }

    // Upload to Google Drive if organization has Google connected
    let googleDriveUrl: string | null = null;
    let googleDriveFileId: string | null = null;

    try {
      const googleAuth = await getOrgGoogleAccessToken(supabase, organizationId);

      if (googleAuth) {
        console.log('[submit-signature] Google Drive connected, uploading signed PDF...');

        // Get or create proposal-specific folder (e.g., "P-001_Project Name")
        const proposalFolderId = await getOrCreateProposalFolder(
          googleAuth.accessToken,
          googleAuth.folderId,
          proposal.proposal_number || 'Proposal',
          proposal.project_name
        );

        // Use proposal folder if created, otherwise fall back to root folder
        const targetFolderId = proposalFolderId || googleAuth.folderId;

        // Create filename: "{ProposalNumber}_Signed.pdf" (simpler since folder has context)
        const driveFileName = `${proposal.proposal_number || 'Proposal'}_Signed.pdf`;

        const driveResult = await uploadSignedPdfToDrive(
          googleAuth.accessToken,
          targetFolderId,
          signedPdfBytes,
          driveFileName
        );

        if (driveResult) {
          googleDriveUrl = driveResult.webViewLink;
          googleDriveFileId = driveResult.fileId;
          console.log(`[submit-signature] Uploaded to Google Drive: ${googleDriveUrl}`);
        }
      } else {
        console.log('[submit-signature] Google Drive not connected, skipping Drive upload');
      }
    } catch (driveError) {
      // Don't fail the signature if Drive upload fails
      console.error('[submit-signature] Google Drive upload failed (non-blocking):', driveError);
    }

    // Create signature record
    console.log('[submit-signature] Creating signature record...');
    const { error: signatureError } = await supabase
      .from('proposal_signatures')
      .insert({
        organization_id: organizationId,
        proposal_id: proposal.id,
        signing_token_id: signingToken.id,
        signer_name: signerName,
        signer_email: signerEmail,
        signer_company: signerCompany,
        signature_type: signatureType,
        signature_data: signatureData,
        signature_font: signatureFont,
        signed_pdf_url: signedPdfUrl,
        signed_pdf_path: signedPdfPath,
        signed_at: signedAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (signatureError) {
      console.error('[submit-signature] Failed to create signature record:', signatureError);
    }

    // Update signing token status
    await supabase
      .from('proposal_signing_tokens')
      .update({
        status: 'signed',
        signed_at: signedAt.toISOString(),
      })
      .eq('id', signingToken.id);

    // Update proposal status to "Won" and store Google Drive URL if available
    console.log('[submit-signature] Updating proposal status...');

    // Build form_data update with signed document info
    const signedDocInfo = {
      ...proposal.form_data,
      signed_document: {
        signed_at: signedAt.toISOString(),
        signer_name: signerName,
        signer_email: signerEmail,
        ...(googleDriveUrl && {
          google_drive_url: googleDriveUrl,
          google_drive_file_id: googleDriveFileId,
        }),
      },
    };

    await supabase
      .from('proposals')
      .update({
        status: 'Won',
        updated_at: signedAt.toISOString(),
        form_data: signedDocInfo,
      })
      .eq('id', proposal.id);

    // Log activity
    await supabase
      .from('proposal_signing_activity')
      .insert({
        organization_id: organizationId,
        proposal_id: proposal.id,
        signing_token_id: signingToken.id,
        event_type: 'signed',
        event_data: {
          signer_name: signerName,
          signer_email: signerEmail,
          signature_type: signatureType,
        },
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    // Send email notifications
    if (resendApiKey) {
      const orgEmail = organization.organization_info?.email || signingToken.client_email;
      try {
        await sendSignatureNotifications(
          resendApiKey,
          orgEmail,
          signerEmail,
          proposal.proposal_number,
          proposal.project_name || '',
          signerName,
          signedPdfUrl
        );
      } catch (emailError) {
        console.error('[submit-signature] Email sending failed:', emailError);
        // Don't fail the request if email fails
      }

      // Send notification to proposal creator based on their preferences
      if (proposal.created_by) {
        try {
          // Get creator's notification preferences
          const { data: prefs } = await supabase
            .from('notification_preferences')
            .select('email_enabled, email_on_signature_signed')
            .eq('user_id', proposal.created_by)
            .eq('organization_id', organizationId)
            .single();

          // Default to enabled if no preferences set
          const shouldSendEmail = !prefs || (prefs.email_enabled !== false && prefs.email_on_signature_signed !== false);

          if (shouldSendEmail) {
            // Get creator's email from profiles
            const { data: creatorProfile } = await supabase
              .from('profiles')
              .select('email, first_name')
              .eq('id', proposal.created_by)
              .single();

            if (creatorProfile?.email && creatorProfile.email !== orgEmail) {
              // Send immediate notification to creator
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'Qwohter Notifications <notifications@qwohter.com>',
                  to: [creatorProfile.email],
                  subject: `${signerName} signed ${proposal.proposal_number}!`,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      <div style="background: #10b981; color: white; padding: 24px; text-align: center;">
                        <h1 style="margin: 0; font-size: 20px;">Document Signed!</h1>
                      </div>
                      <div style="padding: 24px;">
                        <p>Hi ${creatorProfile.first_name || 'there'},</p>
                        <p>Great news! <strong>${signerName}</strong> (${signerEmail}) has signed your document <strong>${proposal.proposal_number}</strong>.</p>
                        <div style="text-align: center; margin: 24px 0;">
                          <a href="${signedPdfUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Signed Document</a>
                        </div>
                      </div>
                      <div style="background: #f8f9fa; padding: 16px; text-align: center; font-size: 12px; color: #6b7280;">
                        <p style="margin: 0;">Sent from <a href="https://www.qwohter.com" style="color: #EE6C4D;">Qwohter</a></p>
                        <p style="margin: 8px 0 0 0;"><a href="https://www.qwohter.com/settings?tab=notifications" style="color: #EE6C4D;">Manage preferences</a></p>
                      </div>
                    </div>
                  `,
                }),
              });
              console.log('[submit-signature] Creator notification sent');
            }
          }
        } catch (notifError) {
          console.error('[submit-signature] Creator notification failed:', notifError);
          // Don't fail the request if notification fails
        }
      }
    }

    console.log('[submit-signature] Success!');

    return new Response(
      JSON.stringify({
        success: true,
        signedPdfUrl,
        proposalNumber: proposal.proposal_number,
        message: 'Proposal signed successfully',
        ...(googleDriveUrl && { googleDriveUrl }),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[submit-signature] Error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process signature',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
