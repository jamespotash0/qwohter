/**
 * AI Floating Widget
 *
 * A global floating button that shows AI suggestions count and opens
 * a context-aware AI panel. Can be placed anywhere in the app layout.
 */

import React, { useState } from 'react';
import { Sparkles, X, Bell, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  useOrganizationPendingCount,
  useNotificationSummary,
} from '@/hooks/queries/useAISuggestions';
import type { AISuggestionType } from '@/lib/types/aiWorkflow';

// ============================================================================
// Types
// ============================================================================

interface AIFloatingWidgetProps {
  organizationId: string | undefined;
  onProposalClick?: (proposalId: string) => void;
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

// ============================================================================
// Constants
// ============================================================================

const SUGGESTION_TYPE_LABELS: Record<AISuggestionType, string> = {
  follow_up_email: 'Follow-ups',
  status_reminder: 'Reminders',
  action_recommendation: 'Recommendations',
  win_loss_insight: 'Insights',
  pricing_suggestion: 'Pricing',
};

const POSITION_CLASSES: Record<string, string> = {
  'bottom-right': 'fixed bottom-6 right-6',
  'bottom-left': 'fixed bottom-6 left-6',
  'top-right': 'fixed top-20 right-6',
  'top-left': 'fixed top-20 left-6',
};

// ============================================================================
// Component
// ============================================================================

export const AIFloatingWidget: React.FC<AIFloatingWidgetProps> = ({
  organizationId,
  onProposalClick,
  className,
  position = 'bottom-right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const pendingCount = useOrganizationPendingCount(organizationId);
  const { data: summary } = useNotificationSummary(organizationId);

  if (!organizationId) return null;

  return (
    <div className={cn(POSITION_CLASSES[position], 'z-50', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="lg"
            className={cn(
              'h-14 w-14 rounded-full shadow-lg',
              'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800',
              'transition-all duration-200',
              isOpen && 'scale-95'
            )}
          >
            {isOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Sparkles className="w-6 h-6 text-white" />
            )}
            {pendingCount > 0 && !isOpen && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-6 w-6 p-0 flex items-center justify-center text-xs rounded-full animate-pulse"
              >
                {pendingCount > 9 ? '9+' : pendingCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          side={position.includes('right') ? 'left' : 'right'}
          align="end"
          className="w-80 p-0"
        >
          {/* Header */}
          <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {pendingCount} pending
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              AI-powered insights for your proposals
            </p>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {pendingCount === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No pending suggestions</p>
                <p className="text-xs text-gray-400 mt-1">
                  AI will notify you when there are actions to take
                </p>
              </div>
            ) : (
              <>
                {/* By Type */}
                {summary?.by_type && summary.by_type.length > 0 && (
                  <div className="p-3 border-b">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                      By Type
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {summary.by_type.map(({ type, count }) => (
                        <div
                          key={type}
                          className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs"
                        >
                          <span className="text-gray-600">
                            {SUGGESTION_TYPE_LABELS[type] || type}
                          </span>
                          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                            {count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* By Proposal */}
                {summary?.by_proposal && summary.by_proposal.length > 0 && (
                  <div className="p-3">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                      Proposals with Suggestions
                    </p>
                    <div className="space-y-1">
                      {summary.by_proposal.slice(0, 5).map(({ proposal_id, proposal_name, count }) => (
                        <button
                          key={proposal_id}
                          onClick={() => {
                            onProposalClick?.(proposal_id);
                            setIsOpen(false);
                          }}
                          className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors text-left"
                        >
                          <span className="text-sm text-gray-700 truncate flex-1">
                            {proposal_name}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge variant="outline" className="h-5 px-1.5 text-xs">
                              {count}
                            </Badge>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </button>
                      ))}
                      {summary.by_proposal.length > 5 && (
                        <p className="text-xs text-gray-400 text-center pt-2">
                          +{summary.by_proposal.length - 5} more proposals
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t bg-gray-50/50">
            <p className="text-xs text-gray-400 text-center">
              Click a proposal to view suggestions
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AIFloatingWidget;
