/**
 * Analytics Products Tab
 *
 * Displays two product-related charts:
 * 1. Most Proposed Products - vertical bar chart by product type
 * 2. Product Breakdown by Model - horizontal bar chart by model
 *
 * Both charts include export/enlarge capabilities with enlarged modal views.
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
  Cell,
} from 'recharts';
import {
  CHART_COLORS,
  PRODUCT_TYPE_COLORS,
  MODEL_COLORS,
  CHART_TOOLTIP_STYLE,
} from './analyticsConstants';
import {
  generateAnalyticsSummary,
} from '@/utils/analyticsCalculations';

export interface AnalyticsProductsTabProps {
  proposals: Proposal[];
}

export const AnalyticsProductsTab = ({ proposals }: AnalyticsProductsTabProps) => {
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
        {/* Most Proposed Products */}
        <EnhancedChartCard
          title="Most Proposed Products"
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
                contentStyle={CHART_TOOLTIP_STYLE}
              />
              <Bar dataKey="proposalCount" name="Proposals" radius={[4, 4, 0, 0]}>
                {analytics.productMetrics.map((entry, index) => {
                  const color = PRODUCT_TYPE_COLORS[entry.productType] || CHART_COLORS.orange;
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </EnhancedChartCard>

        {/* Product Breakdown by Model */}
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
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value: number, name: string) => {
                  if (name === 'Proposals') return [value, 'Proposal Count'];
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
              <Bar dataKey="proposalCount" name="Proposals" radius={[0, 4, 4, 0]}>
                {analytics.productModelMetrics.map((_, index) => {
                  const color = MODEL_COLORS[index % MODEL_COLORS.length];
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </EnhancedChartCard>
      </div>

      {/* Enlarged Chart Modal */}
      {enlargedChart && (
        <Dialog open={!!enlargedChart} onOpenChange={(open) => !open && setEnlargedChart(null)}>
          <DialogContent className="max-w-[95vw] h-[92vh] p-6 flex flex-col overflow-hidden">
            {/* Products Enlarged */}
            {enlargedChart === 'products' && (
              <EnhancedChartCard
                title="Most Proposed Products"
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
                      contentStyle={CHART_TOOLTIP_STYLE}
                    />
                    <Legend />
                    <Bar dataKey="proposalCount" name="Proposals" radius={[4, 4, 0, 0]}>
                      {analytics.productMetrics.map((entry, index) => {
                        const color = PRODUCT_TYPE_COLORS[entry.productType] || CHART_COLORS.orange;
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </EnhancedChartCard>
            )}

            {/* Product Models Enlarged */}
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
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value: number, name: string) => {
                        if (name === 'Proposals') return [value, 'Proposal Count'];
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
                    <Bar dataKey="proposalCount" name="Proposals" radius={[0, 4, 4, 0]}>
                      {analytics.productModelMetrics.map((_, index) => {
                        const color = MODEL_COLORS[index % MODEL_COLORS.length];
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
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
