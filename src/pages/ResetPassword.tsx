/**
 * Reset Password Page - Matches Auth.tsx Design
 *
 * Matches the landing page aesthetic:
 * - Warm cream (#FFFEFA) background
 * - Pink gradient panel with coral blur orbs
 * - Urbanist typography
 * - Clean, award-winning design
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSignOut } from "@/auth";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput } from "@/utils/security";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { mutate: signOut } = useSignOut();

  useEffect(() => {
    let cancelled = false;

    const invalidLink = () => {
      if (cancelled) return;
      setSessionError('The reset link is invalid or has expired. Please request a new password reset.');
      toast({
        title: "Invalid Reset Link",
        description: "The reset link is invalid or has expired. Please request a new password reset.",
        variant: "destructive",
      });
    };

    // The Supabase client is configured with flowType 'pkce' + detectSessionInUrl, so it
    // automatically exchanges the recovery link's `?code=` for a session and fires
    // PASSWORD_RECOVERY. Listen for that event in case it lands before this component mounts,
    // we also proactively check getSession() below.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setSessionError(null);
        setSessionReady(true);
      }
    });

    const handleSessionSetup = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));

      // Supabase redirects here with an error in the URL when the link is expired/already used
      // (e.g. consumed by an email security scanner). Surface it instead of spinning.
      const errorCode =
        hashParams.get('error_code') || searchParams.get('error_code') ||
        hashParams.get('error') || searchParams.get('error');
      if (errorCode) {
        invalidLink();
        return;
      }

      // Legacy implicit-flow links carry tokens directly in the hash/query.
      const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (cancelled) return;
        if (error) {
          console.error('Error setting session:', error);
          setSessionError('There was an issue with your reset link. Please request a new password reset.');
          return;
        }
        setSessionReady(true);
        return;
      }

      // PKCE flow: detectSessionInUrl has already exchanged `?code=` and stripped it from the
      // URL, so the recovery session should already exist. Confirm it.
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error) {
        console.error('Session check error:', error);
        setSessionError('Session validation failed. Please try the reset link again.');
        return;
      }
      if (data.session) {
        setSessionReady(true);
        return;
      }

      invalidLink();
    };

    handleSessionSetup();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [searchParams, toast]);

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    return {
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers,
      errors: [
        !minLength && "At least 8 characters",
        !hasUpperCase && "One uppercase letter",
        !hasLowerCase && "One lowercase letter",
        !hasNumbers && "One number"
      ].filter(Boolean)
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) return;

    const validation = validatePassword(password);
    if (!validation.isValid) {
      toast({
        title: "Password requirements not met",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    if (!sessionReady) {
      toast({
        title: "Session Not Ready",
        description: "Please wait for the session to be established or use the reset link from your email.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Password update error:', error);

        if (error.message.includes('Auth session missing')) {
          throw new Error('Your session has expired. Please request a new password reset link.');
        }

        throw error;
      }

      signOut(undefined, {
        onSuccess: () => {
          console.log('User signed out after password reset');
        },
        onError: (error) => {
          console.error('Error signing out after password reset:', error);
        }
      });

      setSuccess(true);
      toast({
        title: "Password updated!",
        description: "Your password has been changed. Please sign in with your new password.",
      });

      setTimeout(() => {
        navigate("/sign-in");
      }, 3000);

    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Error updating password",
        description: error.message || "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const passwordValidation = validatePassword(password);

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
            Create a strong password
            <br />
            to keep your account secure.
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
          <div className="w-full max-w-[420px]">
            {/* Step header */}
            <div className="mb-6 text-center">
              <h2
                className="text-[28px] text-[#171717] tracking-[0.3px] leading-[1.2] mb-1"
                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
              >
                {success ? "Password updated!" : "Reset your password"}
              </h2>
              <p
                className="text-[#171717]/50 text-sm"
                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 400 }}
              >
                {success
                  ? "Your password has been successfully changed. Please sign in with your new password."
                  : "Choose a strong password for your account."
                }
              </p>
            </div>

            {/* Form */}
            <div>
              {sessionError && !sessionReady && (
                <div className="bg-[#FEF2F2] border border-[#EF4444]/20 rounded-lg p-4 mb-5">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-[#EF4444] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <p
                      className="text-sm font-medium text-[#991B1B]"
                      style={{ fontFamily: 'Urbanist, sans-serif' }}
                    >
                      Session Error
                    </p>
                  </div>
                  <p
                    className="text-sm text-[#B91C1C] mt-1"
                    style={{ fontFamily: 'Urbanist, sans-serif' }}
                  >
                    {sessionError}
                  </p>
                </div>
              )}

              {!success ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-[#171717] text-sm"
                      style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 500 }}
                    >
                      New password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(sanitizeInput.string(e.target.value))}
                        placeholder="Enter your new password"
                        required
                        className="h-12 bg-[#f7f2e9]/50 border-[#171717]/10 rounded-full pr-12 placeholder:text-[#171717]/30 focus:border-[#EE6C4D] focus:ring-[#EE6C4D]/20"
                        style={{ fontFamily: 'Urbanist, sans-serif' }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-0 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-[#171717]/40" />
                        ) : (
                          <Eye className="h-4 w-4 text-[#171717]/40" />
                        )}
                      </Button>
                    </div>

                    {/* Password requirements */}
                    {password && (
                      <div className="space-y-1 mt-2">
                        <p
                          className="text-xs text-[#171717]/50"
                          style={{ fontFamily: 'Urbanist, sans-serif' }}
                        >
                          Password must contain:
                        </p>
                        <div className="space-y-1">
                          {[
                            { label: "At least 8 characters", valid: password.length >= 8 },
                            { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
                            { label: "One lowercase letter", valid: /[a-z]/.test(password) },
                            { label: "One number", valid: /\d/.test(password) }
                          ].map((req, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${req.valid ? 'bg-[#10B981]' : 'bg-[#171717]/20'}`} />
                              <span
                                className={`text-xs ${req.valid ? 'text-[#10B981]' : 'text-[#171717]/50'}`}
                                style={{ fontFamily: 'Urbanist, sans-serif' }}
                              >
                                {req.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-[#171717] text-sm"
                      style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 500 }}
                    >
                      Confirm new password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(sanitizeInput.string(e.target.value))}
                        placeholder="Confirm your new password"
                        required
                        className="h-12 bg-[#f7f2e9]/50 border-[#171717]/10 rounded-full pr-12 placeholder:text-[#171717]/30 focus:border-[#EE6C4D] focus:ring-[#EE6C4D]/20"
                        style={{ fontFamily: 'Urbanist, sans-serif' }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-0 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-[#171717]/40" />
                        ) : (
                          <Eye className="h-4 w-4 text-[#171717]/40" />
                        )}
                      </Button>
                    </div>

                    {/* Password match indicator */}
                    {confirmPassword && (
                      <div className="flex items-center space-x-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${password === confirmPassword ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                        <span
                          className={`text-xs ${password === confirmPassword ? 'text-[#10B981]' : 'text-[#EF4444]'}`}
                          style={{ fontFamily: 'Urbanist, sans-serif' }}
                        >
                          {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#ee6c4d] hover:bg-[#ee6c4d]/90 text-white font-semibold rounded-full transition-all duration-200"
                    style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 500 }}
                    disabled={loading || !passwordValidation.isValid || password !== confirmPassword || !sessionReady}
                  >
                    {loading ? "Updating..." : !sessionReady ? "Preparing session..." : "Update password"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-5">
                  <div className="bg-[#ECFDF5] border border-[#10B981]/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-[#10B981]" />
                      <p
                        className="text-sm font-medium text-[#065F46]"
                        style={{ fontFamily: 'Urbanist, sans-serif' }}
                      >
                        Password updated successfully
                      </p>
                    </div>
                    <p
                      className="text-sm text-[#047857] mt-1"
                      style={{ fontFamily: 'Urbanist, sans-serif' }}
                    >
                      You have been signed out for security. Please sign in with your new password.
                    </p>
                  </div>

                  <Button
                    onClick={() => navigate("/sign-in")}
                    className="w-full h-12 bg-[#ee6c4d] hover:bg-[#ee6c4d]/90 text-white font-semibold rounded-full transition-all duration-200"
                    style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 500 }}
                  >
                    Continue to sign in
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
