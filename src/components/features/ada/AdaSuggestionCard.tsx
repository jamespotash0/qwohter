/**
 * Ada Suggestion Card
 *
 * Actionable suggestion card with clean styling.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  Bell,
  Lightbulb,
  TrendingUp,
  CheckCircle,
  ListTodo,
  DollarSign,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AISuggestion, AISuggestionType } from '@/lib/types/aiWorkflow';

// ============================================================================
// Types
// ============================================================================

interface AdaSuggestionCardProps {
  suggestion: AISuggestion;
  onApply: () => void;
  onDismiss: () => void;
  index?: number;
}

// ============================================================================
// Icon Map
// ============================================================================

const SUGGESTION_ICONS: Record<AISuggestionType, React.ElementType> = {
  follow_up_email: Mail,
  status_reminder: Bell,
  action_recommendation: Lightbulb,
  win_loss_insight: TrendingUp,
  task_suggestion: ListTodo,
  pricing_suggestion: DollarSign,
};

// ============================================================================
// Component
// ============================================================================

export const AdaSuggestionCard: React.FC<AdaSuggestionCardProps> = ({
  suggestion,
  onApply,
  onDismiss,
  index = 0,
}) => {
  const [isActing, setIsActing] = React.useState(false);
  const Icon = SUGGESTION_ICONS[suggestion.suggestion_type] || Lightbulb;

  const handleApply = async () => {
    setIsActing(true);
    try {
      await onApply();
    } finally {
      setIsActing(false);
    }
  };

  const handleDismiss = async () => {
    setIsActing(true);
    try {
      await onDismiss();
    } finally {
      setIsActing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'relative overflow-hidden',
        'rounded-xl',
        'bg-white dark:bg-gray-800',
        'border border-gray-200 dark:border-gray-700',
        'shadow-sm hover:shadow-md',
        'transition-shadow duration-200'
      )}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className={cn(
              'flex-shrink-0 w-9 h-9 rounded-lg',
              'bg-gray-100 dark:bg-gray-700',
              'flex items-center justify-center'
            )}
          >
            <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {suggestion.title}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {suggestion.suggestion_type.replace(/_/g, ' ')}
            </p>
          </div>

          {/* Confidence badge */}
          {suggestion.confidence_score && suggestion.confidence_score > 0.7 && (
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full',
                'bg-emerald-100 dark:bg-emerald-900/30',
                'text-emerald-700 dark:text-emerald-400'
              )}
            >
              <CheckCircle className="w-3 h-3" />
              <span className="text-[10px] font-medium">
                {Math.round(suggestion.confidence_score * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Content preview */}
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-4">
          {suggestion.content}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleApply}
            disabled={isActing}
            className={cn(
              'flex-1 flex items-center justify-center gap-2',
              'px-3 py-2 rounded-lg',
              'bg-gray-900 dark:bg-white',
              'text-white dark:text-gray-900',
              'text-sm font-medium',
              'hover:bg-gray-800 dark:hover:bg-gray-100',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-150'
            )}
          >
            {isActing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Apply</span>
              </>
            )}
          </button>

          <button
            onClick={handleDismiss}
            disabled={isActing}
            className={cn(
              'w-10 h-10 rounded-lg',
              'flex items-center justify-center',
              'border border-gray-200 dark:border-gray-700',
              'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200',
              'hover:bg-gray-50 dark:hover:bg-gray-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-150'
            )}
            aria-label="Dismiss suggestion"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AdaSuggestionCard;
