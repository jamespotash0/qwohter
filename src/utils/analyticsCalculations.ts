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

export interface RevenueVsQuotedData {
  date: string;
  revenue: number; // Won quotes total
  quotedValue: number; // All submitted quotes total
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
  revenue: number; // Total revenue (won quotes)
  grossProfit: number; // Total gross profit (won quotes)
  pipelineValue: number; // Total pipeline value (all quotes in Won/Draft/Submitted/Rejected)
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
 * Filter quotes by date range
 */
export const filterProposalsByDateRange = (
  quotes: Proposal[],
  startDate: Date,
  endDate: Date = new Date(),
  dateField: 'created_at' | 'submitted_at' | 'won_at' | 'rejected_at' = 'created_at'
): Proposal[] => {
  return quotes.filter((quote) => {
    const quoteDate = quote[dateField] ? new Date(quote[dateField]!) : null;
    if (!quoteDate) return false;
    return quoteDate >= startDate && quoteDate <= endDate;
  });
};

/**
 * Calculate total revenue from quotes
 */
export const calculateTotalRevenue = (quotes: Proposal[]): number => {
  return quotes
    .filter((q) => q.status === 'Won')
    .reduce((sum, q) => sum + (q.total_value || 0), 0);
};

/**
 * Calculate win rate (% of decided quotes that were won)
 * Formula: Won / (Won + Rejected) * 100
 * This excludes draft/incomplete quotes - only counts decided outcomes
 */
export const calculateWinRate = (quotes: Proposal[]): number => {
  const won = quotes.filter((q) => q.status === 'Won').length;
  const rejected = quotes.filter((q) => q.status === 'Rejected').length;
  const decided = won + rejected;

  if (decided === 0) return 0;
  return (won / decided) * 100;
};

/**
 * Calculate conversion rate (% of submitted quotes that were won)
 * Formula: Won / Total Submitted * 100
 * Note: "Submitted" = any quote sent out (Submitted status + Won + Rejected)
 */
export const calculateConversionRate = (quotes: Proposal[]): number => {
  // Total submitted = quotes with Submitted, Won, or Rejected status
  const totalSubmitted = quotes.filter((q) =>
    q.status === 'Submitted' || q.status === 'Won' || q.status === 'Rejected'
  ).length;

  if (totalSubmitted === 0) return 0;

  const won = quotes.filter((q) => q.status === 'Won').length;
  return (won / totalSubmitted) * 100;
};

/**
 * Calculate average quote value (all submitted/won/rejected quotes)
 */
export const calculateAverageProposalValue = (quotes: Proposal[]): number => {
  const submittedProposals = quotes.filter((q) =>
    (q.status === 'Submitted' || q.status === 'Won' || q.status === 'Rejected') &&
    q.total_value &&
    q.total_value > 0
  );
  if (submittedProposals.length === 0) return 0;

  const total = submittedProposals.reduce((sum, q) => sum + (q.total_value || 0), 0);
  return total / submittedProposals.length;
};

/**
 * Calculate average revenue per quote (won quotes only)
 */
export const calculateAverageRevenuePerProposal = (quotes: Proposal[]): number => {
  const wonProposals = quotes.filter((q) => q.status === 'Won' && q.total_value && q.total_value > 0);
  if (wonProposals.length === 0) return 0;

  const totalRevenue = wonProposals.reduce((sum, q) => sum + (q.total_value || 0), 0);
  return totalRevenue / wonProposals.length;
};

/**
 * Calculate average gross profit per quote (won quotes only)
 */
export const calculateAverageGrossProfitPerProposal = (quotes: Proposal[]): number => {
  const wonProposals = quotes.filter((q) => q.status === 'Won');
  if (wonProposals.length === 0) return 0;

  let totalProfit = 0;
  let quotesWithProfit = 0;

  wonProposals.forEach((q) => {
    // Try to get profit from price_details first
    const profitAmount = q.price_details?.final_selling_price_profit_amount;
    if (profitAmount !== undefined && profitAmount !== null) {
      totalProfit += profitAmount;
      quotesWithProfit++;
    } else if (q.margin_percentage && q.total_value) {
      // Fallback: calculate from margin percentage
      const profit = q.total_value * (q.margin_percentage / 100);
      totalProfit += profit;
      quotesWithProfit++;
    }
  });

  return quotesWithProfit > 0 ? totalProfit / quotesWithProfit : 0;
};

/**
 * Group quotes by time period
 */
export const groupProposalsByPeriod = (
  quotes: Proposal[],
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

    // Filter quotes for this period
    // For submitted quotes - use submitted_at
    const periodProposals = filterProposalsByDateRange(quotes, periodStart, periodEnd, 'submitted_at');

    // For won quotes - use won_at to show when they were actually won
    const wonProposals = filterProposalsByDateRange(quotes, periodStart, periodEnd, 'won_at')
      .filter((q) => q.status === 'Won' && (q.is_main_version === true || q.is_main_version === undefined));

    // For rejected quotes - use rejected_at to show when they were actually rejected
    const rejectedProposals = filterProposalsByDateRange(quotes, periodStart, periodEnd, 'rejected_at')
      .filter((q) => q.status === 'Rejected' && (q.is_main_version === true || q.is_main_version === undefined));

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
  quotes: Proposal[],
  period: TimePeriod,
  calculator: (quotes: Proposal[]) => number,
  formatter: (value: number) => string,
  dateField: 'created_at' | 'submitted_at' | 'won_at' | 'rejected_at' = 'submitted_at'
): MetricWithTrend => {
  const now = new Date();
  const currentPeriodStart = getStartDate(period, now);
  const previousPeriodStart = getPreviousPeriodStart(period, currentPeriodStart);

  // Current period
  const currentProposals = filterProposalsByDateRange(quotes, currentPeriodStart, now, dateField);
  const currentValue = calculator(currentProposals);

  // Previous period
  const previousProposals = filterProposalsByDateRange(quotes, previousPeriodStart, currentPeriodStart, dateField);
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
 * Calculate quote source metrics
 */
export const calculateSourceMetrics = (quotes: Proposal[]): ProposalSourceMetrics[] => {
  const sourceMap = new Map<string, {
    source: string;
    proposalCount: number;
    totalValue: number;
    wonCount: number;
  }>();

  // Only consider submitted/won/rejected quotes and main versions only
  const relevantProposals = quotes.filter((q) =>
    (q.status === 'Submitted' || q.status === 'Won' || q.status === 'Rejected') &&
    (q.is_main_version === true || q.is_main_version === undefined)
  );

  relevantProposals.forEach((quote) => {
    const source = quote.quote_source || 'Unknown';

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
    metrics.totalValue += quote.total_value || 0;

    if (quote.status === 'Won') {
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
 * Calculate quote status breakdown
 * Proposal statuses: Draft, Submitted, Won, Rejected
 */
export const calculateStatusBreakdown = (quotes: Proposal[]): ProposalStatusBreakdown => {
  return {
    draft: quotes.filter((q) => q.status === 'Draft' || !q.status).length,
    submitted: quotes.filter((q) => q.status === 'Submitted').length,
    won: quotes.filter((q) => q.status === 'Won').length,
    rejected: quotes.filter((q) => q.status === 'Rejected').length,
  };
};

/**
 * Calculate metrics by user
 * Note: Counts ALL quotes (regardless of status) to show team member activity
 */
export const calculateUserMetrics = (quotes: Proposal[]): UserProposalMetrics[] => {
  const userMap = new Map<string, UserProposalMetrics>();

  quotes.forEach((quote) => {
    // Use created_by_name as the primary field
    const userName = quote.created_by_name || quote.creator_name || 'Unknown';

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

    if (quote.status === 'Won') {
      metrics.wonCount++;
      metrics.revenue += quote.total_value || 0;
    }
  });

  // Sort by quote count (highest first)
  return Array.from(userMap.values()).sort((a, b) => b.proposalCount - a.proposalCount);
};

/**
 * Calculate product metrics by wall type
 * Note: Counts all walls in all quotes (if a quote has 2 walls, both are counted)
 */
export const calculateProductMetrics = (quotes: Proposal[]): ProductMetrics[] => {
  const productMap = new Map<string, ProductMetrics>();

  quotes.forEach((quote) => {
    // Get all wall types from wall_details
    const walls = quote.wall_details?.walls || {};
    Object.values(walls).forEach((wall: any) => {
      const productType = wall.wallSystemType || 'Other';

      if (!productMap.has(productType)) {
        productMap.set(productType, {
          productType,
          proposalCount: 0,
          revenue: 0,
        });
      }

      const metrics = productMap.get(productType)!;
      metrics.proposalCount++;

      if (quote.status === 'Won') {
        metrics.revenue += quote.total_value || 0;
      }
    });
  });

  // Sort by quote count (highest first)
  return Array.from(productMap.values()).sort((a, b) => b.proposalCount - a.proposalCount);
};

/**
 * Calculate product metrics broken down by model
 * Note: Counts all walls in all quotes (if a quote has 2 walls, both are counted)
 */
export const calculateProductModelMetrics = (quotes: Proposal[]): ProductModelMetrics[] => {
  const modelMap = new Map<string, ProductModelMetrics>();

  quotes.forEach((quote) => {
    // Get all wall types from wall_details
    const walls = quote.wall_details?.walls || {};
    Object.values(walls).forEach((wall: any) => {
      const productType = wall.wallSystemType || 'Other';

      // Get model for all product types (Operable, Glass, Accordion)
      const model = wall.model || 'Other';

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

      if (quote.status === 'Won') {
        metrics.revenue += quote.total_value || 0;
      }
    });
  });

  // Sort by product type first, then by quote count
  return Array.from(modelMap.values()).sort((a, b) => {
    if (a.productType !== b.productType) {
      return a.productType.localeCompare(b.productType);
    }
    return b.proposalCount - a.proposalCount;
  });
};

/**
 * Calculate averages over time (profit, revenue, value per quote)
 */
export const calculateAveragesOverTime = (
  quotes: Proposal[],
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
        const periodProposals = filterProposalsByDateRange(quotes, dayStart, dayEnd, 'submitted_at');

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
        const periodProposals = filterProposalsByDateRange(quotes, dayStart, dayEnd, 'submitted_at');

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
        const periodProposals = filterProposalsByDateRange(quotes, monthStart, monthEnd, 'submitted_at');

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
  quotes: Proposal[],
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

    // Revenue: Won quotes in this period
    const wonProposals = filterProposalsByDateRange(quotes, periodStart, periodEnd, 'won_at')
      .filter((q) => q.status === 'Won');
    const revenue = wonProposals.reduce((sum, q) => sum + (q.total_value || 0), 0);

    // Quoted Value: All submitted/won/rejected quotes in this period
    const submittedProposals = filterProposalsByDateRange(quotes, periodStart, periodEnd, 'submitted_at')
      .filter((q) => q.status === 'Submitted' || q.status === 'Won' || q.status === 'Rejected');
    const quotedValue = submittedProposals.reduce((sum, q) => sum + (q.total_value || 0), 0);

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
  quotes: Proposal[],
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

        // Revenue: Won quotes in this period
        const wonProposals = filterProposalsByDateRange(quotes, dayStart, dayEnd, 'won_at')
          .filter((q) => q.status === 'Won' && (q.is_main_version === true || q.is_main_version === undefined));
        const revenue = wonProposals.reduce((sum, q) => sum + (q.total_value || 0), 0);

        // Gross Profit: Calculate from won quotes
        let grossProfit = 0;
        wonProposals.forEach((q) => {
          const profitAmount = q.price_details?.final_selling_price_profit_amount;
          if (profitAmount !== undefined && profitAmount !== null) {
            grossProfit += profitAmount;
          } else if (q.margin_percentage && q.total_value) {
            grossProfit += q.total_value * (q.margin_percentage / 100);
          }
        });

        // Pipeline Value: All quotes in Won/Draft/Submitted/Rejected status
        const pipelineProposals = filterProposalsByDateRange(quotes, dayStart, dayEnd, 'created_at')
          .filter((q) =>
            (q.status === 'Won' || q.status === 'Draft' || q.status === 'Submitted' || q.status === 'Rejected') &&
            (q.is_main_version === true || q.is_main_version === undefined)
          );
        const pipelineValue = pipelineProposals.reduce((sum, q) => sum + (q.total_value || 0), 0);

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

        // Revenue: Won quotes in this period
        const wonProposals = filterProposalsByDateRange(quotes, dayStart, dayEnd, 'won_at')
          .filter((q) => q.status === 'Won' && (q.is_main_version === true || q.is_main_version === undefined));
        const revenue = wonProposals.reduce((sum, q) => sum + (q.total_value || 0), 0);

        // Gross Profit: Calculate from won quotes
        let grossProfit = 0;
        wonProposals.forEach((q) => {
          const profitAmount = q.price_details?.final_selling_price_profit_amount;
          if (profitAmount !== undefined && profitAmount !== null) {
            grossProfit += profitAmount;
          } else if (q.margin_percentage && q.total_value) {
            grossProfit += q.total_value * (q.margin_percentage / 100);
          }
        });

        // Pipeline Value: All quotes in Won/Draft/Submitted/Rejected status
        const pipelineProposals = filterProposalsByDateRange(quotes, dayStart, dayEnd, 'created_at')
          .filter((q) =>
            (q.status === 'Won' || q.status === 'Draft' || q.status === 'Submitted' || q.status === 'Rejected') &&
            (q.is_main_version === true || q.is_main_version === undefined)
          );
        const pipelineValue = pipelineProposals.reduce((sum, q) => sum + (q.total_value || 0), 0);

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

        // Revenue: Won quotes in this period
        const wonProposals = filterProposalsByDateRange(quotes, monthStart, monthEnd, 'won_at')
          .filter((q) => q.status === 'Won' && (q.is_main_version === true || q.is_main_version === undefined));
        const revenue = wonProposals.reduce((sum, q) => sum + (q.total_value || 0), 0);

        // Gross Profit: Calculate from won quotes
        let grossProfit = 0;
        wonProposals.forEach((q) => {
          const profitAmount = q.price_details?.final_selling_price_profit_amount;
          if (profitAmount !== undefined && profitAmount !== null) {
            grossProfit += profitAmount;
          } else if (q.margin_percentage && q.total_value) {
            grossProfit += q.total_value * (q.margin_percentage / 100);
          }
        });

        // Pipeline Value: All quotes in Won/Draft/Submitted/Rejected status
        const pipelineProposals = filterProposalsByDateRange(quotes, monthStart, monthEnd, 'created_at')
          .filter((q) =>
            (q.status === 'Won' || q.status === 'Draft' || q.status === 'Submitted' || q.status === 'Rejected') &&
            (q.is_main_version === true || q.is_main_version === undefined)
          );
        const pipelineValue = pipelineProposals.reduce((sum, q) => sum + (q.total_value || 0), 0);

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
  quotes: Proposal[],
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

        const wonProposals = filterProposalsByDateRange(quotes, dayStart, dayEnd, 'won_at')
          .filter((q) => q.status === 'Won' && (q.is_main_version === true || q.is_main_version === undefined));

        const rejectedProposals = filterProposalsByDateRange(quotes, dayStart, dayEnd, 'rejected_at')
          .filter((q) => q.status === 'Rejected' && (q.is_main_version === true || q.is_main_version === undefined));

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

        const wonProposals = filterProposalsByDateRange(quotes, dayStart, dayEnd, 'won_at')
          .filter((q) => q.status === 'Won' && (q.is_main_version === true || q.is_main_version === undefined));

        const rejectedProposals = filterProposalsByDateRange(quotes, dayStart, dayEnd, 'rejected_at')
          .filter((q) => q.status === 'Rejected' && (q.is_main_version === true || q.is_main_version === undefined));

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

        const wonProposals = filterProposalsByDateRange(quotes, monthStart, monthEnd, 'won_at')
          .filter((q) => q.status === 'Won' && (q.is_main_version === true || q.is_main_version === undefined));

        const rejectedProposals = filterProposalsByDateRange(quotes, monthStart, monthEnd, 'rejected_at')
          .filter((q) => q.status === 'Rejected' && (q.is_main_version === true || q.is_main_version === undefined));

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
 * Filter quotes to only include main versions
 * This prevents counting the same quote multiple times across versions
 */
export const filterMainVersionProposals = (quotes: Proposal[]): Proposal[] => {
  return quotes.filter((q) => q.is_main_version === true || q.is_main_version === undefined);
};

/**
 * Generate complete analytics summary
 * Note: Automatically filters for main version quotes only to prevent skewing
 */
export const generateAnalyticsSummary = (
  quotes: Proposal[],
  period: TimePeriod = 'monthly'
): AnalyticsSummary => {
  // Filter to main versions only to avoid double-counting
  const mainVersionProposals = filterMainVersionProposals(quotes);

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
      (qs) => qs.filter((q) => q.status === 'Submitted' || q.status === 'Won' || q.status === 'Rejected').length,
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
  };
};
