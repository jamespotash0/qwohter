/**
 * Analytics Calculation Utilities
 *
 * Processes proposal data to generate comprehensive analytics metrics including:
 * - Revenue metrics (total, growth, averages)
 * - Conversion metrics (win rate, loss rate)
 * - Time-based breakdowns (weekly, monthly, yearly)
 * - Proposal source performance
 */

import type { Proposal } from '@/services/proposalsService';
import { startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear, addDays, getDay, format, subWeeks, subMonths, subYears, getDaysInMonth } from 'date-fns';

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
  trend: number; // percentage change
  trendFormatted: string;
  trendDirection: 'up' | 'down' | 'neutral';
}

export interface ProposalSourceMetrics {
  source: string;
  proposalCount: number;
  averageValue: number;
  wonCount: number;
  conversionRate: number;
  referralType?: string; // For referral breakdowns (contractor, architect, manufacturer)
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
  productType: string; // Operable Wall, Glass Wall, Accordion Wall
  proposalCount: number;
  revenue: number;
}

export interface ProductModelMetrics {
  productType: string; // Operable Wall, Glass Wall, Accordion Partition
  model: string; // Model for all product types
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
  revenue: number; // Won proposals total
  quotedValue: number; // All submitted proposals total
}

export interface AveragesOverTimeData {
  date: string;
  fullDate?: Date; // Store full date for tooltip formatting
  avgGrossProfit: number;
  avgRevenue: number;
  avgValue: number;
}

export interface TotalsOverTimeData {
  date: string;
  fullDate?: Date; // Store full date for tooltip formatting
  revenue: number; // Total revenue (won proposals)
  grossProfit: number; // Total gross profit (won proposals)
  pipelineValue: number; // Total pipeline value (all proposals in Won/Draft/Submitted/Rejected)
}

export interface WonRejectedOverTimeData {
  date: string;
  fullDate?: Date; // Store full date for tooltip formatting
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
  // New InfoTab field analytics
  categoryOfWorkMetrics: CategoryOfWorkMetrics[];
  projectTypeMetrics: ProjectTypeMetrics[];
  locationTypeMetrics: LocationTypeMetrics[];
  workClassificationMetrics: WorkClassificationMetrics[];
}

/**
 * Format currency value
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

/**
 * Calculate percentage change
 */
export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Get trend direction
 */
export const getTrendDirection = (trend: number): 'up' | 'down' | 'neutral' => {
  if (Math.abs(trend) < 0.1) return 'neutral';
  return trend > 0 ? 'up' : 'down';
};

/**
 * Get start date for time period
 */
export const getStartDate = (period: TimePeriod, date: Date = new Date()): Date => {
  switch (period) {
    case 'weekly':
      return startOfWeek(date, { weekStartsOn: 0 }); // Sunday
    case 'monthly':
      return startOfMonth(date);
    case 'yearly':
      return startOfYear(date);
  }
};

/**
 * Get previous period start date
 */
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

/**
 * Format date for time series
 */
export const formatDateForPeriod = (date: Date, period: TimePeriod): string => {
  switch (period) {
    case 'weekly':
      return format(date, 'MMM d'); // "Jan 1"
    case 'monthly':
      return format(date, 'MMM yyyy'); // "Jan 2024"
    case 'yearly':
      return format(date, 'yyyy'); // "2024"
  }
};

/**
 * Filter proposals by date range
 */
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

/**
 * Calculate total revenue from proposals
 */
export const calculateTotalRevenue = (proposals: Proposal[]): number => {
  return proposals
    .filter((p) => p.status === 'Won')
    .reduce((sum, p) => sum + (p.total_value || 0), 0);
};

/**
 * Calculate win rate (% of decided proposals that were won)
 * Formula: Won / (Won + Rejected) * 100
 * This excludes draft/incomplete proposals - only counts decided outcomes
 */
export const calculateWinRate = (proposals: Proposal[]): number => {
  const won = proposals.filter((p) => p.status === 'Won').length;
  const rejected = proposals.filter((p) => p.status === 'Rejected').length;
  const decided = won + rejected;

  if (decided === 0) return 0;
  return (won / decided) * 100;
};

/**
 * Calculate conversion rate (% of submitted proposals that were won)
 * Formula: Won / Total Submitted * 100
 * Note: "Submitted" = any proposal sent out (Submitted status + Won + Rejected)
 */
export const calculateConversionRate = (proposals: Proposal[]): number => {
  // Total submitted = proposals with Submitted, Won, or Rejected status
  const totalSubmitted = proposals.filter((p) =>
    p.status === 'Submitted' || p.status === 'Won' || p.status === 'Rejected'
  ).length;

  if (totalSubmitted === 0) return 0;

  const won = proposals.filter((p) => p.status === 'Won').length;
  return (won / totalSubmitted) * 100;
};

/**
 * Calculate average proposal value (all submitted/won/rejected proposals)
 */
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

/**
 * Calculate average revenue per proposal (won proposals only)
 */
