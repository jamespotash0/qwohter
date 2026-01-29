/**
 * Calendar Day View
 *
 * Hourly timeline for a selected day. Shows all-day events at top,
 * timed events as colored blocks, and a current-time indicator.
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { format, parseISO, isToday, getHours, getMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { QuickAddPopover } from './QuickAddPopover';
import type { UnifiedCalendarItem } from '@/lib/types/calendarEvents';
import { CALENDAR_SOURCE_LABELS } from '@/lib/types/calendarEvents';

interface CalendarDayViewProps {
  date: Date;
  items: UnifiedCalendarItem[];
  onEditEvent: (item: UnifiedCalendarItem) => void;
  organizationId: string;
}

const HOUR_HEIGHT = 64; // px per hour row
const START_HOUR = 0;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

/**
 * Compute side-by-side columns for overlapping events.
 * Returns the input array augmented with `column` and `totalColumns`.
 */
function computeOverlapLayout<T extends { startHour: number; endHour: number }>(
  events: T[],
): (T & { column: number; totalColumns: number })[] {
  const n = events.length;
  if (n === 0) return [];

  // Sort by start time, then longer events first
  const indices = Array.from({ length: n }, (_, i) => i);
  indices.sort((a, b) => {
    const diff = events[a].startHour - events[b].startHour;
    if (diff !== 0) return diff;
    return (events[b].endHour - events[b].startHour) - (events[a].endHour - events[a].startHour);
  });

  // Greedy column assignment
  const colAssignment = new Array<number>(n).fill(0);
  const columnEndTimes: number[] = [];

  for (const idx of indices) {
    const ev = events[idx];
    let col = 0;
    while (col < columnEndTimes.length && columnEndTimes[col] > ev.startHour) {
      col++;
    }
    colAssignment[idx] = col;
    if (col === columnEndTimes.length) {
      columnEndTimes.push(ev.endHour);
    } else {
      columnEndTimes[col] = ev.endHour;
    }
  }

  // Build transitive overlap groups (union-find)
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a: number, b: number) => { parent[find(a)] = find(b); };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (events[i].startHour < events[j].endHour && events[i].endHour > events[j].startHour) {
        union(i, j);
      }
    }
  }

  // Max column per group → totalColumns
  const groupMaxCol = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    groupMaxCol.set(root, Math.max(groupMaxCol.get(root) || 0, colAssignment[i]));
  }

  return events.map((ev, i) => ({
    ...ev,
    column: colAssignment[i],
    totalColumns: (groupMaxCol.get(find(i)) || 0) + 1,
  }));
}

