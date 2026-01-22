/**
 * Ada Message Bubble
 *
 * Compact chat message with distinct user/assistant colors.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { AIMessage, LocalChatMessage } from '@/lib/types/aiWorkflow';

// ============================================================================
// Types
// ============================================================================

/** Message can be full AIMessage from server or LocalChatMessage for global chat */
type MessageType = AIMessage | LocalChatMessage;

interface AdaMessageProps {
  message: MessageType;
  isLatest?: boolean;
  /** Callback when a suggestion bullet point is clicked */
  onSuggestionClick?: (suggestion: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export const AdaMessage: React.FC<AdaMessageProps> = ({
  message,
  isLatest = false,
  onSuggestionClick,
}) => {
  const isUser = message.role === 'user';
  const isProactive = 'is_proactive' in message ? message.is_proactive : false;

  // Parse message content to separate text and bullet suggestions
  const { textContent, suggestions } = React.useMemo(() => {
    const lines = message.content.split('\n');
    const textLines: string[] = [];
    const bulletSuggestions: string[] = [];

    for (const line of lines) {
      // Check if line is a bullet point (•, -, or * at start, with optional leading whitespace)
      const trimmedLine = line.trim();
      const bulletMatch = trimmedLine.match(/^[•\-\*]\s*(.+)$/);
      if (bulletMatch && bulletMatch[1]) {
        bulletSuggestions.push(bulletMatch[1].trim());
      } else {
        textLines.push(line);
      }
    }

    // Remove trailing empty lines from text
    while (textLines.length > 0 && textLines[textLines.length - 1]?.trim() === '') {
      textLines.pop();
    }

    return {
      textContent: textLines.join('\n'),
      suggestions: bulletSuggestions,
    };
  }, [message.content]);

  return (
    <motion.div
      initial={isLatest ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'flex',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Message Bubble */}
      <div
        className={cn(
          'max-w-[85%] px-2.5 py-1.5 rounded-lg text-[11px] leading-relaxed',
          isUser
            ? [
                // User: coral/orange bubble (80% opacity)
                'bg-[#EE6C4D]/80',
                'text-white',
                'rounded-br-[3px]',
              ]
            : [
                // Ada: light blue-ish tint
                'bg-blue-50 dark:bg-blue-950/40',
                'text-gray-800 dark:text-gray-100',
                'rounded-bl-[3px]',
                isProactive && 'border border-emerald-200 dark:border-emerald-800',
              ]
        )}
      >
        {/* Proactive indicator */}
        {isProactive && (
          <div className="flex items-center gap-1 mb-1">
            <span className="w-1 h-1 rounded-full bg-emerald-500" />
            <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 uppercase">
              Insight
            </span>
          </div>
        )}

        {/* Message content */}
        {textContent && (
          <p className="whitespace-pre-wrap">
            {textContent}
          </p>
        )}

        {/* Clickable suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-2 space-y-1">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick?.(suggestion)}
                disabled={!onSuggestionClick}
                className={cn(
                  'block w-full px-2 py-1 rounded text-left text-[10px]',
                  'bg-white/60 dark:bg-white/10',
                  'hover:bg-white dark:hover:bg-white/20',
                  'transition-colors duration-150',
                  !onSuggestionClick && 'cursor-default'
                )}
              >
                • {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p
          className={cn(
            'text-[9px] mt-1',
            isUser
              ? 'text-white/70' // Darker on coral background
              : 'opacity-50'
          )}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </motion.div>
  );
};

// ============================================================================
// Helpers
// ============================================================================

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' +
    date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default AdaMessage;
