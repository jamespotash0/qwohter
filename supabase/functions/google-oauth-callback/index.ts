/**
 * Google OAuth Callback Edge Function
 *
 * Exchanges authorization code for access/refresh tokens and stores them.
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
  code: string;
  redirectUri: string;
  organizationId: string;
  driveFolderId?: string; // Optional: folder where docs will be created
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
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

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request
    const { code, redirectUri, organizationId, driveFolderId }: RequestBody = await req.json();

    if (!code || !redirectUri || !organizationId) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing OAuth callback for org ${organizationId}, folder: ${driveFolderId || 'none'}`);

    // Get OAuth credentials
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'Google OAuth not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return new Response(JSON.stringify({ error: 'Failed to exchange authorization code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();

    // DEBUG: Log what tokens we received (critical for troubleshooting)
    console.log('[google-oauth-callback] Tokens received:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      refreshTokenLength: tokens.refresh_token?.length || 0,
      expiresIn: tokens.expires_in,
      tokenType: tokens.token_type,
      scope: tokens.scope,
    });

    // IMPORTANT: refresh_token is ONLY provided on first authorization
    // or when prompt=consent is used. If missing, user won't be able to refresh!
    if (!tokens.refresh_token) {
      console.warn('[google-oauth-callback] WARNING: No refresh token received! ' +
        'User will need to reconnect when access token expires. ' +
        'Ensure access_type=offline and prompt=consent are in the auth URL.');
    }

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    let googleUserInfo: GoogleUserInfo | null = null;
    if (userInfoResponse.ok) {
      googleUserInfo = await userInfoResponse.json();
    }

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Store tokens in database (using service role for security)
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Store tokens at org level (one token per org)
    // IMPORTANT: Store null (not empty string) if no refresh token - makes debugging easier
    const tokenDataToStore = {
      organization_id: organizationId,
      connected_by_user_id: user.id, // Track who connected
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null, // null, not empty string!
      token_expires_at: tokenExpiresAt,
      scopes: tokens.scope.split(' '),
      google_email: googleUserInfo?.email || null,
      google_name: googleUserInfo?.name || null,
      drive_folder_id: driveFolderId || null, // Store folder ID
      is_valid: true,
      last_used_at: new Date().toISOString(),
    };

    console.log('[google-oauth-callback] Storing token data:', {
      organization_id: organizationId,
      hasRefreshToken: !!tokenDataToStore.refresh_token,
      google_email: tokenDataToStore.google_email,
      drive_folder_id: tokenDataToStore.drive_folder_id,
    });

    const { error: insertError } = await supabaseAdmin
      .from('google_oauth_tokens')
      .upsert(tokenDataToStore, {
        onConflict: 'organization_id', // One token per org
      });

    if (insertError) {
      console.error('[google-oauth-callback] Failed to store tokens:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to store authentication' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[google-oauth-callback] Tokens stored successfully for org:', organizationId);

    // Update integration status in integrations table
    const { error: integrationError } = await supabaseAdmin
      .from('integrations')
      .upsert({
        organization_id: organizationId,
        integration_type: 'google_docs',
        integration_name: 'Google Docs',
        is_connected: true,
        connection_status: 'Connected',
        last_connection_check_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings: {
          connected_email: googleUserInfo?.email,
          connected_name: googleUserInfo?.name,
          drive_folder_id: driveFolderId || null,
        },
      }, {
        onConflict: 'organization_id,integration_type',
      });

    if (integrationError) {
      console.error('Failed to update integrations table:', integrationError);
      // Don't fail the whole flow, tokens are already saved
    }

    return new Response(
      JSON.stringify({
        success: true,
        email: googleUserInfo?.email,
        name: googleUserInfo?.name,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'OAuth callback failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
