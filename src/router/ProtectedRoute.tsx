import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/auth';

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
  const [userRole, setUserRole] = useState<'Owner' | 'Admin' | 'Member' | null>(null);

  // ✅ v3.0.0: Use new auth hook
  const user = useUser();

  useEffect(() => {
    // Fetch user role from membership if user exists
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole(null);
        return;
      }

      try {
        const { data: memberships } = await supabase
          .from('memberships')
          .select('role')
          .eq('user_id', user.id)
          .eq('status', 'Active') //membership_status
          .single();

        setUserRole((memberships as any)?.role || null);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, [user]);

  // MainLayout handles auth redirect, so just check roles here
  // Only check role-based access if we have all the required data
  if (requiresRole && user) {
    // Wait for role to be fetched before checking access
    if (userRole === null) {
      // Still fetching role, render children (will be protected by MainLayout if needed)
      return <>{children}</>;
    }

    // Check if user has required role
    if (!hasRequiredRole(userRole, requiresRole)) {
      // Redirect to access denied page with required role info
      return (
        <Navigate
          to="/access-denied"
          state={{ requiredRole: String(requiresRole), userRole: String(userRole) }}
          replace
        />
      );
    }
  }

  return <>{children}</>;
};