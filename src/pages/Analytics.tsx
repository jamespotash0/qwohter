import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageContent } from "@/components/common/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  FileText,
  Target,
  Users,
  Calendar,
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
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');
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

  // Calculate metrics based on view mode
  const metrics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Filter quotes based on view mode - use won_date for won quotes, created_at for others
    const filteredQuotes = viewMode === 'monthly'
      ? quotes.filter(q => {
          // For won/completed quotes, use won_date; otherwise use created_at
          const dateToCheck = (q.status === 'Won' || q.status === 'Completed') && q.won_date
            ? new Date(q.won_date)
            : new Date(q.created_at);
          return dateToCheck.getFullYear() === currentYear && dateToCheck.getMonth() === currentMonth;
        })
      : quotes.filter(q => {
          // For won/completed quotes, use won_date; otherwise use created_at
          const dateToCheck = (q.status === 'Won' || q.status === 'Completed') && q.won_date
            ? new Date(q.won_date)
            : new Date(q.created_at);
          return dateToCheck.getFullYear() === currentYear;
        });

    // Quotes by user
    const quotesByUser: Record<string, number> = {};
    filteredQuotes.forEach(q => {
      const userName = q.creator_name || 'Unknown';
      quotesByUser[userName] = (quotesByUser[userName] || 0) + 1;
    });

    // Quotes per month (for current year)
    const quotesPerMonth: Record<string, number> = {};
    if (viewMode === 'annual') {
      for (let month = 0; month < 12; month++) {
        const monthQuotes = quotes.filter(q => {
          const createdDate = new Date(q.created_at);
          return createdDate.getFullYear() === currentYear && createdDate.getMonth() === month;
        });
        const monthName = new Date(currentYear, month).toLocaleDateString('en-US', { month: 'short' });
        quotesPerMonth[monthName] = monthQuotes.length;
      }
    } else {
      // For monthly view, show weeks
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
      const weeks = Math.ceil(endOfMonth.getDate() / 7);

      for (let week = 0; week < weeks; week++) {
        const weekStart = week * 7 + 1;
        const weekEnd = Math.min((week + 1) * 7, endOfMonth.getDate());
        const weekQuotes = filteredQuotes.filter(q => {
          const day = new Date(q.created_at).getDate();
          return day >= weekStart && day <= weekEnd;
        });
        quotesPerMonth[`Week ${week + 1}`] = weekQuotes.length;
      }
    }

    const totalRevenue = filteredQuotes.reduce((sum, quote) => {
      const total = quote.price_details?.final_selling_price || 0;
      if (quote.status === 'Won') {
        return sum + parseCurrency(total);
      }
      return sum;
    }, 0);

    const wonQuotes = filteredQuotes.filter(q => q.status === 'Won').length;
    const rejectedQuotes = filteredQuotes.filter(q => q.status === 'Rejected').length;

    // Win Rate = Won / (Won + Lost)
    const winRate = (wonQuotes + rejectedQuotes) > 0 ? (wonQuotes / (wonQuotes + rejectedQuotes)) * 100 : 0;

    // Conversion Rate = Won / Total
    const conversionRate = filteredQuotes.length > 0 ? (wonQuotes / filteredQuotes.length) * 100 : 0;

    return {
      totalQuotes: filteredQuotes.length,
      totalRevenue,
      quotesByUser,
      quotesPerMonth,
      topUser: Object.entries(quotesByUser).sort((a, b) => b[1] - a[1])[0] || ['None', 0],
      averageRevenuePerQuote: wonQuotes > 0 ? totalRevenue / wonQuotes : 0,
      winRate,
      conversionRate,
    };
  }, [quotes, viewMode]);

  return (
    <PageContent
      title="Analytics"
      subtitle="Track your business performance and quote insights"
      showPageHeader={true}
      headerActions={
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-[var(--sidebar-bg)] p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('monthly')}
            className={`transition-all duration-200 ${
              viewMode === 'monthly'
                ? 'bg-[var(--sidebar-nav-bg-active)] text-[var(--sidebar-nav-text-active)] hover:bg-[var(--sidebar-nav-bg-active)] hover:text-[var(--sidebar-nav-text-active)]'
                : 'text-[var(--sidebar-nav-text)] hover:bg-[var(--sidebar-nav-bg-hover)] hover:text-[var(--sidebar-nav-text-hover)]'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Monthly
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('annual')}
            className={`transition-all duration-200 ${
              viewMode === 'annual'
                ? 'bg-[var(--sidebar-nav-bg-active)] text-[var(--sidebar-nav-text-active)] hover:bg-[var(--sidebar-nav-bg-active)] hover:text-[var(--sidebar-nav-text-active)]'
                : 'text-[var(--sidebar-nav-text)] hover:bg-[var(--sidebar-nav-bg-hover)] hover:text-[var(--sidebar-nav-text-hover)]'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Annual
          </Button>
        </div>
      }
    >
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue */}
        <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-300" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-[var(--content-muted-text)]">{viewMode === 'monthly' ? 'Revenue This Month' : 'Revenue This Year'}</h3>
                <p className="text-2xl font-bold text-[var(--content-header-text)]">${(Math.round(metrics.totalRevenue * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs mt-1 text-[var(--content-muted-text)]">Won quotes only</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top User */}
        <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Top Contributor</h3>
                <p className="text-2xl font-bold text-[var(--content-header-text)] truncate">{metrics.topUser[0]}</p>
                <p className="text-xs mt-1 text-[var(--content-muted-text)]">{metrics.topUser[1]} quotes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Revenue Per Quote */}
        <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800">
                <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-300" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Avg Revenue/Quote</h3>
                <p className="text-2xl font-bold text-[var(--content-header-text)]">${Math.round(metrics.averageRevenuePerQuote).toLocaleString()}</p>
                <p className="text-xs mt-1 text-[var(--content-muted-text)]">Won quotes only</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800">
                <Target className="w-6 h-6 text-orange-600 dark:text-orange-300" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Conversion Rate</h3>
                <p className="text-2xl font-bold text-[var(--content-header-text)]">{Math.round(metrics.conversionRate)}%</p>
                <p className="text-xs mt-1 text-[var(--content-muted-text)]">Won vs Total quotes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      {quotesLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted">Loading analytics data...</p>
        </div>
      ) : quotes.length > 0 ? (
        <AnalyticsPageCharts quotes={quotes} viewMode={viewMode} />
      ) : (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted mx-auto mb-4 opacity-50" />
          <p className="text-muted mb-4">No quotes data available</p>
          <p className="text-sm text-muted">Create some quotes to see analytics</p>
        </div>
      )}
    </PageContent>
  );
};

export default Analytics;