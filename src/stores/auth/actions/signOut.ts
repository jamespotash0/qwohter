/**
 * Sign-out Action
 * Handles user logout and cleanup
 */

import { supabase } from '@/integrations/supabase/client';
import type { FullAuthState } from '../types';

export const createSignOutAction = (get: () => FullAuthState) => {
  return async () => {
    const { _setLoading, _setError } = get();

    try {
      _setLoading(true);
      _setError(null);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Auth state change will be handled by the listener in initialize.ts
      // Cleanup happens in the SIGNED_OUT event handler
    } catch (error) {
      console.error('❌ Sign out error:', error);
      _setError(error instanceof Error ? error.message : 'Failed to sign out');
      throw error;
    } finally {
      _setLoading(false);
    }
  };
};
