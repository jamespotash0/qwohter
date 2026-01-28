/**
 * Draft Email Tool
 *
 * Creates an email draft associated with a proposal.
 */

import { createTool } from './toolRegistry.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface DraftEmailParams {
  subject?: string;
  body?: string;
  tone?: string;
}

export const draftEmailTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'draft_email',
      description:
        'Draft a follow-up email for a proposal. Use when user wants to write, compose, or draft an email to a client about a proposal.',
      parameters: {
        type: 'object',
        properties: {
          subject: {
            type: 'string',
            description: 'Email subject line',
          },
          body: {
            type: 'string',
            description: 'The full email body content',
          },
          tone: {
            type: ['string', 'null'],
            enum: ['formal', 'friendly', 'urgent', null as any],
            description: 'Tone of the email',
          },
        },
        required: ['subject', 'body'],
        additionalProperties: false,
      },
    },
  },
  metadata: {
    requiresConfirmation: true,
    requiresProposalId: true, // Email is associated with a proposal
    category: 'communication',
  },
  execute: async (params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const { supabase, organizationId, userId, proposalId } = context;
    const emailParams = params as DraftEmailParams;

    console.log('[draft_email] Creating email draft:', {
      proposalId,
      subject: emailParams.subject,
    });

    const { data: suggestion, error: suggestionError } = await supabase
      .from('ai_suggestions')
      .insert({
        proposal_id: proposalId,
        organization_id: organizationId,
        user_id: userId,
        suggestion_type: 'follow_up_email',
        title: 'Email Draft',
        content: emailParams.body || 'Email content',
        email_subject: emailParams.subject || 'Follow-up',
        reasoning: 'Created via Ada chat',
        confidence_score: 1.0,
        model_used: 'user-confirmed',
        status: 'Pending',
      })
      .select()
      .single();

    if (suggestionError) {
      console.error('[draft_email] Failed to create email draft:', suggestionError);
      return { success: false, error: 'Failed to create email draft' };
    }

    return {
      success: true,
      data: {
        id: suggestion.id,
        title: emailParams.subject || 'Email Draft',
        type: 'email',
      },
    };
  },
});
