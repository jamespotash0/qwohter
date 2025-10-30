/**
 * Analytics Calculation Utilities
 *
 * Processes quote data to generate comprehensive analytics metrics including:
 * - Revenue metrics (total, growth, averages)
 * - Conversion metrics (win rate, loss rate)
 * - Time-based breakdowns (weekly, monthly, yearly)
 * - Quote source performance
 */

import { Quote } from '@/stores/quotes/quotesStore';
import { startOfWeek, startOfMonth, startOfYear, format, subWeeks, subMonths, subYears } from 'date-fns';

export type TimePeriod = 'weekly' | 'monthly' | 'yearly';

export interface TimeSeriesDataPoint {
  date: string;
  revenue: number;
  quoteCount: number;
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

export interface QuoteSourceMetrics {
  source: string;
  quoteCount: number;
  revenue: number;
  wonCount: number;
  conversionRate: number;
  referralType?: string; // For referral breakdowns (contractor, architect, manufacturer)
}

export interface QuoteStatusBreakdown {
  incomplete: number;
  draft: number;
  submitted: number;
  won: number;
  rejected: number;
}

export interface UserQuoteMetrics {
  userName: string;
  quoteCount: number;
  wonCount: number;
  revenue: number;
}

export interface ProductMetrics {
  productType: string; // Operable Wall, Glass Wall, Accordion Wall
  quoteCount: number;
  revenue: number;
}

export interface ProductModelMetrics {
  productType: string; // Operable Wall, Glass Wall, Accordion Partition
  model: string; // Model for all product types
  quoteCount: number;
  revenue: number;
}

export interface RevenueVsQuotedData {
  date: string;
  revenue: number; // Won quotes total
  quotedValue: number; // All submitted quotes total
}

export interface AveragesOverTimeData {
  date: string;
  avgGrossProfit: number;
  avgRevenue: number;
  avgValue: number;
}

export interface TotalsOverTimeData {
  date: string;
  revenue: number; // Total revenue (won quotes)
  grossProfit: number; // Total gross profit (won quotes)
  pipelineValue: number; // Total pipeline value (all quotes in Won/Draft/Submitted/Rejected)
}

export interface AnalyticsSummary {
  totalRevenue: MetricWithTrend;
  quotesSent: MetricWithTrend;
  conversionRate: MetricWithTrend;
  averageQuoteValue: MetricWithTrend;
  timeSeriesData: TimeSeriesDataPoint[];
  sourceMetrics: QuoteSourceMetrics[];
  statusBreakdown: QuoteStatusBreakdown;
  userMetrics: UserQuoteMetrics[];
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
export const filterQuotesByDateRange = (
  quotes: Quote[],
  startDate: Date,
  endDate: Date = new Date(),
  dateField: 'created_at' | 'submitted_at' | 'won_at' | 'rejected_at' = 'created_at'
): Quote[] => {
  return quotes.filter((quote) => {
    const quoteDate = quote[dateField] ? new Date(quote[dateField]!) : null;
    if (!quoteDate) return false;
    return quoteDate >= startDate && quoteDate <= endDate;
  });
};

/**
 * Calculate total revenue from quotes
 */
export const calculateTotalRevenue = (quotes: Quote[]): number => {
  return quotes
    .filter((q) => q.status === 'Won')
    .reduce((sum, q) => sum + (q.total_value || 0), 0);
};

/**
 * Calculate win rate (% of decided quotes that were won)
 * Formula: Won / (Won + Rejected) * 100
 * This excludes pending/draft/incomplete quotes - only counts decided outcomes
 */
export const calculateWinRate = (quotes: Quote[]): number => {
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
export const calculateConversionRate = (quotes: Quote[]): number => {
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
export const calculateAverageQuoteValue = (quotes: Quote[]): number => {
  const submittedQuotes = quotes.filter((q) =>
    (q.status === 'Submitted' || q.status === 'Won' || q.status === 'Rejected') &&
    q.total_value &&
    q.total_value > 0
  );
  if (submittedQuotes.length === 0) return 0;

  const total = submittedQuotes.reduce((sum, q) => sum + (q.total_value || 0), 0);
  return total / submittedQuotes.length;
};

/**
 * Calculate average revenue per quote (won quotes only)
 */
export const calculateAverageRevenuePerQuote = (quotes: Quote[]): number => {
  const wonQuotes = quotes.filter((q) => q.status === 'Won' && q.total_value && q.total_value > 0);
  if (wonQuotes.length === 0) return 0;

  const totalRevenue = wonQuotes.reduce((sum, q) => sum + (q.total_value || 0), 0);
  return totalRevenue / wonQuotes.length;
};

/**
 * Calculate average gross profit per quote (won quotes only)
 */
export const calculateAverageGrossProfitPerQuote = (quotes: Quote[]): number => {
  const wonQuotes = quotes.filter((q) => q.status === 'Won');
  if (wonQuotes.length === 0) return 0;

  let totalProfit = 0;
  let quotesWithProfit = 0;

  wonQuotes.forEach((q) => {
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
export const groupQuotesByPeriod = (
  quotes: Quote[],
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
    const periodQuotes = filterQuotesByDateRange(quotes, periodStart, periodEnd, 'submitted_at');

    // For won quotes - use won_at to show when they were actually won
    const wonQuotes = filterQuotesByDateRange(quotes, periodStart, periodEnd, 'won_at')
      .filter((q) => q.status === 'Won' && (q.is_main_version === true || q.is_main_version === undefined));

    // For rejected quotes - use rejected_at to show when they were actually rejected
    const rejectedQuotes = filterQuotesByDateRange(quotes, periodStart, periodEnd, 'rejected_at')
      .filter((q) => q.status === 'Rejected' && (q.is_main_version === true || q.is_main_version === undefined));

    const revenue = calculateTotalRevenue(wonQuotes);
    const conversionRate = calculateConversionRate(periodQuotes);

    dataPoints.push({
      date: formatDateForPeriod(periodStart, period),
      revenue,
      quoteCount: periodQuotes.length,
      wonCount: wonQuotes.length,
      rejectedCount: rejectedQuotes.length,
      conversionRate,
    });
  }

  return dataPoints;
};

/**
 * Calculate metric with trend
 */
export const calculateMetricWithTrend = (
  quotes: Quote[],
  period: TimePeriod,
  calculator: (quotes: Quote[]) => number,
  formatter: (value: number) => string
): MetricWithTrend => {
  const now = new Date();
  const currentPeriodStart = getStartDate(period, now);
  const previousPeriodStart = getPreviousPeriodStart(period, currentPeriodStart);

  // Current period
  const currentQuotes = filterQuotesByDateRange(quotes, currentPeriodStart, now, 'submitted_at');
  const currentValue = calculator(currentQuotes);

  // Previous period
  const previousQuotes = filterQuotesByDateRange(quotes, previousPeriodStart, currentPeriodStart, 'submitted_at');
  const previousValue = calculator(previousQuotes);

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
export const calculateSourceMetrics = (quotes: Quote[]): QuoteSourceMetrics[] => {
  const sourceMap = new Map<string, QuoteSourceMetrics>();

  // Only consider submitted/won/rejected quotes
  const relevantQuotes = quotes.filter((q) =>
    q.status === 'Submitted' || q.status === 'Won' || q.status === 'Rejected'
  );

  relevantQuotes.forEach((quote) => {
    const source = quote.quote_source || 'Unknown';

    if (!sourceMap.has(source)) {
      sourceMap.set(source, {
        source,
        quoteCount: 0,
        revenue: 0,
        wonCount: 0,
        conversionRate: 0,
      });
    }

    const metrics = sourceMap.get(source)!;
    metrics.quoteCount++;

    if (quote.status === 'Won') {
      metrics.wonCount++;
      metrics.revenue += quote.total_value || 0;
    }
  });

  // Calculate conversion rates
  const metricsArray = Array.from(sourceMap.values());
  metricsArray.forEach((metrics) => {
    metrics.conversionRate = metrics.quoteCount > 0
      ? (metrics.wonCount / metrics.quoteCount) * 100
      : 0;
  });

  // Sort by revenue (highest first)
  return metricsArray.sort((a, b) => b.revenue - a.revenue);
};

/**
 * Calculate quote status breakdown
 */
export const calculateStatusBreakdown = (quotes: Quote[]): QuoteStatusBreakdown => {
  return {
    incomplete: quotes.filter((q) => !q.status || q.status === 'Incomplete').length,
    draft: quotes.filter((q) => q.status === 'Draft').length,
    submitted: quotes.filter((q) => q.status === 'Submitted').length,
    won: quotes.filter((q) => q.status === 'Won').length,
    rejected: quotes.filter((q) => q.status === 'Rejected').length,
  };
};

/**
 * Calculate metrics by user
 * Note: Counts ALL quotes (regardless of status) to show team member activity
 */
export const calculateUserMetrics = (quotes: Quote[]): UserQuoteMetrics[] => {
  const userMap = new Map<string, UserQuoteMetrics>();

  quotes.forEach((quote) => {
    // Use created_by_name as the primary field
    const userName = quote.created_by_name || quote.creator_name || 'Unknown';

    if (!userMap.has(userName)) {
      userMap.set(userName, {
        userName,
        quoteCount: 0,
        wonCount: 0,
        revenue: 0,
      });
    }

    const metrics = userMap.get(userName)!;
    metrics.quoteCount++;

    if (quote.status === 'Won') {
      metrics.wonCount++;
      metrics.revenue += quote.total_value || 0;
    }
  });

  // Sort by quote count (highest first)
  return Array.from(userMap.values()).sort((a, b) => b.quoteCount - a.quoteCount);
};

/**
 * Calculate product metrics by wall type
 * Note: Counts all walls in all quotes (if a quote has 2 walls, both are counted)
 */
export const calculateProductMetrics = (quotes: Quote[]): ProductMetrics[] => {
  const productMap = new Map<string, ProductMetrics>();

  quotes.forEach((quote) => {
    // Get all wall types from wall_details
    const walls = quote.wall_details?.walls || {};
    Object.values(walls).forEach((wall: any) => {
      const productType = wall.wallSystemType || 'Other';

      if (!productMap.has(productType)) {
        productMap.set(productType, {
          productType,
          quoteCount: 0,
          revenue: 0,
        });
      }

      const metrics = productMap.get(productType)!;
      metrics.quoteCount++;

      if (quote.status === 'Won') {
        metrics.revenue += quote.total_value || 0;
      }
    });
  });

  // Sort by quote count (highest first)
  return Array.from(productMap.values()).sort((a, b) => b.quoteCount - a.quoteCount);
};

/**
 * Calculate product metrics broken down by model
 * Note: Counts all walls in all quotes (if a quote has 2 walls, both are counted)
 */
export const calculateProductModelMetrics = (quotes: Quote[]): ProductModelMetrics[] => {
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
          quoteCount: 0,
          revenue: 0,
        });
      }

      const metrics = modelMap.get(key)!;
      metrics.quoteCount++;

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
    return b.quoteCount - a.quoteCount;
  });
};

/**
 * Calculate averages over time (profit, revenue, value per quote)
 */
export const calculateAveragesOverTime = (
  quotes: Quote[],
  period: TimePeriod,
  periodsToShow: number = 12
): AveragesOverTimeData[] => {
  const now = new Date();
  const dataPoints: AveragesOverTimeData[] = [];

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

    const periodQuotes = filterQuotesByDateRange(quotes, periodStart, periodEnd, 'submitted_at');

    dataPoints.push({
      date: formatDateForPeriod(periodStart, period),
      avgGrossProfit: calculateAverageGrossProfitPerQuote(periodQuotes),
      avgRevenue: calculateAverageRevenuePerQuote(periodQuotes),
      avgValue: calculateAverageQuoteValue(periodQuotes),
    });
  }

