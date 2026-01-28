/**
 * Rate Limiting Service for Organization Creation
 *
 * Prevents spam organization creation with user and IP-based limits.
 * Uses RPC functions with SECURITY DEFINER for secure database access.
 */

import { supabase } from "@/integrations/supabase/client";

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  resetTime?: Date;
}

interface OrgRateLimitResponse {
  allowed: boolean;
  user_attempts_used: number;
  ip_attempts_used: number;
  user_reset_at: string;
  ip_reset_at: string;
  reason: string;
}

export class OrganizationCreationLimiter {
  /**
   * Check if user can create organization based on rate limits
   * Uses RPC function with SECURITY DEFINER for secure access
   */
  static async canCreateOrganization(
    userId: string,
    ipAddress?: string
  ): Promise<RateLimitResult> {
    try {
      // Note: RPC function created in migration 20260119000000
      const { data, error } = await (supabase.rpc as any)('check_org_creation_rate_limit', {
        p_user_id: userId,
        p_ip_address: ipAddress || null,
      });

      if (error) {
        console.error('Rate limit check error:', error);
        // Fail open - allow creation if rate limit check fails
        return { allowed: true };
      }

      const result = (data as OrgRateLimitResponse[])?.[0];
      if (!result) {
        return { allowed: true };
      }

      if (!result.allowed) {
        // Determine which reset time to use based on which limit was hit
        const resetTime = result.reason.includes('network')
          ? new Date(result.ip_reset_at)
          : new Date(result.user_reset_at);

        return {
          allowed: false,
          reason: result.reason,
          resetTime,
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow creation if rate limit check fails
      return { allowed: true };
    }
  }

  /**
   * Log organization creation attempt for rate limiting
   * Uses RPC function with SECURITY DEFINER to bypass RLS
   */
  static async logCreationAttempt(
    userId: string,
    status: 'Success' | 'Failed' | 'Rate_Limited',
    ipAddress?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      // Note: RPC function created in migration 20260119000000
      const { error } = await (supabase.rpc as any)('log_org_creation_attempt', {
        p_user_id: userId,
        p_status: status,
        p_ip_address: ipAddress || null,
        p_error_message: errorMessage || null,
      });

      if (error) {
        console.error('Failed to log creation attempt:', error);
        // Don't throw - logging failure shouldn't break the flow
      }
    } catch (error) {
      console.error('Error in logCreationAttempt:', error);
      // Don't throw - logging failure shouldn't break the flow
    }
  }

  /**
   * Get user's recent creation attempts for debugging/admin purposes
   * Note: RLS allows users to see only their own records
   */
  static async getUserCreationHistory(
    userId: string,
    hours: number = 24
  ): Promise<OrgCreationLogEntry[]> {
    try {
      const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('organization_creation_log')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', timeAgo)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching creation history:', error);
        return [];
      }

      return (data as OrgCreationLogEntry[]) || [];
    } catch (error) {
      console.error('Error in getUserCreationHistory:', error);
      return [];
    }
  }

  /**
   * Check how many more organizations user can create today
   * Uses RPC function for accurate count
   */
  static async getRemainingCreations(userId: string): Promise<number> {
    try {
      // Note: RPC function created in migration 20260119000000
      const { data, error } = await (supabase.rpc as any)('get_remaining_org_creations', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error checking remaining creations:', error);
        return 3; // Default to max if can't check
      }

      return (data as number) ?? 3;
    } catch (error) {
      console.error('Error in getRemainingCreations:', error);
      return 3;
    }
  }
}

interface OrgCreationLogEntry {
  id: string;
  user_id: string;
  timestamp: string;
  ip_address: string | null;
  status: 'Success' | 'Failed' | 'Rate_Limited';
  error_message: string | null;
}

/**
 * Get client IP address (best effort)
 * Note: This is limited in browser environment
 */
export const getClientIpAddress = async (): Promise<string | undefined> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(2000),
    });
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.warn('Could not determine client IP:', error);
    return undefined;
  }
};
