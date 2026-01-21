/**
 * React Query Hooks for AI Suggestions
 *
 * Server state management for AI workflow suggestions.
 * Provides hooks for fetching, generating, and managing AI suggestions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import {
  fetchProposalSuggestions,
  generateFollowUpEmail,
  suggestReminders,
  getRecommendations,
  applySuggestion,
  dismissSuggestion,
  submitSuggestionFeedback,
  countPendingSuggestions,
  analyzeProposalContext,
  sendChatMessage,
  fetchConversation,
  fetchOrganizationPendingCount,
  fetchNotificationSummary,
  type AISuggestion,
  type AISuggestionStatus,
  type GenerateFollowUpOptions,
  type SuggestRemindersOptions,
  type GetRecommendationsOptions,
  type SubmitFeedbackParams,
  type EmailTone,
  type AIMessage,
  type AnalyzeContextOptions,
  type SendChatMessageOptions,
  type AINotificationSummary,
} from '@/services/aiWorkflowService';

// ============================================================================
// Query Keys
// ============================================================================

export const aiSuggestionQueryKeys = {
  all: ['ai-suggestions'] as const,
  lists: () => [...aiSuggestionQueryKeys.all, 'list'] as const,
  list: (proposalId: string, status?: AISuggestionStatus) =>
    [...aiSuggestionQueryKeys.lists(), proposalId, status] as const,
  count: (proposalId: string) =>
    [...aiSuggestionQueryKeys.all, 'count', proposalId] as const,
  conversation: (proposalId: string) =>
    [...aiSuggestionQueryKeys.all, 'conversation', proposalId] as const,
  organizationCount: (organizationId: string) =>
    [...aiSuggestionQueryKeys.all, 'org-count', organizationId] as const,
  notificationSummary: (organizationId: string) =>
    [...aiSuggestionQueryKeys.all, 'notification-summary', organizationId] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook: Fetch AI suggestions for a proposal
 */
export function useAISuggestions(
  proposalId: string | undefined,
  status?: AISuggestionStatus,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: aiSuggestionQueryKeys.list(proposalId || '', status),
    queryFn: () => {
      if (!proposalId) return [];
      return fetchProposalSuggestions(proposalId, status);
    },
    enabled: !!proposalId && enabled,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook: Fetch pending suggestions for a proposal
 */
export function usePendingSuggestions(proposalId: string | undefined) {
  return useAISuggestions(proposalId, 'pending');
}

/**
 * Hook: Get count of pending suggestions (for badge display)
 */
export function usePendingSuggestionsCount(proposalId: string | undefined) {
  const { data } = useQuery({
    queryKey: aiSuggestionQueryKeys.count(proposalId || ''),
    queryFn: () => {
      if (!proposalId) return 0;
      return countPendingSuggestions(proposalId);
    },
    enabled: !!proposalId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });

  return data || 0;
}

// ============================================================================
// Generation Mutation Hooks
// ============================================================================

/**
 * Hook: Generate a follow-up email
 */
export function useGenerateFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options: GenerateFollowUpOptions) => generateFollowUpEmail(options),
    onSuccess: (result, variables) => {
      if (result.success) {
        // Invalidate suggestions list to show the new one
        queryClient.invalidateQueries({
          queryKey: aiSuggestionQueryKeys.list(variables.proposalId),
        });
        queryClient.invalidateQueries({
          queryKey: aiSuggestionQueryKeys.count(variables.proposalId),
        });
      }
    },
  });
}

/**
 * Hook: Generate smart reminders
 */
export function useSuggestReminders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options: SuggestRemindersOptions) => suggestReminders(options),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({
          queryKey: aiSuggestionQueryKeys.list(variables.proposalId),
        });
        queryClient.invalidateQueries({
          queryKey: aiSuggestionQueryKeys.count(variables.proposalId),
        });
      }
    },
  });
}

/**
 * Hook: Get action recommendations
 */
export function useGetRecommendations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options: GetRecommendationsOptions) => getRecommendations(options),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({
          queryKey: aiSuggestionQueryKeys.list(variables.proposalId),
        });
        queryClient.invalidateQueries({
          queryKey: aiSuggestionQueryKeys.count(variables.proposalId),
        });
      }
    },
  });
}

// ============================================================================
// Action Mutation Hooks
// ============================================================================

/**
 * Hook: Apply a suggestion
 */
