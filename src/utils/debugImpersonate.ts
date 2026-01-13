/**
 * Debug Impersonation Utility
 *
 * Simple user impersonation for debugging.
 * Uses Supabase admin API to generate a real session.
 *
 * USAGE (browser console):
 *   window.impersonate('user@example.com')
 *
 * REQUIRES: VITE_SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function impersonateUser(email: string): Promise<void> {
  if (!import.meta.env.DEV) {
    console.error('Impersonation only works in development');
    return;
  }

  if (!SERVICE_ROLE_KEY) {
    console.error('Add VITE_SUPABASE_SERVICE_ROLE_KEY to .env.local');
    console.log('Get it from: Supabase Dashboard → Settings → API → service_role');
    return;
  }

  console.log(`Generating login link for ${email}...`);

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    console.error('Failed:', error.message);
    return;
  }

  if (data?.properties?.action_link) {
    console.log('Redirecting to login as', email);
    window.location.href = data.properties.action_link;
  } else {
    console.error('No link generated - user may not exist');
  }
}

// Register global function in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).impersonate = impersonateUser;

  if (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
    console.log('%c[Debug] window.impersonate("email") available', 'color: #22c55e');
  }
}

export { impersonateUser };
