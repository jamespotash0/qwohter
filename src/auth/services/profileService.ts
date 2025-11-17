/**
 * Profile Service - User Profile Operations
 *
 * REPLACES: Direct profile queries scattered across codebase
 *
 * Centralized profile management with React Query integration.
 */

import { supabase } from '@/integrations/supabase/client';
import * as Sentry from '@sentry/react';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  full_name?: string;
  avatar_url?: string;
}

/**
 * Fetch user profile from database
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // Ignore "not found" errors (profile might not exist yet)
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data as UserProfile;
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    throw error;
  }
}

/**
 * Update user profile
 *
 * Why instrumented: Users expect profile updates to work instantly.
 * If name/avatar updates fail, users lose trust in the app.
 *
 * What we track:
 * - Update success/failure rate
 * - Which fields are updated (name vs avatar)
 * - Permission errors
 */
export async function updateUserProfile(
  userId: string,
  updates: UpdateProfileData
): Promise<UserProfile> {
  return await Sentry.startSpan(
    {
      name: 'updateUserProfile',
      op: 'db.query',
      attributes: {
        'user.id': userId,
        'update.has_name': !!updates.full_name,
        'update.has_avatar': !!updates.avatar_url,
      },
    },
    async (span) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select()
          .single();

        if (error) {
          span.setStatus({ code: 2, message: error.message });
          Sentry.captureException(error, {
            tags: {
              operation: 'updateUserProfile',
              user_id: userId,
            },
            level: 'error',
          });
          throw error;
        }

        span.setStatus({ code: 1 }); // Success
        return data as UserProfile;
      } catch (error) {
        console.error('Failed to update profile:', error);
        throw error;
      }
    }
  );
}

/**
 * Create user profile (called after sign-up)
 */
export async function createUserProfile(
  userId: string,
  email: string,
  fullName?: string
): Promise<UserProfile> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name: fullName || null,
      } as any)
      .select()
      .single();

    if (error) throw error;

    return data as UserProfile;
  } catch (error) {
    console.error('Failed to create profile:', error);
    throw error;
  }
}

/**
 * Delete user profile (admin only)
 */
export async function deleteUserProfile(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to delete profile:', error);
    throw error;
  }
}