export function useApplySuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (suggestionId: string) => applySuggestion(suggestionId),
    onSuccess: () => {
      // Invalidate all suggestion lists since we don't know the proposalId here
      queryClient.invalidateQueries({
        queryKey: aiSuggestionQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: aiSuggestionQueryKeys.all,
        predicate: (query) => query.queryKey[1] === 'count',
      });
    },
  });
}

/**
 * Hook: Apply a suggestion with known proposalId (optimistic update)
 */
export function useApplySuggestionOptimistic(proposalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (suggestionId: string) => applySuggestion(suggestionId),
    onMutate: async (suggestionId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: aiSuggestionQueryKeys.list(proposalId, 'pending'),
      });

      // Snapshot the previous value
      const previousSuggestions = queryClient.getQueryData<AISuggestion[]>(
        aiSuggestionQueryKeys.list(proposalId, 'pending')
      );

      // Optimistically remove from pending list
      queryClient.setQueryData<AISuggestion[]>(
        aiSuggestionQueryKeys.list(proposalId, 'pending'),
        (old) => old?.filter((s) => s.id !== suggestionId) || []
      );

      return { previousSuggestions };
    },
    onError: (_err, _suggestionId, context) => {
      // Rollback on error
      if (context?.previousSuggestions) {
        queryClient.setQueryData(
          aiSuggestionQueryKeys.list(proposalId, 'pending'),
          context.previousSuggestions
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: aiSuggestionQueryKeys.list(proposalId),
      });
      queryClient.invalidateQueries({
        queryKey: aiSuggestionQueryKeys.count(proposalId),
      });
    },
  });
}

/**
 * Hook: Dismiss a suggestion
 */
export function useDismissSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ suggestionId, reason }: { suggestionId: string; reason?: string }) =>
      dismissSuggestion(suggestionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aiSuggestionQueryKeys.lists(),
      });
    },
  });
}

/**
 * Hook: Dismiss a suggestion with known proposalId (optimistic update)
 */
export function useDismissSuggestionOptimistic(proposalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ suggestionId, reason }: { suggestionId: string; reason?: string }) =>
      dismissSuggestion(suggestionId, reason),
    onMutate: async ({ suggestionId }) => {
      await queryClient.cancelQueries({
        queryKey: aiSuggestionQueryKeys.list(proposalId, 'pending'),
      });

      const previousSuggestions = queryClient.getQueryData<AISuggestion[]>(
        aiSuggestionQueryKeys.list(proposalId, 'pending')
      );

      queryClient.setQueryData<AISuggestion[]>(
        aiSuggestionQueryKeys.list(proposalId, 'pending'),
        (old) => old?.filter((s) => s.id !== suggestionId) || []
      );

      return { previousSuggestions };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSuggestions) {
        queryClient.setQueryData(
          aiSuggestionQueryKeys.list(proposalId, 'pending'),
          context.previousSuggestions
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: aiSuggestionQueryKeys.list(proposalId),
      });
      queryClient.invalidateQueries({
        queryKey: aiSuggestionQueryKeys.count(proposalId),
      });
    },
  });
}

// ============================================================================
// Feedback Mutation Hook
// ============================================================================

/**
 * Hook: Submit feedback on a suggestion
 */
export function useSubmitFeedback() {
  return useMutation({
    mutationFn: (params: SubmitFeedbackParams) => submitSuggestionFeedback(params),
  });
}

// ============================================================================
// Conversation Hooks
// ============================================================================

/**
 * Hook: Fetch conversation history for a proposal or global chat
 */
export function useAIConversation(proposalId: string | undefined | null, enabled: boolean = true) {
  return useQuery({
    queryKey: aiSuggestionQueryKeys.conversation(proposalId || 'global'),
    queryFn: () => {
      // For global chat, return empty array (messages stored in local state)
      // For proposal chat, fetch from server
      if (!proposalId) return [];
      return fetchConversation(proposalId);
    },
    enabled: enabled,
    staleTime: 10 * 1000, // 10 seconds
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook: Send a chat message
 * Supports both proposal-context and global chat modes
 */
export function useSendChatMessage(proposalId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options: Omit<SendChatMessageOptions, 'proposalId'> & { proposalId?: string }) =>
      sendChatMessage({ ...options, proposalId: options.proposalId || proposalId }),
    onSuccess: (result, variables) => {
      if (result.success) {
        const targetProposalId = variables.proposalId || proposalId;
        if (targetProposalId) {
          // Invalidate conversation to show new messages
          queryClient.invalidateQueries({
            queryKey: aiSuggestionQueryKeys.conversation(targetProposalId),
          });
          // Also invalidate suggestions if an action was taken
          if (result.data?.suggestion) {
            queryClient.invalidateQueries({
              queryKey: aiSuggestionQueryKeys.list(targetProposalId),
            });
            queryClient.invalidateQueries({
              queryKey: aiSuggestionQueryKeys.count(targetProposalId),
            });
          }
        } else {
          // Global chat - invalidate global conversation
          queryClient.invalidateQueries({
            queryKey: aiSuggestionQueryKeys.conversation('global'),
          });
        }
      }
    },
  });
}

