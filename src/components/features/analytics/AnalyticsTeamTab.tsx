/**
 * Analytics Team Tab
 *
 * Displays team member performance chart showing proposal counts
 * and won counts per team member. Includes enlarged modal view.
 */

import { useState, useMemo } from 'react';
import type { Proposal } from '@/services/proposalsService';
import { EnhancedChartCard } from '@/components/analytics/EnhancedChartCard';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  CHART_COLORS,
  CHART_TOOLTIP_STYLE,
} from './analyticsConstants';
import {
  generateAnalyticsSummary,
} from '@/utils/analyticsCalculations';

export interface AnalyticsTeamTabProps {
  proposals: Proposal[];
}

export const AnalyticsTeamTab = ({ proposals }: AnalyticsTeamTabProps) => {
  const [enlargedChart, setEnlargedChart] = useState<string | null>(null);

  const analytics = useMemo(() => {
    return generateAnalyticsSummary(proposals, 'monthly');
  }, [proposals]);

  const handleExport = (chartName: string) => {
    console.log(`Exporting ${chartName} data...`);
  };

  const handleEnlarge = (chartName: string) => {
    setEnlargedChart(chartName);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proposals by Team Member */}
        <EnhancedChartCard
          title="Proposals by Team Member"
          subtitle="Proposal volume per person"
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
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value: number, name: string) => [value, name]}
              />
              <Legend />
              <Bar dataKey="proposalCount" fill={CHART_COLORS.blue} name="Total Proposals" radius={[4, 4, 0, 0]} />
              <Bar dataKey="wonCount" fill={CHART_COLORS.green} name="Won" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </EnhancedChartCard>
      </div>

      {/* Enlarged Chart Modal */}
      {enlargedChart && (
        <Dialog open={!!enlargedChart} onOpenChange={(open) => !open && setEnlargedChart(null)}>
          <DialogContent className="max-w-[95vw] h-[92vh] p-6 flex flex-col overflow-hidden">
            {/* By People */}
            {enlargedChart === 'by-people' && (
              <EnhancedChartCard
                title="Proposals by Team Member"
                subtitle="Proposal volume per person"
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
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value: number, name: string) => [value, name]}
                    />
                    <Legend />
                    <Bar dataKey="proposalCount" fill={CHART_COLORS.blue} name="Total Proposals" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="wonCount" fill={CHART_COLORS.green} name="Won" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </EnhancedChartCard>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
