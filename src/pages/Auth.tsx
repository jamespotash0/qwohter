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

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AuthForm } from "@/components/auth/AuthForm";
import { OtpVerificationForm } from "@/components/auth/OtpVerificationForm";
import { OrganizationSetupForm } from "@/components/auth/OrganizationSetupForm";
import { CompanyInfoSetupForm } from "@/components/auth/CompanyInfoSetupForm";
import { SubscriptionSelectionForm } from "@/components/auth/SubscriptionSelectionForm";
import { TrialActivationForm } from "@/components/auth/TrialActivationForm";
import { OnboardingProgress } from "@/components/auth/OnboardingProgress";
import { LogoUploadResult } from "@/services/LogoUploadService";
import { validateInviteToken } from "@/utils/inviteTokens";
import { tempSignupService } from "@/services/tempSignupService";
import { supabase } from "@/integrations/supabase/client";
import { stripeService } from "@/services/stripeService";
import { fetchOrganizationByUserId } from "@/services/organizationService";
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

  // Use extracted hooks for state management
  const authFlow = useAuthFlow();
  const formState = useAuthFormState();
  const companyInfo = useCompanyInfoState();

  // ============================================================================
  // RESET FORM WHEN SWITCHING BETWEEN SIGN-IN AND CREATE-ACCOUNT
  // ============================================================================
  useEffect(() => {
    // Reset form fields when route changes between sign-in and create-account
    formState.resetFormFields();
  }, [location.pathname]);

  // ============================================================================
  // INVITE TOKEN HANDLING
  // ============================================================================
  useEffect(() => {
    // Prevent multiple executions
    if (formState.orgCode) return;

    const urlParams = new URLSearchParams(location.search);
    const inviteToken = urlParams.get('invite');

    if (inviteToken && inviteToken.trim()) {
      // Handle secure invite token
      const handleInviteToken = async () => {
        try {
          const tokenData = await validateInviteToken(inviteToken.trim());

          if (tokenData) {
            formState.setOrgCode(tokenData.organization_code);
            // Store invite token for later use after OTP verification
            sessionStorage.setItem('pendingInviteToken', inviteToken.trim());
            toast({
              title: "Invite link detected",
              description: `You're joining ${tokenData.organization_code}`,
            });
          } else {
            toast({
              title: "Invalid invite link",
              description: "This invite link may have expired or been used already.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('Error validating invite token:', error);
          toast({
            title: "Error",
            description: "Could not validate invite link",
            variant: "destructive",
          });
        }
      };

      handleInviteToken();
    }
  }, [location.search]);

  // ============================================================================
  // STATE RESTORATION
  // ============================================================================
  useEffect(() => {
    // Prevent running if already redirecting
    if (authFlow.redirectingRef.current) return;

    const savedState = loadAuthState();

    if (savedState) {
      console.log('Restoring auth state:', savedState);

      if (savedState.email) formState.setEmail(savedState.email);
      if (savedState.userId) authFlow.setUserId(savedState.userId);
      if (savedState.fullName) formState.setFullName(savedState.fullName);
      if (savedState.orgChoice) authFlow.setOrgChoice(savedState.orgChoice as any);
      if (savedState.orgName) formState.setOrgName(savedState.orgName);
      if (savedState.orgCode) formState.setOrgCode(savedState.orgCode);

      if (savedState.step && savedState.step !== 'auth') {
        authFlow.setStep(savedState.step as any);
      }
    } else {
      // No saved state found - but don't clear tempSignup data yet
      // It has its own 2-hour expiry and is needed for resending OTP
      console.log('No saved state found, but keeping temp signup data for OTP resend');
    }
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
    await handleOtpVerification({
      email: formState.email,
      otpCode: formState.otpCode,
      fullName: formState.fullName,
      setUserId: authFlow.setUserId,
      setStep: authFlow.setStep,
      setLoading: authFlow.setLoading,
      toast,
      saveAuthState,
    });

    // After successful OTP verification, check if there's a pending invite
    const pendingInviteToken = sessionStorage.getItem('pendingInviteToken');
    if (pendingInviteToken && authFlow.userId) {
      // Process the invite join automatically
      await handleInviteJoin({
        userId: authFlow.userId,
        orgCode: formState.orgCode,
        inviteToken: pendingInviteToken,
        setLoading: authFlow.setLoading,
        navigate,
        toast,
      });
      // Clear the pending invite token
      sessionStorage.removeItem('pendingInviteToken');
    }
  };

  const onResendCode = async () => {
    // Check if we have temporary signup data
    const tempData = tempSignupService.get();
    if (!tempData || tempData.email !== formState.email) {
      toast({
        title: "Session Expired",
        description: "Please sign up again to resend verification code.",
        variant: "destructive"
      });
      authFlow.setStep("auth");
      return;
    }

    // ✅ v3.0.0: Use authService instead of direct supabase.auth calls
    const { error } = await authService.resendOtp(formState.email);

    if (error) {
      // Extract the wait time from Supabase error message
      // Format: "For security purposes, you can only request this after 42 seconds."
      const waitTimeMatch = error.message?.match(/after (\d+) seconds/);

      if (waitTimeMatch && waitTimeMatch[1]) {
        const seconds = parseInt(waitTimeMatch[1], 10);
        toast({
          title: "Please Wait",
          description: `Please Wait - You can request another code in ${seconds} seconds.`,
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
          title: "Error",
          description: "Failed to resend verification code. Please try again.",
          variant: "destructive"
        });
      }
      // Don't throw - let the error be handled gracefully without clearing state
      return;
    }

    // Update the OTP sent status
    tempSignupService.markOtpSent();
  };

  const onChangeEmail = () => {
    // Clear temp signup data
    tempSignupService.clear();

    // Clear auth state
    clearAuthState();

    // Reset to auth step
    authFlow.setStep("auth");

    // Clear OTP code
    formState.setOtpCode("");

    toast({
      title: "Email Reset",
      description: "You can now enter a new email address.",
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

  const onSelectPlan = async (planName: string, billingPeriod: 'monthly' | 'yearly') => {
    authFlow.setLoading(true);
    try {
      // Fetch current organization from database
      if (!authFlow.userId) {
        toast({
          title: 'Error',
          description: 'User not found. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      const membership = await fetchOrganizationByUserId(authFlow.userId);

      if (!membership?.organization) {
        toast({
          title: 'Error',
          description: 'No organization found. Please complete the organization setup first.',
          variant: 'destructive',
        });
        return;
      }

      const currentOrg = membership.organization;

      if (!currentOrg) {
        toast({
          title: 'Error',
          description: 'No organization found. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // All plans include a 14-day free trial configured in Stripe
      // Redirect user to complete their setup and choose a plan
      toast({
        title: 'Welcome!',
        description: 'Complete your setup by choosing a plan. All plans include a 14-day free trial.',
      });
      clearAuthState();
      // Redirect to billing settings to choose a plan
      navigate('/settings?tab=billing');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process subscription',
        variant: 'destructive',
      });
    } finally {
      authFlow.setLoading(false);
    }
  };

  const onSkipSubscription = () => {
    toast({
      title: 'Setup completed!',
      description: 'You can choose a plan later in Settings.',
    });
    clearAuthState();
    navigate('/dashboard');
  };

  const onActivateTrial = async () => {
    authFlow.setLoading(true);
    try {
      // Fetch current organization from database
      if (!authFlow.userId) {
        toast({
          title: 'Error',
          description: 'User not found. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      const membership = await fetchOrganizationByUserId(authFlow.userId);
      const currentOrg = membership?.organization;

      if (!currentOrg) {
        toast({
          title: 'Error',
          description: 'No organization found. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // Enroll organization in 14-day trial
      const trialResult = await stripeService.enrollInFreeTrial(currentOrg.id);

      if (trialResult.error) {
        toast({
          title: 'Error',
          description: trialResult.error || 'Failed to activate trial',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Trial activated!',
        description: 'Your 14-day free trial starts today. Enjoy full access to all features!',
      });

      clearAuthState();
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to activate trial',
        variant: 'destructive',
      });
    } finally {
      authFlow.setLoading(false);
    }
  };

  const onChoosePlan = () => {
    clearAuthState();
    navigate('/settings?tab=billing');
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
            authFlow.step === "subscription" || authFlow.step === "trial-activation" ? "max-w-4xl" :
            authFlow.step === "auth" && !authFlow.isSignUp ? "max-w-md" :
            "max-w-lg"
          }`}>
            {/* Trial Activation step - no card wrapper */}
            {authFlow.step === "trial-activation" ? (
              <TrialActivationForm
                loading={authFlow.loading}
                onActivateTrial={onActivateTrial}
                onChoosePlan={onChoosePlan}
              />
            ) : authFlow.step === "subscription" ? (
              /* Subscription step - no card wrapper */
              <SubscriptionSelectionForm
                loading={authFlow.loading}
                onSelectPlan={onSelectPlan}
                onSkip={onSkipSubscription}
              />
            ) : (
              /* Main form card for other steps */
                <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl overflow-hidden">
                {!["subscription", "trial-activation", "verify-otp"].includes(authFlow.step) && (
                <CardHeader className="text-center space-y-3 pb-2 pt-6 px-8">
                  {/* Progress Indicator - show for all onboarding steps */}
                  {authFlow.step !== "auth" && (
                  <OnboardingProgress currentStep={authFlow.step} isSignUp={authFlow.isSignUp} />
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
                  <OnboardingProgress currentStep={authFlow.step} isSignUp={authFlow.isSignUp} />
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
                onChangeEmail={onChangeEmail}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
