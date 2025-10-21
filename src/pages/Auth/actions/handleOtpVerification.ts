/**
 * handleOtpVerification Action
 * Handles OTP code verification after sign-up
 */

import { authFlowHelpers } from '@/utils/authFlowHelpers';

interface HandleOtpVerificationParams {
  email: string;
  otpCode: string;
  fullName: string;
  setUserId: (id: string) => void;
  setStep: (step: 'auth' | 'verify-otp' | 'organization' | 'company-info') => void;
  setLoading: (loading: boolean) => void;
  toast: (props: { title: string; description: string; variant?: 'destructive' }) => void;
  saveAuthState: (state: any) => void;
}

export const handleOtpVerification = async (params: HandleOtpVerificationParams) => {
  const {
    email,
    otpCode,
    fullName,
    setUserId,
    setStep,
    setLoading,
    toast,
    saveAuthState,
  } = params;

  if (!otpCode || !email) return;

  setLoading(true);
  try {
    const result = await authFlowHelpers.handleOtpVerification(email, otpCode);

    if (result.success && result.data?.userId) {
      setUserId(result.data.userId);

      // Automatically create profile with the name collected during signup
      if (fullName) {
        const profileResult = await authFlowHelpers.handleProfileSetup({
          userId: result.data.userId,
          fullName: fullName,
        });

        if (profileResult.success) {
          setStep('organization');
          saveAuthState({ step: 'organization', email, userId: result.data.userId });
          toast({
            title: 'Email verified!',
            description: 'Please set up your organization.',
          });
        } else {
          toast({
            title: 'Setup Error',
            description: profileResult.error as any,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Error',
          description: 'Missing name information. Please try signing up again.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Verification Error',
        description: result.error as any,
        variant: 'destructive',
      });
    }
  } catch (error: any) {
    toast({
      title: 'Verification Error',
      description: error.message,
      variant: 'destructive',
    });
  } finally {
    setLoading(false);
  }
};
