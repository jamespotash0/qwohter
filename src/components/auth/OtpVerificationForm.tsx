/**
 * OTP Verification Form Component - Redesigned
 *
 * Clean, elegant verification with individual digit inputs
 * Refined animations and clear visual feedback
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Loader2, RefreshCw } from "lucide-react";

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
  const [timeLeft, setTimeLeft] = useState(165);
  const [showOverlay, setShowOverlay] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0); // Cooldown timer after resend
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editedEmail, setEditedEmail] = useState(email);
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Ensure we always have exactly 6 elements
    const codeChars = otpCode.split('').slice(0, 6);
    const newDigits = [...codeChars, ...Array(6 - codeChars.length).fill('')];
    setDigits(newDigits);
  }, [otpCode]);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleDigitChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue && value !== '') return;

    const newDigits = [...digits];

    if (value === '') {
      newDigits[index] = '';
      setDigits(newDigits);
      onOtpCodeChange(newDigits.join(''));
      return;
    }

    const lastDigit = cleanValue.slice(-1);
    newDigits[index] = lastDigit;
    setDigits(newDigits);
    onOtpCodeChange(newDigits.join(''));

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

      const clearedDigits = ['', '', '', '', '', ''];
      setDigits(clearedDigits);
      onOtpCodeChange('');
      setTimeLeft(165);
      setResendCooldown(60); // Start 60-second cooldown
      setShowOverlay(true);
      inputRefs.current[0]?.focus();

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

      const clearedDigits = ['', '', '', '', '', ''];
      setDigits(clearedDigits);
      onOtpCodeChange('');
      setTimeLeft(165);
      setIsEditingEmail(false);

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

  const isCodeComplete = digits.join('').length === 6;

  return (
    <div className="space-y-6">
      {/* Email Display/Edit */}
      <div className="text-center">
        {!isEditingEmail ? (
          <div className="space-y-1">
            <p className="text-[#171717]/60">
              Enter the 6-digit code sent to
            </p>
            <p className="text-[#171717] font-semibold">{email}</p>
            {onChangeEmail && (
              <button
                type="button"
                onClick={() => setIsEditingEmail(true)}
                className="text-sm text-[#ee6c4d] hover:text-[#d65a3d] font-medium mt-2 transition-colors"
              >
                Change email
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-sm mx-auto space-y-3">
            <p className="text-sm text-[#171717]/60 mb-2">Enter new email address</p>
            <div className="flex items-center gap-2">
              <Input
                type="email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                className="flex-1 h-11 rounded-xl bg-[#f7f2e9] border-[#171717]/10 focus:border-[#ee6c4d] focus:ring-coral/20"
                placeholder="Enter new email"
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                onClick={handleEmailChange}
                disabled={emailChangeLoading || !editedEmail}
                className="h-11 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl"
              >
                {emailChangeLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
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
                className="h-11 px-4 rounded-xl"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-[#171717]/50">
              A new code will be sent to this address
            </p>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* OTP Input Grid */}
        <div className="flex justify-center items-center gap-3">
          {digits.map((digit, index) => (
            <div key={index} className="flex items-center gap-2">
              {index === 3 && (
                <span className="text-[#171717]/30 font-medium text-xl">-</span>
              )}
              <input
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={`
                  w-12 h-14 text-center text-2xl font-bold rounded-xl
                  border-2 outline-none transition-all duration-200
                  ${digit
                    ? 'bg-[#ee6c4d]/5 border-[#ee6c4d] text-[#171717]'
                    : 'bg-[#f7f2e9] border-[#171717]/10 text-[#171717]'
                  }
                  hover:border-[#171717]/20
                  focus:border-[#ee6c4d] focus:bg-white focus:ring-2 focus:ring-[#ee6c4d]/20
                `}
              />
            </div>
          ))}
        </div>

        {/* Verify Button */}
        <Button
          type="submit"
          className="w-full h-12 bg-[#ee6c4d] hover:bg-[#ee6c4d]/90 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !isCodeComplete}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying...
            </span>
          ) : (
            "Verify email"
          )}
        </Button>
      </form>

      {/* Resend and Timer */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-[#171717]/50">Didn't receive it?</span>
          {resendCooldown > 0 ? (
            <span className="text-sm text-red-500 font-semibold">
              Resend in {resendCooldown}s
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendLoading}
              className="text-sm text-[#ee6c4d] hover:text-[#d65a3d] font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {resendLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Resend code
                </>
              )}
            </button>
          )}
        </div>

        {/* Timer */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f7f2e9] rounded-full">
          {timeLeft > 0 ? (
            <>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-[#171717]/60">
                Code expires in{' '}
                <span className="font-semibold text-[#171717]">{formatTime(timeLeft)}</span>
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm text-red-600 font-medium">
                Code expired - request a new one
              </span>
            </>
          )}
        </div>
      </div>

      {/* Success Overlay */}
      {showOverlay && (
        <div className="fixed inset-0 bg-[#171717]/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full text-center shadow-2xl"
            style={{ animation: 'fade-in-up 0.3s ease-out' }}
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-[#171717] mb-2">Code Sent!</h3>
            <p className="text-[#171717]/60">
              A new verification code has been sent to your email.
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