export const calculateAverageRevenuePerProposal = (proposals: Proposal[]): number => {
  const wonProposals = proposals.filter((p) => p.status === 'Won' && p.total_value && p.total_value > 0);
  if (wonProposals.length === 0) return 0;

  const totalRevenue = wonProposals.reduce((sum, p) => sum + (p.total_value || 0), 0);
  return totalRevenue / wonProposals.length;
};

/**
 * Calculate average gross profit per proposal (won proposals only)
 */
export const calculateAverageGrossProfitPerProposal = (proposals: Proposal[]): number => {
  const wonProposals = proposals.filter((p) => p.status === 'Won');
  if (wonProposals.length === 0) return 0;

  let totalProfit = 0;
  let proposalsWithProfit = 0;

  wonProposals.forEach((p) => {
    // Try to get profit from form_data.pricing first
    const pricingData = p.form_data?.pricing;
    const profitAmount = pricingData?.summary?.grossProfit;
    if (profitAmount !== undefined && profitAmount !== null) {
      totalProfit += profitAmount;
      proposalsWithProfit++;
    } else if (p.margin_percentage && p.total_value) {
      // Fallback: calculate from margin percentage and total_value
      const profit = p.total_value * (p.margin_percentage / 100);
      totalProfit += profit;
      proposalsWithProfit++;
    }
  });

  return proposalsWithProfit > 0 ? totalProfit / proposalsWithProfit : 0;
};

/**
 * Group proposals by time period
 */
export const groupProposalsByPeriod = (
  proposals: Proposal[],
  period: TimePeriod,
  periodsToShow: number = 12
): TimeSeriesDataPoint[] => {
  const now = new Date();
  const dataPoints: TimeSeriesDataPoint[] = [];

  // Generate data points for each period
  for (let i = periodsToShow - 1; i >= 0; i--) {
    let periodStart: Date;
    let periodEnd: Date;

    switch (period) {
      case 'weekly':
        periodStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 0 });
        periodEnd = startOfWeek(subWeeks(now, i - 1), { weekStartsOn: 0 });
        break;
      case 'monthly':
        periodStart = startOfMonth(subMonths(now, i));
        periodEnd = startOfMonth(subMonths(now, i - 1));
        break;
      case 'yearly':
        periodStart = startOfYear(subYears(now, i));
        periodEnd = startOfYear(subYears(now, i - 1));
        break;
    }

    // Filter proposals for this period
    // For submitted proposals - use submitted_at
    const periodProposals = filterProposalsByDateRange(proposals, periodStart, periodEnd, 'submitted_at');

    // For won proposals - use won_at to show when they were actually won
    const wonProposals = filterProposalsByDateRange(proposals, periodStart, periodEnd, 'won_at')
      .filter((p) => p.status === 'Won' && (p.is_main_version === true || p.is_main_version === undefined));

    // For rejected proposals - use rejected_at to show when they were actually rejected
    const rejectedProposals = filterProposalsByDateRange(proposals, periodStart, periodEnd, 'rejected_at')
      .filter((p) => p.status === 'Rejected' && (p.is_main_version === true || p.is_main_version === undefined));

    const revenue = calculateTotalRevenue(wonProposals);
    const conversionRate = calculateConversionRate(periodProposals);

    dataPoints.push({
      date: formatDateForPeriod(periodStart, period),
      revenue,
      proposalCount: periodProposals.length,
      wonCount: wonProposals.length,
      rejectedCount: rejectedProposals.length,
      conversionRate,
    });
  }

  return dataPoints;
};

/**
 * Calculate metric with trend
 */
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

  // Current period
  const currentProposals = filterProposalsByDateRange(proposals, currentPeriodStart, now, dateField);
  const currentValue = calculator(currentProposals);

  // Previous period
  const previousProposals = filterProposalsByDateRange(proposals, previousPeriodStart, currentPeriodStart, dateField);
  const previousValue = calculator(previousProposals);

  // Calculate trend
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

/**
 * Calculate proposal source metrics
 */
export const calculateSourceMetrics = (proposals: Proposal[]): ProposalSourceMetrics[] => {
  const sourceMap = new Map<string, {
    source: string;
    proposalCount: number;
    totalValue: number;
    wonCount: number;
  }>();

  // Only consider submitted/won/rejected proposals and main versions only
  const relevantProposals = proposals.filter((p) =>
    (p.status === 'Submitted' || p.status === 'Won' || p.status === 'Rejected') &&
    (p.is_main_version === true || p.is_main_version === undefined)
  );

  relevantProposals.forEach((proposal) => {
    const source = proposal.proposal_source || 'Unknown';

    if (!sourceMap.has(source)) {
      sourceMap.set(source, {
        source,
        proposalCount: 0,
        totalValue: 0,
        wonCount: 0,
      });
    }

    const metrics = sourceMap.get(source)!;
    metrics.proposalCount++;
    metrics.totalValue += proposal.total_value || 0;

    if (proposal.status === 'Won') {
      metrics.wonCount++;
    }
  });

  // Calculate conversion rates and average values
  const metricsArray = Array.from(sourceMap.values()).map(metrics => ({
    source: metrics.source,
    proposalCount: metrics.proposalCount,
    averageValue: metrics.proposalCount > 0 ? metrics.totalValue / metrics.proposalCount : 0,
    wonCount: metrics.wonCount,
    conversionRate: metrics.proposalCount > 0
      ? (metrics.wonCount / metrics.proposalCount) * 100
      : 0,
  }));

  // Sort by average value (highest first)
  return metricsArray.sort((a, b) => b.averageValue - a.averageValue);
};

