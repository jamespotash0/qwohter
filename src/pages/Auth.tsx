/**
 * Auth Page - Refactored
 * Clean, modular multi-step authentication flow
 *
 * Structure:
 * - Uses extracted hooks for state management
 * - Uses extracted actions for business logic
 * - Uses extracted utilities for helpers
 * - Main component is just orchestration (~200 lines)
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AuthForm } from "@/components/auth/AuthForm";
import { OtpVerificationForm } from "@/components/auth/OtpVerificationForm";
import { OrganizationSetupForm } from "@/components/auth/OrganizationSetupForm";
import { CompanyInfoSetupForm } from "@/components/auth/CompanyInfoSetupForm";
import { OnboardingProgress } from "@/components/auth/OnboardingProgress";
import { LogoUploadResult } from "@/services/LogoUploadService";
import { validateInviteToken } from "@/utils/inviteTokens";
import { tempSignupService } from "@/services/tempSignupService";
import { supabase } from "@/integrations/supabase/client";
import * as authService from "@/auth/services/authService";

// Import extracted hooks
import { useAuthFlow, useAuthFormState, useCompanyInfoState } from "./Auth/hooks";

// Import extracted actions
import {
  handleAuth,
  handleOtpVerification,
  handleOrganizationSubmit,
  handleInviteJoin,
  handleCompanyInfoSubmit,
  handleCompanyInfoSkip,
  handleLogoUpload,
  handleLogoError,
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

  // Determine if user is an invitee (has pending invite token or organizationId set)
  const isInvitee = !!(formState.organizationId || sessionStorage.getItem('pendingInviteToken'));

  // ============================================================================
  // RESET FORM WHEN SWITCHING BETWEEN SIGN-IN AND CREATE-ACCOUNT
  // ============================================================================
  useEffect(() => {
    // Reset form fields when route changes between sign-in and create-account
    formState.resetFormFields();
  }, [location.pathname]);

  // ============================================================================
  // INVITE TOKEN HANDLING (Priority: Sign out existing user if invite exists)
  // ============================================================================
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const inviteToken = urlParams.get('invite');

    // Skip if no invite token or already processed this token
    if (!inviteToken || !inviteToken.trim()) return;
    if (processedInviteTokenRef.current === inviteToken.trim()) {
      console.log('Invite token already processed, skipping');
      return;
    }

    // Prevent multiple executions
    if (formState.organizationId) return;

    // Handle secure invite token
    const handleInviteToken = async () => {
      try {
        // Mark token as being processed to prevent loops
        processedInviteTokenRef.current = inviteToken.trim();

        // FIRST: Check if user is currently logged in
        const session = await authService.getSession();

        if (session) {
          console.log('User logged in, signing out to process invite token');
          // Sign out the current user to allow invite acceptance
          await authService.signOut();
          // Clear any cached auth state
          clearAuthState();

          toast({
            title: "Signed out",
            description: "You've been signed out to accept this invitation",
          });
        }

        // THEN: Validate the invite token
        const tokenData = await validateInviteToken(inviteToken.trim());

        if (tokenData) {
          console.log('✅ Invite token validated, setting organizationId:', tokenData.organization_id);
          formState.setOrganizationId(tokenData.organization_id);
          // Store both invite token AND organizationId for later use after OTP verification
          sessionStorage.setItem('pendingInviteToken', inviteToken.trim());
          sessionStorage.setItem('pendingOrganizationId', tokenData.organization_id);
          console.log('✅ Stored pendingInviteToken and pendingOrganizationId in sessionStorage');

          // SECURITY: Remove token from URL to prevent leakage via history/logs/screenshots
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('invite');
          window.history.replaceState({}, '', newUrl.toString());

          toast({
            title: "Invite link detected",
            description: "You've been invited to join an organization",
          });
        } else {
          toast({
            title: "Invalid invite link",
            description: "This invite link may have expired or been used already.",
            variant: "destructive",
          });
          // Clear the ref if token was invalid so user can try again
          processedInviteTokenRef.current = null;
        }
      } catch (error) {
        console.error('Error validating invite token:', error);
        toast({
          title: "Error",
          description: "Could not validate invite link",
          variant: "destructive",
        });
        // Clear the ref on error so user can retry
        processedInviteTokenRef.current = null;
      }
    };

    handleInviteToken();
  }, [location.search]);

  // ============================================================================
  // STATE RESTORATION
  // ============================================================================
  useEffect(() => {
    // Prevent running if already redirecting
    if (authFlow.redirectingRef.current) return;

    const restoreState = async () => {
      const savedState = loadAuthState();

      if (savedState) {
        console.log('Found saved auth state:', savedState);

        // Validate that the session still exists before restoring state
        const session = await authService.getSession();

        if (!session || (savedState.userId && session.user.id !== savedState.userId)) {
          console.log('Session invalid or user mismatch, clearing saved state');
          clearAuthState();
          return;
        }

        console.log('Session valid, restoring auth state');

        if (savedState.email) formState.setEmail(savedState.email);
        if (savedState.userId) authFlow.setUserId(savedState.userId);
        if (savedState.fullName) formState.setFullName(savedState.fullName);
        if (savedState.orgChoice) authFlow.setOrgChoice(savedState.orgChoice as any);
        if (savedState.orgName) formState.setOrgName(savedState.orgName);

        if (savedState.step && savedState.step !== 'auth') {
          authFlow.setStep(savedState.step as any);
        }
      } else {
        // No saved state found - but don't clear tempSignup data yet
        // It has its own 2-hour expiry and is needed for resending OTP
        console.log('No saved state found, but keeping temp signup data for OTP resend');
      }
    };

    restoreState();
  }, []);

  // ============================================================================
  // ONBOARDING COMPLETION CHECK
  // ============================================================================
  useEffect(() => {
    const checkOnboardingCompletion = async () => {
      // Only check on auth step
      if (authFlow.step !== 'auth') return;
      if (authFlow.redirectingRef.current) return;

      // ✅ v3.0.0: Use authService instead of direct supabase.auth calls
      const session = await authService.getSession();
      if (!session) return;

      try {
        // Check if user has completed onboarding via memberships
        const { data: membership } = await supabase
          .from('memberships')
          .select('id, status') //membership_status
          .eq('user_id', session.user.id)
          .eq('status', 'Active') //membership_status
          .maybeSingle();

        // Check if profile has full_name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .maybeSingle();

        // If user has completed onboarding (has name and active membership), redirect to dashboard
        if (profile?.full_name && membership) {
          console.log('User has completed onboarding, redirecting to dashboard');
          authFlow.redirectingRef.current = true;
          clearAuthState();
          // Add delay to ensure session is fully established before redirect
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
  // EVENT HANDLERS (Using extracted actions)
  // ============================================================================

  const onAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAuth({
      email: formState.email,
      password: formState.password,
      confirmPassword: formState.confirmPassword,
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

    // Check if there's a pending invite token BEFORE OTP verification
    const pendingInviteToken = sessionStorage.getItem('pendingInviteToken');
    const pendingOrgId = sessionStorage.getItem('pendingOrganizationId');

    // Restore organizationId from sessionStorage if it's not in state
    if (pendingOrgId && !formState.organizationId) {
      console.log('🔄 Restoring organizationId from sessionStorage:', pendingOrgId);
      formState.setOrganizationId(pendingOrgId);
    }

    const effectiveOrgId = formState.organizationId || pendingOrgId || undefined;
    const isInviteeCheck = !!(pendingInviteToken && effectiveOrgId);

    console.log('🔍 OTP Submit - Checking invite status:', {
      hasPendingToken: !!pendingInviteToken,
      hasPendingOrgId: !!pendingOrgId,
      hasFormStateOrgId: !!formState.organizationId,
      effectiveOrgId,
      isInvitee: isInviteeCheck,
    });

    // Check if max attempts reached
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

    // Track failed attempts
    if (!result.success) {
      const newAttempts = otpAttempts + 1;
      setOtpAttempts(newAttempts);

      // Show contextual error message
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

    // Reset attempts on success
    setOtpAttempts(0);

    // After successful OTP verification, if this is an invitee, join the organization
    if (result.success && isInviteeCheck && result.userId && effectiveOrgId && pendingInviteToken) {
      console.log('🎯 Processing invite join after OTP verification', {
        userId: result.userId,
        organizationId: effectiveOrgId,
        hasToken: !!pendingInviteToken
      });

      // Process the invite join automatically
      await handleInviteJoin({
        userId: result.userId,
        organizationId: effectiveOrgId,
        inviteToken: pendingInviteToken,
        setLoading: authFlow.setLoading,
        navigate,
        toast,
        queryClient,
      });

      // Clear the pending invite data
      sessionStorage.removeItem('pendingInviteToken');
      sessionStorage.removeItem('pendingOrganizationId');
    }
  };

  const onResendCode = async () => {
    const { error } = await authService.resendOtp(formState.email);

    if (error) {
      // Extract the wait time from Supabase error message
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
        // Show the actual error message so user knows what went wrong
        toast({
          title: "Resend Failed",
          description: error.message || "Failed to resend verification code.",
          variant: "destructive"
        });
      }
      return;
    }

    // Update the OTP sent status if temp data exists
    const tempData = tempSignupService.get();
    if (tempData) {
      tempSignupService.markOtpSent();
    }

    // Reset OTP attempts
    setOtpAttempts(0);

    toast({
      title: "Code Sent!",
      description: "A new verification code has been sent to your email."
    });
  };

  const onChangeEmail = async (newEmail: string) => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      throw new Error("Invalid email format");
    }

    const tempData = tempSignupService.get();
    if (!tempData) {
      toast({
        title: "Session Expired",
        description: "Please start the signup process again.",
        variant: "destructive"
      });
      throw new Error("No temp signup data");
    }

    // Update the email in form state
    formState.setEmail(newEmail);

    // Clear OTP code
    formState.setOtpCode("");

    // Initiate a NEW signup with the new email (this will send a new OTP)
    // This creates a fresh signup flow for the new email
    const { error } = await authService.signUp({
      email: newEmail,
      password: tempData.password,
      fullName: tempData.fullName
    });

    if (error) {
      toast({
        title: "Error",
        description: `Failed to send code to new email: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    }

    // Update temp signup data with new email
    tempSignupService.store({
      email: newEmail,
      password: tempData.password,
      fullName: tempData.fullName
    });
    tempSignupService.markOtpSent();

    // Reset OTP attempts
    setOtpAttempts(0);

    toast({
      title: "Email Updated",
      description: `A verification code has been sent to ${newEmail}`,
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
      setStep: authFlow.setStep,
      setLoading: authFlow.setLoading,
      navigate,
      toast,
      saveAuthState,
    });

    // Invalidate organization query to refetch the newly created org
    if (authFlow.userId) {
      console.log('🔄 Invalidating organization query for userId:', authFlow.userId);
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.byUser(authFlow.userId)
      });
    }
  };

  const onCompanyInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleCompanyInfoSubmit({
      userId: authFlow.userId,
      companyPhone: companyInfo.companyPhone,
      companyFax: companyInfo.companyFax,
      companyAddress: companyInfo.companyAddress,
      companyWebsite: companyInfo.companyWebsite,
      quoteStartingPoint: companyInfo.quoteStartingPoint,
      industry: formState.industry,
      foundVia: formState.foundVia,
      setLoading: authFlow.setLoading,
      toast,
      clearAuthState,
      redirectAfterAuth: () => redirectAfterAuth(navigate),
      setStep: authFlow.setStep,
      navigate,
    });
  };

  const onCompanyInfoSkip = () => {
    handleCompanyInfoSkip({
      toast,
      clearAuthState,
      navigate,
    });
  };

  const onLogoUpload = (result: LogoUploadResult) => {
    handleLogoUpload(result, {
      setCurrentLogoUrl: companyInfo.setCurrentLogoUrl,
      toast,
    });
  };

  const onLogoError = (error: string) => {
    handleLogoError(error, toast);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header with logo - matching landing page */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              className="flex items-center cursor-pointer"
              onClick={() => navigate('/')}
            >
              <img
                src="/logos/New_Landing_Page_Logo_DarkonLightBackground.svg"
                alt="Qwohter Logo"
                className="h-8 w-auto transition-transform duration-200 hover:scale-105"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Background pattern with quote checkerboard design */}
      <div className="absolute inset-0">
        {/* Repeating quotation marks in checkerboard pattern */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `
              url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='30' y='60' font-family='serif' font-size='60' fill='%23334155' opacity='0.5'%3E%22%3C/text%3E%3Ctext x='90' y='60' font-family='serif' font-size='60' fill='%23EE6C4D' opacity='0.4'%3E%22%3C/text%3E%3Ctext x='60' y='30' font-family='serif' font-size='60' fill='%23334155' opacity='0.3'%3E%22%3C/text%3E%3Ctext x='60' y='90' font-family='serif' font-size='60' fill='%23334155' opacity='0.3'%3E%22%3C/text%3E%3C/svg%3E")
            `,
            backgroundSize: '120px 120px',
            backgroundRepeat: 'repeat'
          }}
        />

        {/* Alternating quotation pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `
              url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='15' y='45' font-family='serif' font-size='40' fill='%23475569' opacity='0.6' transform='rotate(15)'%3E%E2%80%9C%3C/text%3E%3Ctext x='75' y='75' font-family='serif' font-size='40' fill='%23475569' opacity='0.6' transform='rotate(-15)'%3E%E2%80%9D%3C/text%3E%3C/svg%3E")
            `,
            backgroundSize: '120px 120px',
            backgroundRepeat: 'repeat',
            backgroundPosition: '60px 60px'
          }}
        />

        {/* Subtle gradient orbs for depth */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-100/6 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-40 h-40 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(238, 108, 77, 0.04)' }} />
      </div>

      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full flex items-center justify-center">
          <div className={`w-full relative z-10 ${
            authFlow.step === "auth" && !authFlow.isSignUp ? "max-w-md" : "max-w-lg"
          }`}>
            {/* Main form card for all steps */}
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl overflow-hidden">
              {!["verify-otp"].includes(authFlow.step) && (
                <CardHeader className="text-center space-y-3 pb-2 pt-6 px-8">
                  {/* Progress Indicator - show for all onboarding steps */}
                  {authFlow.step !== "auth" && (
                  <OnboardingProgress currentStep={authFlow.step} isSignUp={authFlow.isSignUp} isInvitee={isInvitee} />
                  )}

                  <div className="space-y-1">
                  <CardTitle className="text-2xl font-bold text-center">
                    {authFlow.step === "auth" && (authFlow.isSignUp ? "Create Account" : "Welcome Back")}
                    {authFlow.step === "organization" && "Organization Setup"}
                    {authFlow.step === "company-info" && "Company Information"}
                  </CardTitle>
                  <CardDescription className="text-center">
                    {authFlow.step === "auth" && (authFlow.isSignUp
                    ? "Create your account to get started"
                    : "Sign in to your account"
                    )}
                    {authFlow.step === "organization" && "Join or create your organization"}
                    {authFlow.step === "company-info" && "Add your company details"}
                  </CardDescription>
                  </div>
                </CardHeader>
                )}

                {/* Progress Indicator for verify-otp step (standalone, no card header) */}
                {authFlow.step === "verify-otp" && (
                <div className="pt-6 px-8">
                  <OnboardingProgress currentStep={authFlow.step} isSignUp={authFlow.isSignUp} isInvitee={isInvitee} />
                </div>
                )}

                <CardContent className={authFlow.step === "verify-otp" ? "px-8 pb-8 pt-4 space-y-4" : "px-8 pb-8 space-y-4"}>

              {/* Auth Form (Sign-in / Sign-up) */}
              {authFlow.step === "auth" && (
              <AuthForm
                isSignUp={authFlow.isSignUp}
                email={formState.email}
                password={formState.password}
                confirmPassword={formState.confirmPassword}
                firstName={formState.firstName}
                lastName={formState.lastName}
                showPassword={formState.showPassword}
                loading={authFlow.loading}
                onEmailChange={formState.setEmail}
                onPasswordChange={formState.setPassword}
                onConfirmPasswordChange={formState.setConfirmPassword}
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
                organizationName={formState.orgName}
                phone={companyInfo.companyPhone}
                fax={companyInfo.companyFax}
                address={companyInfo.companyAddress}
                website={companyInfo.companyWebsite}
                quoteStartingPoint={companyInfo.quoteStartingPoint}
                industry={formState.industry}
                foundVia={formState.foundVia}
                loading={authFlow.loading}
                userId={authFlow.userId || ""}
                currentLogoUrl={companyInfo.currentLogoUrl}
                onPhoneChange={companyInfo.setCompanyPhone}
                onFaxChange={companyInfo.setCompanyFax}
                onAddressChange={companyInfo.setCompanyAddress}
                onWebsiteChange={companyInfo.setCompanyWebsite}
                onQuoteStartingPointChange={companyInfo.setQuoteStartingPoint}
                onIndustryChange={formState.setIndustry}
                onFoundViaChange={formState.setFoundVia}
                onLogoUpload={onLogoUpload}
                onLogoError={onLogoError}
                onSubmit={onCompanyInfoSubmit}
                onSkip={onCompanyInfoSkip}
              />
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
