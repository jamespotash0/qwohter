/**
 * QuickBooks Desktop Setup Edge Function
 *
 * Handles connection creation with password hashing
 */
//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
//@ts-ignore
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

//@ts-ignore
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
//@ts-ignore
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CreateConnectionRequest {
  organization_id: string;
  company_file_name: string;
  username: string;
  password: string;
  sync_frequency_minutes?: number;
}
//@ts-ignore
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const connectionData: CreateConnectionRequest = await req.json();

    // Validate required fields
    if (!connectionData.organization_id || !connectionData.company_file_name ||
        !connectionData.username || !connectionData.password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('quickbooks_desktop_connections')
      .select('id')
      .eq('organization_id', connectionData.organization_id)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'QuickBooks Desktop already connected for this organization' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(connectionData.password);

    // Create connection
    const { data: connection, error } = await supabase
      .from('quickbooks_desktop_connections')
      .insert({
        organization_id: connectionData.organization_id,
        company_file_name: connectionData.company_file_name,
        username: connectionData.username,
        password_hash: passwordHash,
        sync_frequency_minutes: connectionData.sync_frequency_minutes || 15,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create connection:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create connection' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Don't return password hash to client
    const { password_hash, ...safeConnection } = connection;

    return new Response(
      JSON.stringify({ connection: safeConnection }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Setup error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
