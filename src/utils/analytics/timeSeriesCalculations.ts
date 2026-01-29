/**
 * Time Series Analytics Calculations
 *
 * Functions for generating time-based data points: averages over time,
 * totals over time, won/rejected over time, and cumulative converters.
 */

import type { Proposal } from '@/services/proposalsService';
import { startOfWeek, startOfMonth, startOfYear, endOfMonth, addDays, format, subWeeks, subMonths, subYears, getDaysInMonth } from 'date-fns';
import type {
  TimePeriod,
  TimeSeriesDataPoint,
  AveragesOverTimeData,
  TotalsOverTimeData,
  WonRejectedOverTimeData,
  RevenueVsQuotedData,
} from './coreCalculations';
import {
  filterProposalsByDateRange,
  formatDateForPeriod,
  calculateTotalRevenue,
  calculateConversionRate,
  calculateAverageGrossProfitPerProposal,
  calculateAverageRevenuePerProposal,
  calculateAverageProposalValue,
} from './coreCalculations';

// ─── Group Proposals By Period ───────────────────────────────────────

export const groupProposalsByPeriod = (
  proposals: Proposal[],
  period: TimePeriod,
  periodsToShow: number = 12
): TimeSeriesDataPoint[] => {
  const now = new Date();
  const dataPoints: TimeSeriesDataPoint[] = [];

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

    const periodProposals = filterProposalsByDateRange(proposals, periodStart, periodEnd, 'submitted_at');
    const wonProposals = filterProposalsByDateRange(proposals, periodStart, periodEnd, 'won_at')
      .filter((p) => p.status === 'Won' && (p.is_main_version === true || p.is_main_version === undefined));
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

// ─── Averages Over Time ──────────────────────────────────────────────

export const calculateAveragesOverTime = (
  proposals: Proposal[],
  period: TimePeriod,
  periodsToShow: number = 12,
  periodOffset: number = 0
): AveragesOverTimeData[] => {
  let baseDate = new Date();

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
      const weekStart = startOfWeek(baseDate, { weekStartsOn: 0 });
      for (let i = 0; i < 7; i++) {
        const dayStart = addDays(weekStart, i);
        const dayEnd = addDays(dayStart, 1);
        const periodProposals = filterProposalsByDateRange(proposals, dayStart, dayEnd, 'created_at');

        dataPoints.push({
          date: format(dayStart, 'EEE M/d'),
          avgGrossProfit: calculateAverageGrossProfitPerProposal(periodProposals),
          avgRevenue: calculateAverageRevenuePerProposal(periodProposals),
          avgValue: calculateAverageProposalValue(periodProposals),
        });
      }
      break;
    }
    case 'monthly': {
      const monthStart = startOfMonth(baseDate);
      const daysInMonth = getDaysInMonth(baseDate);
      for (let i = 0; i < daysInMonth; i++) {
        const dayStart = addDays(monthStart, i);
        const dayEnd = addDays(dayStart, 1);
        const periodProposals = filterProposalsByDateRange(proposals, dayStart, dayEnd, 'created_at');

        dataPoints.push({
          date: format(dayStart, 'd'),
          fullDate: dayStart,
          avgGrossProfit: calculateAverageGrossProfitPerProposal(periodProposals),
          avgRevenue: calculateAverageRevenuePerProposal(periodProposals),
          avgValue: calculateAverageProposalValue(periodProposals),
        });
      }
      break;
    }
    case 'yearly': {
      const yearStart = startOfYear(baseDate);
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(yearStart);
        monthStart.setMonth(i);
        const monthEnd = endOfMonth(monthStart);
        const periodProposals = filterProposalsByDateRange(proposals, monthStart, monthEnd, 'created_at');

        dataPoints.push({
          date: format(monthStart, "MMM ''yy"),
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

// ─── Revenue vs Quoted Over Time ─────────────────────────────────────

export const calculateRevenueVsQuoted = (
  proposals: Proposal[],
  period: TimePeriod,
  periodsToShow: number = 12
): RevenueVsQuotedData[] => {
  const now = new Date();
  const dataPoints: RevenueVsQuotedData[] = [];

  for (let i = periodsToShow - 1; i >= 0; i--) {
    let periodStart: Date;
    let periodEnd: Date;

    switch (period) {
      case 'weekly':
        periodStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 0 });
        periodEnd = startOfWeek(subWeeks(now, i - 1), { weekStartsOn: 0 });
        break;
      case 'monthly': {
        const monthStart = startOfMonth(now);
        const totalDays = Math.floor((now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));
        const dayInterval = Math.floor(totalDays / (periodsToShow - 1));
        periodStart = new Date(monthStart);
        periodStart.setDate(monthStart.getDate() + (i * dayInterval));
        periodEnd = new Date(monthStart);
        periodEnd.setDate(monthStart.getDate() + ((i + 1) * dayInterval));
        break;
      }
      case 'yearly': {
        const yearStart = startOfYear(now);
        periodStart = new Date(yearStart);
        periodStart.setMonth(periodsToShow - 1 - i);
        periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodStart.getMonth() + 1);
        break;
      }
    }

    const wonProposals = filterProposalsByDateRange(proposals, periodStart, periodEnd, 'won_at')
      .filter((p) => p.status === 'Won');
    const revenue = wonProposals.reduce((sum, p) => sum + (p.total_value || 0), 0);

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

// ─── Totals Over Time (with corrected pipeline) ─────────────────────

/**
 * Helper to compute totals for a single time bucket.
 * Pipeline value = Draft + Submitted only (open/undecided proposals).
 */
const computePeriodTotals = (proposals: Proposal[], dayStart: Date, dayEnd: Date) => {
  const periodProposals = filterProposalsByDateRange(proposals, dayStart, dayEnd, 'created_at')
    .filter((p) => p.is_main_version === true || p.is_main_version === undefined);

  const wonProposals = periodProposals.filter((p) => p.status === 'Won');
  const revenue = wonProposals.reduce((sum, p) => sum + (p.total_value || 0), 0);

  let grossProfit = 0;
  wonProposals.forEach((p) => {
    const profitAmount = p.form_data?.pricing?.summary?.grossProfit;
    if (profitAmount !== undefined && profitAmount !== null) {
      grossProfit += profitAmount;
    }
  });

  // Pipeline = open proposals only (Draft + Submitted)
  const pipelineProposals = periodProposals.filter((p) =>
    p.status === 'Draft' || p.status === 'Submitted'
  );
  const pipelineValue = pipelineProposals.reduce((sum, p) => sum + (p.total_value || 0), 0);

  // Total value quoted = all proposals created in this period
  const totalValueQuoted = periodProposals.reduce((sum, p) => sum + (p.total_value || 0), 0);

  return { revenue, grossProfit, pipelineValue, totalValueQuoted, proposalCount: periodProposals.length };
};

export const calculateTotalsOverTime = (
  proposals: Proposal[],
  period: TimePeriod,
  periodsToShow: number = 12,
  periodOffset: number = 0
): TotalsOverTimeData[] => {
  let baseDate = new Date();

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
      const weekStart = startOfWeek(baseDate, { weekStartsOn: 0 });
      for (let i = 0; i < 7; i++) {
        const dayStart = addDays(weekStart, i);
        const dayEnd = addDays(dayStart, 1);
        const totals = computePeriodTotals(proposals, dayStart, dayEnd);
        dataPoints.push({
          date: format(dayStart, 'EEE M/d'),
          ...totals,
        });
      }
      break;
    }
    case 'monthly': {
      const monthStart = startOfMonth(baseDate);
      const daysInMonth = getDaysInMonth(baseDate);
      for (let i = 0; i < daysInMonth; i++) {
        const dayStart = addDays(monthStart, i);
        const dayEnd = addDays(dayStart, 1);
        const totals = computePeriodTotals(proposals, dayStart, dayEnd);
        dataPoints.push({
          date: format(dayStart, 'd'),
          fullDate: dayStart,
          ...totals,
        });
      }
      break;
    }
    case 'yearly': {
      const yearStart = startOfYear(baseDate);
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(yearStart);
        monthStart.setMonth(i);
        const monthEnd = endOfMonth(monthStart);
        const totals = computePeriodTotals(proposals, monthStart, monthEnd);
        dataPoints.push({
          date: format(monthStart, "MMM ''yy"),
          ...totals,
        });
      }
      break;
    }
  }

  return dataPoints;
};

