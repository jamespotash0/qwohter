/**
 * Get Analytics Tool
 *
 * Fetches dashboard metrics and statistics (read-only, no confirmation needed).
 */

import { createTool } from './toolRegistry.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface GetAnalyticsParams {
  time_period?: 'week' | 'month' | 'quarter' | 'year' | 'all';
}

type ProposalRow = {
  status: 'Draft' | 'Submitted' | 'Won' | 'Rejected';
  total_value: number | null;
  created_at: string;
};

export const getAnalyticsTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'get_analytics',
      description:
        'Get dashboard analytics and metrics. Use this when user asks about performance, win rates, proposal counts, revenue totals, or any statistical questions about their business.',
      parameters: {
        type: 'object',
        properties: {
          time_period: {
            type: ['string', 'null'],
            enum: ['week', 'month', 'quarter', 'year', 'all', null as unknown as string],
            description: 'Time period for analytics (defaults to all time)',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  metadata: {
    requiresConfirmation: false, // Read-only operation
    requiresProposalId: false,
    category: 'search',
  },
  execute: async (params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const { supabase, organizationId } = context;
    const analyticsParams = params as GetAnalyticsParams;

    console.log('[get_analytics] Fetching analytics:', { organizationId, ...analyticsParams });

    // Build date filter based on time period
    let dateFilter: Date | null = null;
    const now = new Date();

    switch (analyticsParams.time_period) {
      case 'week':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    // Fetch proposals
    let query = supabase
      .from('proposals')
      .select('status, total_value, created_at')
      .eq('organization_id', organizationId);

    if (dateFilter) {
      query = query.gte('created_at', dateFilter.toISOString());
    }

    const { data: proposals, error } = await query;

    if (error) {
      console.error('[get_analytics] Failed to fetch proposals:', error);
      return { success: false, error: `Failed to fetch analytics: ${error.message}` };
    }

    const typedProposals = (proposals ?? []) as ProposalRow[];

    // Calculate stats
    const totalProposals = typedProposals.length;
    const draftProposals = typedProposals.filter(p => p.status === 'Draft').length;
    const submittedProposals = typedProposals.filter(p => p.status === 'Submitted').length;
    const wonProposals = typedProposals.filter(p => p.status === 'Won').length;
    const rejectedProposals = typedProposals.filter(p => p.status === 'Rejected').length;
    const totalValue = typedProposals.reduce((sum, p) => sum + (p.total_value || 0), 0);
    const wonValue = typedProposals
      .filter(p => p.status === 'Won')
      .reduce((sum, p) => sum + (p.total_value || 0), 0);

    // Win rate = Won / (Won + Rejected) * 100
    const decidedProposals = wonProposals + rejectedProposals;
    const winRate = decidedProposals > 0 ? Math.round((wonProposals / decidedProposals) * 100) : 0;

    // Average proposal value
    const avgValue = totalProposals > 0 ? Math.round(totalValue / totalProposals) : 0;

    const periodLabel = analyticsParams.time_period || 'all time';

    return {
      success: true,
      data: {
        id: 'analytics',
        title: `Analytics for ${periodLabel}`,
        type: 'analytics',
        period: periodLabel,
        totalProposals,
        draftProposals,
        submittedProposals,
        wonProposals,
        rejectedProposals,
        totalValue,
        wonValue,
        winRate,
        avgValue,
        summary: `${totalProposals} proposals (${draftProposals} draft, ${submittedProposals} submitted, ${wonProposals} won, ${rejectedProposals} rejected). Win rate: ${winRate}%. Total value: $${totalValue.toLocaleString()}. Won value: $${wonValue.toLocaleString()}.`,
      },
    };
  },
});
