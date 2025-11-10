// /**
//  * Auth Initialization (v2.0.0-hybrid)
//  * Handles session restoration and auth state listeners
//  *
//  * NOW USES: React Query for session/profile fetching
//  * PREVENTS: Race conditions on multiple auth events
//  */

// import { supabase } from '@/integrations/supabase/client';
// import { queryClient, queryKeys } from '@/lib/queryClient';
// import type { FullAuthState } from '../types';

// // Track in-flight auth state changes to prevent race conditions
// let authChangeInProgress = false;

// export const createInitializeAction = (get: () => FullAuthState, set: (partial: Partial<FullAuthState>) => void) => {
//   return async () => {
//     const { isInitialized, _setAuth, _setProfile, _setLoading, _setError } = get();

//     // Skip if already initialized
//     if (isInitialized) {
//       console.log('⏭️ Auth already initialized');
//       return;
//     }

//     try {
//       _setLoading(true);

//       // ✅ NEW: Use React Query for session fetching (automatic deduplication!)
//       const session = await queryClient.fetchQuery({
//         queryKey: queryKeys.user.session(),
//         queryFn: async () => {
//           const { data: { session }, error } = await supabase.auth.getSession();
//           if (error) throw error;
//           return session;
//         },
//         staleTime: 60 * 1000, // 1 minute
//         retry: false,
//       });

//       // Handle no session gracefully
//       if (!session) {
//         console.warn('⚠️ No session - resetting all state');
//         clearAuthCache();
//         _setAuth(null, null);
//         _setProfile(null);
//       } else {
//         _setAuth(session?.user ?? null, session);

//         // ✅ NEW: Fetch profile using React Query (automatic deduplication!)
//         if (session?.user) {
//           await fetchProfile(session.user.id);
//         }
//       }

//       // Mark as initialized AFTER loading session and user data
//       // This prevents flash of sign-in page on protected routes
//       set({ isInitialized: true });

//       // Set up auth state change listener (handles sign-in, sign-out, token refresh)
//       supabase.auth.onAuthStateChange(async (event, session) => {
//         console.log('🔄 Auth event:', event, '| User:', session?.user?.email || 'none');

//         // ✅ NEW: Prevent race conditions from multiple rapid auth events
//         if (authChangeInProgress) {
//           console.log('⏭️ Auth change already in progress, skipping duplicate event');
//           return;
//         }

//         // Log token refresh details for monitoring
//         if (event === 'TOKEN_REFRESHED' && session) {
//           console.log('🔄 Token refreshed:', {
//             refreshedAt: session.refresh_token ? new Date().toISOString() : 'N/A',
//             expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A',
//             expiresIn: session.expires_in ? `${session.expires_in}s (${Math.round(session.expires_in / 60)} minutes)` : 'N/A',
//           });
//           // ✅ Token refresh doesn't need to refetch profile - just update session
//           queryClient.setQueryData(queryKeys.user.session(), session);
//           return; // Skip profile refetch on token refresh
//         }

//         // Log initial session details
//         if (event === 'INITIAL_SESSION' && session) {
//           console.log('🔐 Initial session loaded:', {
//             expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A',
//             expiresIn: session.expires_in ? `${session.expires_in}s (${Math.round(session.expires_in / 60)} minutes)` : 'N/A',
//           });
//         }

//         // Handle sign out - clear all cached data
//         if (event === 'SIGNED_OUT') {
//           // Check if this is a manual logout (user clicked sign out) or automatic (session expired)
//           const isManualLogout = get().isLoggingOut;

//           if (!isManualLogout) {
//             console.log('⚠️ Automatic sign out detected (session expired in background)');
//             // Reset ALL stores (like logout does)
//             try {
//               const { useProposalsStore } = await import('@/stores/proposals/proposalsStore');
//               const { useBoardStore } = await import('@/stores/board/boardStore');
//               const { useOrganizationStore } = await import('@/stores/organization/organizationStore');
//               const { useRemindersStore } = await import('@/stores/reminders/remindersStore');
//               const { useAppStore } = await import('@/stores/app/appStore');

//               useProposalsStore.getState().reset();
//               useBoardStore.getState().reset();
//               useOrganizationStore.getState().reset();
//               useRemindersStore.getState().reset();
//               useAppStore.getState().reset();
//             } catch (err) {
//               console.error('Error resetting stores:', err);
//             }
//           }

