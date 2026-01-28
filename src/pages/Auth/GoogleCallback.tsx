/**
 * Google OAuth Callback Page
 *
 * Handles the OAuth redirect from Google after user authorizes.
 * Exchanges the code for tokens and communicates back to the parent window.
 *
 * Design: Matches Auth.tsx warm cream/coral aesthetic with Urbanist typography
 */

import { useEffect, useState } from 'react';
import { handleGoogleOAuthCallback } from '@/services/googleDocsIntegrationService';

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

/** Pulsing dots loader - matches brand aesthetic */
const PulsingLoader = () => (
  <div className="flex items-center justify-center gap-2">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="w-3 h-3 rounded-full bg-[#EE6C4D]"
        style={{
          animation: 'pulse-bounce 1.4s ease-in-out infinite',
          animationDelay: `${i * 0.16}s`,
        }}
      />
    ))}
  </div>
);

/** Animated success checkmark with draw effect */
const SuccessCheckmark = () => (
  <div className="relative w-20 h-20 mx-auto">
    {/* Outer ring */}
    <div
      className="absolute inset-0 rounded-full border-4 border-[#10B981]"
      style={{
        animation: 'scale-in 0.3s ease-out forwards',
      }}
    />
    {/* Inner fill */}
    <div
      className="absolute inset-2 rounded-full bg-[#10B981]/10"
      style={{
        animation: 'fade-scale-in 0.4s ease-out 0.2s forwards',
        opacity: 0,
      }}
    />
    {/* Checkmark SVG */}
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 80 80"
      fill="none"
    >
      <path
        d="M24 42L34 52L56 30"
        stroke="#10B981"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 60,
          strokeDashoffset: 60,
          animation: 'draw-check 0.5s ease-out 0.3s forwards',
        }}
      />
    </svg>
    {/* Sparkles */}
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className="absolute w-2 h-2 bg-[#10B981] rounded-full"
        style={{
          top: '50%',
          left: '50%',
          animation: `sparkle-out 0.6s ease-out ${0.4 + i * 0.1}s forwards`,
          transform: `rotate(${i * 90}deg) translateY(-40px)`,
          opacity: 0,
        }}
      />
    ))}
  </div>
);