/**
 * Calculate proposal status breakdown
 * Proposal statuses: Draft, Submitted, Won, Rejected
 */
export const calculateStatusBreakdown = (proposals: Proposal[]): ProposalStatusBreakdown => {
  return {
    draft: proposals.filter((p) => p.status === 'Draft' || !p.status).length,
    submitted: proposals.filter((p) => p.status === 'Submitted').length,
    won: proposals.filter((p) => p.status === 'Won').length,
    rejected: proposals.filter((p) => p.status === 'Rejected').length,
  };
};

/**
 * Calculate metrics by user
 * Note: Counts ALL proposals (regardless of status) to show team member activity
 */
export const calculateUserMetrics = (proposals: Proposal[]): UserProposalMetrics[] => {
  const userMap = new Map<string, UserProposalMetrics>();

  proposals.forEach((proposal) => {
    // Use created_by_name as the primary field
    const userName = proposal.created_by_name || proposal.creator_name || 'Unknown';

    if (!userMap.has(userName)) {
      userMap.set(userName, {
        userName,
        proposalCount: 0,
        wonCount: 0,
        revenue: 0,
      });
    }

    const metrics = userMap.get(userName)!;
    metrics.proposalCount++;

    if (proposal.status === 'Won') {
      metrics.wonCount++;
      metrics.revenue += proposal.total_value || 0;
    }
  });

  // Sort by proposal count (highest first)
  return Array.from(userMap.values()).sort((a, b) => b.proposalCount - a.proposalCount);
};

/**
 * Calculate product metrics by product type
 * Note: Counts all products in all proposals (if a proposal has 2 products, both are counted)
 * Extracts productType from multiple possible locations (rawData.productType, rawData.productDomain, direct field)
 */
export const calculateProductMetrics = (proposals: Proposal[]): ProductMetrics[] => {
  const productMap = new Map<string, ProductMetrics>();

  proposals.forEach((proposal) => {
    // Get all products from form_data.products
    const products = proposal.form_data?.products?.items || [];
    products.forEach((product: any) => {
      // Extract product type from various possible locations
      const productType =
        product.rawData?.productDomain ||
        product.rawData?.productType ||
        product.productType ||
        product.type ||
        'Other';

      if (!productMap.has(productType)) {
        productMap.set(productType, {
          productType,
          proposalCount: 0,
          revenue: 0,
        });
      }

      const metrics = productMap.get(productType)!;
      metrics.proposalCount++;

      if (proposal.status === 'Won') {
        metrics.revenue += proposal.total_value || 0;
      }
    });
  });

  // Sort by proposal count (highest first)
  return Array.from(productMap.values()).sort((a, b) => b.proposalCount - a.proposalCount);
};

/**
 * Calculate product metrics broken down by model
 * Note: Counts all products in all proposals (if a proposal has 2 products, both are counted)
 * Extracts productType and model from multiple possible locations (rawData fields, direct fields)
 */
export const calculateProductModelMetrics = (proposals: Proposal[]): ProductModelMetrics[] => {
  const modelMap = new Map<string, ProductModelMetrics>();

  proposals.forEach((proposal) => {
    // Get all products from form_data.products
    const products = proposal.form_data?.products?.items || [];
    products.forEach((product: any) => {
      // Extract product type from various possible locations
      const productType =
        product.rawData?.productDomain ||
        product.rawData?.productType ||
        product.productType ||
        product.type ||
        'Other';

      // Get model from rawData or direct field
      const model =
        product.rawData?.model ||
        product.model ||
        'Other';

      // Create unique key combining product type and model
      const key = `${productType}|${model}`;

      if (!modelMap.has(key)) {
        modelMap.set(key, {
          productType,
          model,
          proposalCount: 0,
          revenue: 0,
        });
      }

      const metrics = modelMap.get(key)!;
      metrics.proposalCount++;

      if (proposal.status === 'Won') {
        metrics.revenue += proposal.total_value || 0;
      }
    });
  });

  // Sort by product type first, then by proposal count
  return Array.from(modelMap.values()).sort((a, b) => {
    if (a.productType !== b.productType) {
      return a.productType.localeCompare(b.productType);
    }
    return b.proposalCount - a.proposalCount;
  });
};

/**
 * Calculate averages over time (profit, revenue, value per proposal)
 */
