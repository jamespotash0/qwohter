/**
 * Auth Rate Limiting Service
 * Client-side integration with database rate limiting functions
 * Addresses vulnerabilities #1 (Login), #2 (OTP), #12 (Password Reset)
 *
 * Note: These RPC functions are created by migrations:
 * - 20260116000001_security_hardening.sql
 * - 20260116000003_fix_otp_login_rate_limiting.sql
 */

import { supabase } from '@/integrations/supabase/client';

export interface RateLimitCheckResult {
  allowed: boolean;
  blocked: boolean;
  remaining_attempts?: number;
  remaining_seconds?: number;
  blocked_until?: string;
  message?: string | null;
}

interface RecordAttemptResult {
  recorded: boolean;
  blocked: boolean;
  attempt_count: number;
}

// Type-safe RPC caller for rate limiting functions
// These functions are created by SQL migrations and may not exist until migrations are applied
type RpcFunction = typeof supabase.rpc;
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args: Record<string, unknown>
) => ReturnType<RpcFunction>;

/**
 * Check login rate limit before attempting sign in
 * Limits: 5 attempts per 15 minutes, 30 minute block
 */
export async function checkLoginRateLimit(email: string): Promise<RateLimitCheckResult> {
  try {
    const { data, error } = await rpc('check_login_rate_limit', {
      p_email: email.toLowerCase(),
    });

    if (error) {
      console.error('Login rate limit check error:', error);
      return { allowed: true, blocked: false };
    }

    return data as RateLimitCheckResult;
  } catch (error) {
    console.error('Login rate limit check failed:', error);
    return { allowed: true, blocked: false };
  }
}

/**
 * Check OTP rate limit before verification attempt
 * Limits: 3 attempts per 10 minutes, 60 minute block
 */
export async function checkOtpRateLimit(email: string): Promise<RateLimitCheckResult> {
  try {
    const { data, error } = await rpc('check_otp_rate_limit', {
      p_email: email.toLowerCase(),
    });

    if (error) {
      console.error('OTP rate limit check error:', error);
      return { allowed: true, blocked: false };
    }

    return data as RateLimitCheckResult;
  } catch (error) {
    console.error('OTP rate limit check failed:', error);
    return { allowed: true, blocked: false };
  }
}

/**
 * Record a failed login attempt
 */
export async function recordFailedLogin(email: string): Promise<RecordAttemptResult> {
  try {
    const { data, error } = await rpc('record_failed_login', {
      p_email: email.toLowerCase(),
    });

    if (error) {
      console.error('Record failed login error:', error);
      return { recorded: false, blocked: false, attempt_count: 0 };
    }

    return data as RecordAttemptResult;
  } catch (error) {
    console.error('Record failed login failed:', error);
    return { recorded: false, blocked: false, attempt_count: 0 };
  }
}

/**
 * Record a failed OTP verification attempt
 */
export async function recordFailedOtp(email: string): Promise<RecordAttemptResult> {
  try {
    const { data, error } = await rpc('record_failed_otp', {
      p_email: email.toLowerCase(),
    });

    if (error) {
      console.error('Record failed OTP error:', error);
      return { recorded: false, blocked: false, attempt_count: 0 };
    }

    return data as RecordAttemptResult;
  } catch (error) {
    console.error('Record failed OTP failed:', error);
    return { recorded: false, blocked: false, attempt_count: 0 };
  }
}

/**
 * Clear rate limit after successful authentication
 */
export async function clearRateLimit(
  email: string,
  attemptType: 'login' | 'otp'
): Promise<void> {
  try {
    const { error } = await rpc('clear_auth_rate_limit', {
      p_email: email.toLowerCase(),
      p_attempt_type: attemptType,
    });

    if (error) {
      console.error('Clear rate limit error:', error);
    }
  } catch (error) {
    console.error('Clear rate limit failed:', error);
  }
}

// Legacy function aliases for backward compatibility
type AttemptType = 'login' | 'otp' | 'password_reset' | 'signup';
type IdentifierType = 'email' | 'ip';

export async function checkAuthRateLimit(
  identifier: string,
  attemptType: AttemptType,
  _identifierType: IdentifierType = 'email'
): Promise<RateLimitCheckResult> {
  if (attemptType === 'login') {
    return checkLoginRateLimit(identifier);
  }
  if (attemptType === 'otp') {
    return checkOtpRateLimit(identifier);
  }
  // For other types, use generic rate limit check
  try {
    const { data, error } = await rpc('check_auth_rate_limit', {
      p_identifier: identifier.toLowerCase(),
      p_identifier_type: 'email',
      p_attempt_type: attemptType,
      p_max_attempts: attemptType === 'password_reset' ? 3 : 5,
      p_window_minutes: attemptType === 'password_reset' ? 60 : 15,
      p_block_duration_minutes: attemptType === 'password_reset' ? 120 : 30,
    });

    if (error) {
      return { allowed: true, blocked: false };
    }

    return data as RateLimitCheckResult;
  } catch {
    return { allowed: true, blocked: false };
  }
}

export async function recordAuthAttempt(
  identifier: string,
  attemptType: AttemptType,
  success: boolean,
  _identifierType: IdentifierType = 'email'
): Promise<{ success: boolean }> {
  if (success) {
    await clearRateLimit(identifier, attemptType as 'login' | 'otp');
    return { success: true };
  }

  if (attemptType === 'login') {
    await recordFailedLogin(identifier);
  } else if (attemptType === 'otp') {
    await recordFailedOtp(identifier);
  }

  return { success: true };
}

/**
 * Format blocked until time for display
 */
export function formatBlockedUntil(blockedUntil: string): string {
  const blockDate = new Date(blockedUntil);
  const now = new Date();
  const diffMs = blockDate.getTime() - now.getTime();
  const diffMinutes = Math.ceil(diffMs / (1000 * 60));

  if (diffMinutes <= 1) {
    return 'less than a minute';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minutes`;
  } else {
    const hours = Math.ceil(diffMinutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
}

/**
 * Get user-friendly rate limit message
 */
export function getRateLimitMessage(result: RateLimitCheckResult): string {
  if (result.blocked && result.blocked_until) {
    const waitTime = formatBlockedUntil(result.blocked_until);
    return `Too many attempts. Please try again in ${waitTime}.`;
  }

  if (result.remaining_attempts !== undefined && result.remaining_attempts <= 2) {
    return `${result.remaining_attempts} attempt${result.remaining_attempts !== 1 ? 's' : ''} remaining before temporary lockout.`;
  }

  return result.message || 'Please try again.';
}

/**
 * Pre-check rate limit before showing login form
 * Can be used to show a warning to users who are close to being locked out
 */
export async function preCheckRateLimit(
  email: string,
  attemptType: AttemptType = 'login'
): Promise<{
  canAttempt: boolean;
  warning?: string;
  blockedUntil?: string;
}> {
  const result = await checkAuthRateLimit(email, attemptType);

  if (result.blocked) {
    return {
      canAttempt: false,
      warning: getRateLimitMessage(result),
      blockedUntil: result.blocked_until,
    };
  }

  if (result.remaining_attempts !== undefined && result.remaining_attempts <= 2) {
    return {
      canAttempt: true,
      warning: getRateLimitMessage(result),
    };
  }

  return { canAttempt: true };
}
