import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { 
  Building2, 
  FileText, 
  TrendingUp, 
  Calendar, 
  User,
  Mail,
  Users,
  Shield
} from "lucide-react";
import { AppSidebar, HeaderNav } from "@/components/common/layout";

import { useOrganizations } from "@/hooks/useOrganizations";
import { useQuotes, useQuotesLoading, useQuotesStore } from "@/stores/quotes/quotesStore";
import { useUserProfile } from "@/hooks/useUserProfile";
import { AnalyticsCharts } from "@/components/common/charts/AnalyticsCharts";
import { useEffect } from "react";


interface DashboardProps {
  user: string;
  userId: string;
  onLogout: () => void;
}

const Dashboard = ({ user, userId, onLogout }: DashboardProps) => {
  
  const quotes = useQuotes();
  const quotesLoading = useQuotesLoading();
  const isInitialized = useQuotesStore((state) => state.isInitialized);
  const initialize = useQuotesStore((state) => state.initialize);
  
  const {
    currentOrganization,
    members,
    currentUserRole,
    loading: organizationsLoading
  } = useOrganizations();
  const { profile } = useUserProfile(userId);

  // Initialize quotes store if not already initialized
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Single loading check pattern - prevents flash by always maintaining layout
  // Only show loading if we don't have any data yet (prevents flash on navigation)
  if ((!isInitialized || (quotesLoading && quotes.length === 0)) || (organizationsLoading && !currentOrganization)) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full" style={{backgroundColor: "#f7f2e9"}}>
          <AppSidebar user={user} onLogout={onLogout} />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{backgroundColor: "#f7f2e9"}}>
        <AppSidebar user={user} onLogout={onLogout} />
        
        <main className="flex-1 flex flex-col">
          {/* Header Nav Bar */}
          <HeaderNav 
            user={user} 
            userProfile={profile as any}
            organizationName={currentOrganization?.name || 'Loading...'}
            onLogout={onLogout} 
          />

          {/* Main Dashboard Content */}
          <div className="flex-1 p-6 space-y-6">
            {/* Dashboard Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold" style={{color: "#1b2169"}}>
                  Dashboard
                </h1>
                <p className="mt-2 text-lg" style={{color: "#a3adc2"}}>Plan, prioritize, and accomplish your tasks with ease.</p>
              </div>
              <div className="flex gap-3">
              </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm" style={{color: "#a3adc2"}}>Total Quotes</p>
                      <p className="text-3xl font-bold" style={{color: "#1b2169"}}>{quotes.length}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-3 h-3" style={{color: "#4164df"}} />
                        <span className="text-xs" style={{color: "#a3adc2"}}>All time</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{backgroundColor: "#4164df20"}}>
                      <FileText className="w-6 h-6" style={{color: "#4164df"}} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm" style={{color: "#a3adc2"}}>Active Members</p>
                      <p className="text-3xl font-bold" style={{color: "#1b2169"}}>{members.filter(m => m.status === 'active').length}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Users className="w-3 h-3" style={{color: "#3565f7"}} />
                        <span className="text-xs" style={{color: "#a3adc2"}}>In organization</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{backgroundColor: "#3565f720"}}>
                      <Users className="w-6 h-6" style={{color: "#3565f7"}} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm" style={{color: "#a3adc2"}}>This Month</p>
                      <p className="text-3xl font-bold" style={{color: "#1b2169"}}>{quotes.filter(q => new Date(q.created_at).getMonth() === new Date().getMonth()).length}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Calendar className="w-3 h-3" style={{color: "#e98135"}} />
                        <span className="text-xs" style={{color: "#a3adc2"}}>New quotes</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{backgroundColor: "#e9813520"}}>
                      <Calendar className="w-6 h-6" style={{color: "#e98135"}} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm" style={{color: "#a3adc2"}}>Your Role</p>
                      <p className="text-lg font-semibold capitalize" style={{color: "#1b2169"}}>{currentUserRole}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Building2 className="w-3 h-3" style={{color: "#a3adc2"}} />
                        <span className="text-xs" style={{color: "#a3adc2"}}>Organization</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{backgroundColor: "#da987220"}}>
                      {currentUserRole === 'admin' && <Shield className="w-6 h-6" style={{color: "#da9872"}} />}
                      {currentUserRole === 'member' && <User className="w-6 h-6" style={{color: "#da9872"}} />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analytics Section */}
            <div>
              <AnalyticsCharts quotes={quotes} />
            </div>

          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;