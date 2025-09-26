/**
 * Secure invite token generation and validation utilities
 */

import { supabase } from "@/integrations/supabase/client";

export interface InviteToken {
  id: string;
  token: string;
  organization_id: string;
  organization_code: string;
  role: 'Admin' | 'Member';
  created_by: string;
  expires_at: string;
  created_at: string;
  is_used: boolean;
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
  organizationCode: string,
  role: 'Admin' | 'Member',
  createdBy: string,
  expiryDays: number = 7
): Promise<{ token: string; expires_at: string }> => {
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const { error } = await supabase
    .from('invite_tokens')
    .insert({
      token,
      organization_id: organizationId,
      organization_code: organizationCode,
      role,
      created_by: createdBy,
      expires_at: expiresAt.toISOString(),
      is_used: false
    });

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
 */
export const validateInviteToken = async (token: string): Promise<InviteToken | null> => {
  if (!token || token.trim().length === 0) {
    return null;
  }

  const { data, error } = await supabase
    .from('invite_tokens')
    .select('*')
    .eq('token', token)
    .eq('is_used', false)
    .single();

  if (error || !data) {
    console.log('Invalid invite token:', error?.message);
    return null;
  }

  // Check if token has expired
  const now = new Date();
  const expiresAt = new Date(data.expires_at);

  if (now > expiresAt) {
    console.log('Invite token has expired');
    return null;
  }

  return data as InviteToken;
};

/**
 * Mark invite token as used
 */
export const markTokenAsUsed = async (token: string): Promise<boolean> => {
  const { error } = await supabase
    .from('invite_tokens')
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