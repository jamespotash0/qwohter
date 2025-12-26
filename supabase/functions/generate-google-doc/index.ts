/**
 * Google Docs Generation Edge Function
 *
 * Copies a Google Docs template and replaces {{variables}} with proposal data.
 * Uses the user's OAuth token to create documents in their own Google Drive.
 *
 * Required Supabase Secrets:
 * - GOOGLE_CLIENT_ID: OAuth client ID (for token refresh)
 * - GOOGLE_CLIENT_SECRET: OAuth client secret (for token refresh)
 */
//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  templateDocId: string;
  proposalId: string;
  organizationId: string;
  variables: Record<string, string>;
  outputTitle?: string;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface OrgTokenData {
  id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  drive_folder_id: string | null;
  is_valid: boolean;
}

/**
 * Get a valid access token for the organization, refreshing if expired
 * Returns the token and the folder ID for document creation
 */
async function getOrgAccessToken(
  supabaseAdmin: ReturnType<typeof createClient>,
  organizationId: string
): Promise<{ accessToken: string; folderId: string | null }> {
  // Get org-level token from database
  const { data: tokenData, error: tokenError } = await supabaseAdmin
    .from('google_oauth_tokens')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_valid', true)
    .single();

  if (tokenError || !tokenData) {
    throw new Error('Google Docs not configured. An admin needs to connect Google in Settings → Integrations.');
  }

  const folderId = tokenData.drive_folder_id;

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(tokenData.token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - bufferMs > now.getTime()) {
    // Token is still valid
    await supabaseAdmin
      .from('google_oauth_tokens')
      .update({ last_used_at: now.toISOString() })
      .eq('id', tokenData.id);

    return { accessToken: tokenData.access_token, folderId };
  }
  //@ts-ignore
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  //@ts-ignore
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth not configured on server');
  }

  if (!tokenData.refresh_token) {
    // Mark token as invalid
    await supabaseAdmin
      .from('google_oauth_tokens')
      .update({ is_valid: false })
      .eq('id', tokenData.id);

    throw new Error('Google connection expired. An admin needs to reconnect in Settings → Integrations.');
  }

  // Refresh the token
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
    console.error('Token refresh failed:', error);

    // Mark token as invalid
    await supabaseAdmin
      .from('google_oauth_tokens')
      .update({ is_valid: false })
      .eq('id', tokenData.id);

    throw new Error('Google connection expired. An admin needs to reconnect in Settings → Integrations.');
  }

  const newTokens: GoogleTokenResponse = await refreshResponse.json();

  // Calculate new expiration
  const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

  // Update tokens in database
  await supabaseAdmin
    .from('google_oauth_tokens')
    .update({
      access_token: newTokens.access_token,
      token_expires_at: newExpiresAt,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', tokenData.id);

  return { accessToken: newTokens.access_token, folderId };
}

/**
 * Copy a Google Doc template using Drive API
 * Document is created in the specified folder (or root if no folder)
 */
async function copyDocument(
  accessToken: string,
  templateDocId: string,
  title: string,
  folderId: string | null
): Promise<string> {
  // Build the request body - include parents if folder specified
  const requestBody: { name: string; parents?: string[] } = { name: title };
  if (folderId) {
    requestBody.parents = [folderId];
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${templateDocId}/copy`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const error = await response.text();

    // Provide more helpful error messages
    if (error.includes('notFound')) {
      throw new Error('Template not found. Make sure the template is shared with the connected Google account.');
    }
    if (error.includes('forbidden') || error.includes('403')) {
      throw new Error('Access denied. Make sure the connected Google account has access to the template and target folder.');
    }

    throw new Error(`Failed to copy document: ${error}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Replace variables in a Google Doc using Docs API
 */
async function replaceVariables(
  accessToken: string,
  docId: string,
  variables: Record<string, string>
): Promise<void> {
  // Build batch update requests for each variable
  const requests = Object.entries(variables).map(([key, value]) => ({
    replaceAllText: {
      containsText: {
        text: `{{${key}}}`,
        matchCase: false,
      },
      replaceText: value || '',
    },
  }));

  if (requests.length === 0) return;

  const response = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to replace variables: ${error}`);
  }
}
//@ts-ignore
serve(async (req) => {
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
    // Create Supabase client to verify the user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    //@ts-ignore
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { templateDocId, proposalId, organizationId, variables, outputTitle } = body;

    if (!templateDocId) {
      return new Response(JSON.stringify({ error: 'templateDocId is required' }), {
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

    // Create admin client for token operations
    const supabaseAdmin = createClient(
      supabaseUrl,
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get organization's Google access token (refreshes if expired)
    console.log(`Getting org access token for organization ${organizationId}...`);
    const { accessToken, folderId } = await getOrgAccessToken(supabaseAdmin, organizationId);

    // Generate document title
    const title = outputTitle || `Proposal - ${proposalId || 'Draft'} - ${new Date().toLocaleDateString()}`;

    // Copy the template to the org's shared folder
    console.log(`Copying template ${templateDocId} to folder ${folderId || 'root'}...`);
    const newDocId = await copyDocument(accessToken, templateDocId, title, folderId);
    console.log(`Created new document: ${newDocId}`);

    // Replace variables
    if (variables && Object.keys(variables).length > 0) {
      console.log(`Replacing ${Object.keys(variables).length} variables...`);
      await replaceVariables(accessToken, newDocId, variables);
    }

    // Update the proposal with the new doc ID
    if (proposalId) {
      const { error: updateError } = await supabase
        .from('proposals')
        .update({ google_doc_id: newDocId })
        .eq('id', proposalId);

      if (updateError) {
        console.error('Failed to update proposal:', updateError);
        // Don't fail - the doc was created successfully
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        docId: newDocId,
        docUrl: `https://docs.google.com/document/d/${newDocId}/edit`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating document:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate document';
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
