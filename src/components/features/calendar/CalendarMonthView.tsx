/**
 * Calendar Month View
 *
 * Full-width month grid with events displayed inline in each day cell.
 * Matches modern scheduling app design: 7-column grid, event entries
 * with colored dots + time + title, today highlight, outside-month dimming.
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isSameDay,
} from 'date-fns';
import { Plus } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { QuickAddPopover } from './QuickAddPopover';
import type { UnifiedCalendarItem } from '@/lib/types/calendarEvents';

interface CalendarMonthViewProps {
  currentMonth: Date;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  itemsByDate: Map<string, UnifiedCalendarItem[]>;
  onEventClick?: (item: UnifiedCalendarItem) => void;
  onDayZoom: (date: Date) => void;
  organizationId: string;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MAX_VISIBLE_EVENTS = 3;

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  currentMonth,
  selectedDate,
  onSelectDate,
  itemsByDate,
  onEventClick,
  onDayZoom,
  organizationId,
}) => {
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);

  // ── Grid dates (Monday start, 6 fixed rows) ──
  const rows = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

    // Ensure exactly 6 rows (42 days)
    while (allDays.length < 42) {
      const last = allDays[allDays.length - 1];
      const next = new Date(last);
      next.setDate(next.getDate() + 1);
      allDays.push(next);
    }

    const result: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      result.push(allDays.slice(i, i + 7));
    }
    return result;
  }, [currentMonth]);

  // ── Format event time ──
  const formatEventTime = useCallback((dateStr: string, allDay: boolean) => {
    if (allDay) return '';
    try {
      const date = new Date(dateStr);
      return format(date, 'h:mm a');
    } catch {
      return '';
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* ── Grid ── */}
      <div className="flex-1 flex flex-col border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40">
          {WEEKDAYS.map((day, i) => (
            <div
              key={day}
              className={cn(
                'px-3 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400',
                i < 6 && 'border-r border-gray-200 dark:border-gray-700',
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day rows */}
        <div className="flex-1 flex flex-col">
          {rows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className={cn(
                'grid grid-cols-7 flex-1',
                rowIdx < rows.length - 1 && 'border-b border-gray-200 dark:border-gray-700',
              )}
            >
              {row.map((date, colIdx) => {
                const key = format(date, 'yyyy-MM-dd');
                const items = itemsByDate.get(key) || [];
                const inMonth = isSameMonth(date, currentMonth);
                const selected = selectedDate ? isSameDay(date, selectedDate) : false;
                const today = isToday(date);
                const visible = items.slice(0, MAX_VISIBLE_EVENTS);
                const moreCount = Math.max(0, items.length - MAX_VISIBLE_EVENTS);

                return (
                  <div
                    key={key}
                    onClick={() => {
                      onSelectDate(date);
                      onDayZoom(date);
                    }}
                    className={cn(
                      'min-h-[90px] p-1.5 cursor-pointer transition-colors relative group',
                      colIdx < 6 && 'border-r border-gray-200 dark:border-gray-700',
                      inMonth
                        ? 'bg-white dark:bg-gray-900'
                        : 'bg-gray-50/50 dark:bg-gray-800/20',
                      selected && 'bg-blue-50/60 dark:bg-blue-950/20',
                      !selected && inMonth && 'hover:bg-gray-50/80 dark:hover:bg-gray-800/30',
                    )}
                  >
                    {/* Day number */}
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center text-xs leading-none',
                          today
                            ? 'bg-blue-600 text-white w-6 h-6 rounded-full font-semibold'
                            : inMonth
                              ? 'text-gray-900 dark:text-gray-100 font-medium h-6 w-6'
                              : 'text-gray-400 dark:text-gray-600 h-6 w-6',
                        )}
                      >
                        {date.getDate()}
                      </span>

                      {/* Quick-add "+" button */}
                      <QuickAddPopover
                        date={date}
                        organizationId={organizationId}
                        open={quickAddDate === key}
                        onOpenChange={(open) => {
                          if (!open) setQuickAddDate(null);
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickAddDate(key);
                          }}
                          className={cn(
                            'w-5 h-5 rounded flex items-center justify-center transition-all',
                            'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
                            'hover:bg-gray-100 dark:hover:bg-gray-700/60',
                            'opacity-0 group-hover:opacity-100',
                            quickAddDate === key && 'opacity-100',
                          )}
                        >
                          <Plus size={12} weight="bold" />
                        </button>
                      </QuickAddPopover>
                    </div>

                    {/* Events inline */}
                    <div className="space-y-px">
                      {visible.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(item);
                          }}
                          className={cn(
                            'w-full flex items-center gap-1 text-left rounded px-1 py-0.5',
                            'hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors',
                          )}
                          title={item.title}
                        >
                          <span
                            className="w-[5px] h-[5px] rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-[11px] text-gray-700 dark:text-gray-300 truncate leading-tight">
                            {!item.allDay && (
                              <span className="text-gray-500 dark:text-gray-400">
                                {formatEventTime(item.date, item.allDay)}{' '}
                              </span>
                            )}
                            {item.title}
                          </span>
                        </button>
                      ))}
                      {moreCount > 0 && (
                        <span className="block text-[10px] text-blue-600 dark:text-blue-400 px-1 font-medium cursor-pointer hover:underline">
                          +{moreCount} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
