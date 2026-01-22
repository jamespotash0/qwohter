/**
 * Send to Board Tool
 *
 * Sends a proposal to a workflow board.
 */

import { createTool } from './toolRegistry.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface SendToBoardParams {
  board_name?: string;
  board_id?: string;
}

export const sendToBoardTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'send_to_board',
      description:
        'Send a proposal to a workflow board for tracking. Use when user wants to move a proposal to a board or add it to project tracking.',
      parameters: {
        type: 'object',
        properties: {
          board_name: {
            type: ['string', 'null'],
            description: 'Name of the board to send to',
          },
          board_id: {
            type: ['string', 'null'],
            description: 'ID of the board if known',
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
    const { supabase, organizationId, userId, proposalId } = context;
    const boardParams = params as SendToBoardParams;

    console.log('[send_to_board] Send to board requested:', { proposalId, boardParams });

    // Create a suggestion to track this action
    const { data: suggestion, error: suggestionError } = await supabase
      .from('ai_suggestions')
      .insert({
        proposal_id: proposalId,
        organization_id: organizationId,
        user_id: userId,
        suggestion_type: 'action_recommendation',
        title: `Send to ${boardParams.board_name || 'Board'}`,
        content: `Proposal queued to be sent to board: ${boardParams.board_name || 'Board'}`,
        reasoning: 'Created via Ada chat',
        confidence_score: 1.0,
        model_used: 'user-confirmed',
        status: 'Applied',
      })
      .select()
      .single();

    if (suggestionError) {
      console.error('[send_to_board] Failed to log board action:', suggestionError);
    }

    return {
      success: true,
      data: {
        id: suggestion?.id || 'board-action',
        title: boardParams.board_name || 'Board',
        type: 'board',
      },
    };
  },
});