export const CalendarDayView: React.FC<CalendarDayViewProps> = ({
  date,
  items,
  onEditEvent,
  organizationId,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [quickAddHour, setQuickAddHour] = useState<number | null>(null);

  const isViewingToday = isToday(date);

  // Scroll to current hour on mount (or 8 AM)
  useEffect(() => {
    if (timelineRef.current) {
      const scrollToHour = isViewingToday ? Math.max(getHours(new Date()) - 1, START_HOUR) : 8;
      const offset = (scrollToHour - START_HOUR) * HOUR_HEIGHT;
      timelineRef.current.scrollTop = offset;
    }
  }, [date, isViewingToday]);

  // Split all-day vs timed events
  const { allDayItems, timedItems } = useMemo(() => {
    const allDay: UnifiedCalendarItem[] = [];
    const timed: UnifiedCalendarItem[] = [];
    for (const item of items) {
      if (item.allDay) {
        allDay.push(item);
      } else {
        timed.push(item);
      }
    }
    return { allDayItems: allDay, timedItems: timed };
  }, [items]);

  // Position timed events with overlap layout
  const positionedEvents = useMemo(() => {
    const events = timedItems.map((item) => {
      const start = parseISO(item.date);
      const startHour = getHours(start) + getMinutes(start) / 60;
      const endDate = item.endDate ? parseISO(item.endDate) : null;
      const endHour = endDate
        ? getHours(endDate) + getMinutes(endDate) / 60
        : startHour + 1; // Default 1-hour duration

      const top = (startHour - START_HOUR) * HOUR_HEIGHT;
      const height = Math.max((endHour - startHour) * HOUR_HEIGHT, 28); // Min 28px

      return { item, top, height, startHour, endHour };
    });

    return computeOverlapLayout(events);
  }, [timedItems]);

  // Current time position — updates every minute
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(null);
  useEffect(() => {
    if (!isViewingToday) {
      setCurrentTimePosition(null);
      return;
    }
    const update = () => {
      const now = new Date();
      const h = getHours(now) + getMinutes(now) / 60;
      if (h < START_HOUR || h > END_HOUR) {
        setCurrentTimePosition(null);
      } else {
        setCurrentTimePosition((h - START_HOUR) * HOUR_HEIGHT);
      }
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [isViewingToday]);

  const handleHourClick = (hour: number) => {
    setQuickAddHour(hour);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── All-day events ── */}
      {allDayItems.length > 0 && (
        <div className="mb-3 space-y-1">
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            All Day
          </span>
          <div className="flex flex-wrap gap-1.5">
            {allDayItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onEditEvent(item)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  'hover:opacity-80',
                )}
                style={{
                  backgroundColor: `${item.color}30`,
                  color: item.color,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                {item.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Timeline ── */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-y-auto min-h-0 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900"
      >
        <div className="relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
          {/* Hour rows */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute w-full flex border-b border-gray-100 dark:border-gray-800"
              style={{ top: (hour - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              {/* Time label */}
              <div className="w-16 flex-shrink-0 pr-3 pt-1.5 text-right">
                <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                  {hour === 0
                    ? '12 AM'
                    : hour < 12
                      ? `${hour} AM`
                      : hour === 12
                        ? '12 PM'
                        : `${hour - 12} PM`}
                </span>
              </div>

              {/* Clickable slot */}
              <QuickAddPopover
                date={date}
                organizationId={organizationId}
                open={quickAddHour === hour}
                onOpenChange={(open) => {
                  if (!open) setQuickAddHour(null);
                }}
                defaultHour={hour}
              >
                <div
                  className="flex-1 border-l border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors"
                  onClick={() => handleHourClick(hour)}
                />
              </QuickAddPopover>
            </div>
          ))}

          {/* Timed event blocks — positioned within event area */}
          <div className="absolute top-0 bottom-0 left-16 right-2">
            {positionedEvents.map(({ item, top, height, column, totalColumns }) => (
              <button
                key={item.id}
                onClick={() => onEditEvent(item)}
                className={cn(
                  'absolute rounded-lg px-2.5 py-1.5 text-left transition-all overflow-hidden z-[2]',
                  'hover:shadow-md hover:z-10',
                )}
                style={{
                  top,
                  height,
                  left: `${(column / totalColumns) * 100}%`,
                  width: `${(1 / totalColumns) * 100}%`,
                  backgroundColor: `${item.color}30`,
                }}
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="text-xs font-medium text-gray-900 dark:text-white truncate">
                    {item.title}
                  </span>
                  <span
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 truncate"
                      style={{ backgroundColor: `${item.color}20`, color: item.color }}
                    >
                      {item.source === 'calendar_event' && item.calendarEvent
                        ? item.calendarEvent.event_type
                        : CALENDAR_SOURCE_LABELS[item.source]}
                    </span>
                </div>
                {height >= 40 && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {format(parseISO(item.date), 'h:mm a')}
                    {item.endDate && ` – ${format(parseISO(item.endDate), 'h:mm a')}`}
                  </p>
                )}
                {height >= 56 && item.description && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                    {item.description}
                  </p>
                )}
              </button>
            ))}
          </div>

          {/* Current time indicator */}
          {currentTimePosition !== null && (
            <div
              className="absolute left-12 right-0 flex items-center z-20 pointer-events-none"
              style={{ top: currentTimePosition }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1 shadow-sm" />
              <div className="flex-1 h-[2px] bg-red-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
