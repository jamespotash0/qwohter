/**
 * Calendar Navigation Header
 *
 * Shared navigation bar for all calendar views.
 * Today button, arrow navigation, title, and view switcher.
 */

import React from 'react';
import { CaretLeft, CaretRight, CalendarBlank } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export type CalendarViewType = 'day' | 'week' | 'month' | 'year';

const VIEW_OPTIONS: { value: CalendarViewType; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

interface CalendarNavHeaderProps {
  title: string;
  view: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  onToday: () => void;
  todayLabel?: string;
  onPrev: () => void;
  onNext: () => void;
}

export const CalendarNavHeader: React.FC<CalendarNavHeaderProps> = ({
  title,
  view,
  onViewChange,
  onToday,
  todayLabel = 'Today',
  onPrev,
  onNext,
}) => (
  <div className="flex items-center justify-between mb-4">
    {/* Left: Today + Navigation */}
    <div className="flex items-center gap-2">
      <button
        onClick={onToday}
        className={cn(
          'h-8 px-3.5 text-xs font-medium rounded-lg transition-all inline-flex items-center gap-1.5',
          'border border-gray-200 dark:border-gray-700',
          'bg-white dark:bg-gray-800',
          'text-gray-700 dark:text-gray-300',
          'hover:bg-gray-50 dark:hover:bg-gray-700/70',
          'hover:border-gray-300 dark:hover:border-gray-600',
          'active:scale-[0.97]',
        )}
      >
        <CalendarBlank size={14} weight="bold" />
        {todayLabel}
      </button>

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />

      <div className="flex items-center gap-0.5">
        <button
          onClick={onPrev}
          className={cn(
            'h-8 w-8 rounded-lg flex items-center justify-center transition-all',
            'text-gray-500 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'hover:text-gray-700 dark:hover:text-gray-200',
            'active:scale-[0.92]',
          )}
        >
          <CaretLeft size={16} weight="bold" />
        </button>
        <span className="text-[15px] font-semibold text-gray-900 dark:text-white min-w-[180px] text-center select-none px-1">
          {title}
        </span>
        <button
          onClick={onNext}
          className={cn(
            'h-8 w-8 rounded-lg flex items-center justify-center transition-all',
            'text-gray-500 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'hover:text-gray-700 dark:hover:text-gray-200',
            'active:scale-[0.92]',
          )}
        >
          <CaretRight size={16} weight="bold" />
        </button>
      </div>
    </div>

    {/* Right: View Switcher */}
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
      {VIEW_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onViewChange(opt.value)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
            view === opt.value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);
