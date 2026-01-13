import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useUser, useAuthStatus, useSignOut } from '@/auth';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionPaywall } from '@/components/common/SubscriptionPaywall';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { versionCheckService } from '@/services/versionCheckService';
import { toast } from 'sonner';
import { useTrialReminder } from '@/hooks/useTrialReminder';

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * Main Layout Component - Persistent Sidebar Architecture
 *
 * This component sits between the router and page content, ensuring:
 * - Sidebar state persists across navigation
 * - Authentication is handled at layout level
 * - Consistent layout structure for all authenticated pages
 * - Public pages (auth, landing) bypass this layout entirely
 */
const MainLayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ v3.0.0: Use new auth hooks
  const user = useUser();
  const { isInitialized, isLoading } = useAuthStatus();
  const { mutate: signOut, isPending: isLoggingOut } = useSignOut();

  // Note: isAuthChanging removed in v3.0 (handled by AuthEventMutex)

  // Get current organization for paywall from React Query
  const { organization: currentOrganization } = useCurrentOrganization(user?.id || '');

  // Trial reminder system - shows daily payment method reminder
  useTrialReminder();

  // Membership status tracking
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
  const [checkingMembership, setCheckingMembership] = useState(false);

  // Check if current route should show sidebar
  // Public routes that don't require authentication
  const shouldShowSidebar = ![
    '/',
    '/sign-in',
    '/create-account',
    '/auth',
    '/forgot-password',
    '/reset-password',
    '/access-denied',
    '/account-inactive',
    '/demo',
    '/contact-us',
    '/privacy-policy',
    '/privacy-notice',
    '/terms-of-service',
    '/faq',
    '/legal',
    '/cookie-settings',
    '/accessibility-statement',
    '/do-not-sell-my-personal-information'
  ].includes(location.pathname) &&
    !location.pathname.startsWith('/editor/') &&
    !location.pathname.startsWith('/sign/'); // E-signature signing page is public

  // Check membership status for protected routes
  useEffect(() => {
    const checkMembershipStatus = async () => {
      // Skip if not on protected route, not initialized, or no user
      if (!shouldShowSidebar || !isInitialized || !user) {
        setMembershipStatus(null);
        return;
      }

      setCheckingMembership(true);

      try {
        const { data: membership, error } = await supabase
          .from('memberships')
          .select('status, role') //membership_status
          .eq('user_id', user.id)
          .maybeSingle() as { data: { status: string; role: string } | null; error: any };

        if (error) {
          console.error('Error checking membership:', error);
          setMembershipStatus(null);
        } else if (membership) {
          // Check for various membership statuses
          if (membership.status === 'Inactive') { //membership_status
            setMembershipStatus('Inactive');
          } else {
            setMembershipStatus(membership.status); //membership_status
          }
        } else {
          // No membership found - user might not be in an org
          setMembershipStatus(null);
        }
      } catch (error) {
        console.error('Error:', error);
        setMembershipStatus(null);
      } finally {
        setCheckingMembership(false);
      }
    };

    checkMembershipStatus();
  }, [user, isInitialized, shouldShowSidebar]);

  // Authentication check for protected routes
  useEffect(() => {
    if (!shouldShowSidebar) return;

    // Only redirect if:
    // 1. Auth is initialized
    // 2. Auth is NOT loading (prevents redirect while fetching session)
    // 3. User is not logged in
    // Note: v3.0.0 removed isAuthChanging check (AuthEventMutex handles this)
    if (isInitialized && !isLoading && !user) {
      // Save current location before redirecting to sign-in
      localStorage.setItem('auth_redirect_url', location.pathname + location.search);
      navigate('/sign-in');
    }
  }, [navigate, shouldShowSidebar, isInitialized, isLoading, user, location.pathname, location.search]);

  // Redirect based on membership status
  useEffect(() => {
    if (!shouldShowSidebar) return;
    if (location.pathname === '/account-inactive') return; // Prevent redirect loop

    if (membershipStatus === 'Inactive' && !checkingMembership) {
      // Pass fromApp: true so AccountInactive knows this is a valid redirect
      navigate('/account-inactive', { state: { fromApp: true } });
    }
  }, [membershipStatus, checkingMembership, shouldShowSidebar, location.pathname, navigate]);

  // Redirect to sign-in if no user on protected routes (expired session handling)
  useEffect(() => {
    if (isInitialized && !user && shouldShowSidebar) {
      console.log('🔒 No user on protected route, redirecting to sign-in');
      navigate('/sign-in', { replace: true });
    }
  }, [isInitialized, user, shouldShowSidebar, navigate]);

  // ✅ v3.0.0: Session management fully handled by AuthProvider
  // AuthProvider's onAuthStateChange listener detects session expiry
  // and triggers SIGNED_OUT event, which automatically:
  // - Clears React Query cache
  // - Resets all stores
  // - Redirects to sign-in
  // Manual polling removed in v3.0.0 - no longer needed

  // Poll for new app version every 5 minutes
  useEffect(() => {
    // Initialize version check on mount
    versionCheckService.initializeVersionCheck();

    console.log('⏱️ Starting version polling (5min interval)...');

    let hasShownToast = false;

    const checkVersion = async () => {
      const hasNewVersion = await versionCheckService.checkForNewVersion();

      if (hasNewVersion && !hasShownToast) {
        // Show persistent toast once when version changes
        hasShownToast = true;
        toast('New version available!', {
          description: 'A new update was made to the app.',
          duration: Infinity, // Persist until manually dismissed
          classNames: {
            actionButton: '!bg-green-600 hover:!bg-green-700 !text-white',
          },
          action: {
            label: 'Refresh',
            onClick: () => {
              versionCheckService.forceReload();
            },
          },
        });
      }
    };

    // Poll every 5 minutes (reduced from 30s for better performance)
    const pollInterval = setInterval(() => {
      checkVersion();
    }, 300000); // 5 minutes

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  const handleLogout = async () => {
    // ✅ v3.0.0: Use new signOut mutation with callback
    // Note: signOut mutation triggers AuthProvider's SIGNED_OUT handler
    // which automatically clears React Query cache and resets stores

    signOut(undefined, {
      onSuccess: () => {
        // Navigate to sign-in immediately (no artificial delay)
        navigate('/sign-in', { replace: true });
      },
      onError: (error) => {
        console.error('Logout error:', error);
        // Even on error, navigate to sign-in
        navigate('/sign-in', { replace: true });
      },
    });
  };

  // Get sidebar state - only call this hook for protected routes
  const sidebarState = shouldShowSidebar ? useSidebar() : null;
  const sidebarOpen = sidebarState?.open ?? false;

  // For public routes, render children directly without layout
  if (!shouldShowSidebar) {
    // Editor route needs auth check but no sidebar
    if (location.pathname.startsWith('/editor/')) {
      // Check auth for editor
      if (isInitialized && !user) {
        navigate('/sign-in');
        return null;
      }
      // Render editor with auth but no layout wrapper
      return <>{children}</>;
    }
    // Other public routes render directly
    return <>{children}</>;
  }

  // Show loading only for auth initialization
  if (!isInitialized) {
    return (
      <div className="h-screen w-full bg-[var(--content-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--content-button-primary-bg)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--content-muted-text)]">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading while redirecting to sign-in
  if (!user && shouldShowSidebar) {
    return (
      <div className="h-screen w-full bg-[var(--content-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--content-button-primary-bg)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--content-muted-text)]">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Check if we need to wait for subscription check on protected routes
  const excludedPaths = ['/settings'];
  const shouldApplyPaywall = currentOrganization?.id && !excludedPaths.includes(location.pathname);

  // Main layout with persistent sidebar
  // Wrap content with subscription paywall if organization exists
  const content = shouldApplyPaywall ? (
    <SubscriptionPaywall organizationId={currentOrganization.id}>
      {children}
    </SubscriptionPaywall>
  ) : (
    children
  );

  return (
      <div className="h-screen flex w-full overflow-hidden bg-[var(--content-bg)]">
          <AppSidebar user={user?.email || ''} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Content */}
          <main className="flex-1 overflow-hidden">
            {/* Standard layout with padding and max-width */}
            <div className={`h-full pt-6 pb-8 space-y-4 overflow-auto ${sidebarOpen ? 'px-8 lg:px-12' : 'px-6 lg:px-10'}`}>
              <div className="max-w-[1350px] mx-auto w-full">
                {content}
              </div>
            </div>
          </main>
        </div>
      </div>
  );
};

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();

  // Check if current route should show sidebar
  // Public routes that don't require authentication
  const shouldShowSidebar = ![
    '/',
    '/sign-in',
    '/create-account',
    '/auth',
    '/forgot-password',
    '/reset-password',
    '/access-denied',
    '/account-inactive',
    '/demo',
    '/contact-us',
    '/privacy-policy',
    '/privacy-notice',
    '/terms-of-service',
    '/faq',
    '/legal',
    '/cookie-settings',
    '/accessibility-statement',
    '/do-not-sell-my-personal-information'
  ].includes(location.pathname) &&
    !location.pathname.startsWith('/editor/') &&
    !location.pathname.startsWith('/sign/'); // E-signature signing page is public

  // Wrap with SidebarProvider only for protected routes
  if (shouldShowSidebar) {
    return (
      <SidebarProvider defaultOpen={false}>
        <MainLayoutContent>{children}</MainLayoutContent>
      </SidebarProvider>
    );
  }

  // Public routes (like /sign/:token) bypass MainLayoutContent entirely
  // MainLayoutContent has auth redirects, so public pages must not use it
  return <>{children}</>;
};