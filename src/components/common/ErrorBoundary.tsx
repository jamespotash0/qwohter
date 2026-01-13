/**
 * Global Error Boundary
 *
 * Why: Catches unhandled React errors and prevents white screen of death
 * What it does:
 * - Catches component errors during rendering, lifecycle, and constructors
 * - Sends error details to Sentry for debugging
 * - Shows user-friendly fallback UI
 * - Allows user to recover (go back or reload)
 */

import * as Sentry from '@sentry/react';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Full Glitchy Robot CSS Illustration
 */
const GlitchyRobot = () => (
  <div className="relative w-48 h-48 mx-auto mb-6">
    {/* Floating error symbols */}
    <div className="absolute -top-2 -left-2 text-2xl animate-bounce" style={{ animationDelay: '0.1s' }}>?</div>
    <div className="absolute -top-4 right-4 text-xl animate-bounce" style={{ animationDelay: '0.3s' }}>!</div>
    <div className="absolute top-8 -right-4 text-lg animate-bounce" style={{ animationDelay: '0.5s' }}>?</div>

    <div className="relative">
      {/* Antenna */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-6 w-1 h-6 bg-[#171717]/20 rounded-full">
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#ee6c4d] rounded-full animate-pulse" />
      </div>

      {/* Head */}
      <div className="w-32 h-28 mx-auto bg-gradient-to-b from-[#f7f2e9] to-[#ebe5dc] rounded-3xl border-2 border-[#171717]/10 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ee6c4d]/5 to-transparent animate-pulse" />

        {/* Eyes */}
        <div className="flex justify-center gap-4 pt-6">
          <div className="w-10 h-10 bg-white rounded-xl border border-[#171717]/10 flex items-center justify-center shadow-inner">
            <span className="text-[#ee6c4d] font-bold text-lg" style={{ fontFamily: 'Urbanist, sans-serif' }}>✕</span>
          </div>
          <div className="w-10 h-10 bg-white rounded-xl border border-[#171717]/10 flex items-center justify-center shadow-inner">
            <div className="w-5 h-5 border-2 border-[#ee6c4d] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>

        {/* Mouth */}
        <div className="flex justify-center mt-3">
          <svg width="40" height="12" viewBox="0 0 40 12" className="text-[#171717]/40">
            <path d="M0 6 L8 2 L16 10 L24 2 L32 10 L40 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Neck */}
      <div className="w-8 h-4 mx-auto bg-[#171717]/10 rounded-b-lg" />

      {/* Body */}
      <div className="w-40 h-20 mx-auto bg-gradient-to-b from-[#f7f2e9] to-[#ebe5dc] rounded-2xl border-2 border-[#171717]/10 shadow-lg relative -mt-1">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-10 bg-[#171717]/5 rounded-lg border border-[#171717]/10 overflow-hidden">
          <div className="flex gap-1 h-full items-end justify-center p-1">
            <div className="w-2 bg-[#ee6c4d]/60 rounded-t animate-pulse" style={{ height: '40%', animationDelay: '0s' }} />
            <div className="w-2 bg-[#ee6c4d]/60 rounded-t animate-pulse" style={{ height: '70%', animationDelay: '0.2s' }} />
            <div className="w-2 bg-[#ee6c4d]/60 rounded-t animate-pulse" style={{ height: '30%', animationDelay: '0.4s' }} />
            <div className="w-2 bg-[#ee6c4d]/60 rounded-t animate-pulse" style={{ height: '90%', animationDelay: '0.6s' }} />
            <div className="w-2 bg-[#ee6c4d]/60 rounded-t animate-pulse" style={{ height: '50%', animationDelay: '0.8s' }} />
          </div>
        </div>

        {/* Arms */}
        <div className="absolute -left-6 top-4 w-5 h-12 bg-[#f7f2e9] rounded-full border-2 border-[#171717]/10 rotate-12" />
        <div className="absolute -right-6 top-4 w-5 h-12 bg-[#f7f2e9] rounded-full border-2 border-[#171717]/10 -rotate-12" />
      </div>

      {/* Sparks */}
      <div className="absolute -right-2 top-20">
        <div className="text-[#ee6c4d] text-sm animate-ping">⚡</div>
      </div>
      <div className="absolute -left-4 top-24" style={{ animationDelay: '0.5s' }}>
        <div className="text-[#ee6c4d] text-xs animate-ping">⚡</div>
      </div>
    </div>
  </div>
);

/**
 * Fun error messages
 */
const ERROR_QUIPS = [
  "Oops! I tripped over a cable",
  "Well, this is awkward...",
  "Houston, we have a problem",
  "Error 4-oh-no!",
  "Beep boop... bzzzt!",
];

const getRandomQuip = () => ERROR_QUIPS[Math.floor(Math.random() * ERROR_QUIPS.length)];

/**
 * Fallback UI shown when an error is caught
 */
const ErrorFallback = ({
  error,
  resetError,
}: {
  error: unknown;
  componentStack: string;
  eventId: string;
  resetError: () => void;
}) => {
  const isDevelopment = import.meta.env.MODE === 'development';
  const quip = getRandomQuip();

  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : 'Unknown error';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFFEFA] via-[#FFF9F7] to-[#FFE8E3] p-4">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-[#ee6c4d]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-[#f7f2e9]/50 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Robot illustration */}
        <GlitchyRobot />

        {/* Error message */}
        <h1
          className="text-2xl font-bold text-[#171717] mb-2"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          {quip}
        </h1>
        <p
          className="text-[#171717]/50 mb-6"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          We've been notified and are looking into it
        </p>

        {isDevelopment && (
          <div className="mb-6 p-3 rounded-2xl bg-[#171717]/5 border border-[#171717]/10 text-left">
            <p
              className="text-xs text-[#171717]/40 mb-1"
              style={{ fontFamily: 'Urbanist, sans-serif' }}
            >
              Dev mode error:
            </p>
            <p
              className="text-xs text-[#171717]/60 font-mono break-all"
            >
              {errorMessage}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          <Button
            onClick={resetError}
            className="h-12 px-6 rounded-full bg-[#ee6c4d] hover:bg-[#d95b3e] text-white font-semibold flex items-center gap-2"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="h-12 px-6 rounded-full border-[#171717]/15 text-[#171717]/70 hover:text-[#171717] hover:bg-[#171717]/5 font-medium flex items-center gap-2"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
        </div>

        {/* Tiny footer */}
        <p
          className="text-xs text-[#171717]/30 mt-8"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          Don't worry, we've noted this down for fixing
        </p>
      </div>
    </div>
  );
};

/**
 * Sentry-powered Error Boundary
 */
export const ErrorBoundary = Sentry.withErrorBoundary(
  ({ children }: { children: React.ReactNode }) => <>{children}</>,
  {
    fallback: ErrorFallback,
    showDialog: false,
    beforeCapture: (scope, error, componentStack) => {
      scope.setTag('error_boundary', 'global');
      scope.setContext('component_stack', {
        stack: componentStack,
      });

      if (import.meta.env.MODE === 'development') {
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Component stack:', componentStack);
      }
    },
  }
);

/**
 * ProposalErrorBoundary - Specialized for proposal-related components
 */
export const ProposalErrorBoundary = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFFEFA] via-[#FFF9F7] to-[#FFE8E3] p-4">
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-20 w-64 h-64 bg-[#ee6c4d]/5 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-20 w-80 h-80 bg-[#f7f2e9]/50 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-md text-center">
            <GlitchyRobot />
            <h1
              className="text-2xl font-bold text-[#171717] mb-2"
              style={{ fontFamily: 'Urbanist, sans-serif' }}
            >
              Proposal took a coffee break
            </h1>
            <p
              className="text-[#171717]/50 mb-8"
              style={{ fontFamily: 'Urbanist, sans-serif' }}
            >
              Your data is safe, it's just being shy right now
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={resetError}
                className="h-12 px-6 rounded-full bg-[#ee6c4d] hover:bg-[#d95b3e] text-white font-semibold flex items-center gap-2"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button
                onClick={() => window.location.href = '/proposals'}
                variant="outline"
                className="h-12 px-6 rounded-full border-[#171717]/15 text-[#171717]/70 hover:text-[#171717] hover:bg-[#171717]/5 font-medium flex items-center gap-2"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                <ArrowLeft className="w-4 h-4" />
                All Proposals
              </Button>
            </div>
          </div>
        </div>
      )}
      beforeCapture={(scope) => {
        scope.setTag('error_boundary', 'proposal');
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};

/**
 * FeatureErrorBoundary - Inline card style for component-level errors
 */
export const FeatureErrorBoundary = ({
  children,
  featureName,
}: {
  children: React.ReactNode;
  featureName: string;
}) => {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="p-6 rounded-2xl border border-[#ee6c4d]/20 bg-gradient-to-br from-[#FFF9F7] to-[#FFE8E3]">
          <div className="flex items-start gap-4">
            {/* Mini robot face */}
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-b from-[#f7f2e9] to-[#ebe5dc] rounded-xl border border-[#171717]/10 flex items-center justify-center">
              <div className="flex gap-1">
                <span className="text-[#ee6c4d] text-xs font-bold">✕</span>
                <div className="w-2 h-2 border border-[#ee6c4d] border-t-transparent rounded-full animate-spin" />
              </div>
            </div>

            <div className="flex-1">
              <h3
                className="font-semibold text-[#171717] mb-1"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                {featureName} hit a snag
              </h3>
              <p
                className="text-sm text-[#171717]/50 mb-3"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                Give it another shot, or let us know if it keeps happening
              </p>

              {import.meta.env.MODE === 'development' && (
                <p className="text-xs text-[#171717]/40 font-mono mb-3 break-all">
                  {error instanceof Error
                    ? error.message
                    : typeof error === 'string'
                    ? error
                    : 'Unknown error'}
                </p>
              )}

              <Button
                onClick={resetError}
                size="sm"
                className="h-9 px-4 rounded-full bg-[#ee6c4d] hover:bg-[#d95b3e] text-white font-medium text-sm"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                <RefreshCw className="w-3 h-3 mr-1.5" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      )}
      beforeCapture={(scope) => {
        scope.setTag('error_boundary', 'feature');
        scope.setTag('feature_name', featureName);
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};
