import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageContent, ContentCard } from "@/components/common/layout";
import { Card, CardContent } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  FileText,
  Target,
} from "lucide-react";
import { useQuotesStore } from "@/stores/quotes/quotesStore";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useUserProfile } from "@/hooks/useUserProfile";
import { AnalyticsPageCharts } from "@/components/common/charts/AnalyticsPageCharts";

/**
 * Streamlined Analytics using AppLayout
 *
 * This demonstrates the new unified approach:
 * - AppLayout handles authentication, layout, sidebar automatically
 * - ContentCard provides consistent card styling
 * - Focus only on analytics-specific content
 */
const Analytics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const quotes = useQuotesStore((state) => state.quotes);
  const quotesLoading = useQuotesStore((state) => state.isLoading);
  const isInitialized = useQuotesStore((state) => state.isInitialized);
  const initialize = useQuotesStore((state) => state.initialize);
  // const { currentOrganization, loading: organizationsLoading } = useOrganizations();
  const { profile } = useUserProfile(user?.id);

  // Get current user for analytics data
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };
    getCurrentUser();
  }, []);

  // Initialize quotes store
  useEffect(() => {
    if (user && !isInitialized) {
      console.log('🔑 Analytics: User authenticated, initializing quotes store...');
      initialize();
    }
  }, [user, isInitialized, initialize]);

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

  const averageRevenuePerQuote = wonQuotes > 0 ? totalRevenue / wonQuotes : 0;
  const conversionRate = totalQuotes > 0 ? (wonQuotes / (wonQuotes + rejectedQuotes)) * 100 : 0;

  return (
    <PageContent title="Analytics" subtitle="Track your business performance and quote insights" showPageHeader={true}>
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="relative overflow-hidden bg-gradient-to-br from-[var(--brand-primary)] to-blue-600 border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 group">
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

        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 group">
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

        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
          <CardContent className="relative p-6 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-purple-100 text-xs font-medium">Avg Revenue/Quote</p>
                <p className="text-2xl font-bold truncate">${Math.round(averageRevenuePerQuote).toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Target className="w-3 h-3 text-purple-200" />
                  <span className="text-xs text-purple-200 font-medium">Won quotes</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-300 flex-shrink-0">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-[var(--brand-secondary)] to-yellow-600 border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
          <CardContent className="relative p-6 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-yellow-100 text-xs font-medium">Conversion Rate</p>
                <p className="text-2xl font-bold truncate">{Math.round(conversionRate)}%</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-3 h-3 text-yellow-200" />
                  <span className="text-xs text-yellow-200 font-medium">Win/Loss ratio</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-300 flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <ContentCard title="Quote Analytics" subtitle="Visual representation of your quote data">
        {quotesLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted">Loading analytics data...</p>
          </div>
        ) : quotes.length > 0 ? (
          <AnalyticsPageCharts quotes={quotes} />
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted mx-auto mb-4 opacity-50" />
            <p className="text-muted mb-4">No quotes data available</p>
            <p className="text-sm text-muted">Create some quotes to see analytics</p>
          </div>
        )}
      </ContentCard>
    </PageContent>
  );
};

export default Analytics;