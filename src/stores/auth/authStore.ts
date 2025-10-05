/**
 * Auth Store (Refactored)
 * Clean, modular authentication state management
 *
 * Structure:
 * - types.ts: Type definitions
 * - actions/: Individual action creators
 * - authStore.ts: Main store composition
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { FullAuthState } from './types';
import {
  createInitializeAction,
  createSignInAction,
  createSignOutAction,
  createUpdateProfileAction,
} from './actions';

/**
 * Main Auth Store
 * Combines state and modular actions
 */
export const useAuthStore = create<FullAuthState>()(
  subscribeWithSelector((set, get) => ({
    // ============================================================================
    // INITIAL STATE
    // ============================================================================
    user: null,
    session: null,
    profile: null,
    isLoading: false,
    isInitialized: false,
    isAuthChanging: false,
    error: null,

    // ============================================================================
    // PUBLIC ACTIONS
    // ============================================================================
    initialize: createInitializeAction(get, set),
    signIn: createSignInAction(get),
    signOut: createSignOutAction(get),
    updateProfile: createUpdateProfileAction(get),
    clearError: () => set({ error: null }),

    // ============================================================================
    // INTERNAL SETTERS (prefixed with _)
    // ============================================================================
    _setAuth: (user, session) => {
      console.log('📝 Setting auth:', user?.email || 'null');
      set({ user, session });
    },
    _setProfile: (profile) => set({ profile }),
    _setLoading: (isLoading) => set({ isLoading }),
    _setError: (error) => set({ error }),
  }))
);

// ============================================================================
// SELECTORS (Convenience hooks for common patterns)
// ============================================================================
export const useUser = () => useAuthStore((state) => state.user);
export const useProfile = () => useAuthStore((state) => state.profile);
export const useIsAuthenticated = () => useAuthStore((state) => !!state.user);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useAuthActions = () => useAuthStore((state) => ({
  signIn: state.signIn,
  signOut: state.signOut,
  updateProfile: state.updateProfile,
  clearError: state.clearError,
}));
