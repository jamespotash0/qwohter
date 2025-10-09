/**
 * OTP Verification Form Component
 *
 * Enhanced design with individual digit inputs and countdown timer
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

interface OtpVerificationFormProps {
  otpCode: string;
  email: string;
  loading: boolean;
  onOtpCodeChange: (code: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onResendCode: () => Promise<void>;
}

export const OtpVerificationForm: React.FC<OtpVerificationFormProps> = ({
  otpCode,
  email,
  loading,
  onOtpCodeChange,
  onSubmit,
  onResendCode
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(165); // 2:45 in seconds
  const [showOverlay, setShowOverlay] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize digits from otpCode
  useEffect(() => {
    const newDigits = otpCode.padEnd(6, '').split('').slice(0, 6);
    setDigits(newDigits);
  }, [otpCode]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleDigitChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1); // Take only the last character
    setDigits(newDigits);

    // Update the full code
    onOtpCodeChange(newDigits.join(''));

    // Move to next input if digit entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    const pastedDigits = pasteData.replace(/\D/g, '').slice(0, 6);

    const newDigits = Array(6).fill('');
    for (let i = 0; i < pastedDigits.length; i++) {
      newDigits[i] = pastedDigits[i];
    }

    setDigits(newDigits);
    onOtpCodeChange(newDigits.join(''));

    // Focus the next empty input or the last filled input
    const nextEmptyIndex = newDigits.findIndex(digit => digit === '');
    const focusIndex = nextEmptyIndex === -1 ? 5 : Math.min(nextEmptyIndex, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleResendCode = async () => {
    try {
      setResendLoading(true);
      await onResendCode();

      // Clear inputs
      const clearedDigits = ['', '', '', '', '', ''];
      setDigits(clearedDigits);
      onOtpCodeChange('');

      // Reset timer
      setTimeLeft(165);

      // Show success overlay
      setShowOverlay(true);

      // Focus first input
      inputRefs.current[0]?.focus();

      // Hide overlay after 2 seconds
      setTimeout(() => {
        setShowOverlay(false);
      }, 2000);

    } catch (error) {
      console.error('Failed to resend code:', error);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="text-slate-700 h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h1>
        <p className="text-gray-600 text-sm mb-2">We've sent a 6-digit verification code to</p>
        <p className="text-slate-700 font-semibold mb-4">{email}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
            Enter verification code
          </label>
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digits[index] || ''}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-700/20 focus:border-slate-700 transition-colors duration-200 bg-white shadow-sm outline-none"
                required
              />
            ))}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-slate-700 text-white py-3 px-6 rounded-xl hover:bg-slate-800 transition-colors duration-200 font-semibold"
          disabled={loading || digits.join('').length !== 6}
        >
          {loading ? "Verifying..." : "Verify Code"}
        </Button>
      </form>

      {/* Resend Code Option */}
      <div className="text-center">
        <p className="text-gray-600 text-sm mb-4">
          Didn't receive the code?
        </p>
        <button
          type="button"
          onClick={handleResendCode}
          disabled={resendLoading}
          className="text-orange-600 hover:text-orange-700 font-semibold text-sm underline-offset-4 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resendLoading ? "Sending..." : "Resend code"}
        </button>
      </div>

      {/* Countdown Timer */}
      <div className="text-center">
        <div className="text-sm text-gray-500">
          {timeLeft > 0 ? (
            <>
              Code expires in <span className="font-semibold text-slate-700">{formatTime(timeLeft)}</span>
            </>
          ) : (
            <div className="space-y-1">
              <span className="text-red-500 font-semibold block">Code expired</span>
              <span className="text-gray-600 text-xs block">Click "Resend code" above to get a new verification code</span>
            </div>
          )}
        </div>
      </div>

      {/* Success Overlay */}
      {showOverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Code Sent!</h3>
            <p className="text-gray-600 text-sm">A new verification code has been sent to your email.</p>
          </div>
        </div>
      )}
    </div>
  );
};