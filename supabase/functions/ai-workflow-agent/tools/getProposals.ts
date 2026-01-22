/**
 * Get Proposals Tool
 *
 * Search and list proposals with filters (read-only, no confirmation needed).
 */

import { createTool } from './toolRegistry.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface GetProposalsParams {
  status?: 'Draft' | 'Submitted' | 'Won' | 'Rejected';
  client_name?: string;
  search_term?: string;
  limit?: number;
}

type ProposalRow = {
  id: string;
  proposal_number: string;
  project_name: string | null;
  client_name: string | null;
  client_company: string | null;
  status: 'Draft' | 'Submitted' | 'Won' | 'Rejected';
  total_value: number | null;
  created_at: string;
  updated_at: string;
};

export const getProposalsTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'get_proposals',
      description:
        'Search and list proposals. Use this when user asks about specific proposals, wants to find proposals by client, status, or search for proposals. Returns a list of matching proposals with key details.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: ['string', 'null'],
            enum: ['Draft', 'Submitted', 'Won', 'Rejected', null as unknown as string],
            description: 'Filter by proposal status',
          },
          client_name: {
            type: ['string', 'null'],
            description: 'Filter by client name (partial match)',
          },
          search_term: {
            type: ['string', 'null'],
            description: 'Search in project name, client name, or company name',
          },
          limit: {
            type: ['number', 'null'],
            description: 'Maximum number of results (default 10, max 50)',
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
    const searchParams = params as GetProposalsParams;

    console.log('[get_proposals] Searching proposals:', { organizationId, ...searchParams });

    const resultLimit = Math.min(searchParams.limit || 10, 50);

    // Build query
    let query = supabase
      .from('proposals')
      .select('id, proposal_number, project_name, client_name, client_company, status, total_value, created_at, updated_at')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(resultLimit);

    // Apply filters
    if (searchParams.status) {
      query = query.eq('status', searchParams.status);
    }

    if (searchParams.client_name) {
      query = query.ilike('client_name', `%${searchParams.client_name}%`);
    }

    if (searchParams.search_term) {
      // Search across multiple fields using OR
      query = query.or(
        `project_name.ilike.%${searchParams.search_term}%,client_name.ilike.%${searchParams.search_term}%,client_company.ilike.%${searchParams.search_term}%`
      );
    }

    const { data: proposals, error } = await query;

    if (error) {
      console.error('[get_proposals] Failed to fetch proposals:', error);
      return { success: false, error: `Failed to fetch proposals: ${error.message}` };
    }

    const typedProposals = (proposals ?? []) as ProposalRow[];

    // Format results
    const formattedProposals = typedProposals.map(p => ({
      id: p.id,
      number: p.proposal_number,
      project: p.project_name || 'Untitled',
      client: p.client_name || 'Unknown',
      company: p.client_company || '',
      status: p.status,
      value: p.total_value ? `$${p.total_value.toLocaleString()}` : 'Not set',
      updated: new Date(p.updated_at).toLocaleDateString(),
    }));

    const totalValue = typedProposals.reduce((sum, p) => sum + (p.total_value || 0), 0);

    // Build summary
    let summary = `Found ${formattedProposals.length} proposal${formattedProposals.length !== 1 ? 's' : ''}`;
    if (searchParams.status) summary += ` with status "${searchParams.status}"`;
    if (searchParams.client_name) summary += ` for client "${searchParams.client_name}"`;
    if (searchParams.search_term) summary += ` matching "${searchParams.search_term}"`;
    summary += `. Total value: $${totalValue.toLocaleString()}.`;

    return {
      success: true,
      data: {
        id: 'proposals-search',
        title: 'Proposals Search',
        type: 'proposals',
        count: formattedProposals.length,
        totalValue,
        proposals: formattedProposals,
        summary,
      },
    };
  },
});
