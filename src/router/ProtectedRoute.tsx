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
 * Check if user has required role based on role hierarchy
 * Owner > Admin > Member
 */
const hasRequiredRole = (
  userRole: 'Owner' | 'Admin' | 'Member' | null,
  requiredRole: 'Owner' | 'Admin' | 'Member'
): boolean => {
  if (!userRole) return false;

  const roleHierarchy = { Owner: 3, Admin: 2, Member: 1 };
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
};

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | 'pending' | null>(null);
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

        if (profileError || !profile || !(profile as any).full_name) {
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

        if (membershipsError || !memberships) {
          console.log('User has profile but no membership, redirecting to auth for onboarding');
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // If membership is pending, redirect to pending approval page
        if ((memberships as any).status === 'Pending') {
          console.log('User has pending membership, redirecting to pending approval page');
          setIsAuthenticated('pending');
          setIsLoading(false);
          return;
        }

        // If membership is not active (suspended, etc), redirect to auth
        if ((memberships as any).status !== 'Active') {
          console.log('User has inactive membership, redirecting to auth');
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        setIsAuthenticated(true);
        setUserRole((memberships as any).role);
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

  // Redirect to pending approval page if membership is pending
  if (isAuthenticated === 'pending') {
    return <Navigate to="/pending-approval" replace />;
  }

  // Redirect to auth page if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/sign-in"
        state={{ from: location }}
        replace
      />
    );
  }

  // Check role-based access if required
  if (requiresRole && !hasRequiredRole(userRole, requiresRole)) {
    // Redirect to access denied page with required role info
    return (
      <Navigate
        to="/access-denied"
        state={{ requiredRole: requiresRole, userRole: userRole }}
        replace
      />
    );
  }

  return <>{children}</>;
};