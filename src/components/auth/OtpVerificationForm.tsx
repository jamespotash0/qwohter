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
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="otpCode" className="text-gray-700 font-medium text-sm">
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
          className="bg-white border-gray-300 h-12 text-center text-lg tracking-widest placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500"
        />
        <p className="text-sm text-gray-600 text-center">
          Code sent to {email}
        </p>
      </div>

      <Button
        type="submit"
        className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold h-12 transition-colors"
        disabled={loading || otpCode.length !== 6}
      >
        {loading ? "Verifying..." : "Verify Email"}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={onBackToSignUp}
          className="text-sm text-orange-500 hover:text-orange-600 transition-colors"
        >
          ← Back to sign up
        </button>
      </div>
    </form>
  );
};