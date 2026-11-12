/**
 * Calendar layer filter
 *
 * The calendar holds everything dated — proposals, reminders, tasks, factory
 * ship dates, deliveries and site work — so it needs a way to quieten a layer
 * without going to a different screen to see it.
 *
 * Each chip carries its own colour and its count. The count comes from the
 * unfiltered set on purpose: a switched-off layer that still says "6" tells you
 * what you are choosing not to look at, where a chip that reads zero when
 * hidden just looks like an empty week.
 *
 * A layer with nothing in it this period is dimmed rather than removed, so the
 * row does not reflow as you page through months.
 */

import {
  CALENDAR_SOURCE_COLORS,
  CALENDAR_SOURCE_LABELS,
  type UnifiedCalendarItemSource,
} from '@/lib/types/calendarEvents';
import { cn } from '@/lib/utils';

const SOURCES = Object.keys(CALENDAR_SOURCE_LABELS) as UnifiedCalendarItemSource[];

interface CalendarLayerFilterProps {
  counts: Record<UnifiedCalendarItemSource, number>;
  hidden: Set<UnifiedCalendarItemSource>;
  onToggle: (source: UnifiedCalendarItemSource) => void;
}

export function CalendarLayerFilter({
  counts,
  hidden,
  onToggle,
}: CalendarLayerFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-1 py-2">
      {SOURCES.map(source => {
        const isHidden = hidden.has(source);
        const count = counts[source] ?? 0;
        const isEmpty = count === 0;

        return (
          <button
            key={source}
            type="button"
            onClick={() => onToggle(source)}
            aria-pressed={!isHidden}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-gray-400',
              isHidden
                ? 'border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500'
                : 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-200',
              isEmpty && !isHidden && 'opacity-50'
            )}
            title={
              isHidden
                ? `Show ${CALENDAR_SOURCE_LABELS[source].toLowerCase()}`
                : `Hide ${CALENDAR_SOURCE_LABELS[source].toLowerCase()}`
            }
          >
            <span
              aria-hidden="true"
              className={cn('h-2 w-2 shrink-0 rounded-full', isHidden && 'opacity-30')}
              style={{ backgroundColor: CALENDAR_SOURCE_COLORS[source] }}
            />
            {CALENDAR_SOURCE_LABELS[source]}
            {count > 0 && (
              <span className="tabular-nums text-gray-400 dark:text-gray-500">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