//           clearAuthCache();
//           _setAuth(null, null);
//           _setProfile(null);
//           return;
//         }

//         // Handle token refresh failure - sign out user
//         if (event === 'TOKEN_REFRESHED' && !session) {
//           console.warn('⚠️ Token refresh failed - resetting all state like logout');

//           // Reset ALL stores (like logout does)
//           try {
//             const { useProposalsStore } = await import('@/stores/proposals/proposalsStore');
//             const { useBoardStore } = await import('@/stores/board/boardStore');
//             const { useOrganizationStore } = await import('@/stores/organization/organizationStore');
//             const { useRemindersStore } = await import('@/stores/reminders/remindersStore');
//             const { useAppStore } = await import('@/stores/app/appStore');


//             useProposalsStore.getState().reset();
//             useBoardStore.getState().reset();
//             useOrganizationStore.getState().reset();
//             useRemindersStore.getState().reset();
//             useAppStore.getState().reset();
//           } catch (err) {
//             console.error('Error resetting stores:', err);
//           }

//           // Clear auth cache and state
//           clearAuthCache();
//           _setAuth(null, null);
//           _setProfile(null);
//           return;
//         }

//         // Skip duplicate INITIAL_SESSION events
//         const currentUser = get().user;
//         if (event === 'INITIAL_SESSION' && currentUser?.id === session?.user?.id) {
//           console.log('⏭️ Skipping duplicate INITIAL_SESSION');
//           return;
//         }

//         // Update auth state only if user changed
//         const currentUserId = get().user?.id;
//         const newUserId = session?.user?.id;

//         if (currentUserId !== newUserId) {
//           // ✅ Set flag to prevent concurrent updates
//           authChangeInProgress = true;

//           try {
//             _setAuth(session?.user ?? null, session);

//             if (session?.user) {
//               // Reset logging out state when user signs in
//               set({ isLoggingOut: false });
//               await fetchProfile(session.user.id);
//             } else {
//               _setProfile(null);
//               // Clear React Query cache on sign out
//               queryClient.clear();
//             }
//           } finally {
//             // ✅ Always reset flag
//             authChangeInProgress = false;
//           }
//         } else {
//           console.log('⏭️ Skipping auth update - user unchanged');
//         }
//       });
//     } catch (error) {
//       console.error('❌ Auth initialization error:', error);
//       _setError(error instanceof Error ? error.message : 'Failed to initialize auth');
//       set({ isInitialized: false }); // Reset on error
//     } finally {
//       _setLoading(false);
//     }

//     // Helper: Fetch user profile from database
//     // ✅ NEW: Uses React Query (automatic deduplication!)
//     async function fetchProfile(userId: string) {
//       try {
//         const profile = await queryClient.fetchQuery({
//           queryKey: queryKeys.user.profile(userId),
//           queryFn: async () => {
//             const { data, error } = await supabase
//               .from('profiles')
//               .select('*')
//               .eq('id', userId)
//               .single();

//             if (error && error.code !== 'PGRST116') {
//               throw error; // Ignore "not found" errors
//             }

//             return data || null;
//           },
//           staleTime: 5 * 60 * 1000, // 5 minutes
//         });

//         _setProfile(profile);
//       } catch (error) {
//         console.error('❌ Profile fetch error:', error);
//         _setError(error instanceof Error ? error.message : 'Failed to fetch profile');
//       }
//     }

//     // Helper: Clear all auth-related localStorage caches
//     function clearAuthCache() {
//       localStorage.removeItem('auth_cached_profile');
//       localStorage.removeItem('sidebar_cached_profile');
//       localStorage.removeItem('sidebar_cached_role');
//       localStorage.removeItem('auth_flow_state');
//       localStorage.removeItem('temp_onboarding_progress');
//       localStorage.removeItem('org_cached_organization');
//       localStorage.removeItem('org_cached_user_role');
//       localStorage.removeItem('org_cached_membership');

//       // Clear organization store (including subscription status)
//       // Import at runtime to avoid circular dependency
//       import('@/stores/organization/organizationStore').then(({ useOrganizationStore }) => {
//         useOrganizationStore.getState().reset();
//       });

//       // Clear proposals store to prevent previous user's data from persisting
//       import('@/stores/proposals/proposalsStore').then(({ useProposalsStore }) => {
//         useProposalsStore.getState().reset();
//       });
//     }
//   };
// };
