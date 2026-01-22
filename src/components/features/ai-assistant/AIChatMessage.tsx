/**
 * AI Chat Message Component
 *
 * Displays a single message in the chat conversation.
 * Supports user and assistant messages with different styling.
 */

import React from 'react';
import { User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIMessage } from '@/lib/types/aiWorkflow';

// ============================================================================
// Types
// ============================================================================

interface AIChatMessageProps {
  message: AIMessage;
  isLatest?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const AIChatMessage: React.FC<AIChatMessageProps> = ({
  message,
  isLatest = false,
}) => {
  const isUser = message.role === 'User';
  const isProactive = message.is_proactive;

  // Format timestamp
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg',
        isUser
          ? 'bg-purple-50 ml-8'
          : isProactive
          ? 'bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100'
          : 'bg-gray-50 mr-8',
        isLatest && !isUser && 'animate-fade-in'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-purple-200' : 'bg-purple-500'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-purple-700" />
        ) : (
          <Sparkles className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-700">
            {isUser ? 'You' : isProactive ? 'AI Assistant (proactive)' : 'AI Assistant'}
          </span>
          <span className="text-xs text-gray-400">{formatTime(message.created_at)}</span>
        </div>

        {/* Content */}
        <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    </div>
  );
};

export default AIChatMessage;
