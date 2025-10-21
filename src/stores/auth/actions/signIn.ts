/**
 * Sign-in Action
 * Handles user authentication with email/password
 */

import { supabase } from '@/integrations/supabase/client';
import type { FullAuthState } from '../types';

export const createSignInAction = (get: () => FullAuthState) => {
  return async (email: string, password: string) => {
    const { _setLoading, _setError } = get();

    try {
      _setLoading(true);
      _setError(null);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Auth state change will be handled by the listener in initialize.ts
    } catch (error) {
      console.error('❌ Sign in error:', error);
      _setError(error instanceof Error ? error.message : 'Failed to sign in');
      throw error;
    } finally {
      _setLoading(false);
    }
  };
};
