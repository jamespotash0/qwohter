/**
 * AI Workflow Service
 *
 * Service for interacting with the AI Workflow Agent edge function.
 * Provides clean interfaces for generating suggestions and managing AI state.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  AISuggestion,
  AISuggestionStatus,
  AISuggestionType,
  AIWorkflowAction,
  AIWorkflowActionExtended,
  EmailTone,
  AIServiceResult,
  AIMessage,
  ProactiveTriggerType,
  ContextAnalysisResponse,
  ChatMessageResponse,
  AINotificationSummary,
  PendingAction,
} from '@/lib/types/aiWorkflow';

// ============================================================================
// Edge Function Invocation
// ============================================================================

interface InvokeWorkflowAgentParams {
  action: AIWorkflowAction;
  proposalId: string;
  organizationId: string;
  userId: string;
  options?: {
    forceRegenerate?: boolean;
    emailTone?: EmailTone;
  };
}

/**
 * Invoke the AI workflow agent edge function
 */
async function invokeWorkflowAgent(
  params: InvokeWorkflowAgentParams
): Promise<AIServiceResult<AISuggestion | AISuggestion[]>> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-workflow-agent', {
      body: {
        action: params.action,
        proposalId: params.proposalId,
        organizationId: params.organizationId,
        userId: params.userId,
        options: params.options,
      },
    });

    if (error) {
      console.error('[aiWorkflowService] Edge function error:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Unknown error from AI agent' };
    }

    return { success: true, data: data.data };
  } catch (err) {
    console.error('[aiWorkflowService] invokeWorkflowAgent error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to invoke AI agent',
    };
  }
}

// ============================================================================
// Generate Functions
// ============================================================================

export interface GenerateFollowUpOptions {
  proposalId: string;
  organizationId: string;
  userId: string;
  tone?: EmailTone;
  forceRegenerate?: boolean;
}

/**
 * Generate a follow-up email draft for a proposal
 */
export async function generateFollowUpEmail(
  options: GenerateFollowUpOptions
): Promise<AIServiceResult<AISuggestion>> {
  return invokeWorkflowAgent({
    action: 'generate_follow_up',
    proposalId: options.proposalId,
    organizationId: options.organizationId,
    userId: options.userId,
    options: {
      emailTone: options.tone || 'formal',
      forceRegenerate: options.forceRegenerate,
    },
  }) as Promise<AIServiceResult<AISuggestion>>;
}

export interface SuggestRemindersOptions {
  proposalId: string;
  organizationId: string;
  userId: string;
}

/**
 * Generate smart reminder suggestions for a proposal
 */
export async function suggestReminders(
  options: SuggestRemindersOptions
): Promise<AIServiceResult<AISuggestion[]>> {
  const result = await invokeWorkflowAgent({
    action: 'suggest_reminders',
    proposalId: options.proposalId,
    organizationId: options.organizationId,
    userId: options.userId,
  });

  if (!result.success) {
    return result as AIServiceResult<AISuggestion[]>;
  }

  // Handle the nested suggestions array from the edge function
  const suggestions = (result.data as { suggestions?: AISuggestion[] })?.suggestions || [];
  return { success: true, data: suggestions };
}

export interface GetRecommendationsOptions {
  proposalId: string;
  organizationId: string;
  userId: string;
}

/**
 * Get action recommendations for a proposal
 */
export async function getRecommendations(
  options: GetRecommendationsOptions
): Promise<AIServiceResult<AISuggestion[]>> {
  const result = await invokeWorkflowAgent({
    action: 'get_recommendations',
    proposalId: options.proposalId,
    organizationId: options.organizationId,
    userId: options.userId,
  });

  if (!result.success) {
    return result as AIServiceResult<AISuggestion[]>;
  }

  // Handle the nested suggestions array from the edge function
  const suggestions = (result.data as { suggestions?: AISuggestion[] })?.suggestions || [];
  return { success: true, data: suggestions };
}

// ============================================================================
// Fetch Functions
// ============================================================================

/**
 * Fetch AI suggestions for a proposal
 */
export async function fetchProposalSuggestions(
  proposalId: string,
  status?: AISuggestionStatus
): Promise<AISuggestion[]> {
  let query = supabase
    .from('ai_suggestions')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[aiWorkflowService] fetchProposalSuggestions error:', error);
    return [];
  }

  return (data as AISuggestion[]) || [];
}

/**
 * Fetch AI suggestions for an organization
 */
