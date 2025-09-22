/**
 * Authentication Form Component
 * 
 * Extracted from Auth.tsx - handles sign in and sign up forms
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { sanitizeInput } from "@/utils/security";
import { validators } from "@/utils/validation";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface AuthFormProps {
  isSignUp: boolean;
  email: string;
  password: string;
  showPassword: boolean;
  loading: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onTogglePasswordVisibility: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  isSignUp,
  email,
  password,
  showPassword,
  loading,
  onEmailChange,
  onPasswordChange,
  onTogglePasswordVisibility,
  onSubmit,
  onToggleMode
}) => {
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [touched, setTouched] = useState({ email: false, password: false });
  const navigate = useNavigate();

  // Load saved email and remember me preference on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    const savedRememberMe = localStorage.getItem('remember_me') === 'true';

    if (savedEmail && savedRememberMe) {
      onEmailChange(savedEmail);
      setRememberMe(true);
    }
  }, [onEmailChange]);

  // Save/remove email based on remember me checkbox
  useEffect(() => {
    if (rememberMe && email) {
      localStorage.setItem('remembered_email', email);
      localStorage.setItem('remember_me', 'true');
    } else if (!rememberMe) {
      localStorage.removeItem('remembered_email');
      localStorage.removeItem('remember_me');
    }
  }, [rememberMe, email]);

  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    if (!checked) {
      // Clear immediately when unchecked
      localStorage.removeItem('remembered_email');
      localStorage.removeItem('remember_me');
    }
  };

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-700 font-medium text-sm">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              const newEmail = sanitizeInput.email(e.target.value);
              onEmailChange(newEmail);

              // Validate email on change
              const validation = validators.email(newEmail);
              setEmailError(validation.isValid ? undefined : validation.error);
            }}
            onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
            placeholder="Enter your email"
            required
            className={`bg-white border-gray-300 h-12 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500 ${
              touched.email && emailError ? 'border-red-500 focus:border-red-500' : ''
            }`}
            autoComplete="email"
          />
          {touched.email && emailError && (
            <div className="text-sm text-red-600 mt-1">{emailError}</div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-gray-700 font-medium text-sm">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                const newPassword = sanitizeInput.string(e.target.value);
                onPasswordChange(newPassword);

                // Validate password on change for signup
                if (isSignUp) {
                  const validation = validators.password(newPassword);
                  setPasswordError(validation.isValid ? undefined : validation.error);
                }
              }}
              onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
              placeholder={isSignUp ? "Create a password (8+ characters)" : "Enter your password"}
              required
              className={`bg-white border-gray-300 h-12 pr-12 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500 ${
                touched.password && passwordError ? 'border-red-500 focus:border-red-500' : ''
              }`}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-0 hover:bg-transparent"
              onClick={onTogglePasswordVisibility}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </Button>
          </div>
          {touched.password && passwordError && (
            <div className="text-sm text-red-600 mt-1">{passwordError}</div>
          )}
        </div>

        {!isSignUp && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={handleRememberMeChange}
                className="border-gray-300 data-[state=checked]:bg-slate-600 data-[state=checked]:border-slate-600"
              />
              <Label htmlFor="remember-me" className="text-sm text-gray-600 cursor-pointer">
                Remember me
              </Label>
            </div>
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-sm text-orange-500 hover:text-orange-600 transition-colors"
            >
              Forgot password?
            </button>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold h-12 transition-colors"
          disabled={loading || (isSignUp && (emailError || passwordError))}
        >
          {loading ? (
            "Loading..."
          ) : (
            <>
              {isSignUp ? "Create Account" : "Sign in"}
            </>
          )}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          {isSignUp
            ? "Already have an account? "
            : "Don't have an account? "
          }
          <button
            type="button"
            onClick={onToggleMode}
            className="text-orange-500 hover:text-orange-600 font-medium transition-colors"
          >
            {isSignUp ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </>
  );
};