export const calculateAveragesOverTime = (
  proposals: Proposal[],
  period: TimePeriod,
  periodsToShow: number = 12,
  periodOffset: number = 0
): AveragesOverTimeData[] => {
  let baseDate = new Date();

  // Adjust base date based on offset
  if (periodOffset > 0) {
    switch (period) {
      case 'weekly':
        baseDate = subWeeks(baseDate, periodOffset);
        break;
      case 'monthly':
        baseDate = subMonths(baseDate, periodOffset);
        break;
      case 'yearly':
        baseDate = subYears(baseDate, periodOffset);
        break;
    }
  }

  const dataPoints: AveragesOverTimeData[] = [];

  switch (period) {
    case 'weekly': {
      // Show 7 days: Sunday through Saturday with day names and dates (e.g., Mon 11/6)
      const weekStart = startOfWeek(baseDate, { weekStartsOn: 0 });
      for (let i = 0; i < 7; i++) {
        const dayStart = addDays(weekStart, i);
        const dayEnd = addDays(dayStart, 1);
        const periodProposals = filterProposalsByDateRange(proposals, dayStart, dayEnd, 'submitted_at');

        dataPoints.push({
          date: format(dayStart, 'EEE M/d'), // Mon 11/6, Tue 11/7, etc.
          avgGrossProfit: calculateAverageGrossProfitPerProposal(periodProposals),
          avgRevenue: calculateAverageRevenuePerProposal(periodProposals),
          avgValue: calculateAverageProposalValue(periodProposals),
        });
      }
      break;
    }
    case 'monthly': {
      // Show all days of the month (1st to last day)
      const monthStart = startOfMonth(baseDate);
      const daysInMonth = getDaysInMonth(baseDate);
      for (let i = 0; i < daysInMonth; i++) {
        const dayStart = addDays(monthStart, i);
        const dayEnd = addDays(dayStart, 1);
        const periodProposals = filterProposalsByDateRange(proposals, dayStart, dayEnd, 'submitted_at');

        dataPoints.push({
          date: format(dayStart, 'd'), // 1, 2, 3, ..., 31
          fullDate: dayStart, // Store full date for tooltip
          avgGrossProfit: calculateAverageGrossProfitPerProposal(periodProposals),
          avgRevenue: calculateAverageRevenuePerProposal(periodProposals),
          avgValue: calculateAverageProposalValue(periodProposals),
        });
      }
      break;
    }
    case 'yearly': {
      // Show all 12 months: Jan, Feb, ..., Dec
      const yearStart = startOfYear(baseDate);
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(yearStart);
        monthStart.setMonth(i);
        const monthEnd = endOfMonth(monthStart);
        const periodProposals = filterProposalsByDateRange(proposals, monthStart, monthEnd, 'submitted_at');

        dataPoints.push({
          date: format(monthStart, "MMM ''yy"), // Jan '25, Feb '25, etc.
          avgGrossProfit: calculateAverageGrossProfitPerProposal(periodProposals),
          avgRevenue: calculateAverageRevenuePerProposal(periodProposals),
          avgValue: calculateAverageProposalValue(periodProposals),
        });
      }
      break;
    }
  }

  return dataPoints;
};

/**
 * Calculate revenue vs quoted value over time
 */
export const calculateRevenueVsQuoted = (
  proposals: Proposal[],
  period: TimePeriod,
  periodsToShow: number = 12
): RevenueVsQuotedData[] => {
  const now = new Date();
  const dataPoints: RevenueVsQuotedData[] = [];

  // Generate data points for each period
  for (let i = periodsToShow - 1; i >= 0; i--) {
    let periodStart: Date;
    let periodEnd: Date;

    switch (period) {
      case 'weekly':
        periodStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 0 });
        periodEnd = startOfWeek(subWeeks(now, i - 1), { weekStartsOn: 0 });
        break;
      case 'monthly':
        // For monthly view, show days within the current month
        const monthStart = startOfMonth(now);
        const monthEnd = now;
        const totalDays = Math.floor((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));
        const dayInterval = Math.floor(totalDays / (periodsToShow - 1));
        periodStart = new Date(monthStart);
        periodStart.setDate(monthStart.getDate() + (i * dayInterval));
        periodEnd = new Date(monthStart);
        periodEnd.setDate(monthStart.getDate() + ((i + 1) * dayInterval));
        break;
      case 'yearly':
        // For yearly view, show all 12 months of the current year
        const yearStart = startOfYear(now);
        periodStart = new Date(yearStart);
        periodStart.setMonth(periodsToShow - 1 - i);
        periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodStart.getMonth() + 1);
        break;
    }

    // Revenue: Won proposals in this period
    const wonProposals = filterProposalsByDateRange(proposals, periodStart, periodEnd, 'won_at')
      .filter((p) => p.status === 'Won');
    const revenue = wonProposals.reduce((sum, p) => sum + (p.total_value || 0), 0);

    // Quoted Value: All submitted/won/rejected proposals in this period
    const submittedProposals = filterProposalsByDateRange(proposals, periodStart, periodEnd, 'submitted_at')
      .filter((p) => p.status === 'Submitted' || p.status === 'Won' || p.status === 'Rejected');
    const quotedValue = submittedProposals.reduce((sum, p) => sum + (p.total_value || 0), 0);

    dataPoints.push({
      date: formatDateForPeriod(periodStart, period),
      revenue,
      quotedValue,
    });
  }

  return dataPoints;
};

/**
 * Calculate totals over time (revenue, gross profit, quoted value)
 */
