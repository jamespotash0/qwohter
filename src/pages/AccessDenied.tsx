/**
 * Access Denied Page
 *
 * Shows when user has an active membership but lacks required role permissions
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser, useSignOut } from '@/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowLeft, Users, Mail } from 'lucide-react';

interface UserData {
  role: string;
  organization: {
    name: string;
  };
}

const AccessDenied: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ v3.0.0: Use new auth hooks
  const user = useUser();
  const { mutate: signOut } = useSignOut();

  // Get required role from navigation state, default to 'Admin'
  const requiredRole = (location.state as any)?.requiredRole || 'Admin';

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
          .eq('status', 'Active') //membership_status
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

  const getRoleDescription = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'Full access to all features and settings';
      case 'admin':
        return 'Manage users, quotes, and organization settings';
      case 'member':
        return 'Create and manage quotes';
      default:
        return 'Standard access';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-2xl text-slate-800">
              Access Denied
            </CardTitle>
            <CardDescription className="text-base text-slate-600 mt-2">
              You don't have permission to access this feature
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current Role Info */}
          {userData && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-800">
                    {(userData as any).organizations?.name}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Your Role:</span>
                  <span className="font-medium text-slate-800">{userData.role}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {getRoleDescription(userData.role)}
                </p>

                <hr className="my-2" />

                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Required:</span>
                  <span className="font-medium text-red-600">{requiredRole}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {getRoleDescription(requiredRole)}
                </p>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-slate-700">
                  To access this feature, you'll need <strong>{requiredRole}</strong> permissions.
                  Please contact your organization administrator to request a role upgrade.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleGoBack}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>

            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full"
            >
              Sign Out
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-slate-500">
              If you believe this is an error, please contact your organization administrator
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;
