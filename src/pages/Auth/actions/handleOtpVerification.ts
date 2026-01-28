/**
 * handleOtpVerification Action
 * Handles OTP code verification after sign-up
 * Includes rate limiting to prevent brute force attacks
 */

import { authFlowHelpers } from '@/utils/authFlowHelpers';
import {
  checkOtpRateLimit,
  recordFailedOtp,
  clearRateLimit,
  getRateLimitMessage,
} from '@/services/authRateLimitService';

interface HandleOtpVerificationParams {
  email: string;
  otpCode: string;
  fullName: string;
  setUserId: (id: string) => void;
  setStep: (step: 'auth' | 'verify-otp' | 'organization' | 'company-info') => void;
  setLoading: (loading: boolean) => void;
  toast: (props: { title: string; description: string; variant?: 'destructive' }) => void;
  saveAuthState: (state: any) => void;
  // Optional: For invite flow
  isInvitee?: boolean;
  organizationId?: string;
}

export const handleOtpVerification = async (params: HandleOtpVerificationParams): Promise<{ success: boolean; userId?: string; error?: string }> => {
  const {
    email,
    otpCode,
    fullName,
    setUserId,
    setStep,
    setLoading,
    toast,
    saveAuthState,
    isInvitee,
    organizationId,
  } = params;

  if (!otpCode || !email) return { success: false };

  setLoading(true);
  try {
    // Check OTP rate limit before attempting verification
    const rateCheck = await checkOtpRateLimit(email);

    if (!rateCheck.allowed) {
      toast({
        title: 'Too Many Attempts',
        description: getRateLimitMessage(rateCheck),
        variant: 'destructive',
      });
      setLoading(false);
      return { success: false, error: getRateLimitMessage(rateCheck) };
    }

    // Show warning if close to limit (OTP only allows 3 attempts)
    if (rateCheck.remaining_attempts && rateCheck.remaining_attempts <= 1) {
      toast({
        title: 'Warning',
        description: `Last attempt before temporary lockout.`,
        variant: 'destructive',
      });
    }

    const result = await authFlowHelpers.handleOtpVerification(email, otpCode);

    if (result.success && result.data?.userId) {
      // Clear OTP rate limit on successful verification
      await clearRateLimit(email, 'otp');

      setUserId(result.data.userId);

      // Automatically create profile with the name collected during signup
      if (fullName) {
        const profileResult = await authFlowHelpers.handleProfileSetup({
          userId: result.data.userId,
          fullName: fullName,
        });

        if (profileResult.success) {
          // For invited users, don't set step to 'organization'
          // Let the parent component handle the invite join flow
          if (!isInvitee) {
            setStep('organization');
            saveAuthState({ step: 'organization', email, userId: result.data.userId });
            toast({
              title: 'Email verified!',
              description: 'Please set up your organization.',
            });
          } else {
            // For invitees, just show verification success
            // The parent will handle joining the organization
            toast({
              title: 'Email verified!',
              description: 'Joining your organization...',
            });
          }
          return { success: true, userId: result.data.userId };
        } else {
          toast({
            title: 'Setup Error',
            description: profileResult.error as any,
            variant: 'destructive',
          });
          return { success: false };
        }
      } else {
        toast({
          title: 'Error',
          description: 'Missing name information. Please try signing up again.',
          variant: 'destructive',
        });
        return { success: false };
      }
    } else {
      // Record failed OTP attempt
      await recordFailedOtp(email);
      // Don't show toast here - let parent component handle it with attempt tracking
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    // Record failed OTP attempt on exception
    await recordFailedOtp(email);
    toast({
      title: 'Verification Error',
      description: error.message,
      variant: 'destructive',
    });
    return { success: false };
  } finally {
    setLoading(false);
  }
};
