/**
 * OTP Verification Form Component
 *
 * Enhanced design with individual digit inputs and countdown timer
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Edit2, Check, X } from "lucide-react";

interface OtpVerificationFormProps {
  otpCode: string;
  email: string;
  loading: boolean;
  onOtpCodeChange: (code: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onResendCode: () => Promise<void>;
  onChangeEmail?: (newEmail: string) => Promise<void>;
}


export const OtpVerificationForm: React.FC<OtpVerificationFormProps> = ({
  otpCode,
  email,
  loading,
  onOtpCodeChange,
  onSubmit,
  onResendCode,
  onChangeEmail
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(165); // 2:45 in seconds
  const [showOverlay, setShowOverlay] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editedEmail, setEditedEmail] = useState(email);
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
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
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue && value !== '') return;

    const newDigits = [...digits];

    // If user clears the input
    if (value === '') {
      newDigits[index] = '';
      setDigits(newDigits);
      onOtpCodeChange(newDigits.join(''));
      return;
    }

    // Take only the last digit typed (handles replacement)
    const lastDigit = cleanValue.slice(-1);
    newDigits[index] = lastDigit;
    setDigits(newDigits);
    onOtpCodeChange(newDigits.join(''));

    // Auto-advance to next input
    if (index < 5) {
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

  const handleEmailChange = async () => {
    if (!onChangeEmail || !editedEmail || editedEmail === email) {
      setIsEditingEmail(false);
      return;
    }

    try {
      setEmailChangeLoading(true);
      await onChangeEmail(editedEmail);

      // Clear OTP inputs
      const clearedDigits = ['', '', '', '', '', ''];
      setDigits(clearedDigits);
      onOtpCodeChange('');

      // Reset timer
      setTimeLeft(165);

      // Exit edit mode
      setIsEditingEmail(false);

      // Focus first input
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);

    } catch (error) {
      console.error('Failed to change email:', error);
    } finally {
      setEmailChangeLoading(false);
    }
  };

  const handleCancelEmailEdit = () => {
    setEditedEmail(email);
    setIsEditingEmail(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail className="text-slate-700 h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your inbox!</h1>
        <p className="text-gray-600 text-sm mb-2">We've sent a 6-digit verification code to</p>

        {/* Email Display/Edit */}
        {!isEditingEmail ? (
          <div className="flex items-center justify-center gap-2 mb-4">
            <p className="text-slate-700 font-semibold">{email}</p>
            {onChangeEmail && (
              <button
                type="button"
                onClick={() => setIsEditingEmail(true)}
                className="text-orange-600 hover:text-orange-700 p-1 rounded transition-colors"
                title="Change email"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-sm mx-auto mb-4 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                className="flex-1"
                placeholder="Enter new email"
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                onClick={handleEmailChange}
                disabled={emailChangeLoading || !editedEmail}
                className="bg-green-600 hover:bg-green-700 text-white px-3"
              >
                {emailChangeLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCancelEmailEdit}
                disabled={emailChangeLoading}
                className="px-3"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              A new verification code will be sent to the new email
            </p>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
            Enter verification code
          </label>
          <div className="flex justify-center gap-3">
            {[0, 1, 2].map((index) => (
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
            <div className="flex items-center px-2">
              <span className="text-gray-400 text-2xl font-bold">-</span>
            </div>
            {[3, 4, 5].map((index) => (
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
        <div className="flex items-center justify-center gap-2">
          <p className="text-gray-600 text-sm">
            Didn't receive it?
          </p>
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resendLoading}
            className="text-orange-600 hover:text-orange-700 font-semibold text-sm underline-offset-4 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendLoading ? "Sending..." : "Resend Code"}
          </button>
        </div>
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