/**
 * Send Purchase Order
 *
 * Emails a purchase order PDF to a vendor and records that it went out.
 *
 * The PDF is generated on the client (src/lib/pdf/purchaseOrder.ts) and passed
 * in as base64. That keeps one renderer rather than two: a Deno reimplementation
 * would drift from the one a dealer previews on screen, and the document a
 * manufacturer receives must be exactly the one that was reviewed.
 *
 * Marking the PO as Sent happens only after Resend accepts it. A PO recorded as
 * sent that never left is worse than one that failed loudly — the dealer would
 * wait weeks for an acknowledgment that was never coming.
 */

//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SendPurchaseOrderRequest {
  vendorPOId: string;
  /** Where it goes. Resolved by the caller from the vendor record. */
  to: string;
  cc?: string[];
  subject?: string;
  message?: string;
  /** base64, no data URI prefix. */
  pdfBase64: string;
  fileName: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as SendPurchaseOrderRequest;
    const { vendorPOId, to, cc, subject, message, pdfBase64, fileName } = body;

    if (!vendorPOId || !to || !pdfBase64 || !fileName) {
      return jsonResponse(
        { error: 'vendorPOId, to, pdfBase64, and fileName are required' },
        400
      );
    }

    if (!EMAIL_RE.test(to)) {
      return jsonResponse({ error: `"${to}" is not a valid email address` }, 400);
    }

    // Act as the calling user so RLS applies: a caller who cannot read the
    // purchase order must not be able to send it.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: po, error: poError } = await supabase
      .from('vendor_pos')
      .select('id, po_number, status, organization_id')
      .eq('id', vendorPOId)
      .maybeSingle();

    if (poError || !po) {
      return jsonResponse({ error: 'Purchase order not found' }, 404);
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return jsonResponse({ error: 'Email is not configured' }, 500);
    }

    const poNumber = po.po_number ?? 'Purchase Order';
    const resolvedSubject = subject?.trim() || `Purchase Order ${poNumber}`;
    const bodyText =
      message?.trim() ||
      `Please find purchase order ${poNumber} attached.\n\nAcknowledge with confirmed pricing and ship dates at your earliest convenience.`;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Qwohter Purchasing <purchasing@qwohter.com>',
        to: [to],
        ...(cc && cc.length > 0 ? { cc } : {}),
        subject: resolvedSubject,
        text: bodyText,
        html: `<p>${bodyText.replace(/\n/g, '<br>')}</p>`,
        attachments: [{ filename: fileName, content: pdfBase64 }],
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      return jsonResponse(
        { error: resendData?.message ?? 'The email provider rejected the message' },
        502
      );
    }

    // Only now is it genuinely sent.
    const { error: updateError } = await supabase
      .from('vendor_pos')
      .update({
        status: 'Sent',
        sent_at: new Date().toISOString(),
        sent_to_email: to,
      })
      .eq('id', vendorPOId);

    if (updateError) {
      // The vendor has the order; the record is what is now wrong. Say so
      // rather than reporting a clean success or a failure that would invite a
      // duplicate send.
      console.error('PO sent but status update failed:', updateError);
      return jsonResponse({
        success: true,
        warning:
          'The purchase order was emailed, but its status could not be updated. Do not resend.',
        emailId: resendData?.id ?? null,
      });
    }

    return jsonResponse({ success: true, emailId: resendData?.id ?? null });
  } catch (error) {
    console.error('send-purchase-order failed:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      500
    );
  }
});
