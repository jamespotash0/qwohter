/**
 * Get Signing Data Edge Function
 *
 * Public endpoint (no auth required) that returns proposal and signing data
 * for the public signing page. Uses the access token for validation.
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
  console.log('[get-signing-data] Request received');

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

    // Use service role to access data (public endpoint)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Rate limiting: 10 requests per minute per IP
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      req.headers.get('x-real-ip') ||
                      'unknown';
    try {
      const { data: rateCheck } = await supabaseAdmin.rpc('check_auth_rate_limit', {
        p_identifier: ipAddress,
        p_identifier_type: 'ip',
        p_attempt_type: 'signing-get',
        p_max_attempts: 10,
        p_window_minutes: 1,
        p_block_duration_minutes: 5,
      });
      if (rateCheck && !rateCheck.allowed) {
        return new Response(
          JSON.stringify({ error: 'Too many requests. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
        );
      }
    } catch (rlError) {
      console.error('[get-signing-data] Rate limit check failed (allowing request):', rlError);
    }

    // Get signing token by access token
    const { data: signingToken, error: tokenError } = await supabaseAdmin
      .from('proposal_signing_tokens')
      .select('*')
      .eq('access_token', accessToken)
      .single();

    if (tokenError || !signingToken) {
      console.error('[get-signing-data] Token not found:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired signing link' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is valid
    if (signingToken.status === 'signed') {
      return new Response(
        JSON.stringify({ error: 'This proposal has already been signed', alreadySigned: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (signingToken.status === 'revoked') {
      return new Response(
        JSON.stringify({ error: 'This signing link has been revoked' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (signingToken.status === 'expired') {
      return new Response(
        JSON.stringify({ error: 'This signing link has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (signingToken.expires_at && new Date(signingToken.expires_at) < new Date()) {
      // Update status to expired
      await supabaseAdmin
        .from('proposal_signing_tokens')
        .update({ status: 'expired' })
        .eq('id', signingToken.id);

      return new Response(
        JSON.stringify({ error: 'This signing link has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get proposal data
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select('id, proposal_number, project_name')
      .eq('id', signingToken.proposal_id)
      .single();

    if (proposalError || !proposal) {
      console.error('[get-signing-data] Proposal not found:', proposalError);
      return new Response(
        JSON.stringify({ error: 'Proposal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization data (optional - for display purposes only)
    // Don't block signing if org lookup fails
    console.log('[get-signing-data] Looking up organization:', signingToken.organization_id);

    let organizationData = {
      id: signingToken.organization_id,
      name: 'Company',
      logo_url: undefined as string | undefined,
    };

    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, logo_data')
      .eq('id', signingToken.organization_id)
      .single();

    if (orgError) {
      // Log but don't fail - organization data is optional for signing
      console.warn('[get-signing-data] Organization lookup failed (non-blocking):', {
        orgError,
        organizationId: signingToken.organization_id,
      });
    } else if (organization) {
      // Get logo path from logo_data JSONB column
      const logoData = organization.logo_data as { logo_url?: string } | null;
      let logoUrl: string | undefined;

      // Generate signed URL for logo if path exists (bucket is private)
      if (logoData?.logo_url) {
        const { data: logoSignedUrl, error: logoUrlError } = await supabaseAdmin.storage
          .from('organization-logos')
          .createSignedUrl(logoData.logo_url, 3600); // 1 hour

        if (!logoUrlError && logoSignedUrl?.signedUrl) {
          logoUrl = logoSignedUrl.signedUrl;
        } else {
          console.warn('[get-signing-data] Failed to create logo signed URL:', logoUrlError);
        }
      }

      organizationData = {
        id: organization.id,
        name: organization.name || 'Company',
        logo_url: logoUrl,
      };
    }

    // Generate signed URL for PDF (valid for 1 hour)
    // The bucket is private, so we need a signed URL for access
    let pdfUrl = signingToken.unsigned_pdf_url;

    if (signingToken.unsigned_pdf_path) {
      console.log('[get-signing-data] Generating signed URL for PDF...');

      const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
        .from('proposal-documents')
        .createSignedUrl(signingToken.unsigned_pdf_path, 3600); // 1 hour

      if (signedUrlError) {
        console.error('[get-signing-data] Failed to create signed URL:', signedUrlError);
        // Fall back to stored URL if signed URL fails (might work if bucket is public)
      } else if (signedUrlData?.signedUrl) {
        pdfUrl = signedUrlData.signedUrl;
        console.log('[get-signing-data] Generated signed URL successfully');
      }
    }

    console.log('[get-signing-data] Success - returning data');

    return new Response(
      JSON.stringify({
        proposal: {
          id: proposal.id,
          proposal_number: proposal.proposal_number || 'Proposal',
          project_name: proposal.project_name || 'Your Project',
        },
        organization: organizationData,
        signingToken: {
          id: signingToken.id,
          client_name: signingToken.client_name,
          client_email: signingToken.client_email,
          client_company: signingToken.client_company,
          status: signingToken.status,
          expires_at: signingToken.expires_at,
        },
        pdfUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[get-signing-data] Error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to get signing data',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
