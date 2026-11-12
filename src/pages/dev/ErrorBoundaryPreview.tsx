/**
 * Dev-only preview page for ErrorBoundary designs
 * Access at /dev/error-test
 */

import { useState } from 'react';
import { RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Glitchy Robot CSS Illustration
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

const ERROR_MESSAGES = [
  { title: "Oops! I tripped over a cable", subtitle: "My circuits are a bit scrambled right now" },
  { title: "Well, this is awkward...", subtitle: "I promise I usually work better than this" },
  { title: "Houston, we have a problem", subtitle: "Something went sideways (literally)" },
  { title: "Error 4-oh-no!", subtitle: "I'm as confused as you are, honestly" },
  { title: "Beep boop... bzzzt!", subtitle: "That's robot for 'something broke'" },
];

export default function ErrorBoundaryPreview() {
  const [messageIndex, setMessageIndex] = useState(0);
  const message = ERROR_MESSAGES[messageIndex];

  const cycleMessage = () => {
    setMessageIndex((prev) => (prev + 1) % ERROR_MESSAGES.length);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFFEFA] via-[#FFF9F7] to-[#FFE8E3] p-4">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-[#ee6c4d]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-[#f7f2e9]/50 rounded-full blur-3xl" />
      </div>

      {/* Dev toolbar */}
      <div className="fixed top-4 left-4 z-50 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-mono">
        DEV PREVIEW - Click message to cycle ({messageIndex + 1}/{ERROR_MESSAGES.length})
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        <GlitchyRobot />

        {/* Clickable message area */}
        <button onClick={cycleMessage} className="cursor-pointer hover:opacity-80 transition-opacity">
          <h1
            className="text-2xl font-bold text-[#171717] mb-2"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            {message.title}
          </h1>
          <p
            className="text-[#171717]/50 mb-8"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            {message.subtitle}
          </p>
        </button>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => alert('Try Again clicked')}
            className="h-12 px-6 rounded-full bg-[#ee6c4d] hover:bg-[#d95b3e] text-white font-semibold flex items-center gap-2"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button
            onClick={() => window.location.href = '/dashboard'}
            variant="outline"
            className="h-12 px-6 rounded-full border-[#171717]/15 text-[#171717]/70 hover:text-[#171717] hover:bg-[#171717]/5 font-medium flex items-center gap-2"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Button>
        </div>

        <p
          className="text-xs text-[#171717]/30 mt-8"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          Don't worry, we've noted this down for fixing
        </p>
      </div>
    </div>
  );
}