// ─── Won vs Rejected Over Time ──────────────────────────────────────

export const calculateWonRejectedOverTime = (
  proposals: Proposal[],
  period: TimePeriod,
  periodsToShow: number = 12,
  periodOffset: number = 0
): WonRejectedOverTimeData[] => {
  let baseDate = new Date();

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
      const weekStart = startOfWeek(baseDate, { weekStartsOn: 0 });
      for (let i = 0; i < 7; i++) {
        const dayStart = addDays(weekStart, i);
        const dayEnd = addDays(dayStart, 1);

        const wonProposals = filterProposalsByDateRange(proposals, dayStart, dayEnd, 'won_at')
          .filter((p) => p.status === 'Won' && (p.is_main_version === true || p.is_main_version === undefined));
        const rejectedProposals = filterProposalsByDateRange(proposals, dayStart, dayEnd, 'rejected_at')
          .filter((p) => p.status === 'Rejected' && (p.is_main_version === true || p.is_main_version === undefined));

        dataPoints.push({ date: format(dayStart, 'EEE M/d'), wonCount: wonProposals.length, rejectedCount: rejectedProposals.length });
      }
      break;
    }
    case 'monthly': {
      const monthStart = startOfMonth(baseDate);
      const daysInMonth = getDaysInMonth(baseDate);
      for (let i = 0; i < daysInMonth; i++) {
        const dayStart = addDays(monthStart, i);
        const dayEnd = addDays(dayStart, 1);

        const wonProposals = filterProposalsByDateRange(proposals, dayStart, dayEnd, 'won_at')
          .filter((p) => p.status === 'Won' && (p.is_main_version === true || p.is_main_version === undefined));
        const rejectedProposals = filterProposalsByDateRange(proposals, dayStart, dayEnd, 'rejected_at')
          .filter((p) => p.status === 'Rejected' && (p.is_main_version === true || p.is_main_version === undefined));

        dataPoints.push({ date: format(dayStart, 'd'), fullDate: dayStart, wonCount: wonProposals.length, rejectedCount: rejectedProposals.length });
      }
      break;
    }
    case 'yearly': {
      const yearStart = startOfYear(baseDate);
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(yearStart);
        monthStart.setMonth(i);
        const monthEnd = endOfMonth(monthStart);

        const wonProposals = filterProposalsByDateRange(proposals, monthStart, monthEnd, 'won_at')
          .filter((p) => p.status === 'Won' && (p.is_main_version === true || p.is_main_version === undefined));
        const rejectedProposals = filterProposalsByDateRange(proposals, monthStart, monthEnd, 'rejected_at')
          .filter((p) => p.status === 'Rejected' && (p.is_main_version === true || p.is_main_version === undefined));

        dataPoints.push({ date: format(monthStart, "MMM ''yy"), wonCount: wonProposals.length, rejectedCount: rejectedProposals.length });
      }
      break;
    }
  }

  return dataPoints;
};

