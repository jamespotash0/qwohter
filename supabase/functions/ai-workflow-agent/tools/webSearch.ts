/**
 * Web Search Tool
 *
 * Searches the web for information (read-only, no confirmation needed).
 */

import { createTool } from './toolRegistry.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface WebSearchParams {
  search_query?: string;
  search_context?: string;
}

export const webSearchTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'web_search',
      description:
        'Search the web for information. Use when user asks about current information, market rates, competitor info, or anything that requires looking up external data.',
      parameters: {
        type: 'object',
        properties: {
          search_query: {
            type: 'string',
            description: 'The search query to look up',
          },
          search_context: {
            type: ['string', 'null'],
            description: 'Additional context about what kind of information is needed',
          },
        },
        required: ['search_query'],
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
    const { supabase, organizationId, userId, proposalId } = context;
    const searchParams = params as WebSearchParams;

    if (!searchParams.search_query) {
      return { success: false, error: 'Search query is required' };
    }

    console.log('[web_search] Search requested:', searchParams);

    // TODO: Implement actual web search API integration
    // For now, log the search request as a suggestion

    const { data: suggestion, error: suggestionError } = await supabase
      .from('ai_suggestions')
      .insert({
        proposal_id: proposalId || null,
        organization_id: organizationId,
        user_id: userId,
        suggestion_type: 'action_recommendation',
        title: `Search: ${searchParams.search_query}`,
        content: `Web search requested: "${searchParams.search_query}"\nContext: ${searchParams.search_context || 'General search'}`,
        reasoning: 'Web search feature - results will be displayed in future implementation',
        confidence_score: 1.0,
        model_used: 'user-confirmed',
        status: 'Pending',
      })
      .select()
      .single();

    if (suggestionError) {
      console.error('[web_search] Failed to log search action:', suggestionError);
    }

    return {
      success: true,
      data: {
        id: suggestion?.id || 'search-action',
        title: searchParams.search_query || 'Search',
        type: 'search',
        // In the future, this would include actual search results
        searchResults: [],
      },
    };
  },
});
