/**
 * Ada Floating Widget
 *
 * A clean, recognizable AI assistant that's always available.
 * Named after Ada Lovelace, the first computer programmer.
 *
 * Design: Modern AI aesthetic - clean, professional, instantly recognizable
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdaChat } from './AdaChat';
import { useUser } from '@/auth';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { useOrganizationPendingCount } from '@/hooks/queries/useAISuggestions';
import type { LocalChatMessage } from '@/lib/types/aiWorkflow';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEY_PREFIX = 'ada_chat_messages_';

const getStorageKey = (userId: string, orgId: string) =>
  `${STORAGE_KEY_PREFIX}${userId}_${orgId}`;

const loadMessagesFromStorage = (userId: string, orgId: string): LocalChatMessage[] => {
  try {
    const key = getStorageKey(userId, orgId);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load Ada messages from storage:', error);
  }
  return [];
};

const saveMessagesToStorage = (userId: string, orgId: string, messages: LocalChatMessage[]) => {
  try {
    const key = getStorageKey(userId, orgId);
    if (messages.length === 0) {
      localStorage.removeItem(key);
    } else {
      // Keep only the last 50 messages to prevent localStorage bloat
      const messagesToStore = messages.slice(-50);
      localStorage.setItem(key, JSON.stringify(messagesToStore));
    }
  } catch (error) {
    console.error('Failed to save Ada messages to storage:', error);
  }
};

// ============================================================================
// Main Component
// ============================================================================

// Session storage key to track if user manually closed Ada this session
const SESSION_CLOSED_KEY = 'ada_manually_closed_session';
const LAST_SEEN_COUNT_KEY = 'ada_last_seen_pending_count';

export const AdaFloatingWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  // Lift conversation state up so it persists when panel closes
  const [globalMessages, setGlobalMessages] = useState<LocalChatMessage[]>([]);
  // Track the last seen pending count to determine if badge should show
  const [lastSeenCount, setLastSeenCount] = useState<number>(0);

  // Track if we've already auto-opened this session to prevent repeated openings
  const hasAutoOpenedRef = useRef(false);

  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id || '', !!user?.id);

  // Get pending suggestions count for auto-open logic
  const pendingCount = useOrganizationPendingCount(organization?.id);

  // Calculate unread count (only show badge for new suggestions since last open)
  const unreadCount = Math.max(0, pendingCount - lastSeenCount);

  // Load last seen count from session storage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(LAST_SEEN_COUNT_KEY);
    if (stored) {
      setLastSeenCount(parseInt(stored, 10) || 0);
    }
  }, []);

  // Load messages from localStorage on mount
  useEffect(() => {
    if (user?.id && organization?.id && !isInitialized) {
      const storedMessages = loadMessagesFromStorage(user.id, organization.id);
      if (storedMessages.length > 0) {
        setGlobalMessages(storedMessages);
      }
      setIsInitialized(true);
    }
  }, [user?.id, organization?.id, isInitialized]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (user?.id && organization?.id && isInitialized) {
      saveMessagesToStorage(user.id, organization.id, globalMessages);
    }
  }, [globalMessages, user?.id, organization?.id, isInitialized]);

  // Close Ada when user signs out (clear state immediately)
  useEffect(() => {
    if (!user) {
      setIsOpen(false);
      setGlobalMessages([]);
      setIsInitialized(false);
      hasAutoOpenedRef.current = false;
    }
  }, [user]);

  // Auto-open Ada when there are pending suggestions (once per session)
  useEffect(() => {
    // Only auto-open if:
    // 1. Not already open
    // 2. Haven't auto-opened this session yet
    // 3. There are pending suggestions
    // 4. User hasn't manually closed Ada this session
    if (
      !isOpen &&
      !hasAutoOpenedRef.current &&
      pendingCount > 0 &&
      !sessionStorage.getItem(SESSION_CLOSED_KEY)
    ) {
      hasAutoOpenedRef.current = true;
      setIsOpen(true);
    }
  }, [isOpen, pendingCount]);

  const handleOpen = useCallback(() => {
    // Clear the manual close flag when user opens Ada
    sessionStorage.removeItem(SESSION_CLOSED_KEY);
    // Mark current pending count as "seen" so badge disappears after close
    setLastSeenCount(pendingCount);
    sessionStorage.setItem(LAST_SEEN_COUNT_KEY, String(pendingCount));
    setIsOpen(true);
  }, [pendingCount]);

  const handleClose = useCallback(() => {
    // Mark that user manually closed Ada this session to prevent auto-reopening
    sessionStorage.setItem(SESSION_CLOSED_KEY, 'true');
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
              'fixed bottom-6 right-20 z-[60]',
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

            {/* Beta badge */}
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[9px] font-medium uppercase',
              'bg-amber-400/30 text-amber-200 dark:bg-amber-500/20 dark:text-amber-300'
            )}>
              Beta
            </span>

            {/* Unread suggestions badge - solid, only shows for new suggestions */}
            {unreadCount > 0 && (
              <span className={cn(
                'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1',
                'flex items-center justify-center',
                'rounded-full text-[10px] font-bold',
                'bg-blue-500 text-white'
              )}>
                {unreadCount > 9 ? '9+' : unreadCount}
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
              'fixed bottom-6 right-20 z-[60]',
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
                <span className={cn(
                  'px-1 py-0.5 rounded text-[8px] font-medium uppercase',
                  'bg-amber-100 text-amber-700',
                  'dark:bg-amber-900/30 dark:text-amber-400'
                )}>
                  Beta
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
