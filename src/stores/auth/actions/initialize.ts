/**
 * Auth Initialization
 * Handles session restoration and auth state listeners
 */

import { supabase } from '@/integrations/supabase/client';
import type { FullAuthState } from '../types';

export const createInitializeAction = (get: () => FullAuthState, set: (partial: Partial<FullAuthState>) => void) => {
  return async () => {
    const { isInitialized, _setAuth, _setProfile, _setLoading, _setError } = get();

    // Skip if already initialized
    if (isInitialized) {
      console.log('⏭️ Auth already initialized');
      return;
    }

    try {
      // Mark as initialized immediately to prevent loading spinner
      set({ isInitialized: true });
      _setLoading(true);

      // Get initial session from Supabase (uses cached session/cookies)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      _setAuth(session?.user ?? null, session);

      // Fetch profile if user exists
      if (session?.user) {
        await fetchProfile(session.user.id);
      }

      // Set up auth state change listener (handles sign-in, sign-out, token refresh)
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth event:', event, '| User:', session?.user?.email || 'none');

        // Handle sign out - clear all cached data
        if (event === 'SIGNED_OUT') {
          clearAuthCache();
          _setAuth(null, null);
          _setProfile(null);
          return;
        }

        // Skip duplicate INITIAL_SESSION events
        const currentUser = get().user;
        if (event === 'INITIAL_SESSION' && currentUser?.id === session?.user?.id) {
          console.log('⏭️ Skipping duplicate INITIAL_SESSION');
          return;
        }

        // Update auth state only if user changed
        const currentUserId = get().user?.id;
        const newUserId = session?.user?.id;

        if (currentUserId !== newUserId) {
          _setAuth(session?.user ?? null, session);

          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            _setProfile(null);
          }
        } else {
          console.log('⏭️ Skipping auth update - user unchanged');
        }
      });
    } catch (error) {
      console.error('❌ Auth initialization error:', error);
      _setError(error instanceof Error ? error.message : 'Failed to initialize auth');
      set({ isInitialized: false }); // Reset on error
    } finally {
      _setLoading(false);
    }

    // Helper: Fetch user profile from database
    async function fetchProfile(userId: string) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error; // Ignore "not found" errors
        }

        _setProfile(data || null);
      } catch (error) {
        console.error('❌ Profile fetch error:', error);
        _setError(error instanceof Error ? error.message : 'Failed to fetch profile');
      }
    }

    // Helper: Clear all auth-related localStorage caches
    function clearAuthCache() {
      localStorage.removeItem('auth_cached_profile');
      localStorage.removeItem('sidebar_cached_profile');
      localStorage.removeItem('sidebar_cached_role');
      localStorage.removeItem('auth_flow_state');
      localStorage.removeItem('temp_onboarding_progress');
      localStorage.removeItem('org_cached_organization');
      localStorage.removeItem('org_cached_user_role');
      localStorage.removeItem('org_cached_membership');

      // Clear organization store (including subscription status)
      // Import at runtime to avoid circular dependency
      import('@/stores/organization/organizationStore').then(({ useOrganizationStore }) => {
        useOrganizationStore.getState().reset();
      });
    }
  };
};
