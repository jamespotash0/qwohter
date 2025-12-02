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

export interface InviteTokenValidationResult {
  success: boolean;
  data: InviteToken | null;
  error: {
    type: 'expired' | 'used' | 'revoked' | 'not_found' | 'invalid';
    message: string;
    userMessage: string; // User-friendly message
  } | null;
}

/**
 * Validate and retrieve invite token information with detailed error info
 * Checks for: not used, not revoked, not expired
 * Uses RPC function to bypass RLS for anonymous users
 *
 * Returns detailed validation result for better UX
 */
export const validateInviteTokenDetailed = async (token: string): Promise<InviteTokenValidationResult> => {
  if (!token || token.trim().length === 0) {
    return {
      success: false,
      data: null,
      error: {
        type: 'invalid',
        message: 'Token is empty or invalid',
        userMessage: 'Invalid invitation link. Please check the link and try again.'
      }
    };
  }

  try {
    // Use RPC function to validate token (bypasses RLS for anonymous users)
    const { data, error } = await (supabase.rpc as any)(
      'validate_invite_token',
      { token_value: token }
    ).maybeSingle();

    if (error) {
      console.error('Token validation RPC error:', error);
      return {
        success: false,
        data: null,
        error: {
          type: 'invalid',
          message: error.message,
          userMessage: 'Failed to validate invitation link. Please try again or contact support.'
        }
      };
    }

    if (!data) {
      // Token not found or failed validation in RPC
      // Need to check raw token data to determine why
      const { data: rawToken } = await supabase
        .from('invite_tokens')
        .select('is_used, revoked_at, expires_at')
        .eq('token', token)
        .maybeSingle<{ is_used: boolean; revoked_at: string | null; expires_at: string }>();

      if (!rawToken) {
        return {
          success: false,
          data: null,
          error: {
            type: 'not_found',
            message: 'Token not found in database',
            userMessage: 'This invitation link is invalid or has been removed. Please contact your administrator for a new invitation.'
          }
        };
      }

      // Check why token failed validation
      if (rawToken.is_used) {
        return {
          success: false,
          data: null,
          error: {
            type: 'used',
            message: 'Token has already been used',
            userMessage: 'This invitation has already been accepted. If you believe this is an error, please contact your administrator.'
          }
        };
      }

      if (rawToken.revoked_at) {
        return {
          success: false,
          data: null,
          error: {
            type: 'revoked',
            message: 'Token has been revoked',
            userMessage: 'This invitation has been revoked. Please contact your administrator for a new invitation.'
          }
        };
      }

      if (new Date(rawToken.expires_at) < new Date()) {
        return {
          success: false,
          data: null,
          error: {
            type: 'expired',
            message: 'Token has expired',
            userMessage: 'This invitation link has expired. Please contact your administrator for a new invitation.'
          }
        };
      }

      // Unknown reason
      return {
        success: false,
        data: null,
        error: {
          type: 'invalid',
          message: 'Token validation failed for unknown reason',
          userMessage: 'This invitation link is invalid. Please contact your administrator for assistance.'
        }
      };
    }

    // Token is valid
    return {
      success: true,
      data: data as InviteToken,
      error: null
    };
  } catch (error) {
    console.error('Token validation exception:', error);
    return {
      success: false,
      data: null,
      error: {
        type: 'invalid',
        message: error instanceof Error ? error.message : String(error),
        userMessage: 'An error occurred while validating the invitation. Please try again.'
      }
    };
  }
};

/**
 * Validate and retrieve invite token information (legacy - returns null on failure)
 * Checks for: not used, not revoked, not expired
 * Uses RPC function to bypass RLS for anonymous users
 *
 * @deprecated Use validateInviteTokenDetailed for better error handling
 */
export const validateInviteToken = async (token: string): Promise<InviteToken | null> => {
  const result = await validateInviteTokenDetailed(token);
  return result.success ? result.data : null;
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
 * Clean up expired and old revoked tokens
 * - Deletes expired tokens
 * - Deletes revoked tokens older than 30 days
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
  let totalDeleted = 0;

  // 1. Delete expired tokens
  const { data: expiredData, error: expiredError } = await supabase
    .from('invite_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (expiredError) {
    console.error('Error cleaning up expired tokens:', expiredError);
  } else {
    totalDeleted += expiredData?.length || 0;
  }

  // 2. Delete revoked tokens older than 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: revokedData, error: revokedError } = await supabase
    .from('invite_tokens')
    .delete()
    .not('revoked_at', 'is', null)
    .lt('revoked_at', thirtyDaysAgo.toISOString())
    .select('id');

  if (revokedError) {
    console.error('Error cleaning up old revoked tokens:', revokedError);
  } else {
    totalDeleted += revokedData?.length || 0;
  }

  return totalDeleted;
};