/**
 * AI Feedback Service
 *
 * Handles submitting user feedback on AI responses (chat messages and suggestions).
 * This data is used to improve AI behavior over time.
 */

import { supabase } from '@/integrations/supabase/client';

export type FeedbackType = 'helpful' | 'not_helpful' | 'incorrect' | 'too_generic';
export type ContextType = 'suggestion' | 'chat_message' | 'tool_action';

export interface SubmitFeedbackParams {
  /** The message ID (for chat feedback) */
  messageId?: string;
  /** The suggestion ID (for suggestion feedback) */
  suggestionId?: string;
  /** Organization ID */
  organizationId: string;
  /** Type of content being rated */
  contextType: ContextType;
  /** Quick feedback type */
  feedbackType?: FeedbackType;
  /** Rating 1-5 (optional) */
  rating?: number;
  /** Optional comment */
  comment?: string;
  /** User's correction if the AI was wrong */
  userCorrection?: string;
}

export interface FeedbackResult {
  success: boolean;
  error?: string;
}

/**
 * Submit feedback on an AI response
 */
export async function submitAiFeedback(params: SubmitFeedbackParams): Promise<FeedbackResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Validate - must have either messageId or suggestionId
    if (!params.messageId && !params.suggestionId) {
      return { success: false, error: 'Either messageId or suggestionId is required' };
    }

    const { error } = await supabase
      .from('ai_user_feedback')
      .insert({
        user_id: user.id,
        organization_id: params.organizationId,
        message_id: params.messageId || null,
        suggestion_id: params.suggestionId || null,
        context_type: params.contextType,
        feedback_type: params.feedbackType || null,
        rating: params.rating || null,
        comment: params.comment || null,
        user_correction: params.userCorrection || null,
      } as any);

    if (error) {
      console.error('[aiFeedbackService] Failed to submit feedback:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[aiFeedbackService] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Quick thumbs up feedback
 */
export async function submitThumbsUp(
  messageId: string,
  organizationId: string
): Promise<FeedbackResult> {
  return submitAiFeedback({
    messageId,
    organizationId,
    contextType: 'chat_message',
    feedbackType: 'helpful',
    rating: 5,
  });
}

/**
 * Quick thumbs down feedback
 */
export async function submitThumbsDown(
  messageId: string,
  organizationId: string,
  correction?: string
): Promise<FeedbackResult> {
  return submitAiFeedback({
    messageId,
    organizationId,
    contextType: 'chat_message',
    feedbackType: 'not_helpful',
    rating: 1,
    userCorrection: correction,
  });
}

/**
 * Get feedback stats for an organization (admin only)
 */
export async function getFeedbackStats(organizationId: string) {
  const { data, error } = await supabase
    .from('ai_user_feedback')
    .select('feedback_type, rating, context_type, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[aiFeedbackService] Failed to get stats:', error);
    return null;
  }

  // Calculate summary
  const total = data.length;
  const helpful = data.filter(f => f.feedback_type === 'helpful').length;
  const notHelpful = data.filter(f => f.feedback_type === 'not_helpful').length;
  const avgRating = data.reduce((sum, f) => sum + (f.rating || 0), 0) / total || 0;

  return {
    total,
    helpful,
    notHelpful,
    helpfulRate: total > 0 ? (helpful / total) * 100 : 0,
    avgRating: avgRating.toFixed(1),
    recentFeedback: data.slice(0, 10),
  };
}
