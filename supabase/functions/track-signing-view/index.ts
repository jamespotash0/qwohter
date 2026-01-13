/**
 * Track Signing View Edge Function
 *
 * Records when a client views the signing page.
 * Updates the signing token timestamps and logs activity.
 */
//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  accessToken: string;
}

//@ts-ignore
serve(async (req) => {
  console.log('[track-signing-view] Request received');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: RequestBody = await req.json();
    const { accessToken } = body;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'accessToken is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    //@ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    //@ts-ignore
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get signing token with sent_by for notification
    const { data: signingToken, error: tokenError } = await supabaseAdmin
      .from('proposal_signing_tokens')
      .select('id, organization_id, proposal_id, status, first_viewed_at, sent_by, client_name, client_email')
      .eq('access_token', accessToken)
      .single();

    if (tokenError || !signingToken) {
      return new Response(
        JSON.stringify({ error: 'Invalid signing token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only track if not already signed/revoked/expired
    if (!['pending', 'viewed'].includes(signingToken.status)) {
      return new Response(
        JSON.stringify({ success: true, message: 'Token already processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    const isFirstView = !signingToken.first_viewed_at;

    // Get client IP and user agent
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      req.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Update signing token
    const updateData: Record<string, unknown> = {
      last_viewed_at: now,
      status: 'viewed',
    };

    if (isFirstView) {
      updateData.first_viewed_at = now;
    }

    await supabaseAdmin
      .from('proposal_signing_tokens')
      .update(updateData)
      .eq('id', signingToken.id);

    // Log activity (only log first view to avoid spam)
    if (isFirstView) {
      await supabaseAdmin.from('proposal_signing_activity').insert({
        organization_id: signingToken.organization_id,
        proposal_id: signingToken.proposal_id,
        signing_token_id: signingToken.id,
        event_type: 'viewed',
        event_data: { first_view: true },
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      // Send notification to document owner (non-blocking)
      if (signingToken.sent_by) {
        try {
          // Get proposal info
          const { data: proposal } = await supabaseAdmin
            .from('proposals')
            .select('proposal_number, project_name')
            .eq('id', signingToken.proposal_id)
            .single();

          // Get user profile for notification email
          const { data: userProfile } = await supabaseAdmin
            .from('profiles')
            .select('email, full_name')
            .eq('id', signingToken.sent_by)
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
                userId: signingToken.sent_by,
                organizationId: signingToken.organization_id,
                notificationType: 'signature_viewed',
                recipientEmail: userProfile.email,
                recipientName: userProfile.full_name || 'User',
                data: {
                  proposalNumber: proposal?.proposal_number,
                  proposalName: proposal?.project_name,
                  signerEmail: signingToken.client_email,
                  signerName: signingToken.client_name,
                  link: `/proposals/${signingToken.proposal_id}`,
                },
              }),
            }).catch(err => console.error('[track-signing-view] Notification error:', err));
          }
        } catch (notifError) {
          console.error('[track-signing-view] Failed to send notification:', notifError);
          // Don't fail the request for notification errors
        }
      }
    }

    console.log('[track-signing-view] View tracked successfully');

    return new Response(
      JSON.stringify({ success: true, firstView: isFirstView }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[track-signing-view] Error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to track view',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
