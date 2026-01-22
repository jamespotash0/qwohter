/**
 * Log Capability Gap Tool
 *
 * When the agent can't fulfill a user request with existing tools,
 * this logs the request so developers can see what capabilities users need.
 * Also provides helpful feedback to the user.
 */

import { createTool } from './toolRegistry.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface LogCapabilityGapParams {
  user_request: string;
  reason: string;
  suggested_workaround?: string;
  category?: 'missing_tool' | 'permission_denied' | 'integration_needed' | 'out_of_scope';
}

export const logCapabilityGapTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'log_capability_gap',
      description:
        'Use this when a user asks for something you cannot do with existing tools. This logs their request so developers can consider adding the capability. ALWAYS use this instead of just saying "I cannot do that" - it helps improve the system. Include a helpful workaround if possible.',
      parameters: {
        type: 'object',
        properties: {
          user_request: {
            type: 'string',
            description: 'What the user asked for (summarized)',
          },
          reason: {
            type: 'string',
            description: 'Why this cannot be done (no tool exists, permission issue, etc.)',
          },
          suggested_workaround: {
            type: ['string', 'null'],
            description: 'A manual workaround the user can do themselves (e.g., "Go to Settings > Team Members")',
          },
          category: {
            type: ['string', 'null'],
            enum: ['missing_tool', 'permission_denied', 'integration_needed', 'out_of_scope', null as unknown as string],
            description: 'Category of the gap for analytics',
          },
        },
        required: ['user_request', 'reason'],
        additionalProperties: false,
      },
    },
  },
  metadata: {
    requiresConfirmation: false, // Auto-execute, just logging
    requiresProposalId: false,
    category: 'system',
  },
  execute: async (params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const { supabase, organizationId, userId } = context;
    const gapParams = params as LogCapabilityGapParams;

    console.log('[log_capability_gap] Logging capability gap:', {
      user_request: gapParams.user_request,
      reason: gapParams.reason,
      category: gapParams.category,
    });

    // Log to a dedicated table for analytics
    try {
      await supabase.from('ai_capability_gaps').insert({
        organization_id: organizationId,
        user_id: userId,
        user_request: gapParams.user_request,
        reason: gapParams.reason,
        suggested_workaround: gapParams.suggested_workaround || null,
        category: gapParams.category || 'missing_tool',
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      // Table might not exist yet - that's OK, just log to console
      console.log('[log_capability_gap] Could not log to database (table may not exist):', error);
    }

    // Build a helpful response message
    let responseMessage = `I noted your request: "${gapParams.user_request}". `;
    responseMessage += `Currently, ${gapParams.reason}. `;

    if (gapParams.suggested_workaround) {
      responseMessage += `\n\n**Workaround:** ${gapParams.suggested_workaround}`;
    }

    responseMessage += `\n\nI've logged this request so our team can consider adding this capability.`;

    return {
      success: true,
      data: {
        id: 'capability-gap-logged',
        title: 'Request Logged',
        type: 'feedback',
        message: responseMessage,
        workaround: gapParams.suggested_workaround,
      },
    };
  },
});
