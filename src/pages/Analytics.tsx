import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar, HeaderNav } from "@/components/common/layout";
import { 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Target,
  Building2,
  User,
} from "lucide-react";
import { useQuotes } from "@/hooks/useQuotes";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useUserProfile } from "@/hooks/useUserProfile";
import { AnalyticsPageCharts } from "@/components/common/charts/AnalyticsPageCharts";

const Analytics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const { quotes, loading: quotesLoading } = useQuotes();
  const { currentOrganization, loading: organizationsLoading } = useOrganizations();
  const { profile } = useUserProfile(user?.id);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };
  const parseCurrency = (formatted: string | number): number => {
    if (typeof formatted === 'number') return formatted;
    return Number(formatted.toString().replace(/[^0-9.-]+/g, ''));
  };

  // Calculate metrics
  const totalQuotes = quotes.length;
  const totalRevenue = quotes.reduce((sum, quote) => {
    const total = quote.price_details?.final_selling_price || 0;
    
    // Only add if job is won
    if (quote.status === 'Won') {
      return sum + parseCurrency(total);
    }
    return sum;
  }, 0);

  const wonQuotes = quotes.filter(q => q.status === 'Won').length;
  const rejectedQuotes = quotes.filter(q => q.status === 'Rejected').length;
  // const pendingQuotes = quotes.filter(q => q.status === 'Pending').length;
  // const draftQuotes = quotes.filter(q => q.status === 'Draft').length;
  
  const averageRevenuePerQuote = wonQuotes > 0 ? totalRevenue / wonQuotes : 0;
  const conversionRate = totalQuotes > 0 ? (wonQuotes / (wonQuotes + rejectedQuotes)) * 100 : 0;

  // Single loading check pattern - prevents flash by always maintaining layout
  if (!user || quotesLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
          <AppSidebar user={user?.email || ""} onLogout={handleLogout} />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
        <AppSidebar user={user.email || ""} onLogout={handleLogout} />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header Nav Bar */}
          <HeaderNav 
            user={user.email || ""} 
            userProfile={profile as any}
            organizationName={currentOrganization?.name || 'Loading...'}
            onLogout={handleLogout} 
          />

          {/* Analytics Content */}
          <div className="flex-1 p-6 space-y-8 overflow-y-auto">
            {/* Page Header */}
            {/* <div className=" text-center">
              <h1 className="text-5xl font-black bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">
                Analytics Dashboard
              </h1>
              <p className="text-slate-600 text-xl font-medium">Comprehensive insights into your business performance</p>
            </div> */}

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 ">
              <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-2xl hover:shadow-3xl transition-shadow duration-300 group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <CardContent className="relative p-6 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-blue-100 text-xs font-medium">Total Revenue</p>
                      <p className="text-2xl font-bold truncate">${totalRevenue.toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-3 h-3 text-blue-200" />
                        <span className="text-xs text-blue-200 font-medium">Won quotes only</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-300 flex-shrink-0">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 shadow-2xl hover:shadow-3xl transition-shadow duration-300 group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <CardContent className="relative p-6 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-emerald-100 text-xs font-medium">Total Quotes</p>
                      <p className="text-2xl font-bold truncate">{totalQuotes}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <FileText className="w-3 h-3 text-emerald-200" />
                        <span className="text-xs text-emerald-200 font-medium">All status</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-300 flex-shrink-0">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-2xl hover:shadow-3xl transition-shadow duration-300 group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <CardContent className="relative p-6 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-purple-100 text-xs font-medium">Avg Revenue/Quote</p>
                      <p className="text-2xl font-bold truncate">${Math.round(averageRevenuePerQuote).toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Target className="w-3 h-3 text-purple-200" />
                        <span className="text-xs text-purple-200 font-medium">Won only</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-300 flex-shrink-0">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500 border-0 shadow-2xl hover:shadow-3xl transition-shadow duration-300 group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <CardContent className="relative p-6 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-orange-100 text-xs font-medium">Conversion Rate</p>
                      <p className="text-2xl font-bold truncate">{conversionRate.toFixed(1)}%</p>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-3 h-3 text-orange-200" />
                        <span className="text-xs text-orange-200 font-medium">Won/Total</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-300 flex-shrink-0">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart.js Analytics */}
            <div className="">
              {currentOrganization ? (
                <AnalyticsPageCharts quotes={quotes} organization={currentOrganization} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-600">Loading analytics...</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Analytics;