export const calculateTotalsOverTime = (
  proposals: Proposal[],
  period: TimePeriod,
  periodsToShow: number = 12,
  periodOffset: number = 0
): TotalsOverTimeData[] => {
  let baseDate = new Date();

  // Adjust base date based on offset
  if (periodOffset > 0) {
    switch (period) {
      case 'weekly':
        baseDate = subWeeks(baseDate, periodOffset);
        break;
      case 'monthly':
        baseDate = subMonths(baseDate, periodOffset);
        break;
      case 'yearly':
        baseDate = subYears(baseDate, periodOffset);
        break;
    }
  }

  const dataPoints: TotalsOverTimeData[] = [];

  switch (period) {
    case 'weekly': {
      // Show 7 days: Sunday through Saturday with day names and dates (e.g., Mon 11/6)
      const weekStart = startOfWeek(baseDate, { weekStartsOn: 0 });
      for (let i = 0; i < 7; i++) {
        const dayStart = addDays(weekStart, i);
        const dayEnd = addDays(dayStart, 1);

        // Revenue: Won proposals in this period
        const wonProposals = filterProposalsByDateRange(proposals, dayStart, dayEnd, 'won_at')
          .filter((p) => p.status === 'Won' && (p.is_main_version === true || p.is_main_version === undefined));
        const revenue = wonProposals.reduce((sum, p) => sum + (p.total_value || 0), 0);

        // Gross Profit: Calculate from won proposals using form_data.pricing or margin fallback
        let grossProfit = 0;
        wonProposals.forEach((p) => {
          const pricingData = p.form_data?.pricing;
          const profitAmount = pricingData?.summary?.grossProfit;
          if (profitAmount !== undefined && profitAmount !== null) {
            grossProfit += profitAmount;
          } else if (p.margin_percentage && p.total_value) {
            grossProfit += p.total_value * (p.margin_percentage / 100);
          }
        });

        // Pipeline Value: All proposals in Won/Draft/Submitted/Rejected status
        const pipelineProposals = filterProposalsByDateRange(proposals, dayStart, dayEnd, 'created_at')
          .filter((p) =>
            (p.status === 'Won' || p.status === 'Draft' || p.status === 'Submitted' || p.status === 'Rejected') &&
            (p.is_main_version === true || p.is_main_version === undefined)
          );
        const pipelineValue = pipelineProposals.reduce((sum, p) => sum + (p.total_value || 0), 0);

        dataPoints.push({
          date: format(dayStart, 'EEE M/d'), // Mon 11/6, Tue 11/7, etc.
          revenue: revenue,
          grossProfit: grossProfit,
          pipelineValue: pipelineValue,
        });
      }
      break;
    }
    case 'monthly': {
      // Show all days of the month (1st to last day)
      const monthStart = startOfMonth(baseDate);
      const daysInMonth = getDaysInMonth(baseDate);
      for (let i = 0; i < daysInMonth; i++) {
        const dayStart = addDays(monthStart, i);
        const dayEnd = addDays(dayStart, 1);

        // Revenue: Won proposals in this period
        const wonProposals = filterProposalsByDateRange(proposals, dayStart, dayEnd, 'won_at')
          .filter((p) => p.status === 'Won' && (p.is_main_version === true || p.is_main_version === undefined));
        const revenue = wonProposals.reduce((sum, p) => sum + (p.total_value || 0), 0);

        // Gross Profit: Calculate from won proposals using form_data.pricing or margin fallback
        let grossProfit = 0;
        wonProposals.forEach((p) => {
          const pricingData = p.form_data?.pricing;
          const profitAmount = pricingData?.summary?.grossProfit;
          if (profitAmount !== undefined && profitAmount !== null) {
            grossProfit += profitAmount;
          } else if (p.margin_percentage && p.total_value) {
            grossProfit += p.total_value * (p.margin_percentage / 100);
          }
        });

        // Pipeline Value: All proposals in Won/Draft/Submitted/Rejected status
        const pipelineProposals = filterProposalsByDateRange(proposals, dayStart, dayEnd, 'created_at')
          .filter((p) =>
            (p.status === 'Won' || p.status === 'Draft' || p.status === 'Submitted' || p.status === 'Rejected') &&
            (p.is_main_version === true || p.is_main_version === undefined)
          );
        const pipelineValue = pipelineProposals.reduce((sum, p) => sum + (p.total_value || 0), 0);

        dataPoints.push({
          date: format(dayStart, 'd'), // 1, 2, 3, ..., 31
          fullDate: dayStart, // Store full date for tooltip
          revenue: revenue,
          grossProfit: grossProfit,
          pipelineValue: pipelineValue,
        });
      }
      break;
    }
    case 'yearly': {
      // Show all 12 months: Jan, Feb, ..., Dec
      const yearStart = startOfYear(baseDate);
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(yearStart);
        monthStart.setMonth(i);
        const monthEnd = endOfMonth(monthStart);

        // Revenue: Won proposals in this period
        const wonProposals = filterProposalsByDateRange(proposals, monthStart, monthEnd, 'won_at')
          .filter((p) => p.status === 'Won' && (p.is_main_version === true || p.is_main_version === undefined));
        const revenue = wonProposals.reduce((sum, p) => sum + (p.total_value || 0), 0);

        // Gross Profit: Calculate from won proposals using form_data.pricing or margin fallback
        let grossProfit = 0;
        wonProposals.forEach((p) => {
          const pricingData = p.form_data?.pricing;
          const profitAmount = pricingData?.summary?.grossProfit;
          if (profitAmount !== undefined && profitAmount !== null) {
            grossProfit += profitAmount;
          } else if (p.margin_percentage && p.total_value) {
            grossProfit += p.total_value * (p.margin_percentage / 100);
          }
        });

        // Pipeline Value: All proposals in Won/Draft/Submitted/Rejected status
        const pipelineProposals = filterProposalsByDateRange(proposals, monthStart, monthEnd, 'created_at')
          .filter((p) =>
            (p.status === 'Won' || p.status === 'Draft' || p.status === 'Submitted' || p.status === 'Rejected') &&
            (p.is_main_version === true || p.is_main_version === undefined)
          );
        const pipelineValue = pipelineProposals.reduce((sum, p) => sum + (p.total_value || 0), 0);

        dataPoints.push({
          date: format(monthStart, "MMM ''yy"), // Jan '25, Feb '25, etc.
          revenue: revenue,
          grossProfit: grossProfit,
          pipelineValue: pipelineValue,
        });
      }
      break;
    }
  }

  return dataPoints;
};

