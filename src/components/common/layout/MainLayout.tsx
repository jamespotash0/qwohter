import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuthStore } from '@/stores/auth/authStore';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionPaywall } from '@/components/common/SubscriptionPaywall';
import { useCurrentOrganization } from '@/stores/organization/organizationStore';

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
    '/demo-contact',
    '/subscription'
  ].includes(location.pathname);

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
          // Only check pending status for non-Owners
          // Owners (who created the org) should always have Active status
          // But just in case, don't redirect Owners to pending approval
          if (membership.status === 'Pending' && membership.role !== 'Owner') {
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

    // Only redirect if auth is initialized and user is not logged in
    if (isInitialized && !user) {
      navigate('/sign-in');
    }
  }, [navigate, shouldShowSidebar, isInitialized, user]);

  // Redirect to pending approval if membership is pending
  useEffect(() => {
    if (!shouldShowSidebar) return;
    if (location.pathname === '/pending-approval') return; // Prevent redirect loop

    if (membershipStatus === 'Pending' && !checkingMembership) {
      navigate('/pending-approval');
    }
  }, [membershipStatus, checkingMembership, shouldShowSidebar, location.pathname, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/sign-in');
  };

  // For public routes, render children directly without layout
  if (!shouldShowSidebar) {
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
  // Exclude settings page from paywall so users can access billing
  const shouldApplyPaywall = currentOrganization?.id && location.pathname !== '/settings';
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
        <main className="flex-1 flex flex-col overflow-hidden">
          {isFullScreenPage ? (
            // Full-screen layout for wizards (no padding, no max-width)
            <div className="flex-1 overflow-auto">
              {content}
            </div>
          ) : (
            // Standard layout with padding and max-width
            <div className="flex-1 py-8 px-8 lg:px-12 space-y-4 overflow-auto">
              <div className="max-w-[1350px] mx-auto w-full">
                {content}
              </div>
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
};