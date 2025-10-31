import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuthStore } from '@/stores/auth/authStore';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionPaywall } from '@/components/common/SubscriptionPaywall';
import { useCurrentOrganization, useOrganizationStore } from '@/stores/organization/organizationStore';
import { useQuotesStore } from '@/stores/quotes/quotesStore';
import { useBoardStore } from '@/stores/board/boardStore';
import { useRemindersStore } from '@/stores/reminders/remindersStore';
import { useAppStore } from '@/stores/app/appStore';
import { versionCheckService } from '@/services/versionCheckService';
import { toast } from 'sonner';

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

  // Use auth store instead of local state for cached auth
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthChanging = useAuthStore((state) => state.isAuthChanging);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isLoggingOut = useAuthStore((state) => state.isLoggingOut);
  const signOut = useAuthStore((state) => state.signOut);

  // Get current organization for paywall
  const currentOrganization = useCurrentOrganization();

  // Membership status tracking
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
  const [checkingMembership, setCheckingMembership] = useState(false);

  // Check if current route should show sidebar
  const shouldShowSidebar = ![
    '/',
    '/sign-in',
    '/create-account',
    '/auth',
    '/forgot-password',
    '/reset-password',
    '/pending-approval',
    '/access-denied',
    '/account-inactive',
    '/demo-contact'
  ].includes(location.pathname) && !location.pathname.startsWith('/editor/');

  // Check if we're on a full-screen wizard page (no padding/max-width)
  const isFullScreenPage = ['/quotes/new'].includes(location.pathname) ||
    location.pathname.startsWith('/quotes/edit-incomplete/');

  // Check if we're on the Board page (show bottom border with padding)
  const isBoardPage = location.pathname === '/board';

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
          .select('status, role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking membership:', error);
          setMembershipStatus(null);
        } else if (membership) {
          // Check for various membership statuses
          if (membership.status === 'Inactive') {
            setMembershipStatus('Inactive');
          } else if (membership.status === 'Pending' && membership.role !== 'Owner') {
            // Only check pending status for non-Owners
            // Owners (who created the org) should always have Active status
            setMembershipStatus('Pending');
          } else {
            setMembershipStatus(membership.status);
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
    // 3. Auth is NOT changing (prevents redirect during state changes)
    // 4. User is not logged in
    if (isInitialized && !isLoading && !isAuthChanging && !user) {
      // Save current location before redirecting to sign-in
      localStorage.setItem('auth_redirect_url', location.pathname + location.search);
      navigate('/sign-in');
    }
  }, [navigate, shouldShowSidebar, isInitialized, isLoading, isAuthChanging, user, location.pathname, location.search]);

  // Redirect based on membership status
  useEffect(() => {
    if (!shouldShowSidebar) return;
    if (location.pathname === '/pending-approval' || location.pathname === '/account-inactive') return; // Prevent redirect loop

    if (membershipStatus === 'Inactive' && !checkingMembership) {
      navigate('/account-inactive');
    } else if (membershipStatus === 'Pending' && !checkingMembership) {
      navigate('/pending-approval');
    }
  }, [membershipStatus, checkingMembership, shouldShowSidebar, location.pathname, navigate]);

  // Redirect to sign-in if no user on protected routes (expired session handling)
  useEffect(() => {
    if (isInitialized && !user && shouldShowSidebar) {
      console.log('🔒 No user on protected route, redirecting to sign-in');
      navigate('/sign-in', { replace: true });
    }
  }, [isInitialized, user, shouldShowSidebar, navigate]);

  // Poll session status every minute to detect expired sessions
  useEffect(() => {
    if (!shouldShowSidebar || !isInitialized) return;

    console.log('⏱️ Starting session polling (1 minute interval)...');

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Session check error:', error);
          // Session invalid - log out
          console.log('🔒 Session invalid, logging out...');
          await handleLogout();
          return;
        }

        if (!session && user) {
          // Session expired but user still in store - log out
          console.log('🔒 Session expired, logging out...');
          await handleLogout();
        }
      } catch (error) {
        console.error('❌ Error checking session:', error);
      }
    };

    // Poll every minute (60000ms)
    const pollInterval = setInterval(() => {
      checkSession();
    }, 60000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [shouldShowSidebar, isInitialized, user]);

  // Poll for new app version every 30 seconds
  useEffect(() => {
    // Initialize version check on mount
    versionCheckService.initializeVersionCheck();

    console.log('⏱️ Starting version polling (30s interval)...');

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

    // Poll every 30 seconds
    const pollInterval = setInterval(() => {
      checkVersion();
    }, 30000);

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  const handleLogout = async () => {
    const startTime = Date.now();
    const MIN_LOGOUT_TIME = 800; // 800ms minimum for smooth UX

    // Set logging out state IMMEDIATELY to hide user info and show loading overlay
    useAuthStore.getState()._setLoggingOut(true);

    // Wait a frame to ensure UI updates (loading overlay shows)
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    // Reset all stores to clear UI
    useQuotesStore.getState().reset();
    useBoardStore.getState().reset();
    useOrganizationStore.getState().reset();
    useRemindersStore.getState().reset();
    useAppStore.getState().reset();

    // Sign out (this will clear auth state)
    await signOut();

    // Ensure minimum display time for loading spinner (smooth UX)
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, MIN_LOGOUT_TIME - elapsedTime);
    if (remainingTime > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingTime));
    }

    // Navigate to sign-in (stores handle cleanup, no reload needed)
    navigate('/sign-in', { replace: true });
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
  const excludedPaths = ['/settings', '/pending-approval'];
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
      <div className={`h-screen flex w-full overflow-hidden ${isBoardPage ? 'bg-sidebar' : 'bg-[var(--content-bg)]'}`}>
          {/* Logout overlay to prevent flash */}
          {isLoggingOut && (
            <div className="absolute inset-0 bg-background z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Signing out...</p>
              </div>
            </div>
          )}

          <AppSidebar user={user?.email || ''} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Content */}
          <main className="flex-1 overflow-hidden">
            {isFullScreenPage ? (
              // Full-screen layout for wizards (no padding, no max-width)
              <div className="h-full overflow-auto">
                {content}
              </div>
            ) : isBoardPage ? (
              // Board page: Card-based layout with sidebar background
              <div className="h-full pt-3 pr-3 pl-4 pb-3">
                <div className="h-full max-w-[1400px] mx-auto">
                  <div className="h-full shadow-xl flex flex-col relative z-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="flex-1 overflow-y-auto bg-sidebar">
                      <div className="h-full pt-4 px-6 pb-6 bg-white dark:bg-gray-900">
                        {content}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Standard layout with padding and max-width (original)
              <div className={`h-full pt-6 pb-8 space-y-4 overflow-auto ${sidebarOpen ? 'px-8 lg:px-12' : 'px-6 lg:px-10'}`}>
                <div className="max-w-[1350px] mx-auto w-full">
                  {content}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
  );
};

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();

  // Check if current route should show sidebar
  const shouldShowSidebar = ![
    '/',
    '/sign-in',
    '/create-account',
    '/auth',
    '/forgot-password',
    '/reset-password',
    '/pending-approval',
    '/access-denied',
    '/account-inactive',
    '/demo-contact'
  ].includes(location.pathname) && !location.pathname.startsWith('/editor/');

  // Wrap with SidebarProvider only for protected routes
  if (shouldShowSidebar) {
    return (
      <SidebarProvider defaultOpen={false}>
        <MainLayoutContent>{children}</MainLayoutContent>
      </SidebarProvider>
    );
  }

  // Public routes render without SidebarProvider
  return <MainLayoutContent>{children}</MainLayoutContent>;
};