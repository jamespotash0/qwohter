/**
 * Analytics Overview Tab
 *
 * KPI cards + 4 charts:
 * - Total Value Quoted: bar chart with avg per proposal line
 * - Cumulative Revenue & Gross Profit: two cumulative lines
 * - Win Rate: percentage line with regression trend (non-zero periods only)
 * - Status Breakdown: pie chart
 */
import { useState, useMemo } from 'react';
import type { Proposal } from '@/services/proposalsService';
import { DollarSign, FileText, Target, TrendingUp } from 'lucide-react';
import { KPICard } from '@/components/analytics';
import { EnhancedChartCard } from '@/components/analytics/EnhancedChartCard';
import type { TimePeriod } from '@/utils/analytics/coreCalculations';
import {
  generateAnalyticsSummary,
  formatCurrency,
  calculateWinRate,
  filterMainVersionProposals,
  calculateTotalsOverTime,
  calculateWonRejectedOverTime,
  makeTotalsCumulative,
} from '@/utils/analytics';
import { calculatePipelineValue } from '@/utils/analytics/velocityCalculations';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  ComposedChart, Bar, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS, CHART_TOOLTIP_STYLE, createMonthlyLabelFormatter } from './analyticsConstants';
import { trackEvent } from '@/lib/analytics';

// ─── Types ──────────────────────────────────────────────────────────

interface AnalyticsOverviewTabProps {
  proposals: Proposal[];
}

// ─── Shared helpers ─────────────────────────────────────────────────

const currencyTickFormatter = (value: number) =>
  value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000 ? `$${(value / 1_000).toFixed(0)}k`
    : `$${value}`;

const nameMap: Record<string, string> = {
  totalValueQuoted: 'Value Quoted',
  avgProposalValue: 'Avg Per Proposal',
  revenue: 'Cumulative Revenue',
  grossProfit: 'Cumulative Gross Profit',
  winRate: 'Win Rate',
  winRateTrend: 'Trend',
};

const currencyTooltipFormatter = (value: number, name: string) =>
  [formatCurrency(value), nameMap[name] || name];

/**
 * Simple linear regression. Returns an array of fitted y-values
 * for each index position, given an array of y-values.
 */
const linearRegression = (values: number[]): number[] => {
  const n = values.length;
  if (n < 2) return values.map(() => values[0] ?? 0);

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return values.map(() => sumY / n);

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return values.map((_, i) => Math.max(0, intercept + slope * i));
};

// ─── Component ──────────────────────────────────────────────────────

