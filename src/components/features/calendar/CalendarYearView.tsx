/**
 * Calendar Year View
 *
 * 12 mini month grids (4 columns x 3 rows) showing the full year.
 * Day numbers with event dot indicators. Click a day to zoom in.
 */

import React, { useMemo, useCallback } from 'react';
import {
  startOfYear,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  getYear,
} from 'date-fns';
import { CaretLeft, CaretRight, CalendarBlankIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UnifiedCalendarItem } from '@/lib/types/calendarEvents';

interface CalendarYearViewProps {
  currentYear: number;
  onYearChange: (year: number) => void;
  /** All items for the year — keyed by yyyy-MM-dd */
  itemsByDate: Map<string, UnifiedCalendarItem[]>;
  onDayZoom: (date: Date) => void;
  onMonthZoom: (date: Date) => void;
}

const MINI_WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const CalendarYearView: React.FC<CalendarYearViewProps> = ({
  currentYear,
  onYearChange,
  itemsByDate,
  onDayZoom,
  onMonthZoom,
}) => {
  const goToPrevYear = useCallback(() => onYearChange(currentYear - 1), [currentYear, onYearChange]);
  const goToNextYear = useCallback(() => onYearChange(currentYear + 1), [currentYear, onYearChange]);
  const goToCurrentYear = useCallback(() => onYearChange(getYear(new Date())), [onYearChange]);

  // 12 months
  const months = useMemo(() => {
    const yearStart = startOfYear(new Date(currentYear, 0, 1));
    return Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));
  }, [currentYear]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={goToCurrentYear}
            className="text-xs h-8 gap-1.5 rounded-lg border-gray-200 dark:border-gray-700"
          >
            <CalendarBlankIcon size={14} />
            This Year
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={goToPrevYear} className="h-8 w-8 p-0 rounded-lg">
              <CaretLeft size={16} />
            </Button>
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white min-w-[80px] text-center select-none">
              {currentYear}
            </h2>
            <Button variant="ghost" size="sm" onClick={goToNextYear} className="h-8 w-8 p-0 rounded-lg">
              <CaretRight size={16} />
            </Button>
          </div>
        </div>
{/* view label removed — shown in page-level view switcher */}
      </div>

      {/* ── 12 Mini Months (4x3 grid) ── */}
      <div className="flex-1 grid grid-cols-4 gap-4 min-h-0 overflow-y-auto">
        {months.map((month) => (
          <MiniMonth
            key={format(month, 'yyyy-MM')}
            month={month}
            itemsByDate={itemsByDate}
            onDayClick={onDayZoom}
            onMonthClick={() => onMonthZoom(month)}
          />
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Mini Month Component
// ─────────────────────────────────────────────────────────────────────────────

interface MiniMonthProps {
  month: Date;
  itemsByDate: Map<string, UnifiedCalendarItem[]>;
  onDayClick: (date: Date) => void;
  onMonthClick: () => void;
}

const MiniMonth: React.FC<MiniMonthProps> = ({ month, itemsByDate, onDayClick, onMonthClick }) => {
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

    const rows: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      rows.push(allDays.slice(i, i + 7));
    }
    return rows;
  }, [month]);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 bg-white dark:bg-gray-900">
      {/* Month title */}
      <button
        onClick={onMonthClick}
        className="text-xs font-semibold text-gray-900 dark:text-white mb-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors block"
      >
        {format(month, 'MMMM')}
      </button>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {MINI_WEEKDAYS.map((d, i) => (
          <div key={i} className="text-[9px] text-gray-400 dark:text-gray-500 text-center font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day) => {
            const inMonth = isSameMonth(day, month);
            const today = isToday(day);
            const key = format(day, 'yyyy-MM-dd');
            const hasEvents = (itemsByDate.get(key) || []).length > 0;

            return (
              <button
                key={key}
                onClick={() => onDayClick(day)}
                disabled={!inMonth}
                className={cn(
                  'relative w-full aspect-square flex items-center justify-center text-[10px] rounded transition-colors',
                  inMonth
                    ? 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                    : 'text-gray-300 dark:text-gray-700 cursor-default',
                  today && inMonth && 'bg-blue-600 text-white hover:bg-blue-700 font-semibold',
                )}
              >
                {day.getDate()}
                {hasEvents && inMonth && !today && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