// ─── Cumulative Converters ───────────────────────────────────────────

export const makeAveragesCumulative = (data: AveragesOverTimeData[]): AveragesOverTimeData[] => {
  let cumulativeGrossProfit = 0;
  let cumulativeRevenue = 0;
  let cumulativeValue = 0;

  return data.map((point) => {
    cumulativeGrossProfit += point.avgGrossProfit;
    cumulativeRevenue += point.avgRevenue;
    cumulativeValue += point.avgValue;
    return { ...point, avgGrossProfit: cumulativeGrossProfit, avgRevenue: cumulativeRevenue, avgValue: cumulativeValue };
  });
};

export const makeTotalsCumulative = (data: TotalsOverTimeData[]): TotalsOverTimeData[] => {
  let cumulativeRevenue = 0;
  let cumulativeGrossProfit = 0;
  let cumulativePipeline = 0;
  let cumulativeValueQuoted = 0;

  return data.map((point) => {
    cumulativeRevenue += point.revenue;
    cumulativeGrossProfit += point.grossProfit;
    cumulativePipeline += point.pipelineValue;
    cumulativeValueQuoted += point.totalValueQuoted;
    return { ...point, revenue: cumulativeRevenue, grossProfit: cumulativeGrossProfit, pipelineValue: cumulativePipeline, totalValueQuoted: cumulativeValueQuoted };
  });
};

export const makeWonRejectedCumulative = (data: WonRejectedOverTimeData[]): WonRejectedOverTimeData[] => {
  let cumulativeWon = 0;
  let cumulativeRejected = 0;

  return data.map((point) => {
    cumulativeWon += point.wonCount;
    cumulativeRejected += point.rejectedCount;
    return { ...point, wonCount: cumulativeWon, rejectedCount: cumulativeRejected };
  });
};
