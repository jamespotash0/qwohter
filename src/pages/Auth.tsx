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
          const validation = await validateInviteToken(inviteToken.trim());

          if (validation.valid && validation.organizationCode) {
            formState.setOrgCode(validation.organizationCode);
            authFlow.setOrgChoice('join');
            toast({
              title: "Invite link detected",
              description: `You're joining ${validation.organizationName || 'an organization'}`,
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

  const onOrganizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleOrganizationSubmit({
      orgChoice: authFlow.orgChoice,
      userId: authFlow.userId,
      orgName: formState.orgName,
      orgCode: formState.orgCode,
      submissionInProgress: authFlow.submissionInProgress,
      setSubmissionInProgress: authFlow.setSubmissionInProgress,
      setStep: authFlow.setStep,
      setLoading: authFlow.setLoading,
      navigate,
      toast,
      locationSearch: location.search,
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
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
        </CardHeader>
        <CardContent>
          {/* Progress Indicator */}
          <OnboardingProgress currentStep={authFlow.step} />

          {/* Auth Form (Sign-in / Sign-up) */}
          {authFlow.step === "auth" && (
            <AuthForm
              email={formState.email}
              setEmail={formState.setEmail}
              password={formState.password}
              setPassword={formState.setPassword}
              confirmPassword={formState.confirmPassword}
              setConfirmPassword={formState.setConfirmPassword}
              firstName={formState.firstName}
              setFirstName={formState.setFirstName}
              lastName={formState.lastName}
              setLastName={formState.setLastName}
              isSignUp={authFlow.isSignUp}
              loading={authFlow.loading}
              showPassword={formState.showPassword}
              setShowPassword={formState.setShowPassword}
              onSubmit={onAuthSubmit}
            />
          )}

          {/* OTP Verification Form */}
          {authFlow.step === "verify-otp" && (
            <OtpVerificationForm
              otpCode={formState.otpCode}
              setOtpCode={formState.setOtpCode}
              email={formState.email}
              loading={authFlow.loading}
              onSubmit={onOtpSubmit}
            />
          )}

          {/* Organization Setup Form */}
          {authFlow.step === "organization" && (
            <OrganizationSetupForm
              orgChoice={authFlow.orgChoice}
              setOrgChoice={authFlow.setOrgChoice}
              orgName={formState.orgName}
              setOrgName={formState.setOrgName}
              orgCode={formState.orgCode}
              setOrgCode={formState.setOrgCode}
              industry={formState.industry}
              setIndustry={formState.setIndustry}
              foundVia={formState.foundVia}
              setFoundVia={formState.setFoundVia}
              loading={authFlow.loading}
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
  );
};

export default Auth;
