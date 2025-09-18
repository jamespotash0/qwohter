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
        <div className="min-h-screen flex w-full bg-background">
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
      <div className="min-h-screen flex w-full bg-background">
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
                <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">Plan, prioritize, and accomplish your tasks with ease.</p>
              </div>
              <div className="flex gap-3">
              </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="card-elevated hover:shadow-medium transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Quotes</p>
                      <p className="text-3xl font-bold text-foreground">{quotes.length}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-3 h-3 text-primary" />
                        <span className="text-xs text-muted-foreground">All time</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-elevated hover:shadow-medium transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Members</p>
                      <p className="text-3xl font-bold text-foreground">{members.filter(m => m.status === 'active').length}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Users className="w-3 h-3 text-accent" />
                        <span className="text-xs text-muted-foreground">In organization</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-elevated hover:shadow-medium transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">This Month</p>
                      <p className="text-3xl font-bold text-foreground">{quotes.filter(q => new Date(q.created_at).getMonth() === new Date().getMonth()).length}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Calendar className="w-3 h-3 text-secondary-foreground" />
                        <span className="text-xs text-muted-foreground">New quotes</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-secondary/50 rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-secondary-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-elevated hover:shadow-medium transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Your Role</p>
                      <p className="text-lg font-semibold text-foreground capitalize">{currentUserRole}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Building2 className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Organization</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-secondary/50 rounded-xl flex items-center justify-center">
                      {currentUserRole === 'admin' && <Shield className="w-6 h-6 text-blue-500" />}
                      {currentUserRole === 'member' && <User className="w-6 h-6 text-muted-foreground" />}
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