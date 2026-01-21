/**
 * AI Assistant Panel
 *
 * A Sheet-based side panel that provides a conversational AI assistant.
 * Features:
 * - Chat-style interface for natural language interaction
 * - Proactive suggestions based on proposal context
 * - Auto-analysis when panel opens
 * - Quick action buttons for common tasks
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  RefreshCw,
  Mail,
  Bell,
  Lightbulb,
  AlertCircle,
  Settings,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useAISuggestions,
  useAIConversation,
  useGenerateFollowUp,
  useSuggestReminders,
  useGetRecommendations,
  useSendChatMessage,
  useApplySuggestionOptimistic,
  useDismissSuggestionOptimistic,
  useProactiveAnalysis,
  useSuggestionPolling,
} from '@/hooks/queries/useAISuggestions';
import { AIChatMessage } from './AIChatMessage';
import { AIChatInput } from './AIChatInput';
import { AIProactiveSuggestion } from './AIProactiveSuggestion';
import { AITypingIndicator } from './AITypingIndicator';
import type { EmailTone, AIMessage } from '@/lib/types/aiWorkflow';

// ============================================================================
// Types
// ============================================================================

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string;
  organizationId: string;
  userId: string;
  proposalStatus?: string;
  proposalName?: string;
}

// ============================================================================
// Component
// ============================================================================

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  isOpen,
  onClose,
  proposalId,
  organizationId,
  userId,
  proposalStatus,
  proposalName,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [actingSuggestionId, setActingSuggestionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions and conversation
  const {
    data: suggestions,
    isLoading: suggestionsLoading,
    refetch: refetchSuggestions,
  } = useAISuggestions(proposalId, 'pending', isOpen);

  const {
    data: conversation,
    isLoading: conversationLoading,
  } = useAIConversation(proposalId, isOpen);

  // Generation mutations
  const generateFollowUp = useGenerateFollowUp();
  const suggestReminders = useSuggestReminders();
  const getRecommendations = useGetRecommendations();
  const sendChatMessage = useSendChatMessage(proposalId);

  // Action mutations with optimistic updates
  const applySuggestion = useApplySuggestionOptimistic(proposalId);
  const dismissSuggestion = useDismissSuggestionOptimistic(proposalId);

  // Proactive analysis on open
  const proactiveAnalysis = useProactiveAnalysis(
    proposalId,
    organizationId,
    userId,
    isOpen
  );

  // Poll for updates while open
  useSuggestionPolling(proposalId, isOpen);

  const isGenerating =
    generateFollowUp.isPending ||
    suggestReminders.isPending ||
    getRecommendations.isPending ||
    proactiveAnalysis.isPending;

  const isChatting = sendChatMessage.isPending;
  const isLoading = suggestionsLoading || conversationLoading;

  const pendingCount = suggestions?.length || 0;

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  // Handlers
  const handleGenerateFollowUp = async (tone: EmailTone = 'formal') => {
    setError(null);
    const result = await generateFollowUp.mutateAsync({
      proposalId,
      organizationId,
      userId,
      tone,
      forceRegenerate: true,
    });

    if (!result.success) {
      setError(result.error || 'Failed to generate follow-up email');
    }
  };

  const handleSuggestReminders = async () => {
    setError(null);
    const result = await suggestReminders.mutateAsync({
      proposalId,
      organizationId,
      userId,
    });

    if (!result.success) {
      setError(result.error || 'Failed to suggest reminders');
    }
  };

  const handleGetRecommendations = async () => {
    setError(null);
    const result = await getRecommendations.mutateAsync({
      proposalId,
      organizationId,
      userId,
    });

    if (!result.success) {
      setError(result.error || 'Failed to get recommendations');
    }
  };

  const handleSendMessage = async (message: string) => {
    setError(null);
    const result = await sendChatMessage.mutateAsync({
      organizationId,
      userId,
      message,
      conversationHistory: conversation as AIMessage[],
    });

    if (!result.success) {
      setError(result.error || 'Failed to send message');
    }
  };

  const handleApply = async (suggestionId: string) => {
    setActingSuggestionId(suggestionId);
    try {
      await applySuggestion.mutateAsync(suggestionId);
    } finally {
      setActingSuggestionId(null);
    }
  };

  const handleDismiss = async (suggestionId: string) => {
    setActingSuggestionId(suggestionId);
    try {
      await dismissSuggestion.mutateAsync({ suggestionId });
    } finally {
      setActingSuggestionId(null);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <SheetTitle>AI Assistant</SheetTitle>
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingCount} suggestion{pendingCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchSuggestions()}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <SheetDescription className="text-left">
            AI-powered assistant for{' '}
            <span className="font-medium">{proposalName || 'this proposal'}</span>
            {proposalStatus && (
              <Badge variant="outline" className="ml-2 text-xs">
                {proposalStatus}
              </Badge>
            )}
          </SheetDescription>
        </SheetHeader>

        {/* Quick Actions */}
        <div className="px-6 py-3 border-b bg-gray-50/50 flex-shrink-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Quick Actions
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateFollowUp('formal')}
              disabled={isGenerating}
              className="text-xs h-8"
            >
              {generateFollowUp.isPending ? (
                <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <Mail className="w-3 h-3 mr-1.5" />
              )}
              Follow-up Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSuggestReminders}
              disabled={isGenerating}
              className="text-xs h-8"
            >
              {suggestReminders.isPending ? (
                <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <Bell className="w-3 h-3 mr-1.5" />
              )}
              Smart Reminders
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGetRecommendations}
              disabled={isGenerating}
              className="text-xs h-8"
            >
              {getRecommendations.isPending ? (
                <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <Lightbulb className="w-3 h-3 mr-1.5" />
              )}
              Recommendations
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="px-6 pt-3 flex-shrink-0">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <>
              {/* Welcome message if no conversation yet */}
              {(!conversation || conversation.length === 0) && suggestions?.length === 0 && (
                <div className="text-center py-8">
                  <Sparkles className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm font-medium">
                    Hi! I'm your AI assistant.
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Ask me questions, request tasks, or use the quick actions above.
                  </p>
                </div>
              )}

              {/* Proactive suggestions */}
              {suggestions && suggestions.length > 0 && (
                <div className="space-y-3">
                  {suggestions.map((suggestion) => (
                    <AIProactiveSuggestion
                      key={suggestion.id}
                      suggestion={suggestion}
                      onAccept={() => handleApply(suggestion.id)}
                      onDismiss={() => handleDismiss(suggestion.id)}
                      isAccepting={actingSuggestionId === suggestion.id && applySuggestion.isPending}
                      isDismissing={actingSuggestionId === suggestion.id && dismissSuggestion.isPending}
                    />
                  ))}
                </div>
              )}

              {/* Conversation messages */}
              {conversation && conversation.length > 0 && (
                <div className="space-y-3 mt-4">
                  {(suggestions?.length || 0) > 0 && (
                    <div className="border-t pt-4 -mx-4 px-4">
                      <p className="text-xs text-gray-400 text-center mb-4">Conversation</p>
                    </div>
                  )}
                  {conversation.map((message, index) => (
                    <AIChatMessage
                      key={message.id}
                      message={message}
                      isLatest={index === conversation.length - 1}
                    />
                  ))}
                </div>
              )}

              {/* Typing indicator */}
              {isChatting && <AITypingIndicator />}

              {/* Analyzing indicator */}
              {proactiveAnalysis.isPending && (
                <AITypingIndicator message="Analyzing proposal" />
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Chat Input */}
        <AIChatInput
          onSend={handleSendMessage}
          isSending={isChatting}
          disabled={isLoading}
          suggestions={[
            'Draft a follow-up email',
            'Create a reminder for next week',
            'What tasks are pending?',
            'Suggest next steps',
          ]}
        />

        {/* Footer */}
        <div className="px-6 py-2 border-t bg-gray-50/50 flex-shrink-0 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Powered by GPT-4o-mini
          </p>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Settings className="w-3.5 h-3.5 text-gray-400" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AIAssistantPanel;