/**
 * Calculate won vs rejected counts over time
 * Shows current period only (not historical spread)
 */
export const calculateWonRejectedOverTime = (
  proposals: Proposal[],
  period: TimePeriod,
  periodsToShow: number = 12,
  periodOffset: number = 0
): WonRejectedOverTimeData[] => {
  let baseDate = new Date();

  // Adjust base date based on offset
  if (periodOffset > 0) {
    switch (period) {
      case 'weekly':
        baseDate = subWeeks(baseDate, periodOffset);
        break;
      case 'monthly':
        baseDate = subMonths(baseDate, periodOffset);
        break;
      case 'yearly':
        baseDate = subYears(baseDate, periodOffset);
        break;
    }
  }

  const dataPoints: WonRejectedOverTimeData[] = [];

  switch (period) {
    case 'weekly': {
      // Show 7 days: Sunday through Saturday
      const weekStart = startOfWeek(baseDate, { weekStartsOn: 0 });
      for (let i = 0; i < 7; i++) {
        const dayStart = addDays(weekStart, i);
        const dayEnd = addDays(dayStart, 1);

        const wonProposals = filterProposalsByDateRange(proposals, dayStart, dayEnd, 'won_at')
          .filter((p) => p.status === 'Won' && (p.is_main_version === true || p.is_main_version === undefined));

        const rejectedProposals = filterProposalsByDateRange(proposals, dayStart, dayEnd, 'rejected_at')
          .filter((p) => p.status === 'Rejected' && (p.is_main_version === true || p.is_main_version === undefined));

        dataPoints.push({
          date: format(dayStart, 'EEE M/d'), // Mon 11/6, Tue 11/7, etc.
          wonCount: wonProposals.length,
          rejectedCount: rejectedProposals.length,
        });
      }
      break;
    }
    case 'monthly': {
      // Show all days of the month (1st to last day)
      const monthStart = startOfMonth(baseDate);
      const daysInMonth = getDaysInMonth(baseDate);
      for (let i = 0; i < daysInMonth; i++) {
        const dayStart = addDays(monthStart, i);
        const dayEnd = addDays(dayStart, 1);

        const wonProposals = filterProposalsByDateRange(proposals, dayStart, dayEnd, 'won_at')
          .filter((p) => p.status === 'Won' && (p.is_main_version === true || p.is_main_version === undefined));

        const rejectedProposals = filterProposalsByDateRange(proposals, dayStart, dayEnd, 'rejected_at')
          .filter((p) => p.status === 'Rejected' && (p.is_main_version === true || p.is_main_version === undefined));

        dataPoints.push({
          date: format(dayStart, 'd'), // 1, 2, 3, ..., 31
          fullDate: dayStart, // Store full date for tooltip
          wonCount: wonProposals.length,
          rejectedCount: rejectedProposals.length,
        });
      }
      break;
    }
    case 'yearly': {
      // Show all 12 months: Jan, Feb, ..., Dec
      const yearStart = startOfYear(baseDate);
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(yearStart);
        monthStart.setMonth(i);
        const monthEnd = endOfMonth(monthStart);

        const wonProposals = filterProposalsByDateRange(proposals, monthStart, monthEnd, 'won_at')
          .filter((p) => p.status === 'Won' && (p.is_main_version === true || p.is_main_version === undefined));

        const rejectedProposals = filterProposalsByDateRange(proposals, monthStart, monthEnd, 'rejected_at')
          .filter((p) => p.status === 'Rejected' && (p.is_main_version === true || p.is_main_version === undefined));

        dataPoints.push({
          date: format(monthStart, "MMM ''yy"), // Jan '25, Feb '25, etc.
          wonCount: wonProposals.length,
          rejectedCount: rejectedProposals.length,
        });
      }
      break;
    }
  }

  return dataPoints;
};

/**
 * Convert averages data to cumulative averages
 */
