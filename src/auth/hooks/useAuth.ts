/**
 * Auth Hooks - Industry Standard
 *
 * REPLACES:
 * - useUser() from stores/auth/authStore.ts
 * - useProfile() from stores/auth/authStore.ts
 * - useIsAuthenticated() from stores/auth/authStore.ts
 * - useAuthLoading() from stores/auth/authStore.ts
 * - useAuthError() from stores/auth/authStore.ts
 * - useAuthActions() from stores/auth/authStore.ts
 *
 * Clean API for components to access auth state.
 * ALL data comes from React Query (single source of truth).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import * as authService from '../services/authService';
import * as profileService from '../services/profileService';
import { useAuthContext } from '../AuthProvider';
import type { User } from '@supabase/supabase-js';
import type { UserProfile, UpdateProfileData } from '../services/profileService';

/**
 * Get current user from session
 *
 * @returns User object or null if not authenticated
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const user = useUser();
 *   if (!user) return <div>Not logged in</div>;
 *   return <div>Welcome {user.email}</div>;
 * }
 * ```
 */
export function useUser(): User | null {
  const { data: session } = useSession();
  return session?.user ?? null;
}

/**
 * Get current session
 *
 * @returns React Query result with session data
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data: session, isLoading } = useSession();
 *   if (isLoading) return <div>Loading...</div>;
 *   return <div>Token expires: {session?.expires_at}</div>;
 * }
 * ```
 */
export function useSession() {
  return useQuery({
    queryKey: queryKeys.user.session(),
    queryFn: () => authService.getSession(),
    staleTime: 60 * 1000, // 1 minute
    retry: false,
  });
}

/**
 * Get user profile from database
 *
 * @param userId - Optional user ID (defaults to current user)
 * @returns React Query result with profile data
 *
 * @example
 * ```tsx
 * function ProfileCard() {
 *   const { data: profile, isLoading } = useProfile();
 *   if (isLoading) return <Skeleton />;
 *   return <div>{profile?.full_name}</div>;
 * }
 * ```
 */
export function useProfile(userId?: string) {
  const user = useUser();
  const id = userId || user?.id;

  return useQuery({
    queryKey: queryKeys.user.profile(id!),
    queryFn: () => profileService.fetchUserProfile(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Check if user is authenticated
 *
 * @returns Boolean indicating authentication status
 *
 * @example
 * ```tsx
 * function ProtectedContent() {
 *   const isAuthenticated = useIsAuthenticated();
 *   if (!isAuthenticated) return <Navigate to="/sign-in" />;
 *   return <div>Protected content</div>;
 * }
 * ```
 */
export function useIsAuthenticated(): boolean {
  const user = useUser();
  return !!user;
}

/**
 * Get auth context (initialization status, loading, errors)
 *
 * @returns Auth context with isInitialized, isLoading, error
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isInitialized, isLoading } = useAuthStatus();
 *   if (!isInitialized || isLoading) return <LoadingScreen />;
 *   return <Router />;
 * }
 * ```
 */
export function useAuthStatus() {
  return useAuthContext();
}

/**
 * Sign in with email and password
 *
 * @returns Mutation object with mutate function
 *
 * @example
 * ```tsx
 * function LoginForm() {
 *   const { mutate: signIn, isPending, error } = useSignIn();
 *
 *   const handleSubmit = (email, password) => {
 *     signIn({ email, password }, {
 *       onSuccess: () => navigate('/dashboard'),
 *       onError: (err) => toast.error(err.message),
 *     });
 *   };
 * }
 * ```
 */
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.signIn,
    onSuccess: (result) => {
      if (result.error) {
        throw result.error;
      }

      // Session will be updated by AuthProvider's listener
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    },
  });
}

/**
 * Sign up with email and password
 *
 * @returns Mutation object with mutate function
 *
 * @example
 * ```tsx
 * function SignUpForm() {
 *   const { mutate: signUp, isPending } = useSignUp();
 *
 *   const handleSubmit = (credentials) => {
 *     signUp(credentials, {
 *       onSuccess: () => {
 *         toast.success('Check your email for verification');
 *       },
 *     });
 *   };
 * }
 * ```
 */
export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.signUp,
    onSuccess: (result) => {
      if (result.error) {
        throw result.error;
      }

      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    },
  });
}

