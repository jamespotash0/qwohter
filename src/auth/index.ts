/**
 * Auth Module - Centralized Exports
 *
 * Import auth functionality from here:
 *
 * ```typescript
 * import { useUser, useSession, useSignIn, useSignOut } from '@/auth';
 * ```
 */

// Provider
export { AuthProvider, useAuthContext } from './AuthProvider';

// Hooks
export {
  useUser,
  useSession,
  useProfile,
  useIsAuthenticated,
  useAuthStatus,
  useSignIn,
  useSignUp,
  useSignOut,
  useUpdateProfile,
  useVerifyOtp,
  useResendOtp,
  useResetPassword,
  useUpdatePassword,
  useAuthActions, // Deprecated - use individual hooks
} from './hooks/useAuth';

// Services (for advanced usage)
export * as authService from './services/authService';
export * as profileService from './services/profileService';

// Utils
export { AuthEventMutex } from './utils/AuthEventMutex';

// Types
export type { UserProfile, UpdateProfileData } from './services/profileService';
export type { SignInCredentials, SignUpCredentials, AuthResponse } from './services/authService';
