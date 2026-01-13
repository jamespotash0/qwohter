/**
 * Account Inactive Page
 * Fun ghost/faded theme - you've become invisible to the organization
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser, useSignOut } from '@/auth';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { Button } from '@/components/ui/button';
import { LogOut, Mail } from 'lucide-react';

/**
 * Ghost Person Illustration
 * A faded/transparent figure looking at a locked door
 */
const GhostPersonIllustration = () => (
  <div className="relative w-64 h-56 mx-auto mb-6">
    {/* Locked door */}
    <div className="absolute right-4 bottom-0 w-24 h-40 bg-gradient-to-b from-[#d4c4b0] to-[#c4b4a0] rounded-t-lg border-2 border-[#171717]/10 shadow-lg">
      {/* Door frame */}
      <div className="absolute inset-2 bg-gradient-to-b from-[#e5d5c5] to-[#d5c5b5] rounded-t" />
      {/* Lock */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <div className="w-4 h-5 bg-[#C9A227] rounded-sm shadow-md" />
        <div className="w-2 h-3 bg-[#171717]/20 rounded-full mx-auto -mt-1" />
      </div>
      {/* "CLOSED" sign */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[#ee6c4d] text-white text-[8px] font-bold rounded shadow-sm rotate-[-5deg]">
        CLOSED
      </div>
    </div>

    {/* Ghost person (faded) */}
    <div className="absolute left-8 bottom-0 opacity-40">
      {/* Head */}
      <div className="w-16 h-16 mx-auto bg-gradient-to-b from-[#f7f2e9] to-[#ebe5dc] rounded-full border border-[#171717]/5 shadow-sm relative">
        {/* Sad eyes */}
        <div className="flex justify-center gap-3 pt-4">
          <div className="w-2 h-2 bg-[#171717]/30 rounded-full" />
          <div className="w-2 h-2 bg-[#171717]/30 rounded-full" />
        </div>
        {/* Sad mouth */}
        <div className="flex justify-center mt-2">
          <svg width="16" height="8" viewBox="0 0 16 8">
            <path d="M2 6 Q8 2 14 6" fill="none" stroke="rgba(23,23,23,0.2)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Body */}
      <div className="w-20 h-16 mx-auto bg-gradient-to-b from-[#f7f2e9] to-transparent rounded-t-2xl -mt-2 relative">
        {/* Arms reaching toward door */}
        <div className="absolute -right-2 top-2 w-12 h-3 bg-[#f7f2e9]/80 rounded-full rotate-[-10deg]" />
      </div>
    </div>

    {/* Floating "?" marks */}
    <div className="absolute top-4 left-16 text-[#171717]/20 text-xl font-bold animate-pulse">?</div>
    <div className="absolute top-12 left-8 text-[#171717]/15 text-lg font-bold animate-pulse" style={{ animationDelay: '0.5s' }}>?</div>

    {/* Fading sparkles (showing the person fading) */}
    <div className="absolute bottom-12 left-12 w-1 h-1 bg-[#171717]/10 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
    <div className="absolute bottom-20 left-16 w-1.5 h-1.5 bg-[#171717]/15 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
    <div className="absolute bottom-8 left-20 w-1 h-1 bg-[#171717]/10 rounded-full animate-ping" style={{ animationDelay: '0.6s' }} />
  </div>
);

const AccountInactive: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const user = useUser();
  const { mutate: signOut } = useSignOut();

  // Get current organization info
  const { organization: currentOrganization, role: currentUserRole } = useCurrentOrganization(user?.id || '');

  // Check if this is a valid redirect from the app
  const locationState = location.state as { fromApp?: boolean } | null;
  const isValidRedirect = locationState?.fromApp === true;

  // Protect against direct URL access
  useEffect(() => {
    if (!isValidRedirect) {
      navigate('/dashboard', { replace: true });
    }
  }, [isValidRedirect, navigate]);

  // If user becomes active again, redirect to dashboard
  useEffect(() => {
    if (currentUserRole && currentUserRole !== null) {
      navigate('/dashboard');
    }
  }, [currentUserRole, navigate]);

  const handleSignOut = () => {
    signOut(undefined, {
      onSuccess: () => {
        navigate('/sign-in');
      }
    });
  };

  const handleContactSupport = () => {
    window.location.href = `mailto:support@qwohter.com?subject=Account Reactivation Request&body=Hi, I'd like to request reactivation of my account (${user?.email}).`;
  };

  // Show loading while redirecting unauthorized direct access
  if (!isValidRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFFEFA] via-[#FFF9F7] to-[#FFE8E3]">
        <div className="w-10 h-10 border-4 border-[#ee6c4d] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFFEFA] via-[#FFF9F7] to-[#FFE8E3] p-4 overflow-hidden">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#171717]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-[#f7f2e9]/60 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Ghost illustration */}
        <GhostPersonIllustration />

        {/* Message */}
        <h1
          className="text-3xl font-bold text-[#171717] mb-2"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          You've gone invisible
        </h1>
        <p
          className="text-[#171717]/50 mb-6"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          Your access to {currentOrganization?.name || 'the organization'} has been removed
        </p>

        {/* Info card */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-[#171717]/10 p-4 mb-6 text-left">
          <p
            className="text-sm text-[#171717]/60 mb-3"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            An administrator has deactivated your account. If you think this is a mistake, reach out to your organization owner.
          </p>
          {user?.email && (
            <div className="flex items-center gap-2 text-xs text-[#171717]/40 pt-2 border-t border-[#171717]/10">
              <span>Signed in as:</span>
              <span className="font-medium text-[#171717]/60">{user.email}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center mb-6">
          <Button
            onClick={handleContactSupport}
            className="h-12 px-6 rounded-full bg-[#ee6c4d] hover:bg-[#d95b3e] text-white font-semibold flex items-center gap-2 shadow-lg shadow-[#ee6c4d]/20"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </Button>
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="h-12 px-6 rounded-full border-[#171717]/15 text-[#171717]/70 hover:text-[#171717] hover:bg-white/50 font-medium flex items-center gap-2"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        {/* Help text */}
        <p
          className="text-xs text-[#171717]/30"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          Need help? Email support@qwohter.com
        </p>
      </div>
    </div>
  );
};

export default AccountInactive;
