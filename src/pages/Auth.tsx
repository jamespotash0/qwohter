import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authFlowHelpers } from "@/utils/authFlowHelpers";
import { authStateHelpers } from "@/utils/authStateHelpers";
import { AuthForm } from "@/components/auth/AuthForm";
import { OtpVerificationForm } from "@/components/auth/OtpVerificationForm";
import { ProfileSetupForm } from "@/components/auth/ProfileSetupForm";
import { OrganizationSetupForm } from "@/components/auth/OrganizationSetupForm";
import { CompanyInfoSetupForm } from "@/components/auth/CompanyInfoSetupForm";
import { organizationSettingsService } from "@/services/companySettingsService";
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  full_name: string | null;
  organization_id: string | null;
}

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgChoice, setOrgChoice] = useState<"join" | "create" | null>(null);
  const [orgCode, setOrgCode] = useState("");
  const [orgName, setOrgName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"auth" | "verify-otp" | "profile" | "organization" | "company-info">("auth");
  const [otpCode, setOtpCode] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
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
  const navigate = useNavigate();
  const { toast } = useToast();

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
      const postOtpSteps = ["verify-otp", "profile", "organization", "company-info"];
      const isSignupFlow = postOtpSteps.includes(step);
      const session = await authStateHelpers.checkValidAuthSession(isSignupFlow);
      
      // If user has a session, check if they completed onboarding
      if (session && step === "auth") {
        // Check user's profile and organization status
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, organization_id')
            .eq('id', session.user.id)
            .single() as { data: ProfileData | null };
          
          // If user has completed onboarding (has name and organization), redirect to dashboard
          if (profile && profile.full_name && profile.organization_id) {
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
            // User has session but incomplete onboarding - determine where they left off
            console.log('User has session but incomplete onboarding:', profile);
            
            if (!profile?.full_name) {
              // Missing profile info
              setStep("profile");
              setUserId(session.user.id);
              setEmail(session.user.email || '');
            } else if (!profile?.organization_id) {
              // Missing organization
              setStep("organization");
              setUserId(session.user.id);
              setEmail(session.user.email || '');
              setFullName(profile.full_name);
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
        const validSteps = ["verify-otp", "profile", "organization", "company-info"];
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
        
        const postOtpSteps = ["profile", "organization", "company-info"];
        
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

    console.log('=== AUTH FORM SUBMISSION ===');
    console.log('Email:', email);
    console.log('IsSignUp:', isSignUp);
    console.log('Current Step:', step);

    setLoading(true);
    try {
      let result;
      if (isSignUp) {
        console.log('Calling handleSignUp...');
        result = await authFlowHelpers.handleSignUp(email, password);
        console.log('SignUp result:', result);
        
        if (result.success && result.data?.userId) {
          console.log('SignUp successful, setting step to verify-otp');
          setUserId(result.data.userId);
          setStep("verify-otp");
          saveAuthState({ step: "verify-otp", email, userId: result.data.userId });
          toast({
            title: "Verification code sent!",
            description: "Please check your email and enter the 6-digit code.",
          });
        } else {
          console.log('SignUp failed or no userId:', result);
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
          } else if (result.nextStep === 'profile') {
            console.log('Signin successful - resuming onboarding at profile step');
            setUserId(result.data?.userId || '');
            setStep("profile");
            saveAuthState({ step: "profile", email, userId: result.data?.userId });
            toast({
              title: "Welcome back!",
              description: "Please complete your profile setup to continue.",
            });
          } else if (result.nextStep === 'organization') {
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
        setStep("profile");
        saveAuthState({ step: "profile", email, userId: result.data.userId });
        toast({
          title: "Email verified!",
          description: "Please complete your profile setup.",
        });
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

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !userId) return;

    setLoading(true);
    try {
      const result = await authFlowHelpers.handleProfileSetup({ userId, fullName });
      
      if (result.success) {
        setStep("organization");
        saveAuthState({ step: "organization", email, userId, fullName });
      } else {
        toast({
          title: "Profile Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Profile Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgChoice || !userId) return;

    setLoading(true);
    try {
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
          // Move to company info setup for new organizations
          setStep("company-info");
          saveAuthState({ step: "company-info", email, userId, fullName, orgChoice, orgName, orgCode });
        } else if (orgChoice === "join" && result.data) {
          toast({
            title: "Join request sent!",
            description: "Your request to join the organization is pending approval.",
          });
          // Skip company info for joining organizations
          clearAuthState();
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
    }
  };

  const handleCompanyInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !companyPhone || !companyAddress || !companyWebsite || !quoteStartingPoint) return;

    setLoading(true);
    try {
      // Use the organization settings service to update company info
      
      await organizationSettingsService.updateCompanyInfo({
        phone: companyPhone,
        fax: companyFax, // Can be empty string, handled by the service
        address: companyAddress,
        website: companyWebsite,
        quote_starting_point: quoteStartingPoint,
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

  // Define onboarding steps for progress tracking
  const onboardingSteps = [
    { key: "auth", label: "Sign In", icon: "🔐" },
    { key: "verify-otp", label: "Verify", icon: "📧" },
    { key: "profile", label: "Profile", icon: "👤" },
    { key: "organization", label: "Organization", icon: "🏢" },
    { key: "company-info", label: "Company", icon: "📋" }
  ];

  const getCurrentStepIndex = () => onboardingSteps.findIndex(s => s.key === step);
  const isOnboarding = step !== "auth";

  return (
    <div className="min-h-screen bg-theme-primary relative overflow-hidden">
      {/* Elegant background with subtle patterns */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-white to-blue-50/30" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Simple progress indicator */}
      {isOnboarding && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-white/90 backdrop-blur-xl rounded-full px-6 py-3 shadow-lg border border-white/20">
            <span className="text-sm font-medium text-gray-700">
              Step {getCurrentStepIndex()} of {onboardingSteps.length - 1}
            </span>
          </div>
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center p-8">
        {/* Centered content area */}
        <div className="w-full flex items-center justify-center">
          <div className={`w-full relative z-10 ${
            step === "company-info" ? "max-w-4xl" : 
            step === "auth" ? "max-w-lg" : "max-w-2xl"
          }`}>
            {/* Main branding - only show on auth step */}
            {step === "auth" && (
              <div className="text-center mb-8">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl animate-pulse-subtle">
                  <Building2 className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
                  Qwohter
                </h1>
                <p className="text-xl text-gray-600 mb-6">Professional Quote Management</p>
                <div className="flex justify-center space-x-8 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="text-gray-700">Instant Quotes</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span className="text-gray-700">Sales Pipeline</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                    <span className="text-gray-700">Faster Deals</span>
                  </div>
                </div>
              </div>
            )}

            {/* Main form card */}
            <Card className="bg-white/70 backdrop-blur-xl border-0 shadow-2xl shadow-black/5 rounded-3xl overflow-hidden animate-slide-in-right step-transition">
              <CardHeader className="text-center space-y-8 pb-8 pt-12 px-12">
                {/* Step-specific icons and enhanced descriptions */}
                {step === "verify-otp" && (
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center animate-float mb-4">
                    <div className="text-4xl">📧</div>
                  </div>
                )}
                {step === "profile" && (
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-100 to-blue-100 rounded-2xl flex items-center justify-center animate-float mb-4">
                    <div className="text-4xl">👤</div>
                  </div>
                )}
                {step === "organization" && (
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center animate-float mb-4">
                    <div className="text-4xl">🏢</div>
                  </div>
                )}
                {step === "company-info" && (
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center animate-float mb-4">
                    <div className="text-4xl">📋</div>
                  </div>
                )}

                <div className="space-y-4">
                  <CardTitle className="text-3xl font-bold text-gray-900">
                    {step === "auth" && (isSignUp ? "Create your account" : "Welcome back")}
                    {step === "verify-otp" && "Check your email"}
                    {step === "profile" && "Tell us about yourself"}
                    {step === "organization" && "Join your team"}
                    {step === "company-info" && "Company details"}
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
                    {step === "auth" && (isSignUp 
                      ? "Join thousands of professionals who trust Qwohter for their quote management"
                      : "Sign in to continue managing your quotes and growing your business"
                    )}
                    {step === "verify-otp" && "We've sent a verification code to your email address. Enter it below to continue setting up your account."}
                    {step === "profile" && "Help us personalize your experience by providing some basic information about yourself."}
                    {step === "organization" && "Connect with your organization or create a new one to start collaborating with your team."}
                    {step === "company-info" && "Add your company information to create professional, branded quotes that impress your clients."}
                  </CardDescription>
                </div>
              </CardHeader>
          
          <CardContent className="px-12 pb-12 space-y-8">
            {step === "auth" && (
              <AuthForm
                isSignUp={isSignUp}
                email={email}
                password={password}
                showPassword={showPassword}
                loading={loading}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onTogglePasswordVisibility={() => setShowPassword(!showPassword)}
                onSubmit={handleAuth}
                onToggleMode={() => setIsSignUp(!isSignUp)}
              />
            )}

            {step === "verify-otp" && (
              <OtpVerificationForm
                otpCode={otpCode}
                email={email}
                loading={loading}
                onOtpCodeChange={setOtpCode}
                onSubmit={handleOtpVerification}
                onBackToSignUp={() => {
                  setStep("auth");
                  setOtpCode("");
                }}
              />
            )}

            {step === "profile" && (
              <ProfileSetupForm
                fullName={fullName}
                loading={loading}
                onFullNameChange={setFullName}
                onSubmit={handleProfileSubmit}
              />
            )}

            {step === "organization" && (
              <OrganizationSetupForm
                orgChoice={orgChoice}
                orgCode={orgCode}
                orgName={orgName}
                loading={loading}
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
                loading={loading}
                onPhoneChange={setCompanyPhone}
                onFaxChange={setCompanyFax}
                onAddressChange={setCompanyAddress}
                onWebsiteChange={setCompanyWebsite}
                onQuoteStartingPointChange={setQuoteStartingPoint}
                onSubmit={handleCompanyInfoSubmit}
                onSkip={handleCompanyInfoSkip}
              />
            )}
          </CardContent>
        </Card>

            {/* Elegant footer */}
            <div className="text-center mt-12">
              {/* Production fallback for stuck sessions */}
              {!import.meta.env.DEV && step === "auth" && (
                <div className="mb-6">
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

              <div className="space-y-4">
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                <p className="text-gray-500 text-sm font-medium">
                  © 2024 Qwohter. Crafted with care for professionals.
                </p>
                <div className="flex justify-center space-x-6 text-xs">
                  <span className="text-gray-400">Secure</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-400">Fast</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-400">Reliable</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;