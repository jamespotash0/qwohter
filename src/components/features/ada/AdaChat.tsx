/**
 * Ada Chat Panel
 *
 * The main chat interface for Ada with context-aware capabilities.
 * Can help with proposals, answer questions, and provide proactive suggestions.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AdaMessage } from './AdaMessage';
import { AdaQuickActions } from './AdaQuickActions';
import { AdaTypingIndicator } from './AdaTypingIndicator';
import { AdaSuggestionCard } from './AdaSuggestionCard';
import { AdaActionConfirmation, type PendingAction } from './AdaActionConfirmation';
import {
  useAISuggestions,
  useAIConversation,
  useSendChatMessage,
  useGenerateFollowUp,
  useSuggestReminders,
  useGetRecommendations,
  useApplySuggestionOptimistic,
  useDismissSuggestionOptimistic,
  useConfirmAction,
} from '@/hooks/queries/useAISuggestions';
import type { AIMessage, LocalChatMessage } from '@/lib/types/aiWorkflow';

// ============================================================================
// Types
// ============================================================================

interface AdaChatProps {
  organizationId: string;
  userId: string;
  /** External messages state (lifted from parent for persistence) */
  externalMessages?: LocalChatMessage[];
  /** Callback when messages change (for lifted state) */
  onMessagesChange?: (messages: LocalChatMessage[]) => void;
}

// ============================================================================
// Component
// ============================================================================

