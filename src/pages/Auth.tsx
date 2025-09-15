import { useState, useEffect } from "react";
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
  
  // Company information state
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyFax, setCompanyFax] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
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
    const initAuth = async () => {
      // Check current session first
      const session = await authStateHelpers.checkAuthSession();
      
      // If user is fully authenticated, redirect to dashboard
      if (session && step === "auth") {
        clearAuthState(); // Clean up any stale state
        navigate("/dashboard");
        return;
      }

      // Try to restore saved auth flow state
      const savedState = loadAuthState();
      if (savedState) {
        // Validate the saved state makes sense
        const validSteps = ["auth", "verify-otp", "profile", "organization", "company-info"];
        if (!validSteps.includes(savedState.step)) {
          console.warn('Invalid saved step, clearing state');
          clearAuthState();
          return;
        }

        // For steps that require a session/userId, validate it exists
        if (["verify-otp", "profile", "organization", "company-info"].includes(savedState.step)) {
          if (!savedState.userId || !savedState.email) {
            console.warn('Missing userId/email for advanced step, clearing state');
            clearAuthState();
            return;
          }
        }

        // Restore the state
        setStep(savedState.step);
        setEmail(savedState.email || '');
        setUserId(savedState.userId || '');
        setFullName(savedState.fullName || '');
        setOrgChoice(savedState.orgChoice || '');
        setOrgName(savedState.orgName || '');
        setOrgCode(savedState.orgCode || '');
        console.log('Restored auth flow state:', savedState);
        return;
      }

      // No saved state, proceed normally
    };
    initAuth();

    // Listen for auth changes - handle session changes during flow
    const subscription = authStateHelpers.setupAuthListener({
      onAuthStateChange: (user, session) => {
        console.log("Auth state changed:", { user: !!user, session: !!session, currentStep: step });
        
        // If session is lost during signup flow, restart
        if (!session && ["verify-otp", "profile", "organization", "company-info"].includes(step)) {
          console.warn('Session lost during signup flow, restarting');
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
        
        // Only auto-redirect if we're on the initial auth step and fully authenticated
        if (session && user && step === "auth") {
          clearAuthState();
          navigate("/dashboard");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, step]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      let result;
      if (isSignUp) {
        result = await authFlowHelpers.handleSignUp(email, password);
        if (result.success && result.data?.userId) {
          setUserId(result.data.userId);
          setStep("verify-otp");
          saveAuthState({ step: "verify-otp", email, userId: result.data.userId });
          toast({
            title: "Verification code sent!",
            description: "Please check your email and enter the 6-digit code.",
          });
        }
      } else {
        result = await authFlowHelpers.handleSignIn(email, password);
        if (result.success) {
          toast({
            title: "Welcome back!",
            description: "You've been successfully signed in.",
          });
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
    if (!userId || !companyPhone || !companyFax || !companyAddress || !companyWebsite) return;

    setLoading(true);
    try {
      // Use the organization settings service to update company info
      
      await organizationSettingsService.updateCompanyInfo({
        phone: companyPhone,
        fax: companyFax,
        address: companyAddress,
        website: companyWebsite,
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/30 to-accent/10" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo and branding section */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-3xl flex items-center justify-center mb-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <Building2 className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent mb-2">
            AiQu
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            Professional Quote Management
          </p>
        </div>

        {/* Auth card */}
        <Card className="card-floating backdrop-blur-sm border-0 shadow-large animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="text-center space-y-4 pb-8">
            <CardTitle className="text-2xl font-bold text-foreground">
              {step === "auth" && (isSignUp ? "Create Account" : "Welcome")}
              {step === "verify-otp" && "Verify Your Email"}
              {step === "profile" && "Complete Your Profile"}
              {step === "organization" && "Organization Setup"}
              {step === "company-info" && "Company Information"}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              {step === "auth" && (isSignUp 
                ? "Create your account to start managing quotes"
                : "Sign in to access your quote management system"
              )}
              {step === "verify-otp" && "Enter the 6-digit code sent to your email"}
              {step === "profile" && "Please provide your full name to continue"}
              {step === "organization" && "Join an existing organization or create a new one"}
              {step === "company-info" && "Add your company details"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
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
                loading={loading}
                onPhoneChange={setCompanyPhone}
                onFaxChange={setCompanyFax}
                onAddressChange={setCompanyAddress}
                onWebsiteChange={setCompanyWebsite}
                onSubmit={handleCompanyInfoSubmit}
                onSkip={handleCompanyInfoSkip}
              />
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-slate-500 text-sm">
            © 2024 AiQu. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;