/** Animated error icon with shake */
const ErrorIcon = () => (
  <div
    className="relative w-20 h-20 mx-auto"
    style={{ animation: 'shake 0.5s ease-out 0.2s' }}
  >
    {/* Outer ring */}
    <div className="absolute inset-0 rounded-full border-4 border-[#EF4444]" />
    {/* Inner fill */}
    <div className="absolute inset-2 rounded-full bg-[#EF4444]/10" />
    {/* X mark */}
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 80 80"
      fill="none"
    >
      <path
        d="M28 28L52 52M52 28L28 52"
        stroke="#EF4444"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GoogleCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        if (error) {
          const errorDescription = params.get('error_description') || 'Authorization was denied';
          setStatus('error');
          setErrorMessage(errorDescription);

          if (window.opener) {
            window.opener.postMessage(
              { type: 'google-oauth-callback', success: false, error: errorDescription },
              window.location.origin
            );
          }
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setErrorMessage('Missing authorization code or state');
          return;
        }

        const result = await handleGoogleOAuthCallback(code, state);

        if (result.success) {
          setStatus('success');

          if (window.opener) {
            window.opener.postMessage(
              { type: 'google-oauth-callback', success: true },
              window.location.origin
            );
          }

          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          setStatus('error');
          setErrorMessage(result.error || 'Failed to complete authorization');

          if (window.opener) {
            window.opener.postMessage(
              { type: 'google-oauth-callback', success: false, error: result.error },
              window.location.origin
            );
          }
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');

        if (window.opener) {
          window.opener.postMessage(
            { type: 'google-oauth-callback', success: false, error: 'Unexpected error' },
            window.location.origin
          );
        }
      }
    };

    processCallback();
  }, []);

  return (
    <>
      {/* Keyframe animations */}
      <style>{`
        @keyframes pulse-bounce {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes fade-scale-in {
          from {
            transform: scale(0.5);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes draw-check {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes sparkle-out {
          0% {
            opacity: 0;
            transform: rotate(var(--rotation, 0deg)) translateY(0);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: rotate(var(--rotation, 0deg)) translateY(-50px);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>

      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{ background: '#FFFEFA' }}
      >
        {/* Animated gradient orbs - matches Auth.tsx */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-[-80px] right-[-100px] w-[350px] h-[350px] rounded-full blur-[80px]"
            style={{
              background: '#EE6C4D',
              opacity: status === 'success' ? 0.2 : status === 'error' ? 0.15 : 0.35,
              transition: 'opacity 0.6s ease-out',
            }}
          />
          <div
            className="absolute bottom-[-60px] left-[-80px] w-[300px] h-[300px] rounded-full blur-[70px]"
            style={{
              background: status === 'success' ? '#10B981' : status === 'error' ? '#EF4444' : '#F7C4BB',
              opacity: status === 'success' ? 0.25 : status === 'error' ? 0.2 : 0.3,
              transition: 'all 0.6s ease-out',
            }}
          />
          {/* Subtle floating particles */}
          {status === 'loading' && (
            <div
              className="absolute top-1/2 left-1/2 w-[200px] h-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[60px]"
              style={{
                background: 'linear-gradient(135deg, #EE6C4D 0%, #F7C4BB 100%)',
                backgroundSize: '200% 200%',
                animation: 'gradient-shift 3s ease infinite',
                opacity: 0.2,
              }}
            />
          )}
        </div>

        {/* Content card */}
        <div
          className="relative z-10 text-center px-10 py-12 max-w-[380px] w-full mx-4 bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.06)]"
          style={{
            animation: 'fade-in-up 0.5s ease-out forwards',
          }}
        >
          {/* Google icon - small, subtle branding */}
          <div className="mb-8 flex justify-center">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-black/5">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </div>
          </div>

          {/* Loading State */}
          {status === 'loading' && (
            <div style={{ animation: 'fade-in-up 0.4s ease-out' }}>
              <div className="mb-8">
                <PulsingLoader />
              </div>
              <h1
                className="text-[22px] text-[#171717] tracking-[-0.01em] leading-tight mb-2"
                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
              >
                Connecting to Google
              </h1>
              <p
                className="text-[#171717]/50 text-sm leading-relaxed"
                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 400 }}
              >
                Please wait while we securely connect your account...
              </p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div style={{ animation: 'fade-in-up 0.4s ease-out' }}>
              <div className="mb-6">
                <SuccessCheckmark />
              </div>
              <h1
                className="text-[22px] text-[#171717] tracking-[-0.01em] leading-tight mb-2"
                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
              >
                Successfully Connected
              </h1>
              <p
                className="text-[#171717]/50 text-sm leading-relaxed mb-6"
                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 400 }}
              >
                Your Google account is now linked. This window will close automatically.
              </p>
              {/* Auto-close progress bar */}
              <div className="w-full h-1 bg-[#171717]/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#10B981] rounded-full"
                  style={{
                    animation: 'shrink-bar 2s linear forwards',
                  }}
                />
              </div>
              <style>{`
                @keyframes shrink-bar {
                  from { width: 100%; }
                  to { width: 0%; }
                }
              `}</style>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div style={{ animation: 'fade-in-up 0.4s ease-out' }}>
              <div className="mb-6">
                <ErrorIcon />
              </div>
              <h1
                className="text-[22px] text-[#171717] tracking-[-0.01em] leading-tight mb-2"
                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
              >
                Connection Failed
              </h1>
              <p
                className="text-[#171717]/50 text-sm leading-relaxed mb-6"
                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 400 }}
              >
                {errorMessage}
              </p>
              <button
                onClick={() => window.close()}
                className="w-full h-11 bg-[#171717] hover:bg-[#171717]/90 text-white font-medium rounded-full transition-all duration-200 active:scale-[0.98]"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                Close Window
              </button>
            </div>
          )}
        </div>

        {/* Bottom branding */}
        <div
          className="absolute bottom-6 left-0 right-0 text-center"
          style={{ animation: 'fade-in-up 0.6s ease-out 0.2s backwards' }}
        >
          <p
            className="text-xs text-[#171717]/30"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            Powered by Qwohter
          </p>
        </div>
      </div>
    </>
  );
}
