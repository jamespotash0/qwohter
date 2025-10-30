/**
 * Update Profile Action
 * Handles user profile updates
 */

import { supabase } from '@/integrations/supabase/client';
import type { UserProfile } from '@/types/profile';
import type { FullAuthState } from '../types';

export const createUpdateProfileAction = (get: () => FullAuthState) => {
  return async (updates: Partial<UserProfile>) => {
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
      console.error('❌ Profile update error:', error);
      _setError(error instanceof Error ? error.message : 'Failed to update profile');
      throw error;
    } finally {
      _setLoading(false);
    }
  };
};
