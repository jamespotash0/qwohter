/**
 * Quick Add Event Popover
 *
 * Lightweight inline form for fast event creation from the month grid.
 * Uses Radix Popover with minimal fields: title, event type, time.
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCreateCalendarEvent } from '@/hooks/queries/useCalendarEvents';
import type { CalendarEventType } from '@/lib/types/calendarEvents';
import { CALENDAR_EVENT_TYPE_COLORS, CALENDAR_EVENT_TYPE_LABELS } from '@/lib/types/calendarEvents';
import { cn } from '@/lib/utils';

interface QuickAddPopoverProps {
  date: Date;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional pre-filled hour (0-23) for day view usage */
  defaultHour?: number;
  children: React.ReactNode;
}

const EVENT_TYPES: CalendarEventType[] = [
  'Custom', 'Meeting', 'Site Visit', 'Follow Up', 'Deadline', 'Milestone', 'Delivery', 'Installation',
];

export const QuickAddPopover: React.FC<QuickAddPopoverProps> = ({
  date,
  organizationId,
  open,
  onOpenChange,
  defaultHour,
  children,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<CalendarEventType>('Custom');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);

  const createEvent = useCreateCalendarEvent(organizationId);
  const color = CALENDAR_EVENT_TYPE_COLORS[eventType];

  // Reset form when popover opens
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setEventType('Custom');
      setAllDay(false);
      if (defaultHour !== undefined) {
        const h = String(defaultHour).padStart(2, '0');
        const endH = String(Math.min(defaultHour + 1, 23)).padStart(2, '0');
        setStartTime(`${h}:00`);
        setEndTime(`${endH}:00`);
      } else {
        setStartTime('09:00');
        setEndTime('10:00');
      }
    }
  }, [open, defaultHour]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    const startISO = allDay
      ? `${dateStr}T00:00:00`
      : `${dateStr}T${startTime}:00`;
    const endISO = !allDay && endTime
      ? `${dateStr}T${endTime}:00`
      : undefined;

    await createEvent.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      start_date: startISO,
      end_date: endISO,
      all_day: allDay,
      event_type: eventType,
    });

    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl bg-white dark:bg-gray-900"
        align="start"
        sideOffset={8}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {/* Date label */}
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            {format(date, 'EEE, MMM d')}
          </p>

          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            autoFocus
            className={cn(
              'h-10 text-sm font-medium rounded-lg',
              'border-gray-200 dark:border-gray-700',
              'bg-gray-50/50 dark:bg-gray-800/50',
              'placeholder:text-gray-400',
              'focus:border-[#EE6C4D] focus:ring-2 focus:ring-[#EE6C4D]/20',
            )}
          />

          {/* Description */}
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className={cn(
              'h-10 text-sm rounded-lg',
              'border-gray-200 dark:border-gray-700',
              'bg-gray-50/50 dark:bg-gray-800/50',
              'placeholder:text-gray-400',
              'focus:border-[#EE6C4D] focus:ring-2 focus:ring-[#EE6C4D]/20',
            )}
          />

          {/* Event type pills */}
          <div className="flex flex-wrap gap-1">
            {EVENT_TYPES.map((type) => {
              const isSelected = eventType === type;
              const typeColor = CALENDAR_EVENT_TYPE_COLORS[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEventType(type)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all border',
                    isSelected
                      ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                      : 'bg-gray-50 dark:bg-gray-800/60 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50',
                  )}
                  style={{ borderColor: isSelected ? `${typeColor}40` : undefined }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: typeColor }}
                  />
                  {CALENDAR_EVENT_TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>

          {/* Time row */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Time</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-500 dark:text-gray-400 select-none">All day</span>
                <Switch
                  checked={allDay}
                  onCheckedChange={setAllDay}
                  className="data-[state=checked]:bg-[#EE6C4D] scale-90"
                />
              </div>
            </div>
            {!allDay && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-8 text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg flex-1"
                />
                <span className="text-xs text-gray-400">–</span>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-8 text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg flex-1"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={createEvent.isPending || !title.trim()}
            className={cn(
              'w-full h-9 rounded-lg text-sm text-white font-medium',
              'transition-all duration-150 active:scale-[0.98]',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
            style={{ backgroundColor: color }}
          >
            {createEvent.isPending ? (
              <span className="flex items-center justify-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Adding...
              </span>
            ) : (
              'Add Event'
            )}
          </button>
        </form>
      </PopoverContent>
    </Popover>
  );
};
