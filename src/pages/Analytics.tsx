import { useState, useMemo } from "react";
import { PageContent } from "@/components/common/layout";
import {
  DollarSign,
  FileText,
  Target,
  TrendingUp,
} from "lucide-react";
import { useQuotes } from "@/hooks/queries/useQuotes";
import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import { useUser } from "@/auth";

// Import new analytics components
import { KPICard } from "@/components/analytics";
import { EnhancedChartCard, TimePeriod } from "@/components/analytics/EnhancedChartCard";
import {
  generateAnalyticsSummary,
  formatCurrency,
  calculateWinRate,
  filterMainVersionQuotes,
  calculateAveragesOverTime,
  calculateTotalsOverTime,
  calculateWonRejectedOverTime,
  calculateUserMetrics,
  makeAveragesCumulative,
  makeTotalsCumulative,
  makeWonRejectedCumulative,
} from "@/utils/analyticsCalculations";

// Import dialog for enlarged charts
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

// Import Recharts components
import {
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
 *
 * Architecture: Uses React Query for data fetching and real-time updates
 */
const Analytics = () => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly');
  const [averagesTimePeriod, setAveragesTimePeriod] = useState<TimePeriod>('monthly');
  const [totalsTimePeriod, setTotalsTimePeriod] = useState<TimePeriod>('monthly');
  const [wonRejectedTimePeriod, setWonRejectedTimePeriod] = useState<TimePeriod>('monthly');
  const [teamTimePeriod, setTeamTimePeriod] = useState<TimePeriod>('monthly');
  const [averagesPeriodOffset, setAveragesPeriodOffset] = useState(0);
  const [totalsPeriodOffset, setTotalsPeriodOffset] = useState(0);
  const [wonRejectedPeriodOffset, setWonRejectedPeriodOffset] = useState(0);
  const [teamPeriodOffset, setTeamPeriodOffset] = useState(0);
  const [averagesCumulative, setAveragesCumulative] = useState(false);
  const [totalsCumulative, setTotalsCumulative] = useState(false);
  const [wonRejectedCumulative, setWonRejectedCumulative] = useState(false);
  const [enlargedChart, setEnlargedChart] = useState<string | null>(null);

  // Get user from new auth system
  const user = useUser();

  // Fetch quotes using React Query (includes automatic realtime subscriptions)
  const { data: quotes = [], isLoading: quotesLoading } = useQuotes(user?.id);

  // Get current organization from React Query
  const { organization: currentOrganization } = useCurrentOrganization(user?.id || '');

  // Filter to main versions only to prevent double-counting across versions
  const mainVersionQuotes = useMemo(() => {
    return filterMainVersionQuotes(quotes);
  }, [quotes]);

  // Generate comprehensive analytics using new calculation utilities
  const analytics = useMemo(() => {
    const result = generateAnalyticsSummary(mainVersionQuotes, timePeriod);
    return result;
  }, [mainVersionQuotes, timePeriod]);

  // Individual chart data with their own time periods
  const averagesData = useMemo(() => {
    const data = calculateAveragesOverTime(mainVersionQuotes, averagesTimePeriod, 12, averagesPeriodOffset);
    return averagesCumulative ? makeAveragesCumulative(data) : data;
  }, [mainVersionQuotes, averagesTimePeriod, averagesPeriodOffset, averagesCumulative]);

  const totalsData = useMemo(() => {
    const data = calculateTotalsOverTime(mainVersionQuotes, totalsTimePeriod, 12, totalsPeriodOffset);
    return totalsCumulative ? makeTotalsCumulative(data) : data;
  }, [mainVersionQuotes, totalsTimePeriod, totalsPeriodOffset, totalsCumulative]);

  const wonRejectedData = useMemo(() => {
    const data = calculateWonRejectedOverTime(mainVersionQuotes, wonRejectedTimePeriod, 12, wonRejectedPeriodOffset);
    return wonRejectedCumulative ? makeWonRejectedCumulative(data) : data;
  }, [mainVersionQuotes, wonRejectedTimePeriod, wonRejectedPeriodOffset, wonRejectedCumulative]);

  const teamData = useMemo(() => {
    return calculateUserMetrics(mainVersionQuotes);
  }, [mainVersionQuotes]);

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
    setEnlargedChart(chartName);
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
              title="Total Quotes This Week"
              value={(() => {
                const now = new Date();
                const startOfThisWeek = new Date(now);
                startOfThisWeek.setDate(now.getDate() - now.getDay());
                startOfThisWeek.setHours(0, 0, 0, 0);

                const thisWeekCount = mainVersionQuotes.filter(q => {
                  const createdDate = new Date(q.created_at);
                  return createdDate >= startOfThisWeek;
                }).length;

                return thisWeekCount.toString();
              })()}
              subtitle="Since Sunday"
              icon={FileText}
              iconColor="purple"
              trend={(() => {
                const now = new Date();
                const startOfThisWeek = new Date(now);
                startOfThisWeek.setDate(now.getDate() - now.getDay());
                startOfThisWeek.setHours(0, 0, 0, 0);

                const startOfLastWeek = new Date(startOfThisWeek);
                startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

                const thisWeekCount = mainVersionQuotes.filter(q => {
                  const createdDate = new Date(q.created_at);
                  return createdDate >= startOfThisWeek;
                }).length;

                const lastWeekCount = mainVersionQuotes.filter(q => {
                  const createdDate = new Date(q.created_at);
                  return createdDate >= startOfLastWeek && createdDate < startOfThisWeek;
                }).length;

                if (lastWeekCount === 0) {
                  return thisWeekCount > 0 ? {
                    value: 100,
                    direction: 'up' as const,
                    label: 'vs last week'
                  } : undefined;
                }

                const trendValue = ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;

                return {
                  value: Math.abs(trendValue),
                  direction: trendValue >= 0 ? 'up' as const : 'down' as const,
                  label: 'vs last week'
                };
              })()}
            />
          </div>

          {/* Charts Section */}
          {quotes.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Row 1: Average and Total Metrics Over Time */}
              {/* Average Quote Metrics Over Time */}
              <EnhancedChartCard
                title="Average Quote Metrics Over Time"
                subtitle="Track profit, revenue, and value trends"
                showTimePeriodToggle={true}
                showCumulativeToggle={true}
                isCumulative={averagesCumulative}
                onCumulativeToggle={setAveragesCumulative}
                onTimePeriodChange={setAveragesTimePeriod}
                onPeriodOffsetChange={setAveragesPeriodOffset}
                defaultTimePeriod={averagesTimePeriod}
                onExport={() => handleExport('averages')}
                onExpand={() => handleEnlarge('averages')}
              >
                <ResponsiveContainer width="100%" height={300}>
                  {averagesCumulative ? (
                    <LineChart data={averagesData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        stroke="#6B7280"
                        fontSize={10}
                        tickLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
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
                        labelFormatter={(label, payload) => {
                          if (averagesTimePeriod === 'monthly' && payload && payload[0]?.payload?.fullDate) {
                            const fullDate = payload[0].payload.fullDate;
                            return new Intl.DateTimeFormat('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }).format(new Date(fullDate));
                          }
                          return label;
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
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgRevenue"
                        stroke={COLORS.blue}
                        strokeWidth={2}
                        name="Avg Revenue"
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgValue"
                        stroke={COLORS.purple}
                        strokeWidth={2}
                        name="Avg Quote Value"
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={averagesData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        stroke="#6B7280"
                        fontSize={10}
                        tickLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
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
                        labelFormatter={(label, payload) => {
                          if (averagesTimePeriod === 'monthly' && payload && payload[0]?.payload?.fullDate) {
                            const fullDate = payload[0].payload.fullDate;
                            return new Intl.DateTimeFormat('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }).format(new Date(fullDate));
                          }
                          return label;
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
                      <Bar dataKey="avgGrossProfit" fill={COLORS.green} name="Avg Gross Profit" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avgRevenue" fill={COLORS.blue} name="Avg Revenue" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avgValue" fill={COLORS.purple} name="Avg Quote Value" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </EnhancedChartCard>

              {/* Total Metrics Over Time */}
              <EnhancedChartCard
                title="Total Metrics Over Time"
                subtitle="Revenue, gross profit, and pipeline value trends"
                showTimePeriodToggle={true}
                showCumulativeToggle={true}
                isCumulative={totalsCumulative}
                onCumulativeToggle={setTotalsCumulative}
                onTimePeriodChange={setTotalsTimePeriod}
                onPeriodOffsetChange={setTotalsPeriodOffset}
                defaultTimePeriod={totalsTimePeriod}
                onExport={() => handleExport('totals')}
                onExpand={() => handleEnlarge('totals')}
              >
                <ResponsiveContainer width="100%" height={300}>
                  {totalsCumulative ? (
                    <LineChart data={totalsData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        stroke="#6B7280"
                        fontSize={10}
                        tickLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
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
                        labelFormatter={(label, payload) => {
                          if (totalsTimePeriod === 'monthly' && payload && payload[0]?.payload?.fullDate) {
                            const fullDate = payload[0].payload.fullDate;
                            return new Intl.DateTimeFormat('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }).format(new Date(fullDate));
                          }
                          return label;
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
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="grossProfit"
                        stroke={COLORS.blue}
                        strokeWidth={2}
                        name="Gross Profit"
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="pipelineValue"
                        stroke={COLORS.orange}
                        strokeWidth={2}
                        name="Total Pipeline Value"
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={totalsData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        stroke="#6B7280"
                        fontSize={10}
                        tickLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
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
                        labelFormatter={(label, payload) => {
                          if (totalsTimePeriod === 'monthly' && payload && payload[0]?.payload?.fullDate) {
                            const fullDate = payload[0].payload.fullDate;
                            return new Intl.DateTimeFormat('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }).format(new Date(fullDate));
                          }
                          return label;
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
                      <Bar dataKey="revenue" fill={COLORS.green} name="Revenue" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="grossProfit" fill={COLORS.blue} name="Gross Profit" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pipelineValue" fill={COLORS.orange} name="Total Pipeline Value" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </EnhancedChartCard>

              {/* Row 2: Product Charts */}
              {/* Product Breakdown */}
              <EnhancedChartCard
                title="Most Quoted Products"
                subtitle="Product type distribution"
                onExport={() => handleExport('products')}
                onExpand={() => handleEnlarge('products')}
              >
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={analytics.productMetrics} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="productType"
                      stroke="#6B7280"
                      fontSize={10}
                      tickLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={120}
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
                  <BarChart data={analytics.productModelMetrics} layout="vertical" margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
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
                          const item = payload[0]!.payload;
                          return `${item.productType} - ${label}`;
                        }
                        return label;
                      }}
                    />
                    <Bar dataKey="quoteCount" name="Quotes" radius={[0, 4, 4, 0]}>
                      {analytics.productModelMetrics.map((_, index) => {
                        const modelColors = [
                          COLORS.blue,
                          COLORS.green,
                          COLORS.purple,
                          COLORS.orange,
                          COLORS.teal,
                          COLORS.primary,
                          '#F59E0B',
                          '#EC4899',
                          '#6366F1',
                          '#14B8A6',
                        ];
                        const color = modelColors[index % modelColors.length];
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </EnhancedChartCard>

              {/* Row 3: Won/Rejected and Team Member Charts */}
              {/* Won vs Rejected Over Time */}
              <EnhancedChartCard
                title="Won vs Rejected Quotes"
                subtitle="Track outcomes over time"
                showTimePeriodToggle={true}
                showCumulativeToggle={true}
                isCumulative={wonRejectedCumulative}
                onCumulativeToggle={setWonRejectedCumulative}
                onTimePeriodChange={setWonRejectedTimePeriod}
                onPeriodOffsetChange={setWonRejectedPeriodOffset}
                defaultTimePeriod={wonRejectedTimePeriod}
                onExport={() => handleExport('won-rejected')}
                onExpand={() => handleEnlarge('won-rejected')}
              >
                <ResponsiveContainer width="100%" height={300}>
                  {wonRejectedCumulative ? (
                    <LineChart data={wonRejectedData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        stroke="#6B7280"
                        fontSize={10}
                        tickLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
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
                        labelFormatter={(label, payload) => {
                          if (wonRejectedTimePeriod === 'monthly' && payload && payload[0]?.payload?.fullDate) {
                            const fullDate = payload[0].payload.fullDate;
                            return new Intl.DateTimeFormat('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }).format(new Date(fullDate));
                          }
                          return label;
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="wonCount"
                        stroke={COLORS.green}
                        strokeWidth={2}
                        name="Won"
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rejectedCount"
                        stroke={COLORS.orange}
                        strokeWidth={2}
                        name="Rejected"
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={wonRejectedData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        stroke="#6B7280"
                        fontSize={10}
                        tickLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
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
                        labelFormatter={(label, payload) => {
                          if (wonRejectedTimePeriod === 'monthly' && payload && payload[0]?.payload?.fullDate) {
                            const fullDate = payload[0].payload.fullDate;
                            return new Intl.DateTimeFormat('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }).format(new Date(fullDate));
                          }
                          return label;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="wonCount" fill={COLORS.green} name="Won" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="rejectedCount" fill={COLORS.orange} name="Rejected" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
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
                  <BarChart data={analytics.userMetrics.slice(0, 10)} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="userName"
                      stroke="#6B7280"
                      fontSize={10}
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
                      formatter={(value: number, name: string) => [value, name]}
                    />
                    <Legend />
                    <Bar dataKey="quoteCount" fill={COLORS.blue} name="Total Quotes" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="wonCount" fill={COLORS.green} name="Won" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </EnhancedChartCard>

              {/* Row 4: Quote Status Charts */}
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

      {/* Enlarged Chart Modal */}
      {enlargedChart && (
        <Dialog open={!!enlargedChart} onOpenChange={(open) => !open && setEnlargedChart(null)}>
          <DialogContent className="max-w-[95vw] h-[92vh] p-6 flex flex-col overflow-hidden">
            {/* Average Quote Metrics */}
            {enlargedChart === 'averages' && (
              <EnhancedChartCard
                title="Average Quote Metrics Over Time"
                subtitle="Track profit, revenue, and value trends"
                showTimePeriodToggle={true}
                showCumulativeToggle={true}
                isCumulative={averagesCumulative}
                onCumulativeToggle={setAveragesCumulative}
                onTimePeriodChange={setAveragesTimePeriod}
                onPeriodOffsetChange={setAveragesPeriodOffset}
                defaultTimePeriod={averagesTimePeriod}
                onExport={() => handleExport('averages')}
                onExpand={() => setEnlargedChart(null)}
                isEnlarged={true}
              >
                <ResponsiveContainer width="100%" height="100%">
                  {averagesCumulative ? (
                    <LineChart data={averagesData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        stroke="#6B7280"
                        fontSize={12}
                        tickLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        stroke="#6B7280"
                        fontSize={14}
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
                        labelFormatter={(label, payload) => {
                          if (averagesTimePeriod === 'monthly' && payload && payload[0]?.payload?.fullDate) {
                            const fullDate = payload[0].payload.fullDate;
                            return new Intl.DateTimeFormat('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }).format(new Date(fullDate));
                          }
                          return label;
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
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="avgGrossProfit"
                        stroke={COLORS.green}
                        strokeWidth={3}
                        name="Avg Gross Profit"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgRevenue"
                        stroke={COLORS.blue}
                        strokeWidth={3}
                        name="Avg Revenue"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgValue"
                        stroke={COLORS.purple}
                        strokeWidth={3}
                        name="Avg Quote Value"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={averagesData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        stroke="#6B7280"
                        fontSize={12}
                        tickLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        stroke="#6B7280"
                        fontSize={14}
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
                        labelFormatter={(label, payload) => {
                          if (averagesTimePeriod === 'monthly' && payload && payload[0]?.payload?.fullDate) {
                            const fullDate = payload[0].payload.fullDate;
                            return new Intl.DateTimeFormat('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }).format(new Date(fullDate));
                          }
                          return label;
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
                      <Legend />
                      <Bar dataKey="avgGrossProfit" fill={COLORS.green} name="Avg Gross Profit" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avgRevenue" fill={COLORS.blue} name="Avg Revenue" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avgValue" fill={COLORS.purple} name="Avg Quote Value" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </EnhancedChartCard>
            )}

            {/* Total Metrics */}
            {enlargedChart === 'totals' && (
              <EnhancedChartCard
                title="Total Metrics Over Time"
                subtitle="Revenue, gross profit, and pipeline value trends"
                showTimePeriodToggle={true}
                showCumulativeToggle={true}
                isCumulative={totalsCumulative}
                onCumulativeToggle={setTotalsCumulative}
                onTimePeriodChange={setTotalsTimePeriod}
                onPeriodOffsetChange={setTotalsPeriodOffset}
                defaultTimePeriod={totalsTimePeriod}
                onExport={() => handleExport('totals')}
                onExpand={() => setEnlargedChart(null)}
                isEnlarged={true}
              >
                <ResponsiveContainer width="100%" height="100%">
                  {totalsCumulative ? (
                    <LineChart data={totalsData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        stroke="#6B7280"
                        fontSize={12}
                        tickLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        stroke="#6B7280"
                        fontSize={14}
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
                        labelFormatter={(label, payload) => {
                          if (totalsTimePeriod === 'monthly' && payload && payload[0]?.payload?.fullDate) {
                            const fullDate = payload[0].payload.fullDate;
                            return new Intl.DateTimeFormat('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }).format(new Date(fullDate));
                          }
                          return label;
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
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke={COLORS.green}
                        strokeWidth={3}
                        name="Revenue"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="grossProfit"
                        stroke={COLORS.blue}
                        strokeWidth={3}
                        name="Gross Profit"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="pipelineValue"
                        stroke={COLORS.orange}
                        strokeWidth={3}
                        name="Total Pipeline Value"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={totalsData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        stroke="#6B7280"
                        fontSize={12}
                        tickLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        stroke="#6B7280"
                        fontSize={14}
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
                        labelFormatter={(label, payload) => {
                          if (totalsTimePeriod === 'monthly' && payload && payload[0]?.payload?.fullDate) {
                            const fullDate = payload[0].payload.fullDate;
                            return new Intl.DateTimeFormat('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }).format(new Date(fullDate));
                          }
                          return label;
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
                      <Legend />
                      <Bar dataKey="revenue" fill={COLORS.green} name="Revenue" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="grossProfit" fill={COLORS.blue} name="Gross Profit" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pipelineValue" fill={COLORS.orange} name="Total Pipeline Value" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </EnhancedChartCard>
            )}

            {/* Won vs Rejected */}
            {enlargedChart === 'won-rejected' && (
              <EnhancedChartCard
                title="Won vs Rejected Quotes"
                subtitle="Track outcomes over time"
                showTimePeriodToggle={true}
                showCumulativeToggle={true}
                isCumulative={wonRejectedCumulative}
                onCumulativeToggle={setWonRejectedCumulative}
                onTimePeriodChange={setWonRejectedTimePeriod}
                onPeriodOffsetChange={setWonRejectedPeriodOffset}
                defaultTimePeriod={wonRejectedTimePeriod}
                onExport={() => handleExport('won-rejected')}
                onExpand={() => setEnlargedChart(null)}
                isEnlarged={true}
              >
                <ResponsiveContainer width="100%" height="100%">
                  {wonRejectedCumulative ? (
                    <LineChart data={wonRejectedData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        stroke="#6B7280"
                        fontSize={12}
                        tickLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        stroke="#6B7280"
                        fontSize={14}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                        }}
                        labelFormatter={(label, payload) => {
                          if (wonRejectedTimePeriod === 'monthly' && payload && payload[0]?.payload?.fullDate) {
                            const fullDate = payload[0].payload.fullDate;
                            return new Intl.DateTimeFormat('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }).format(new Date(fullDate));
                          }
                          return label;
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="wonCount"
                        stroke={COLORS.green}
                        strokeWidth={3}
                        name="Won"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rejectedCount"
                        stroke={COLORS.orange}
                        strokeWidth={3}
                        name="Rejected"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={wonRejectedData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        stroke="#6B7280"
                        fontSize={12}
                        tickLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        stroke="#6B7280"
                        fontSize={14}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                        }}
                        labelFormatter={(label, payload) => {
                          if (wonRejectedTimePeriod === 'monthly' && payload && payload[0]?.payload?.fullDate) {
                            const fullDate = payload[0].payload.fullDate;
                            return new Intl.DateTimeFormat('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }).format(new Date(fullDate));
                          }
                          return label;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="wonCount" fill={COLORS.green} name="Won" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="rejectedCount" fill={COLORS.orange} name="Rejected" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </EnhancedChartCard>
            )}

            {/* Products */}
            {enlargedChart === 'products' && (
              <EnhancedChartCard
                title="Most Quoted Products"
                subtitle="Product type distribution"
                onExport={() => handleExport('products')}
                onExpand={() => setEnlargedChart(null)}
                isEnlarged={true}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.productMetrics} margin={{ left: 10, right: 30, top: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="productType"
                      stroke="#6B7280"
                      fontSize={14}
                      tickLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={120}
                    />
                    <YAxis
                      stroke="#6B7280"
                      fontSize={14}
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
            )}

            {/* Product Models */}
            {enlargedChart === 'product-models' && (
              <EnhancedChartCard
                title="Product Breakdown by Model"
                subtitle="Detailed breakdown by model for all product types"
                onExport={() => handleExport('product-models')}
                onExpand={() => setEnlargedChart(null)}
                isEnlarged={true}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.productModelMetrics} layout="vertical" margin={{ left: 120, right: 30, top: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" stroke="#6B7280" fontSize={14} tickLine={false} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="model"
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                      width={150}
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
                          const item = payload[0]!.payload;
                          return `${item.productType} - ${label}`;
                        }
                        return label;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="quoteCount" name="Quotes" radius={[0, 4, 4, 0]}>
                      {analytics.productModelMetrics.map((_, index) => {
                        const modelColors = [
                          COLORS.blue,
                          COLORS.green,
                          COLORS.purple,
                          COLORS.orange,
                          COLORS.teal,
                          COLORS.primary,
                          '#F59E0B',
                          '#EC4899',
                          '#6366F1',
                          '#14B8A6',
                        ];
                        const color = modelColors[index % modelColors.length];
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </EnhancedChartCard>
            )}

            {/* By People */}
            {enlargedChart === 'by-people' && (
              <EnhancedChartCard
                title="Quotes by Team Member"
                subtitle="Quote volume per person"
                onExport={() => handleExport('by-people')}
                onExpand={() => setEnlargedChart(null)}
                isEnlarged={true}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.userMetrics.slice(0, 10)} margin={{ left: 10, right: 30, top: 20, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="userName"
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={120}
                    />
                    <YAxis
                      stroke="#6B7280"
                      fontSize={14}
                      tickLine={false}
                      allowDecimals={false}
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
                    <Bar dataKey="quoteCount" fill={COLORS.blue} name="Total Quotes" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="wonCount" fill={COLORS.green} name="Won" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </EnhancedChartCard>
            )}

            {/* Status */}
            {enlargedChart === 'status' && (
              <EnhancedChartCard
                title="Quote Status Breakdown"
                subtitle="Distribution across all statuses"
                onExport={() => handleExport('status')}
                onExpand={() => setEnlargedChart(null)}
                isEnlarged={true}
              >
                <div className="h-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
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
                        labelLine={true}
                        outerRadius={180}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
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
                        verticalAlign="bottom"
                        height={36}
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
              </EnhancedChartCard>
            )}

            {/* Sources */}
            {enlargedChart === 'sources' && (
              <EnhancedChartCard
                title="Quote Source Performance"
                subtitle="Revenue and conversion by source"
                onExport={() => handleExport('sources')}
                onExpand={() => setEnlargedChart(null)}
                isEnlarged={true}
              >
                <div className="h-full flex flex-col overflow-hidden">
                  {analytics.sourceMetrics.length > 0 ? (
                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-base">
                        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                          <tr>
                            <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Source</th>
                            <th className="px-6 py-4 text-right font-semibold text-gray-700 dark:text-gray-300">Quotes</th>
                            <th className="px-6 py-4 text-right font-semibold text-gray-700 dark:text-gray-300">Revenue</th>
                            <th className="px-6 py-4 text-right font-semibold text-gray-700 dark:text-gray-300">Conv. Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {analytics.sourceMetrics.map((source, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{source.source}</td>
                              <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">{source.quoteCount}</td>
                              <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">{formatCurrency(source.revenue)}</td>
                              <td className="px-6 py-4 text-right">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
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
            )}
          </DialogContent>
        </Dialog>
      )}
    </PageContent>
  );
};

export default Analytics;