export const AdaChat: React.FC<AdaChatProps> = ({
  organizationId,
  userId,
  externalMessages,
  onMessagesChange,
}) => {
  const location = useLocation();
  const [inputValue, setInputValue] = React.useState('');
  const [pendingAction, setPendingAction] = React.useState<PendingAction | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Use external messages if provided, otherwise internal state
  const globalMessages = externalMessages || [];

  // Keep a ref to always have access to the latest messages (avoids stale closure)
  const messagesRef = useRef<LocalChatMessage[]>(globalMessages);
  messagesRef.current = globalMessages;

  const setGlobalMessages = useCallback((updater: LocalChatMessage[] | ((prev: LocalChatMessage[]) => LocalChatMessage[])) => {
    if (onMessagesChange) {
      if (typeof updater === 'function') {
        // Use ref to get the latest messages, avoiding stale closure
        onMessagesChange(updater(messagesRef.current));
      } else {
        onMessagesChange(updater);
      }
    }
  }, [onMessagesChange]);

  // Detect context from URL - parse proposalId from pathname
  // Routes: /proposals/:proposalId/edit
  const proposalId = React.useMemo(() => {
    const match = location.pathname.match(/\/proposals\/([^/]+)\/edit/);
    return match ? match[1] : null;
  }, [location.pathname]);

  const isProposalContext = !!proposalId;

  // Fetch suggestions and conversation (only if in proposal context)
  const {
    data: suggestions,
    isLoading: suggestionsLoading,
  } = useAISuggestions(proposalId || '', 'pending', !!proposalId);

  const {
    data: serverConversation,
    isLoading: conversationLoading,
  } = useAIConversation(proposalId, isProposalContext);

  // Use server conversation for proposal context, local state for global
  const conversation = isProposalContext ? serverConversation : globalMessages;

  // Mutations
  const sendChatMessage = useSendChatMessage(proposalId || undefined);
  const generateFollowUp = useGenerateFollowUp();
  const suggestReminders = useSuggestReminders();
  const getRecommendations = useGetRecommendations();
  const applySuggestion = useApplySuggestionOptimistic(proposalId || '');
  const dismissSuggestion = useDismissSuggestionOptimistic(proposalId || '');
  const confirmActionMutation = useConfirmAction();

  const isTyping = sendChatMessage.isPending;
  const isLoading = isProposalContext && (suggestionsLoading || conversationLoading);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, globalMessages, isTyping]);

  // Static greeting content (shown instantly, no API call)
  const STATIC_GREETING = `Hi! I'm Ada, your AI assistant. How can I help you today?

• Create a reminder for a task
• Help me draft a follow-up email
• What's on my schedule this week?`;

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }, []);

  // Send message
  const handleSend = useCallback(async () => {
    const message = inputValue.trim();
    if (!message) return;

    setInputValue('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // For global chat, add user message to local state immediately
    if (!isProposalContext) {
      const userMessage: LocalChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        created_at: new Date().toISOString(),
      };
      setGlobalMessages(prev => [...prev, userMessage]);
    }

    try {
      const result = await sendChatMessage.mutateAsync({
        organizationId,
        userId,
        message,
        conversationHistory: conversation as AIMessage[],
        // Include proposalId only if in proposal context
        ...(proposalId && { proposalId }),
      });

      // Handle response
      if (result.success && result.data?.response) {
        // Add AI response message for global chat
        if (!isProposalContext) {
          const aiMessage: LocalChatMessage = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: result.data.response,
            created_at: new Date().toISOString(),
          };
          setGlobalMessages(prev => [...prev, aiMessage]);
        }

        // Check if there's a pending action that needs confirmation
        if (result.data.pendingAction) {
          setPendingAction(result.data.pendingAction as PendingAction);
        }
      } else if (!result.success) {
        // API returned success: false
        console.error('[Ada] Chat error:', result.error);
        const errorMessage: LocalChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'I seem to have an issue with that request. Could you try again?',
          created_at: new Date().toISOString(),
        };
        setGlobalMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('[Ada] Chat exception:', error);
      const errorMessage: LocalChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I seem to have an issue with that request. Could you try again?',
        created_at: new Date().toISOString(),
      };
      setGlobalMessages(prev => [...prev, errorMessage]);
    }
  }, [inputValue, proposalId, isProposalContext, organizationId, userId, conversation, sendChatMessage, setGlobalMessages]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Quick action handlers
  const handleQuickAction = useCallback(async (action: string) => {
    if (!proposalId) return;

    switch (action) {
      case 'follow-up':
        await generateFollowUp.mutateAsync({
          proposalId,
          organizationId,
          userId,
          forceRegenerate: true,
        });
        break;
      case 'reminders':
        await suggestReminders.mutateAsync({
          proposalId,
          organizationId,
          userId,
        });
        break;
      case 'recommendations':
        await getRecommendations.mutateAsync({
          proposalId,
          organizationId,
          userId,
        });
        break;
    }
  }, [proposalId, organizationId, userId, generateFollowUp, suggestReminders, getRecommendations]);

  const handleApplySuggestion = useCallback(async (suggestionId: string) => {
    await applySuggestion.mutateAsync(suggestionId);
  }, [applySuggestion]);

  const handleDismissSuggestion = useCallback(async (suggestionId: string) => {
    await dismissSuggestion.mutateAsync({ suggestionId });
  }, [dismissSuggestion]);

  const isGenerating = generateFollowUp.isPending || suggestReminders.isPending || getRecommendations.isPending;

  // Handle action confirmation
  const handleConfirmAction = useCallback(async (action: PendingAction) => {
    try {
      const result = await confirmActionMutation.mutateAsync({
        organizationId,
        userId,
        pendingAction: action,
      });

      if (result.success && result.data) {
        // Add success message to chat
        const successMessage: LocalChatMessage = {
          id: `success-${Date.now()}`,
          role: 'assistant',
          content: result.data.message || `Successfully created ${action.type.replace('_', ' ')}.`,
          created_at: new Date().toISOString(),
        };
        setGlobalMessages(prev => [...prev, successMessage]);
      } else {
        // Add error message - use friendly message, log technical error
        console.error('[Ada] Action failed:', result.error);
        const errorMessage: LocalChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "I'm having trouble completing that action. Could you try again?",
          created_at: new Date().toISOString(),
        };
        setGlobalMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('[Ada] Confirm action error:', error);
      const errorMessage: LocalChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Something went wrong on my end. Let's try that again.",
        created_at: new Date().toISOString(),
      };
      setGlobalMessages(prev => [...prev, errorMessage]);
    } finally {
      setPendingAction(null);
    }
  }, [organizationId, userId, confirmActionMutation, setGlobalMessages]);

  const handleCancelAction = useCallback(() => {
    setPendingAction(null);
    // Add cancellation message
    const cancelMessage: LocalChatMessage = {
      id: `cancel-${Date.now()}`,
      role: 'assistant',
      content: 'No problem! Let me know if you need anything else.',
      created_at: new Date().toISOString(),
    };
    setGlobalMessages(prev => [...prev, cancelMessage]);
  }, [setGlobalMessages]);

  // Handle clicking a suggestion from Ada's greeting - submit directly
  const handleSuggestionClick = useCallback(async (suggestion: string) => {
    // Add user message to local state immediately
    const userMessage: LocalChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: suggestion,
      created_at: new Date().toISOString(),
    };
    setGlobalMessages(prev => [...prev, userMessage]);

    try {
      const result = await sendChatMessage.mutateAsync({
        organizationId,
        userId,
        message: suggestion,
        conversationHistory: globalMessages as AIMessage[],
      });

      if (result.success && result.data?.response) {
        const aiMessage: LocalChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: result.data.response,
          created_at: new Date().toISOString(),
        };
        setGlobalMessages(prev => [...prev, aiMessage]);

        // Check if there's a pending action
        if (result.data.pendingAction) {
          setPendingAction(result.data.pendingAction as PendingAction);
        }
      }
    } catch (error) {
      console.error('[Ada] Suggestion click error:', error);
      const errorMessage: LocalChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I had trouble processing that. Could you try again?',
        created_at: new Date().toISOString(),
      };
      setGlobalMessages(prev => [...prev, errorMessage]);
    }
  }, [organizationId, userId, globalMessages, sendChatMessage, setGlobalMessages]);

  const hasMessages = conversation && conversation.length > 0;

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      {/* Messages Area */}
      <div className={cn(
        'flex-1 px-3 py-2',
        hasMessages ? 'overflow-y-auto' : 'overflow-hidden'
      )}>
        {/* Global chat - show greeting/conversation with quick actions */}
        {!isProposalContext ? (
          <div className="h-full flex flex-col justify-end pb-2">
            {/* Static greeting (shown instantly when no messages) */}
            {!hasMessages && (
              <div className="space-y-1.5 mb-3">
                <AdaMessage
                  message={{
                    id: 'static-greeting',
                    role: 'assistant',
                    content: STATIC_GREETING,
                    created_at: new Date().toISOString(),
                  }}
                  isLatest={true}
                  onSuggestionClick={handleSuggestionClick}
                />
              </div>
            )}

            {/* Show conversation messages */}
            {hasMessages && (
              <div className="space-y-1.5 mb-3">
                {conversation?.map((message, index) => (
                  <AdaMessage
                    key={message.id}
                    message={message}
                    isLatest={index === (conversation?.length || 0) - 1}
                    onSuggestionClick={handleSuggestionClick}
                  />
                ))}
              </div>
            )}

            {/* Pending Action Confirmation */}
            <AnimatePresence>
              {pendingAction && (
                <div className="mb-3">
                  <AdaActionConfirmation
                    action={pendingAction}
                    onConfirm={handleConfirmAction}
                    onCancel={handleCancelAction}
                  />
                </div>
              )}
            </AnimatePresence>

            {/* Typing indicator during conversation */}
            <AnimatePresence>
              {hasMessages && isTyping && (
                <div className="mb-3">
                  <AdaTypingIndicator />
                </div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="space-y-2">
            {/* Loading state */}
            {isLoading && (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-8 rounded-lg animate-pulse',
                      'bg-gray-100 dark:bg-white/5'
                    )}
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
            )}

            {/* Empty state for proposal context */}
            {!isLoading && !hasMessages && (!suggestions || suggestions.length === 0) && (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400 text-[11px]">
                  Ask me anything about this proposal
                </p>
              </div>
            )}

            {/* Suggestions */}
            <AnimatePresence>
              {suggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-1.5"
                >
                  <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Suggestions
                  </p>
                  {suggestions.map((suggestion, index) => (
                    <AdaSuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onApply={() => handleApplySuggestion(suggestion.id)}
                      onDismiss={() => handleDismissSuggestion(suggestion.id)}
                      index={index}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Conversation */}
            {hasMessages && (
              <div className="space-y-1.5">
                {(suggestions?.length || 0) > 0 && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                    <span className="text-[9px] text-gray-400 dark:text-gray-500">
                      Chat
                    </span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                  </div>
                )}
                {conversation?.map((message, index) => (
                  <AdaMessage
                    key={message.id}
                    message={message}
                    isLatest={index === (conversation?.length || 0) - 1}
                    onSuggestionClick={handleSuggestionClick}
                  />
                ))}
              </div>
            )}

            {/* Pending Action Confirmation */}
            <AnimatePresence>
              {pendingAction && (
                <AdaActionConfirmation
                  action={pendingAction}
                  onConfirm={handleConfirmAction}
                  onCancel={handleCancelAction}
                />
              )}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
              {isTyping && <AdaTypingIndicator />}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Quick Actions (only in proposal context) */}
      {isProposalContext && (
        <AdaQuickActions
          onAction={handleQuickAction}
          isLoading={isGenerating}
        />
      )}

      {/* Input Area - Compact */}
      <div className="px-3 pb-3 pt-1">
        <div
          className={cn(
            'relative flex items-center gap-1',
            'bg-gray-100 dark:bg-gray-800',
            'rounded-lg',
            'border border-transparent',
            'focus-within:border-gray-300 dark:focus-within:border-gray-600',
            'transition-colors duration-150'
          )}
        >
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Message Ada..."
            rows={1}
            className={cn(
              'flex-1 py-2 px-3',
              'bg-transparent',
              'text-[12px] text-gray-900 dark:text-white',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'border-0 focus:outline-none focus:ring-0',
              'resize-none max-h-16',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />

          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className={cn(
              'flex-shrink-0 w-6 h-6 mr-1',
              'rounded-md',
              'flex items-center justify-center',
              'bg-gray-900 dark:bg-white',
              'text-white dark:text-gray-900',
              'hover:bg-gray-800 dark:hover:bg-gray-100',
              'disabled:opacity-30 disabled:cursor-not-allowed',
              'transition-colors duration-150'
            )}
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3">
              <path
                d="M5 12h14M12 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdaChat;
