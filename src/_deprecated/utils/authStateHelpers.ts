/**
 * Shared Authentication State Helper Utilities
 * 
 * Common auth state management functions used across pages
 * to eliminate duplicate auth checking and session handling code
 */

import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from '@supabase/supabase-js';

export interface AuthCallbacks {
  onAuthStateChange?: (user: User | null, session: Session | null) => void;
  onSignOut?: () => void;
  onRedirectToAuth?: () => void;
}

export interface UserData {
  email: string;
  id: string;
}

/**
 * Shared auth state helper functions
 */
export const authStateHelpers = {
  /**
   * Check current authentication session
   */
  checkAuthSession: async (): Promise<Session | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Error checking auth session:', error);
      return null;
    }
  },

  /**
   * Validate session against backend user data
   * Returns null if session is invalid (orphaned) and clears it
   * Special handling for signup flow where profile may not exist yet
   */
  validateSession: async (session: Session | null, isSignupFlow: boolean = false): Promise<Session | null> => {
    if (!session) return null;

    try {
      // Check if user still exists in profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();

      // If profile doesn't exist or error occurred, check if this is expected
      if (error || !profile) {
        // During signup flow, profile may not exist yet - this is normal
        if (isSignupFlow) {
          console.log('Profile not found during signup flow - this is expected');
          return session; // Session is valid, profile will be created later
        }
        
        // For existing users, missing profile indicates orphaned session
        console.warn('Orphaned session detected - user not found in profiles table');
        console.log('Session user ID:', session.user.id);
        console.log('Profile query error:', error);
        
        // Clear the orphaned session
        await supabase.auth.signOut();
        
        // Clear any local storage
        localStorage.removeItem('auth_flow_state');
        
        return null;
      }

      // Session is valid
      return session;
    } catch (error) {
      console.error('Error validating session:', error);
      
      // During signup flow, don't clear session on errors
      if (isSignupFlow) {
        console.log('Session validation error during signup - keeping session');
        return session;
      }
      
      // On any error for existing users, assume session is invalid and clear it
      await supabase.auth.signOut();
      localStorage.removeItem('auth_flow_state');
      
      return null;
    }
  },

  /**
   * Check and validate authentication session
   * This is the main function to use - it checks session AND validates it
   */
  checkValidAuthSession: async (isSignupFlow: boolean = false): Promise<Session | null> => {
    const session = await authStateHelpers.checkAuthSession();
    return await authStateHelpers.validateSession(session, isSignupFlow);
  },

  /**
   * Set up auth state change listener with callbacks
   */
  setupAuthListener: (callbacks: AuthCallbacks) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (callbacks.onAuthStateChange) {
        callbacks.onAuthStateChange(session?.user || null, session);
      }
      
      // Handle sign out
      if (!session && callbacks.onRedirectToAuth) {
        callbacks.onRedirectToAuth();
      }
    });

    return subscription;
  },

  /**
   * Extract user data from session
   */
  getUserFromSession: (session: Session | null): UserData | null => {
    if (!session?.user) return null;
    
    return {
      email: session.user.email || '',
      id: session.user.id
    };
  },

  /**
   * Initialize auth state for a page component
   */
  initializePageAuth: async (callbacks: AuthCallbacks) => {
    // Check initial session
    const session = await authStateHelpers.checkAuthSession();
    
    if (!session && callbacks.onRedirectToAuth) {
      callbacks.onRedirectToAuth();
      return null;
    }

    // Set up listener
    const subscription = authStateHelpers.setupAuthListener(callbacks);
    
    // Return user data and cleanup function
    return {
      user: authStateHelpers.getUserFromSession(session),
      cleanup: () => subscription.unsubscribe()
    };
  },

  /**
   * Handle user logout
   */
  handleLogout: async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  },

  /**
   * Check if user should be redirected to auth
   */
  shouldRedirectToAuth: (session: Session | null, currentPath: string): boolean => {
    // Don't redirect if already on auth page
    if (currentPath === '/auth') return false;
    
    // Redirect if no session
    return !session;
  }
};