/**
 * Analytics Calculations Index
 *
 * Re-exports all analytics calculation utilities and the main summary generator.
 */

import type { Proposal } from '@/services/proposalsService';
import type { TimePeriod, AnalyticsSummary } from './coreCalculations';

// Re-export everything
export * from './coreCalculations';
export * from './timeSeriesCalculations';
export * from './breakdownCalculations';
export * from './velocityCalculations';

// Import what we need for generateAnalyticsSummary
import {
  filterMainVersionProposals,
  calculateMetricWithTrend,
  calculateTotalRevenue,
  calculateConversionRate,
  calculateAverageProposalValue,
  calculateStatusBreakdown,
  formatCurrency,
} from './coreCalculations';
import {
  groupProposalsByPeriod,
  calculateAveragesOverTime,
  calculateTotalsOverTime,
  calculateRevenueVsQuoted,
} from './timeSeriesCalculations';
import {
  calculateSourceMetrics,
  calculateUserMetrics,
  calculateProductMetrics,
  calculateProductModelMetrics,
  calculateCategoryOfWorkMetrics,
  calculateProjectTypeMetrics,
  calculateLocationTypeMetrics,
  calculateWorkClassificationMetrics,
} from './breakdownCalculations';

/**
 * Generate complete analytics summary.
 * Automatically filters for main version proposals only.
 */
export const generateAnalyticsSummary = (
  proposals: Proposal[],
  period: TimePeriod = 'monthly'
): AnalyticsSummary => {
  const mainVersionProposals = filterMainVersionProposals(proposals);
  const periodsCount = period === 'weekly' ? 12 : period === 'monthly' ? 12 : 5;

  return {
    totalRevenue: calculateMetricWithTrend(
      mainVersionProposals, period, calculateTotalRevenue, formatCurrency, 'won_at'
    ),
    proposalsSent: calculateMetricWithTrend(
      mainVersionProposals, period,
      (ps) => ps.filter((p) => p.status === 'Submitted' || p.status === 'Won' || p.status === 'Rejected').length,
      (v) => v.toString()
    ),
    conversionRate: calculateMetricWithTrend(
      mainVersionProposals, period, calculateConversionRate, (v) => `${v.toFixed(1)}%`
    ),
    averageProposalValue: calculateMetricWithTrend(
      mainVersionProposals, period, calculateAverageProposalValue, formatCurrency
    ),
    timeSeriesData: groupProposalsByPeriod(mainVersionProposals, period, periodsCount),
    sourceMetrics: calculateSourceMetrics(mainVersionProposals),
    statusBreakdown: calculateStatusBreakdown(mainVersionProposals),
    userMetrics: calculateUserMetrics(mainVersionProposals),
    productMetrics: calculateProductMetrics(mainVersionProposals),
    productModelMetrics: calculateProductModelMetrics(mainVersionProposals),
    revenueVsQuoted: calculateRevenueVsQuoted(mainVersionProposals, period, periodsCount),
    averagesOverTime: calculateAveragesOverTime(mainVersionProposals, period, periodsCount),
    totalsOverTime: calculateTotalsOverTime(mainVersionProposals, period, periodsCount),
    categoryOfWorkMetrics: calculateCategoryOfWorkMetrics(mainVersionProposals),
    projectTypeMetrics: calculateProjectTypeMetrics(mainVersionProposals),
    locationTypeMetrics: calculateLocationTypeMetrics(mainVersionProposals),
    workClassificationMetrics: calculateWorkClassificationMetrics(mainVersionProposals),
  };
};
