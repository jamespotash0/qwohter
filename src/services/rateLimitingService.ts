/**
 * Rate Limiting Service for Organization Creation
 *
 * Prevents spam organization creation with user and IP-based limits
 */

import { supabase } from "@/integrations/supabase/client";

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  resetTime?: Date;
}

export class OrganizationCreationLimiter {
  /**
   * Check if user can create organization based on rate limits
   */
  static async canCreateOrganization(userId: string, ipAddress?: string): Promise<RateLimitResult> {
    try {
      // Check user-based rate limit (max 3 organizations per day)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: userAttempts, error: userError } = await (supabase as any)
        .from('organization_creation_log')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'Success')
        .gte('timestamp', oneDayAgo);

      if (userError) {
        console.error('Error checking user rate limit:', userError);
        // Allow creation if we can't check (fail open for better UX)
        return { allowed: true };
      }

      if (userAttempts && userAttempts.length >= 3) {
        const resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        return {
          allowed: false,
          reason: 'Maximum 3 organizations per day limit reached',
          resetTime
        };
      }

      // Check IP-based rate limit (max 10 per hour if IP provided)
      if (ipAddress) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const { data: ipAttempts, error: ipError } = await supabase
          .from('organization_creation_log')
          .select('*')
          .eq('ip_address', ipAddress)
          .gte('timestamp', oneHourAgo);

        if (ipError) {
          console.error('Error checking IP rate limit:', ipError);
          // Continue without IP check if error
        } else if (ipAttempts && ipAttempts.length >= 10) {
          const resetTime = new Date(Date.now() + 60 * 60 * 1000);
          return {
            allowed: false,
            reason: 'Too many creation attempts from this network',
            resetTime
          };
        }
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
   */
  static async logCreationAttempt(
    userId: string,
    status: 'Success' | 'Failed' | 'Rate_Limited',
    ipAddress?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('organization_creation_log')
        .insert({
          user_id: userId,
          timestamp: new Date().toISOString(),
          ip_address: ipAddress || null,
          status,
          error_message: errorMessage || null
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
   */
  static async getUserCreationHistory(userId: string, hours: number = 24): Promise<any[]> {
    try {
      const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await (supabase as any)
        .from('organization_creation_log')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', timeAgo)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching creation history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserCreationHistory:', error);
      return [];
    }
  }

  /**
   * Check how many more organizations user can create today
   */
  static async getRemainingCreations(userId: string): Promise<number> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await (supabase as any)
        .from('organization_creation_log')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'Success')
        .gte('timestamp', oneDayAgo);

      if (error) {
        console.error('Error checking remaining creations:', error);
        return 3; // Default to max if can't check
      }

      const used = data?.length || 0;
      return Math.max(0, 3 - used);
    } catch (error) {
      console.error('Error in getRemainingCreations:', error);
      return 3;
    }
  }
}

/**
 * Get client IP address (best effort)
 * Note: This is limited in browser environment
 */
export const getClientIpAddress = async (): Promise<string | undefined> => {
  try {
    // In production, you might want to use a service to get real IP
    // For now, we'll use a simple approach
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.warn('Could not determine client IP:', error);
    // Fallback to hostname for some basic rate limiting
    return window.location.hostname;
  }
};