/**
 * Core Analytics Calculation Utilities
 *
 * Types, interfaces, utility functions, and core metric calculations.
 */

import type { Proposal } from '@/services/proposalsService';
import { startOfWeek, startOfMonth, startOfYear, format, subWeeks, subMonths, subYears } from 'date-fns';

// ─── Types & Interfaces ──────────────────────────────────────────────

export type TimePeriod = 'weekly' | 'monthly' | 'yearly';

export interface TimeSeriesDataPoint {
  date: string;
  revenue: number;
  proposalCount: number;
  wonCount: number;
  rejectedCount: number;
  conversionRate: number;
}

export interface MetricWithTrend {
  value: number;
  formattedValue: string;
  trend: number;
  trendFormatted: string;
  trendDirection: 'up' | 'down' | 'neutral';
}

export interface ProposalSourceMetrics {
  source: string;
  proposalCount: number;
  averageValue: number;
  wonCount: number;
  conversionRate: number;
  referralType?: string;
}

export interface ProposalStatusBreakdown {
  draft: number;
  submitted: number;
  won: number;
  rejected: number;
}

export interface UserProposalMetrics {
  userName: string;
  proposalCount: number;
  wonCount: number;
  revenue: number;
}

export interface ProductMetrics {
  productType: string;
  proposalCount: number;
  revenue: number;
}

export interface ProductModelMetrics {
  productType: string;
  model: string;
  proposalCount: number;
  revenue: number;
}

export interface CategoryOfWorkMetrics {
  category: string;
  proposalCount: number;
  revenue: number;
  wonCount: number;
  conversionRate: number;
}

export interface ProjectTypeMetrics {
  projectType: string;
  proposalCount: number;
  revenue: number;
  wonCount: number;
  conversionRate: number;
}

export interface LocationTypeMetrics {
  locationType: string;
  proposalCount: number;
  revenue: number;
  wonCount: number;
}

export interface WorkClassificationMetrics {
  isUnion: boolean;
  isPrevailingWage: boolean;
  proposalCount: number;
  revenue: number;
  wonCount: number;
}

export interface RevenueVsQuotedData {
  date: string;
  revenue: number;
  quotedValue: number;
}

export interface AveragesOverTimeData {
  date: string;
  fullDate?: Date;
  avgGrossProfit: number;
  avgRevenue: number;
  avgValue: number;
}

export interface TotalsOverTimeData {
  date: string;
  fullDate?: Date;
  revenue: number;
  grossProfit: number;
  pipelineValue: number; // Open pipeline only (Draft + Submitted)
  totalValueQuoted: number; // All proposals created in period
  proposalCount: number; // Number of proposals created in period
}

export interface WonRejectedOverTimeData {
  date: string;
  fullDate?: Date;
  wonCount: number;
  rejectedCount: number;
}

export interface AnalyticsSummary {
  totalRevenue: MetricWithTrend;
  proposalsSent: MetricWithTrend;
  conversionRate: MetricWithTrend;
  averageProposalValue: MetricWithTrend;
  timeSeriesData: TimeSeriesDataPoint[];
  sourceMetrics: ProposalSourceMetrics[];
  statusBreakdown: ProposalStatusBreakdown;
  userMetrics: UserProposalMetrics[];
  productMetrics: ProductMetrics[];
  productModelMetrics: ProductModelMetrics[];
  revenueVsQuoted: RevenueVsQuotedData[];
  averagesOverTime: AveragesOverTimeData[];
  totalsOverTime: TotalsOverTimeData[];
  categoryOfWorkMetrics: CategoryOfWorkMetrics[];
  projectTypeMetrics: ProjectTypeMetrics[];
  locationTypeMetrics: LocationTypeMetrics[];
  workClassificationMetrics: WorkClassificationMetrics[];
}

// ─── Utility Functions ───────────────────────────────────────────────

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const getTrendDirection = (trend: number): 'up' | 'down' | 'neutral' => {
  if (Math.abs(trend) < 0.1) return 'neutral';
  return trend > 0 ? 'up' : 'down';
};

export const getStartDate = (period: TimePeriod, date: Date = new Date()): Date => {
  switch (period) {
    case 'weekly':
      return startOfWeek(date, { weekStartsOn: 0 });
    case 'monthly':
      return startOfMonth(date);
    case 'yearly':
      return startOfYear(date);
  }
};

export const getPreviousPeriodStart = (period: TimePeriod, date: Date = new Date()): Date => {
  switch (period) {
    case 'weekly':
      return subWeeks(date, 1);
    case 'monthly':
      return subMonths(date, 1);
    case 'yearly':
      return subYears(date, 1);
  }
};

export const formatDateForPeriod = (date: Date, period: TimePeriod): string => {
  switch (period) {
    case 'weekly':
      return format(date, 'MMM d');
    case 'monthly':
      return format(date, 'MMM yyyy');
    case 'yearly':
      return format(date, 'yyyy');
  }
};

