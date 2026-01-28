/**
 * Auth Service - Single Source for Supabase Auth Operations
 *
 * REPLACES: Direct Supabase calls scattered across codebase
 *
 * All authentication operations go through this service.
 * Makes testing easier, centralizes error handling.
 */

import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react';
import { setSentryUser, clearSentryUser } from '@/lib/sentry';

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  fullName?: string;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: Error | null;
}

/**
 * Sign in with email and password
 *
 * Why instrumented: Critical auth flow - if login fails, users can't access the app.
 * Track errors to identify auth issues (wrong credentials vs. service down).
 *
 * What we track:
 * - Success/failure rate
 * - Error types (invalid credentials, network, etc.)
 * - Performance: How long does login take?
 *
 * Privacy: We DO NOT track passwords. Only email (for context) and error messages.
 */
export async function signIn(credentials: SignInCredentials): Promise<AuthResponse> {
  return await Sentry.startSpan(
    {
      name: 'auth.signIn',
      op: 'auth',
      attributes: {
        'auth.email': credentials.email,
      },
    },
    async (span) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error) {
          span.setStatus({ code: 2, message: error.message });
          Sentry.captureException(error, {
            tags: {
              operation: 'signIn',
              auth_error_type: error.name || 'unknown',
            },
            level: 'warning',
          });
          throw error;
        }

        // Set user context for all future errors
        if (data.user) {
          setSentryUser({
            id: data.user.id,
            email: data.user.email,
          });
          span.setAttribute('user.id', data.user.id);
        }

        span.setStatus({ code: 1 }); // Success
        return {
          user: data.user,
          session: data.session,
          error: null,
        };
      } catch (error) {
        return {
          user: null,
          session: null,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    }
  );
}

/**
 * Sign up with email and password
 *
 * Why instrumented: Critical onboarding flow - signup errors = lost customers.
 *
 * What we track:
 * - Success/failure rate
 * - Error types (email already exists, weak password, etc.)
 *
 * Privacy: We DO NOT track passwords. Only email and error messages.
 */
export async function signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
  return await Sentry.startSpan(
    {
      name: 'auth.signUp',
      op: 'auth',
      attributes: {
        'auth.email': credentials.email,
        'auth.has_full_name': !!credentials.fullName,
      },
    },
    async (span) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: credentials.email,
          password: credentials.password,
          options: {
            data: {
              full_name: credentials.fullName,
            },
          },
        });

        if (error) {
          span.setStatus({ code: 2, message: error.message });
          Sentry.captureException(error, {
            tags: {
              operation: 'signUp',
              auth_error_type: error.name || 'unknown',
            },
            level: 'warning',
          });
          throw error;
        }

        // Set user context if signup successful
        if (data.user) {
          setSentryUser({
            id: data.user.id,
            email: data.user.email,
          });
          span.setAttribute('user.id', data.user.id);
        }

        span.setStatus({ code: 1 }); // Success
        return {
          user: data.user,
          session: data.session,
          error: null,
        };
      } catch (error) {
        return {
          user: null,
          session: null,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    }
  );
}

/**
 * Sign out current user
 *
 * Why instrumented: If logout fails, sessions linger = security issue.
 *
 * What we track:
 * - Logout failures (rare but critical)
 */
export async function signOut(): Promise<{ error: Error | null }> {
  return await Sentry.startSpan(
    {
      name: 'auth.signOut',
      op: 'auth',
    },
    async (span) => {
      try {
        const { error } = await supabase.auth.signOut();

        if (error) {
          // Handle "session not found" gracefully - this is expected when session is already invalid
          if (error.message?.includes('session_not_found') ||
              error.message?.includes('Auth session missing')) {
            console.log('Session already invalid, clearing local state');
            clearSentryUser();
            span.setStatus({ code: 1 }); // Treat as success
            return { error: null };
          }

          span.setStatus({ code: 2, message: error.message });
          Sentry.captureException(error, {
            tags: {
              operation: 'signOut',
            },
            level: 'warning',
          });
          throw error;
        }

        // Clear user context from Sentry
        clearSentryUser();

        span.setStatus({ code: 1 }); // Success
        return { error: null };
      } catch (error) {
        // Also handle session missing errors here
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('session_not_found') ||
            errorMessage.includes('Auth session missing')) {
          console.log('Session already invalid during signOut, clearing local state');
          clearSentryUser();
          return { error: null };
        }

        return {
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    }
  );
}

/**
 * Get current session
 *
 * Note: Supabase automatically refreshes sessions via onAuthStateChange listener.
 * Token refresh happens automatically ~60s before expiry.
 * This method returns the current session snapshot from Supabase client.
 *
 * Industry Standard Pattern:
 * - AuthProvider listens to onAuthStateChange
 * - Supabase fires TOKEN_REFRESHED event automatically
 * - All components get fresh session from React Query cache
 */
export async function getSession(): Promise<Session | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

/**
 * Verify OTP code
 */
export async function verifyOtp(email: string, token: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) throw error;

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Resend OTP code
 *
 * Note: Supabase has rate limiting on OTP resends:
 * - 60 second cooldown between resends
 * - 4 emails per hour per email on free tier
 *
 * The API may return success even when rate limited and no email is sent.
 */
export async function resendOtp(email: string): Promise<{ error: Error | null }> {
  try {
    console.log('[Auth] Attempting to resend OTP to:', email);

    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      console.error('[Auth] Resend OTP error:', error.message, error);
      throw error;
    }

    // Log the response to help debug delivery issues
    console.log('[Auth] Resend OTP response:', data);

    return { error: null };
  } catch (error) {
    console.error('[Auth] Resend OTP caught error:', error);
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Reset password (send reset email)
 */
export async function resetPassword(email: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Update password (after reset)
 */
export async function updatePassword(newPassword: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Get current user (without session)
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
}

/**
 * Check if user exists in profiles table (orphaned session detection)
 */
export async function validateUserExists(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('Failed to validate user:', error);
    return false;
  }
}
