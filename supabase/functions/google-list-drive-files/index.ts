/**
 * Google List Drive Files Edge Function
 *
 * Lists Google Docs from the connected Drive folder (or all accessible Docs).
 * Used to populate the template picker dropdown.
 *
 * Required Supabase Secrets:
 * - GOOGLE_CLIENT_ID: OAuth client ID
 * - GOOGLE_CLIENT_SECRET: OAuth client secret
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  organizationId: string;
  searchQuery?: string;
  pageToken?: string;
  pageSize?: number;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink?: string;
  modifiedTime: string;
  createdTime: string;
}

interface DriveListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

serve(async (req) => {
  // Handle CORS
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

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request
    const { organizationId, searchQuery, pageToken, pageSize = 25 }: RequestBody = await req.json();

    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'Organization ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get org-level token from database using service role
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('google_oauth_tokens')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_valid', true)
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: 'Google not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if token needs refresh
    let accessToken = tokenData.access_token;
    const expiresAt = new Date(tokenData.token_expires_at);
    const now = new Date();
    const bufferMinutes = 5; // Refresh 5 minutes before expiry

    if (now >= new Date(expiresAt.getTime() - bufferMinutes * 60 * 1000)) {
      // Token expired or expiring soon - refresh it
      const refreshedToken = await refreshGoogleToken(tokenData.refresh_token, supabaseAdmin, organizationId);
      if (!refreshedToken) {
        return new Response(JSON.stringify({ error: 'Failed to refresh Google token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      accessToken = refreshedToken;
    }

    // Build the Drive API query
    // Only list Google Docs (mimeType = 'application/vnd.google-apps.document')
    let query = "mimeType='application/vnd.google-apps.document' and trashed=false";

    // If there's a folder ID, only list files in that folder
    if (tokenData.drive_folder_id) {
      query += ` and '${tokenData.drive_folder_id}' in parents`;
    }

    // If there's a search query, add name filter
    if (searchQuery && searchQuery.trim()) {
      query += ` and name contains '${searchQuery.trim().replace(/'/g, "\\'")}'`;
    }

    // Build Drive API URL
    const params = new URLSearchParams({
      q: query,
      pageSize: String(Math.min(pageSize, 100)),
      fields: 'nextPageToken,files(id,name,mimeType,webViewLink,iconLink,modifiedTime,createdTime)',
      orderBy: 'modifiedTime desc',
    });

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    // Fetch files from Google Drive API
    const driveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!driveResponse.ok) {
      const errorText = await driveResponse.text();
      console.error('Drive API error:', errorText);

      // If 401, mark token as invalid
      if (driveResponse.status === 401) {
        await supabaseAdmin
          .from('google_oauth_tokens')
          .update({ is_valid: false })
          .eq('organization_id', organizationId);
      }

      return new Response(JSON.stringify({ error: 'Failed to fetch Drive files' }), {
        status: driveResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const driveData: DriveListResponse = await driveResponse.json();

    // Update last_used_at
    await supabaseAdmin
      .from('google_oauth_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('organization_id', organizationId);

    return new Response(
      JSON.stringify({
        files: driveData.files || [],
        nextPageToken: driveData.nextPageToken,
        folderId: tokenData.drive_folder_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('List Drive files error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to list files',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Refresh the Google OAuth token
 */
async function refreshGoogleToken(
  refreshToken: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  organizationId: string
): Promise<string | null> {
  try {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('Google OAuth credentials not configured');
      return null;
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Token refresh failed:', error);

      // Mark token as invalid
      await supabaseAdmin
        .from('google_oauth_tokens')
        .update({ is_valid: false })
        .eq('organization_id', organizationId);

      return null;
    }

    const tokens = await response.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Update token in database
    await supabaseAdmin
      .from('google_oauth_tokens')
      .update({
        access_token: tokens.access_token,
        token_expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId);

    return tokens.access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}