export async function fetchOrganizationSuggestions(
  organizationId: string,
  options?: {
    status?: AISuggestionStatus;
    type?: AISuggestionType;
    limit?: number;
  }
): Promise<AISuggestion[]> {
  let query = supabase
    .from('ai_suggestions')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.type) {
    query = query.eq('suggestion_type', options.type);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[aiWorkflowService] fetchOrganizationSuggestions error:', error);
    return [];
  }

  return (data as AISuggestion[]) || [];
}

/**
 * Count pending suggestions for a proposal
 */
export async function countPendingSuggestions(proposalId: string): Promise<number> {
  const { count, error } = await supabase
    .from('ai_suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('proposal_id', proposalId)
    .eq('status', 'pending');

  if (error) {
    console.error('[aiWorkflowService] countPendingSuggestions error:', error);
    return 0;
  }

  return count || 0;
}

// ============================================================================
// Update Functions
// ============================================================================

/**
 * Apply a suggestion (mark as used)
 */
export async function applySuggestion(suggestionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ai_suggestions')
    .update({
      status: 'applied',
      applied_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);

  if (error) {
    console.error('[aiWorkflowService] applySuggestion error:', error);
    return false;
  }

  return true;
}

/**
 * Dismiss a suggestion
 */
export async function dismissSuggestion(
  suggestionId: string,
  reason?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('ai_suggestions')
    .update({
      status: 'dismissed',
      dismissed_at: new Date().toISOString(),
      dismissed_reason: reason || null,
    })
    .eq('id', suggestionId);

  if (error) {
    console.error('[aiWorkflowService] dismissSuggestion error:', error);
    return false;
  }

  return true;
}

/**
 * Expire old suggestions (utility function)
 */
export async function expireOldSuggestions(
  proposalId: string,
  olderThanDays: number = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const { data, error } = await supabase
    .from('ai_suggestions')
    .update({
      status: 'expired',
    })
    .eq('proposal_id', proposalId)
    .eq('status', 'pending')
    .lt('created_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    console.error('[aiWorkflowService] expireOldSuggestions error:', error);
    return 0;
  }

  return data?.length || 0;
}

// ============================================================================
// Feedback Functions
// ============================================================================

export interface SubmitFeedbackParams {
  suggestionId: string;
  userId: string;
  rating?: number;
  feedbackType?: 'helpful' | 'not_helpful' | 'incorrect' | 'too_generic';
  comment?: string;
}

/**
 * Submit feedback on a suggestion
 */
export async function submitSuggestionFeedback(
  params: SubmitFeedbackParams
): Promise<boolean> {
  const { error } = await supabase.from('ai_user_feedback').insert({
    suggestion_id: params.suggestionId,
    user_id: params.userId,
    rating: params.rating,
    feedback_type: params.feedbackType,
    comment: params.comment,
  });

  if (error) {
    console.error('[aiWorkflowService] submitSuggestionFeedback error:', error);
    return false;
  }

  return true;
}

// ============================================================================
// Context Analysis Functions
// ============================================================================

export interface AnalyzeContextOptions {
  proposalId: string;
  organizationId: string;
  userId: string;
  triggerType?: ProactiveTriggerType;
  metadata?: {
    previousStatus?: string;
    newStatus?: string;
  };
}

/**
 * Analyze proposal context and generate proactive suggestions
 */
export async function analyzeProposalContext(
  options: AnalyzeContextOptions
): Promise<AIServiceResult<ContextAnalysisResponse>> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-workflow-agent', {
      body: {
        action: 'analyze_context' as AIWorkflowActionExtended,
        proposalId: options.proposalId,
        organizationId: options.organizationId,
        userId: options.userId,
        triggerType: options.triggerType,
        metadata: options.metadata,
      },
    });

    if (error) {
      console.error('[aiWorkflowService] analyzeProposalContext error:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Unknown error' };
    }

    return { success: true, data: data.data };
  } catch (err) {
    console.error('[aiWorkflowService] analyzeProposalContext error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to analyze context',
    };
  }
}

// ============================================================================
// Chat Functions
// ============================================================================

export interface SendChatMessageOptions {
  proposalId?: string; // Optional for global chat mode
  organizationId: string;
  userId: string;
  message: string;
  conversationHistory?: AIMessage[];
}

/**
 * Send a chat message and get AI response
 */
