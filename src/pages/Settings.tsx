import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/common/layout";
import { User as UserIcon, Building, Key, Settings as SettingsIcon } from "lucide-react";
import { useOrganizationSettings } from "@/hooks/useCompanySettings";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useMembership } from "@/hooks/useMembership";
import { ProfileTab } from "@/components/features/settings/ProfileTab";
import { OrganizationTab } from "@/components/features/settings/OrganizationTab";
import { PermissionsTab } from "@/components/features/settings/PermissionsTab";
import { canAccessSettingsTab } from "@/utils/permissions";

const Settings = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const navigate = useNavigate();
  const { organization, refetch: refetchOrganization } = useOrganizationSettings();
  const { profile } = useUserProfile(user?.id);
  const { currentMembership } = useMembership();
  const userRole = currentMembership?.role;

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Single loading check pattern - prevents flash by always maintaining layout
  if (!user) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-bg-primary">
          <AppSidebar user="" onLogout={handleLogout} />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading settings...</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }


  const availableTabs = [
    {
      id: "profile",
      label: "Profile",
      icon: <UserIcon className="w-4 h-4" />,
      component: <ProfileTab user={user} profile={profile} userRole={userRole || 'Member'} />
    },
    {
      id: "organization",
      label: "Organization",
      icon: <Building className="w-4 h-4" />,
      component: <OrganizationTab
        organization={organization}
        userRole={userRole || 'Member'}
        onOrganizationUpdate={refetchOrganization}
      />,
      requiresPermission: "organization"
    },
    {
      id: "permissions",
      label: "Permissions",
      icon: <Key className="w-4 h-4" />,
      component: <PermissionsTab userRole={userRole || 'Member'} />,
      requiresPermission: "permissions"
    }
  ].filter(tab => !tab.requiresPermission || canAccessSettingsTab(tab.requiresPermission, userRole || 'Member'));

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-bg-primary">
        <AppSidebar user={user.email || user.id} onLogout={handleLogout} />

        <main className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 pb-0">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-8 h-8 text-gray-700" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600">Manage your profile, organization, and permissions</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 pt-4">
            <Card className="card-elevated">
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="border-b border-gray-200 px-6 pt-6">
                    <TabsList className="grid w-full max-w-md grid-cols-3">
                      {availableTabs.map((tab) => (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className="flex items-center gap-2"
                        >
                          {tab.icon}
                          {tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  <div className="p-6">
                    {availableTabs.map((tab) => (
                      <TabsContent key={tab.id} value={tab.id} className="mt-0">
                        {tab.component}
                      </TabsContent>
                    ))}
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Settings;