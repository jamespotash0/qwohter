import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  FileText,
  TrendingUp,
  Calendar,
  Users,
  Plus,
  MoreHorizontal,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/common/layout";

import { useOrganizations } from "@/hooks/useOrganizations";
import { useQuotesStore } from "@/stores/quotes/quotesStore";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface DashboardProps {
  user: string;
  userId: string;
  onLogout: () => void;
}

const ModernDashboard = ({ user, userId, onLogout }: DashboardProps) => {
  const navigate = useNavigate();
  const quotes = useQuotesStore((state) => state.quotes);
  const quotesLoading = useQuotesStore((state) => state.isLoading);
  const isInitialized = useQuotesStore((state) => state.isInitialized);
  const initialize = useQuotesStore((state) => state.initialize);

  const {
    currentOrganization,
    members,
    currentUserRole,
    loading: organizationsLoading
  } = useOrganizations();
  const { profile } = useUserProfile(userId);

  // Initialize quotes store only once when user is available
  useEffect(() => {
    if (userId && !isInitialized) {
      console.log('🔑 Dashboard: User authenticated, initializing quotes store...');
      initialize();
    }
  }, [userId, isInitialized]);

  // Calculate stats
  const thisMonth = quotes.filter(q =>
    new Date(q.created_at).getMonth() === new Date().getMonth() &&
    new Date(q.created_at).getFullYear() === new Date().getFullYear()
  ).length;

  const recentQuotes = quotes.slice(0, 5);
  const activeMembers = members.filter(m => m.status === 'Active').length;

  if ((quotesLoading && quotes.length === 0) || (organizationsLoading && !currentOrganization)) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-bg-primary">
          <AppSidebar user={user} onLogout={onLogout} />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-text-secondary">Loading dashboard...</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-bg-primary">
        <AppSidebar user={user} onLogout={onLogout} />

        <main className="flex-1 flex flex-col">
          {/* Main Dashboard Content */}
          <div className="flex-1 p-8 space-y-8">
            {/* Dashboard Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-text-primary">
                  Dashboard
                </h1>
                <p className="mt-2 text-lg text-text-secondary">
                  Welcome back, {profile?.full_name || user}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-text-muted">Today</p>
                  <p className="text-sm font-medium text-text-secondary">
                    {new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/quotes/new')}
                  className="bg-accent-primary hover:bg-primary text-white shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Quote
                </Button>
              </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Quotes */}
              <Card className="bg-card border border-border-primary shadow-sm hover:shadow-md transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-secondary font-medium">Total Quotes</p>
                      <p className="text-3xl font-bold text-text-primary mt-1">{quotes.length}</p>
                      <div className="flex items-center gap-1 mt-3">
                        <TrendingUp className="w-4 h-4 text-success" />
                        <span className="text-sm text-success font-medium">All time</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-accent-primary/10 group-hover:bg-accent-primary/20 transition-colors">
                      <FileText className="w-6 h-6 text-accent-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* This Month */}
              <Card className="bg-card border border-border-primary shadow-sm hover:shadow-md transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-secondary font-medium">This Month</p>
                      <p className="text-3xl font-bold text-text-primary mt-1">{thisMonth}</p>
                      <div className="flex items-center gap-1 mt-3">
                        <Calendar className="w-4 h-4 text-accent-secondary" />
                        <span className="text-sm text-accent-secondary font-medium">New quotes</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-accent-secondary/10 group-hover:bg-accent-secondary/20 transition-colors">
                      <Calendar className="w-6 h-6 text-accent-secondary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Team Members */}
              <Card className="bg-card border border-border-primary shadow-sm hover:shadow-md transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-secondary font-medium">Team Members</p>
                      <p className="text-3xl font-bold text-text-primary mt-1">{activeMembers}</p>
                      <div className="flex items-center gap-1 mt-3">
                        <Users className="w-4 h-4 text-accent-primary" />
                        <span className="text-sm text-text-muted font-medium">Active</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-accent-primary/10 group-hover:bg-accent-primary/20 transition-colors">
                      <Users className="w-6 h-6 text-accent-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Organization */}
              <Card className="bg-card border border-border-primary shadow-sm hover:shadow-md transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-secondary font-medium">Your Role</p>
                      <p className="text-xl font-bold text-text-primary mt-1 capitalize">
                        {currentUserRole || 'Member'}
                      </p>
                      <div className="flex items-center gap-1 mt-3">
                        <div className="w-2 h-2 rounded-full bg-success"></div>
                        <span className="text-sm text-text-muted font-medium">Active</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-success/10 group-hover:bg-success/20 transition-colors">
                      <Users className="w-6 h-6 text-success" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Quotes */}
              <div className="lg:col-span-2">
                <Card className="bg-card border border-border-primary shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-semibold text-text-primary">
                        Recent Quotes
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/quotes')}
                        className="text-text-muted hover:text-text-primary"
                      >
                        View all
                        <ArrowUpRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recentQuotes.length > 0 ? (
                      recentQuotes.map((quote) => (
                        <div key={quote.id} className="flex items-center justify-between p-4 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition-colors group cursor-pointer"
                             onClick={() => navigate(`/quotes/${quote.id}/edit`)}>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-accent-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-text-primary group-hover:text-accent-primary transition-colors">
                                {(quote.quote_details as any)?.contactName || 'Untitled Quote'}
                              </p>
                              <p className="text-sm text-text-muted">
                                {new Date(quote.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              quote.status === 'draft'
                                ? 'bg-warning/10 text-warning'
                                : quote.status === 'sent'
                                ? 'bg-accent-primary/10 text-accent-primary'
                                : 'bg-success/10 text-success'
                            }`}>
                              {quote.status}
                            </span>
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-text-muted mx-auto mb-4 opacity-50" />
                        <p className="text-text-muted">No quotes yet</p>
                        <Button
                          onClick={() => navigate('/quotes/new')}
                          className="mt-4 bg-accent-primary hover:bg-primary text-white"
                        >
                          Create your first quote
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div>
                <Card className="bg-card border border-border-primary shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-text-primary">
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={() => navigate('/quotes/new')}
                      className="w-full bg-accent-primary hover:bg-primary text-white justify-start h-12"
                    >
                      <Plus className="h-5 w-5 mr-3" />
                      Create New Quote
                    </Button>

                    <Button
                      onClick={() => navigate('/team')}
                      variant="outline"
                      className="w-full justify-start h-12 border-border-primary hover:bg-bg-secondary"
                    >
                      <Users className="h-5 w-5 mr-3" />
                      Manage Team
                    </Button>

                    <Button
                      onClick={() => navigate('/analytics')}
                      variant="outline"
                      className="w-full justify-start h-12 border-border-primary hover:bg-bg-secondary"
                    >
                      <TrendingUp className="h-5 w-5 mr-3" />
                      View Analytics
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default ModernDashboard;