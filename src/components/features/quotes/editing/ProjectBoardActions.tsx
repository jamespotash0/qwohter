/**
 * Project Board Actions Component
 *
 * Provides buttons to send/remove quotes to/from the project board.
 * Only visible for Won quotes.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Kanban, X } from 'lucide-react';
import { sendQuoteToProjectBoard, removeQuoteFromProjectBoard } from '@/services/quotesService';
import { supabase } from '@/integrations/supabase/client';

interface ProjectBoardActionsProps {
  quoteId: string;
  quoteStatus: string;
  className?: string;
}

export const ProjectBoardActions: React.FC<ProjectBoardActionsProps> = ({
  quoteId,
  quoteStatus,
  className = ''
}) => {
  const { toast } = useToast();
  const [isOnBoard, setIsOnBoard] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check if quote already has a project
  useEffect(() => {
    const checkProjectStatus = async () => {
      try {
        const { data } = await supabase
          .from('projects')
          .select('id')
          .eq('quote_id', quoteId)
          .maybeSingle();

        setIsOnBoard(!!data);
      } catch (error) {
        console.error('Error checking project status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkProjectStatus();
  }, [quoteId]);

  // Only show for Won quotes
  if (quoteStatus !== 'Won') {
    return null;
  }

  const handleSendToBoard = async () => {
    setIsLoading(true);
    try {
      const result = await sendQuoteToProjectBoard(quoteId);

      if (result.success) {
        setIsOnBoard(true);
        toast({
          title: 'Sent to Project Board',
          description: 'Quote has been added to the project board',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to send quote to project board',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromBoard = async () => {
    setIsLoading(true);
    try {
      const result = await removeQuoteFromProjectBoard(quoteId);

      if (result.success) {
        setIsOnBoard(false);
        toast({
          title: 'Removed from Project Board',
          description: 'Quote has been removed from the project board',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to remove quote from project board',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return null; // Don't show buttons while checking
  }

  return (
    <div className={className}>
      {isOnBoard ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRemoveFromBoard}
          disabled={isLoading}
          className="border-red-300 text-red-700 hover:bg-red-50"
        >
          <X className="w-4 h-4 mr-1.5" />
          Remove from Board
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendToBoard}
          disabled={isLoading}
          className="border-green-300 text-green-700 hover:bg-green-50"
        >
          <Kanban className="w-4 h-4 mr-1.5" />
          Send to Project Board
        </Button>
      )}
    </div>
  );
};
