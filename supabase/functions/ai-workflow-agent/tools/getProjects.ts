/**
 * Get Projects Tool
 *
 * Search and list projects on the project board (read-only, no confirmation needed).
 */

import { createTool } from './toolRegistry.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface GetProjectsParams {
  workflow_status?: string;
  priority?: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  search_term?: string;
  limit?: number;
}

type ProjectRow = {
  id: string;
  workflow_status: string;
  priority: string | null;
  board_order: number;
  created_at: string;
  updated_at: string;
  proposal_id: string;
  proposals: {
    id: string;
    proposal_number: string;
    project_name: string | null;
    client_name: string | null;
    total_value: number | null;
  } | null;
};

export const getProjectsTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'get_projects',
      description:
        'List projects on the project board. Use this when user asks about active projects, project status, or the Kanban board. Can filter by workflow status (e.g., "Planning", "In Progress") or priority.',
      parameters: {
        type: 'object',
        properties: {
          workflow_status: {
            type: ['string', 'null'],
            description: 'Filter by workflow column/status (e.g., "Planning", "In Progress", "On Hold", "Complete")',
          },
          priority: {
            type: ['string', 'null'],
            enum: ['Highest', 'High', 'Medium', 'Low', 'Lowest', null as unknown as string],
            description: 'Filter by priority level',
          },
          search_term: {
            type: ['string', 'null'],
            description: 'Search in project name or client name',
          },
          limit: {
            type: ['number', 'null'],
            description: 'Maximum number of results (default 20, max 50)',
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
    const searchParams = params as GetProjectsParams;

    console.log('[get_projects] Listing projects:', { organizationId, ...searchParams });

    const resultLimit = Math.min(searchParams.limit || 20, 50);

    // Build query - join with proposals to get project names
    let query = supabase
      .from('projects')
      .select(`
        id,
        workflow_status,
        priority,
        board_order,
        created_at,
        updated_at,
        proposal_id,
        proposals (
          id,
          proposal_number,
          project_name,
          client_name,
          total_value
        )
      `)
      .eq('organization_id', organizationId)
      .order('board_order', { ascending: true })
      .limit(resultLimit);

    // Apply filters
    if (searchParams.workflow_status) {
      query = query.eq('workflow_status', searchParams.workflow_status);
    }

    if (searchParams.priority) {
      query = query.eq('priority', searchParams.priority);
    }

    const { data: projects, error } = await query;

    if (error) {
      console.error('[get_projects] Failed to fetch projects:', error);
      return { success: false, error: `Failed to fetch projects: ${error.message}` };
    }

    const typedProjects = (projects ?? []) as ProjectRow[];

    // Filter by search term if provided (need to do this client-side for nested fields)
    let filteredProjects = typedProjects;
    if (searchParams.search_term) {
      const term = searchParams.search_term.toLowerCase();
      filteredProjects = typedProjects.filter(p => {
        const projectName = p.proposals?.project_name?.toLowerCase() || '';
        const clientName = p.proposals?.client_name?.toLowerCase() || '';
        return projectName.includes(term) || clientName.includes(term);
      });
    }

    // Format results
    const formattedProjects = filteredProjects.map(p => ({
      id: p.id,
      proposalNumber: p.proposals?.proposal_number || 'Unknown',
      projectName: p.proposals?.project_name || 'Untitled Project',
      clientName: p.proposals?.client_name || 'Unknown Client',
      workflowStatus: p.workflow_status,
      priority: p.priority || 'Medium',
      value: p.proposals?.total_value ? `$${p.proposals.total_value.toLocaleString()}` : 'Not set',
      updatedAt: new Date(p.updated_at).toLocaleDateString(),
    }));

    // Group by workflow status for summary
    const statusCounts: Record<string, number> = {};
    for (const p of formattedProjects) {
      statusCounts[p.workflowStatus] = (statusCounts[p.workflowStatus] || 0) + 1;
    }

    const totalValue = filteredProjects.reduce(
      (sum, p) => sum + (p.proposals?.total_value || 0),
      0
    );

    // Build summary
    let summary = `Found ${formattedProjects.length} project${formattedProjects.length !== 1 ? 's' : ''} on the board`;
    if (searchParams.workflow_status) summary += ` in "${searchParams.workflow_status}"`;
    if (searchParams.priority) summary += ` with ${searchParams.priority} priority`;
    if (searchParams.search_term) summary += ` matching "${searchParams.search_term}"`;
    summary += `. Total value: $${totalValue.toLocaleString()}.`;

    // Add status breakdown
    if (Object.keys(statusCounts).length > 0) {
      const breakdown = Object.entries(statusCounts)
        .map(([status, count]) => `${status}: ${count}`)
        .join(', ');
      summary += ` By status: ${breakdown}.`;
    }

    return {
      success: true,
      data: {
        id: 'projects-list',
        title: 'Projects Board',
        type: 'projects',
        count: formattedProjects.length,
        totalValue,
        statusCounts,
        projects: formattedProjects,
        summary,
      },
    };
  },
});
