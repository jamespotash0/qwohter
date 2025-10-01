import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { supabase } from '@/integrations/supabase/client';

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
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    '/demo-contact'
  ].includes(location.pathname);

  // Authentication check for protected routes
  useEffect(() => {
    const checkAuth = async () => {
      if (!shouldShowSidebar) {
        setIsLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/sign-in');
        return;
      }
      setUser(session.user);
      setIsLoading(false);
    };
    checkAuth();
  }, [navigate, shouldShowSidebar]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/sign-in');
  };

  // For public routes, render children directly without layout
  if (!shouldShowSidebar) {
    return <>{children}</>;
  }

  // Loading state for protected routes
  if (isLoading || !user) {
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
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="h-screen flex w-full bg-[var(--content-bg)] overflow-hidden">
        <AppSidebar user={user.email || ''} onLogout={handleLogout} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 py-8 px-8 lg:px-12 space-y-4 overflow-auto">
            <div className="max-w-[1350px] mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};