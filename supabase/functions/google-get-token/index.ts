/**
 * Google Get Token Edge Function
 *
 * Validates and refreshes the organization's Google OAuth token.
 * Called proactively by the frontend to ensure tokens stay valid
 * without requiring a full re-OAuth flow.
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
}

serve(async (req) => {
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

    const { organizationId }: RequestBody = await req.json();
    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'Missing organizationId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to read/update tokens
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch token WITHOUT filtering by is_valid — we want to try refreshing invalid tokens
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('google_oauth_tokens')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({
        valid: false,
        reason: 'no_token',
        error: 'Google Docs not connected. An admin needs to connect Google in Settings.',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if token is still valid and not expired
    const expiresAt = new Date(tokenData.token_expires_at);
    const now = new Date();
    const bufferMs = 5 * 60 * 1000; // 5 minute buffer
    const isExpired = expiresAt.getTime() - bufferMs <= now.getTime();

    // If token is valid and not expired, return it
    if (tokenData.is_valid && !isExpired) {
      await supabaseAdmin
        .from('google_oauth_tokens')
        .update({ last_used_at: now.toISOString() })
        .eq('id', tokenData.id);

      return new Response(JSON.stringify({
        valid: true,
        accessToken: tokenData.access_token,
        email: tokenData.google_email,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Token needs refresh — either expired or marked invalid
    console.log(`[google-get-token] Token needs refresh for org ${organizationId} - is_valid: ${tokenData.is_valid}, isExpired: ${isExpired}`);

    if (!tokenData.refresh_token) {
      // No refresh token — permanent failure, need re-OAuth
      await supabaseAdmin
        .from('google_oauth_tokens')
        .update({ is_valid: false })
        .eq('id', tokenData.id);

      return new Response(JSON.stringify({
        valid: false,
        reason: 'no_refresh_token',
        error: 'Google connection expired. An admin needs to reconnect in Settings.',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({
        valid: false,
        reason: 'config_error',
        error: 'Google OAuth not configured on server',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Attempt refresh
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
      const errorText = await refreshResponse.text();
      console.error(`[google-get-token] Refresh failed: ${errorText}`);

      const isPermanent = errorText.includes('invalid_grant') ||
                          errorText.includes('Token has been revoked') ||
                          errorText.includes('unauthorized_client');

      if (isPermanent) {
        await supabaseAdmin
          .from('google_oauth_tokens')
          .update({ is_valid: false })
          .eq('id', tokenData.id);
      }

      return new Response(JSON.stringify({
        valid: false,
        reason: isPermanent ? 'token_revoked' : 'refresh_failed',
        error: isPermanent
          ? 'Google connection expired. An admin needs to reconnect in Settings.'
          : 'Failed to refresh Google token. Please try again.',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Refresh succeeded — update database
    const newTokens = await refreshResponse.json();
    const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

    await supabaseAdmin
      .from('google_oauth_tokens')
      .update({
        access_token: newTokens.access_token,
        token_expires_at: newExpiresAt,
        last_used_at: new Date().toISOString(),
        is_valid: true,
      })
      .eq('id', tokenData.id);

    console.log(`[google-get-token] Token refreshed and stored for org ${organizationId}`);

    return new Response(JSON.stringify({
      valid: true,
      accessToken: newTokens.access_token,
      email: tokenData.google_email,
      refreshed: true,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[google-get-token] Error:', error);
    return new Response(JSON.stringify({
      valid: false,
      reason: 'internal_error',
      error: error instanceof Error ? error.message : 'Internal error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
