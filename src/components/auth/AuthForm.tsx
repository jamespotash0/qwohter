/**
 * Authentication Form Component - Redesigned
 *
 * Clean, refined form styling with subtle interactions
 * Consistent with the editorial design direction
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { sanitizeInput } from "@/utils/security";
import { validators } from "@/utils/validation";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface AuthFormProps {
  isSignUp: boolean;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  showPassword: boolean;
  loading: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onFirstNameChange?: (firstName: string) => void;
  onLastNameChange?: (lastName: string) => void;
  onTogglePasswordVisibility: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  isSignUp,
  email,
  password,
  firstName,
  lastName,
  showPassword,
  loading,
  onEmailChange,
  onPasswordChange,
  onFirstNameChange,
  onLastNameChange,
  onTogglePasswordVisibility,
  onSubmit,
  onToggleMode
}) => {
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [touched, setTouched] = useState({ email: false, password: false });
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    const savedRememberMe = localStorage.getItem('remember_me') === 'true';

    if (savedEmail && savedRememberMe) {
      onEmailChange(savedEmail);
      setRememberMe(true);
    }
  }, [onEmailChange]);

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
      localStorage.removeItem('remembered_email');
      localStorage.removeItem('remember_me');
    }
  };

  // Shared input classes - matching landing page aesthetic
  const inputClasses = `
    w-full h-12 px-4 bg-[#f7f2e9]/50 border border-[#171717]/10 rounded-full
    text-[#171717] placeholder:text-[#171717]/40
    transition-all duration-200
    hover:border-[#171717]/20 hover:bg-[#f7f2e9]/70
    focus:outline-none focus:ring-2 focus:ring-[#ee6c4d]/20 focus:border-[#ee6c4d] focus:bg-white
  `;

  const inputErrorClasses = `
    border-red-400/50 bg-red-50/30
    hover:border-red-400
    focus:ring-red-200 focus:border-red-400
  `;

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Name fields for signup */}
        {isSignUp && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium text-[#171717]" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                First name
              </Label>
              <Input
                id="firstName"
                type="text"
                value={firstName || ''}
                onChange={(e) => onFirstNameChange?.(sanitizeInput.string(e.target.value))}
                placeholder="John"
                required
                className={inputClasses}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium text-[#171717]" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                Last name
              </Label>
              <Input
                id="lastName"
                type="text"
                value={lastName || ''}
                onChange={(e) => onLastNameChange?.(sanitizeInput.string(e.target.value))}
                placeholder="Doe"
                required
                className={inputClasses}
                autoComplete="family-name"
              />
            </div>
          </div>
        )}

        {/* Email field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-[#171717]">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              const newEmail = sanitizeInput.email(e.target.value);
              onEmailChange(newEmail);
              const validation = validators.email(newEmail);
              setEmailError(validation.isValid ? undefined : validation.error);
            }}
            onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
            placeholder="john@company.com"
            required
            className={`${inputClasses} ${touched.email && emailError ? inputErrorClasses : ''}`}
            autoComplete="email"
          />
          {touched.email && emailError && (
            <p className="text-sm text-red-500 mt-1.5">{emailError}</p>
          )}
        </div>

        {/* Password field */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-[#171717]">
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

                if (isSignUp) {
                  const validation = validators.password(newPassword);
                  setPasswordError(validation.isValid ? undefined : validation.error);
                }
              }}
              onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
              placeholder={isSignUp ? "Create a strong password" : "Enter your password"}
              required
              className={`${inputClasses} pr-12 ${touched.password && passwordError ? inputErrorClasses : ''}`}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
            <button
              type="button"
              className="absolute right-0 top-0 h-full px-4 flex items-center justify-center text-[#171717]/40 hover:text-[#171717]/60 transition-colors"
              onClick={onTogglePasswordVisibility}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {touched.password && passwordError && (
            <p className="text-sm text-red-500 mt-1.5">{passwordError}</p>
          )}
          {isSignUp && !passwordError && (
            <p className="text-xs text-[#171717]/40 mt-1.5">
              At least 8 characters with uppercase, lowercase, and numbers
            </p>
          )}
        </div>

        {/* Remember me and forgot password for sign in */}
        {!isSignUp && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={handleRememberMeChange}
                className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-[#ee6c4d] data-[state=checked]:border-[#ee6c4d]"
              />
              <Label htmlFor="remember-me" className="text-sm text-[#171717]/60 cursor-pointer">
                Remember me
              </Label>
            </div>
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-sm text-[#ee6c4d] hover:text-[#d65a3d] font-medium transition-colors"
            >
              Forgot password?
            </button>
          </div>
        )}

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full h-12 bg-[#ee6c4d] hover:bg-[#ee6c4d]/90 text-white font-semibold rounded-full transition-all duration-200 group"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
          disabled={
            loading ||
            (isSignUp && (
              !!emailError ||
              !!passwordError ||
              !firstName ||
              !lastName
            ))
          }
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isSignUp ? "Creating account..." : "Signing in..."}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              {isSignUp ? "Create account" : "Sign in"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </Button>

        {/* Terms notice for signup */}
        {isSignUp && (
          <p className="text-center text-sm text-[#171717]/50" style={{ fontFamily: 'Urbanist, sans-serif' }}>
            By signing up to Qwohter, you accept our{" "}
            <a
              href="/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#171717]/70 underline underline-offset-2 hover:text-[#ee6c4d] transition-colors"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#171717]/70 underline underline-offset-2 hover:text-[#ee6c4d] transition-colors"
            >
              Privacy Policy
            </a>
          </p>
        )}
      </form>

      {/* Simple toggle link */}
      <p className="text-center text-sm text-[#171717]/50" style={{ fontFamily: 'Urbanist, sans-serif' }}>
        {isSignUp ? "Already have an account? " : "Don't have an account? "}
        <button
          type="button"
          onClick={onToggleMode}
          className="text-[#171717]/70 underline underline-offset-2 hover:text-[#ee6c4d] transition-colors font-medium"
        >
          {isSignUp ? "Log in" : "Sign up"}
        </button>
      </p>
    </div>
  );
};
