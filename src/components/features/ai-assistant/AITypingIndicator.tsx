/**
 * AI Typing Indicator Component
 *
 * Animated "AI is thinking..." indicator shown while waiting for response.
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface AITypingIndicatorProps {
  className?: string;
  message?: string;
}

// ============================================================================
// Component
// ============================================================================

export const AITypingIndicator: React.FC<AITypingIndicatorProps> = ({
  className,
  message = 'AI is thinking',
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg bg-gray-50 mr-8',
        className
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-white animate-pulse" />
      </div>

      {/* Typing indicator */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">{message}</span>
        <div className="flex gap-1">
          <span
            className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
};

export default AITypingIndicator;
