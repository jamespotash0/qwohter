/**
 * Debug Impersonation Utility
 *
 * Calls the dev-impersonate edge function to generate a magic link.
 * The service role key stays server-side - never exposed to the browser.
 *
 * SETUP:
 * 1. Add DEV_IMPERSONATE_SECRET to .env.local
 * 2. Add DEV_IMPERSONATE_SECRET to supabase secrets: `supabase secrets set DEV_IMPERSONATE_SECRET=your-secret`
 * 3. Run `supabase functions serve` for local edge functions
 *
 * USAGE (browser console):
 *   window.impersonate('user@example.com')
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const DEV_SECRET = import.meta.env.VITE_DEV_IMPERSONATE_SECRET;

async function impersonateUser(email: string): Promise<void> {
  if (!import.meta.env.DEV) {
    console.error('❌ Impersonation only works in development');
    return;
  }

  if (!DEV_SECRET) {
    console.error('❌ Add VITE_DEV_IMPERSONATE_SECRET to .env.local');
    console.log('Then add the same secret to supabase: supabase secrets set DEV_IMPERSONATE_SECRET=your-secret');
    return;
  }

  console.log(`🔐 Generating login link for ${email}...`);

  try {
    // Call the edge function (service role key stays server-side)
    const response = await fetch(`${SUPABASE_URL}/functions/v1/dev-impersonate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        secret: DEV_SECRET,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Impersonation failed:', data.error);
      if (data.hint) {
        console.log('💡 Hint:', data.hint);
      }
      return;
    }

    if (data.url) {
      console.log('✅ Redirecting to login as', email);
      window.location.href = data.url;
    } else {
      console.error('❌ No URL returned:', data);
    }
  } catch (error) {
    console.error('❌ Failed to call impersonate function:', error);
    console.log('💡 Make sure edge functions are running: supabase functions serve');
  }
}

// Register global function in development only
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).impersonate = impersonateUser;

  if (DEV_SECRET) {
    console.log('%c[Debug] window.impersonate("email") available', 'color: #22c55e');
  }
}

export { impersonateUser };
