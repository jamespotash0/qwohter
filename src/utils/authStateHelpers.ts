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
   * Set up auth state change listener with callbacks
   */
  setupAuthListener: (callbacks: AuthCallbacks) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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