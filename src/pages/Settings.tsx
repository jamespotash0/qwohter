import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContent } from "@/components/common/layout";
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
  const { organization, fetchOrganization: refetchOrganization } = useOrganizationSettings();
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

  // Loading state for settings
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted">Loading settings...</p>
        </div>
      </div>
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
    <PageContent title="Settings" subtitle="Manage your profile, organization, and permissions" showPageHeader={true}>
      <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-[var(--content-card-border)] px-6 pt-6">
              <TabsList className="grid w-full max-w-md grid-cols-3 bg-[var(--content-bg)] p-1">
                {availableTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-2 data-[state=active]:bg-[var(--sidebar-nav-bg-active)] data-[state=active]:text-[var(--sidebar-nav-text-active)] data-[state=active]:shadow-sm"
                    style={{
                      borderRadius: 'var(--sidebar-nav-border-radius)'
                    }}
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
    </PageContent>
  );
};

export default Settings;