/**
 * Development Impersonation Edge Function
 *
 * Generates a magic link for user impersonation during local development.
 * The service role key stays server-side - never exposed to the client.
 *
 * SECURITY:
 * - Only works when called from localhost origins
 * - Requires DEV_IMPERSONATE_SECRET environment variable
 * - Logs all impersonation attempts
 *
 * USAGE (from browser console in local dev):
 *   fetch('http://localhost:54321/functions/v1/dev-impersonate', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ email: 'user@example.com', secret: 'your-dev-secret' })
 *   }).then(r => r.json()).then(d => { if(d.url) window.location.href = d.url; else console.error(d); });
 */

// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // =================================================================
    // SECURITY CHECK 1: Only allow from localhost origins
    // =================================================================
    const origin = req.headers.get('origin') || '';
    const referer = req.headers.get('referer') || '';

    const allowedPatterns = [
      'http://localhost:',
      'http://127.0.0.1:',
      'http://[::1]:',
    ];

    const isLocalOrigin = allowedPatterns.some(
      pattern => origin.startsWith(pattern) || referer.startsWith(pattern)
    );

    if (!isLocalOrigin) {
      console.error('[dev-impersonate] Blocked non-local request:', { origin, referer });
      return new Response(
        JSON.stringify({ error: 'This endpoint is only available in local development' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =================================================================
    // SECURITY CHECK 2: Require dev secret
    // =================================================================
    // @ts-ignore
    const devSecret = Deno.env.get('DEV_IMPERSONATE_SECRET');

    if (!devSecret) {
      return new Response(
        JSON.stringify({
          error: 'DEV_IMPERSONATE_SECRET not configured',
          hint: 'Add DEV_IMPERSONATE_SECRET to your .env.local and supabase secrets'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { email, secret } = body;

    if (!secret || secret !== devSecret) {
      console.error('[dev-impersonate] Invalid secret attempt for:', email);
      return new Response(
        JSON.stringify({ error: 'Invalid development secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =================================================================
    // Generate magic link using service role (server-side only)
    // =================================================================
    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    // @ts-ignore
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // First check if user exists
    const { data: userData, error: userError } = await adminClient.auth.admin.listUsers();
    const userExists = userData?.users?.some((u: any) => u.email === email);

    if (!userExists) {
      return new Response(
        JSON.stringify({ error: `User not found: ${email}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate magic link
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: origin || 'http://localhost:5173',
      },
    });

    if (error) {
      console.error('[dev-impersonate] Failed to generate link:', error.message);
      return new Response(
        JSON.stringify({ error: `Failed to generate link: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const actionLink = data?.properties?.action_link;
    if (!actionLink) {
      return new Response(
        JSON.stringify({ error: 'No action link generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[dev-impersonate] Generated link for:', email);

    return new Response(
      JSON.stringify({
        success: true,
        url: actionLink,
        email,
        message: 'Redirecting to login...'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[dev-impersonate] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