export const filterProposalsByDateRange = (
  proposals: Proposal[],
  startDate: Date,
  endDate: Date = new Date(),
  dateField: 'created_at' | 'submitted_at' | 'won_at' | 'rejected_at' = 'created_at'
): Proposal[] => {
  return proposals.filter((proposal) => {
    const proposalDate = proposal[dateField] ? new Date(proposal[dateField]!) : null;
    if (!proposalDate) return false;
    return proposalDate >= startDate && proposalDate <= endDate;
  });
};

export const filterMainVersionProposals = (proposals: Proposal[]): Proposal[] => {
  return proposals.filter((p) => p.is_main_version === true || p.is_main_version === undefined);
};

// ─── Core Metric Functions ───────────────────────────────────────────

export const calculateTotalRevenue = (proposals: Proposal[]): number => {
  return proposals
    .filter((p) => p.status === 'Won')
    .reduce((sum, p) => sum + (p.total_value || 0), 0);
};

export const calculateWinRate = (proposals: Proposal[]): number => {
  const won = proposals.filter((p) => p.status === 'Won').length;
  const rejected = proposals.filter((p) => p.status === 'Rejected').length;
  const decided = won + rejected;
  if (decided === 0) return 0;
  return (won / decided) * 100;
};

export const calculateConversionRate = (proposals: Proposal[]): number => {
  const totalSubmitted = proposals.filter((p) =>
    p.status === 'Submitted' || p.status === 'Won' || p.status === 'Rejected'
  ).length;
  if (totalSubmitted === 0) return 0;
  const won = proposals.filter((p) => p.status === 'Won').length;
  return (won / totalSubmitted) * 100;
};

export const calculateAverageProposalValue = (proposals: Proposal[]): number => {
  const submittedProposals = proposals.filter((p) =>
    (p.status === 'Submitted' || p.status === 'Won' || p.status === 'Rejected') &&
    p.total_value &&
    p.total_value > 0
  );
  if (submittedProposals.length === 0) return 0;
  const total = submittedProposals.reduce((sum, p) => sum + (p.total_value || 0), 0);
  return total / submittedProposals.length;
};

export const calculateAverageRevenuePerProposal = (proposals: Proposal[]): number => {
  const wonProposals = proposals.filter((p) => p.status === 'Won' && p.total_value && p.total_value > 0);
  if (wonProposals.length === 0) return 0;
  const totalRevenue = wonProposals.reduce((sum, p) => sum + (p.total_value || 0), 0);
  return totalRevenue / wonProposals.length;
};

export const calculateAverageGrossProfitPerProposal = (proposals: Proposal[]): number => {
  const wonProposals = proposals.filter((p) => p.status === 'Won');
  if (wonProposals.length === 0) return 0;

  let totalProfit = 0;
  let proposalsWithProfit = 0;

  wonProposals.forEach((p) => {
    const pricingData = p.form_data?.pricing;
    const profitAmount = pricingData?.summary?.grossProfit;
    if (profitAmount !== undefined && profitAmount !== null) {
      totalProfit += profitAmount;
      proposalsWithProfit++;
    }
  });

  return proposalsWithProfit > 0 ? totalProfit / proposalsWithProfit : 0;
};

export const calculateMetricWithTrend = (
  proposals: Proposal[],
  period: TimePeriod,
  calculator: (proposals: Proposal[]) => number,
  formatter: (value: number) => string,
  dateField: 'created_at' | 'submitted_at' | 'won_at' | 'rejected_at' = 'submitted_at'
): MetricWithTrend => {
  const now = new Date();
  const currentPeriodStart = getStartDate(period, now);
  const previousPeriodStart = getPreviousPeriodStart(period, currentPeriodStart);

  const currentProposals = filterProposalsByDateRange(proposals, currentPeriodStart, now, dateField);
  const currentValue = calculator(currentProposals);

  const previousProposals = filterProposalsByDateRange(proposals, previousPeriodStart, currentPeriodStart, dateField);
  const previousValue = calculator(previousProposals);

  const trend = calculatePercentageChange(currentValue, previousValue);
  const trendDirection = getTrendDirection(trend);

  return {
    value: currentValue,
    formattedValue: formatter(currentValue),
    trend,
    trendFormatted: formatPercentage(trend),
    trendDirection,
  };
};

export const calculateStatusBreakdown = (proposals: Proposal[]): ProposalStatusBreakdown => {
  return {
    draft: proposals.filter((p) => p.status === 'Draft' || !p.status).length,
    submitted: proposals.filter((p) => p.status === 'Submitted').length,
    won: proposals.filter((p) => p.status === 'Won').length,
    rejected: proposals.filter((p) => p.status === 'Rejected').length,
  };
};
