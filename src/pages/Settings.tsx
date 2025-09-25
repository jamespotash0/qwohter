import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/common/layout";
import { CompanySettingsSection } from "@/components/features/settings/CompanySettingsSection";
import { useOrganizationSettings } from "@/hooks/useCompanySettings";
import { useUserProfile } from "@/hooks/useUserProfile";

const Settings = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { organization } = useOrganizationSettings();
  const { profile } = useUserProfile(user?.id);

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

  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-bg-primary">
        <AppSidebar user={user.email || user.id} onLogout={handleLogout} />
        
        <main className="flex-1 flex flex-col">
          {/* Organization Header */}
          <div className="p-6 pb-0">
            <div className="flex items-center justify-center">
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 pt-4 space-y-6">
            {/* Company Information Section */}
            <Card className="card-elevated">
              <CardHeader className="pb-4">
              </CardHeader>
              <CardContent>
                <CompanySettingsSection />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Settings;