export const makeAveragesCumulative = (data: AveragesOverTimeData[]): AveragesOverTimeData[] => {
  let cumulativeGrossProfit = 0;
  let cumulativeRevenue = 0;
  let cumulativeValue = 0;

  return data.map((point) => {
    cumulativeGrossProfit += point.avgGrossProfit;
    cumulativeRevenue += point.avgRevenue;
    cumulativeValue += point.avgValue;

    return {
      ...point,
      avgGrossProfit: cumulativeGrossProfit,
      avgRevenue: cumulativeRevenue,
      avgValue: cumulativeValue,
    };
  });
};

/**
 * Convert totals data to cumulative totals
 */
export const makeTotalsCumulative = (data: TotalsOverTimeData[]): TotalsOverTimeData[] => {
  let cumulativeRevenue = 0;
  let cumulativeGrossProfit = 0;
  let cumulativePipeline = 0;

  return data.map((point) => {
    cumulativeRevenue += point.revenue;
    cumulativeGrossProfit += point.grossProfit;
    cumulativePipeline += point.pipelineValue;

    return {
      ...point,
      revenue: cumulativeRevenue,
      grossProfit: cumulativeGrossProfit,
      pipelineValue: cumulativePipeline,
    };
  });
};

/**
 * Convert won/rejected data to cumulative counts
 */
export const makeWonRejectedCumulative = (data: WonRejectedOverTimeData[]): WonRejectedOverTimeData[] => {
  let cumulativeWon = 0;
  let cumulativeRejected = 0;

  return data.map((point) => {
    cumulativeWon += point.wonCount;
    cumulativeRejected += point.rejectedCount;

    return {
      ...point,
      wonCount: cumulativeWon,
      rejectedCount: cumulativeRejected,
    };
  });
};

/**
 * Calculate category of work metrics
 * Extracts categoryOfWork from form_data.info
 */
export const calculateCategoryOfWorkMetrics = (proposals: Proposal[]): CategoryOfWorkMetrics[] => {
  const categoryMap = new Map<string, {
    category: string;
    proposalCount: number;
    revenue: number;
    wonCount: number;
    totalDecided: number;
  }>();

  // Only consider submitted/won/rejected proposals and main versions only
  const relevantProposals = proposals.filter((p) =>
    (p.status === 'Submitted' || p.status === 'Won' || p.status === 'Rejected') &&
    (p.is_main_version === true || p.is_main_version === undefined)
  );

  relevantProposals.forEach((proposal) => {
    const category = proposal.form_data?.info?.categoryOfWork || 'Other';

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        proposalCount: 0,
        revenue: 0,
        wonCount: 0,
        totalDecided: 0,
      });
    }

    const metrics = categoryMap.get(category)!;
    metrics.proposalCount++;

    if (proposal.status === 'Won') {
      metrics.wonCount++;
      metrics.revenue += proposal.total_value || 0;
      metrics.totalDecided++;
    } else if (proposal.status === 'Rejected') {
      metrics.totalDecided++;
    }
  });

  return Array.from(categoryMap.values()).map(m => ({
    category: m.category,
    proposalCount: m.proposalCount,
    revenue: m.revenue,
    wonCount: m.wonCount,
    conversionRate: m.totalDecided > 0 ? (m.wonCount / m.totalDecided) * 100 : 0,
  })).sort((a, b) => b.proposalCount - a.proposalCount);
};

/**
 * Calculate project type metrics
 * Extracts projectType from form_data.info
 */
export const calculateProjectTypeMetrics = (proposals: Proposal[]): ProjectTypeMetrics[] => {
  const typeMap = new Map<string, {
    projectType: string;
    proposalCount: number;
    revenue: number;
    wonCount: number;
    totalDecided: number;
  }>();

  // Only consider submitted/won/rejected proposals and main versions only
  const relevantProposals = proposals.filter((p) =>
    (p.status === 'Submitted' || p.status === 'Won' || p.status === 'Rejected') &&
    (p.is_main_version === true || p.is_main_version === undefined)
  );

  relevantProposals.forEach((proposal) => {
    const projectType = proposal.form_data?.info?.projectType || 'Other';

    if (!typeMap.has(projectType)) {
      typeMap.set(projectType, {
        projectType,
        proposalCount: 0,
        revenue: 0,
        wonCount: 0,
        totalDecided: 0,
      });
    }

    const metrics = typeMap.get(projectType)!;
    metrics.proposalCount++;

    if (proposal.status === 'Won') {
      metrics.wonCount++;
      metrics.revenue += proposal.total_value || 0;
      metrics.totalDecided++;
    } else if (proposal.status === 'Rejected') {
      metrics.totalDecided++;
    }
  });

  return Array.from(typeMap.values()).map(m => ({
    projectType: m.projectType,
    proposalCount: m.proposalCount,
    revenue: m.revenue,
    wonCount: m.wonCount,
    conversionRate: m.totalDecided > 0 ? (m.wonCount / m.totalDecided) * 100 : 0,
  })).sort((a, b) => b.proposalCount - a.proposalCount);
};

/**
 * Calculate location type metrics
 * Extracts locationType from form_data.info
 */
