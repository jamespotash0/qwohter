/**
 * Rate Limiting Utilities
 *
 * Provides rate limiting checks for invite token validation
 * Prevents brute force attacks by tracking failed attempts
 */

import { supabase } from '@/integrations/supabase/client';

interface RateLimitCheck {
  allowed: boolean;
  attempts_used: number;
  window_reset_at: string;
  reason: string;
}

interface RateLimitParams {
  ipAddress?: string;
  userId?: string | null;
  inviteToken?: string;
  windowMinutes?: number;
  maxAttempts?: number;
}

/**
 * Check if an invite attempt is allowed based on rate limits
 *
 * Default limits:
 * - 5 attempts per 5 minutes per IP
 * - 5 attempts per 5 minutes per user
 * - 2 attempts per 5 minutes per token (prevents scanning)
 */
export const checkInviteRateLimit = async (
  params: RateLimitParams
): Promise<RateLimitCheck> => {
  const {
    ipAddress = '0.0.0.0', // Fallback if IP detection fails
    userId = null,
    inviteToken,
    windowMinutes = 5,
    maxAttempts = 5,
  } = params;

  try {
    const { data, error } = await (supabase.rpc as any)('check_invite_rate_limit', {
      p_ip_address: ipAddress,
      p_user_id: userId,
      p_invite_token: inviteToken,
      p_window_minutes: windowMinutes,
      p_max_attempts: maxAttempts,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // On error, allow the attempt (fail open, but log it)
      return {
        allowed: true,
        attempts_used: 0,
        window_reset_at: new Date().toISOString(),
        reason: 'Rate limit check failed - allowing attempt',
      };
    }

    // RPC returns an array with a single row
    return data[0] as RateLimitCheck;
  } catch (error) {
    console.error('Rate limit check exception:', error);
    // Fail open on exception
    return {
      allowed: true,
      attempts_used: 0,
      window_reset_at: new Date().toISOString(),
      reason: 'Rate limit check exception - allowing attempt',
    };
  }
};

/**
 * Log an invite attempt (success or failure)
 */
export const logInviteAttempt = async (params: {
  ipAddress?: string;
  userId: string | null;
  inviteToken: string;
  success: boolean;
  errorMessage?: string;
}): Promise<void> => {
  const {
    ipAddress = '0.0.0.0',
    userId,
    inviteToken,
    success,
    errorMessage,
  } = params;

  try {
    const { error } = await (supabase.rpc as any)('log_invite_attempt', {
      p_ip_address: ipAddress,
      p_user_id: userId,
      p_invite_token: inviteToken,
      p_success: success,
      p_error_message: errorMessage || null,
    });

    if (error) {
      console.error('Failed to log invite attempt:', error);
      // Don't throw - logging failure shouldn't break the flow
    }
  } catch (error) {
    console.error('Exception logging invite attempt:', error);
    // Don't throw - logging failure shouldn't break the flow
  }
};

/**
 * Get user's IP address
 *
 * Two methods available:
 * 1. Edge function (recommended for production) - More secure, uses server-side headers
 * 2. Public API (current default) - Simple, works everywhere
 *
 * To switch to edge function method:
 * - Deploy supabase/functions/ip-tracking (already deployed)
 * - Change useEdgeFunction to true below
 */
export const getUserIpAddress = async (): Promise<string> => {
  const useEdgeFunction = false; // Set to true to use Supabase edge function

  if (useEdgeFunction) {
    return getUserIpFromEdgeFunction();
  } else {
    return getUserIpFromPublicAPI();
  }
};

/**
 * Get IP using Supabase Edge Function (recommended for production)
 */
const getUserIpFromEdgeFunction = async (): Promise<string> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const functionsUrl = supabaseUrl?.includes('.supabase.co')
      ? supabaseUrl.replace('.supabase.co', '.supabase.co/functions/v1')
      : `${supabaseUrl}/functions/v1`;

    const response = await fetch(`${functionsUrl}/ip-tracking`, {
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    if (response.ok) {
      const data = await response.json();
      console.log('IP detected via edge function:', data.ip);
      return data.ip || '0.0.0.0';
    }
  } catch (error) {
    console.warn('Failed to get IP from edge function:', error);
  }

  // Fallback to public API
  return getUserIpFromPublicAPI();
};

/**
 * Get IP using public API (current default)
 */
const getUserIpFromPublicAPI = async (): Promise<string> => {
  try {
    // Try to get IP from a public API
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });

    if (response.ok) {
      const data = await response.json();
      return data.ip || '0.0.0.0';
    }
  } catch (error) {
    console.warn('Failed to get IP address from public API:', error);
  }

  // Fallback to a placeholder
  return '0.0.0.0';
};

/**
 * Format time remaining for rate limit reset
 */
export const formatRateLimitReset = (resetAt: string): string => {
  const resetTime = new Date(resetAt);
  const now = new Date();
  const diffMs = resetTime.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'now';
  }

  const diffMinutes = Math.ceil(diffMs / 1000 / 60);

  if (diffMinutes === 1) {
    return '1 minute';
  }

  return `${diffMinutes} minutes`;
};
