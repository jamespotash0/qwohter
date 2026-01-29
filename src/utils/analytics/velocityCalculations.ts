/**
 * Velocity Analytics Calculations
 *
 * Measures how fast proposals move through the pipeline:
 * - Average days to win (submitted → won)
 * - Average days to decision (submitted → won or rejected)
 * - Average days in draft (created → submitted)
 * - Stale proposals (submitted 30+ days with no decision)
 * - Time-to-win distribution (histogram buckets)
 * - Open pipeline value (Draft + Submitted only)
 */

import type { Proposal } from '@/services/proposalsService';
import { filterMainVersionProposals } from './coreCalculations';

// ─── Interfaces ──────────────────────────────────────────────────────

export interface VelocityMetrics {
  avgDaysToWin: number | null;
  avgDaysToDecision: number | null;
  avgDaysInDraft: number | null;
  medianDaysToWin: number | null;
  staleCount: number;
  staleProposals: StaleProposal[];
}

export interface StaleProposal {
  id: string;
  projectName: string;
  clientName: string;
  totalValue: number;
  submittedAt: Date;
  daysSinceSubmission: number;
}

export interface TimeToWinDistribution {
  bucket: string;
  count: number;
  avgValue: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────

const STALE_THRESHOLD_DAYS = 30;

/**
 * Compute day difference between two date strings.
 * Returns null if either date is missing.
 */
export const daysBetween = (start: string | null | undefined, end: string | null | undefined): number | null => {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
};

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// ─── Main Velocity Function ──────────────────────────────────────────

export const calculateVelocityMetrics = (proposals: Proposal[]): VelocityMetrics => {
  const mainVersions = filterMainVersionProposals(proposals);
  const now = new Date();

  // Days to win: submitted_at → won_at for Won proposals
  const daysToWinValues: number[] = [];
  mainVersions
    .filter((p) => p.status === 'Won')
    .forEach((p) => {
      const days = daysBetween(p.submitted_at, p.won_at);
      if (days !== null) daysToWinValues.push(days);
    });

  // Days to decision: submitted_at → (won_at or rejected_at) for decided proposals
  const daysToDecisionValues: number[] = [];
  mainVersions
    .filter((p) => p.status === 'Won' || p.status === 'Rejected')
    .forEach((p) => {
      const decisionDate = p.status === 'Won' ? p.won_at : p.rejected_at;
      const days = daysBetween(p.submitted_at, decisionDate);
      if (days !== null) daysToDecisionValues.push(days);
    });

  // Days in draft: created_at → submitted_at for proposals that have been submitted
  const daysInDraftValues: number[] = [];
  mainVersions
    .filter((p) => p.status === 'Submitted' || p.status === 'Won' || p.status === 'Rejected')
    .forEach((p) => {
      const days = daysBetween(p.created_at, p.submitted_at);
      if (days !== null) daysInDraftValues.push(days);
    });

  // Stale proposals: Submitted status with no decision for 30+ days
  const staleProposals: StaleProposal[] = [];
  mainVersions
    .filter((p) => p.status === 'Submitted' && p.submitted_at)
    .forEach((p) => {
      const submittedDate = new Date(p.submitted_at!);
      const daysSince = Math.round((now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= STALE_THRESHOLD_DAYS) {
        staleProposals.push({
          id: p.id,
          projectName: p.project_name || p.name || 'Untitled',
          clientName: p.client_name || 'Unknown',
          totalValue: p.total_value || 0,
          submittedAt: submittedDate,
          daysSinceSubmission: daysSince,
        });
      }
    });

  // Sort stale by longest waiting first
  staleProposals.sort((a, b) => b.daysSinceSubmission - a.daysSinceSubmission);

  const avg = (values: number[]): number | null =>
    values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

  return {
    avgDaysToWin: avg(daysToWinValues),
    avgDaysToDecision: avg(daysToDecisionValues),
    avgDaysInDraft: avg(daysInDraftValues),
    medianDaysToWin: median(daysToWinValues),
    staleCount: staleProposals.length,
    staleProposals,
  };
};

// ─── Time-to-Win Distribution ────────────────────────────────────────

export const calculateTimeToWinDistribution = (proposals: Proposal[]): TimeToWinDistribution[] => {
  const mainVersions = filterMainVersionProposals(proposals);

  const buckets: { min: number; max: number; label: string; days: number[]; values: number[] }[] = [
    { min: 0, max: 7, label: '0-7 days', days: [], values: [] },
    { min: 8, max: 14, label: '8-14 days', days: [], values: [] },
    { min: 15, max: 30, label: '15-30 days', days: [], values: [] },
    { min: 31, max: 60, label: '31-60 days', days: [], values: [] },
    { min: 61, max: Infinity, label: '60+ days', days: [], values: [] },
  ];

  mainVersions
    .filter((p) => p.status === 'Won')
    .forEach((p) => {
      const days = daysBetween(p.submitted_at, p.won_at);
      if (days === null) return;

      const bucket = buckets.find((b) => days >= b.min && days <= b.max);
      if (bucket) {
        bucket.days.push(days);
        bucket.values.push(p.total_value || 0);
      }
    });

  return buckets.map((b) => ({
    bucket: b.label,
    count: b.days.length,
    avgValue: b.values.length > 0 ? b.values.reduce((sum, v) => sum + v, 0) / b.values.length : 0,
  }));
};

// ─── Pipeline Value ──────────────────────────────────────────────────

/**
 * Calculate open pipeline value (Draft + Submitted only).
 * This is the total value of proposals that haven't been decided yet.
 */
export const calculatePipelineValue = (proposals: Proposal[]): number => {
  return filterMainVersionProposals(proposals)
    .filter((p) => p.status === 'Draft' || p.status === 'Submitted')
    .reduce((sum, p) => sum + (p.total_value || 0), 0);
};
