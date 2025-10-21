/**
 * handleAuth Action
 * Handles sign-in and sign-up authentication
 */

import { authFlowHelpers } from '@/utils/authFlowHelpers';
import { NavigateFunction } from 'react-router-dom';

interface HandleAuthParams {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  isSignUp: boolean;
  setFullName: (name: string) => void;
  setUserId: (id: string) => void;
  setStep: (step: 'auth' | 'verify-otp' | 'organization' | 'company-info') => void;
  setLoading: (loading: boolean) => void;
  redirectingRef: React.MutableRefObject<boolean>;
  navigate: NavigateFunction;
  toast: (props: { title: string; description: string; variant?: 'destructive' }) => void;
  saveAuthState: (state: any) => void;
  clearAuthState: () => void;
}

export const handleAuth = async (params: HandleAuthParams) => {
  const {
    email,
    password,
    confirmPassword,
    firstName,
    lastName,
    isSignUp,
    setFullName,
    setUserId,
    setStep,
    setLoading,
    redirectingRef,
    navigate,
    toast,
    saveAuthState,
    clearAuthState,
  } = params;

  // Validation
  if (!email || !password) return;

  // Sign-up specific validation
  if (isSignUp) {
    if (!confirmPassword) {
      toast({
        title: 'Password confirmation required',
        description: 'Please confirm your password',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are identical',
        variant: 'destructive',
      });
      return;
    }
  }

  console.log('=== AUTH FORM SUBMISSION ===');
  console.log('Email:', email);
  console.log('IsSignUp:', isSignUp);

  setLoading(true);
  try {
    let result;

    if (isSignUp) {
      // Handle sign-up
      console.log('Calling handleSignUp...');
      const combinedFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      setFullName(combinedFullName);

      result = await authFlowHelpers.handleSignUp(email, password, combinedFullName);
      console.log('SignUp result:', result);

      if (result.success) {
        console.log('SignUp successful, setting step to verify-otp');
        setStep('verify-otp');
        saveAuthState({ step: 'verify-otp', email, fullName: combinedFullName });
        toast({
          title: 'Verification code sent!',
          description: 'Please check your email and enter the 6-digit code.',
        });
      }
    } else {
      // Handle sign-in
      console.log('Calling handleSignIn...');
      result = await authFlowHelpers.handleSignIn(email, password);
      console.log('SignIn result:', result);

      if (result.success) {
        console.log('Auth form: signin success with nextStep:', result.nextStep);

        // Handle different nextStep outcomes
        if (result.nextStep === 'complete') {
          console.log('Auth form: User onboarding complete, redirecting to dashboard');
          toast({
            title: 'Welcome back!',
            description: "You've been successfully signed in.",
          });
          // Clear auth state and redirect
          clearAuthState();
          redirectingRef.current = true;
          navigate('/dashboard');
        } else if (result.nextStep === 'pending-approval') {
          console.log('Auth form: User membership is pending, redirecting to pending-approval');
          toast({
            title: 'Approval Pending',
            description: 'Your organization membership is awaiting admin approval.',
          });
          // Clear auth state and redirect
          clearAuthState();
          redirectingRef.current = true;
          navigate('/pending-approval');
        } else if (result.nextStep === 'profile' || result.nextStep === 'organization') {
          console.log('Signin successful - resuming onboarding at organization step');
          setUserId(result.data?.userId || '');
          setStep('organization');
          saveAuthState({ step: 'organization', email, userId: result.data?.userId });
          toast({
            title: 'Welcome back!',
            description: 'Please complete your organization setup to continue.',
          });
        }
      }
    }

    if (!result.success) {
      toast({
        title: 'Authentication Error',
        description: result.error as any,
        variant: 'destructive',
      });
    }
  } catch (error: any) {
    toast({
      title: 'Authentication Error',
      description: error.message,
      variant: 'destructive',
    });
  } finally {
    setLoading(false);
  }
};
