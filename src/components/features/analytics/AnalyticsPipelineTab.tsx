/**
 * Pipeline Tab - Velocity Metrics
 *
 * Shows how fast proposals move through the pipeline:
 * - KPI cards for avg days to win, decision, draft, and stale count
 * - Time-to-win distribution histogram
 * - Stale proposals table
 */

import { useMemo } from 'react';
import type { Proposal } from '@/services/proposalsService';
import { Clock, Timer, FileText, AlertTriangle } from 'lucide-react';
import { KPICard } from '@/components/analytics';
import { EnhancedChartCard } from '@/components/analytics/EnhancedChartCard';
import { calculateVelocityMetrics, calculateTimeToWinDistribution } from '@/utils/analytics/velocityCalculations';
import { formatCurrency } from '@/utils/analytics/coreCalculations';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from './analyticsConstants';

interface AnalyticsPipelineTabProps {
  proposals: Proposal[];
}

const CustomHistogramTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div style={CHART_TOOLTIP_STYLE} className="shadow-lg">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      <p className="text-sm text-gray-600">
        Proposals Won: <span className="font-medium">{data.count}</span>
      </p>
      <p className="text-sm text-gray-600">
        Avg Deal Value: <span className="font-medium">{formatCurrency(data.avgValue)}</span>
      </p>
    </div>
  );
};

export const AnalyticsPipelineTab = ({ proposals }: AnalyticsPipelineTabProps) => {
  const velocity = useMemo(() => calculateVelocityMetrics(proposals), [proposals]);
  const distribution = useMemo(() => calculateTimeToWinDistribution(proposals), [proposals]);
  const staleProposals = velocity.staleProposals;

  const formatDays = (value: number | null) =>
    value !== null ? `${value.toFixed(0)} days` : 'N/A';

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Avg Days to Win"
          icon={Clock}
          iconColor="green"
          value={formatDays(velocity.avgDaysToWin)}
          subtitle="Submission to Won"
        />
        <KPICard
          title="Avg Days to Decision"
          icon={Timer}
          iconColor="blue"
          value={formatDays(velocity.avgDaysToDecision)}
          subtitle="Submission to Won/Rejected"
        />
        <KPICard
          title="Avg Days in Draft"
          icon={FileText}
          iconColor="orange"
          value={formatDays(velocity.avgDaysInDraft)}
          subtitle="Created to Submitted"
        />
        <KPICard
          title="Stale Proposals"
          icon={AlertTriangle}
          iconColor="purple"
          value={velocity.staleCount.toString()}
          subtitle="30+ days waiting"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time-to-Win Distribution */}
        <EnhancedChartCard title="Time-to-Win Distribution" subtitle="How long won proposals take to close">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="bucket"
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <Tooltip
                content={<CustomHistogramTooltip />}
                formatter={(value: number, name: string) => {
                  if (name === 'Proposals Won') return [value, 'Proposals Won'];
                  return [value, name];
                }}
              />
              <Bar
                dataKey="count"
                name="Proposals Won"
                fill={CHART_COLORS.green}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </EnhancedChartCard>

        {/* Stale Proposals Table */}
        <EnhancedChartCard title="Stale Proposals" subtitle="Submitted proposals waiting 30+ days">
          {staleProposals.length > 0 ? (
            <div className="overflow-auto h-full">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Project</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Client</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Value</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Days Waiting</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {staleProposals.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium truncate max-w-[160px]">
                        {row.projectName}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                        {row.clientName}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                        {formatCurrency(row.totalValue)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400">
                        {row.daysSinceSubmission}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
              No stale proposals - all proposals have decisions within 30 days
            </div>
          )}
        </EnhancedChartCard>
      </div>
    </div>
  );
};
