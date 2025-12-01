/**
 * React Query Hooks for Authentication
 *
 * Replaces manual auth state management
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryClient';

/**
 * User profile type
 */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Session type
 */
export interface Session {
  user: {
    id: string;
    email: string;
  };
  access_token: string;
  refresh_token: string;
}

/**
 * Fetch user profile
 */
async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as UserProfile;
}

/**
 * Fetch current session
 */
async function fetchSession(): Promise<Session | null> {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) throw error;
  return session as Session | null;
}

/**
 * Hook: Use User Profile
 *
 * Fetches user profile data
 */
export function useUserProfile(userId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.user.profile(userId),
    queryFn: () => fetchUserProfile(userId),
    enabled: !!userId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - profile doesn't change often
  });
}

/**
 * Hook: Use Session
 *
 * Fetches current auth session
 */
export function useSession(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.user.session(),
    queryFn: fetchSession,
    enabled,
    staleTime: 60 * 1000, // 1 minute
    retry: false, // Don't retry session checks
  });
}
