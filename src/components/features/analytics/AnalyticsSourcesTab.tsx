/**
 * Analytics Sources Tab
 *
 * Displays five charts related to proposal sources and classification:
 * 1. Proposal Source Performance - table with source, proposals, avg value, conversion rate
 * 2. Category of Work - bar chart with proposal and won counts
 * 3. Project Type - bar chart with proposal and won counts
 * 4. Location Type - pie chart with location type distribution
 * 5. Work Classification - table with union/prevailing wage breakdown
 *
 * All charts include export/enlarge capabilities with enlarged modal views.
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
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  CHART_COLORS,
  PIE_COLORS,
  CHART_TOOLTIP_STYLE,
} from './analyticsConstants';
import {
  formatCurrency,
  generateAnalyticsSummary,
} from '@/utils/analyticsCalculations';
import { trackEvent } from '@/lib/analytics';

export interface AnalyticsSourcesTabProps {
  proposals: Proposal[];
}

export const AnalyticsSourcesTab = ({ proposals }: AnalyticsSourcesTabProps) => {
  const [enlargedChart, setEnlargedChart] = useState<string | null>(null);

  const analytics = useMemo(() => {
    return generateAnalyticsSummary(proposals, 'monthly');
  }, [proposals]);

  const handleExport = (chartName: string) => {
    console.log(`Exporting ${chartName} data...`);
  };

  const handleEnlarge = (chartName: string) => {
    trackEvent('analytics_chart_enlarged', { chart: chartName, tab: 'sources' });
    setEnlargedChart(chartName);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Proposal Source Performance Table */}
        <EnhancedChartCard
          title="Proposal Source Performance"
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
                      <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Proposals</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Avg Value</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {analytics.sourceMetrics.map((source, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{source.source}</td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{source.proposalCount}</td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{formatCurrency(source.averageValue)}</td>
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

        {/* 2. Category of Work Bar Chart */}
        <EnhancedChartCard
          title="Category of Work"
          subtitle="Proposals by work category"
          onExport={() => handleExport('category-of-work')}
          onExpand={() => handleEnlarge('category-of-work')}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.categoryOfWorkMetrics} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="category"
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
                formatter={(value: number, name: string) => {
                  if (name === 'Won') return [value, 'Won'];
                  if (name === 'Proposals') return [value, 'Total Proposals'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="proposalCount" fill={CHART_COLORS.blue} name="Proposals" radius={[4, 4, 0, 0]} />
              <Bar dataKey="wonCount" fill={CHART_COLORS.green} name="Won" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </EnhancedChartCard>

        {/* 3. Project Type Bar Chart */}
        <EnhancedChartCard
          title="Project Type"
          subtitle="Proposals by project type"
          onExport={() => handleExport('project-type')}
          onExpand={() => handleEnlarge('project-type')}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.projectTypeMetrics} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="projectType"
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
                formatter={(value: number, name: string) => {
                  if (name === 'Won') return [value, 'Won'];
                  if (name === 'Proposals') return [value, 'Total Proposals'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="proposalCount" fill={CHART_COLORS.purple} name="Proposals" radius={[4, 4, 0, 0]} />
              <Bar dataKey="wonCount" fill={CHART_COLORS.green} name="Won" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </EnhancedChartCard>

        {/* 4. Location Type Pie Chart */}
        <EnhancedChartCard
          title="Location Type"
          subtitle="Proposals by location type"
          onExport={() => handleExport('location-type')}
          onExpand={() => handleEnlarge('location-type')}
        >
          <div className="h-[300px] flex items-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.locationTypeMetrics.filter(l => l.proposalCount > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="proposalCount"
                  nameKey="locationType"
                >
                  {analytics.locationTypeMetrics.filter(l => l.proposalCount > 0).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [value, name]}
                  contentStyle={CHART_TOOLTIP_STYLE}
                />
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  formatter={(value, entry: any) => {
                    const total = analytics.locationTypeMetrics.reduce((sum, l) => sum + l.proposalCount, 0);
                    const itemValue = entry.payload?.proposalCount || 0;
                    const percent = total > 0 ? ((itemValue / total) * 100).toFixed(1) : '0.0';
                    return `${value}: ${itemValue} (${percent}%)`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </EnhancedChartCard>

        {/* 5. Work Classification Table */}
        <EnhancedChartCard
          title="Work Classification"
          subtitle="Union and prevailing wage breakdown"
          onExport={() => handleExport('work-classification')}
          onExpand={() => handleEnlarge('work-classification')}
        >
          <div className="h-[300px] flex flex-col">
            {analytics.workClassificationMetrics.length > 0 ? (
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Classification</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Proposals</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Won</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {analytics.workClassificationMetrics.map((item, idx) => {
                      const label = item.isUnion && item.isPrevailingWage
                        ? 'Union + Prevailing Wage'
                        : item.isUnion
                        ? 'Union'
                        : item.isPrevailingWage
                        ? 'Prevailing Wage'
                        : 'Standard';
                      return (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                            <span className={`inline-flex items-center gap-2 ${
                              item.isUnion || item.isPrevailingWage ? 'text-amber-600 dark:text-amber-400' : ''
                            }`}>
                              {label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{item.proposalCount}</td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{item.wonCount}</td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.revenue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                No work classification data available
              </div>
            )}
          </div>
        </EnhancedChartCard>
      </div>

      {/* Enlarged Chart Modals */}
      {enlargedChart && (
        <Dialog open={!!enlargedChart} onOpenChange={(open) => !open && setEnlargedChart(null)}>
          <DialogContent className="max-w-[95vw] h-[92vh] p-6 flex flex-col overflow-hidden">
            {/* Sources Enlarged */}
            {enlargedChart === 'sources' && (
              <EnhancedChartCard
                title="Proposal Source Performance"
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
                            <th className="px-6 py-4 text-right font-semibold text-gray-700 dark:text-gray-300">Proposals</th>
                            <th className="px-6 py-4 text-right font-semibold text-gray-700 dark:text-gray-300">Avg Value</th>
                            <th className="px-6 py-4 text-right font-semibold text-gray-700 dark:text-gray-300">Conv. Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {analytics.sourceMetrics.map((source, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{source.source}</td>
                              <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">{source.proposalCount}</td>
                              <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">{formatCurrency(source.averageValue)}</td>
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

            {/* Category of Work Enlarged */}
            {enlargedChart === 'category-of-work' && (
              <EnhancedChartCard
                title="Category of Work"
                subtitle="Proposals by work category"
                onExport={() => handleExport('category-of-work')}
                onExpand={() => setEnlargedChart(null)}
                isEnlarged={true}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.categoryOfWorkMetrics} margin={{ left: 10, right: 30, top: 20, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="category"
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
                      formatter={(value: number, name: string) => {
                        if (name === 'Won') return [value, 'Won'];
                        if (name === 'Proposals') return [value, 'Total Proposals'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="proposalCount" fill={CHART_COLORS.blue} name="Proposals" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="wonCount" fill={CHART_COLORS.green} name="Won" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </EnhancedChartCard>
            )}

            {/* Project Type Enlarged */}
            {enlargedChart === 'project-type' && (
              <EnhancedChartCard
                title="Project Type"
                subtitle="Proposals by project type"
                onExport={() => handleExport('project-type')}
                onExpand={() => setEnlargedChart(null)}
                isEnlarged={true}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.projectTypeMetrics} margin={{ left: 10, right: 30, top: 20, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="projectType"
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
                      formatter={(value: number, name: string) => {
                        if (name === 'Won') return [value, 'Won'];
                        if (name === 'Proposals') return [value, 'Total Proposals'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="proposalCount" fill={CHART_COLORS.purple} name="Proposals" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="wonCount" fill={CHART_COLORS.green} name="Won" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </EnhancedChartCard>
            )}

            {/* Location Type Enlarged */}
            {enlargedChart === 'location-type' && (
              <EnhancedChartCard
                title="Location Type"
                subtitle="Proposals by location type"
                onExport={() => handleExport('location-type')}
                onExpand={() => setEnlargedChart(null)}
                isEnlarged={true}
              >
                <div className="h-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.locationTypeMetrics.filter(l => l.proposalCount > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={180}
                        fill="#8884d8"
                        dataKey="proposalCount"
                        nameKey="locationType"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      >
                        {analytics.locationTypeMetrics.filter(l => l.proposalCount > 0).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [value, name]}
                        contentStyle={CHART_TOOLTIP_STYLE}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value, entry: any) => {
                          const total = analytics.locationTypeMetrics.reduce((sum, l) => sum + l.proposalCount, 0);
                          const itemValue = entry.payload?.proposalCount || 0;
                          const percent = total > 0 ? ((itemValue / total) * 100).toFixed(1) : '0.0';
                          return `${value}: ${itemValue} (${percent}%)`;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </EnhancedChartCard>
            )}

            {/* Work Classification Enlarged */}
            {enlargedChart === 'work-classification' && (
              <EnhancedChartCard
                title="Work Classification"
                subtitle="Union and prevailing wage breakdown"
                onExport={() => handleExport('work-classification')}
                onExpand={() => setEnlargedChart(null)}
                isEnlarged={true}
              >
                <div className="h-full flex flex-col overflow-hidden">
                  {analytics.workClassificationMetrics.length > 0 ? (
                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-base">
                        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                          <tr>
                            <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Classification</th>
                            <th className="px-6 py-4 text-right font-semibold text-gray-700 dark:text-gray-300">Proposals</th>
                            <th className="px-6 py-4 text-right font-semibold text-gray-700 dark:text-gray-300">Won</th>
                            <th className="px-6 py-4 text-right font-semibold text-gray-700 dark:text-gray-300">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {analytics.workClassificationMetrics.map((item, idx) => {
                            const label = item.isUnion && item.isPrevailingWage
                              ? 'Union + Prevailing Wage'
                              : item.isUnion
                              ? 'Union'
                              : item.isPrevailingWage
                              ? 'Prevailing Wage'
                              : 'Standard';
                            return (
                              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                  <span className={`inline-flex items-center gap-2 ${
                                    item.isUnion || item.isPrevailingWage ? 'text-amber-600 dark:text-amber-400' : ''
                                  }`}>
                                    {label}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">{item.proposalCount}</td>
                                <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">{item.wonCount}</td>
                                <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.revenue)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                      No work classification data available
                    </div>
                  )}
                </div>
              </EnhancedChartCard>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