export async function sendChatMessage(
  options: SendChatMessageOptions
): Promise<AIServiceResult<ChatMessageResponse>> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-workflow-agent', {
      body: {
        action: 'chat' as AIWorkflowActionExtended,
        proposalId: options.proposalId,
        organizationId: options.organizationId,
        userId: options.userId,
        message: options.message,
        conversationHistory: options.conversationHistory?.map(m => ({
          role: m.role,
          content: m.content,
        })),
      },
    });

    if (error) {
      console.error('[aiWorkflowService] sendChatMessage error:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Unknown error' };
    }

    return { success: true, data: data.data };
  } catch (err) {
    console.error('[aiWorkflowService] sendChatMessage error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send message',
    };
  }
}

/**
 * Fetch conversation history for a proposal
 */
export async function fetchConversation(
  proposalId: string,
  limit: number = 50
): Promise<AIMessage[]> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[aiWorkflowService] fetchConversation error:', error);
    return [];
  }

  return (data as AIMessage[]) || [];
}

// ============================================================================
// Action Confirmation Functions
// ============================================================================

export interface ConfirmActionOptions {
  organizationId: string;
  userId: string;
  pendingAction: PendingAction;
}

export interface ConfirmActionResult {
  created: {
    id: string;
    title: string;
    type: string;
  };
  message: string;
}

/**
 * Confirm and execute a pending action
 */
export async function confirmAction(
  options: ConfirmActionOptions
): Promise<AIServiceResult<ConfirmActionResult>> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-workflow-agent', {
      body: {
        action: 'confirm_action' as AIWorkflowActionExtended,
        organizationId: options.organizationId,
        userId: options.userId,
        pendingAction: options.pendingAction,
      },
    });

    if (error) {
      console.error('[aiWorkflowService] confirmAction error:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Unknown error' };
    }

    return { success: true, data: data.data };
  } catch (err) {
    console.error('[aiWorkflowService] confirmAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to confirm action',
    };
  }
}

// ============================================================================
// Organization-wide Functions
// ============================================================================

/**
 * Get total pending suggestions count for an organization
 */
export async function fetchOrganizationPendingCount(
  organizationId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('ai_suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'pending');

  if (error) {
    console.error('[aiWorkflowService] fetchOrganizationPendingCount error:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get notification summary for an organization
 */
export async function fetchNotificationSummary(
  organizationId: string
): Promise<AINotificationSummary> {
  // Get total count
  const { count: totalPending } = await supabase
    .from('ai_suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'pending');

  // Get counts by proposal with a simpler query
  const { data: suggestions } = await supabase
    .from('ai_suggestions')
    .select('proposal_id, suggestion_type')
    .eq('organization_id', organizationId)
    .eq('status', 'pending');

  // Type assertion for the query result
  const suggestionItems = (suggestions || []) as Array<{
    proposal_id: string;
    suggestion_type: string;
  }>;

  // Group by proposal
  const byProposal: Record<string, { proposal_id: string; proposal_name: string; count: number }> = {};
  for (const item of suggestionItems) {
    const pid = item.proposal_id;
    if (!byProposal[pid]) {
      byProposal[pid] = {
        proposal_id: pid,
        proposal_name: 'Proposal', // Will be enriched by the caller if needed
        count: 0,
      };
    }
    byProposal[pid].count++;
  }

  // Group by type
  const byType: Record<string, number> = {};
  for (const item of suggestionItems) {
    const type = item.suggestion_type;
    byType[type] = (byType[type] || 0) + 1;
  }

  return {
    total_pending: totalPending || 0,
    by_proposal: Object.values(byProposal),
    by_type: Object.entries(byType).map(([type, count]) => ({
      type: type as AISuggestionType,
      count,
    })),
  };
}

/**
 * Get proposals with pending AI suggestions
 */
export async function fetchProposalsWithSuggestions(
  organizationId: string
): Promise<Array<{ proposal_id: string; count: number }>> {
  // Use a raw query approach since ai_pending_suggestions_count is a new column
  const { data, error } = await supabase
    .from('proposals')
    .select('id')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('[aiWorkflowService] fetchProposalsWithSuggestions error:', error);
    return [];
  }

  // Type assertion for the query result
  const proposals = (data || []) as Array<{ id: string }>;

  // Get suggestion counts separately
  const results: Array<{ proposal_id: string; count: number }> = [];
  for (const p of proposals) {
    const { count } = await supabase
      .from('ai_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('proposal_id', p.id)
      .eq('status', 'pending');

    if (count && count > 0) {
      results.push({ proposal_id: p.id, count });
    }
  }

  return results.sort((a, b) => b.count - a.count);
}

// ============================================================================
// Re-exports
// ============================================================================

export type {
  AISuggestion,
  AISuggestionStatus,
  AISuggestionType,
  EmailTone,
  AIServiceResult,
  AIMessage,
  AINotificationSummary,
  PendingAction,
};
