/**
 * Google Docs Integration Service
 *
 * Handles OAuth flow for Google Docs integration.
 * Users connect their Google account to generate documents in their own Drive.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  GoogleOAuthToken,
  GoogleOAuthState,
  GoogleTokenResponse,
  GoogleUserInfo,
} from '@/lib/types/integrations';

// Google OAuth configuration
// These should match what's configured in Google Cloud Console
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI = `${window.location.origin}/auth/google/callback`;

// Scopes needed for Google Docs generation and template selection
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file', // Create/edit files created by the app
  'https://www.googleapis.com/auth/drive.readonly', // Read existing files for template selection
  'https://www.googleapis.com/auth/documents', // Edit Google Docs
  'https://www.googleapis.com/auth/userinfo.email', // Get user email
  'https://www.googleapis.com/auth/userinfo.profile', // Get user name
].join(' ');

// ============================================================================
// OAuth Flow
// ============================================================================

/**
 * Generate the Google OAuth authorization URL
 */
export function getGoogleAuthUrl(
  organizationId: string,
  userId: string,
  driveFolderId?: string
): string {
  // Generate a random nonce for security
  const nonce = crypto.randomUUID();

  // Create state object to verify callback (includes folder ID)
  const state: GoogleOAuthState & { drive_folder_id?: string } = {
    organization_id: organizationId,
    user_id: userId,
    return_url: window.location.href,
    nonce,
    drive_folder_id: driveFolderId,
  };

  // Store state in sessionStorage for verification
  sessionStorage.setItem('google_oauth_state', JSON.stringify(state));

  // Build the authorization URL
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline', // Get refresh token
    prompt: 'consent', // Always show consent to get refresh token
    include_granted_scopes: 'true', // Enable incremental authorization
    state: btoa(JSON.stringify(state)),
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Handle the OAuth callback - exchange code for tokens
 */
export async function handleGoogleOAuthCallback(
  code: string,
  state: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Decode and verify state (URL-decode first, then base64 decode)
    const decodedState: GoogleOAuthState = JSON.parse(atob(decodeURIComponent(state)));
    const storedState = sessionStorage.getItem('google_oauth_state');

    if (!storedState) {
      return { success: false, error: 'OAuth state not found' };
    }

    const parsedStoredState: GoogleOAuthState = JSON.parse(storedState);

    if (decodedState.nonce !== parsedStoredState.nonce) {
      return { success: false, error: 'Invalid OAuth state' };
    }

    // Clear stored state
    sessionStorage.removeItem('google_oauth_state');

    // Extract folder ID from state (if provided during OAuth init)
    const driveFolderId = (decodedState as GoogleOAuthState & { drive_folder_id?: string }).drive_folder_id;

    // Exchange code for tokens via edge function
    const { data, error } = await supabase.functions.invoke('google-oauth-callback', {
      body: {
        code,
        redirectUri: GOOGLE_REDIRECT_URI,
        organizationId: decodedState.organization_id,
        driveFolderId,
      },
    });

    if (error) {
      console.error('OAuth callback error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('OAuth callback failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete OAuth',
    };
  }
}

// ============================================================================
// Token Management
// ============================================================================

/**
 * Get the organization's Google OAuth token
 * Now org-level: one token per organization, connected by an admin
 * Does NOT filter by is_valid — returns token regardless so we can attempt refresh
 */
export async function getGoogleToken(
  organizationId: string
): Promise<GoogleOAuthToken | null> {
  const { data, error } = await supabase
    .from('google_oauth_tokens')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows
    console.error('Failed to fetch Google token:', error);
    return null;
  }

  return data as GoogleOAuthToken;
}

/**
 * Check if organization has Google connected (admin connected once for entire org)
 */
export async function isGoogleConnected(organizationId: string): Promise<boolean> {
  const token = await getGoogleToken(organizationId);
  return token !== null;
}

/**
 * Get a valid access token (refreshes if expired)
 * Calls edge function that handles token refresh securely server-side
 */
export async function getValidAccessToken(
  organizationId: string
): Promise<{ valid: boolean; accessToken?: string; email?: string; reason?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('google-get-token', {
    body: { organizationId },
  });

  if (error) {
    console.error('Failed to get valid access token:', error);
    return { valid: false, reason: 'invoke_error', error: error.message };
  }

  return data;
}

/**
 * Disconnect Google integration (revoke and delete tokens)
 * Only admins can disconnect - enforced by RLS policy
 */
export async function disconnectGoogle(organizationId: string): Promise<void> {
  // Call edge function to revoke token with Google
  await supabase.functions.invoke('google-disconnect', {
    body: { organizationId },
  });

  // Delete from database (RLS ensures only admins can delete)
  const { error } = await supabase
    .from('google_oauth_tokens')
    .delete()
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Failed to delete Google token:', error);
    throw new Error('Failed to disconnect Google');
  }
}

// ============================================================================
// Connection Status
// ============================================================================

/**
 * Get Google connection details for display.
 * Proactively validates/refreshes the token via edge function so
 * the UI always reflects the true connection state.
 */
export async function getGoogleConnectionStatus(
  organizationId: string
): Promise<{
  isConnected: boolean;
  email?: string;
  name?: string;
  expiresAt?: string;
  needsReconnection?: boolean;
  reason?: string;
}> {
  // First check if a token row exists at all
  const token = await getGoogleToken(organizationId);

  if (!token) {
    return { isConnected: false };
  }

  // Check if token is expired or marked invalid — if so, attempt refresh
  const expiresAt = new Date(token.token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutes
  const isExpired = expiresAt.getTime() - bufferMs <= now.getTime();

  if (!token.is_valid || isExpired) {
    // Proactively refresh via edge function
    const refreshResult = await getValidAccessToken(organizationId);

    if (refreshResult.valid) {
      // Refresh succeeded — token is now valid
      return {
        isConnected: true,
        email: refreshResult.email || token.google_email || undefined,
        name: token.google_name || undefined,
        expiresAt: token.token_expires_at,
      };
    }

    // Refresh failed — indicate reconnection needed
    return {
      isConnected: false,
      needsReconnection: true,
      reason: refreshResult.reason,
      email: token.google_email || undefined,
      name: token.google_name || undefined,
    };
  }

  // Token is valid and not expired
  return {
    isConnected: true,
    email: token.google_email || undefined,
    name: token.google_name || undefined,
    expiresAt: token.token_expires_at,
  };
}

// ============================================================================
// Integration Status (for IntegrationsTab)
// ============================================================================

/**
 * Update integration record when Google is connected
 */
export async function updateGoogleIntegrationStatus(
  organizationId: string,
  isConnected: boolean,
  connectionError?: string
): Promise<void> {
  const { error } = await supabase
    .from('integrations')
    .upsert({
      organization_id: organizationId,
      integration_type: 'google_docs',
      integration_name: 'Google Docs',
      is_connected: isConnected,
      connection_status: isConnected ? 'Connected' : 'Disconnected',
      connection_error: connectionError || null,
      last_connection_check_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'organization_id,integration_type',
    });

  if (error) {
    console.error('Failed to update Google integration status:', error);
  }
}