export const AnalyticsOverviewTab = ({ proposals }: AnalyticsOverviewTabProps) => {
  // Value Quoted chart state (bar only, no cumulative)
  const [quotedTimePeriod, setQuotedTimePeriod] = useState<TimePeriod>('monthly');
  const [quotedPeriodOffset, setQuotedPeriodOffset] = useState(0);

  // Revenue chart state (always cumulative line, no toggle)
  const [revenueTimePeriod, setRevenueTimePeriod] = useState<TimePeriod>('monthly');
  const [revenuePeriodOffset, setRevenuePeriodOffset] = useState(0);

  // Win Rate chart state
  const [winRateTimePeriod, setWinRateTimePeriod] = useState<TimePeriod>('monthly');
  const [winRatePeriodOffset, setWinRatePeriodOffset] = useState(0);

  const [enlargedChart, setEnlargedChart] = useState<string | null>(null);

  // Derived data
  const mainVersionProposals = useMemo(() => filterMainVersionProposals(proposals), [proposals]);

  const analytics = useMemo(
    () => generateAnalyticsSummary(mainVersionProposals, 'monthly'),
    [mainVersionProposals],
  );

  // Value Quoted: bars + avg value per proposal line
  const valueQuotedData = useMemo(() => {
    const raw = calculateTotalsOverTime(mainVersionProposals, quotedTimePeriod, 12, quotedPeriodOffset);
    return raw.map(d => ({
      ...d,
      avgProposalValue: d.proposalCount > 0 ? d.totalValueQuoted / d.proposalCount : 0,
    }));
  }, [mainVersionProposals, quotedTimePeriod, quotedPeriodOffset]);

  // Revenue + Gross Profit: always cumulative
  const revenueData = useMemo(() => {
    const raw = calculateTotalsOverTime(mainVersionProposals, revenueTimePeriod, 12, revenuePeriodOffset);
    return makeTotalsCumulative(raw);
  }, [mainVersionProposals, revenueTimePeriod, revenuePeriodOffset]);

  // Win Rate: cumulative running rate + regression trend
  const winRateData = useMemo(() => {
    const raw = calculateWonRejectedOverTime(mainVersionProposals, winRateTimePeriod, 12, winRatePeriodOffset);
    // Running cumulative: at each point, total wins so far / total decisions so far
    // Shows 0% before the first decision for a continuous line
    let cumulativeWon = 0;
    let cumulativeDecided = 0;
    const withRate = raw.map(d => {
      cumulativeWon += d.wonCount;
      cumulativeDecided += d.wonCount + d.rejectedCount;
      return {
        ...d,
        winRate: cumulativeDecided > 0 ? (cumulativeWon / cumulativeDecided) * 100 : 0,
      };
    });
    const rates = withRate.map(d => d.winRate);
    const trend = rates.length >= 2 ? linearRegression(rates) : rates;
    return withRate.map((d, i) => ({ ...d, winRateTrend: Math.min(100, trend[i] ?? 0) }));
  }, [mainVersionProposals, winRateTimePeriod, winRatePeriodOffset]);

  const statusData = useMemo(() => [
    { name: 'Draft', value: analytics.statusBreakdown.draft, color: '#60A5FA' },
    { name: 'Submitted', value: analytics.statusBreakdown.submitted, color: '#FBBF24' },
    { name: 'Won', value: analytics.statusBreakdown.won, color: '#10B981' },
    { name: 'Rejected', value: analytics.statusBreakdown.rejected, color: '#EF4444' },
  ].filter(item => item.value > 0), [analytics.statusBreakdown]);

  // Shared axis props
  const xAxisBase = { stroke: '#6B7280', fontSize: 10, tickLine: false, interval: 0 as const, angle: -45, textAnchor: 'end' as const, height: 60 };
  const yAxisBase = { stroke: '#6B7280', fontSize: 12, tickLine: false };
  const xAxisEnlarged = { ...xAxisBase, fontSize: 12, height: 80 };
  const yAxisEnlarged = { ...yAxisBase, fontSize: 14 };
  const chartMargin = { left: -10, right: 10, top: 5, bottom: 5 };

  const handleExport = (chartName: string) => {
    console.log(`Exporting ${chartName} data...`);
  };

  const handleEnlarge = (chart: string) => {
    trackEvent('analytics_chart_enlarged', { chart, tab: 'overview' });
    setEnlargedChart(chart);
  };

  const handleTimePeriodChange = (chart: string, period: TimePeriod) => {
    trackEvent('analytics_time_period_changed', { chart, period });
  };

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Revenue (All Time)"
          value={formatCurrency(mainVersionProposals.filter(q => q.status === 'Won').reduce((sum, q) => sum + (q.total_value || 0), 0))}
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
            label: 'vs last week',
          }}
        />
        <KPICard
          title="Win Rate"
          value={`${calculateWinRate(mainVersionProposals).toFixed(1)}%`}
          subtitle="Won / Decided (Won+Rejected)"
          icon={Target}
          iconColor="blue"
        />
        <KPICard
          title="Open Pipeline"
          value={formatCurrency(calculatePipelineValue(proposals))}
          subtitle="Draft + Submitted value"
          icon={FileText}
          iconColor="purple"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Value Quoted — bar + regression trend */}
        <EnhancedChartCard
          title="Total Value Quoted"
          subtitle="All proposals created per period"
          showTimePeriodToggle
          onTimePeriodChange={(p) => { setQuotedTimePeriod(p); handleTimePeriodChange('value-quoted', p); }}
          onPeriodOffsetChange={setQuotedPeriodOffset}
          defaultTimePeriod={quotedTimePeriod}
          onExport={() => handleExport('value-quoted')}
          onExpand={() => handleEnlarge('value-quoted')}
        >
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={valueQuotedData} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" {...xAxisBase} />
              <YAxis {...yAxisBase} tickFormatter={currencyTickFormatter} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={createMonthlyLabelFormatter(quotedTimePeriod)} formatter={currencyTooltipFormatter} />
              <Bar dataKey="totalValueQuoted" fill={CHART_COLORS.green} name="Value Quoted" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="avgProposalValue" stroke="#EF4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Avg Per Proposal" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </EnhancedChartCard>

        {/* Revenue & Gross Profit — cumulative lines */}
        <EnhancedChartCard
          title="Revenue & Gross Profit"
          subtitle="Running totals over time (Cumulative)"
          showTimePeriodToggle
          onTimePeriodChange={(p) => { setRevenueTimePeriod(p); handleTimePeriodChange('revenue', p); }}
          onPeriodOffsetChange={setRevenuePeriodOffset}
          defaultTimePeriod={revenueTimePeriod}
          onExport={() => handleExport('revenue')}
          onExpand={() => handleEnlarge('revenue')}
        >
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={revenueData} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" {...xAxisBase} />
              <YAxis {...yAxisBase} tickFormatter={currencyTickFormatter} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={createMonthlyLabelFormatter(revenueTimePeriod)} formatter={currencyTooltipFormatter} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS.blue} strokeWidth={2} name="Cumulative Revenue" dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="grossProfit" stroke={CHART_COLORS.green} strokeWidth={2} name="Cumulative Gross Profit" dot={false} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </EnhancedChartCard>

        {/* Win Rate Over Time */}
        <EnhancedChartCard
          title="Win Rate Over Time"
          subtitle="Running win rate (cumulative within period)"
          showTimePeriodToggle
          onTimePeriodChange={(p) => { setWinRateTimePeriod(p); handleTimePeriodChange('win-rate', p); }}
          onPeriodOffsetChange={setWinRatePeriodOffset}
          defaultTimePeriod={winRateTimePeriod}
          onExport={() => handleExport('win-rate')}
          onExpand={() => handleEnlarge('win-rate')}
        >
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={winRateData} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" {...xAxisBase} />
              <YAxis {...yAxisBase} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={createMonthlyLabelFormatter(winRateTimePeriod)} formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, nameMap[name] || name]} />
              <Line type="monotone" dataKey="winRate" stroke={CHART_COLORS.blue} strokeWidth={2} name="Win Rate" dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="winRateTrend" stroke="#EF4444" strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={false} name="Trend" />
            </ComposedChart>
          </ResponsiveContainer>
        </EnhancedChartCard>

        {/* Proposal Status Breakdown */}
        <EnhancedChartCard
          title="Proposal Status Breakdown"
          subtitle="Distribution across all statuses"
          onExport={() => handleExport('status')}
        >
          <div className="h-[300px] flex items-center">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" labelLine={false} outerRadius={90} fill="#8884d8" dataKey="value">
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [value, name]} contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend
                    verticalAlign="middle" align="right" layout="vertical"
                    formatter={(value, entry: any) => {
                      const total = analytics.statusBreakdown.draft + analytics.statusBreakdown.submitted + analytics.statusBreakdown.won + analytics.statusBreakdown.rejected;
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
      </div>

      {/* Enlarged Chart Modals */}
      {enlargedChart && (
        <Dialog open={!!enlargedChart} onOpenChange={(open) => !open && setEnlargedChart(null)}>
          <DialogContent className="max-w-[95vw] h-[92vh] p-6 flex flex-col overflow-hidden">
            {/* Total Value Quoted (enlarged) */}
            {enlargedChart === 'value-quoted' && (
              <EnhancedChartCard
                title="Total Value Quoted"
                subtitle="All proposals created per period"
                showTimePeriodToggle
                onTimePeriodChange={setQuotedTimePeriod}
                onPeriodOffsetChange={setQuotedPeriodOffset}
                defaultTimePeriod={quotedTimePeriod}
                onExport={() => handleExport('value-quoted')}
                onExpand={() => setEnlargedChart(null)}
                isEnlarged
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={valueQuotedData} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" {...xAxisEnlarged} />
                    <YAxis {...yAxisEnlarged} tickFormatter={currencyTickFormatter} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={createMonthlyLabelFormatter(quotedTimePeriod)} formatter={currencyTooltipFormatter} />
                    <Legend />
                    <Bar dataKey="totalValueQuoted" fill={CHART_COLORS.green} name="Value Quoted" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="avgProposalValue" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Avg Per Proposal" connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </EnhancedChartCard>
            )}

            {/* Revenue & Gross Profit (enlarged) */}
            {enlargedChart === 'revenue' && (
              <EnhancedChartCard
                title="Cumulative Revenue & Gross Profit"
                subtitle="Running totals over time"
                showTimePeriodToggle
                onTimePeriodChange={setRevenueTimePeriod}
                onPeriodOffsetChange={setRevenuePeriodOffset}
                defaultTimePeriod={revenueTimePeriod}
                onExport={() => handleExport('revenue')}
                onExpand={() => setEnlargedChart(null)}
                isEnlarged
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={revenueData} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" {...xAxisEnlarged} />
                    <YAxis {...yAxisEnlarged} tickFormatter={currencyTickFormatter} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={createMonthlyLabelFormatter(revenueTimePeriod)} formatter={currencyTooltipFormatter} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS.blue} strokeWidth={3} name="Cumulative Revenue" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="grossProfit" stroke={CHART_COLORS.green} strokeWidth={3} name="Cumulative Gross Profit" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </EnhancedChartCard>
            )}

            {/* Win Rate (enlarged) */}
            {enlargedChart === 'win-rate' && (
              <EnhancedChartCard
                title="Win Rate Over Time"
                subtitle="Running win rate (cumulative within period)"
                showTimePeriodToggle
                onTimePeriodChange={setWinRateTimePeriod}
                onPeriodOffsetChange={setWinRatePeriodOffset}
                defaultTimePeriod={winRateTimePeriod}
                onExport={() => handleExport('win-rate')}
                onExpand={() => setEnlargedChart(null)}
                isEnlarged
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={winRateData} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" {...xAxisEnlarged} />
                    <YAxis {...yAxisEnlarged} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={createMonthlyLabelFormatter(winRateTimePeriod)} formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, nameMap[name] || name]} />
                    <Legend />
                    <Line type="monotone" dataKey="winRate" stroke={CHART_COLORS.blue} strokeWidth={3} name="Win Rate" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="winRateTrend" stroke="#EF4444" strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={false} name="Trend" />
                  </ComposedChart>
                </ResponsiveContainer>
              </EnhancedChartCard>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
