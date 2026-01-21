/**
 * Ada Quick Actions
 *
 * Horizontal scrollable quick action chips.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Bell, Lightbulb, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface AdaQuickActionsProps {
  onAction: (action: string) => void;
  isLoading?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
}

// ============================================================================
// Data
// ============================================================================

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'follow-up',
    label: 'Draft follow-up',
    icon: Mail,
  },
  {
    id: 'reminders',
    label: 'Set reminders',
    icon: Bell,
  },
  {
    id: 'recommendations',
    label: 'Get insights',
    icon: Lightbulb,
  },
];

// ============================================================================
// Component
// ============================================================================

export const AdaQuickActions: React.FC<AdaQuickActionsProps> = ({
  onAction,
  isLoading = false,
}) => {
  const [activeAction, setActiveAction] = React.useState<string | null>(null);

  const handleClick = async (actionId: string) => {
    setActiveAction(actionId);
    await onAction(actionId);
    setActiveAction(null);
  };

  return (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
        Quick Actions
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {QUICK_ACTIONS.map((action, index) => {
          const Icon = action.icon;
          const isActive = activeAction === action.id;
          const isDisabled = isLoading;

          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleClick(action.id)}
              disabled={isDisabled}
              className={cn(
                'flex-shrink-0',
                'flex items-center gap-2',
                'px-3 py-2 rounded-lg',
                'border border-gray-200 dark:border-gray-700',
                'bg-white dark:bg-gray-800',
                'hover:bg-gray-50 dark:hover:bg-gray-700',
                'hover:border-gray-300 dark:hover:border-gray-600',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-150',
                'group'
              )}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-md',
                  'bg-gray-100 dark:bg-gray-700',
                  'flex items-center justify-center',
                  'group-hover:bg-gray-200 dark:group-hover:bg-gray-600',
                  'transition-colors duration-150'
                )}
              >
                {isActive ? (
                  <Loader2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 animate-spin" />
                ) : (
                  <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                )}
              </div>

              <span className="text-xs font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                {action.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default AdaQuickActions;