/**
 * Sign out current user
 *
 * @returns Mutation object with mutate function
 *
 * @example
 * ```tsx
 * function LogoutButton() {
 *   const { mutate: signOut, isPending } = useSignOut();
 *
 *   return (
 *     <Button onClick={() => signOut()} disabled={isPending}>
 *       {isPending ? 'Signing out...' : 'Sign Out'}
 *     </Button>
 *   );
 * }
 * ```
 */
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.signOut,
    onSuccess: (result) => {
      if (result.error) {
        throw result.error;
      }

      // Cache will be cleared by AuthProvider's listener
      // This just triggers the signout process
    },
  });
}

/**
 * Update user profile
 *
 * @returns Mutation object with mutate function
 *
 * @example
 * ```tsx
 * function EditProfileForm() {
 *   const user = useUser();
 *   const { mutate: updateProfile, isPending } = useUpdateProfile();
 *
 *   const handleSubmit = (updates) => {
 *     updateProfile({ userId: user.id, updates }, {
 *       onSuccess: () => toast.success('Profile updated'),
 *     });
 *   };
 * }
 * ```
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: UpdateProfileData }) =>
      profileService.updateUserProfile(userId, updates),
    onSuccess: (updatedProfile) => {
      // Update cache with new profile
      queryClient.setQueryData(queryKeys.user.profile(updatedProfile.id), updatedProfile);

      // Invalidate to trigger refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.profile(updatedProfile.id),
      });
    },
  });
}

/**
 * Verify OTP code
 *
 * @returns Mutation object with mutate function
 *
 * @example
 * ```tsx
 * function OtpForm() {
 *   const { mutate: verifyOtp, isPending } = useVerifyOtp();
 *
 *   const handleSubmit = (email, code) => {
 *     verifyOtp({ email, token: code }, {
 *       onSuccess: () => navigate('/organization'),
 *     });
 *   };
 * }
 * ```
 */
export function useVerifyOtp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, token }: { email: string; token: string }) =>
      authService.verifyOtp(email, token),
    onSuccess: (result) => {
      if (result.error) {
        throw result.error;
      }

      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    },
  });
}

/**
 * Resend OTP code
 *
 * @returns Mutation object with mutate function
 */
export function useResendOtp() {
  return useMutation({
    mutationFn: (email: string) => authService.resendOtp(email),
    onSuccess: (result) => {
      if (result.error) {
        throw result.error;
      }
    },
  });
}

/**
 * Reset password (send email)
 *
 * @returns Mutation object with mutate function
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: (email: string) => authService.resetPassword(email),
    onSuccess: (result) => {
      if (result.error) {
        throw result.error;
      }
    },
  });
}

/**
 * Update password (after reset)
 *
 * @returns Mutation object with mutate function
 */
export function useUpdatePassword() {
  return useMutation({
    mutationFn: (newPassword: string) => authService.updatePassword(newPassword),
    onSuccess: (result) => {
      if (result.error) {
        throw result.error;
      }
    },
  });
}

/**
 * Get all auth actions (for backward compatibility)
 *
 * @deprecated Use individual hooks instead
 */
export function useAuthActions() {
  const { mutate: signIn, isPending: isSigningIn } = useSignIn();
  const { mutate: signUp, isPending: isSigningUp } = useSignUp();
  const { mutate: signOut, isPending: isSigningOut } = useSignOut();
  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateProfile();

  return {
    signIn,
    signUp,
    signOut,
    updateProfile,
    isSigningIn,
    isSigningUp,
    isSigningOut,
    isUpdatingProfile,
  };
}
