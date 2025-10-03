/**
 * Authentication Configuration
 *
 * Handles automatic session timeout and token refresh using Supabase's built-in capabilities
 */

import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/auth/authStore';

/**
 * Initialize auth configuration with session monitoring
 * This will automatically handle JWT token expiry and refresh
 */
export const initializeAuth = async () => {
  // Initialize the auth store first
  await useAuthStore.getState().initialize();

  // Listen for auth state changes and handle session expiry
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'TOKEN_REFRESHED') {
      console.log('Auth token refreshed automatically');
    } else if (event === 'SIGNED_OUT') {
      console.log('User session expired or signed out');

      // Clear any cached data
      localStorage.removeItem('sidebar_cached_profile');
      localStorage.removeItem('sidebar_cached_role');
      localStorage.removeItem('auth_flow_state');
      localStorage.removeItem('temp_onboarding_progress');

      // Redirect to sign-in if not already there
      if (window.location.pathname !== '/sign-in' &&
          window.location.pathname !== '/create-account' &&
          window.location.pathname !== '/') {
        window.location.href = '/sign-in';
      }
    } else if (event === 'SIGNED_IN') {
      console.log('User signed in successfully');
    }
  });
};

/**
 * Check if user session is still valid and refresh if needed
 * This leverages Supabase's automatic token refresh
 */
export const validateSession = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Session validation error:', error);
      return false;
    }

    return !!session?.user;
  } catch (error) {
    console.error('Session validation failed:', error);
    return false;
  }
};

/**
 * Force logout - useful for manual logout
 */
export const forceLogout = async () => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Logout error:', error);
    // Force clear local storage even if API call fails
    localStorage.clear();
    window.location.href = '/sign-in';
  }
};