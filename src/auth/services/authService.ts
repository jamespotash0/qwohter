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
        return {
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    }
  );
}

/**
 * Get current session
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
 */
export async function resendOtp(email: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
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
