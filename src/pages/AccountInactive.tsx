import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/auth";
import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, LogOut, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AccountInactive = () => {
  const navigate = useNavigate();
  const user = useUser();

  // Get current organization and role from React Query
  const { organization: currentOrganization, role: currentUserRole } = useCurrentOrganization(user?.id || '');

  useEffect(() => {
    // If user becomes active again, redirect to dashboard
    if (currentUserRole && currentUserRole !== null) {
      navigate("/");
    }
  }, [currentUserRole, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleContactSupport = () => {
    // You can customize this to open email client or a support form
    window.location.href = `mailto:support@${currentOrganization?.name || 'organization'}.com?subject=Account Reactivation Request`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Account Inactive</CardTitle>
            <CardDescription className="mt-2">
              Your account has been deactivated
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Your access to <strong>{currentOrganization?.name || "this organization"}</strong> has been removed by an administrator.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              If you believe this is a mistake, please contact your organization owner or administrator to request reactivation.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleContactSupport}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Mail className="w-4 h-4 mr-2" />
              Contact Support
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {user?.email && (
            <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-2 border-t">
              Signed in as: {user.email}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountInactive;
