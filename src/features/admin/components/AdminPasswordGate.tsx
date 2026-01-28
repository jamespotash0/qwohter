/**
 * Admin Access Gate
 * Protects admin panel - requires authenticated user with is_super_admin = true
 */

import { useState, useEffect } from 'react';
import { ShieldX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser, useAuthStatus } from '@/auth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface AdminPasswordGateProps {
  children: React.ReactNode;
}

export function AdminPasswordGate({ children }: AdminPasswordGateProps) {
  const user = useUser();
  const { isInitialized } = useAuthStatus();
  const navigate = useNavigate();

  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  // Check if user is a super admin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!isInitialized) return;

      if (!user) {
        setIsSuperAdmin(false);
        setChecking(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('id', user.id)
          .maybeSingle() as { data: { is_super_admin: boolean } | null; error: unknown };

        setIsSuperAdmin(profile?.is_super_admin ?? false);
      } catch (error) {
        console.error('Error checking super admin status:', error);
        setIsSuperAdmin(false);
      } finally {
        setChecking(false);
      }
    };

    checkSuperAdmin();
  }, [user, isInitialized]);

  // Still checking auth/admin state
  if (!isInitialized || checking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not signed in - redirect to sign-in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldX className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Authentication Required
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Please sign in to access the admin panel
              </p>
            </div>

            <Button onClick={() => navigate('/sign-in')} className="w-full">
              Sign In
            </Button>

            <div className="mt-6 text-center">
              <a
                href="/"
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                &larr; Back to App
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Signed in but not a super admin - access denied
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldX className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Access Denied
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                You don't have permission to access the admin panel.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Signed in as {user.email}
              </p>
            </div>

            <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
              Go to Dashboard
            </Button>

            <div className="mt-6 text-center">
              <a
                href="/"
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                &larr; Back to App
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Super admin - allow access
  return <>{children}</>;
}

// Export logout function for use in sidebar (signs out of Supabase)
export const logoutAdmin = async () => {
  const { supabase } = await import('@/integrations/supabase/client');
  await supabase.auth.signOut();
  window.location.href = '/sign-in';
};
