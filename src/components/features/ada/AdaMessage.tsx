/**
 * Ada Message Bubble
 *
 * Individual chat message with clean styling.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
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
}

// ============================================================================
// Component
// ============================================================================

export const AdaMessage: React.FC<AdaMessageProps> = ({
  message,
  isLatest = false,
}) => {
  const isUser = message.role === 'user';
  const isProactive = 'is_proactive' in message ? message.is_proactive : false;

  return (
    <motion.div
      initial={isLatest ? { opacity: 0, y: 10, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      {!isUser && (
        <div
          className={cn(
            'flex-shrink-0 w-7 h-7 rounded-lg',
            'bg-gray-900 dark:bg-white',
            'flex items-center justify-center'
          )}
        >
          <Sparkles className="w-3.5 h-3.5 text-white dark:text-gray-900" />
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={cn(
          'max-w-[80%] px-4 py-2.5 rounded-2xl',
          isUser
            ? [
                'bg-gray-900 dark:bg-white',
                'text-white dark:text-gray-900',
                'rounded-br-md',
              ]
            : [
                'bg-gray-100 dark:bg-gray-800',
                'text-gray-800 dark:text-gray-100',
                'rounded-bl-md',
                isProactive && 'ring-1 ring-emerald-200 dark:ring-emerald-500/30',
              ]
        )}
      >
        {/* Proactive indicator */}
        {isProactive && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Insight
            </span>
          </div>
        )}

        {/* Message content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>

        {/* Timestamp */}
        <p
          className={cn(
            'text-[10px] mt-1.5',
            isUser
              ? 'text-white/60 dark:text-gray-900/60'
              : 'text-gray-400 dark:text-gray-500'
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
