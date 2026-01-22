/**
 * Add Attachment Tool
 *
 * Logs a request to add an attachment to a proposal.
 */

import { createTool } from './toolRegistry.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface AddAttachmentParams {
  file_name?: string;
  file_type?: string;
  file_url?: string;
}

export const addAttachmentTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'add_attachment',
      description:
        'Add a document or file attachment to a proposal. Use when user wants to attach, upload, or add a document to a proposal.',
      parameters: {
        type: 'object',
        properties: {
          file_name: {
            type: 'string',
            description: 'Name of the file to attach',
          },
          file_type: {
            type: ['string', 'null'],
            description: 'Type of file (e.g., PDF, image, document)',
          },
          file_url: {
            type: ['string', 'null'],
            description: 'URL of the file if already uploaded',
          },
        },
        required: ['file_name'],
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
    const attachmentParams = params as AddAttachmentParams;

    console.log('[add_attachment] Add attachment requested:', { proposalId, attachmentParams });

    // Create a note about the attachment request
    // Actual file handling needs to be done client-side
    const { data: suggestion, error: suggestionError } = await supabase
      .from('ai_suggestions')
      .insert({
        proposal_id: proposalId,
        organization_id: organizationId,
        user_id: userId,
        suggestion_type: 'action_recommendation',
        title: `Add Attachment: ${attachmentParams.file_name || 'File'}`,
        content: `Attachment requested: ${attachmentParams.file_name || 'File'}\nType: ${attachmentParams.file_type || 'Unknown'}`,
        reasoning: 'Created via Ada chat - requires manual upload',
        confidence_score: 1.0,
        model_used: 'user-confirmed',
        status: 'Pending',
      })
      .select()
      .single();

    if (suggestionError) {
      console.error('[add_attachment] Failed to log attachment action:', suggestionError);
    }

    return {
      success: true,
      data: {
        id: suggestion?.id || 'attachment-action',
        title: attachmentParams.file_name || 'Attachment',
        type: 'attachment',
      },
    };
  },
});
