/**
 * Secure invite token generation and validation utilities
 */

import { supabase } from "@/integrations/supabase/client";

export interface InviteToken {
  id: string;
  token: string;
  email: string;
  organization_id: string;
  role: 'Admin' | 'Member';
  created_by: string;
  expires_at: string;
  created_at: string;
  is_used: boolean;
  department?: string | null;
  revoked_at?: string | null;
}

/**
 * Generate a secure random token
 */
export const generateSecureToken = (): string => {
  // Generate a random string using crypto API for security
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Create a new invite token with expiration
 */
export const createInviteToken = async (
  organizationId: string,
  role: 'Admin' | 'Member',
  createdBy: string,
  expiryHours: number = 2,
  department?: string,
  email?: string
): Promise<{ token: string; expires_at: string }> => {
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiryHours);

  const { error } = await supabase
    .from('invite_tokens')
    .insert({
      token,
      organization_id: organizationId,
      role,
      created_by: createdBy,
      expires_at: expiresAt.toISOString(),
      is_used: false,
      email: email || '',
      department: department || null,
    } as any);

  if (error) {
    console.error('Error creating invite token:', error);
    throw new Error('Failed to create invite token');
  }

  return {
    token,
    expires_at: expiresAt.toISOString()
  };
};

/**
 * Validate and retrieve invite token information
 * Checks for: not used, not revoked, not expired
 * Uses RPC function to bypass RLS for anonymous users
 */
export const validateInviteToken = async (token: string): Promise<InviteToken | null> => {
  if (!token || token.trim().length === 0) {
    return null;
  }

  // Use RPC function to validate token (bypasses RLS for anonymous users)
  const { data, error } = await (supabase.rpc as any)(
    'validate_invite_token',
    { token_value: token }
  ).maybeSingle();

  if (error) {
    console.error('Token validation error:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return data as InviteToken;
};

/**
 * Mark invite token as used
 */
export const markTokenAsUsed = async (token: string): Promise<boolean> => {
  const { error } = await (supabase
    .from('invite_tokens') as any)
    .update({ is_used: true })
    .eq('token', token);

  if (error) {
    console.error('Error marking token as used:', error);
    return false;
  }

  return true;
};

/**
 * Clean up expired tokens (should be run periodically)
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('invite_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) {
    console.error('Error cleaning up expired tokens:', error);
    return 0;
  }

  return data?.length || 0;
};