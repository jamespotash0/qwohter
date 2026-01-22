/**
 * Ada Floating Widget
 *
 * A clean, recognizable AI assistant that's always available.
 * Named after Ada Lovelace, the first computer programmer.
 *
 * Design: Modern AI aesthetic - clean, professional, instantly recognizable
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdaChat } from './AdaChat';
import { useUser } from '@/auth';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import type { LocalChatMessage } from '@/lib/types/aiWorkflow';

// ============================================================================
// Main Component
// ============================================================================

export const AdaFloatingWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  // Lift conversation state up so it persists when panel closes
  const [globalMessages, setGlobalMessages] = useState<LocalChatMessage[]>([]);

  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id || '', !!user?.id);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setShowClearConfirm(false);
  }, []);

  const handleClearChat = useCallback(() => {
    setGlobalMessages([]);
    setShowClearConfirm(false);
  }, []);

  // Don't render if not authenticated
  if (!user || !organization) return null;

  return (
    <>
      {/* Floating Button - only show when closed */}
      <AnimatePresence mode="wait">
        {!isOpen && (
          <motion.button
            key="ada-button"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleOpen}
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

            {/* Message count badge */}
            {globalMessages.length > 0 && (
              <span className={cn(
                'absolute -top-1 -right-1 w-4 h-4 rounded-full',
                'bg-blue-500 text-white text-[9px] font-bold',
                'flex items-center justify-center'
              )}>
                {globalMessages.length > 9 ? '9+' : globalMessages.length}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            key="ada-panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'fixed bottom-6 right-20 z-50',
              'w-[380px] h-[400px] max-h-[55vh]',
              'rounded-xl overflow-hidden',
              'flex flex-col',
              'bg-white dark:bg-gray-900',
              'border border-gray-200 dark:border-gray-800',
              'shadow-2xl shadow-gray-900/20 dark:shadow-black/40'
            )}
          >
            {/* Header - Compact */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-6 h-6 rounded-md',
                    'bg-gray-900 dark:bg-white',
                    'flex items-center justify-center'
                  )}
                >
                  <span className="text-[10px] font-bold text-white dark:text-gray-900">A</span>
                </div>
                <h2 className="font-medium text-gray-900 dark:text-white text-sm">
                  Ada
                </h2>
                <span className={cn(
                  'px-1 py-0.5 rounded text-[8px] font-semibold uppercase',
                  'bg-gray-100 dark:bg-gray-800',
                  'text-gray-500 dark:text-gray-400'
                )}>
                  AI
                </span>
              </div>

              <div className="flex items-center gap-1">
                {/* Clear chat button - only show if there are messages */}
                {globalMessages.length > 0 && (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className={cn(
                      'w-6 h-6 rounded-md',
                      'flex items-center justify-center',
                      'text-gray-400 hover:text-red-500 dark:hover:text-red-400',
                      'hover:bg-gray-100 dark:hover:bg-gray-800',
                      'transition-colors duration-150'
                    )}
                    aria-label="Clear chat"
                    title="Clear chat"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}

                <button
                  onClick={handleClose}
                  className={cn(
                    'w-6 h-6 rounded-md',
                    'flex items-center justify-center',
                    'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    'transition-colors duration-150'
                  )}
                  aria-label="Close Ada"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Clear confirmation */}
            <AnimatePresence>
              {showClearConfirm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-gray-100 dark:border-gray-800"
                >
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Clear chat history?
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="px-2 py-1 text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleClearChat}
                        className="px-2 py-1 text-[10px] text-red-600 hover:text-red-700 dark:text-red-400 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat Content */}
            <AdaChat
              organizationId={organization.id}
              userId={user.id}
              externalMessages={globalMessages}
              onMessagesChange={setGlobalMessages}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdaFloatingWidget;
