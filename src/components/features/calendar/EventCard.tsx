/**
 * Event Card
 *
 * Displays a single calendar item with color bar, title, time, and source badge.
 */

import React from 'react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { UnifiedCalendarItem } from '@/lib/types/calendarEvents';
import { CALENDAR_SOURCE_LABELS } from '@/lib/types/calendarEvents';

interface EventCardProps {
  item: UnifiedCalendarItem;
  onEdit?: (item: UnifiedCalendarItem) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ item, onEdit }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (item.source === 'calendar_event' && onEdit) {
      onEdit(item);
    } else if (item.linkUrl) {
      navigate(item.linkUrl);
    }
  };

  const timeDisplay = !item.allDay && item.date
    ? format(parseISO(item.date), 'h:mm a')
    : null;

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full flex items-stretch gap-3 rounded-lg p-3 text-left transition-colors',
        'hover:bg-gray-50 dark:hover:bg-gray-700/50',
        'border border-gray-100 dark:border-gray-700/50',
      )}
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {item.title}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1">
          {timeDisplay && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {timeDisplay}
            </span>
          )}
          {item.allDay && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              All day
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {item.description}
          </p>
        )}
      </div>

      {/* Source badge */}
      <span
        className="self-start text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
        style={{
          backgroundColor: `${item.color}18`,
          color: item.color,
        }}
      >
        {CALENDAR_SOURCE_LABELS[item.source]}
      </span>
    </button>
  );
};
