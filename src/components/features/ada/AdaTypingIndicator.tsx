/**
 * Ada Typing Indicator
 *
 * Animated dots showing Ada is processing.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface AdaTypingIndicatorProps {
  message?: string;
}

// ============================================================================
// Component
// ============================================================================

export const AdaTypingIndicator: React.FC<AdaTypingIndicatorProps> = ({
  message = 'Ada is thinking',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-start gap-3"
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-lg',
          'bg-gray-900 dark:bg-white',
          'flex items-center justify-center'
        )}
      >
        <Sparkles className="w-3.5 h-3.5 text-white dark:text-gray-900" />
      </div>

      {/* Typing bubble */}
      <div
        className={cn(
          'px-4 py-3 rounded-2xl rounded-bl-md',
          'bg-gray-100 dark:bg-gray-800'
        )}
      >
        <div className="flex items-center gap-2">
          {/* Animated dots */}
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </div>

          {/* Optional message */}
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
            {message}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default AdaTypingIndicator;
