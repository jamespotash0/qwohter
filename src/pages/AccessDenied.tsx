/**
 * Access Denied Page
 * Fun bouncer/velvet rope theme - you're not on the list!
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser, useSignOut } from '@/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut } from 'lucide-react';

interface UserData {
  role: string;
  organization: {
    name: string;
  };
}

/**
 * Bouncer at Velvet Rope Illustration
 * A stern bouncer with crossed arms blocking the entrance
 */
const BouncerIllustration = () => (
  <div className="relative w-64 h-56 mx-auto mb-6">
    {/* Velvet rope posts */}
    <div className="absolute bottom-0 left-4 w-6 h-24 bg-gradient-to-b from-[#C9A227] to-[#8B7119] rounded-t-full shadow-lg">
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-8 bg-gradient-to-b from-[#C9A227] to-[#8B7119] rounded-full shadow-md" />
    </div>
    <div className="absolute bottom-0 right-4 w-6 h-24 bg-gradient-to-b from-[#C9A227] to-[#8B7119] rounded-t-full shadow-lg">
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-8 bg-gradient-to-b from-[#C9A227] to-[#8B7119] rounded-full shadow-md" />
    </div>

    {/* Velvet rope */}
    <div className="absolute bottom-16 left-8 right-8">
      <div className="h-3 bg-gradient-to-b from-[#8B0000] to-[#5C0000] rounded-full shadow-inner" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#B22222]/50 rounded-full" />
    </div>

    {/* Bouncer */}
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
      {/* Head */}
      <div className="w-20 h-20 mx-auto bg-gradient-to-b from-[#f7f2e9] to-[#ebe5dc] rounded-full border-2 border-[#171717]/10 shadow-lg relative">
        {/* Sunglasses */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-1">
          <div className="w-7 h-5 bg-[#171717] rounded-sm" />
          <div className="w-7 h-5 bg-[#171717] rounded-sm" />
        </div>
        {/* Sunglasses bridge */}
        <div className="absolute top-7 left-1/2 -translate-x-1/2 w-2 h-1 bg-[#171717]" />

        {/* Frown */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <svg width="20" height="10" viewBox="0 0 20 10">
            <path d="M2 2 Q10 8 18 2" fill="none" stroke="#171717" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
          </svg>
        </div>

        {/* Earpiece */}
        <div className="absolute top-6 -right-1 w-2 h-4 bg-[#171717] rounded-full" />
        <div className="absolute top-10 -right-0.5 w-1 h-6 bg-[#171717]/50 rounded-full" />
      </div>

      {/* Neck */}
      <div className="w-10 h-4 mx-auto bg-[#f7f2e9] -mt-1" />

      {/* Body - black suit */}
      <div className="w-32 h-20 mx-auto bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] rounded-t-xl relative -mt-2">
        {/* Tie */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-3 bg-[#171717]" />
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[16px] border-l-transparent border-r-transparent border-t-[#8B0000]" />

        {/* Arms crossed */}
        <div className="absolute top-4 -left-4 w-8 h-16 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] rounded-full rotate-45 origin-top-right" />
        <div className="absolute top-4 -right-4 w-8 h-16 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] rounded-full -rotate-45 origin-top-left" />

        {/* Hands (in front) */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 flex -space-x-2">
          <div className="w-6 h-6 bg-[#f7f2e9] rounded-full border border-[#171717]/10 z-10" />
          <div className="w-6 h-6 bg-[#f7f2e9] rounded-full border border-[#171717]/10" />
        </div>
      </div>
    </div>

    {/* "NOT ON THE LIST" stamp effect */}
    <div className="absolute top-0 right-0 transform rotate-12 animate-bounce" style={{ animationDuration: '2s' }}>
      <div className="px-3 py-1.5 bg-[#ee6c4d] text-white text-xs font-bold rounded-sm shadow-lg"
           style={{ fontFamily: 'Urbanist, sans-serif' }}>
        DENIED
      </div>
    </div>

    {/* X marks floating */}
    <div className="absolute top-8 left-8 text-[#ee6c4d]/40 text-2xl font-bold animate-pulse">✕</div>
    <div className="absolute top-16 right-12 text-[#ee6c4d]/30 text-xl font-bold animate-pulse" style={{ animationDelay: '0.5s' }}>✕</div>
  </div>
);

const AccessDenied: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const user = useUser();
  const { mutate: signOut } = useSignOut();

  // Get the required role from navigation state (set by admin panel redirect)
  const locationState = location.state as { requiredRole?: string; fromAdminPanel?: boolean } | null;
  const requiredRole = locationState?.requiredRole || 'Admin';
  const isValidRedirect = locationState?.fromAdminPanel === true;

  // Protect against direct URL access - only allow if redirected from admin panel
  useEffect(() => {
    if (!isValidRedirect) {
      // User tried to access this page directly - redirect to dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [isValidRedirect, navigate]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!user) return;

        const { data, error } = await supabase
          .from('memberships')
          .select(`
            role,
            organizations (
              name
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'Active')
          .single();

        if (!error && data) {
          setUserData(data as any);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  const handleSignOut = () => {
    signOut();
  };

  // Show loading while redirecting unauthorized direct access or fetching user data
  if (!isValidRedirect || loading) {
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
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#ee6c4d]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-[#f7f2e9]/60 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Bouncer illustration */}
        <BouncerIllustration />

        {/* Message */}
        <h1
          className="text-3xl font-bold text-[#171717] mb-2"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          Sorry, you're not on the list
        </h1>
        <p
          className="text-[#171717]/50 mb-6"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          This area requires {requiredRole} access
        </p>

        {/* Role info card */}
        {userData && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-[#171717]/10 p-4 mb-6 text-left">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-[#171717]/50" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                Your current role
              </span>
              <span
                className="text-sm font-semibold text-[#171717] bg-[#f7f2e9] px-3 py-1 rounded-full"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                {userData.role}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#171717]/50" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                Required for access
              </span>
              <span
                className="text-sm font-semibold text-white bg-[#ee6c4d] px-3 py-1 rounded-full"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                {requiredRole}
              </span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 justify-center mb-6">
          <Button
            onClick={handleGoBack}
            className="h-12 px-6 rounded-full bg-[#ee6c4d] hover:bg-[#d95b3e] text-white font-semibold flex items-center gap-2 shadow-lg shadow-[#ee6c4d]/20"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
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
          Contact your organization admin to request access
        </p>
      </div>
    </div>
  );
};

export default AccessDenied;
