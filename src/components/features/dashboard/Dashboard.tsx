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
import { AppSidebar } from "@/components/common/layout";

import { useOrganizations } from "@/hooks/useOrganizations";
import { useQuotes } from "@/hooks/useQuotes";
import { useUserProfile } from "@/hooks/useUserProfile";
import { AnalyticsCharts } from "@/components/common/charts/AnalyticsCharts";


interface DashboardProps {
  user: string;
  userId: string;
  onLogout: () => void;
}

const Dashboard = ({ user, userId, onLogout }: DashboardProps) => {
  
  const { quotes } = useQuotes();
  const {
    currentOrganization,
    members,
    currentUserRole
  } = useOrganizations();
  const { profile } = useUserProfile(userId);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar user={user} onLogout={onLogout} />
        
        <main className="flex-1 flex flex-col">
          {/* Floating Header */}
          <div className="p-6 pb-0">
            <header className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-large rounded-[22px] px-6 py-4 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <div className="flex-1" />
                <div className="flex items-center justify-center gap-2">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium text-lg bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    {currentOrganization?.name || 'Loading...'}
                  </span>
                </div>
                <div className="flex items-center gap-4 flex-1 justify-end">
                  {/* <Button variant="ghost" size="sm" className="btn-floating">
                    <Mail className="w-4 h-4" />
                  </Button> */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{currentUserRole}</p>
                    </div>
                  </div>
                </div>
              </div>
            </header>
          </div>

          {/* Main Dashboard Content */}
          <div className="flex-1 p-6 pt-3 space-y-6">
            {/* Dashboard Header */}
            <div className="flex items-center justify-between animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
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
            <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <AnalyticsCharts quotes={quotes} />
            </div>

          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;