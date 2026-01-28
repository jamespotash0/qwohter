/**
 * Ada Typing Indicator
 *
 * Animated dots showing Ada is processing.
 */

import React from 'react';
import { motion } from 'framer-motion';
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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex items-center gap-2"
    >
      {/* Typing bubble - compact */}
      <div
        className={cn(
          'px-2.5 py-1.5 rounded-lg rounded-bl-[3px]',
          'bg-blue-50 dark:bg-blue-950/40'
        )}
      >
        <div className="flex items-center gap-1.5">
          {/* Animated dots */}
          <div className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 1, 0.4],
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
          <span className="text-[9px] text-gray-400 dark:text-gray-500">
            {message}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default AdaTypingIndicator;
