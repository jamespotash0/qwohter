import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput } from "@/utils/security";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for access token in URL (from email link)
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      // Set the session with the tokens from the URL
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  }, [searchParams]);

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

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      toast({
        title: "Password updated!",
        description: "Your password has been successfully changed.",
      });

      // Redirect to sign-in page after 3 seconds
      setTimeout(() => {
        navigate("/sign-in");
      }, 3000);

    } catch (error: any) {
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Logo in top-left corner */}
      <div className="absolute top-6 left-6 z-30">
        <div
          className="flex items-center cursor-pointer"
          onClick={() => navigate('/')}
        >
          <img
            src="/logos/Landing-page-logo.svg"
            alt="Qwohter Logo"
            className="h-8 w-auto"
          />
        </div>
      </div>

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
          <div className="w-full relative z-10 max-w-md">
            {/* Main form card */}
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="text-center space-y-4 pb-4 pt-8 px-8">
                {/* Icon */}
                <div className="mx-auto w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-200 mb-4">
                  {success ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <Lock className="w-6 h-6 text-gray-600" />
                  )}
                </div>

                <div className="space-y-2">
                  <CardTitle className="text-3xl font-bold text-gray-900">
                    {success ? "Password updated!" : "Reset your password"}
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-sm leading-relaxed max-w-lg mx-auto">
                    {success
                      ? "Your password has been successfully changed. You'll be redirected to sign in shortly."
                      : "Choose a strong password for your account."
                    }
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="px-8 pb-8 space-y-4">
                {!success ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-700 font-medium text-sm">
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
                          className="bg-white border-gray-300 h-12 pr-12 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-0 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>

                      {/* Password requirements */}
                      {password && (
                        <div className="space-y-1 mt-2">
                          <p className="text-xs text-gray-600">Password must contain:</p>
                          <div className="space-y-1">
                            {[
                              { label: "At least 8 characters", valid: password.length >= 8 },
                              { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
                              { label: "One lowercase letter", valid: /[a-z]/.test(password) },
                              { label: "One number", valid: /\d/.test(password) }
                            ].map((req, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${req.valid ? 'bg-green-500' : 'bg-gray-300'}`} />
                                <span className={`text-xs ${req.valid ? 'text-green-600' : 'text-gray-500'}`}>
                                  {req.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-700 font-medium text-sm">
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
                          className="bg-white border-gray-300 h-12 pr-12 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-0 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>

                      {/* Password match indicator */}
                      {confirmPassword && (
                        <div className="flex items-center space-x-2 mt-1">
                          <div className={`w-2 h-2 rounded-full ${password === confirmPassword ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className={`text-xs ${password === confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                            {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold h-12 transition-colors"
                      disabled={loading || !passwordValidation.isValid || password !== confirmPassword}
                    >
                      {loading ? "Updating..." : "Update password"}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="text-sm font-medium text-green-800">Password updated successfully</p>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        You can now sign in with your new password.
                      </p>
                    </div>

                    <Button
                      onClick={() => navigate("/sign-in")}
                      className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold h-12 transition-colors"
                    >
                      Continue to sign in
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center mt-8">
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

export default ResetPassword;