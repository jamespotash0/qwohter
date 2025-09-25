import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { authStateHelpers } from '@/utils/authStateHelpers';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresRole?: 'Owner' | 'Admin' | 'Member';
}

/**
 * Protected route component that handles authentication and authorization
 * 
 * Features:
 * - Checks user authentication status
 * - Optional role-based access control
 * - Redirects unauthenticated users to login
 * - Preserves intended destination after login
 * - Shows loading state during auth check
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiresRole 
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<'Owner' | 'Admin' | 'Member' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check for schema migration flag and reset session if needed
        const needsSessionReset = localStorage.getItem('auth_schema_migration');
        if (needsSessionReset) {
          console.log('Resetting session due to auth schema migration');
          await supabase.auth.signOut();
          localStorage.removeItem('auth_schema_migration');
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Check if user is authenticated AND validate session
        const session = await authStateHelpers.checkValidAuthSession();
        
        if (!session || !session.user) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Check if user has completed onboarding (has profile with full_name and active membership)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profile || !profile.full_name) {
          console.log('User has session but incomplete profile, redirecting to auth for onboarding');
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Check membership status - user must have Active membership
        const { data: memberships, error: membershipsError } = await supabase
          .from('memberships')
          .select('role, status, organization_id')
          .eq('user_id', session.user.id)
          .single();

        if (membershipsError || !memberships || memberships.status !== 'Active') {
          console.log('User has profile but no active membership, redirecting to auth for onboarding');
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        setIsAuthenticated(true);
        setUserRole(memberships.role);
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, authSession) => {
        if (event === 'SIGNED_IN' && authSession?.user) {
          // Don't immediately set authenticated - recheck profile completion
          checkAuth();
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setUserRole(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [requiresRole]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-muted-foreground">Checking authentication...</span>
      </div>
    );
  }

  // Redirect to auth page if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/auth" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Check role-based access if required
  if (requiresRole && userRole !== requiresRole) {
    // For now, redirect to dashboard if user doesn't have required role
    // In the future, you could show an "Access Denied" page
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};