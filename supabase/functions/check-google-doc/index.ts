/**
 * Check Google Doc Edge Function
 *
 * Checks if a Google Doc exists and is accessible.
 * Used to detect deleted/moved documents and auto-unlink them.
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
  docId: string;
  organizationId: string;
}
//@ts-ignore
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
    //@ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    //@ts-ignore
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
    const { docId, organizationId }: RequestBody = await req.json();

    if (!docId) {
      return new Response(JSON.stringify({ error: 'docId is required' }), {
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

    // Get org-level token from database using service role
    const supabaseAdmin = createClient(
      supabaseUrl,
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('google_oauth_tokens')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_valid', true)
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({
        exists: false,
        accessible: false,
        error: 'Google not connected'
      }), {
        status: 200, // Return 200 so the client can handle this gracefully
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if token needs refresh
    let accessToken = tokenData.access_token;
    const expiresAt = new Date(tokenData.token_expires_at);
    const now = new Date();
    const bufferMinutes = 5;

    if (now >= new Date(expiresAt.getTime() - bufferMinutes * 60 * 1000)) {
      // Token expired - refresh it
      const refreshedToken = await refreshGoogleToken(tokenData.refresh_token, supabaseAdmin, organizationId);
      if (!refreshedToken) {
        return new Response(JSON.stringify({
          exists: false,
          accessible: false,
          error: 'Failed to refresh Google token'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      accessToken = refreshedToken;
    }

    // Check if the document exists using Drive API
    // We only need to get minimal metadata to check existence
    const driveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${docId}?fields=id,name,trashed`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (driveResponse.status === 404) {
      // Document doesn't exist
      return new Response(JSON.stringify({
        exists: false,
        accessible: false,
        error: 'Document not found'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (driveResponse.status === 403) {
      // No access to document
      return new Response(JSON.stringify({
        exists: true,
        accessible: false,
        error: 'No access to document'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!driveResponse.ok) {
      const errorText = await driveResponse.text();
      console.error('Drive API error:', errorText);
      return new Response(JSON.stringify({
        exists: false,
        accessible: false,
        error: 'Failed to check document'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const docData = await driveResponse.json();

    // Check if trashed
    if (docData.trashed) {
      return new Response(JSON.stringify({
        exists: false,
        accessible: false,
        error: 'Document is in trash'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Document exists and is accessible
    return new Response(JSON.stringify({
      exists: true,
      accessible: true,
      name: docData.name,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Check Google Doc error:', error);
    return new Response(JSON.stringify({
      exists: false,
      accessible: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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
    //@ts-ignore
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    //@ts-ignore
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
