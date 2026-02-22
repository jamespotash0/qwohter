/**
 * AuthProvider - Industry Standard Implementation (v3.0.0)
 *
 * Architecture:
 * - React Context for global auth state
 * - React Query for ALL server state (user, session, profile)
 * - Single Supabase listener (registered once)
 * - AuthEventMutex for race condition prevention
 *
 * Inspired by: Linear, Stripe, Vercel
 *
 * Benefits:
 * - Single source of truth (React Query)
 * - Zero race conditions (mutex-based serialization)
 * - Automatic deduplication
 * - Clean hooks API
 * - Replaces old Zustand-based auth store
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryClient';
import { AuthEventMutex } from './utils/AuthEventMutex';
import * as authService from './services/authService';
import * as profileService from './services/profileService';
import { identifyUser, setOrganizationGroup } from '@/lib/analytics';

interface AuthContextValue {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const authMutex = useRef(new AuthEventMutex());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 1. Initialize auth on mount (ONE TIME)
    initializeAuth();

    // 2. Register auth listener (ONE TIME)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth event:', event, '| User:', session?.user?.email || 'none');

      // Serialize ALL auth events through mutex
      authMutex.current.execute(async () => {
        await handleAuthEvent(event, session);
      });
    });

    // 3. Cleanup on unmount
    return () => {
      subscription.unsubscribe();
      authMutex.current.clear();
    };
  }, []);

  /**
   * Initialize authentication
   *
   * - Restores session from localStorage (Supabase manages this)
   * - Fetches user profile if session exists
   * - Marks as initialized
   */
  async function initializeAuth() {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch session using React Query (automatic deduplication!)
      const session = await queryClient.fetchQuery({
        queryKey: queryKeys.user.session(),
        queryFn: () => authService.getSession(),
        staleTime: 60 * 1000, // 1 minute
        retry: false,
      });

      if (session?.user) {
        // Prefetch user profile (automatic deduplication!)
        await queryClient.prefetchQuery({
          queryKey: queryKeys.user.profile(session.user.id),
          queryFn: () => profileService.fetchUserProfile(session.user.id),
          staleTime: 5 * 60 * 1000, // 5 minutes
        });

        // Prefetch organization data on initialization
        try {
          const { fetchOrganizationByUserId } = await import('@/services/organizationService');
          const orgData = await queryClient.fetchQuery({
            queryKey: queryKeys.organization.byUser(session.user.id),
            queryFn: () => fetchOrganizationByUserId(session.user.id),
            staleTime: 5 * 60 * 1000,
          });

          // Enrich analytics identity with org data
          if (orgData) {
            const profile = queryClient.getQueryData<{ full_name?: string; role?: string }>(
              queryKeys.user.profile(session.user.id)
            );
            identifyUser({
              id: session.user.id,
              email: session.user.email ?? undefined,
              fullName: profile?.full_name ?? undefined,
              organizationId: orgData.id,
              organizationName: orgData.name,
              role: profile?.role ?? undefined,
            });
            setOrganizationGroup({
              id: orgData.id,
              name: orgData.name,
            });
          }
        } catch (error) {
          console.error('Failed to prefetch organization on init:', error);
        }

        console.log('✅ Auth initialized for user:', session.user.email);
      } else {
        console.log('⚠️ No session found - user not authenticated');
      }

      setIsInitialized(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Auth initialization failed';
      console.error('❌ Auth initialization error:', errorMessage);
      setError(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Handle auth state change events
   *
   * All events are serialized through AuthEventMutex to prevent race conditions.
   */
  async function handleAuthEvent(event: AuthChangeEvent, session: Session | null) {
    try {
      switch (event) {
        case 'SIGNED_IN':
          await handleSignedIn(session);
          break;

        case 'SIGNED_OUT':
          await handleSignedOut();
          break;

        case 'TOKEN_REFRESHED':
          await handleTokenRefreshed(session);
          break;

        case 'USER_UPDATED':
          await handleUserUpdated(session);
          break;

        case 'INITIAL_SESSION':
          // Already handled in initializeAuth, skip duplicate
          console.log('⏭️ Skipping INITIAL_SESSION (already initialized)');
          break;

        default:
          console.log(`ℹ️ Unhandled auth event: ${event}`);
      }
    } catch (err) {
      console.error(`❌ Error handling ${event} event:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Handle SIGNED_IN event
   *
   * - Update session in React Query cache
   * - Fetch user profile
   * - Prefetch organization data
   */
  async function handleSignedIn(session: Session | null) {
    if (!session?.user) return;

    console.log('👤 User signed in:', session.user.email);

    // Update session in cache
    queryClient.setQueryData(queryKeys.user.session(), session);

    // Fetch profile (will be cached by React Query)
    await queryClient.invalidateQueries({
      queryKey: queryKeys.user.profile(session.user.id),
    });

    // Prefetch organization data immediately on sign in
    try {
      const { fetchOrganizationByUserId } = await import('@/services/organizationService');
      const orgData = await queryClient.fetchQuery({
        queryKey: queryKeys.organization.byUser(session.user.id),
        queryFn: () => fetchOrganizationByUserId(session.user.id),
        staleTime: 5 * 60 * 1000,
      });

      // Enrich analytics identity with org data
      if (orgData) {
        const profile = queryClient.getQueryData<{ full_name?: string; role?: string }>(
          queryKeys.user.profile(session.user.id)
        );
        identifyUser({
          id: session.user.id,
          email: session.user.email ?? undefined,
          fullName: profile?.full_name ?? undefined,
          organizationId: orgData.id,
          organizationName: orgData.name,
          role: profile?.role ?? undefined,
        });
        setOrganizationGroup({
          id: orgData.id,
          name: orgData.name,
        });
      }
    } catch (error) {
      console.error('Failed to prefetch organization on sign in:', error);
    }
  }

  /**
   * Handle SIGNED_OUT event
   *
   * - Clear ALL React Query cache
   * - Reset all stores (organization, proposals, etc.)
   * - Clear localStorage auth data
   */
  async function handleSignedOut() {
    console.log('👋 User signed out');

    // Clear ALL React Query cache (includes user, session, profile, org, proposals, etc.)
    queryClient.clear();

    // Reset remaining Zustand stores (only appStore remains - others migrated to React Query)
    // Note: proposalsStore, organizationStore, boardStore
    //       have all been migrated to React Query and are cleared with queryClient.clear() above
    try {
      // Only appStore remains as a Zustand store for app-level UI state
      const { useAppStore } = await import('@/stores/app/appStore');
      useAppStore.getState().reset();
    } catch (err) {
      console.error('Error resetting app store:', err);
    }

    // Clear auth-related localStorage
    clearAuthCache();
  }

  /**
   * Handle TOKEN_REFRESHED event
   *
   * - Update session in React Query cache
   * - No need to refetch profile (user hasn't changed)
   */
  async function handleTokenRefreshed(session: Session | null) {
    if (!session) {
      console.warn('⚠️ Token refresh failed - session is null');
      // Treat as sign out
      await handleSignedOut();
      return;
    }

    console.log('🔄 Token refreshed:', {
      expiresAt: session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : 'N/A',
      expiresIn: session.expires_in
        ? `${Math.round(session.expires_in / 60)} minutes`
        : 'N/A',
    });

    // Update session in cache (no need to refetch profile)
    queryClient.setQueryData(queryKeys.user.session(), session);
  }

  /**
   * Handle USER_UPDATED event
   *
   * - Refetch user profile (user data changed)
   */
  async function handleUserUpdated(session: Session | null) {
    if (!session?.user) return;

    console.log('📝 User data updated');

    // Invalidate profile to trigger refetch
    await queryClient.invalidateQueries({
      queryKey: queryKeys.user.profile(session.user.id),
    });
  }

  /**
   * Clear auth-related localStorage keys
   */
  function clearAuthCache() {
    const keysToRemove = [
      'auth_cached_profile',
      'sidebar_cached_profile',
      'sidebar_cached_role',
      'auth_flow_state',
      'temp_onboarding_progress',
      'org_cached_organization',
      'org_cached_user_role',
      'org_cached_membership',
      'temp-signup-data',
    ];

    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        console.error(`Failed to remove ${key}:`, err);
      }
    });
  }

  return (
    <AuthContext.Provider value={{ isInitialized, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 *
 * @throws Error if used outside AuthProvider
 */
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
