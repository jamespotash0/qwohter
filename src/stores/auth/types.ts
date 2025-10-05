/**
 * Auth Store Type Definitions
 * Centralized types for authentication state management
 */

import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/hooks/useUserProfile';

export interface AuthState {
  // Core auth data
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  isAuthChanging: boolean;

  // Error state
  error: string | null;
}

export interface AuthActions {
  // Public API
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  clearError: () => void;

  // Internal setters (prefixed with _)
  _setAuth: (user: User | null, session: Session | null) => void;
  _setProfile: (profile: UserProfile | null) => void;
  _setLoading: (loading: boolean) => void;
  _setError: (error: string | null) => void;
}

export type FullAuthState = AuthState & AuthActions;
