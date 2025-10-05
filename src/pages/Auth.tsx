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
import { OnboardingProgress } from "@/components/auth/OnboardingProgress";
import { LogoUploadResult } from "@/services/LogoUploadService";
import { validateInviteToken } from "@/utils/inviteTokens";
import { tempSignupService } from "@/services/tempSignupService";
import { supabase } from "@/integrations/supabase/client";

// Import extracted hooks
import { useAuthFlow, useAuthFormState, useCompanyInfoState } from "./Auth/hooks";

// Import extracted actions
import {
  handleAuth,
  handleOtpVerification,
  handleOrganizationSubmit,
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
  // INVITE TOKEN HANDLING
  // ============================================================================
  useEffect(() => {
    // Prevent multiple executions
    if (formState.orgCode || authFlow.orgChoice) return;

    const urlParams = new URLSearchParams(location.search);
    const inviteToken = urlParams.get('invite');
    const orgCodeFromUrl = urlParams.get('org');

    if (inviteToken && inviteToken.trim()) {
      // Handle secure invite token
      const handleInviteToken = async () => {
        try {
          const tokenData = await validateInviteToken(inviteToken.trim());

          if (tokenData) {
            formState.setOrgCode(tokenData.organization_code);
            authFlow.setOrgChoice('join');
            toast({
              title: "Invite link detected",
              description: `You're joining an organization`,
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
    } else if (orgCodeFromUrl && orgCodeFromUrl.trim()) {
      // Handle legacy org code parameter
      formState.setOrgCode(orgCodeFromUrl.trim().toUpperCase());
      authFlow.setOrgChoice('join');
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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        // Check if user has completed onboarding via memberships
        const { data: membership } = await supabase
          .from('memberships')
          .select('id, status')
          .eq('user_id', session.user.id)
          .eq('status', 'Active')
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

    // Resend OTP using the same approach as initial signup
    const { error } = await supabase.auth.signInWithOtp({
      email: formState.email,
      options: {
        shouldCreateUser: false
      }
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to resend verification code. Please try again.",
        variant: "destructive"
      });
      throw error;
    }

    // Update the OTP sent status
    tempSignupService.markOtpSent();
  };

  const onOrganizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleOrganizationSubmit({
      orgChoice: authFlow.orgChoice,
      userId: authFlow.userId,
      orgName: formState.orgName,
      orgCode: formState.orgCode,
      industry: formState.industry,
      foundVia: formState.foundVia,
      submissionInProgress: authFlow.submissionInProgress,
      setSubmissionInProgress: authFlow.setSubmissionInProgress,
      setStep: authFlow.setStep,
      setLoading: authFlow.setLoading,
      navigate,
      toast,
      locationSearch: location.search,
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
      setLoading: authFlow.setLoading,
      toast,
      clearAuthState,
      redirectAfterAuth: () => redirectAfterAuth(navigate),
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
                src="/logos/Landing_Page_Logo_Light.svg"
                alt="Qwohter Logo"
                className="h-8 w-auto"
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
              url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='30' y='60' font-family='serif' font-size='60' fill='%23334155' opacity='0.5'%3E%22%3C/text%3E%3Ctext x='90' y='60' font-family='serif' font-size='60' fill='%23f97316' opacity='0.4'%3E%22%3C/text%3E%3Ctext x='60' y='30' font-family='serif' font-size='60' fill='%23334155' opacity='0.3'%3E%22%3C/text%3E%3Ctext x='60' y='90' font-family='serif' font-size='60' fill='%23334155' opacity='0.3'%3E%22%3C/text%3E%3C/svg%3E")
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
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-orange-100/4 rounded-full blur-3xl" />
      </div>

      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full flex items-center justify-center">
          <div className={`w-full relative z-10 ${
            authFlow.step === "company-info" ? "max-w-lg" : "max-w-md"
          }`}>
            {/* Main form card */}
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="text-center space-y-3 pb-2 pt-6 px-8">
                {/* Progress Indicator - show for all onboarding steps */}
                {authFlow.step !== "auth" && (
                  <OnboardingProgress currentStep={authFlow.step} isSignUp={authFlow.isSignUp} />
                )}

                <div className="space-y-1">
                  <CardTitle className="text-2xl font-bold text-center">
                    {authFlow.step === "auth" && (authFlow.isSignUp ? "Create Account" : "Welcome Back")}
                    {authFlow.step === "verify-otp" && "Verify Your Email"}
                    {authFlow.step === "organization" && "Organization Setup"}
                    {authFlow.step === "company-info" && "Company Information"}
                  </CardTitle>
                  <CardDescription className="text-center">
                    {authFlow.step === "auth" && (authFlow.isSignUp
                      ? "Create your account to get started"
                      : "Sign in to your account"
                    )}
                    {authFlow.step === "verify-otp" && "Enter the code sent to your email"}
                    {authFlow.step === "organization" && "Join or create your organization"}
                    {authFlow.step === "company-info" && "Add your company details"}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-4">

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
              orgChoice={authFlow.orgChoice}
              orgCode={formState.orgCode}
              orgName={formState.orgName}
              loading={authFlow.loading}
              onOrgChoiceChange={authFlow.setOrgChoice}
              onOrgCodeChange={formState.setOrgCode}
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
