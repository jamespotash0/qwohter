/**
 * Ada Chat Panel
 *
 * The main chat interface for Ada with context-aware capabilities.
 * Can help with proposals, answer questions, and provide proactive suggestions.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
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
}

// ============================================================================
// Component
// ============================================================================

export const AdaChat: React.FC<AdaChatProps> = ({
  organizationId,
  userId,
}) => {
  const location = useLocation();
  const [inputValue, setInputValue] = useState('');
  const [globalMessages, setGlobalMessages] = useState<LocalChatMessage[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
      const userMessage: AIMessage = {
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
          const aiMessage: AIMessage = {
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
        if (!isProposalContext) {
          const errorMessage: AIMessage = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: result.error || 'Sorry, I encountered an error. Please try again.',
            created_at: new Date().toISOString(),
          };
          setGlobalMessages(prev => [...prev, errorMessage]);
        }
      }
    } catch (error) {
      console.error('[Ada] Chat exception:', error);
      // For global chat, add error message
      if (!isProposalContext) {
        const errorMessage: AIMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          created_at: new Date().toISOString(),
        };
        setGlobalMessages(prev => [...prev, errorMessage]);
      }
    }
  }, [inputValue, proposalId, isProposalContext, organizationId, userId, conversation, sendChatMessage]);

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
        // Add error message
        const errorMessage: LocalChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: result.error || 'Failed to complete the action. Please try again.',
          created_at: new Date().toISOString(),
        };
        setGlobalMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('[Ada] Confirm action error:', error);
      const errorMessage: LocalChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        created_at: new Date().toISOString(),
      };
      setGlobalMessages(prev => [...prev, errorMessage]);
    } finally {
      setPendingAction(null);
    }
  }, [organizationId, userId, confirmActionMutation]);

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
  }, []);

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Welcome state - shown when no conversation yet */}
        {!isProposalContext && (!conversation || conversation.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={cn(
                'w-14 h-14 rounded-2xl mb-4',
                'bg-gray-900 dark:bg-white',
                'flex items-center justify-center'
              )}
            >
              <Sparkles className="w-6 h-6 text-white dark:text-gray-900" />
            </motion.div>

            <motion.h3
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-lg font-semibold text-gray-900 dark:text-white mb-2"
            >
              Hi, I'm Ada
            </motion.h3>

            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs"
            >
              I can help you with your proposals, answer questions about your business, and provide recommendations.
            </motion.p>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-3 w-full max-w-xs"
            >
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Try asking me:
              </p>
              <div className="space-y-2">
                {[
                  'What proposals are pending?',
                  'Help me write a follow-up email',
                  'What\'s my win rate this month?',
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputValue(suggestion);
                      inputRef.current?.focus();
                    }}
                    className={cn(
                      'block w-full px-4 py-2.5 rounded-xl text-left',
                      'bg-gray-100 dark:bg-gray-800',
                      'text-gray-700 dark:text-gray-300',
                      'text-sm',
                      'hover:bg-gray-200 dark:hover:bg-gray-700',
                      'transition-colors duration-150'
                    )}
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <>
            {/* Loading state */}
            {isLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-16 rounded-2xl animate-pulse',
                      'bg-gray-100 dark:bg-white/5'
                    )}
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
            )}

            {/* Empty state for proposal context */}
            {!isLoading && (!conversation || conversation.length === 0) && (!suggestions || suggestions.length === 0) && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  I'm ready to help with this proposal!
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs">
                  Ask me anything or use the quick actions below.
                </p>
              </div>
            )}

            {/* Suggestions */}
            <AnimatePresence>
              {suggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
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
            {conversation && conversation.length > 0 && (
              <div className="space-y-3">
                {(suggestions?.length || 0) > 0 && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      Conversation
                    </span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                  </div>
                )}
                {conversation.map((message, index) => (
                  <AdaMessage
                    key={message.id}
                    message={message}
                    isLatest={index === conversation.length - 1}
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
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions (only in proposal context) */}
      {isProposalContext && (
        <AdaQuickActions
          onAction={handleQuickAction}
          isLoading={isGenerating}
        />
      )}

      {/* Input Area */}
      <div className="relative px-4 pb-4 pt-2">
        <div
          className={cn(
            'relative flex items-end gap-2',
            'bg-gray-100/80 dark:bg-white/5',
            'rounded-2xl',
            'border border-gray-200/50 dark:border-white/10',
            'focus-within:border-gray-300 dark:focus-within:border-gray-600',
            'focus-within:ring-4 focus-within:ring-gray-900/5 dark:focus-within:ring-white/5',
            'transition-all duration-200'
          )}
        >
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isProposalContext ? "Ask about this proposal..." : "Ask Ada anything..."}
            rows={1}
            className={cn(
              'flex-1 py-3 px-4',
              'bg-transparent',
              'text-sm text-gray-900 dark:text-white',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'border-0 focus:outline-none focus:ring-0',
              'resize-none',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />

          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className={cn(
              'flex-shrink-0 w-9 h-9 mb-1.5 mr-1.5',
              'rounded-xl',
              'flex items-center justify-center',
              'bg-gray-900 dark:bg-white',
              'text-white dark:text-gray-900',
              'shadow-lg shadow-gray-900/20',
              'hover:shadow-xl hover:bg-gray-800 dark:hover:bg-gray-100',
              'hover:scale-105 active:scale-95',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100',
              'transition-all duration-200'
            )}
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path
                d="M5 12h14M12 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Powered by badge */}
        <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-2">
          Powered by GPT-4o
        </p>
      </div>
    </div>
  );
};

export default AdaChat;
