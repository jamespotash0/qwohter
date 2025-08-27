/**
 * OTP Verification Form Component
 * 
 * Extracted from Auth.tsx - handles email verification code input
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OtpVerificationFormProps {
  otpCode: string;
  email: string;
  loading: boolean;
  onOtpCodeChange: (code: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBackToSignUp: () => void;
}

export const OtpVerificationForm: React.FC<OtpVerificationFormProps> = ({
  otpCode,
  email,
  loading,
  onOtpCodeChange,
  onSubmit,
  onBackToSignUp
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label htmlFor="otpCode" className="text-slate-700 font-medium text-sm">
          Verification Code
        </Label>
        <Input 
          id="otpCode" 
          type="text" 
          value={otpCode} 
          onChange={(e) => onOtpCodeChange(e.target.value)} 
          placeholder="Enter 6-digit code" 
          maxLength={6}
          required 
          className="bg-slate-50 border-slate-200 h-12 text-center text-lg tracking-widest" 
        />
        <p className="text-sm text-slate-500 text-center">
          Code sent to {email}
        </p>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-12"
        disabled={loading || otpCode.length !== 6}
      >
        {loading ? "Verifying..." : "Verify Email"}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={onBackToSignUp}
          className="text-primary hover:text-primary/80 text-sm font-medium"
        >
          Back to sign up
        </button>
      </div>
    </form>
  );
};