import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContent } from "@/components/common/layout";
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
import { groupQuotesByVersion } from "@/utils/quoteVersionGrouping";
import { useOrganizationStore } from "@/stores/organization/organizationStore";
import { useAuthStore } from "@/stores/auth/authStore";

// Import new analytics components with coral theme
import {
  KPICard,
  ChartCard,
  RevenueChart,
  QuotesBarChart,
  SourcePieChart,
} from "@/components/analytics";

/**
 * Analytics Dashboard with Coral Theme (#EE6C4D)
 *
 * Features:
 * - Custom KPI cards with trend indicators
 * - Recharts visualizations
 * - Monthly/Annual view toggle
 * - Real-time data updates
 */
const Analytics = () => {
  const [user, setUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');
  const quotes = useQuotesStore((state) => state.quotes);
  const quotesLoading = useQuotesStore((state) => state.isLoading);
  const fetchQuotes = useQuotesStore((state) => state.fetchQuotes);
  const subscribeToRealtime = useQuotesStore((state) => state.subscribeToRealtime);
  const unsubscribeFromRealtime = useQuotesStore((state) => state.unsubscribeFromRealtime);
  const currentOrganization = useOrganizationStore((state) => state.currentOrganization);
  const profile = useAuthStore((state) => state.profile);

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

  // Fetch quotes and setup realtime subscription
  useEffect(() => {
    if (!user) return;

    console.log('📊 Analytics page mounted - fetching quotes and setting up subscription');

    fetchQuotes({ refresh: true });
    subscribeToRealtime();

    return () => {
      console.log('🧹 Analytics page unmounting - cleaning up subscription');
      unsubscribeFromRealtime();
    };
  }, [user]);

  const parseCurrency = (formatted: string | number): number => {
    if (typeof formatted === 'number') return formatted;
    return Number(formatted.toString().replace(/[^0-9.-]+/g, ''));
  };

  // Calculate metrics based on view mode
  const metrics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const quoteGroups = groupQuotesByVersion(quotes);

    // Filter by period
    const filteredQuoteGroups = viewMode === 'monthly'
      ? quoteGroups.filter(group => {
          const baseVersion = group.versions.find(v => !v.proposal_number.includes('.'));
          if (!baseVersion) return false;
          const createdDate = new Date(baseVersion.created_at);
          return createdDate.getFullYear() === currentYear && createdDate.getMonth() === currentMonth;
        })
      : quoteGroups.filter(group => {
          const baseVersion = group.versions.find(v => !v.proposal_number.includes('.'));
          if (!baseVersion) return false;
          const createdDate = new Date(baseVersion.created_at);
          return createdDate.getFullYear() === currentYear;
        });

    // Calculate revenue by period
    const wonQuoteGroupsInPeriod = viewMode === 'monthly'
      ? quoteGroups.filter(group => {
          const wonVersion = group.versions.find(v => v.status === 'Won' && v.won_at);
          if (!wonVersion) return false;
          const wonDate = new Date(wonVersion.won_at);
          return wonDate.getFullYear() === currentYear && wonDate.getMonth() === currentMonth;
        })
      : quoteGroups.filter(group => {
          const wonVersion = group.versions.find(v => v.status === 'Won' && v.won_at);
          if (!wonVersion) return false;
          const wonDate = new Date(wonVersion.won_at);
          return wonDate.getFullYear() === currentYear;
        });

    const rejectedQuoteGroupsInPeriod = viewMode === 'monthly'
      ? quoteGroups.filter(group => {
          const rejectedVersion = group.versions.find(v => v.status === 'Rejected' && v.rejected_at);
          if (!rejectedVersion) return false;
          const rejectedDate = new Date(rejectedVersion.rejected_at);
          return rejectedDate.getFullYear() === currentYear && rejectedDate.getMonth() === currentMonth && !group.versions.some(v => v.status === 'Won');
        })
      : quoteGroups.filter(group => {
          const rejectedVersion = group.versions.find(v => v.status === 'Rejected' && v.rejected_at);
          if (!rejectedVersion) return false;
          const rejectedDate = new Date(rejectedVersion.rejected_at);
          return rejectedDate.getFullYear() === currentYear && !group.versions.some(v => v.status === 'Won');
        });

    const totalRevenue = wonQuoteGroupsInPeriod.reduce((sum, group) => {
      const wonVersion = group.versions.find(v => v.status === 'Won');
      if (!wonVersion) return sum;
      const total = wonVersion.total_value || wonVersion.price_details?.final_selling_price || 0;
      return sum + (typeof total === 'number' ? total : parseCurrency(total));
    }, 0);

    const wonQuotes = wonQuoteGroupsInPeriod.length;
    const rejectedQuotes = rejectedQuoteGroupsInPeriod.length;
    const winRate = (wonQuotes + rejectedQuotes) > 0 ? (wonQuotes / (wonQuotes + rejectedQuotes)) * 100 : 0;

    // Top contributor
    const quotesByUser: Record<string, number> = {};
    quoteGroups.forEach(group => {
      const baseVersion = group.versions.find(v => !v.proposal_number.includes('.'));
      const userName = baseVersion?.creator_name || 'Unknown';
      quotesByUser[userName] = (quotesByUser[userName] || 0) + 1;
    });
    const topUser = Object.entries(quotesByUser).sort((a, b) => b[1] - a[1])[0] || ['None', 0];

    // Chart data for revenue over time
    const revenueData = [];
    if (viewMode === 'annual') {
      for (let month = 0; month < 12; month++) {
        const monthGroups = quoteGroups.filter(group => {
          const wonVersion = group.versions.find(v => v.status === 'Won' && v.won_at);
          if (!wonVersion) return false;
          const wonDate = new Date(wonVersion.won_at);
          return wonDate.getFullYear() === currentYear && wonDate.getMonth() === month;
        });
        const monthRevenue = monthGroups.reduce((sum, group) => {
          const wonVersion = group.versions.find(v => v.status === 'Won');
          if (!wonVersion) return sum;
          const total = wonVersion.total_value || wonVersion.price_details?.final_selling_price || 0;
          return sum + (typeof total === 'number' ? total : parseCurrency(total));
        }, 0);
        const monthName = new Date(currentYear, month).toLocaleDateString('en-US', { month: 'short' });
        revenueData.push({ period: monthName, revenue: monthRevenue });
      }
    } else {
      // Weekly data for monthly view
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
      const weeks = Math.ceil(endOfMonth.getDate() / 7);

      for (let week = 0; week < weeks; week++) {
        const weekStart = week * 7 + 1;
        const weekEnd = Math.min((week + 1) * 7, endOfMonth.getDate());
        const weekGroups = wonQuoteGroupsInPeriod.filter(group => {
          const wonVersion = group.versions.find(v => v.status === 'Won' && v.won_at);
          if (!wonVersion) return false;
          const day = new Date(wonVersion.won_at).getDate();
          return day >= weekStart && day <= weekEnd;
        });
        const weekRevenue = weekGroups.reduce((sum, group) => {
          const wonVersion = group.versions.find(v => v.status === 'Won');
          if (!wonVersion) return sum;
          const total = wonVersion.total_value || wonVersion.price_details?.final_selling_price || 0;
          return sum + (typeof total === 'number' ? total : parseCurrency(total));
        }, 0);
        revenueData.push({ period: `Week ${week + 1}`, revenue: weekRevenue });
      }
    }

    // Quote status data for bar chart
    const quotesStatusData = [
      {
        name: viewMode === 'monthly' ? 'This Month' : 'This Year',
        won: wonQuotes,
        lost: rejectedQuotes,
        pending: filteredQuoteGroups.length - wonQuotes - rejectedQuotes,
      },
    ];

    // Quote source data (example - you can enhance this)
    const sourceData = [
      { name: 'Website', value: Math.floor(filteredQuoteGroups.length * 0.4) },
      { name: 'Referral', value: Math.floor(filteredQuoteGroups.length * 0.3) },
      { name: 'Direct', value: Math.floor(filteredQuoteGroups.length * 0.2) },
      { name: 'Other', value: Math.floor(filteredQuoteGroups.length * 0.1) },
    ];

    return {
      totalQuotes: filteredQuoteGroups.length,
      totalRevenue,
      topUser,
      averageRevenuePerQuote: wonQuotes > 0 ? totalRevenue / wonQuotes : 0,
      winRate,
      revenueData,
      quotesStatusData,
      sourceData,
    };
  }, [quotes, viewMode]);

  return (
    <PageContent
      title="Analytics"
      subtitle="Track performance metrics and business insights"
      showPageHeader={true}
      headerActions={
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('monthly')}
            className={`transition-all duration-200 ${
              viewMode === 'monthly'
                ? 'bg-[#EE6C4D] text-white hover:bg-[#D85B3E] hover:text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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
                ? 'bg-[#EE6C4D] text-white hover:bg-[#D85B3E] hover:text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Annual
          </Button>
        </div>
      }
    >
      {/* Loading State */}
      {quotesLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-[#EE6C4D] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics data...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards - Using new components with coral theme */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard
              title={viewMode === 'monthly' ? 'Revenue This Month' : 'Revenue This Year'}
              value={`$${(Math.round(metrics.totalRevenue * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle="Won quotes only"
              icon={DollarSign}
              iconColor="orange"
              trend={{ value: 12.5, direction: 'up', label: 'vs last period' }}
            />

            <KPICard
              title="Top Contributor"
              value={metrics.topUser[0]}
              subtitle={`${metrics.topUser[1]} quotes`}
              icon={Users}
              iconColor="blue"
            />

            <KPICard
              title="Avg Revenue/Quote"
              value={`$${Math.round(metrics.averageRevenuePerQuote).toLocaleString()}`}
              subtitle="Won quotes only"
              icon={TrendingUp}
              iconColor="purple"
            />

            <KPICard
              title="Win Rate"
              value={`${Math.round(metrics.winRate)}%`}
              subtitle="Won vs total decided"
              icon={Target}
              iconColor="green"
              trend={{ value: 4.2, direction: 'up', label: 'vs last period' }}
            />
          </div>

          {/* Charts Section */}
          {quotes.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard
                title="Revenue Over Time"
                subtitle={viewMode === 'monthly' ? 'Weekly revenue' : 'Monthly revenue'}
              >
                <RevenueChart data={metrics.revenueData} />
              </ChartCard>

              <ChartCard
                title="Quote Status"
                subtitle="Won, lost, and pending quotes"
              >
                <QuotesBarChart data={metrics.quotesStatusData} />
              </ChartCard>

              <ChartCard
                title="Quote Sources"
                subtitle="Where quotes come from"
              >
                <SourcePieChart data={metrics.sourceData} />
              </ChartCard>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No quotes data available</p>
              <p className="text-sm text-gray-500">Create some quotes to see analytics</p>
            </div>
          )}
        </>
      )}
    </PageContent>
  );
};

export default Analytics;
