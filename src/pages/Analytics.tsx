import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContent } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  FileText,
  Target,
  Calculator,
  Percent,
  Receipt,
} from "lucide-react";
import { useQuotesStore } from "@/stores/quotes/quotesStore";
import { useOrganizationStore } from "@/stores/organization/organizationStore";
import { useAuthStore } from "@/stores/auth/authStore";

// Import new analytics components
import { KPICard } from "@/components/analytics";
import { EnhancedChartCard, TimePeriod } from "@/components/analytics/EnhancedChartCard";
import {
  generateAnalyticsSummary,
  formatCurrency,
  calculateWinRate,
  calculateConversionRate,
  filterMainVersionQuotes,
  calculateAverageGrossProfitPerQuote,
  calculateAverageRevenuePerQuote,
  calculateAverageQuoteValue,
} from "@/utils/analyticsCalculations";

// Import Recharts components
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/**
 * Analytics Dashboard - Comprehensive Metrics Tracking
 *
 * Features:
 * - KPI cards with real-time trends
 * - Time period toggles (Weekly/Monthly/Yearly)
 * - Revenue tracking and conversion metrics
 * - Quote source performance
 * - Export and enlarge capabilities
 */
const Analytics = () => {
  const [user, setUser] = useState<any>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly');
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

  // Filter to main versions only to prevent double-counting across versions
  const mainVersionQuotes = useMemo(() => {
    return filterMainVersionQuotes(quotes);
  }, [quotes]);

  // Generate comprehensive analytics using new calculation utilities
  const analytics = useMemo(() => {
    const result = generateAnalyticsSummary(mainVersionQuotes, timePeriod);
    // Debug: Check userMetrics data
    console.log('Analytics userMetrics:', result.userMetrics);
    console.log('Sample quotes - created_by_name:', mainVersionQuotes.slice(0, 3).map(q => ({
      id: q.id,
      created_by_name: q.created_by_name,
      creator_name: q.creator_name
    })));
    return result;
  }, [mainVersionQuotes, timePeriod]);

  // Chart color scheme
  const COLORS = {
    primary: '#EE6C4D',
    blue: '#3B82F6',
    green: '#10B981',
    purple: '#8B5CF6',
    orange: '#F97316',
    teal: '#14B8A6',
  };

  // Export handler for charts
  const handleExport = (chartName: string) => {
    console.log(`Exporting ${chartName} data...`);
    // TODO: Implement CSV export
  };

  // Enlarge handler for charts
  const handleEnlarge = (chartName: string) => {
    console.log(`Enlarging ${chartName}...`);
    // TODO: Implement modal view
  };

  return (
    <PageContent
      title="Analytics"
      subtitle="Comprehensive performance tracking and business insights"
      showPageHeader={true}
    >
      {/* Loading State */}
      {quotesLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-[#EE6C4D] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics data...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard
              title="Total Revenue (All Time)"
              value={formatCurrency(mainVersionQuotes.filter(q => q.status === 'Won').reduce((sum, q) => sum + (q.total_value || 0), 0))}
              subtitle="Lifetime earnings"
              icon={DollarSign}
              iconColor="orange"
            />

            <KPICard
              title="This Week's Revenue"
              value={analytics.totalRevenue.formattedValue}
              subtitle="Last 7 days"
              icon={TrendingUp}
              iconColor="green"
              trend={{
                value: analytics.totalRevenue.trend,
                direction: analytics.totalRevenue.trendDirection,
                label: 'vs last week'
              }}
            />

            <KPICard
              title="Quote Win Rate"
              value={`${calculateWinRate(mainVersionQuotes).toFixed(1)}%`}
              subtitle="Won / Decided (Won+Rejected)"
              icon={Target}
              iconColor="blue"
            />

            <KPICard
              title="Conversion Rate"
              value={`${calculateConversionRate(mainVersionQuotes).toFixed(1)}%`}
              subtitle="Won / All Submitted"
              icon={Calculator}
              iconColor="purple"
            />
          </div>

          {/* Charts Section */}
          {quotes.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Average Quote Metrics Over Time */}
              <EnhancedChartCard
                title="Average Quote Metrics Over Time"
                subtitle="Track profit, revenue, and value trends"
                showTimePeriodToggle={true}
                onTimePeriodChange={setTimePeriod}
                defaultTimePeriod={timePeriod}
                onExport={() => handleExport('averages')}
                onExpand={() => handleEnlarge('averages')}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.averagesOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                      labelStyle={{
                        fontWeight: 'bold',
                        marginBottom: '8px',
                      }}
                      formatter={(value: number, name: string) => {
                        const labelMap: Record<string, string> = {
                          avgGrossProfit: 'Avg Gross Profit',
                          avgRevenue: 'Avg Revenue',
                          avgValue: 'Avg Quote Value',
                        };
                        return [formatCurrency(value), labelMap[name] || name];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgGrossProfit"
                      stroke={COLORS.green}
                      strokeWidth={2}
                      name="Avg Gross Profit"
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgRevenue"
                      stroke={COLORS.blue}
                      strokeWidth={2}
                      name="Avg Revenue"
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgValue"
                      stroke={COLORS.purple}
                      strokeWidth={2}
                      name="Avg Quote Value"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </EnhancedChartCard>

              {/* Quote Status Breakdown */}
              <EnhancedChartCard
                title="Quote Status Breakdown"
                subtitle="Distribution across all statuses"
                onExport={() => handleExport('status')}
                onExpand={() => handleEnlarge('status')}
              >
                <div className="h-[300px] flex items-center">
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Incomplete', value: analytics.statusBreakdown.incomplete, color: '#9CA3AF' },
                            { name: 'Draft', value: analytics.statusBreakdown.draft, color: '#60A5FA' },
                            { name: 'Submitted', value: analytics.statusBreakdown.submitted, color: '#FBBF24' },
                            { name: 'Won', value: analytics.statusBreakdown.won, color: '#10B981' },
                            { name: 'Rejected', value: analytics.statusBreakdown.rejected, color: '#EF4444' },
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            { name: 'Incomplete', value: analytics.statusBreakdown.incomplete, color: '#9CA3AF' },
                            { name: 'Draft', value: analytics.statusBreakdown.draft, color: '#60A5FA' },
                            { name: 'Submitted', value: analytics.statusBreakdown.submitted, color: '#FBBF24' },
                            { name: 'Won', value: analytics.statusBreakdown.won, color: '#10B981' },
                            { name: 'Rejected', value: analytics.statusBreakdown.rejected, color: '#EF4444' },
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [value, name]}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend
                          verticalAlign="middle"
                          align="right"
                          layout="vertical"
                          formatter={(value, entry: any) => {
                            const total = analytics.statusBreakdown.incomplete +
                                         analytics.statusBreakdown.draft +
                                         analytics.statusBreakdown.submitted +
                                         analytics.statusBreakdown.won +
                                         analytics.statusBreakdown.rejected;
                            const itemValue = entry.payload?.value || 0;
                            const percent = total > 0 ? ((itemValue / total) * 100).toFixed(1) : '0.0';
                            return `${value}: ${itemValue} (${percent}%)`;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </EnhancedChartCard>

              {/* Total Metrics Over Time */}
              <EnhancedChartCard
                title="Total Metrics Over Time"
                subtitle="Revenue, gross profit, and pipeline value trends"
                showTimePeriodToggle={true}
                onTimePeriodChange={setTimePeriod}
                defaultTimePeriod={timePeriod}
                onExport={() => handleExport('totals')}
                onExpand={() => handleEnlarge('totals')}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.totalsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                      labelStyle={{
                        fontWeight: 'bold',
                        marginBottom: '8px',
                      }}
                      formatter={(value: number, name: string) => {
                        const labelMap: Record<string, string> = {
                          revenue: 'Revenue',
                          grossProfit: 'Gross Profit',
                          pipelineValue: 'Total Pipeline Value',
                        };
                        return [formatCurrency(value), labelMap[name] || name];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke={COLORS.green}
                      strokeWidth={2}
                      name="Revenue"
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="grossProfit"
                      stroke={COLORS.blue}
                      strokeWidth={2}
                      name="Gross Profit"
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pipelineValue"
                      stroke={COLORS.orange}
                      strokeWidth={2}
                      name="Total Pipeline Value"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </EnhancedChartCard>

              {/* Won vs Rejected Over Time */}
              <EnhancedChartCard
                title="Won vs Rejected Quotes"
                subtitle="Track outcomes over time"
                showTimePeriodToggle={true}
                onTimePeriodChange={setTimePeriod}
                defaultTimePeriod={timePeriod}
                onExport={() => handleExport('won-rejected')}
                onExpand={() => handleEnlarge('won-rejected')}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="wonCount" fill={COLORS.green} name="Won" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rejectedCount" fill={COLORS.orange} name="Rejected" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </EnhancedChartCard>

              {/* Quotes by People */}
              <EnhancedChartCard
                title="Quotes by Team Member"
                subtitle="Quote volume per person"
                onExport={() => handleExport('by-people')}
                onExpand={() => handleEnlarge('by-people')}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.userMetrics.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" stroke="#6B7280" fontSize={12} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="userName"
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [value, name]}
                    />
                    <Legend />
                    <Bar dataKey="quoteCount" fill={COLORS.blue} name="Total Quotes" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="wonCount" fill={COLORS.green} name="Won" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </EnhancedChartCard>

              {/* Product Breakdown */}
              <EnhancedChartCard
                title="Most Quoted Products"
                subtitle="Product type distribution"
                onExport={() => handleExport('products')}
                onExpand={() => handleEnlarge('products')}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.productMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="productType"
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="quoteCount" name="Quotes" radius={[4, 4, 0, 0]}>
                      {analytics.productMetrics.map((entry, index) => {
                        const productColors: Record<string, string> = {
                          'Operable Wall': COLORS.blue,
                          'Glass Wall': COLORS.green,
                          'Accordion Partition': COLORS.purple,
                        };
                        const color = productColors[entry.productType] || COLORS.orange;
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </EnhancedChartCard>

              {/* Product Model Breakdown */}
              <EnhancedChartCard
                title="Product Breakdown by Model"
                subtitle="Detailed breakdown by model for all product types"
                onExport={() => handleExport('product-models')}
                onExpand={() => handleEnlarge('product-models')}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.productModelMetrics} layout="vertical" margin={{ left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" stroke="#6B7280" fontSize={12} tickLine={false} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="model"
                      stroke="#6B7280"
                      fontSize={11}
                      tickLine={false}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'Quotes') return [value, 'Quote Count'];
                        return [value, name];
                      }}
                      labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0) {
                          const item = payload[0].payload;
                          return `${item.productType} - ${label}`;
                        }
                        return label;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="quoteCount" name="Quotes" radius={[0, 4, 4, 0]}>
                      {analytics.productModelMetrics.map((entry, index) => {
                        // Different color for each model
                        const modelColors = [
                          COLORS.blue,
                          COLORS.green,
                          COLORS.purple,
                          COLORS.orange,
                          COLORS.teal,
                          COLORS.primary,
                          '#F59E0B', // amber
                          '#EC4899', // pink
                          '#6366F1', // indigo
                          '#14B8A6', // teal
                        ];
                        const color = modelColors[index % modelColors.length];
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </EnhancedChartCard>

              {/* Quote Source Performance */}
              <EnhancedChartCard
                title="Quote Source Performance"
                subtitle="Revenue and conversion by source"
                onExport={() => handleExport('sources')}
                onExpand={() => handleEnlarge('sources')}
              >
                <div className="h-[300px] flex flex-col">
                  {analytics.sourceMetrics.length > 0 ? (
                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Source</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Quotes</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Revenue</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Conv. Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {analytics.sourceMetrics.map((source, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{source.source}</td>
                              <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{source.quoteCount}</td>
                              <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{formatCurrency(source.revenue)}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  source.conversionRate >= 50
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : source.conversionRate >= 25
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>
                                  {source.conversionRate.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                      No source data available
                    </div>
                  )}
                </div>
              </EnhancedChartCard>
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
