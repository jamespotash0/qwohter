/**
 * Calendar Week View
 *
 * 7-column hourly grid for the selected week (Mon–Sun).
 * Events as positioned colored blocks.
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  format,
  parseISO,
  isToday,
  isSameDay,
  getHours,
  getMinutes,
  startOfWeek,
  addDays,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { QuickAddPopover } from './QuickAddPopover';
import type { UnifiedCalendarItem } from '@/lib/types/calendarEvents';
import { CALENDAR_SOURCE_LABELS } from '@/lib/types/calendarEvents';

interface CalendarWeekViewProps {
  selectedDate: Date;
  itemsByDate: Map<string, UnifiedCalendarItem[]>;
  onEventClick?: (item: UnifiedCalendarItem) => void;
  onDayZoom: (date: Date) => void;
  organizationId: string;
}

const HOUR_HEIGHT = 56;
const START_HOUR = 0;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

const formatHourLabel = (hour: number) => {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
};

/**
 * Compute side-by-side columns for overlapping events.
 */
function computeOverlapLayout<T extends { startHour: number; endHour: number }>(
  events: T[],
): (T & { column: number; totalColumns: number })[] {
  const n = events.length;
  if (n === 0) return [];

  const indices = Array.from({ length: n }, (_, i) => i);
  indices.sort((a, b) => {
    const diff = events[a].startHour - events[b].startHour;
    if (diff !== 0) return diff;
    return (events[b].endHour - events[b].startHour) - (events[a].endHour - events[a].startHour);
  });

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

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  selectedDate,
  itemsByDate,
  onEventClick,
  onDayZoom,
  organizationId,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [quickAddKey, setQuickAddKey] = useState<string | null>(null); // "dayIdx-hour"

  // Week days (Mon start)
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  // Scroll to current hour on mount
  useEffect(() => {
    if (timelineRef.current) {
      const now = new Date();
      const scrollHour = Math.max(getHours(now) - 1, START_HOUR);
      timelineRef.current.scrollTop = (scrollHour - START_HOUR) * HOUR_HEIGHT;
    }
  }, [selectedDate]);

  // Current time indicator (spans full width across all days)
  const [currentTimeTop, setCurrentTimeTop] = useState<number | null>(null);
  const hasToday = useMemo(() => weekDays.some((d) => isToday(d)), [weekDays]);

  useEffect(() => {
    const update = () => {
      if (!hasToday) {
        setCurrentTimeTop(null);
        return;
      }
      const now = new Date();
      const h = getHours(now) + getMinutes(now) / 60;
      if (h < START_HOUR || h > END_HOUR) {
        setCurrentTimeTop(null);
      } else {
        setCurrentTimeTop((h - START_HOUR) * HOUR_HEIGHT);
      }
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [hasToday]);

  // Position events for a day column (with overlap layout)
  const getPositionedEvents = (dayItems: UnifiedCalendarItem[]) => {
    const events = dayItems
      .filter((item) => !item.allDay)
      .map((item) => {
        const start = parseISO(item.date);
        const startHour = getHours(start) + getMinutes(start) / 60;
        const endDate = item.endDate ? parseISO(item.endDate) : null;
        const endHour = endDate
          ? getHours(endDate) + getMinutes(endDate) / 60
          : startHour + 1;
        const top = (startHour - START_HOUR) * HOUR_HEIGHT;
        const height = Math.max((endHour - startHour) * HOUR_HEIGHT, 24);
        return { item, top, height, startHour, endHour };
      });
    return computeOverlapLayout(events);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Grid ── */}
      <div className="flex-1 flex flex-col border border-gray-200 dark:border-gray-700 rounded overflow-hidden bg-white dark:bg-gray-900 min-h-0">
        {/* Day column headers */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40">
          {/* Time gutter spacer */}
          <div className="w-14 flex-shrink-0" />
          {weekDays.map((day, i) => {
            const today = isToday(day);
            const selected = isSameDay(day, selectedDate);
            return (
              <div
                key={i}
                onClick={() => onDayZoom(day)}
                className={cn(
                  'flex-1 py-2.5 px-2 text-center cursor-pointer transition-colors',
                  i < 6 && 'border-r border-gray-200 dark:border-gray-700',
                  selected && 'bg-blue-50/60 dark:bg-blue-950/20',
                  !selected && 'hover:bg-gray-100/50 dark:hover:bg-gray-800/30',
                )}
              >
                <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {format(day, 'EEE')}
                </div>
                <div
                  className={cn(
                    'text-sm font-semibold mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full',
                    today
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-900 dark:text-white',
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* All-day row */}
        {weekDays.some((day) => {
          const key = format(day, 'yyyy-MM-dd');
          return (itemsByDate.get(key) || []).some((i) => i.allDay);
        }) && (
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <div className="w-14 flex-shrink-0 pr-2 pt-1.5 text-right">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                ALL DAY
              </span>
            </div>
            {weekDays.map((day, i) => {
              const key = format(day, 'yyyy-MM-dd');
              const allDayItems = (itemsByDate.get(key) || []).filter((it) => it.allDay);
              return (
                <div
                  key={i}
                  className={cn(
                    'flex-1 p-1 min-h-[32px]',
                    i < 6 && 'border-r border-gray-200 dark:border-gray-700',
                  )}
                >
                  {allDayItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onEventClick?.(item)}
                      className="block w-full text-[10px] font-medium px-1.5 py-0.5 rounded truncate text-left mb-0.5"
                      style={{ backgroundColor: `${item.color}30`, color: item.color }}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Hourly grid */}
        <div ref={timelineRef} className="flex-1 overflow-y-auto min-h-0">
          <div className="relative flex" style={{ height: HOURS.length * HOUR_HEIGHT }}>
            {/* Time labels column */}
            <div className="w-14 flex-shrink-0 relative">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full pr-2 pt-1 text-right border-b border-gray-100 dark:border-gray-800"
                  style={{ top: (hour - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                >
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                    {formatHourLabel(hour)}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIdx) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayItems = itemsByDate.get(key) || [];
              const positioned = getPositionedEvents(dayItems);

              return (
                <div
                  key={dayIdx}
                  className={cn(
                    'flex-1 relative',
                    dayIdx < 6 && 'border-r border-gray-200 dark:border-gray-700',
                  )}
                >
                  {/* Hour grid lines */}
                  {HOURS.map((hour) => (
                    <QuickAddPopover
                      key={hour}
                      date={day}
                      organizationId={organizationId}
                      open={quickAddKey === `${dayIdx}-${hour}`}
                      onOpenChange={(open) => {
                        if (!open) setQuickAddKey(null);
                      }}
                      defaultHour={hour}
                    >
                      <div
                        className="absolute w-full border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-colors"
                        style={{ top: (hour - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                        onClick={() => setQuickAddKey(`${dayIdx}-${hour}`)}
                      />
                    </QuickAddPopover>
                  ))}

                  {/* Positioned event blocks */}
                  {positioned.map(({ item, top, height, column, totalColumns }) => (
                    <button
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(item);
                      }}
                      className={cn(
                        'absolute rounded px-1.5 py-0.5 text-left transition-all z-[2] overflow-hidden',
                        'hover:shadow-md hover:z-10',
                      )}
                      style={{
                        top,
                        height,
                        left: `${(column / totalColumns) * 100}%`,
                        width: `${(1 / totalColumns) * 100}%`,
                        backgroundColor: `${item.color}35`,
                      }}
                    >
                      <span className="text-[10px] font-medium text-gray-900 dark:text-white truncate block leading-tight">
                        {item.title}
                      </span>
                      {height >= 28 && (
                        <span className="text-[9px] text-gray-500 dark:text-gray-400 block leading-tight truncate">
                          {format(parseISO(item.date), 'h:mm a')}
                          {item.endDate && ` – ${format(parseISO(item.endDate), 'h:mm a')}`}
                        </span>
                      )}
                      {height >= 44 && item.description && (
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 block leading-tight truncate mt-px">
                          {item.description}
                        </span>
                      )}
                    </button>
                  ))}

                </div>
              );
            })}

            {/* Current time line — spans full width across all day columns */}
            {currentTimeTop !== null && (
              <div
                className="absolute left-14 right-0 flex items-center z-20 pointer-events-none"
                style={{ top: currentTimeTop }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                <div className="flex-1 h-[2px] bg-red-500" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