// ============================================================================
// Context Analysis Hooks
// ============================================================================

/**
 * Hook: Analyze proposal context (proactive analysis)
 */
export function useAnalyzeContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options: AnalyzeContextOptions) => analyzeProposalContext(options),
    onSuccess: (result, variables) => {
      if (result.success) {
        // Invalidate suggestions to show new proactive ones
        queryClient.invalidateQueries({
          queryKey: aiSuggestionQueryKeys.list(variables.proposalId),
        });
        queryClient.invalidateQueries({
          queryKey: aiSuggestionQueryKeys.count(variables.proposalId),
        });
        // Also invalidate conversation if a proactive message was created
        if (result.data?.proactiveMessage) {
          queryClient.invalidateQueries({
            queryKey: aiSuggestionQueryKeys.conversation(variables.proposalId),
          });
        }
      }
    },
  });
}

/**
 * Hook: Auto-analyze when panel opens (with debounce)
 */
export function useProactiveAnalysis(
  proposalId: string | undefined,
  organizationId: string | undefined,
  userId: string | undefined,
  isOpen: boolean
) {
  const analyzeContext = useAnalyzeContext();
  const hasAnalyzedRef = useRef(false);

  useEffect(() => {
    // Only analyze once when panel opens for the first time
    if (isOpen && proposalId && organizationId && userId && !hasAnalyzedRef.current) {
      hasAnalyzedRef.current = true;
      analyzeContext.mutate({
        proposalId,
        organizationId,
        userId,
        triggerType: 'panel_opened',
      });
    }

    // Reset when panel closes
    if (!isOpen) {
      hasAnalyzedRef.current = false;
    }
  }, [isOpen, proposalId, organizationId, userId, analyzeContext]);

  return analyzeContext;
}

// ============================================================================
// Organization-wide Hooks
// ============================================================================

/**
 * Hook: Get total pending suggestions count for organization (for global badge)
 */
export function useOrganizationPendingCount(organizationId: string | undefined) {
  const { data } = useQuery({
    queryKey: aiSuggestionQueryKeys.organizationCount(organizationId || ''),
    queryFn: () => {
      if (!organizationId) return 0;
      return fetchOrganizationPendingCount(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  return data || 0;
}

/**
 * Hook: Get notification summary for organization
 */
export function useNotificationSummary(organizationId: string | undefined) {
  return useQuery({
    queryKey: aiSuggestionQueryKeys.notificationSummary(organizationId || ''),
    queryFn: () => {
      if (!organizationId) {
        return {
          total_pending: 0,
          by_proposal: [],
          by_type: [],
        } as AINotificationSummary;
      }
      return fetchNotificationSummary(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

// ============================================================================
// Polling Hook for Real-time Updates
// ============================================================================

/**
 * Hook: Poll for new suggestions when panel is open
 */
export function useSuggestionPolling(
  proposalId: string | undefined,
  isOpen: boolean,
  intervalMs: number = 5 * 60 * 1000 // 5 minutes default
) {
  const queryClient = useQueryClient();

  const refetchSuggestions = useCallback(() => {
    if (proposalId) {
      queryClient.invalidateQueries({
        queryKey: aiSuggestionQueryKeys.list(proposalId),
      });
      queryClient.invalidateQueries({
        queryKey: aiSuggestionQueryKeys.count(proposalId),
      });
    }
  }, [proposalId, queryClient]);

  useEffect(() => {
    if (!isOpen || !proposalId) return;

    const interval = setInterval(refetchSuggestions, intervalMs);
    return () => clearInterval(interval);
  }, [isOpen, proposalId, intervalMs, refetchSuggestions]);
}

// ============================================================================
// Re-exports
// ============================================================================

export type { AISuggestion, AISuggestionStatus, EmailTone, AIMessage, AINotificationSummary };