  return dataPoints;
};

/**
 * Calculate revenue vs quoted value over time
 */
export const calculateRevenueVsQuoted = (
  quotes: Quote[],
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
        periodStart = startOfMonth(subMonths(now, i));
        periodEnd = startOfMonth(subMonths(now, i - 1));
        break;
      case 'yearly':
        periodStart = startOfYear(subYears(now, i));
        periodEnd = startOfYear(subYears(now, i - 1));
        break;
    }

    // Revenue: Won quotes in this period
    const wonQuotes = filterQuotesByDateRange(quotes, periodStart, periodEnd, 'won_at')
      .filter((q) => q.status === 'Won');
    const revenue = wonQuotes.reduce((sum, q) => sum + (q.total_value || 0), 0);

    // Quoted Value: All submitted/won/rejected quotes in this period
    const submittedQuotes = filterQuotesByDateRange(quotes, periodStart, periodEnd, 'submitted_at')
      .filter((q) => q.status === 'Submitted' || q.status === 'Won' || q.status === 'Rejected');
    const quotedValue = submittedQuotes.reduce((sum, q) => sum + (q.total_value || 0), 0);

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
  quotes: Quote[],
  period: TimePeriod,
  periodsToShow: number = 12
): TotalsOverTimeData[] => {
  const now = new Date();
  const dataPoints: TotalsOverTimeData[] = [];

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

    // Revenue: Won quotes in this period
    const wonQuotes = filterQuotesByDateRange(quotes, periodStart, periodEnd, 'won_at')
      .filter((q) => q.status === 'Won' && (q.is_main_version === true || q.is_main_version === undefined));
    const revenue = wonQuotes.reduce((sum, q) => sum + (q.total_value || 0), 0);

    // Gross Profit: Calculate from won quotes
    let grossProfit = 0;
    wonQuotes.forEach((q) => {
      const profitAmount = q.price_details?.final_selling_price_profit_amount;
      if (profitAmount !== undefined && profitAmount !== null) {
        grossProfit += profitAmount;
      } else if (q.margin_percentage && q.total_value) {
        grossProfit += q.total_value * (q.margin_percentage / 100);
      }
    });

    // Pipeline Value: All quotes in Won/Draft/Submitted/Rejected status (excludes only Incomplete)
    // Use created_at as the date field since we want to capture when quotes entered the pipeline
    const pipelineQuotes = filterQuotesByDateRange(quotes, periodStart, periodEnd, 'created_at')
      .filter((q) =>
        (q.status === 'Won' || q.status === 'Draft' || q.status === 'Submitted' || q.status === 'Rejected') &&
        (q.is_main_version === true || q.is_main_version === undefined)
      );
    const pipelineValue = pipelineQuotes.reduce((sum, q) => sum + (q.total_value || 0), 0);

    dataPoints.push({
      date: formatDateForPeriod(periodStart, period),
      revenue,
      grossProfit,
      pipelineValue,
    });
  }

  return dataPoints;
};

