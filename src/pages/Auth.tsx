import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, LogIn, UserPlus, Users, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgChoice, setOrgChoice] = useState<"join" | "create" | null>(null);
  const [orgCode, setOrgCode] = useState("");
  const [orgName, setOrgName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"auth" | "profile" | "organization">("auth");
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`
          }
        });
        
        if (error) throw error;
        
        if (data.user) {
          setUserId(data.user.id);
          setStep("profile");
          toast({
            title: "Account created!",
            description: "Please complete your profile setup.",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast({
          title: "Welcome back!",
          description: "You've been successfully signed in.",
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

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !userId) return;

    setLoading(true);
    try {
      // Update the existing profile with full name (profile was created by trigger)
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName
        })
        .eq('id', userId);

      if (error) throw error;

      setStep("organization");
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
      if (orgChoice === "create") {
        if (!orgName) return;
        
        // Create organization using the userId from signup
        const orgCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: orgName,
            created_by: userId,
            organization_code: orgCode
          })
          .select()
          .single();

        if (orgError) throw orgError;

        // Update profile with organization and set as owner
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            organization_id: orgData.id,
            role: 'owner',
            status: 'active'
          })
          .eq('id', userId);

        if (profileError) throw profileError;

        toast({
          title: "Organization created!",
          description: `${orgName} has been created successfully. Your code: ${orgCode}`,
        });
        
        navigate("/dashboard");
      } else {
        if (!orgCode) return;
        
        // Find organization by code (trim whitespace and convert to uppercase)
        const cleanCode = orgCode.trim().toUpperCase();
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('organization_code', cleanCode)
          .single();

        if (orgError || !orgData) {
          throw new Error("Invalid organization code. Please check the code and try again.");
        }

        // Update profile with organization as pending member
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            organization_id: orgData.id,
            role: 'member',
            status: 'pending'
          })
          .eq('id', userId);

        if (profileError) throw profileError;

        toast({
          title: "Join request sent!",
          description: "Your request to join the organization is pending approval.",
        });
        
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Organization Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and branding section */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <Building2 className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            WallQu
          </h1>
          <p className="text-slate-600 text-base">
            Professional Operable Wall Tool
          </p>
        </div>

        {/* Auth card */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="text-center space-y-4 pb-8">
            <CardTitle className="text-2xl font-bold text-slate-900">
              {step === "auth" && (isSignUp ? "Create Account" : "Welcome")}
              {step === "profile" && "Complete Your Profile"}
              {step === "organization" && "Organization Setup"}
            </CardTitle>
            <CardDescription className="text-slate-600 text-base">
              {step === "auth" && (isSignUp 
                ? "Create your account to start managing quotes"
                : "Sign in to access your quote management system"
              )}
              {step === "profile" && "Please provide your full name to continue"}
              {step === "organization" && "Join an existing organization or create a new one"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {step === "auth" && (
              <>
                <form onSubmit={handleAuth} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-slate-700 font-medium text-sm">
                      Email
                    </Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="Enter your email" 
                      required 
                      className="bg-slate-50 border-slate-200 h-12" 
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="password" className="text-slate-700 font-medium text-sm">
                      Password
                    </Label>
                    <Input 
                      id="password" 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="Enter your password" 
                      required 
                      className="bg-slate-50 border-slate-200 h-12" 
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-12"
                    disabled={loading}
                  >
                    {loading ? (
                      "Loading..."
                    ) : (
                      <>
                        {isSignUp ? <UserPlus className="w-5 h-5 mr-2" /> : <LogIn className="w-5 h-5 mr-2" />}
                        {isSignUp ? "Create Account" : "Sign In"}
                      </>
                    )}
                  </Button>
                </form>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    {isSignUp 
                      ? "Already have an account? Sign in"
                      : "Don't have an account? Sign up"
                    }
                  </button>
                </div>
              </>
            )}

            {step === "profile" && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="fullName" className="text-slate-700 font-medium text-sm">
                    Full Name
                  </Label>
                  <Input 
                    id="fullName" 
                    type="text" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    placeholder="Enter your full name" 
                    required 
                    className="bg-slate-50 border-slate-200 h-12" 
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-12"
                  disabled={loading || !fullName}
                >
                  {loading ? "Saving..." : "Continue"}
                </Button>
              </form>
            )}

            {step === "organization" && (
              <form onSubmit={handleOrganizationSubmit} className="space-y-6">
                <RadioGroup value={orgChoice || ""} onValueChange={(value) => setOrgChoice(value as "join" | "create")}>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 p-4 border border-slate-200 rounded-lg">
                      <RadioGroupItem value="join" id="join" />
                      <Label htmlFor="join" className="flex items-center cursor-pointer flex-1">
                        <Users className="w-5 h-5 mr-3 text-slate-600" />
                        <div>
                          <div className="font-medium">Join Organization</div>
                          <div className="text-sm text-slate-500">Enter an organization code to join</div>
                        </div>
                      </Label>
                    </div>

                    {orgChoice === "join" && (
                      <div className="ml-6 space-y-3">
                        <Label htmlFor="orgCode" className="text-slate-700 font-medium text-sm">
                          Organization Code
                        </Label>
                        <Input 
                          id="orgCode" 
                          type="text" 
                          value={orgCode} 
                          onChange={(e) => setOrgCode(e.target.value)} 
                          placeholder="Enter organization code" 
                          required 
                          className="bg-slate-50 border-slate-200 h-12" 
                        />
                      </div>
                    )}

                    <div className="flex items-center space-x-2 p-4 border border-slate-200 rounded-lg">
                      <RadioGroupItem value="create" id="create" />
                      <Label htmlFor="create" className="flex items-center cursor-pointer flex-1">
                        <Plus className="w-5 h-5 mr-3 text-slate-600" />
                        <div>
                          <div className="font-medium">Create Organization</div>
                          <div className="text-sm text-slate-500">Start your own organization</div>
                        </div>
                      </Label>
                    </div>

                    {orgChoice === "create" && (
                      <div className="ml-6 space-y-3">
                        <Label htmlFor="orgName" className="text-slate-700 font-medium text-sm">
                          Organization Name
                        </Label>
                        <Input 
                          id="orgName" 
                          type="text" 
                          value={orgName} 
                          onChange={(e) => setOrgName(e.target.value)} 
                          placeholder="Enter organization name" 
                          required 
                          className="bg-slate-50 border-slate-200 h-12" 
                        />
                      </div>
                    )}
                  </div>
                </RadioGroup>

                <Button 
                  type="submit" 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-12"
                  disabled={loading || !orgChoice || (orgChoice === "join" && !orgCode) || (orgChoice === "create" && !orgName)}
                >
                  {loading ? "Processing..." : orgChoice === "create" ? "Create Organization" : "Request to Join"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-slate-500 text-sm">
            © 2024 Contemporary Wall Systems. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;