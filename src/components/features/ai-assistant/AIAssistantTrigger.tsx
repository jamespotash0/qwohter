/**
 * AI Assistant Trigger Button
 *
 * A button that opens the AI Assistant panel with a badge showing pending suggestions count.
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePendingSuggestionsCount } from '@/hooks/queries/useAISuggestions';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface AIAssistantTriggerProps {
  proposalId: string;
  onClick: () => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

// ============================================================================
// Component
// ============================================================================

export const AIAssistantTrigger: React.FC<AIAssistantTriggerProps> = ({
  proposalId,
  onClick,
  className,
  variant = 'outline',
  size = 'sm',
}) => {
  const pendingCount = usePendingSuggestionsCount(proposalId);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={cn(
        'relative gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800',
        className
      )}
    >
      <Sparkles className="w-4 h-4" />
      <span>AI Assistant</span>
      {pendingCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
        >
          {pendingCount > 9 ? '9+' : pendingCount}
        </Badge>
      )}
    </Button>
  );
};

export default AIAssistantTrigger;
