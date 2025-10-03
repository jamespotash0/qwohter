import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/hooks/useUserProfile';

interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  clearError: () => void;

  // Internal actions
  _setAuth: (user: User | null, session: Session | null) => void;
  _setProfile: (profile: UserProfile | null) => void;
  _setLoading: (loading: boolean) => void;
  _setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    user: null,
    session: null,
    profile: null,
    isLoading: false,
    isInitialized: false,
    error: null,

    // Initialize authentication state and set up listeners
    initialize: async () => {
      const { isInitialized, _setAuth, _setProfile, _setLoading, _setError } = get();

      // Skip if already initialized
      if (isInitialized) {
        return;
      }

      try {
        // Mark as initialized immediately to prevent loading spinner
        set({ isInitialized: true });
        _setLoading(true);

        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        _setAuth(session?.user ?? null, session);

        // Fetch profile if user exists
        if (session?.user) {
          await fetchProfile(session.user.id);
        }

        // Set up auth state change listener
        supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.email);

          _setAuth(session?.user ?? null, session);

          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            _setProfile(null);
          }
        });
      } catch (error) {
        console.error('Auth initialization error:', error);
        _setError(error instanceof Error ? error.message : 'Failed to initialize auth');
        set({ isInitialized: false }); // Reset on error
      } finally {
        _setLoading(false);
      }
      
      // Helper function to fetch user profile
      async function fetchProfile(userId: string) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (error && error.code !== 'PGRST116') { // Ignore "not found" errors
            throw error;
          }
          
          _setProfile(data || null);
        } catch (error) {
          console.error('Profile fetch error:', error);
          _setError(error instanceof Error ? error.message : 'Failed to fetch profile');
        }
      }
    },

    // Sign in with email and password
    signIn: async (email: string, password: string) => {
      const { _setLoading, _setError } = get();
      
      try {
        _setLoading(true);
        _setError(null);
        
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        // Auth state change will be handled by the listener
      } catch (error) {
        console.error('Sign in error:', error);
        _setError(error instanceof Error ? error.message : 'Failed to sign in');
        throw error;
      } finally {
        _setLoading(false);
      }
    },

    // Sign out
    signOut: async () => {
      const { _setLoading, _setError } = get();
      
      try {
        _setLoading(true);
        _setError(null);
        
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Auth state change will be handled by the listener
      } catch (error) {
        console.error('Sign out error:', error);
        _setError(error instanceof Error ? error.message : 'Failed to sign out');
        throw error;
      } finally {
        _setLoading(false);
      }
    },

    // Update user profile
    updateProfile: async (updates: Partial<UserProfile>) => {
      const { user, profile, _setProfile, _setLoading, _setError } = get();
      
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }
      
      try {
        _setLoading(true);
        _setError(null);
        
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();
        
        if (error) throw error;
        
        _setProfile({ ...profile, ...data as object });
      } catch (error) {
        console.error('Profile update error:', error);
        _setError(error instanceof Error ? error.message : 'Failed to update profile');
        throw error;
      } finally {
        _setLoading(false);
      }
    },

    // Clear error state
    clearError: () => set({ error: null }),

    // Internal setters
    _setAuth: (user, session) => set({ user, session }),
    _setProfile: (profile) => set({ profile }),
    _setLoading: (isLoading) => set({ isLoading }),
    _setError: (error) => set({ error }),
  }))
);

// Selectors for common auth patterns
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