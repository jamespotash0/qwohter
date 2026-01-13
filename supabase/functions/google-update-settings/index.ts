/**
 * Google Update Settings Edge Function
 *
 * Updates Google integration settings like folder ID without requiring re-authentication.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  organizationId: string;
  driveFolderId?: string | null; // null to clear folder
}

serve(async (req) => {
  console.log('[google-update-settings] Request received');

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
    const { organizationId, driveFolderId }: RequestBody = await req.json();

    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'Organization ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for database updates
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify the organization has a Google connection (don't filter by is_valid - allow updating settings even if token needs refresh)
    console.log(`[google-update-settings] Looking for token for org: ${organizationId}`);

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('google_oauth_tokens')
      .select('id, is_valid')
      .eq('organization_id', organizationId)
      .single();

    console.log(`[google-update-settings] Token lookup - error: ${tokenError?.message || 'none'}, found: ${!!tokenData}, is_valid: ${tokenData?.is_valid}`);

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: 'Google not connected. Please connect in Settings → Integrations.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update folder ID in google_oauth_tokens
    const { error: updateTokenError } = await supabaseAdmin
      .from('google_oauth_tokens')
      .update({
        drive_folder_id: driveFolderId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId);

    if (updateTokenError) {
      console.error('Failed to update tokens table:', updateTokenError);
      return new Response(JSON.stringify({ error: 'Failed to update settings' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Also update settings in integrations table
    // First get current settings, then merge
    const { data: integrationData } = await supabaseAdmin
      .from('integrations')
      .select('settings')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'google_docs')
      .single();

    const currentSettings = integrationData?.settings || {};
    const updatedSettings = {
      ...currentSettings,
      drive_folder_id: driveFolderId || null,
    };

    const { error: updateIntegrationError } = await supabaseAdmin
      .from('integrations')
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('integration_type', 'google_docs');

    // Don't fail if integrations update fails - tokens table is the source of truth
    if (updateIntegrationError) {
      console.warn('Failed to update integrations table:', updateIntegrationError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        driveFolderId: driveFolderId || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Update settings error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to update settings',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
