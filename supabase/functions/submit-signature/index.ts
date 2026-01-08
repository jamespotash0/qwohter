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
 * - 'page': Add a new signature page at the end (recommended)
 * - 'overlay': Place signature at bottom of last page
 * - 'position': Place signature at specific coordinates (for templates with markers)
 */
type SignatureMode = 'page' | 'overlay' | 'position';

interface SignaturePosition {
  pageIndex: number;  // 0-based page index
  x: number;          // X coordinate from left
  y: number;          // Y coordinate from bottom
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
    // during document generation. The placeholder is ~130pt tall, so we
    // position the signature to cover it from bottom-up.
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    await drawSignatureBlock(
      lastPage, signatureImage, helvetica, helveticaBold,
      signerName, dateStr, timeStr, ipAddress,
      72, 72  // 1 inch from left, 1 inch from bottom (covers placeholder area)
    );
  } else if (mode === 'position' && position) {
    // === MODE: Exact position (for template markers) ===
    const pages = pdfDoc.getPages();
    const targetPage = pages[position.pageIndex] || pages[pages.length - 1];
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
 * Draw signature block at a specific position on a page
 * Used for overlay mode or position mode
 *
 * In overlay mode, this overlays on top of the {{SIGNATURE_BLOCK}} placeholder
 * that was inserted during document generation. The placeholder looks like:
 *
 * Signature: ____________________________    Date: ______________
 *
 * We overlay the actual signature image and fill in the date inline.
 */
async function drawSignatureBlock(
  page: any,
  signatureImage: any,
  helvetica: any,
  _helveticaBold: any,  // Kept for API compatibility with addSignaturePage
  signerName: string,
  dateStr: string,
  timeStr: string,
  ipAddress: string,
  x: number,
  y: number
): Promise<void> {
  // Draw white background to cover the placeholder line (single line ~20pt tall)
  page.drawRectangle({
    x: x - 5,
    y: y - 5,
    width: 450,
    height: 50,
    color: rgb(1, 1, 1),  // White background to cover placeholder
  });

  // "Signature:" label
  page.drawText('Signature:', {
    x,
    y: y + 15,
    size: 10,
    font: helvetica,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Draw signature image (inline, after "Signature:" label)
  const sigWidth = 150;
  const sigHeight = 40;
  page.drawImage(signatureImage, {
    x: x + 60,
    y: y + 5,
    width: sigWidth,
    height: sigHeight,
  });

  // Date field (inline, to the right of signature)
  page.drawText(`Date: ${dateStr}`, {
    x: x + 250,
    y: y + 15,
    size: 10,
    font: helvetica,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Compliance footer (small, below the line)
  page.drawText(`Signed by ${signerName} | ${timeStr} | ${ipAddress}`, {
    x,
    y: y - 3,
    size: 6,
    font: helvetica,
    color: rgb(0.6, 0.6, 0.6),
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
            <p>Great news! <strong>${signerName}</strong> has signed the proposal.</p>

            <div class="info-box">
              <p style="margin: 0;"><strong>Proposal:</strong> ${proposalNumber}</p>
              <p style="margin: 5px 0 0 0;"><strong>Project:</strong> ${projectName || 'N/A'}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${signedPdfUrl}" class="button" style="color: white !important;">Download Signed PDF</a>
            </div>

            <p style="color: #555; font-size: 14px;">
              A copy of the signed document has been attached to this email and stored securely in your account.
            </p>
          </div>

          <div class="footer">
            <p>This is an automated notification from WallQu.</p>
            <p style="font-size: 12px; color: #adb5bd;">© ${new Date().getFullYear()} WallQu. All rights reserved.</p>
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
      from: 'WallQu <notifications@qwohter.com>',
      to: [orgEmail],
      subject: `✓ Proposal ${proposalNumber} Signed by ${signerName}`,
      html: emailHtml,
    }),
  });

  // Send to client (confirmation)
  const clientHtml = emailHtml.replace(
    'Great news!',
    'Thank you for signing!'
  ).replace(
    `<strong>${signerName}</strong> has signed the proposal.`,
    `You have successfully signed the proposal. A copy is attached for your records.`
  );

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'WallQu <notifications@qwohter.com>',
      to: [clientEmail],
      subject: `Your Signed Proposal - ${proposalNumber}`,
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

    // Get proposal data
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('id, proposal_number, project_name, organization_id, form_data')
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

    // Determine signature mode from proposal's form_data.signature_config
    // Falls back to 'page' mode if not configured
    const signatureConfig = proposal.form_data?.signature_config || { mode: 'page' };
    const signatureMode: SignatureMode = signatureConfig.mode || 'page';
    const signaturePosition: SignaturePosition | undefined = signatureConfig.position;

    console.log(`[submit-signature] Using signature mode: ${signatureMode}`);

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

    // Get public URL for signed PDF
    const { data: urlData } = supabase.storage
      .from('proposal-documents')
      .getPublicUrl(signedPdfPath);

    const signedPdfUrl = urlData.publicUrl;

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

    // Update proposal status to "Won"
    console.log('[submit-signature] Updating proposal status...');
    await supabase
      .from('proposals')
      .update({
        status: 'Won',
        updated_at: signedAt.toISOString(),
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
    }

    console.log('[submit-signature] Success!');

    return new Response(
      JSON.stringify({
        success: true,
        signedPdfUrl,
        proposalNumber: proposal.proposal_number,
        message: 'Proposal signed successfully',
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
