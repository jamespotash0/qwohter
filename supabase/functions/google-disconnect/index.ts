/**
 * Google Disconnect Edge Function
 *
 * Revokes the organization's OAuth token and removes it from the database.
 * Now org-level: only admins can disconnect (enforced by RLS on client side).
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
    const { organizationId }: RequestBody = await req.json();

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

    // Get the org's token (org-level: query by organization_id only)
    const { data: tokenData } = await supabaseAdmin
      .from('google_oauth_tokens')
      .select('access_token')
      .eq('organization_id', organizationId)
      .single();

    if (tokenData?.access_token) {
      // Revoke the token with Google (best effort)
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenData.access_token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
      } catch (revokeError) {
        console.warn('Token revocation failed (continuing anyway):', revokeError);
      }
    }

    // Delete org-level token from database
    await supabaseAdmin
      .from('google_oauth_tokens')
      .delete()
      .eq('organization_id', organizationId);

    // Update integration status
    await supabaseAdmin
      .from('integrations')
      .update({
        is_connected: false,
        connection_status: 'Disconnected',
        updated_at: new Date().toISOString(),
        settings: null, // Clear settings on disconnect
      })
      .eq('organization_id', organizationId)
      .eq('integration_type', 'google_docs');

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Disconnect error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to disconnect',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
