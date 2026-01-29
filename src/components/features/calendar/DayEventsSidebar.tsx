/**
 * Day Events Sidebar
 *
 * Shows events for the selected day with grouped sections.
 */

import React from 'react';
import { format } from 'date-fns';
import { Plus, CalendarBlankIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { EventCard } from './EventCard';
import type { UnifiedCalendarItem } from '@/lib/types/calendarEvents';

interface DayEventsSidebarProps {
  selectedDate: Date | null;
  items: UnifiedCalendarItem[];
  onCreateEvent: () => void;
  onEditEvent: (item: UnifiedCalendarItem) => void;
}

export const DayEventsSidebar: React.FC<DayEventsSidebarProps> = ({
  selectedDate,
  items,
  onCreateEvent,
  onEditEvent,
}) => {
  if (!selectedDate) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <CalendarBlankIcon size={40} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a day to see events</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border-l border-gray-200 dark:border-gray-700 pl-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {format(selectedDate, 'EEEE')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {format(selectedDate, 'MMMM d, yyyy')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateEvent}
          className="h-8 gap-1"
        >
          <Plus size={14} weight="bold" />
          Add
        </Button>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarBlankIcon size={32} className="text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">
              No events for this day
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateEvent}
              className="gap-1"
            >
              <Plus size={14} weight="bold" />
              Create Event
            </Button>
          </div>
        ) : (
          items.map((item) => (
            <EventCard
              key={item.id}
              item={item}
              onEdit={onEditEvent}
            />
          ))
        )}
      </div>
    </div>
  );
};
