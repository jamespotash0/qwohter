import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { authFlowHelpers } from "@/utils/authFlowHelpers";
import { authStateHelpers } from "@/utils/authStateHelpers";
import { onboardingStateHelpers } from "@/services/onboardingStateService";
import { OrganizationCreationLimiter } from "@/services/rateLimitingService";
import { AuthForm } from "@/components/auth/AuthForm";
import { OtpVerificationForm } from "@/components/auth/OtpVerificationForm";
import { OrganizationSetupForm } from "@/components/auth/OrganizationSetupForm";
import { CompanyInfoSetupForm } from "@/components/auth/CompanyInfoSetupForm";
import { OnboardingProgress } from "@/components/auth/OnboardingProgress";
import { organizationSettingsService } from "@/services/companySettingsService";
import { supabase } from "@/integrations/supabase/client";
import { LogoUploadResult } from "@/services/LogoUploadService";
import { tempSignupService } from "@/services/tempSignupService";

interface ProfileData {
  full_name: string | null;
  email: string;
}

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fullName, setFullName] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Determine if we're in create account mode based on the route
  const isCreateAccountRoute = location.pathname === '/create-account';

  const [orgChoice, setOrgChoice] = useState<"join" | "create" | null>(null);
  const [orgCode, setOrgCode] = useState("");
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("");
  const [foundVia, setFoundVia] = useState("");
  const [isSignUp, setIsSignUp] = useState(isCreateAccountRoute);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"auth" | "verify-otp" | "organization" | "company-info">("auth");
  const [otpCode, setOtpCode] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [submissionInProgress, setSubmissionInProgress] = useState(false);

  // Use ref to track current step for auth listener (avoids stale closure issues)
  const stepRef = useRef(step);
  const userIdRef = useRef(userId);
  const redirectingRef = useRef(false); // Prevent duplicate redirects

  // Update refs when state changes
  useEffect(() => {
    stepRef.current = step;
    userIdRef.current = userId;
  }, [step, userId]);

  // Company information state
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyFax, setCompanyFax] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [quoteStartingPoint, setQuoteStartingPoint] = useState("");
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | undefined>();

  // Update isSignUp state when route changes
  useEffect(() => {
    setIsSignUp(isCreateAccountRoute);
  }, [isCreateAccountRoute]);

  // Auth flow state persistence helpers
  const saveAuthState = (authState: {
    step: string;
    email?: string;
    userId?: string;
    fullName?: string;
    orgChoice?: string;
    orgName?: string;
    orgCode?: string;
  }) => {
    const stateWithTimestamp = {
      ...authState,
      timestamp: Date.now()
    };
    localStorage.setItem('auth_flow_state', JSON.stringify(stateWithTimestamp));
  };

  const loadAuthState = () => {
    try {
      const saved = localStorage.getItem('auth_flow_state');
      if (!saved) return null;
      
      const state = JSON.parse(saved);
      
      // Check if state is too old (expire after 24 hours)
      if (state.timestamp && Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
        console.log('Auth state expired, clearing');
        clearAuthState();
        return null;
      }
      
      return state;
    } catch (error) {
      console.error('Error loading auth state:', error);
      clearAuthState(); // Clear corrupted state
      return null;
    }
  };

  const clearAuthState = () => {
    localStorage.removeItem('auth_flow_state');
  };

  useEffect(() => {
    // Prevent running if already redirecting
    if (redirectingRef.current) {
      return;
    }
    
    const initAuth = async () => {
      // Check current session first AND validate it
      // Use signup flow validation if we're in post-OTP steps
      const postOtpSteps = ["verify-otp", "organization", "company-info"];
      const isSignupFlow = postOtpSteps.includes(step);
      const session = await authStateHelpers.checkValidAuthSession(isSignupFlow);
      
      // If user has a session, check if they completed onboarding
      if (session && step === "auth") {
        // Check user's profile and organization status
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', session.user.id)
            .single() as { data: ProfileData | null };

          // Check if user has completed onboarding via memberships
          const { data: memberships } = await supabase
            .from('memberships')
            .select('id, status')
            .eq('user_id', session.user.id)
            .eq('status', 'Active')
            .single();

          // If user has completed onboarding (has name and active membership), redirect to dashboard
          if (profile && profile.full_name && memberships) {
            if (!redirectingRef.current) {
              console.log('User has completed onboarding, redirecting to dashboard');
              redirectingRef.current = true;
              clearAuthState();
              // Add delay to ensure session is fully established before redirect
              setTimeout(() => {
                navigate("/dashboard");
              }, 500);
            }
            return;
          } else {
            // User has session but incomplete onboarding - use onboarding state helper
            console.log('User has session but incomplete onboarding:', profile);

            const nextStep = await onboardingStateHelpers.determineOnboardingStep(session.user.id);
            if (nextStep) {
              setStep(nextStep as any);
              setUserId(session.user.id);
              setEmail(session.user.email || '');
              if (profile?.full_name) {
                setFullName(profile.full_name);
              }
            }
            return;
          }
        } catch (error) {
          console.error('Error checking profile status:', error);
          // If we can't check profile, stay on auth page
        }
      }

      // Only restore auth state if we have NO session (incomplete signup flow)
      // AND the state is recent (less than 1 hour old)
      const savedState = loadAuthState();
      if (savedState && !session) {
        // Check if state is too old (expire after 1 hour for incomplete flows)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        if (savedState.timestamp < oneHourAgo) {
          console.warn('Saved auth state is too old, clearing');
          clearAuthState();
          return;
        }

        // Validate the saved state makes sense
        const validSteps = ["verify-otp", "organization", "company-info"];
        if (!validSteps.includes(savedState.step)) {
          console.warn('Invalid saved step for incomplete flow, clearing state');
          clearAuthState();
          return;
        }

        // For incomplete signup flows, require userId and email
        if (!savedState.userId || !savedState.email) {
          console.warn('Missing userId/email for incomplete signup, clearing state');
          clearAuthState();
          return;
        }

        // For now, be more aggressive about clearing state
        // Only allow restoring verify-otp state if it's very recent (< 10 minutes)
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        if (savedState.timestamp < tenMinutesAgo) {
          console.warn('Saved auth state is older than 10 minutes, clearing');
          clearAuthState();
          return;
        }

        // Restore the incomplete signup state
        setStep(savedState.step);
        setEmail(savedState.email || '');
        setUserId(savedState.userId || '');
        setFullName(savedState.fullName || '');
        setOrgChoice(savedState.orgChoice || '');
        setOrgName(savedState.orgName || '');
        setOrgCode(savedState.orgCode || '');
        console.log('Restored incomplete signup state:', savedState);
        return;
      }

      // If we have session but also saved state, clear the saved state (completed flow)
      if (session && savedState) {
        console.log('User has session, clearing saved auth state');
        clearAuthState();
      }

      // No saved state, proceed normally
    };
    initAuth();

    // Listen for auth changes - handle session changes during flow
    const subscription = authStateHelpers.setupAuthListener({
      onAuthStateChange: (user, session) => {
        const currentStep = stepRef.current;
        const currentUserId = userIdRef.current;
        
        console.log("Auth state changed:", { 
          user: !!user, 
          session: !!session, 
          currentStep: currentStep,
          staleStep: step, // This will show if we have stale values
          userId: currentUserId,
          staleUserId: userId,
          email: email 
        });
        
        // Session management based on auth flow stage:
        // - "auth" step: No session expected (creating account)
        // - "verify-otp" step: No session yet (verifying email) 
        // - "profile", "organization", "company-info": Session required (post-OTP verification)
        
        // Note: We need to be careful about React's async state updates here
        // When OTP verification succeeds, the session appears before step state updates
        
        const postOtpSteps = ["organization", "company-info"];
        
        console.log("🔍 Session check details:", {
          hasSession: !!session,
          currentStep,
          isPostOtpStep: postOtpSteps.includes(currentStep),
          hasUserId: !!currentUserId,
          willTriggerExpired: !session && postOtpSteps.includes(currentStep) && currentUserId
        });
        
        if (!session && postOtpSteps.includes(currentStep)) {
          // After OTP verification, we expect a session. If lost, restart.
          if (currentUserId) {
            console.warn('🚨 Session expired triggered! Step:', currentStep, 'UserId:', currentUserId);
            clearAuthState();
            setStep("auth");
            setUserId('');
            setEmail('');
            setFullName('');
            setOrgChoice(null);
            setOrgName('');
            setOrgCode('');
            toast({
              title: "Session Expired",
              description: "Please sign in again to continue.",
              variant: "destructive",
            });
            return;
          }
        }
        
        // Auth listener should only handle session expiration, not redirects
        // Let initAuth handle all redirect logic to avoid race conditions
        if (session && user && currentStep === "auth") {
          console.log('Auth listener: Session established, but letting initAuth handle redirects');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, step]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    // For signup, validate password confirmation
    if (isSignUp) {
      if (!confirmPassword) {
        toast({
          title: "Password confirmation required",
          description: "Please confirm your password",
          variant: "destructive",
        });
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: "Passwords do not match",
          description: "Please make sure both passwords are identical",
          variant: "destructive",
        });
        return;
      }
    }

    console.log('=== AUTH FORM SUBMISSION ===');
    console.log('Email:', email);
    console.log('IsSignUp:', isSignUp);
    console.log('Current Step:', step);

    setLoading(true);
    try {
      let result;
      if (isSignUp) {
        console.log('Calling handleSignUp...');
        // Combine first and last name
        const combinedFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        setFullName(combinedFullName);

        result = await authFlowHelpers.handleSignUp(email, password, combinedFullName);
        console.log('SignUp result:', result);

        if (result.success) {
          console.log('SignUp successful, setting step to verify-otp');
          setStep("verify-otp");
          saveAuthState({ step: "verify-otp", email, fullName: combinedFullName });
          toast({
            title: "Verification code sent!",
            description: "Please check your email and enter the 6-digit code.",
          });
        } else {
          console.log('SignUp failed:', result);
        }
      } else {
        console.log('Calling handleSignIn...');
        result = await authFlowHelpers.handleSignIn(email, password);
        console.log('SignIn result:', result);
        
        if (result.success) {
          console.log('Auth form: signin success with nextStep:', result.nextStep);
          // Handle different nextStep outcomes from signin
          if (result.nextStep === 'complete') {
            console.log('Auth form: User onboarding complete, redirecting to dashboard');
            toast({
              title: "Welcome back!",
              description: "You've been successfully signed in.",
            });
            // Clear auth state and redirect immediately for completed users
            clearAuthState();
            redirectingRef.current = true;
            navigate("/dashboard");
          } else if (result.nextStep === 'profile' || result.nextStep === 'organization') {
            console.log('Signin successful - resuming onboarding at organization step');
            setUserId(result.data?.userId || '');
            setStep("organization");
            saveAuthState({ step: "organization", email, userId: result.data?.userId });
            toast({
              title: "Welcome back!",
              description: "Please complete your organization setup to continue.",
            });
          }
        }
      }
      
      if (!result.success) {
        toast({
          title: "Authentication Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || !email) return;

    setLoading(true);
    try {
      const result = await authFlowHelpers.handleOtpVerification(email, otpCode);
      
      if (result.success && result.data?.userId) {
        setUserId(result.data.userId);

        // Automatically create profile with the name we collected during signup
        if (fullName) {
          const profileResult = await authFlowHelpers.handleProfileSetup({
            userId: result.data.userId,
            fullName: fullName
          });

          if (profileResult.success) {
            setStep("organization");
            saveAuthState({ step: "organization", email, userId: result.data.userId });
            toast({
              title: "Email verified!",
              description: "Please set up your organization.",
            });
          } else {
            toast({
              title: "Setup Error",
              description: profileResult.error,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Error",
            description: "Missing name information. Please try signing up again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Verification Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Verification Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleOrganizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgChoice || !userId || submissionInProgress) return;

    // Prevent double submission
    setSubmissionInProgress(true);
    setLoading(true);

    try {
      // Check rate limiting before creation
      if (orgChoice === "create") {
        const rateLimitCheck = await OrganizationCreationLimiter.canCreateOrganization(userId);

        if (!rateLimitCheck.allowed) {
          toast({
            title: "Creation Limit Reached",
            description: rateLimitCheck.reason,
            variant: "destructive",
          });
          return;
        }
      }

      // Save current form state before submission
      await onboardingStateHelpers.saveOnboardingProgress(userId, "organization", {
        orgChoice,
        orgName,
        orgCode
      });

      const choice = {
        type: orgChoice,
        orgName: orgChoice === "create" ? orgName : undefined,
        orgCode: orgChoice === "join" ? orgCode : undefined
      };

      const result = await authFlowHelpers.handleOrganizationSetup({ userId, choice });

      if (result.success) {
        if (orgChoice === "create" && result.data) {
          toast({
            title: "Organization created!",
            description: `${result.data.organizationName} has been created successfully. Your code: ${result.data.organizationCode}`,
          });
          setStep("company-info");
        } else if (orgChoice === "join" && result.data) {
          toast({
            title: "Join request sent!",
            description: "Your request to join the organization is pending approval.",
          });
          await onboardingStateHelpers.clearOnboardingProgress(userId);
          navigate("/dashboard");
        }
      } else {
        toast({
          title: "Organization Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Organization submit error:', error);
      toast({
        title: "Organization Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setSubmissionInProgress(false);
    }
  };

  const handleCompanyInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !companyPhone || !companyAddress || !companyWebsite || !quoteStartingPoint) return;

    setLoading(true);
    try {
      // Use the organization settings service to update company info
      
      await organizationSettingsService.updateCompanyInfo({
        phone_number: companyPhone,
        fax_number: companyFax, // Can be empty string, handled by the service
        company_address: companyAddress,
        website: companyWebsite,
        quote_start_number: quoteStartingPoint,
      });

      toast({
        title: "Company information saved!",
        description: "Your organization is now ready for quote generation.",
      });
      
      clearAuthState();
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Company Info Error",
        description: error.message || "Failed to save company information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyInfoSkip = () => {
    toast({
      title: "Setup completed!",
      description: "You can add company information later in Settings.",
    });
    clearAuthState();
    navigate("/dashboard");
  };

  const handleLogoUpload = (result: LogoUploadResult) => {
    setCurrentLogoUrl(result.url);
    toast({
      title: "Logo uploaded successfully!",
      description: "Your company logo has been saved.",
    });
  };

  const handleLogoError = (error: string) => {
    toast({
      title: "Logo upload failed",
      description: error,
      variant: "destructive",
    });
  };


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
            step === "company-info" ? "max-w-lg" :
            "max-w-md"
          }`}>
            {/* Main form card */}
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="text-center space-y-3 pb-2 pt-6 px-8">
                {/* Progress Indicator - show for all onboarding steps */}
                {step !== "auth" && (
                  <OnboardingProgress currentStep={step} isSignUp={true} />
                )}


                <div className="space-y-1">
                  <CardTitle className="text-3xl font-bold text-gray-900">
                    {step === "auth" && (isSignUp ? "Create Account" : "Welcome back")}
                    {step === "verify-otp" && ""}
                    {step === "organization" && "Organization Setup"}
                    {step === "company-info" && "Company Details"}
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-sm leading-relaxed max-w-lg mx-auto">
                    {step === "auth" && (isSignUp
                      ? "Create your account to start managing quotes"
                      : "Sign in to your Qwohter account"
                    )}
                    {step === "verify-otp" && ""}
                    {step === "organization" && "Connect with your organization or create a new one."}
                    {step === "company-info" && "Add your company information for professional quotes."}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="px-8 pb-8 space-y-4">
                {step === "auth" && (
                  <AuthForm
                    isSignUp={isSignUp}
                    email={email}
                    password={password}
                    confirmPassword={confirmPassword}
                    firstName={firstName}
                    lastName={lastName}
                    showPassword={showPassword}
                    loading={loading}
                    onEmailChange={setEmail}
                    onPasswordChange={setPassword}
                    onConfirmPasswordChange={setConfirmPassword}
                    onFirstNameChange={setFirstName}
                    onLastNameChange={setLastName}
                    onTogglePasswordVisibility={() => setShowPassword(!showPassword)}
                    onSubmit={handleAuth}
                    onToggleMode={() => {
                      if (isSignUp) {
                        navigate("/sign-in");
                      } else {
                        navigate("/create-account");
                      }
                    }}
                  />
                )}

                {step === "verify-otp" && (
                  <OtpVerificationForm
                    otpCode={otpCode}
                    email={email}
                    loading={loading}
                    onOtpCodeChange={setOtpCode}
                    onSubmit={handleOtpVerification}
                    onResendCode={async () => {
                      // Check if we have temporary signup data
                      const tempData = tempSignupService.get();
                      if (!tempData || tempData.email !== email) {
                        toast({
                          title: "Session Expired",
                          description: "Please sign up again to resend verification code.",
                          variant: "destructive"
                        });
                        setStep("auth");
                        return;
                      }

                      // Resend OTP using the same approach as initial signup
                      const { error } = await supabase.auth.signInWithOtp({
                        email,
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
                    }}
                  />
                )}


                {step === "organization" && (
                  <OrganizationSetupForm
                    orgChoice={orgChoice}
                    orgCode={orgCode}
                    orgName={orgName}
                    loading={loading || submissionInProgress}
                    onOrgChoiceChange={setOrgChoice}
                    onOrgCodeChange={setOrgCode}
                    onOrgNameChange={setOrgName}
                    onSubmit={handleOrganizationSubmit}
                  />
                )}

                {step === "company-info" && (
                  <CompanyInfoSetupForm
                    organizationName={orgName}
                    phone={companyPhone}
                    fax={companyFax}
                    address={companyAddress}
                    website={companyWebsite}
                    quoteStartingPoint={quoteStartingPoint}
                    industry={industry}
                    foundVia={foundVia}
                    loading={loading}
                    userId={userId || ""}
                    currentLogoUrl={currentLogoUrl}
                    onPhoneChange={setCompanyPhone}
                    onFaxChange={setCompanyFax}
                    onAddressChange={setCompanyAddress}
                    onWebsiteChange={setCompanyWebsite}
                    onQuoteStartingPointChange={setQuoteStartingPoint}
                    onIndustryChange={setIndustry}
                    onFoundViaChange={setFoundVia}
                    onLogoUpload={handleLogoUpload}
                    onLogoError={handleLogoError}
                    onSubmit={handleCompanyInfoSubmit}
                    onSkip={handleCompanyInfoSkip}
                  />
                )}
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center mt-8">
              {/* Production fallback for stuck sessions */}
              {!import.meta.env.DEV && step === "auth" && (
                <div className="mb-4">
                  <button
                    onClick={async () => {
                      try {
                        await supabase.auth.signOut();
                        clearAuthState();
                        localStorage.clear();
                        sessionStorage.clear();
                        toast({
                          title: "Session cleared",
                          description: "All authentication data has been cleared. Please try signing in again.",
                        });
                        window.location.reload();
                      } catch (error) {
                        console.error('Error clearing session:', error);
                      }
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
                  >
                    Having login issues? Clear session data
                  </button>
                </div>
              )}
              <p className="text-gray-400 text-xs">
                © 2024 Qwohter. Secure & Professional.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;