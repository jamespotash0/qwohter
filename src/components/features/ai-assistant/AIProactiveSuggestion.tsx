/**
 * AI Proactive Suggestion Component
 *
 * Displays a proactive AI suggestion inline in the chat.
 * Shows actionable suggestions with accept/dismiss buttons.
 */

import React from 'react';
import {
  Mail,
  Bell,
  Lightbulb,
  TrendingUp,
  DollarSign,
  ListTodo,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AISuggestion, AISuggestionType } from '@/lib/types/aiWorkflow';

// ============================================================================
// Types
// ============================================================================

interface AIProactiveSuggestionProps {
  suggestion: AISuggestion;
  onAccept: () => void;
  onDismiss: () => void;
  isAccepting?: boolean;
  isDismissing?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const SUGGESTION_CONFIG: Record<
  AISuggestionType,
  { icon: React.ElementType; label: string; color: string }
> = {
  follow_up_email: {
    icon: Mail,
    label: 'Email Suggestion',
    color: 'bg-blue-100 text-blue-600 border-blue-200',
  },
  status_reminder: {
    icon: Bell,
    label: 'Reminder',
    color: 'bg-amber-100 text-amber-600 border-amber-200',
  },
  action_recommendation: {
    icon: Lightbulb,
    label: 'Recommendation',
    color: 'bg-purple-100 text-purple-600 border-purple-200',
  },
  win_loss_insight: {
    icon: TrendingUp,
    label: 'Insight',
    color: 'bg-green-100 text-green-600 border-green-200',
  },
  pricing_suggestion: {
    icon: DollarSign,
    label: 'Pricing',
    color: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  },
};

// ============================================================================
// Component
// ============================================================================

export const AIProactiveSuggestion: React.FC<AIProactiveSuggestionProps> = ({
  suggestion,
  onAccept,
  onDismiss,
  isAccepting = false,
  isDismissing = false,
}) => {
  const config = SUGGESTION_CONFIG[suggestion.suggestion_type] || {
    icon: ListTodo,
    label: 'Suggestion',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  const Icon = config.icon;
  const isLoading = isAccepting || isDismissing;

  return (
    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('p-2 rounded-lg border', config.color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-purple-700">{config.label}</span>
            {suggestion.confidence_score && (
              <span className="text-xs text-gray-400">
                {Math.round(suggestion.confidence_score * 100)}% confident
              </span>
            )}
          </div>
          <h4 className="text-sm font-medium text-gray-900">{suggestion.title}</h4>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
        {suggestion.content}
      </p>

      {/* Reasoning */}
      {suggestion.reasoning && (
        <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded mb-3">
          <span className="font-medium">Why: </span>
          {suggestion.reasoning}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          disabled={isLoading}
          className="text-gray-500 hover:text-gray-700 h-8"
        >
          {isDismissing ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <X className="w-3 h-3 mr-1" />
          )}
          Dismiss
        </Button>
        <Button
          size="sm"
          onClick={onAccept}
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700 h-8"
        >
          {isAccepting ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Check className="w-3 h-3 mr-1" />
          )}
          {suggestion.suggestion_type === 'follow_up_email' ? 'Use Email' : 'Accept'}
        </Button>
      </div>
    </div>
  );
};

export default AIProactiveSuggestion;
