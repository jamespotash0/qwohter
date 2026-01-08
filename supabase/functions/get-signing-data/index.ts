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
      // Get logo URL from logo_data JSONB column (prefer logo_public_url, fallback to logo_url)
      const logoData = organization.logo_data as { logo_public_url?: string; logo_url?: string } | null;
      organizationData = {
        id: organization.id,
        name: organization.name || 'Company',
        logo_url: logoData?.logo_public_url || logoData?.logo_url,
      };
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
        pdfUrl: signingToken.unsigned_pdf_url,
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