export const calculateLocationTypeMetrics = (proposals: Proposal[]): LocationTypeMetrics[] => {
  const locationMap = new Map<string, LocationTypeMetrics>();

  // Only consider submitted/won/rejected proposals and main versions only
  const relevantProposals = proposals.filter((p) =>
    (p.status === 'Submitted' || p.status === 'Won' || p.status === 'Rejected') &&
    (p.is_main_version === true || p.is_main_version === undefined)
  );

  relevantProposals.forEach((proposal) => {
    const locationType = proposal.form_data?.info?.locationType || 'Other';

    if (!locationMap.has(locationType)) {
      locationMap.set(locationType, {
        locationType,
        proposalCount: 0,
        revenue: 0,
        wonCount: 0,
      });
    }

    const metrics = locationMap.get(locationType)!;
    metrics.proposalCount++;

    if (proposal.status === 'Won') {
      metrics.wonCount++;
      metrics.revenue += proposal.total_value || 0;
    }
  });

  return Array.from(locationMap.values()).sort((a, b) => b.proposalCount - a.proposalCount);
};

/**
 * Calculate work classification metrics (Union / Prevailing Wage)
 * Extracts isUnion and isPrevailingWage from form_data.info
 */
export const calculateWorkClassificationMetrics = (proposals: Proposal[]): WorkClassificationMetrics[] => {
  const classificationMap = new Map<string, WorkClassificationMetrics>();

  // Only consider submitted/won/rejected proposals and main versions only
  const relevantProposals = proposals.filter((p) =>
    (p.status === 'Submitted' || p.status === 'Won' || p.status === 'Rejected') &&
    (p.is_main_version === true || p.is_main_version === undefined)
  );

  relevantProposals.forEach((proposal) => {
    const isUnion = proposal.form_data?.info?.isUnion === true;
    const isPrevailingWage = proposal.form_data?.info?.isPrevailingWage === true;

    // Create a key for the combination
    const key = `${isUnion}-${isPrevailingWage}`;

    if (!classificationMap.has(key)) {
      classificationMap.set(key, {
        isUnion,
        isPrevailingWage,
        proposalCount: 0,
        revenue: 0,
        wonCount: 0,
      });
    }

    const metrics = classificationMap.get(key)!;
    metrics.proposalCount++;

    if (proposal.status === 'Won') {
      metrics.wonCount++;
      metrics.revenue += proposal.total_value || 0;
    }
  });

  return Array.from(classificationMap.values()).sort((a, b) => b.proposalCount - a.proposalCount);
};

/**
 * Filter proposals to only include main versions
 * This prevents counting the same proposal multiple times across versions
 */
export const filterMainVersionProposals = (proposals: Proposal[]): Proposal[] => {
  return proposals.filter((p) => p.is_main_version === true || p.is_main_version === undefined);
};

/**
 * Generate complete analytics summary
 * Note: Automatically filters for main version proposals only to prevent skewing
 */
export const generateAnalyticsSummary = (
  proposals: Proposal[],
  period: TimePeriod = 'monthly'
): AnalyticsSummary => {
  // Filter to main versions only to avoid double-counting
  const mainVersionProposals = filterMainVersionProposals(proposals);

  return {
    totalRevenue: calculateMetricWithTrend(
      mainVersionProposals,
      period,
      calculateTotalRevenue,
      formatCurrency,
      'won_at'
    ),
    proposalsSent: calculateMetricWithTrend(
      mainVersionProposals,
      period,
      (ps) => ps.filter((p) => p.status === 'Submitted' || p.status === 'Won' || p.status === 'Rejected').length,
      (v) => v.toString()
    ),
    conversionRate: calculateMetricWithTrend(
      mainVersionProposals,
      period,
      calculateConversionRate,
      (v) => `${v.toFixed(1)}%`
    ),
    averageProposalValue: calculateMetricWithTrend(
      mainVersionProposals,
      period,
      calculateAverageProposalValue,
      formatCurrency
    ),
    timeSeriesData: groupProposalsByPeriod(mainVersionProposals, period, period === 'weekly' ? 12 : period === 'monthly' ? 12 : 5),
    sourceMetrics: calculateSourceMetrics(mainVersionProposals),
    statusBreakdown: calculateStatusBreakdown(mainVersionProposals),
    userMetrics: calculateUserMetrics(mainVersionProposals),
    productMetrics: calculateProductMetrics(mainVersionProposals),
    productModelMetrics: calculateProductModelMetrics(mainVersionProposals),
    revenueVsQuoted: calculateRevenueVsQuoted(mainVersionProposals, period, period === 'weekly' ? 12 : period === 'monthly' ? 12 : 5),
    averagesOverTime: calculateAveragesOverTime(mainVersionProposals, period, period === 'weekly' ? 12 : period === 'monthly' ? 12 : 5),
    totalsOverTime: calculateTotalsOverTime(mainVersionProposals, period, period === 'weekly' ? 12 : period === 'monthly' ? 12 : 5),
    // New InfoTab field analytics
    categoryOfWorkMetrics: calculateCategoryOfWorkMetrics(mainVersionProposals),
    projectTypeMetrics: calculateProjectTypeMetrics(mainVersionProposals),
    locationTypeMetrics: calculateLocationTypeMetrics(mainVersionProposals),
    workClassificationMetrics: calculateWorkClassificationMetrics(mainVersionProposals),
  };
};
