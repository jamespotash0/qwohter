/**
 * Create / Edit Event Dialog
 *
 * Calendar event dialog with visual event type picker and schedule input.
 * Color is auto-set from event type. Supports multi-day events with end date.
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Trash2, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
} from '@/hooks/queries/useCalendarEvents';
import type {
  CalendarEvent,
  CalendarEventType,
} from '@/lib/types/calendarEvents';
import {
  CALENDAR_EVENT_TYPE_LABELS,
  CALENDAR_EVENT_TYPE_COLORS,
} from '@/lib/types/calendarEvents';
import { cn } from '@/lib/utils';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  event?: CalendarEvent | null;
  defaultDate?: Date | null;
}

const EVENT_TYPES: CalendarEventType[] = [
  'Custom', 'Meeting', 'Site Visit', 'Follow Up', 'Deadline', 'Milestone', 'Delivery', 'Installation',
];

export const CreateEventDialog: React.FC<CreateEventDialogProps> = ({
  open,
  onOpenChange,
  organizationId,
  event,
  defaultDate,
}) => {
  const isEditing = !!event;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [allDay, setAllDay] = useState(false);
  const [eventType, setEventType] = useState<CalendarEventType>('Custom');

  const color = CALENDAR_EVENT_TYPE_COLORS[eventType];

  // Mutations
  const createEvent = useCreateCalendarEvent(organizationId);
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const isSaving = createEvent.isPending || updateEvent.isPending;
  const isDeleting = deleteEvent.isPending;

  // Reset form when dialog opens/event changes
  useEffect(() => {
    if (!open) return;

    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setStartDate(event.start_date.split('T')[0]);
      setStartTime(event.start_date.includes('T')
        ? event.start_date.split('T')[1]?.substring(0, 5) || '09:00'
        : '09:00');
      if (event.end_date) {
        setHasEndDate(true);
        setEndDate(event.end_date.split('T')[0]);
        setEndTime(event.end_date.includes('T')
          ? event.end_date.split('T')[1]?.substring(0, 5) || '10:00'
          : '10:00');
      } else {
        setHasEndDate(false);
        setEndDate('');
        setEndTime('10:00');
      }
      setAllDay(event.all_day);
      setEventType(event.event_type);
    } else {
      const dateStr = defaultDate
        ? format(defaultDate, 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd');
      setTitle('');
      setDescription('');
      setStartDate(dateStr);
      setStartTime('09:00');
      setEndDate('');
      setEndTime('10:00');
      setHasEndDate(false);
      setAllDay(false);
      setEventType('Custom');
    }
  }, [open, event, defaultDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate) return;

    const startISO = allDay
      ? `${startDate}T00:00:00`
      : `${startDate}T${startTime}:00`;

    const endISO = hasEndDate && endDate
      ? allDay
        ? `${endDate}T23:59:59`
        : `${endDate}T${endTime}:00`
      : undefined;

    if (isEditing && event) {
      await updateEvent.mutateAsync({
        id: event.id,
        input: {
          title: title.trim(),
          description: description.trim() || undefined,
          start_date: startISO,
          end_date: endISO || null,
          all_day: allDay,
          event_type: eventType,
        },
      });
    } else {
      await createEvent.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        start_date: startISO,
        end_date: endISO,
        all_day: allDay,
        event_type: eventType,
      });
    }
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!event) return;
    await deleteEvent.mutateAsync(event.id);
    onOpenChange(false);
  };

  const isSubmitDisabled = isSaving || isDeleting || !title.trim() || !startDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0 overflow-hidden !rounded-2xl border-0 shadow-2xl [&>button]:top-4 [&>button]:right-4">
        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-1">
          <DialogTitle className="text-[17px] font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Event' : 'New Event'}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            {defaultDate && !isEditing
              ? format(defaultDate, 'EEEE, MMMM d, yyyy')
              : isEditing
                ? 'Update the event details below'
                : 'Add a new event to your calendar'}
          </DialogDescription>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-5">

          {/* Title — hero input */}
          <Input
            id="event-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            autoFocus
            required
            className={cn(
              'h-12 text-[15px] font-medium rounded-xl transition-all',
              'border-gray-200 dark:border-gray-700',
              'bg-gray-50/50 dark:bg-gray-800/50',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:border-[#EE6C4D] focus:ring-2 focus:ring-[#EE6C4D]/20',
            )}
          />

          {/* Description */}
          <Textarea
            id="event-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            rows={2}
            className={cn(
              'text-sm rounded-xl resize-none transition-all',
              'border-gray-200 dark:border-gray-700',
              'bg-gray-50/50 dark:bg-gray-800/50',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:border-[#EE6C4D] focus:ring-2 focus:ring-[#EE6C4D]/20',
            )}
          />

          {/* ── Event Type pills ── */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.08em]">
              Event Type
            </span>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TYPES.map((type) => {
                const isSelected = eventType === type;
                const typeColor = CALENDAR_EVENT_TYPE_COLORS[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEventType(type)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-[7px] rounded-full text-xs font-medium transition-all duration-150 border outline-none',
                      isSelected
                        ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                        : 'bg-gray-50 dark:bg-gray-800/60 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300',
                    )}
                    style={{
                      borderColor: isSelected ? `${typeColor}40` : undefined,
                    }}
                  >
                    <span
                      className={cn(
                        'rounded-full transition-all duration-150 flex-shrink-0',
                        isSelected ? 'w-2.5 h-2.5' : 'w-2 h-2',
                      )}
                      style={{ backgroundColor: typeColor }}
                    />
                    {CALENDAR_EVENT_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700/50" />

          {/* ── Schedule section ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.08em] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Schedule
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="multi-day-toggle"
                    className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none"
                  >
                    Multi-day
                  </Label>
                  <Switch
                    id="multi-day-toggle"
                    checked={hasEndDate}
                    onCheckedChange={(checked) => {
                      setHasEndDate(checked);
                      if (checked && !endDate) setEndDate(startDate);
                    }}
                    className="data-[state=checked]:bg-[#EE6C4D]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="all-day-toggle"
                    className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none"
                  >
                    All day
                  </Label>
                  <Switch
                    id="all-day-toggle"
                    checked={allDay}
                    onCheckedChange={setAllDay}
                    className="data-[state=checked]:bg-[#EE6C4D]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50/80 dark:bg-gray-800/40 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 space-y-3">
              {/* Start row */}
              <div>
                {hasEndDate && (
                  <Label className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider mb-1.5 block">
                    Start
                  </Label>
                )}
                <div
                  className="grid gap-3 transition-all duration-200"
                  style={{ gridTemplateColumns: allDay ? '1fr' : '1fr 1fr' }}
                >
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                      Date
                    </Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (hasEndDate && (!endDate || endDate < e.target.value)) {
                          setEndDate(e.target.value);
                        }
                      }}
                      required
                      className="h-9 text-sm border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg"
                    />
                  </div>
                  {!allDay && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Time
                      </Label>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="h-9 text-sm border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* End row */}
              {hasEndDate && (
                <div>
                  <Label className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider mb-1.5 block">
                    End
                  </Label>
                  <div
                    className="grid gap-3 transition-all duration-200"
                    style={{ gridTemplateColumns: allDay ? '1fr' : '1fr 1fr' }}
                  >
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                        Date
                      </Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        className="h-9 text-sm border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg"
                      />
                    </div>
                    {!allDay && (
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Time
                        </Label>
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="h-9 text-sm border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/50">
            <div>
              {isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting || isSaving}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5 h-9 px-3 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </span>
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSaving || isDeleting}
                className="h-9 px-4 rounded-lg border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </Button>
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className={cn(
                  'inline-flex items-center justify-center h-9 px-5 rounded-lg',
                  'text-sm text-white font-medium shadow-sm',
                  'transition-all duration-150 active:scale-[0.98]',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
                )}
                style={{ backgroundColor: color }}
              >
                {isSaving ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : isEditing ? (
                  'Update Event'
                ) : (
                  'Create Event'
                )}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
