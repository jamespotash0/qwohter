/**
 * AI Suggestion Card
 *
 * Displays a single AI suggestion with actions to apply, copy, or dismiss.
 * Follows the pattern from AIMilestoneSuggestions.tsx
 */

import React, { useState } from 'react';
import {
  Mail,
  Bell,
  Lightbulb,
  TrendingUp,
  DollarSign,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AISuggestion, AISuggestionType } from '@/lib/types/aiWorkflow';

// ============================================================================
// Types
// ============================================================================

interface AISuggestionCardProps {
  suggestion: AISuggestion;
  onApply: () => void;
  onDismiss: () => void;
  isApplying?: boolean;
  isDismissing?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const SUGGESTION_ICONS: Record<AISuggestionType, React.ElementType> = {
  follow_up_email: Mail,
  status_reminder: Bell,
  action_recommendation: Lightbulb,
  win_loss_insight: TrendingUp,
  pricing_suggestion: DollarSign,
};

const SUGGESTION_LABELS: Record<AISuggestionType, string> = {
  follow_up_email: 'Follow-up Email',
  status_reminder: 'Reminder',
  action_recommendation: 'Recommendation',
  win_loss_insight: 'Insight',
  pricing_suggestion: 'Pricing',
};

const SUGGESTION_COLORS: Record<AISuggestionType, string> = {
  follow_up_email: 'bg-blue-50 text-blue-600',
  status_reminder: 'bg-amber-50 text-amber-600',
  action_recommendation: 'bg-purple-50 text-purple-600',
  win_loss_insight: 'bg-green-50 text-green-600',
  pricing_suggestion: 'bg-emerald-50 text-emerald-600',
};

// ============================================================================
// Component
// ============================================================================

export const AISuggestionCard: React.FC<AISuggestionCardProps> = ({
  suggestion,
  onApply,
  onDismiss,
  isApplying = false,
  isDismissing = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const Icon = SUGGESTION_ICONS[suggestion.suggestion_type] || Lightbulb;
  const label = SUGGESTION_LABELS[suggestion.suggestion_type] || 'Suggestion';
  const iconColorClass = SUGGESTION_COLORS[suggestion.suggestion_type] || 'bg-gray-50 text-gray-600';

  const isDisabled = isApplying || isDismissing;

  // Handle copy to clipboard
  const handleCopy = async () => {
    const textToCopy = suggestion.suggestion_type === 'follow_up_email'
      ? `Subject: ${suggestion.email_subject}\n\n${suggestion.content}`
      : suggestion.content;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Determine confidence badge color
  const getConfidenceColor = (score: number | null) => {
    if (!score) return 'text-gray-400';
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.5) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const contentLength = suggestion.content.length;
  const shouldTruncate = contentLength > 200;

  return (
    <Card className="border-purple-100 hover:border-purple-200 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('p-1.5 rounded-md flex-shrink-0', iconColorClass)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium truncate">{suggestion.title}</h4>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {label}
                </Badge>
              </div>
              {suggestion.email_subject && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  Subject: {suggestion.email_subject}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {suggestion.confidence_score && (
              <Badge
                variant="outline"
                className={cn('text-xs', getConfidenceColor(suggestion.confidence_score))}
              >
                {Math.round(suggestion.confidence_score * 100)}%
              </Badge>
            )}
            <span className="text-xs text-gray-400">
              {formatTimeAgo(suggestion.created_at)}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Main content */}
        <div
          className={cn(
            'text-sm text-gray-600 whitespace-pre-wrap',
            !isExpanded && shouldTruncate && 'line-clamp-3'
          )}
        >
          {suggestion.content}
        </div>

        {/* Show more/less toggle */}
        {shouldTruncate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-1 h-6 text-xs text-purple-600 hover:text-purple-700 p-0"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Show more
              </>
            )}
          </Button>
        )}

        {/* AI reasoning */}
        {suggestion.reasoning && (
          <div className="mt-3 p-2 bg-purple-50 border border-purple-100 rounded-md">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-purple-800 mb-0.5">AI Analysis</p>
                <p className="text-xs text-purple-700">{suggestion.reasoning}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 flex justify-between">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            disabled={isDisabled}
            className="h-7 text-xs"
          >
            {copied ? (
              <Check className="w-3 h-3 mr-1 text-green-600" />
            ) : (
              <Copy className="w-3 h-3 mr-1" />
            )}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            size="sm"
            onClick={onApply}
            disabled={isDisabled}
            className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
          >
            {isApplying ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Check className="w-3 h-3 mr-1" />
            )}
            Apply
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          disabled={isDisabled}
          className="h-7 text-xs text-gray-500 hover:text-gray-700"
        >
          {isDismissing ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <X className="w-3 h-3 mr-1" />
          )}
          Dismiss
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AISuggestionCard;
