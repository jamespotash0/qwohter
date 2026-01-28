/**
 * SignupRecoveryPrompt Component
 *
 * Shown when a user returns to auth with an interrupted signup flow.
 * Gives them the choice to continue verification or start over.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowLeft } from 'lucide-react';

interface SignupRecoveryPromptProps {
  email: string;
  fullName: string;
  loading: boolean;
  onContinue: () => Promise<void>;
  onStartOver: () => void;
}

export const SignupRecoveryPrompt: React.FC<SignupRecoveryPromptProps> = ({
  email,
  fullName,
  loading,
  onContinue,
  onStartOver,
}) => {
  const [isResending, setIsResending] = useState(false);

  const handleContinue = async () => {
    setIsResending(true);
    try {
      await onContinue();
    } finally {
      setIsResending(false);
    }
  };

  const firstName = fullName?.split(' ')[0] || 'there';

  return (
    <div className="space-y-6">
      {/* Welcome back message */}
      <p
        className="text-[#171717]/70 text-sm text-center"
        style={{ fontFamily: 'Urbanist, sans-serif' }}
      >
        Hey {firstName}, we noticed you were in the middle of verifying your email
      </p>

      {/* Email display */}
      <div className="bg-[#171717]/5 rounded-lg p-4 text-center">
        <p
          className="text-xs text-[#171717]/50 mb-1"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          Verification email was sent to
        </p>
        <p
          className="text-[#171717] font-medium"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          {email}
        </p>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleContinue}
          disabled={loading || isResending}
          className="w-full h-12 bg-[#171717] hover:bg-[#171717]/90 text-white rounded-xl"
          style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 500 }}
        >
          {isResending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Sending new code...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Resend Code & Continue
            </>
          )}
        </Button>

        <Button
          onClick={onStartOver}
          disabled={loading || isResending}
          variant="outline"
          className="w-full h-12 border-[#171717]/20 text-[#171717] hover:bg-[#171717]/5 rounded-xl"
          style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 500 }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Start Over
        </Button>
      </div>

      {/* Help text */}
      <p
        className="text-xs text-[#171717]/40 text-center"
        style={{ fontFamily: 'Urbanist, sans-serif' }}
      >
        Clicking "Resend Code" will send a fresh verification code to your email
      </p>

      {/* Support Contact */}
      <p
        className="text-xs text-[#171717]/40 text-center"
        style={{ fontFamily: 'Urbanist, sans-serif' }}
      >
        Need help?{' '}
        <a href="mailto:info@qwohter.com" className="text-[#ee6c4d] hover:underline">
          info@qwohter.com
        </a>
      </p>
    </div>
  );
};
