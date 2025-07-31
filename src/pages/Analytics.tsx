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
  Timer, 
  Target,
  PieChart,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  User,
  Mail
} from "lucide-react";
import { useQuotes } from "@/hooks/useQuotes";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useUserProfile } from "@/hooks/useUserProfile";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { max } from "date-fns";

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
  const parseCurrency = (formatted: string): number => {
    return Number(formatted.replace(/[^0-9.-]+/g, ''));
  };

  // Calculate metrics
  const totalQuotes = quotes.length;
  const totalRevenue = quotes.reduce((sum, quote) => {
    const total = quote.price_details?.total || 0;
  
    // Only add if job is won
    if (quote.status === 'Won') {
      return sum + parseCurrency(total);
    }

    return sum;
  }, 0);

  


  const wonQuotes = quotes.filter(q => q.status === 'Won').length;
  const averageRevenuePerQuote = wonQuotes > 0 ? totalRevenue / wonQuotes : 0;
  const conversionRate = totalQuotes > 0 ? (wonQuotes / totalQuotes) * 100 : 0;

  // Generate monthly data for charts
  const generateMonthlyRevenueData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const monthQuotes = quotes.filter(quote => {
        const quoteDate = new Date(quote.created_at);
        return quoteDate.getFullYear() === currentYear && quoteDate.getMonth() === index;
      });
      
      const parseCurrency = (formatted: string): number => {
        return Number(formatted.replace(/[^0-9.-]+/g, ''));
      };

      const monthlyValue = monthQuotes.reduce((sum, quote) => {
        if (quote.status !== 'Won') return sum;

        const total = quote.price_details?.total || 0;
        if (typeof total === 'string') {
          return sum + parseCurrency(total);
        } else if (typeof total === 'number') {
          return sum + total;
        } else {
          return sum;
        }
      }, 0);

      return {
        month,
        value: monthlyValue, // total revenue from won quotes only
        count: monthQuotes.length, // total quotes that month
        won: monthQuotes.filter(q => q.status === 'Won').length // how many were won
      };
    });
  };

  const monthlyData = generateMonthlyRevenueData();

  // Status distribution data
  const statusData = [
    { name: 'Draft', value: quotes.filter(q => q.status === 'Draft').length, color: '#94a3b8' },
    { name: 'Pending', value: quotes.filter(q => q.status === 'Completed').length, color: '#fbbf24' },
    { name: 'Won', value: quotes.filter(q => q.status === 'Won').length, color: '#10b981' },
    { name: 'Rejected', value: quotes.filter(q => q.status === 'Rejected').length, color: '#ef4444' },
  ];

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-slate-100">
        <AppSidebar user={user.email || ""} onLogout={handleLogout} />
        
        <main className="flex-1 flex flex-col">
          {/* Floating Header */}
          <div className="p-6 pb-0">
            <header className="bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-lg rounded-[22px] px-6 py-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex-1" />
                <div className="flex items-center justify-center gap-2">
                  <Building2 className="w-5 h-5" />
                  <span className="font-medium text-lg">{currentOrganization?.name || 'Loading...'}</span>
                </div>
                <div className="flex items-center gap-4 flex-1 justify-end">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{profile?.full_name || user.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            </header>
          </div>

          {/* Analytics Content */}
          <div className="flex-1 p-6 pt-3 space-y-8">
            {/* Page Header */}
            <div className="animate-fade-in">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="text-slate-600 mt-2 text-lg">Comprehensive insights into your business performance</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover-scale transition-all duration-300 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Total Revenue</p>
                      <p className="text-3xl font-bold text-blue-900">${totalRevenue.toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-2">
                        {/* <ArrowUpRight className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">+12.5%</span> */}
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 hover-scale transition-all duration-300 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-700">Total Quotes</p>
                      <p className="text-3xl font-bold text-emerald-900">{totalQuotes}</p>
                      <div className="flex items-center gap-1 mt-2">
                        {/* <ArrowUpRight className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">+8.2%</span> */}
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover-scale transition-all duration-300 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Average Revenue per Quote</p>
                      <p className="text-3xl font-bold text-purple-900">${averageRevenuePerQuote.toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-2">
                        {/* <ArrowUpRight className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">+3.8%</span> */}
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover-scale transition-all duration-300 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-700">Conversion Rate</p>
                      <p className="text-3xl font-bold text-amber-900">{conversionRate.toFixed(1)}%</p>
                      <div className="flex items-center gap-1 mt-2">
                        {/* <ArrowDownRight className="w-4 h-4 text-red-600" />
                        <span className="text-xs text-red-600 font-medium">-2.1%</span> */}
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Trend */}
              <Card className="lg:col-span-2 animate-fade-in hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Monthly Revenue ({new Date().getFullYear()})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" stroke="#64748b" />
                        <YAxis stroke="#64748b" tickFormatter={(value) => `$${value.toLocaleString()}`} width={80}/>
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          fill="url(#colorRevenue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Quote Status Distribution */}
              <Card className="animate-fade-in hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-600" />
                    Quote Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={1}
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {statusData.map((status, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="text-xs text-slate-600">{status.name} ({status.value})</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Performance */}
            <Card className="animate-fade-in hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  Monthly Quote Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#64748b" />
                      <YAxis stroke="#64748b" domain={[0, 'dataMax + 5']} ticks={[0, 3, 6, 9, 12, 15]} />
                      <Bar 
                        dataKey="count" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]}
                        className="hover:opacity-80 transition-opacity duration-200"
                      />
                      <Bar 
                        dataKey="won" 
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]}
                        className="hover:opacity-80 transition-opacity duration-200"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Analytics;