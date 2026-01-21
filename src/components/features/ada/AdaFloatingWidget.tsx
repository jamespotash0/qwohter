/**
 * Ada Floating Widget
 *
 * A clean, recognizable AI assistant that's always available.
 * Named after Ada Lovelace, the first computer programmer.
 *
 * Design: Modern AI aesthetic - clean, professional, instantly recognizable
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdaChat } from './AdaChat';
import { useUser } from '@/auth';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';

// ============================================================================
// Main Component
// ============================================================================

export const AdaFloatingWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id || '', !!user?.id);

  const handleOpen = () => {
    setIsOpen(true);
  };

  // Don't render if not authenticated
  if (!user || !organization) return null;

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={handleOpen}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
              'fixed bottom-6 right-20 z-50',
              'flex items-center gap-2',
              'px-4 h-12 rounded-full',
              'bg-gray-900 dark:bg-white',
              'text-white dark:text-gray-900',
              'shadow-lg shadow-gray-900/20 dark:shadow-black/20',
              'hover:shadow-xl',
              'hover:scale-[1.02] active:scale-[0.98]',
              'transition-all duration-200',
              'cursor-pointer'
            )}
            aria-label="Open Ada AI Assistant"
          >
            {/* AI Icon */}
            <div className="relative">
              <Sparkles className="w-5 h-5" />
              {/* Subtle glow on icon */}
              <div className="absolute inset-0 blur-sm opacity-50">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            {/* Label */}
            <span className="font-medium text-sm">
              Ask Ada
            </span>

            {/* AI badge */}
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide',
              'bg-white/20 dark:bg-gray-900/20'
            )}>
              AI
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'fixed bottom-6 right-20 z-50',
              'w-[380px] h-[480px] max-h-[70vh]',
              'rounded-2xl overflow-hidden',
              'flex flex-col',
              'bg-white dark:bg-gray-900',
              'border border-gray-200 dark:border-gray-800',
              'shadow-2xl shadow-gray-900/20 dark:shadow-black/40'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                {/* Ada avatar */}
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl',
                    'bg-gray-900 dark:bg-white',
                    'flex items-center justify-center'
                  )}
                >
                  <Sparkles className="w-4 h-4 text-white dark:text-gray-900" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                      Ada
                    </h2>
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide',
                      'bg-emerald-100 dark:bg-emerald-900/30',
                      'text-emerald-700 dark:text-emerald-400'
                    )}>
                      AI
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Your proposal assistant
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className={cn(
                  'w-8 h-8 rounded-lg',
                  'flex items-center justify-center',
                  'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'transition-colors duration-150'
                )}
                aria-label="Close Ada"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Content */}
            <AdaChat
              organizationId={organization.id}
              userId={user.id}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdaFloatingWidget;
