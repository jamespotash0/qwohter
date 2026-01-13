/**
 * Google RISC (Cross-Account Protection) Receiver
 *
 * Receives Security Event Tokens (SETs) from Google when security events occur
 * such as token revocation, account suspension, or session termination.
 *
 * This endpoint is called by Google's RISC system - no user auth required.
 * JWT signature verification ensures requests are from Google.
 *
 * Security Events Handled:
 * - tokens-revoked: User revoked access via Google account settings
 * - account-disabled: Google disabled the user's account
 * - sessions-revoked: All sessions were terminated
 * - account-enabled: Account was re-enabled (informational)
 *
 * Setup Required:
 * 1. Register this endpoint with Google RISC API
 * 2. Store GOOGLE_RISC_AUDIENCE in Supabase secrets (your client ID)
 *
 * @see https://developers.google.com/identity/protocols/risc
 */

//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
//@ts-ignore
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
};

// Google's JWKS endpoint for verifying Security Event Tokens
const GOOGLE_JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';

// RISC event type URIs
const RISC_EVENTS = {
  TOKENS_REVOKED: 'https://schemas.openid.net/secevent/risc/event-type/tokens-revoked',
  ACCOUNT_DISABLED: 'https://schemas.openid.net/secevent/risc/event-type/account-disabled',
  SESSIONS_REVOKED: 'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked',
  ACCOUNT_ENABLED: 'https://schemas.openid.net/secevent/risc/event-type/account-enabled',
  ACCOUNT_CREDENTIAL_CHANGE_REQUIRED: 'https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required',
  ACCOUNT_PURGED: 'https://schemas.openid.net/secevent/risc/event-type/account-purged',
} as const;

interface RiscEventPayload {
  iss: string; // Issuer (accounts.google.com)
  aud: string; // Audience (your client ID)
  iat: number; // Issued at
  jti: string; // Unique event ID
  events: {
    [eventType: string]: {
      subject?: {
        subject_type: string;
        email?: string;
        iss?: string;
        sub?: string;
      };
      reason?: string;
    };
  };
}

