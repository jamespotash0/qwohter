/**
 * Authentication Form Component
 * 
 * Extracted from Auth.tsx - handles sign in and sign up forms
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { sanitizeInput } from "@/utils/security";

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
  return (
    <>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="email" className="text-foreground font-medium text-sm">
            Email
          </Label>
          <Input 
            id="email" 
            type="email" 
            value={email} 
            onChange={(e) => onEmailChange(sanitizeInput.email(e.target.value))} 
            placeholder="Enter your email" 
            required 
            className="bg-secondary/50 border-border h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20" 
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="password" className="text-foreground font-medium text-sm">
            Password
          </Label>
          <div className="relative">
            <Input 
              id="password" 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e) => onPasswordChange(sanitizeInput.string(e.target.value))} 
              placeholder="Enter your password" 
              required 
              className="bg-secondary/50 border-border h-12 pr-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20" 
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-0 hover:bg-transparent"
              onClick={onTogglePasswordVisibility}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary/80 font-semibold h-12 btn-floating"
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
          onClick={onToggleMode}
          className="text-primary hover:text-primary/80 text-sm font-medium"
        >
          {isSignUp 
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up"
          }
        </button>
      </div>
    </>
  );
};