import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuthStore } from '@/stores/auth/authStore';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionPaywall } from '@/components/common/SubscriptionPaywall';
import { useCurrentOrganization, useOrganizationStore } from '@/stores/organization/organizationStore';
import { useQuotesStore } from '@/stores/quotes/quotesStore';
import { useBoardStore } from '@/stores/board/boardStore';
import { useRemindersStore } from '@/stores/reminders/remindersStore';
import { useAppStore } from '@/stores/app/appStore';

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
export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Use auth store instead of local state for cached auth
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthChanging = useAuthStore((state) => state.isAuthChanging);
  const isLoading = useAuthStore((state) => state.isLoading);
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

  const handleLogout = async () => {
    // Reset all stores before signing out to clear all data
    useQuotesStore.getState().reset();
    useBoardStore.getState().reset();
    useOrganizationStore.getState().reset();
    useRemindersStore.getState().reset();
    useAppStore.getState().reset();

    await signOut();
    navigate('/sign-in');
  };

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

  // Only show loading on first initialization, not on subsequent navigations
  if (!isInitialized) {
    return (
      <SidebarProvider defaultOpen={false}>
        <div className="h-screen flex w-full bg-[var(--content-bg)] overflow-hidden">
          <AppSidebar user={user?.email || ''} onLogout={handleLogout} />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-[var(--content-button-primary-bg)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[var(--content-muted-text)]">Loading...</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // Main layout with persistent sidebar
  // Wrap content with subscription paywall if organization exists
  // Exclude settings and pending-approval pages from paywall
  const excludedPaths = ['/settings', '/pending-approval'];
  const shouldApplyPaywall = currentOrganization?.id && !excludedPaths.includes(location.pathname);
  const content = shouldApplyPaywall ? (
    <SubscriptionPaywall organizationId={currentOrganization.id}>
      {children}
    </SubscriptionPaywall>
  ) : (
    children
  );

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="h-screen flex w-full bg-[var(--content-bg)] overflow-hidden">
        <AppSidebar user={user?.email || ''} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header Bar - Commented out for now */}
          {/* <header className="h-16 bg-white dark:bg-[#1A1C23] border-b-2 border-gray-100 dark:border-[var(--sidebar-border)] flex items-center px-8 shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 bg-[var(--sidebar-icon-active)] rounded-full"></div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                {location.pathname === '/dashboard' && 'Dashboard'}
                {location.pathname === '/quotes' && 'Quotes'}
                {location.pathname === '/forms' && 'Forms'}
                {location.pathname === '/board' && 'Board'}
                {location.pathname === '/analytics' && 'Analytics'}
                {location.pathname === '/team' && 'Team'}
                {location.pathname === '/settings' && 'Settings'}
                {location.pathname.startsWith('/forms/builder/') && 'Form Builder'}
                {location.pathname.startsWith('/quotes/new') && 'New Quote'}
              </h2>
            </div>
          </header> */}

          {/* Main Content */}
          <main className="flex-1 overflow-hidden">
            {isFullScreenPage ? (
              // Full-screen layout for wizards (no padding, no max-width)
              <div className="h-full overflow-auto">
                {content}
              </div>
            ) : (
              // Standard layout with padding and max-width
              <div className="h-full py-8 px-8 lg:px-12 space-y-4 overflow-auto">
                <div className="max-w-[1350px] mx-auto w-full">
                  {content}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};