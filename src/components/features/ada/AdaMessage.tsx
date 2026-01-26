/**
 * Ada Message Bubble
 *
 * Compact chat message with distinct user/assistant colors.
 * Includes thumbs up/down feedback for AI responses.
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Check, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { submitThumbsUp, submitThumbsDown } from '@/services/aiFeedbackService';
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
  /** Organization ID for feedback submission */
  organizationId?: string;
}

// ============================================================================
// Component
// ============================================================================

export const AdaMessage: React.FC<AdaMessageProps> = ({
  message,
  isLatest = false,
  onSuggestionClick,
  organizationId,
}) => {
  const isUser = message.role.toLowerCase() === 'user';
  const isProactive = 'is_proactive' in message ? message.is_proactive : false;
  const isStaticGreeting = message.id === 'static-greeting';

  // Feedback state
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const feedbackInputRef = useRef<HTMLInputElement>(null);

  // Handle thumbs up - quick action, no input needed
  const handleThumbsUp = useCallback(async () => {
    if (!organizationId || feedbackGiven || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await submitThumbsUp(message.content, organizationId);
      console.log('[AdaMessage] Thumbs up result:', result);
      setFeedbackGiven('up');
    } catch (err) {
      console.error('[AdaMessage] Thumbs up error:', err);
      setFeedbackGiven('up'); // Still show thanks for UX
    } finally {
      setIsSubmitting(false);
    }
  }, [organizationId, message.content, feedbackGiven, isSubmitting]);

  // Handle thumbs down click - show feedback input
  const handleThumbsDownClick = useCallback(() => {
    if (!organizationId || feedbackGiven || isSubmitting) return;
    setShowFeedbackInput(true);
    // Focus input after render
    setTimeout(() => feedbackInputRef.current?.focus(), 50);
  }, [organizationId, feedbackGiven, isSubmitting]);

  // Submit thumbs down with optional feedback
  const handleSubmitThumbsDown = useCallback(async () => {
    if (!organizationId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await submitThumbsDown(
        message.content,
        organizationId,
        feedbackText.trim() || undefined
      );
      console.log('[AdaMessage] Thumbs down result:', result);
      setFeedbackGiven('down');
      setShowFeedbackInput(false);
      setFeedbackText('');
    } catch (err) {
      console.error('[AdaMessage] Thumbs down error:', err);
      setFeedbackGiven('down');
      setShowFeedbackInput(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [organizationId, message.content, feedbackText, isSubmitting]);

  // Cancel feedback input
  const handleCancelFeedback = useCallback(() => {
    setShowFeedbackInput(false);
    setFeedbackText('');
  }, []);

  // Show feedback buttons for assistant messages (not user, not static greeting)
  const showFeedbackButtons = !isUser && !isStaticGreeting && organizationId;

  // Parse message content to separate text and clickable bullet suggestions
  const { textContent, suggestions } = React.useMemo(() => {
    const lines = message.content.split('\n');
    const textLines: string[] = [];
    const bulletSuggestions: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      // Check if line is a bullet point (•, -, or * at start)
      const bulletMatch = trimmedLine.match(/^([•\-]|\*(?!\*))\s+(.+)$/);

      if (bulletMatch && bulletMatch[2]) {
        const bulletContent = bulletMatch[2].trim();
        // Only make it clickable if it's an action suggestion, NOT data/stats
        // Data bullets contain: **bold**, numbers with $, or colons followed by values
        const isDataBullet =
          bulletContent.includes('**') ||           // Has bold markdown (stats labels)
          /:\s*\$?\d/.test(bulletContent) ||        // Has colon followed by number/dollar
          /^\d+%?$/.test(bulletContent);            // Is just a number/percentage

        if (isDataBullet) {
          // Keep as regular text, not clickable
          textLines.push(line);
        } else {
          // Action suggestion - make clickable
          bulletSuggestions.push(bulletContent);
        }
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
          'max-w-[85%] px-3 py-2 rounded-lg text-[13px] leading-relaxed',
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
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase">
              Insight
            </span>
          </div>
        )}

        {/* Message content with basic markdown parsing */}
        {textContent && (
          <p className="whitespace-pre-wrap">
            {parseBasicMarkdown(textContent)}
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
                  'block w-full px-2 py-1.5 rounded text-left text-[12px]',
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

        {/* Timestamp and Feedback */}
        <div className="flex items-center justify-between mt-1 gap-2">
          <p
            className={cn(
              'text-[10px]',
              isUser
                ? 'text-white/70'
                : 'opacity-50'
            )}
          >
            {formatTime(message.created_at)}
          </p>

          {/* Feedback buttons - only for assistant messages */}
          {showFeedbackButtons && (
            <AnimatePresence mode="wait">
              {feedbackGiven ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400"
                >
                  <Check className="w-3 h-3" />
                  <span>Thanks!</span>
                </motion.div>
              ) : showFeedbackInput ? (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex items-center gap-1"
                >
                  <input
                    ref={feedbackInputRef}
                    type="text"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmitThumbsDown();
                      if (e.key === 'Escape') handleCancelFeedback();
                    }}
                    placeholder="What went wrong? (optional)"
                    className={cn(
                      'w-32 px-2 py-0.5 text-[10px] rounded',
                      'bg-white dark:bg-gray-800',
                      'border border-gray-200 dark:border-gray-600',
                      'focus:outline-none focus:ring-1 focus:ring-red-400',
                      'placeholder:text-gray-400'
                    )}
                  />
                  <button
                    onClick={handleSubmitThumbsDown}
                    disabled={isSubmitting}
                    className={cn(
                      'p-1 rounded',
                      'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
                      'transition-colors duration-150',
                      'disabled:opacity-50'
                    )}
                    title="Submit feedback"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleCancelFeedback}
                    className={cn(
                      'p-1 rounded',
                      'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
                      'transition-colors duration-150'
                    )}
                    title="Cancel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1"
                >
                  <button
                    onClick={handleThumbsUp}
                    disabled={isSubmitting}
                    className={cn(
                      'p-1 rounded hover:bg-white/50 dark:hover:bg-white/10',
                      'text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400',
                      'transition-colors duration-150',
                      'disabled:opacity-50'
                    )}
                    title="Helpful"
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleThumbsDownClick}
                    disabled={isSubmitting}
                    className={cn(
                      'p-1 rounded hover:bg-white/50 dark:hover:bg-white/10',
                      'text-gray-400 hover:text-red-500 dark:hover:text-red-400',
                      'transition-colors duration-150',
                      'disabled:opacity-50'
                    )}
                    title="Not helpful"
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse basic markdown (**bold**) and return React elements
 */
function parseBasicMarkdown(text: string): React.ReactNode {
  // Split by **text** pattern while capturing the bold content
  const parts = text.split(/\*\*([^*]+)\*\*/g);

  if (parts.length === 1) {
    // No markdown found, return plain text
    return text;
  }

  // Alternate between plain text (even indices) and bold text (odd indices)
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      // Bold text
      return <strong key={index} className="font-semibold">{part}</strong>;
    }
    return part;
  });
}

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
