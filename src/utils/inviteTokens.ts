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
    type: 'Expired' | 'Used' | 'Revoked' | 'NotFound' | 'Invalid';
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
        type: 'Invalid',
        message: 'Token is empty or invalid',
        userMessage: 'Invalid invitation link. Please check the link and try again.'
      }
    };
  }

  try {
    // Use RPC function that returns error type (bypasses RLS for anonymous users)
    const { data, error } = await (supabase.rpc as any)(
      'validate_invite_token_with_error',
      { token_value: token }
    ).maybeSingle();

    if (error) {
      console.error('Token validation RPC error:', error);
      return {
        success: false,
        data: null,
        error: {
          type: 'Invalid',
          message: error.message,
          userMessage: 'Failed to validate invitation link. Please try again or contact support.'
        }
      };
    }

    // Check the error_type returned by the RPC
    if (data?.error_type) {
      const errorType = data.error_type as 'Used' | 'Revoked' | 'Expired' | 'NotFound';
      const errorMessages: Record<'Used' | 'Revoked' | 'Expired' | 'NotFound', { message: string; userMessage: string }> = {
        'Used': {
          message: 'Token has already been used',
          userMessage: 'This invitation has already been accepted. If you believe this is an error, please contact your administrator.'
        },
        'Revoked': {
          message: 'Token has been revoked',
          userMessage: 'This invitation has been revoked. Please contact your administrator for a new invitation.'
        },
        'Expired': {
          message: 'Token has expired',
          userMessage: 'This invitation link has expired. Please contact your administrator for a new invitation.'
        },
        'NotFound': {
          message: 'Token not found in database',
          userMessage: 'This invitation link is invalid or has been removed. Please contact your administrator for a new invitation.'
        }
      };

      const errorInfo = errorMessages[errorType];
      return {
        success: false,
        data: null,
        error: {
          type: errorType,
          message: errorInfo.message,
          userMessage: errorInfo.userMessage
        }
      };
    }

    // No error_type means token is valid
    if (!data || !data.id) {
      return {
        success: false,
        data: null,
        error: {
          type: 'NotFound',
          message: 'Token not found in database',
          userMessage: 'This invitation link is invalid or has been removed. Please contact your administrator for a new invitation.'
        }
      };
    }

    // Token is valid - return the data
    return {
      success: true,
      data: {
        id: data.id,
        token: data.token,
        email: data.email,
        organization_id: data.organization_id,
        role: data.role,
        created_by: data.created_by,
        expires_at: data.expires_at,
        created_at: data.created_at,
        is_used: data.is_used,
        department: data.department,
        revoked_at: data.revoked_at,
      } as InviteToken,
      error: null
    };
  } catch (error) {
    console.error('Token validation exception:', error);
    return {
      success: false,
      data: null,
      error: {
        type: 'Invalid',
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

// ============================================================================
// Signup Invite Token Functions
// These are invites from the platform owner for new organizations to sign up
// ============================================================================

export interface SignupInviteToken {
  id: string;
  token: string;
  email: string;
  expires_at: string;
  is_used: boolean;
  used_at: string | null;
  used_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
  email_sent_at: string | null;
  email_error: string | null;
}

export interface SignupInviteValidationResult {
  success: boolean;
  data: SignupInviteToken | null;
  error: {
    type: 'Expired' | 'Used' | 'Revoked' | 'NotFound' | 'Invalid';
    message: string;
    userMessage: string;
  } | null;
}

/**
 * Validate signup invite token
 * Uses the validate_signup_invite RPC function to bypass RLS
 */
export const validateSignupInviteToken = async (token: string): Promise<SignupInviteValidationResult> => {
  if (!token || token.trim().length === 0) {
    return {
      success: false,
      data: null,
      error: {
        type: 'Invalid',
        message: 'Token is empty or invalid',
        userMessage: 'Invalid invitation link. Please check the link and try again.'
      }
    };
  }

  try {
    // Use RPC function to validate signup invite (bypasses RLS for anonymous users)
    const { data, error } = await (supabase.rpc as any)(
      'validate_signup_invite',
      { token_value: token.trim() }
    ).maybeSingle();

    if (error) {
      console.error('Signup invite validation RPC error:', error);
      return {
        success: false,
        data: null,
        error: {
          type: 'Invalid',
          message: error.message,
          userMessage: 'Failed to validate invitation link. Please try again or contact support.'
        }
      };
    }

    if (!data || !data.id) {
      return {
        success: false,
        data: null,
        error: {
          type: 'NotFound',
          message: 'Signup invite token not found',
          userMessage: 'This invitation link is invalid or has expired. Please contact support for a new invitation.'
        }
      };
    }

    // Check if token is used
    if (data.is_used) {
      return {
        success: false,
        data: null,
        error: {
          type: 'Used',
          message: 'Signup invite token has already been used',
          userMessage: 'This invitation has already been used. Please contact support if you need a new invitation.'
        }
      };
    }

    // Check if token is expired
    if (new Date(data.expires_at) < new Date()) {
      return {
        success: false,
        data: null,
        error: {
          type: 'Expired',
          message: 'Signup invite token has expired',
          userMessage: 'This invitation has expired. Please contact support for a new invitation.'
        }
      };
    }

    // Token is valid
    return {
      success: true,
      data: data as SignupInviteToken,
      error: null
    };
  } catch (error) {
    console.error('Signup invite validation exception:', error);
    return {
      success: false,
      data: null,
      error: {
        type: 'Invalid',
        message: error instanceof Error ? error.message : String(error),
        userMessage: 'An error occurred while validating the invitation. Please try again.'
      }
    };
  }
};

/**
 * Mark signup invite token as used
 */
export const markSignupInviteAsUsed = async (token: string, userId: string): Promise<boolean> => {
  const { error } = await (supabase
    .from('signup_invites') as any)
    .update({
      is_used: true,
      used_at: new Date().toISOString(),
      used_by_user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('token', token);

  if (error) {
    console.error('Error marking signup invite as used:', error);
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