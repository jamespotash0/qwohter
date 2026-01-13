/**
 * Export Proposal PDF Edge Function
 *
 * Exports a Google Doc proposal to PDF and stores it in Supabase Storage.
 * Used for proposal signing flow - creates the unsigned PDF for signature.
 *
 * Required Supabase Secrets:
 * - GOOGLE_CLIENT_ID: OAuth client ID
 * - GOOGLE_CLIENT_SECRET: OAuth client secret
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
  proposalId: string;
  organizationId: string;
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
 * Export a Google Doc as PDF using Drive API
 */
async function exportGoogleDocAsPdf(
  accessToken: string,
  docId: string
): Promise<Uint8Array> {
  console.log(`[exportGoogleDocAsPdf] Exporting doc ${docId} as PDF...`);

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=application/pdf`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

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
 */
async function uploadPdfToStorage(
  supabaseAdmin: ReturnType<typeof createClient>,
  organizationId: string,
  proposalId: string,
  pdfBytes: Uint8Array
): Promise<{ url: string; path: string }> {
  const storagePath = `${organizationId}/proposals/${proposalId}/unsigned.pdf`;

  console.log(`[uploadPdfToStorage] Uploading to: ${storagePath}`);

  // Upload to storage (upsert to overwrite if exists)
  const { error: uploadError } = await supabaseAdmin.storage
    .from('proposal-documents')
    .upload(storagePath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
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

//@ts-ignore
serve(async (req) => {
  console.log('[export-proposal-pdf] Request received');

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
    const { proposalId, organizationId } = body;

    if (!proposalId) {
      return new Response(JSON.stringify({ error: 'proposalId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'organizationId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get proposal to find Google Doc ID
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('id, google_doc_id, proposal_number, project_name')
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
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create admin client for token operations and storage
    const supabaseAdmin = createClient(
      supabaseUrl,
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get Google access token
    console.log('[export-proposal-pdf] Getting Google access token...');
    const accessToken = await getOrgAccessToken(supabaseAdmin, organizationId);

    // Export Google Doc as PDF
    console.log('[export-proposal-pdf] Exporting Google Doc as PDF...');
    const pdfBytes = await exportGoogleDocAsPdf(accessToken, proposal.google_doc_id);

    // Upload to Supabase Storage
    console.log('[export-proposal-pdf] Uploading PDF to storage...');
    const { url: pdfUrl, path: pdfPath } = await uploadPdfToStorage(
      supabaseAdmin,
      organizationId,
      proposalId,
      pdfBytes
    );

    console.log('[export-proposal-pdf] Success!');

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl,
        pdfPath,
        proposalId,
        proposalNumber: proposal.proposal_number,
        projectName: proposal.project_name,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[export-proposal-pdf] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to export PDF';
    const needsAuth = errorMessage.includes('connect') || errorMessage.includes('reconnect');

    return new Response(
      JSON.stringify({
        error: errorMessage,
        needsAuth,
      }),
      {
        status: needsAuth ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
