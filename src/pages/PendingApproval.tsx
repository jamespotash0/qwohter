/**
 * Pending Approval Page
 *
 * Shows when user has joined an organization but is waiting for admin approval
 */

import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Users, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth/authStore';

interface MembershipData {
  role: string;
  status: string;
  organization_id: string;
  created_at: string;
  organizations: {
    name: string;
    organization_code: string;
  };
}

const PendingApproval: React.FC = () => {
  const [membershipData, setMembershipData] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const signOut = useAuthStore((state) => state.signOut);

  const checkMembershipStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('memberships')
        .select(`
          role,
          status,
          organization_id,
          created_at,
          organizations (
            name,
            organization_code
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error checking membership:', error);
        setLoading(false);
        return;
      }

      setMembershipData(data as any);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkMembershipStatus();
    toast({
      title: "Status Updated",
      description: "Membership status has been refreshed",
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/sign-in');
  };

  useEffect(() => {
    checkMembershipStatus();
  }, []);

  // Redirect if membership is now active
  if (membershipData?.status === 'Active') {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect to auth if no membership found
  if (!loading && !membershipData) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-slate-100 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-orange-600" />
          <span className="text-slate-700">Checking status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
          <div>
            <CardTitle className="text-2xl text-slate-800">
              Waiting for Approval
            </CardTitle>
            <CardDescription className="text-base text-slate-600 mt-2">
              Your request to join the organization is pending administrator approval
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Organization Info */}
          {membershipData && (
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-800">
                    {(membershipData as any).organizations?.name}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="text-center">
            <p className="text-sm text-slate-600">
              An administrator will review your request and approve or deny your access to the organization.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {refreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking Status...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Status
                </>
              )}
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

export default PendingApproval;