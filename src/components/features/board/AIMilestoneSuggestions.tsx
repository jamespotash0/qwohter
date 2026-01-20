/**
 * AI Milestone Suggestions Dialog
 *
 * Shows AI-generated milestone suggestions and allows user to select which ones to add
 */

import React, { useState, useEffect } from 'react';
import { formatLocalDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import type { TimelineMilestone } from '@/lib/timelineMilestones';
import { Sparkles, Calendar, FileText, Lightbulb } from 'lucide-react';

interface AIMilestoneSuggestionsProps {
  suggestions: TimelineMilestone[];
  reasoning?: string;
  isOpen: boolean;
  onClose: () => void;
  onAddMilestones: (milestones: TimelineMilestone[]) => void;
}

export const AIMilestoneSuggestions: React.FC<AIMilestoneSuggestionsProps> = ({
  suggestions,
  reasoning,
  isOpen,
  onClose,
  onAddMilestones,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIds(new Set(suggestions.map(s => s.id)));
  }, [suggestions]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === suggestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(suggestions.map(s => s.id)));
    }
  };

  const handleAddSelected = () => {
    const selectedMilestones = suggestions.filter(s => selectedIds.has(s.id));
    onAddMilestones(selectedMilestones);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI-Generated Milestone Suggestions
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-3">
            {/* AI Reasoning */}
            {reasoning && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg mb-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-purple-800 mb-1">AI Analysis</p>
                    <p className="text-sm text-purple-700">{reasoning}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Select All */}
            <div className="flex items-center space-x-2 pb-3 border-b">
              <Checkbox
                id="select-all"
                checked={selectedIds.size === suggestions.length && suggestions.length > 0}
                onCheckedChange={toggleAll}
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium cursor-pointer"
              >
                Select All ({suggestions.length} milestones)
              </label>
            </div>

            {/* Milestone List */}
            {suggestions.map((milestone) => (
              <div
                key={milestone.id}
                className={`
                  flex items-start space-x-3 p-3 rounded-lg border transition-colors
                  ${selectedIds.has(milestone.id)
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <Checkbox
                  id={milestone.id}
                  checked={selectedIds.has(milestone.id)}
                  onCheckedChange={() => toggleSelection(milestone.id)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <label
                    htmlFor={milestone.id}
                    className="text-sm font-medium text-gray-900 cursor-pointer block"
                  >
                    {milestone.label}
                  </label>

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {milestone.date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatLocalDate(milestone.date)}</span>
                      </div>
                    )}
                  </div>

                  {milestone.notes && (
                    <div className="flex items-start gap-1 mt-1">
                      <FileText className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-600">{milestone.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAddSelected}
            disabled={selectedIds.size === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Add Selected ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
