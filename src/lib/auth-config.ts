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
  // Initialize the auth store - it handles all auth state changes internally
  await useAuthStore.getState().initialize();

  // Note: Auth state change listener is already set up in authStore.ts
  // No need for duplicate listeners here
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