/**
 * Filter quotes to only include main versions
 * This prevents counting the same quote multiple times across versions
 */
export const filterMainVersionQuotes = (quotes: Quote[]): Quote[] => {
  return quotes.filter((q) => q.is_main_version === true || q.is_main_version === undefined);
};

/**
 * Generate complete analytics summary
 * Note: Automatically filters for main version quotes only to prevent skewing
 */
export const generateAnalyticsSummary = (
  quotes: Quote[],
  period: TimePeriod = 'monthly'
): AnalyticsSummary => {
  // Filter to main versions only to avoid double-counting
  const mainVersionQuotes = filterMainVersionQuotes(quotes);

  return {
    totalRevenue: calculateMetricWithTrend(
      mainVersionQuotes,
      period,
      calculateTotalRevenue,
      formatCurrency
    ),
    quotesSent: calculateMetricWithTrend(
      mainVersionQuotes,
      period,
      (qs) => qs.filter((q) => q.status === 'Submitted' || q.status === 'Won' || q.status === 'Rejected').length,
      (v) => v.toString()
    ),
    conversionRate: calculateMetricWithTrend(
      mainVersionQuotes,
      period,
      calculateConversionRate,
      (v) => `${v.toFixed(1)}%`
    ),
    averageQuoteValue: calculateMetricWithTrend(
      mainVersionQuotes,
      period,
      calculateAverageQuoteValue,
      formatCurrency
    ),
    timeSeriesData: groupQuotesByPeriod(mainVersionQuotes, period, period === 'weekly' ? 12 : period === 'monthly' ? 12 : 5),
    sourceMetrics: calculateSourceMetrics(mainVersionQuotes),
    statusBreakdown: calculateStatusBreakdown(mainVersionQuotes),
    userMetrics: calculateUserMetrics(mainVersionQuotes),
    productMetrics: calculateProductMetrics(mainVersionQuotes),
    productModelMetrics: calculateProductModelMetrics(mainVersionQuotes),
    revenueVsQuoted: calculateRevenueVsQuoted(mainVersionQuotes, period, period === 'weekly' ? 12 : period === 'monthly' ? 12 : 5),
    averagesOverTime: calculateAveragesOverTime(mainVersionQuotes, period, period === 'weekly' ? 12 : period === 'monthly' ? 12 : 5),
    totalsOverTime: calculateTotalsOverTime(mainVersionQuotes, period, period === 'weekly' ? 12 : period === 'monthly' ? 12 : 5),
  };
};
