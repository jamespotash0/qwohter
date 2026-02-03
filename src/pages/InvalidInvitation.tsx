/**
 * Invalid Invitation Page
 * Displayed when a user tries to access an invitation link that is:
 * - Already used
 * - Expired
 * - Revoked
 * - Invalid/Not found
 * - For a different email (EmailMismatch)
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LayoutDashboard, LogOut, Mail } from 'lucide-react';
import * as authService from '@/auth/services/authService';

// Error type matches the capitalized types from inviteTokens.ts
type InvitationErrorType = 'Used' | 'Expired' | 'Revoked' | 'NotFound' | 'Invalid' | 'EmailMismatch';

const VALID_ERROR_TYPES: InvitationErrorType[] = ['Used', 'Expired', 'Revoked', 'NotFound', 'Invalid', 'EmailMismatch'];

/**
 * Broken Chain Illustration
 * A chain link broken apart - symbolizing an invalid/broken invitation link
 */
const BrokenChainIllustration = () => (
  <div className="relative w-64 h-48 mx-auto mb-6">
    {/* Left chain link */}
    <div className="absolute left-4 top-1/2 -translate-y-1/2">
      <div className="relative">
        {/* Outer ring */}
        <div className="w-16 h-24 border-[6px] border-[#171717]/20 rounded-full" />
        {/* Inner shadow */}
        <div className="absolute inset-2 w-12 h-20 border-[3px] border-[#171717]/10 rounded-full" />
        {/* Shine effect */}
        <div className="absolute top-2 left-2 w-2 h-6 bg-white/40 rounded-full rotate-12" />
      </div>
    </div>

    {/* Right chain link (broken/separated) */}
    <div className="absolute right-4 top-1/2 -translate-y-1/2 rotate-12">
      <div className="relative">
        {/* Outer ring */}
        <div className="w-16 h-24 border-[6px] border-[#ee6c4d]/40 rounded-full" />
        {/* Inner shadow */}
        <div className="absolute inset-2 w-12 h-20 border-[3px] border-[#ee6c4d]/20 rounded-full" />
        {/* Shine effect */}
        <div className="absolute top-2 left-2 w-2 h-6 bg-white/40 rounded-full rotate-12" />
      </div>
    </div>

    {/* Break marks / sparks */}
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="relative">
        {/* Spark lines */}
        <div className="absolute -left-2 -top-4 w-1 h-4 bg-[#ee6c4d]/60 rotate-45 animate-pulse" />
        <div className="absolute left-1 -top-2 w-1 h-3 bg-[#ee6c4d]/40 -rotate-12 animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="absolute -left-3 top-2 w-1 h-3 bg-[#ee6c4d]/50 rotate-[30deg] animate-pulse" style={{ animationDelay: '0.4s' }} />

        {/* X mark in center */}
        <div className="w-8 h-8 flex items-center justify-center">
          <span className="text-[#ee6c4d] text-2xl font-bold">✕</span>
        </div>
      </div>
    </div>

    {/* "INVALID" stamp effect */}
    <div className="absolute top-0 right-0 transform rotate-12 animate-bounce" style={{ animationDuration: '2s' }}>
      <div
        className="px-3 py-1.5 bg-[#ee6c4d] text-white text-xs font-bold rounded-sm shadow-lg"
        style={{ fontFamily: 'Urbanist, sans-serif' }}
      >
        INVALID
      </div>
    </div>

    {/* Floating question marks */}
    <div className="absolute top-4 left-8 text-[#ee6c4d]/30 text-lg font-bold animate-pulse">?</div>
    <div className="absolute bottom-4 right-8 text-[#ee6c4d]/20 text-xl font-bold animate-pulse" style={{ animationDelay: '0.5s' }}>?</div>
  </div>
);

/**
 * Get error-specific messaging based on the error type
 */
const getErrorContent = (
  errorType: InvitationErrorType,
  isSignupInvite: boolean,
  inviteEmail?: string | null,
  currentEmail?: string | null,
) => {
  // Different messaging for signup invites (new org) vs team invites (join existing org)
  const contactEntity = isSignupInvite ? 'support' : "your organization's administrator";

  switch (errorType) {
    case 'EmailMismatch':
      return {
        title: "Wrong account",
        description: `This invitation is for ${inviteEmail || 'a different email'}. You're currently signed in as ${currentEmail || 'a different account'}.`,
        helpText: 'Sign out and accept the invitation with the correct account, or go back to your dashboard.',
      };
    case 'Used':
      return {
        title: "This invitation has been used",
        description: isSignupInvite
          ? "This signup invitation link has already been used to create an account."
          : "This invitation link has already been accepted by another user.",
        helpText: `If you believe this is an error, please contact ${contactEntity} for a new invitation.`,
      };
    case 'Expired':
      return {
        title: "This invitation has expired",
        description: isSignupInvite
          ? "Signup invitation links are valid for 7 days. This one is no longer active."
          : "Invitation links are valid for 24 hours. This one is no longer active.",
        helpText: `Please contact ${contactEntity} to receive a new invitation.`,
      };
    case 'Revoked':
      return {
        title: "This invitation has been revoked",
        description: "The administrator has cancelled this invitation.",
        helpText: `Please contact ${contactEntity} if you still need access.`,
      };
    case 'NotFound':
    case 'Invalid':
    default:
      return {
        title: "Invalid invitation link",
        description: "This invitation link is invalid or has been removed.",
        helpText: `Please contact ${contactEntity} for a valid invitation.`,
      };
  }
};

const InvalidInvitation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read error info from URL query params (reliable, survives state loss)
  const rawError = searchParams.get('error');
  const errorType: InvitationErrorType = VALID_ERROR_TYPES.includes(rawError as InvitationErrorType)
    ? (rawError as InvitationErrorType)
    : 'Invalid';
  const isSignupInvite = searchParams.get('type') === 'signup';
  const isEmailMismatch = errorType === 'EmailMismatch';

  // EmailMismatch-specific params
  const inviteEmail = searchParams.get('inviteEmail');
  const currentEmail = searchParams.get('currentEmail');

  // Direct access without ?error= param → redirect to landing
  const isValidAccess = !!rawError;

  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Check if user is signed in (for button display)
  useEffect(() => {
    authService.getSession().then((session) => {
      setIsSignedIn(!!session);
    });
  }, []);

  // Protect against direct URL access without error param
  useEffect(() => {
    if (!isValidAccess) {
      navigate('/', { replace: true });
    }
  }, [isValidAccess, navigate]);

  const handleGoToHome = () => {
    window.location.href = '/';
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard', { replace: true });
  };

  const handleContact = () => {
    if (isSignupInvite) {
      window.location.href = 'mailto:support@qwohter.com?subject=Request%20for%20New%20Signup%20Invitation';
    } else {
      window.location.href = 'mailto:?subject=Request%20for%20New%20Invitation%20Link';
    }
  };

  /**
   * Sign out and redirect to accept the invite with the correct account.
   * The invite token was stored in sessionStorage by Auth.tsx before navigating here.
   */
  const handleSignOutAndAccept = async () => {
    setIsSigningOut(true);
    try {
      const storedToken = sessionStorage.getItem('mismatchInviteToken');
      await authService.signOut();

      if (storedToken) {
        // Redirect to create-account with the invite token so the flow restarts
        sessionStorage.removeItem('mismatchInviteToken');
        window.location.href = `/create-account?invite=${encodeURIComponent(storedToken)}`;
      } else {
        // Fallback: no token stored, just go to home
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Sign out failed:', err);
      setIsSigningOut(false);
    }
  };

  // Show loading while redirecting unauthorized direct access
  if (!isValidAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFFEFA] via-[#FFF9F7] to-[#FFE8E3]">
        <div className="w-10 h-10 border-4 border-[#ee6c4d] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const content = getErrorContent(errorType, isSignupInvite, inviteEmail, currentEmail);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFFEFA] via-[#FFF9F7] to-[#FFE8E3] p-4 overflow-hidden">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#ee6c4d]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-[#f7f2e9]/60 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Broken chain illustration */}
        <BrokenChainIllustration />

        {/* Error message */}
        <h1
          className="text-3xl font-bold text-[#171717] mb-2"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          {content.title}
        </h1>
        <p
          className="text-[#171717]/60 mb-4"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          {content.description}
        </p>

        {/* Help text card */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-[#171717]/10 p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#ee6c4d]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Mail className="w-4 h-4 text-[#ee6c4d]" />
            </div>
            <p
              className="text-sm text-[#171717]/70"
              style={{ fontFamily: 'Urbanist, sans-serif' }}
            >
              {content.helpText}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          {isEmailMismatch ? (
            <>
              <Button
                onClick={handleSignOutAndAccept}
                disabled={isSigningOut}
                className="h-12 px-6 rounded-full bg-[#ee6c4d] hover:bg-[#d95b3e] text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#ee6c4d]/20"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                {isSigningOut ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                {isSigningOut ? 'Signing out...' : 'Sign Out & Accept Invite'}
              </Button>
              <Button
                onClick={handleGoToDashboard}
                variant="outline"
                className="h-12 px-6 rounded-full border-[#171717]/15 text-[#171717]/70 hover:text-[#171717] hover:bg-white/50 font-medium flex items-center justify-center gap-2"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                <LayoutDashboard className="w-4 h-4" />
                Go to Dashboard
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={isSignedIn ? handleGoToDashboard : handleGoToHome}
                className="h-12 px-6 rounded-full bg-[#ee6c4d] hover:bg-[#d95b3e] text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#ee6c4d]/20"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                {isSignedIn ? (
                  <><LayoutDashboard className="w-4 h-4" /> Go to Dashboard</>
                ) : (
                  <><ArrowLeft className="w-4 h-4" /> Back to Qwohter</>
                )}
              </Button>
              <Button
                onClick={handleContact}
                variant="outline"
                className="h-12 px-6 rounded-full border-[#171717]/15 text-[#171717]/70 hover:text-[#171717] hover:bg-white/50 font-medium flex items-center justify-center gap-2"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                <Mail className="w-4 h-4" />
                {isSignupInvite ? 'Contact Support' : 'Contact Administrator'}
              </Button>
            </>
          )}
        </div>

        {/* Footer text */}
        <p
          className="text-xs text-[#171717]/30"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          Need help? Contact us at support@qwohter.com
        </p>
      </div>
    </div>
  );
};

export default InvalidInvitation;
