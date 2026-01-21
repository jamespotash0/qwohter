/**
 * Timeline Visualizer Component
 *
 * Vertical timeline showing project milestones with:
 * - Clean vertical layout with connecting line
 * - Color-coded status badges (completed/upcoming)
 * - "Today" indicator
 * - Interactive editing for each milestone
 * - Add/edit/delete capabilities
 */

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  type TimelineMilestone,
  addMilestone,
  updateMilestone,
  deleteMilestone
} from '@/lib/timelineMilestones';
import { formatLocalDate } from '@/lib/utils';
import { Plus, Trash2, Edit2, Calendar, CheckCircle2, Circle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface TimelineVisualizerProps {
  milestones: TimelineMilestone[];
  wonDate: string; // Project created_at date
  onMilestoneUpdate: (updatedMilestones: TimelineMilestone[]) => void;
  isAddingMilestone?: boolean;
  onAddingMilestoneChange?: (isAdding: boolean) => void;
}

export const TimelineVisualizer: React.FC<TimelineVisualizerProps> = ({
  milestones,
  wonDate,
  onMilestoneUpdate,
  isAddingMilestone: externalIsAddingMilestone,
  onAddingMilestoneChange,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [internalIsAddingMilestone, setInternalIsAddingMilestone] = useState(false);
  const [newMilestoneLabel, setNewMilestoneLabel] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [newMilestoneNotes, setNewMilestoneNotes] = useState('');
  const [showAllMilestones, setShowAllMilestones] = useState(false);

  // Use external state if provided, otherwise use internal state
  const isAddingMilestone = externalIsAddingMilestone !== undefined ? externalIsAddingMilestone : internalIsAddingMilestone;
  const setIsAddingMilestone = (value: boolean) => {
    if (onAddingMilestoneChange) {
      onAddingMilestoneChange(value);
    } else {
      setInternalIsAddingMilestone(value);
    }
  };

  // Helper to parse date strings as local dates (no timezone conversion)
  const parseLocalDate = (dateStr: string): Date => {
    const dateOnly = dateStr.split('T')[0] || dateStr;
    const parts = dateOnly.split('-').map(Number);
    const year = parts[0] || 0;
    const month = parts[1] || 1;
    const day = parts[2] || 1;
    return new Date(year, month - 1, day);
  };

  // Sort milestones by date (chronologically)
  const sortedMilestones = useMemo(() => {
    return [...milestones].sort((a, b) => {
      if (a.date && b.date) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (a.date) return -1;
      if (b.date) return 1;
      return a.order - b.order;
    });
  }, [milestones]);

  // All timeline items including Won date
  const allItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const items = [
      {
        id: 'won',
        label: 'Project Won',
        date: wonDate,
        notes: undefined,
        completed: true,
        isWon: true,
        isPast: parseLocalDate(wonDate).getTime() < todayTime,
        isToday: false,
        isOverdue: false,
        daysUntil: 0,
      },
      ...sortedMilestones
        .filter(m => m.date) // Only show milestones with dates
        .map(m => {
          const milestoneTime = parseLocalDate(m.date!).getTime();
          const isPast = milestoneTime < todayTime;
          const isCompleted = m.completed || false;
          const isOverdue = isPast && !isCompleted;

          // Calculate days until milestone
          const daysDiff = Math.ceil((milestoneTime - todayTime) / (1000 * 60 * 60 * 24));

          return {
            id: m.id,
            label: m.label,
            date: m.date!,
            notes: m.notes,
            completed: isCompleted,
            isWon: false,
            isPast,
            isToday: milestoneTime === todayTime,
            isOverdue,
            daysUntil: daysDiff,
          };
        }),
    ];

    return items;
  }, [wonDate, sortedMilestones]);

  const handleAddMilestone = () => {
    if (!newMilestoneLabel.trim()) return;

    // Create milestone with all fields
    const newMilestone = addMilestone(sortedMilestones, newMilestoneLabel.trim(), newMilestoneDate || null);

    // Update with notes if provided
    const withNotes = newMilestone.map((m, idx) =>
      idx === newMilestone.length - 1 && newMilestoneNotes.trim()
        ? { ...m, notes: newMilestoneNotes.trim() }
        : m
    );

    onMilestoneUpdate(withNotes);
    setNewMilestoneLabel('');
    setNewMilestoneDate('');
    setNewMilestoneNotes('');
    setIsAddingMilestone(false);
  };

  const handleUpdateMilestone = (milestoneId: string, updates: Partial<Pick<TimelineMilestone, 'label' | 'date' | 'notes' | 'completed'>>) => {
    const updated = updateMilestone(sortedMilestones, milestoneId, updates);
    onMilestoneUpdate(updated);
  };

  const handleToggleComplete = (milestoneId: string, currentlyCompleted: boolean) => {
    handleUpdateMilestone(milestoneId, { completed: !currentlyCompleted });
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    const updated = deleteMilestone(sortedMilestones, milestoneId);
    onMilestoneUpdate(updated);
    setEditingId(null);
  };

  // Show first 3 items (won + 2 milestones) unless expanded
  const visibleItems = showAllMilestones ? allItems : allItems.slice(0, 3);
  const hiddenCount = allItems.length - 3;

  return (
    <div className="space-y-4">
      {/* Timeline Items */}
      <div className="space-y-0">
        {visibleItems.map((item, index) => {
          const isLast = showAllMilestones
            ? index === allItems.length - 1
            : index === visibleItems.length - 1;

          return (
            <div key={item.id} className="relative flex gap-4">
              {/* Timeline Line & Dot */}
              <div className="flex flex-col items-center">
                {/* Dot */}
                <div className={`w-3 h-3 rounded-full mt-1.5 ${
                  item.isWon
                    ? 'bg-green-500 ring-4 ring-green-100'
                    : item.completed
                      ? 'bg-green-500 ring-4 ring-green-100'
                      : item.isOverdue
                        ? 'bg-orange-500 ring-4 ring-orange-100'
                        : 'bg-gray-300 ring-4 ring-gray-100'
                }`} />

                {/* Connecting Line */}
                {!isLast && (
                  <div className={`w-0.5 flex-1 ${
                    item.completed ? 'bg-green-200' : item.isOverdue ? 'bg-orange-200' : 'bg-gray-200'
                  }`} style={{ minHeight: '40px' }} />
                )}
              </div>

              {/* Milestone Card */}
              <div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
                <div className={`rounded-lg border p-3 transition-all ${
                  item.isToday
                    ? 'bg-orange-50 border-orange-300 shadow-sm'
                    : item.isOverdue
                      ? 'bg-orange-50 border-orange-200'
                      : item.completed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Label */}
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {item.label}
                        </h4>
                        {item.isToday && (
                          <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          {formatLocalDate(item.date)}
                        </span>
                      </div>

                      {/* Status Badge with Checkbox */}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {!item.isWon && (
                            <button
                              onClick={() => handleToggleComplete(item.id, item.completed)}
                              className="flex-shrink-0 hover:opacity-70 transition-opacity"
                              title={item.completed ? "Mark as incomplete" : "Mark as complete"}
                            >
                              {item.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600 cursor-pointer" />
                              ) : (
                                <Circle className="w-4 h-4 text-gray-400 cursor-pointer" />
                              )}
                            </button>
                          )}
                          <div className="flex items-center gap-1.5 text-xs">
                            {item.completed ? (
                              <span className="text-green-700 font-medium">Completed</span>
                            ) : item.isOverdue ? (
                              <>
                                <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
                                <span className="text-orange-600 font-medium">Overdue</span>
                              </>
                            ) : item.isToday ? (
                              <span className="text-orange-600 font-medium">Today</span>
                            ) : (
                              <span className="text-gray-500">
                                {item.daysUntil === 1 ? 'Tomorrow' : `In ${item.daysUntil} days`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      {item.notes && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-600">{item.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions (only for non-Won milestones) */}
                    {!item.isWon && (
                      <Popover
                        open={editingId === item.id}
                        onOpenChange={(open) => setEditingId(open ? item.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                            <Edit2 className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="end">
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-gray-700">Milestone Name</label>
                              <Input
                                type="text"
                                value={item.label}
                                onChange={(e) => handleUpdateMilestone(item.id, { label: e.target.value })}
                                className="text-sm"
                                placeholder="e.g., Design Review"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-gray-700">Date</label>
                              <Input
                                type="date"
                                value={item.date}
                                onChange={(e) => handleUpdateMilestone(item.id, { date: e.target.value || null })}
                                className="text-sm"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-gray-700">Notes</label>
                              <textarea
                                value={item.notes || ''}
                                onChange={(e) => handleUpdateMilestone(item.id, { notes: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                placeholder="Add notes about this milestone..."
                                rows={3}
                              />
                            </div>

                            <div className="flex gap-2 pt-2 border-t">
                              {item.date && (
                                <button
                                  onClick={() => handleUpdateMilestone(item.id, { date: null })}
                                  className="flex-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded border"
                                >
                                  Clear Date
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteMilestone(item.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More/Less Button */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAllMilestones(!showAllMilestones)}
          className="w-full flex items-center justify-center gap-1.5 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors -mt-2"
        >
          {showAllMilestones ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Show {hiddenCount} more
            </>
          )}
        </button>
      )}

      {/* Add Milestone Form */}
      {isAddingMilestone && (
        <div className="pt-2">
          <div className="rounded-lg border border-gray-300 bg-white p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Milestone Name</label>
              <Input
                type="text"
                value={newMilestoneLabel}
                onChange={(e) => setNewMilestoneLabel(e.target.value)}
                placeholder="e.g., Design Review"
                className="text-sm"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Date</label>
              <Input
                type="date"
                value={newMilestoneDate}
                onChange={(e) => setNewMilestoneDate(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Notes</label>
              <textarea
                value={newMilestoneNotes}
                onChange={(e) => setNewMilestoneNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Add notes about this milestone..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleAddMilestone}
                disabled={!newMilestoneLabel.trim()}
                size="sm"
                variant="default"
                className="flex-1"
              >
                Add Milestone
              </Button>
              <Button
                onClick={() => {
                  setIsAddingMilestone(false);
                  setNewMilestoneLabel('');
                  setNewMilestoneDate('');
                  setNewMilestoneNotes('');
                }}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!onAddingMilestoneChange && !isAddingMilestone && (
        <div className="pt-2 flex gap-2">
          <Button
            onClick={() => setIsAddingMilestone(true)}
            size="sm"
            variant="outline"
            className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
};
