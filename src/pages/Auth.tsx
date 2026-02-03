/**
 * Auth Page - Redesigned to Match Landing Page
 *
 * Matches the landing page aesthetic:
 * - Warm cream (#FFFEFA) background
 * - Dark gradient panel with coral blur orbs
 * - Urbanist typography
 * - Clean, award-winning design
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AuthForm } from "@/components/auth/AuthForm";
import { OtpVerificationForm } from "@/components/auth/OtpVerificationForm";
import { OrganizationSetupForm } from "@/components/auth/OrganizationSetupForm";
import { CompanyInfoSetupForm } from "@/components/auth/CompanyInfoSetupForm";
import { OnboardingProgress } from "@/components/auth/OnboardingProgress";
import { SignupRecoveryPrompt } from "@/components/auth/SignupRecoveryPrompt";
import { InviteRequiredScreen } from "@/components/auth/InviteRequiredScreen";
import { validateInviteTokenDetailed, validateSignupInviteToken } from "@/utils/inviteTokens";
import { checkInviteRateLimit, logInviteAttempt, getUserIpAddress } from "@/utils/rateLimiting";
import { tempSignupService } from "@/services/tempSignupService";
import { supabase } from "@/integrations/supabase/client";
import * as authService from "@/auth/services/authService";
import { stripeService } from "@/services/stripeService";

// Import extracted hooks
import { useAuthFlow, useAuthFormState, useCompanyInfoState } from "./Auth/hooks";

// Import extracted actions
import {
  handleAuth,
  handleOtpVerification,
  handleOrganizationSubmit,
  handleInviteJoin,
  handleCompanyInfoSubmit,
} from "./Auth/actions";

// Import extracted utilities
import { saveAuthState, loadAuthState, clearAuthState } from "./Auth/utils/authStatePersistence";
import { redirectAfterAuth } from "./Auth/utils/redirectHelpers";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use extracted hooks for state management
  const authFlow = useAuthFlow();
  const formState = useAuthFormState();
  const companyInfo = useCompanyInfoState();

  // Track processed invite tokens to prevent loops
  const processedInviteTokenRef = useRef<string | null>(null);

  // Track OTP verification attempts
  const [otpAttempts, setOtpAttempts] = useState(0);
  const MAX_OTP_ATTEMPTS = 3;

  // Track invite token validation to prevent form flash
  const [validatingInviteToken, setValidatingInviteToken] = useState(() => {
    // Initialize to true if URL has invite token - prevents form flash
    const urlParams = new URLSearchParams(window.location.search);
    const hasTeamInvite = !!(urlParams.get('invite') && location.pathname === '/create-account');
    const hasAppInvite = !!(urlParams.get('appinvite') && location.pathname === '/create-account');
    return hasTeamInvite || hasAppInvite;
  });

  // Track processed app invite tokens to prevent loops
  const processedAppInviteTokenRef = useRef<string | null>(null);

  // Track when user tries to access create-account without an invite
  const [showInviteRequired, setShowInviteRequired] = useState(false);

  // Determine if user is an invitee (has pending invite token or organizationId set)
  const isInvitee = !!(formState.organizationId || sessionStorage.getItem('pendingInviteToken'));

  // ============================================================================
  // BLOCK PUBLIC SIGN-UP (require invite token)
  // ============================================================================
  useEffect(() => {
    // Only check on /create-account route
    if (location.pathname !== '/create-account') return;

    const urlParams = new URLSearchParams(location.search);
    const inviteToken = urlParams.get('invite');
    const appInvite = urlParams.get('appinvite');
    const pendingInvite = sessionStorage.getItem('pendingInviteToken');
    const pendingSignupInvite = sessionStorage.getItem('pendingSignupInviteToken');

    // If no invite token of any kind, show the invite required screen
    if (!inviteToken && !appInvite && !pendingInvite && !pendingSignupInvite) {
      setShowInviteRequired(true);
    } else {
      setShowInviteRequired(false);
    }
  }, [location.pathname, location.search]);

  // ============================================================================
  // RESET FORM WHEN SWITCHING BETWEEN SIGN-IN AND CREATE-ACCOUNT
  // ============================================================================
  useEffect(() => {
    formState.resetFormFields();
  }, [location.pathname]);

  // ============================================================================
  // INVITE TOKEN HANDLING (Validate FIRST, only sign out if token is valid)
  // ============================================================================
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const inviteToken = urlParams.get('invite');

    if (!inviteToken || !inviteToken.trim()) return;
    if (processedInviteTokenRef.current === inviteToken.trim()) {
      return;
    }

    if (formState.organizationId) return;

    const handleInviteToken = async () => {
      setValidatingInviteToken(true);
      try {
        processedInviteTokenRef.current = inviteToken.trim();

        // 1. Validate the token FIRST — don't sign out until we know it's valid
        const validationResult = await validateInviteTokenDetailed(inviteToken.trim());

        // Clean the invite param from URL regardless of result
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('invite');
        window.history.replaceState({}, '', newUrl.toString());

        if (!validationResult.success || !validationResult.data) {
          // Token is invalid — show error page, never sign out
          const errorType = validationResult.error?.type || 'Invalid';
          processedInviteTokenRef.current = null;
          navigate(`/invalid-invitation?error=${errorType}`, {
            replace: true,
          });
          return;
        }

        // 2. Token is valid — check if signed-in user can handle it directly
        const session = await authService.getSession();
        if (session?.user) {
          const currentEmail = session.user.email?.toLowerCase();
          const inviteEmail = validationResult.data.email?.toLowerCase();

          if (currentEmail && inviteEmail && currentEmail !== inviteEmail) {
            // Email mismatch — this invite is for a different person, don't sign them out
            toast({
              title: "Different account required",
              description: `This invitation is for ${validationResult.data.email}. Sign out and use that email to accept it.`,
            });
            processedInviteTokenRef.current = null;
            setValidatingInviteToken(false);
            navigate('/dashboard', { replace: true });
            return;
          }

          // Email matches — auto-join directly without sign-out/OTP
          if (currentEmail && currentEmail === inviteEmail) {
            try {
              const { data: inviteResult } = await (supabase.rpc as any)('auto_join_pending_invite', {
                p_user_id: session.user.id,
                p_user_email: session.user.email,
              });

              if (inviteResult?.joined) {
                toast({
                  title: "Joined!",
                  description: `Welcome to ${inviteResult.organization_name}!`,
                });

                // Sync Stripe seat count (non-blocking)
                stripeService.syncSeatCount(inviteResult.organization_id, 'add').catch((err: any) =>
                  console.error('Seat sync error after invite auto-join:', err)
                );

                queryClient.invalidateQueries({ queryKey: queryKeys.organization.all });
                queryClient.invalidateQueries({ queryKey: queryKeys.user.all });

                setValidatingInviteToken(false);
                navigate('/dashboard', { replace: true });
                return;
              } else if (inviteResult?.already_member) {
                toast({
                  title: "Already a member",
                  description: `You're already a member of ${inviteResult.organization_name}.`,
                });
                setValidatingInviteToken(false);
                navigate('/dashboard', { replace: true });
                return;
              }
            } catch (err) {
              console.error('Auto-join from invite link failed:', err);
              // Fall through to normal sign-out + create-account flow
            }
          }

          // Fallback: sign out and proceed with create-account flow
          await authService.signOut();
          clearAuthState();

          toast({
            title: "Signed out",
            description: "You've been signed out to accept this invitation",
          });
        }

        // 3. Set up the invite flow (user not signed in or signed out above)
        formState.setOrganizationId(validationResult.data.organization_id);
        sessionStorage.setItem('pendingInviteToken', inviteToken.trim());
        sessionStorage.setItem('pendingOrganizationId', validationResult.data.organization_id);

        toast({
          title: "Invite link detected",
          description: "You've been invited to join an organization",
        });

        // Token is valid - show the form
        setValidatingInviteToken(false);
      } catch (error) {
        console.error('Error validating invite token:', error);
        processedInviteTokenRef.current = null;

        // Remove the invite param from URL before navigating
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('invite');
        window.history.replaceState({}, '', newUrl.toString());

        navigate('/invalid-invitation?error=Invalid', {
          replace: true,
        });
      }
    };

    handleInviteToken();
  }, [location.search]);

  // ============================================================================
  // APP INVITE TOKEN HANDLING (for new organization signups)
  // ============================================================================
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const appInviteToken = urlParams.get('appinvite');

    // Only process on /create-account route
    if (location.pathname !== '/create-account') return;
    if (!appInviteToken || !appInviteToken.trim()) return;
    if (processedAppInviteTokenRef.current === appInviteToken.trim()) {
      return;
    }

    // Skip if we already have a pending signup invite
    if (sessionStorage.getItem('pendingSignupInviteToken')) {
      setValidatingInviteToken(false);
      return;
    }

    const handleAppInviteToken = async () => {
      setValidatingInviteToken(true);
      const tokenValue = appInviteToken.trim();
      try {
        processedAppInviteTokenRef.current = tokenValue;

        // SECURITY: Check rate limit before processing (stricter for platform-level signup invites)
        const userIp = await getUserIpAddress();
        const rateLimitCheck = await checkInviteRateLimit({
          ipAddress: userIp,
          inviteToken: tokenValue,
          windowMinutes: 10,
          maxAttempts: 3,
        });

        if (!rateLimitCheck.allowed) {
          console.warn('⚠️ Signup invite rate limit exceeded:', rateLimitCheck);
          processedAppInviteTokenRef.current = null;

          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('appinvite');
          window.history.replaceState({}, '', newUrl.toString());

          toast({
            title: 'Too Many Attempts',
            description: rateLimitCheck.reason,
            variant: 'destructive',
          });
          setValidatingInviteToken(false);
          return;
        }

        // Sign out existing user if any
        const session = await authService.getSession();
        if (session) {
          await authService.signOut();
          clearAuthState();
        }

        // Validate the signup invite token
        const validationResult = await validateSignupInviteToken(tokenValue);

        if (validationResult.success && validationResult.data) {
          // Log successful validation attempt
          logInviteAttempt({
            ipAddress: userIp,
            userId: null,
            inviteToken: tokenValue,
            success: true,
          });

          // Store the validated signup invite for use after OTP verification
          sessionStorage.setItem('pendingSignupInviteToken', tokenValue);
          sessionStorage.setItem('pendingSignupInviteEmail', validationResult.data.email);

          // Pre-fill the email if available
          if (validationResult.data.email) {
            formState.setEmail(validationResult.data.email);
          }

          // Remove the appinvite param from URL
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('appinvite');
          window.history.replaceState({}, '', newUrl.toString());

          toast({
            title: "Signup invitation validated",
            description: "Create your account to get started",
          });

          // Token is valid - show the form
          setValidatingInviteToken(false);
        } else {
          // Log failed validation attempt
          logInviteAttempt({
            ipAddress: userIp,
            userId: null,
            inviteToken: tokenValue,
            success: false,
            errorMessage: validationResult.error?.message,
          });

          // Navigate to the invalid invitation page with error type
          const errorType = validationResult.error?.type || 'Invalid';

          processedAppInviteTokenRef.current = null;

          // Remove the appinvite param from URL before navigating
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('appinvite');
          window.history.replaceState({}, '', newUrl.toString());

          navigate(`/invalid-invitation?error=${errorType}&type=signup`, {
            replace: true,
          });
        }
      } catch (error) {
        console.error('Error validating app invite token:', error);

        // Log the exception as a failed attempt
        getUserIpAddress().then(ip => {
          logInviteAttempt({
            ipAddress: ip,
            userId: null,
            inviteToken: tokenValue,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }).catch(() => {});

        processedAppInviteTokenRef.current = null;

        // Remove the appinvite param from URL before navigating
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('appinvite');
        window.history.replaceState({}, '', newUrl.toString());

        navigate('/invalid-invitation?error=Invalid&type=signup', {
          replace: true,
        });
      }
    };

    handleAppInviteToken();
  }, [location.search, location.pathname]);

  // ============================================================================
  // STATE RESTORATION
  // ============================================================================
  useEffect(() => {
    if (authFlow.redirectingRef.current) return;

    const restoreState = async () => {
      const savedState = loadAuthState();

      if (savedState) {
        const session = await authService.getSession();

        if (!session || (savedState.userId && session.user.id !== savedState.userId)) {
          clearAuthState();
          // Also clear temp signup data to prevent OTP state from being restored
          tempSignupService.clear();
        } else {
          if (savedState.email) formState.setEmail(savedState.email);
          if (savedState.userId) authFlow.setUserId(savedState.userId);
          if (savedState.fullName) formState.setFullName(savedState.fullName);
          if (savedState.orgName) formState.setOrgName(savedState.orgName);
          if (savedState.organizationId) authFlow.setOrganizationId(savedState.organizationId);

          if (savedState.step && savedState.step !== 'auth') {
            authFlow.setStep(savedState.step as any);
          }
          return;
        }
      } else {
        // loadAuthState() returned null - check for interrupted signup flow
        const tempData = tempSignupService.get();
        if (tempData && tempData.otpSent) {
          // User was in OTP verification but got interrupted (reload/navigation)
          // Show recovery prompt instead of auto-navigating to OTP or clearing
          console.log('[Auth] Detected interrupted signup flow, showing recovery prompt');
          formState.setEmail(tempData.email);
          formState.setFullName(tempData.fullName);
          authFlow.setStep('signup-recovery');
          return;
        }
      }

      // Only restore from tempSignupService if user hasn't sent OTP yet
      // This allows pre-filled form data to persist, but prevents OTP loop
      const tempData = tempSignupService.get();
      if (tempData && !tempData.otpSent) {
        formState.setEmail(tempData.email);
        formState.setFullName(tempData.fullName);
      }
    };

    restoreState();
  }, []);

  // ============================================================================
  // ONBOARDING COMPLETION CHECK
  // ============================================================================
  useEffect(() => {
    const checkOnboardingCompletion = async () => {
      if (authFlow.step !== 'auth') return;
      if (authFlow.redirectingRef.current) return;

      const session = await authService.getSession();
      if (!session) return;

      try {
        const { data: membership } = await supabase
          .from('memberships')
          .select('id, status')
          .eq('user_id', session.user.id)
          .eq('status', 'Active')
          .maybeSingle();

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .maybeSingle();

        const typedProfile = profile as { full_name?: string } | null;

        if (typedProfile?.full_name && membership) {
          authFlow.redirectingRef.current = true;
          clearAuthState();
          setTimeout(() => {
            redirectAfterAuth(navigate);
          }, 500);
        }
      } catch (error) {
        console.error('Error checking onboarding completion:', error);
      }
    };

    checkOnboardingCompletion();
  }, [authFlow.step]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const onAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAuth({
      email: formState.email,
      password: formState.password,
      firstName: formState.firstName,
      lastName: formState.lastName,
      isSignUp: authFlow.isSignUp,
      setFullName: formState.setFullName,
      setUserId: authFlow.setUserId,
      setStep: authFlow.setStep,
      setLoading: authFlow.setLoading,
      redirectingRef: authFlow.redirectingRef,
      navigate,
      toast,
      saveAuthState,
      clearAuthState,
    });
  };

  const onOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const pendingInviteToken = sessionStorage.getItem('pendingInviteToken');
    const pendingOrgId = sessionStorage.getItem('pendingOrganizationId');

    if (pendingOrgId && !formState.organizationId) {
      formState.setOrganizationId(pendingOrgId);
    }

    const effectiveOrgId = formState.organizationId || pendingOrgId || undefined;
    const isInviteeCheck = !!(pendingInviteToken && effectiveOrgId);

    if (otpAttempts >= MAX_OTP_ATTEMPTS) {
      toast({
        title: "Too Many Attempts",
        description: "Please request a new verification code to continue.",
        variant: "destructive"
      });
      return;
    }

    const result = await handleOtpVerification({
      email: formState.email,
      otpCode: formState.otpCode,
      fullName: formState.fullName,
      setUserId: authFlow.setUserId,
      setStep: authFlow.setStep,
      setLoading: authFlow.setLoading,
      toast,
      saveAuthState,
      isInvitee: isInviteeCheck,
      organizationId: effectiveOrgId,
    });

    if (!result.success) {
      const newAttempts = otpAttempts + 1;
      setOtpAttempts(newAttempts);

      if (newAttempts >= MAX_OTP_ATTEMPTS) {
        toast({
          title: "Too Many Failed Attempts",
          description: "Please click 'Resend Code' to get a new verification code.",
          variant: "destructive"
        });
      } else {
        const remainingAttempts = MAX_OTP_ATTEMPTS - newAttempts;
        toast({
          title: "Invalid Code",
          description: `Incorrect verification code. ${remainingAttempts} ${remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining.`,
          variant: "destructive"
        });
      }
      return;
    }

    setOtpAttempts(0);

    if (result.success && isInviteeCheck && result.userId && effectiveOrgId && pendingInviteToken) {
      await handleInviteJoin({
        userId: result.userId,
        organizationId: effectiveOrgId,
        inviteToken: pendingInviteToken,
        setLoading: authFlow.setLoading,
        navigate,
        toast,
        queryClient,
      });

      sessionStorage.removeItem('pendingInviteToken');
      sessionStorage.removeItem('pendingOrganizationId');
    }
  };

  const onResendCode = async () => {
    const { error } = await authService.resendOtp(formState.email);

    if (error) {
      const waitTimeMatch = error.message?.match(/after (\d+) seconds/);

      if (waitTimeMatch && waitTimeMatch[1]) {
        const seconds = parseInt(waitTimeMatch[1], 10);
        toast({
          title: "Please Wait",
          description: `You can request another code in ${seconds} seconds.`,
          variant: "destructive"
        });
      } else if (error.message?.includes('rate limit') || error.message?.includes('Email rate limit exceeded')) {
        toast({
          title: "Too Many Attempts",
          description: "Please wait 60 seconds before requesting another code.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Resend Failed",
          description: error.message || "Failed to resend verification code.",
          variant: "destructive"
        });
      }
      // Throw so OtpVerificationForm knows resend failed and won't show success overlay
      throw new Error(error.message || "Failed to resend code");
    }

    const tempData = tempSignupService.get();
    if (tempData) {
      tempSignupService.markOtpSent();
    }

    setOtpAttempts(0);

    toast({
      title: "Code Sent!",
      description: "Check your inbox. If no email arrives, wait 60 seconds before trying again."
    });
  };

  const onOrganizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleOrganizationSubmit({
      userId: authFlow.userId,
      orgName: formState.orgName,
      industry: formState.industry,
      foundVia: formState.foundVia,
      submissionInProgress: authFlow.submissionInProgress,
      setSubmissionInProgress: authFlow.setSubmissionInProgress,
      setOrganizationId: authFlow.setOrganizationId,
      setStep: authFlow.setStep,
      setLoading: authFlow.setLoading,
      navigate,
      toast,
      saveAuthState,
    });

    if (authFlow.userId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.byUser(authFlow.userId)
      });
    }
  };

  const onCompanyInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleCompanyInfoSubmit({
      userId: authFlow.userId,
      organizationId: authFlow.organizationId,
      companyPhone: companyInfo.companyPhone,
      companyFax: companyInfo.companyFax,
      companyAddress: companyInfo.companyAddress,
      companyWebsite: companyInfo.companyWebsite,
      industry: formState.industry,
      foundVia: formState.foundVia,
      setLoading: authFlow.setLoading,
      toast,
      clearAuthState,
      redirectAfterAuth: () => redirectAfterAuth(navigate),
      navigate,
    });
  };

  // Recovery flow handlers
  const onRecoveryContinue = async () => {
    // Resend OTP and navigate to verification
    const { error } = await authService.resendOtp(formState.email);

    if (error) {
      toast({
        title: "Could not send code",
        description: error.message || "Please try again or start over.",
        variant: "destructive"
      });
      throw error;
    }

    // Update temp signup to mark OTP as sent with fresh timestamp
    const tempData = tempSignupService.get();
    if (tempData) {
      tempSignupService.store({
        email: tempData.email,
        password: tempData.password,
        fullName: tempData.fullName,
      });
      tempSignupService.markOtpSent();
    }

    setOtpAttempts(0);
    authFlow.setStep('verify-otp');
    saveAuthState({ step: 'verify-otp', email: formState.email, fullName: formState.fullName });

    toast({
      title: "Code Sent!",
      description: "Check your inbox for the verification code."
    });
  };

  const onRecoveryStartOver = () => {
    // Clear all temp data and go back to signup form
    tempSignupService.clear();
    clearAuthState();
    sessionStorage.removeItem('pendingSignupInviteToken');
    sessionStorage.removeItem('pendingSignupInviteEmail');
    formState.setEmail('');
    formState.setFullName('');
    formState.setPassword('');
    formState.setOtpCode('');
    authFlow.setStep('auth');
    navigate('/create-account');
  };

  // Sign out and switch to different account
  const handleSwitchAccount = async () => {
    try {
      // Sign out from Supabase if authenticated
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }

    // Clear all state
    tempSignupService.clear();
    clearAuthState();
    sessionStorage.removeItem('pendingSignupInviteToken');
    sessionStorage.removeItem('pendingSignupInviteEmail');
    sessionStorage.removeItem('pendingInviteToken');
    sessionStorage.removeItem('pendingOrganizationId');
    formState.setEmail('');
    formState.setFullName('');
    formState.setPassword('');
    formState.setOtpCode('');
    formState.setOrgName('');
    companyInfo.setCompanyPhone('');
    companyInfo.setCompanyFax('');
    companyInfo.setCompanyAddress('');
    companyInfo.setCompanyWebsite('');
    formState.setIndustry('');
    formState.setFoundVia('');

    // Navigate to sign-in
    authFlow.setStep('auth');
    navigate('/sign-in');
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getStepTitle = () => {
    if (authFlow.step === "auth") return authFlow.isSignUp ? "Create your account" : "Welcome back";
    if (authFlow.step === "signup-recovery") return "Welcome back";
    if (authFlow.step === "verify-otp") return "Verify your email";
    if (authFlow.step === "organization") return "Set up your organization";
    if (authFlow.step === "company-info") return "Company details";
    return "";
  };

  const getStepSubtitle = () => {
    if (authFlow.step === "auth") return authFlow.isSignUp
      ? "Start creating winning proposals in minutes"
      : "Sign in to continue building proposals";
    if (authFlow.step === "signup-recovery") return "Pick up where you left off";
    if (authFlow.step === "verify-otp") return "We sent a code to your email";
    if (authFlow.step === "organization") return "Create your workspace";
    if (authFlow.step === "company-info") return "Help us personalize your experience";
    return "";
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Show loading state while validating invite token to prevent form flash
  if (validatingInviteToken) {
    return (
      <div className="min-h-screen bg-[#FFFEFA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#EE6C4D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p
            className="text-[#171717]/50 text-sm"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            Validating invitation...
          </p>
        </div>
      </div>
    );
  }

  // Show invite required screen when accessing /create-account without an invite
  if (showInviteRequired) {
    return (
      <div className="min-h-screen bg-[#FFFEFA] flex">
        {/* Left Panel - Cream & Pink Style (same as main auth) */}
        <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] bg-gradient-to-br from-[#FFFEFA] via-[#FFF9F7] to-[#FFE8E3] flex-col items-center justify-center p-10 xl:p-12 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute top-[-100px] right-[-150px] w-[500px] h-[500px] rounded-full blur-[100px] opacity-40"
              style={{ background: '#EE6C4D' }}
            />
            <div
              className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full blur-[80px] opacity-30"
              style={{ background: '#F7C4BB' }}
            />
          </div>
          <div className="relative z-10 text-center max-w-[600px] px-4">
            <div className="cursor-pointer mb-8" onClick={() => navigate('/')}>
              <img
                src="/logos/New_Landing_Page_Logo_DarkonLightBackground.svg"
                alt="Qwohter"
                className="h-[42px] w-auto mx-auto"
              />
            </div>
            <h1
              className="text-[28px] xl:text-[32px] leading-[1.2] tracking-[-0.01em] text-[#171717] mb-8"
              style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
            >
              The all-in-one tool to automate
              <br />
              proposals, billing, and management.
            </h1>
            <div className="pt-6 border-t border-[#171717]/10">
              <p className="text-sm text-[#171717]/50 mb-3" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                Trusted by companies in these industries
              </p>
              <p className="text-sm text-[#171717]/70" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                Construction · Landscaping · HVAC · Roofing · Electrical · Plumbing
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Invite Required Screen */}
        <div className="flex-1 flex flex-col min-h-screen bg-[#FFF9F7]">
          <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#FFF9F7]/90 backdrop-blur-md border-b border-[#171717]/5">
            <div className="px-6 py-4">
              <div className="cursor-pointer" onClick={() => navigate('/')}>
                <img
                  src="/logos/New_Landing_Page_Logo_DarkonLightBackground.svg"
                  alt="Qwohter"
                  className="h-7 w-auto"
                />
              </div>
            </div>
          </header>
          <div className="flex-1 flex items-center justify-center px-6 py-20 lg:py-12">
            <div className="w-full max-w-[420px]">
              <InviteRequiredScreen />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFEFA] flex">
      {/* Left Panel - Cream & Pink Style */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] bg-gradient-to-br from-[#FFFEFA] via-[#FFF9F7] to-[#FFE8E3] flex-col items-center justify-center p-10 xl:p-12 relative overflow-hidden">
        {/* Soft pink blur orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-[-100px] right-[-150px] w-[500px] h-[500px] rounded-full blur-[100px] opacity-40"
            style={{ background: '#EE6C4D' }}
          />
          <div
            className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full blur-[80px] opacity-30"
            style={{ background: '#F7C4BB' }}
          />
        </div>

        {/* Centered Content */}
        <div className="relative z-10 text-center max-w-[600px] px-4">
          {/* Logo */}
          <div
            className="cursor-pointer mb-8"
            onClick={() => navigate('/')}
          >
            <img
              src="/logos/New_Landing_Page_Logo_DarkonLightBackground.svg"
              alt="Qwohter"
              className="h-[42px] w-auto mx-auto"
            />
          </div>

          {/* Main Title */}
          <h1
            className="text-[28px] xl:text-[32px] leading-[1.2] tracking-[-0.01em] text-[#171717] mb-8"
            style={{
              fontFamily: 'Urbanist, sans-serif',
              fontWeight: 600,
            }}
          >
            The all-in-one tool to automate
            <br />
            proposals, billing, and management.
          </h1>

          {/* Trusted By Section */}
          <div className="pt-6 border-t border-[#171717]/10">
            <p
              className="text-sm text-[#171717]/50 mb-3"
              style={{ fontFamily: 'Urbanist, sans-serif' }}
            >
              Trusted by companies in these industries
            </p>
            <p
              className="text-sm text-[#171717]/70"
              style={{ fontFamily: 'Urbanist, sans-serif' }}
            >
              Construction · Landscaping · HVAC · Roofing · Electrical · Plumbing
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Area */}
      <div className="flex-1 flex flex-col min-h-screen bg-[#FFF9F7]">
        {/* Mobile header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#FFF9F7]/90 backdrop-blur-md border-b border-[#171717]/5">
          <div className="px-6 py-4">
            <div
              className="cursor-pointer"
              onClick={() => navigate('/')}
            >
              <img
                src="/logos/New_Landing_Page_Logo_DarkonLightBackground.svg"
                alt="Qwohter"
                className="h-7 w-auto"
              />
            </div>
          </div>
        </header>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-6 py-20 lg:py-12">
          <div className={`w-full ${
            authFlow.step === "company-info" ? "max-w-2xl" : "max-w-[420px]"
          }`}>
            {/* Progress indicator - show for onboarding steps (not recovery) */}
            {authFlow.step !== "auth" && authFlow.step !== "signup-recovery" && (
              <div className="mb-6">
                <OnboardingProgress
                  currentStep={authFlow.step}
                  isSignUp={authFlow.isSignUp}
                  isInvitee={isInvitee}
                />
              </div>
            )}

            {/* Step header */}
            <div className={`mb-6 ${(authFlow.step === "signup-recovery" || authFlow.step === "verify-otp" || authFlow.step === "organization" || authFlow.step === "company-info") ? "text-center" : ""}`}>
              <h2
                className="text-[28px] text-[#171717] tracking-[0.3px] leading-[1.2] mb-1"
                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
              >
                {getStepTitle()}
              </h2>
              <p
                className="text-[#171717]/50 text-sm"
                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 400 }}
              >
                {getStepSubtitle()}
              </p>
            </div>

            {/* Form */}
            <div>
              {/* Auth Form (Sign-in / Sign-up) */}
              {authFlow.step === "auth" && (
                <AuthForm
                  isSignUp={authFlow.isSignUp}
                  email={formState.email}
                  password={formState.password}
                  firstName={formState.firstName}
                  lastName={formState.lastName}
                  showPassword={formState.showPassword}
                  loading={authFlow.loading}
                  onEmailChange={formState.setEmail}
                  onPasswordChange={formState.setPassword}
                  onFirstNameChange={formState.setFirstName}
                  onLastNameChange={formState.setLastName}
                  onTogglePasswordVisibility={() => formState.setShowPassword(!formState.showPassword)}
                  onSubmit={onAuthSubmit}
                  onToggleMode={() => {
                    if (authFlow.isSignUp) {
                      navigate("/sign-in");
                    } else {
                      navigate("/create-account");
                    }
                  }}
                />
              )}

              {/* Signup Recovery Prompt - shown when user returns with interrupted OTP flow */}
              {authFlow.step === "signup-recovery" && (
                <SignupRecoveryPrompt
                  email={formState.email}
                  fullName={formState.fullName}
                  loading={authFlow.loading}
                  onContinue={onRecoveryContinue}
                  onStartOver={onRecoveryStartOver}
                />
              )}

              {/* OTP Verification Form */}
              {authFlow.step === "verify-otp" && (
                <OtpVerificationForm
                  otpCode={formState.otpCode}
                  email={formState.email}
                  loading={authFlow.loading}
                  onOtpCodeChange={formState.setOtpCode}
                  onSubmit={onOtpSubmit}
                  onResendCode={onResendCode}
                />
              )}

              {/* Organization Setup Form */}
              {authFlow.step === "organization" && (
                <OrganizationSetupForm
                  orgName={formState.orgName}
                  loading={authFlow.loading}
                  onOrgNameChange={formState.setOrgName}
                  onSubmit={onOrganizationSubmit}
                />
              )}

              {/* Company Info Form */}
              {authFlow.step === "company-info" && (
                <CompanyInfoSetupForm
                  phone={companyInfo.companyPhone}
                  fax={companyInfo.companyFax}
                  address={companyInfo.companyAddress}
                  website={companyInfo.companyWebsite}
                  industry={formState.industry}
                  foundVia={formState.foundVia}
                  loading={authFlow.loading}
                  onPhoneChange={companyInfo.setCompanyPhone}
                  onFaxChange={companyInfo.setCompanyFax}
                  onAddressChange={companyInfo.setCompanyAddress}
                  onWebsiteChange={companyInfo.setCompanyWebsite}
                  onIndustryChange={formState.setIndustry}
                  onFoundViaChange={formState.setFoundVia}
                  onSubmit={onCompanyInfoSubmit}
                />
              )}

              {/* Switch account link - shown during onboarding steps */}
              {(authFlow.step === "verify-otp" || authFlow.step === "organization" || authFlow.step === "company-info") && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="text-xs text-[#171717]/40 hover:text-[#171717]/60 transition-colors"
                    style={{ fontFamily: 'Urbanist, sans-serif' }}
                  >
                    Use a different account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Auth;
