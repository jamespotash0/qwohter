/**
 * Create Proposal Tool
 *
 * Creates a new proposal from scratch.
 */

import { createTool } from './toolRegistry.ts';
import { getNextProposalNumber } from './utils.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface CreateProposalParams {
  project_name?: string;
  client_name?: string;
  client_company?: string;
  job_location?: string;
  status?: string;
}

export const createProposalTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'create_proposal',
      description:
        'Create a new proposal/quote from scratch. Use when user wants to start a new proposal, create a quote for a new project, or add a new client project.',
      parameters: {
        type: 'object',
        properties: {
          project_name: {
            type: 'string',
            description: 'Name of the project or proposal (e.g., "Kitchen Renovation - Smith Residence")',
          },
          client_name: {
            type: ['string', 'null'],
            description: 'Name of the client contact person',
          },
          client_company: {
            type: ['string', 'null'],
            description: 'Name of the client company or organization',
          },
          job_location: {
            type: ['string', 'null'],
            description: 'Location where the work will be performed',
          },
          status: {
            type: ['string', 'null'],
            enum: ['Draft', 'Submitted', null as any],
            description: 'Initial status of the proposal. Default is Draft.',
          },
        },
        required: ['project_name'],
        additionalProperties: false,
      },
    },
  },
  metadata: {
    requiresConfirmation: true,
    requiresProposalId: false, // Creating new, doesn't need existing proposal
    category: 'proposal',
  },
  execute: async (params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const { supabase, organizationId } = context;
    const proposalParams = params as CreateProposalParams;

    // Get the next proposal number
    const proposalNumber = await getNextProposalNumber(supabase, organizationId);

    console.log('[create_proposal] Creating proposal:', {
      organizationId,
      proposalNumber,
      projectName: proposalParams.project_name,
    });

    const { data: newProposal, error: proposalError } = await supabase
      .from('proposals')
      .insert({
        organization_id: organizationId,
        proposal_number: proposalNumber,
        project_name: proposalParams.project_name || 'New Project',
        client_name: proposalParams.client_name || null,
        client_company: proposalParams.client_company || null,
        job_location: proposalParams.job_location || null,
        status: proposalParams.status || 'Draft',
        form_data: {},
      })
      .select()
      .single();

    if (proposalError) {
      console.error('[create_proposal] Failed to create proposal:', proposalError);
      return { success: false, error: 'Failed to create proposal' };
    }

    console.log('[create_proposal] Proposal created:', newProposal.id);

    return {
      success: true,
      data: {
        id: newProposal.id,
        title: proposalParams.project_name || 'New Project',
        type: 'proposal',
        proposal_number: proposalNumber,
      },
    };
  },
});
