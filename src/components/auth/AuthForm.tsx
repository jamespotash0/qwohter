/**
 * Authentication Form Component - Redesigned
 *
 * Clean, refined form styling with subtle interactions
 * Consistent with the editorial design direction
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { sanitizeInput } from "@/utils/security";
import { validators } from "@/utils/validation";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { useState } from "react";
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
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [touched, setTouched] = useState({ email: false, password: false, names: false });
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields on submit
    const emailValidation = validators.email(email);
    const emailErr = emailValidation.isValid ? undefined : emailValidation.error;
    setEmailError(emailErr);

    let passwordErr: string | undefined;
    if (isSignUp) {
      const passwordValidation = validators.password(password);
      passwordErr = passwordValidation.isValid ? undefined : passwordValidation.error;
    } else if (!password) {
      passwordErr = 'Password is required';
    }
    setPasswordError(passwordErr);

    setTouched({ email: true, password: true, names: true });

    if (emailErr || passwordErr || (isSignUp && (!firstName || !lastName))) {
      return;
    }

    onSubmit(e);
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
      <form onSubmit={handleSubmit} className="space-y-4">
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
                className={`${inputClasses} ${touched.names && !firstName ? inputErrorClasses : ''}`}
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
                className={`${inputClasses} ${touched.names && !lastName ? inputErrorClasses : ''}`}
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

                // Clear submit error as user types
                if (passwordError) setPasswordError(undefined);
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
          {isSignUp && <PasswordStrengthMeter password={password} />}
          {touched.password && passwordError && (
            <p className="text-sm text-red-500 mt-1.5">{passwordError}</p>
          )}
        </div>

        {/* Forgot password link - only on sign-in */}
        {!isSignUp && (
          <div className="flex justify-end">
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
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isSignUp ? "Creating account..." : "Signing in..."}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              {isSignUp ? "Create account" : "Sign in"}
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>

        {/* Terms notice for signup */}
        {isSignUp && (
          <p className="text-center text-[11px] text-[#171717]/40" style={{ fontFamily: 'Urbanist, sans-serif' }}>
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

      {/* Disabled create-account button button */}

      {/* <p className="text-center text-sm text-[#171717]/50" style={{ fontFamily: 'Urbanist, sans-serif' }}>
        {isSignUp ? "Already have an account? " : "Don't have an account? "}
        <button
          type="button"
          onClick={onToggleMode}
          className="text-[#171717]/70 underline underline-offset-2 hover:text-[#ee6c4d] transition-colors font-medium"
        >
          {isSignUp ? "Log in" : "Sign up"}
        </button>
      </p> */}
    </div>
  );
};
