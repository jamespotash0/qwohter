/**
 * Update Proposal Tool
 *
 * Updates proposal details like project name, client info, notes, etc.
 */

import { createTool } from './toolRegistry.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface UpdateProposalParams {
  project_name?: string;
  client_name?: string;
  client_company?: string;
  client_email?: string;
  job_location?: string;
  notes?: string;
  total_value?: number;
}

export const updateProposalTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'update_proposal',
      description:
        'Update proposal details. Can modify: project name, client name/company/email, job location, notes, total value. CANNOT modify: proposal number (e.g., P-001) or proposal ID - these are system-generated and immutable. If user asks to change a proposal number, explain it cannot be modified.',
      parameters: {
        type: 'object',
        properties: {
          project_name: {
            type: ['string', 'null'],
            description: 'New project name for the proposal',
          },
          client_name: {
            type: ['string', 'null'],
            description: 'Client contact name',
          },
          client_company: {
            type: ['string', 'null'],
            description: 'Client company name',
          },
          client_email: {
            type: ['string', 'null'],
            description: 'Client email address',
          },
          job_location: {
            type: ['string', 'null'],
            description: 'Job or project location/address',
          },
          notes: {
            type: ['string', 'null'],
            description: 'Additional notes to add to the proposal',
          },
          total_value: {
            type: ['number', 'null'],
            description: 'Total proposal value in dollars',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  metadata: {
    requiresConfirmation: true,
    requiresProposalId: true,
    category: 'proposal',
  },
  execute: async (params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const { supabase, organizationId, proposalId } = context;
    const updateParams = params as UpdateProposalParams;

    console.log('[update_proposal] Updating proposal:', proposalId);

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updateParams.project_name !== undefined) {
      updateData.project_name = updateParams.project_name;
    }
    if (updateParams.client_name !== undefined) {
      updateData.client_name = updateParams.client_name;
    }
    if (updateParams.client_company !== undefined) {
      updateData.client_company = updateParams.client_company;
    }
    if (updateParams.client_email !== undefined) {
      updateData.client_email = updateParams.client_email;
    }
    if (updateParams.job_location !== undefined) {
      updateData.job_location = updateParams.job_location;
    }
    if (updateParams.notes !== undefined) {
      updateData.notes = updateParams.notes;
    }
    if (updateParams.total_value !== undefined) {
      updateData.total_value = updateParams.total_value;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 1) {
      return {
        success: false,
        error: 'No fields provided to update',
      };
    }

    const { data: proposal, error: updateError } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', proposalId)
      .eq('organization_id', organizationId)
      .select('id, project_name')
      .single();

    if (updateError) {
      console.error('[update_proposal] Failed to update proposal:', updateError);
      return {
        success: false,
        error: `Failed to update proposal: ${updateError.message}`,
      };
    }

    return {
      success: true,
      data: {
        id: proposal.id,
        title: proposal.project_name || 'Proposal Updated',
        type: 'proposal',
      },
    };
  },
});
