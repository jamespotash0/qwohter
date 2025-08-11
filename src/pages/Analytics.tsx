import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Target,
  Building2,
  User,
  Zap,
  Activity
} from "lucide-react";
import { useQuotes } from "@/hooks/useQuotes";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useUserProfile } from "@/hooks/useUserProfile";
import { AnalyticsPageCharts } from "@/components/AnalyticsPageCharts";

const Analytics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const { quotes } = useQuotes();
  const { currentOrganization } = useOrganizations();
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
    const total = quote.price_details?.total || quote.price_details?.basePrice || quote.price_details?.base_price || 0;
    
    // Only add if job is won
    if (quote.status === 'Won') {
      return sum + parseCurrency(total);
    }
    return sum;
  }, 0);

  const wonQuotes = quotes.filter(q => q.status === 'Won').length;
  const rejectedQuotes = quotes.filter(q => q.status === 'Rejected').length;
  const pendingQuotes = quotes.filter(q => q.status === 'Pending').length;
  const draftQuotes = quotes.filter(q => q.status === 'Draft').length;
  
  const averageRevenuePerQuote = wonQuotes > 0 ? totalRevenue / wonQuotes : 0;
  const conversionRate = totalQuotes > 0 ? (wonQuotes / (wonQuotes + rejectedQuotes)) * 100 : 0;

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
        <AppSidebar user={user.email || ""} onLogout={handleLogout} />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Floating Header */}
          <div className="p-6 pb-0">
            <header className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl px-8 py-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex-1" />
                <div className="flex items-center justify-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-xl bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    {currentOrganization?.name || 'Loading...'}
                  </span>
                </div>
                <div className="flex items-center gap-4 flex-1 justify-end">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center shadow-inner">
                      <User className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">{profile?.full_name || user.email}</p>
                      <p className="text-xs text-slate-500">Analytics Dashboard</p>
                    </div>
                  </div>
                </div>
              </div>
            </header>
          </div>

          {/* Analytics Content */}
          <div className="flex-1 p-6 pt-4 space-y-8 overflow-y-auto">
            {/* Page Header */}
            {/* <div className="animate-fade-in text-center">
              <h1 className="text-5xl font-black bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">
                Analytics Dashboard
              </h1>
              <p className="text-slate-600 text-xl font-medium">Comprehensive insights into your business performance</p>
            </div> */}

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
              <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-2xl hover:shadow-3xl transition-shadow duration-300 group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <CardContent className="relative p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Revenue</p>
                      <p className="text-3xl font-black">${totalRevenue.toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-4 h-4 text-blue-200" />
                        <span className="text-xs text-blue-200 font-medium">Won quotes only</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-300">
                      <DollarSign className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 shadow-2xl hover:shadow-3xl transition-shadow duration-300 group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <CardContent className="relative p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">Total Quotes</p>
                      <p className="text-3xl font-black">{totalQuotes}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <FileText className="w-4 h-4 text-emerald-200" />
                        <span className="text-xs text-emerald-200 font-medium">All status</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-300">
                      <FileText className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-2xl hover:shadow-3xl transition-shadow duration-300 group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <CardContent className="relative p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Avg Revenue/Quote</p>
                      <p className="text-3xl font-black">${Math.round(averageRevenuePerQuote).toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Target className="w-4 h-4 text-purple-200" />
                        <span className="text-xs text-purple-200 font-medium">Won only</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-300">
                      <Target className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500 border-0 shadow-2xl hover:shadow-3xl transition-shadow duration-300 group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <CardContent className="relative p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Conversion Rate</p>
                      <p className="text-3xl font-black">{conversionRate.toFixed(1)}%</p>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-4 h-4 text-orange-200" />
                        <span className="text-xs text-orange-200 font-medium">Won/Total</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-300">
                      <TrendingUp className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart.js Analytics */}
            <div className="animate-fade-in">
              <AnalyticsPageCharts quotes={quotes} />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Analytics;