//@ts-ignore
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get the JWT from the request body
    const contentType = req.headers.get('content-type') || '';
    let token: string;

    if (contentType.includes('application/secevent+jwt')) {
      // Standard RISC format: JWT in body directly
      token = await req.text();
    } else if (contentType.includes('application/json')) {
      // Alternative: JSON wrapper
      const body = await req.json();
      token = body.token || body.jwt || body.security_event_token;
    } else {
      // Try reading as plain text
      token = await req.text();
    }

    if (!token) {
      console.error('[google-risc-receiver] No token in request');
      return new Response(JSON.stringify({ error: 'Missing security event token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[google-risc-receiver] Received security event token');

    // Verify the JWT signature using Google's public keys
    //@ts-ignore
    const JWKS = jose.createRemoteJWKSet(new URL(GOOGLE_JWKS_URI));

    // Expected audience is our Google Client ID
    //@ts-ignore
    const expectedAudience = Deno.env.get('GOOGLE_CLIENT_ID');
    if (!expectedAudience) {
      console.error('[google-risc-receiver] GOOGLE_CLIENT_ID not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let payload: RiscEventPayload;
    try {
      const { payload: verifiedPayload } = await jose.jwtVerify(token, JWKS, {
        issuer: 'https://accounts.google.com',
        audience: expectedAudience,
      });
      payload = verifiedPayload as unknown as RiscEventPayload;
    } catch (verifyError) {
      console.error('[google-risc-receiver] JWT verification failed:', verifyError);
      return new Response(JSON.stringify({ error: 'Invalid security event token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[google-risc-receiver] JWT verified, processing events:', {
      jti: payload.jti,
      events: Object.keys(payload.events),
    });

    // Create Supabase admin client
    //@ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    //@ts-ignore
    const supabaseAdmin = createClient(
      supabaseUrl,
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Process each event in the payload
    for (const [eventType, eventData] of Object.entries(payload.events)) {
      console.log(`[google-risc-receiver] Processing event: ${eventType}`);

      // Extract subject email (the Google account affected)
      const subjectEmail = eventData.subject?.email;
      if (!subjectEmail) {
        console.warn('[google-risc-receiver] No email in event subject, skipping');
        continue;
      }

      // Find affected tokens by Google email
      const { data: affectedTokens, error: queryError } = await supabaseAdmin
        .from('google_oauth_tokens')
        .select('id, organization_id, google_email')
        .eq('google_email', subjectEmail);

      if (queryError) {
        console.error('[google-risc-receiver] Failed to query tokens:', queryError);
        continue;
      }

      if (!affectedTokens || affectedTokens.length === 0) {
        console.log(`[google-risc-receiver] No tokens found for email: ${subjectEmail}`);
        continue;
      }

      console.log(`[google-risc-receiver] Found ${affectedTokens.length} token(s) for ${subjectEmail}`);

      // Handle each event type
      switch (eventType) {
        case RISC_EVENTS.TOKENS_REVOKED:
        case RISC_EVENTS.ACCOUNT_DISABLED:
        case RISC_EVENTS.SESSIONS_REVOKED:
        case RISC_EVENTS.ACCOUNT_PURGED:
        case RISC_EVENTS.ACCOUNT_CREDENTIAL_CHANGE_REQUIRED:
          // Mark tokens as invalid and clear the access token (security measure)
          await handleTokenInvalidation(supabaseAdmin, affectedTokens, eventType, eventData.reason);
          break;

        case RISC_EVENTS.ACCOUNT_ENABLED:
          // Account re-enabled - log but don't auto-revalidate (user should reconnect)
          console.log(`[google-risc-receiver] Account re-enabled for ${subjectEmail} - user should reconnect`);
          break;

        default:
          console.warn(`[google-risc-receiver] Unknown event type: ${eventType}`);
      }
    }

    // Always return 200 to acknowledge receipt (Google expects this)
    return new Response(JSON.stringify({ success: true, jti: payload.jti }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[google-risc-receiver] Error processing security event:', error);
    // Return 200 anyway to prevent Google from retrying indefinitely
    // Log the error for investigation
    return new Response(JSON.stringify({ success: true, error: 'Processed with errors' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Handle token invalidation for security events
 */
async function handleTokenInvalidation(
  supabaseAdmin: ReturnType<typeof createClient>,
  affectedTokens: Array<{ id: string; organization_id: string; google_email: string }>,
  eventType: string,
  reason?: string
): Promise<void> {
  const eventShortName = eventType.split('/').pop();

  for (const token of affectedTokens) {
    console.log(`[google-risc-receiver] Invalidating token for org ${token.organization_id} (${eventShortName})`);

    // Mark token as invalid and clear the access token (invalidated for security)
    // Note: access_token is NOT NULL in the schema, so we set it to 'REVOKED' marker
    const { error: updateError } = await supabaseAdmin
      .from('google_oauth_tokens')
      .update({
        is_valid: false,
        access_token: 'REVOKED_BY_RISC_EVENT', // Marker to indicate token was revoked
        updated_at: new Date().toISOString(),
        // Store the reason for audit/debugging
        last_risc_event: {
          event_type: eventShortName,
          reason: reason || null,
          received_at: new Date().toISOString(),
        },
      })
      .eq('id', token.id);

    if (updateError) {
      console.error(`[google-risc-receiver] Failed to invalidate token ${token.id}:`, updateError);
      continue;
    }

    // Update integration status
    const { error: integrationError } = await supabaseAdmin
      .from('integrations')
      .update({
        is_connected: false,
        connection_status: 'Disconnected (Security Event)',
        connection_error: `Google security event: ${eventShortName}`,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', token.organization_id)
      .eq('integration_type', 'google_docs');

    if (integrationError) {
      console.error(`[google-risc-receiver] Failed to update integration status:`, integrationError);
    }

    console.log(`[google-risc-receiver] Token invalidated successfully for org ${token.organization_id}`);
  }
}
