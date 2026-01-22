/**
 * Update Presentation Tool
 *
 * Updates presentation content for a proposal.
 */

import { createTool } from './toolRegistry.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface UpdatePresentationParams {
  presentation_content?: string;
}

export const updatePresentationTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'update_presentation',
      description:
        'Update presentation or pitch deck content for a proposal. Use when user wants to create or modify presentation materials.',
      parameters: {
        type: 'object',
        properties: {
          presentation_content: {
            type: 'string',
            description: 'The presentation content or outline to add/update',
          },
        },
        required: ['presentation_content'],
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
    const { supabase, organizationId, userId, proposalId } = context;
    const presentationParams = params as UpdatePresentationParams;

    console.log('[update_presentation] Update presentation requested:', { proposalId });

    // Store the presentation update as a suggestion
    const { data: suggestion, error: suggestionError } = await supabase
      .from('ai_suggestions')
      .insert({
        proposal_id: proposalId,
        organization_id: organizationId,
        user_id: userId,
        suggestion_type: 'action_recommendation',
        title: 'Presentation Update',
        content: presentationParams.presentation_content || 'Presentation content update requested',
        reasoning: 'Created via Ada chat',
        confidence_score: 1.0,
        model_used: 'user-confirmed',
        status: 'Pending',
      })
      .select()
      .single();

    if (suggestionError) {
      console.error('[update_presentation] Failed to log presentation update:', suggestionError);
    }

    return {
      success: true,
      data: {
        id: suggestion?.id || 'presentation-action',
        title: 'Presentation Update',
        type: 'presentation',
      },
    };
  },
});
