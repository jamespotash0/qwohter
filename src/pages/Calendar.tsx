/**
 * Calendar Page
 *
 * Unified calendar with Day / Week / Month / Year views.
 * Shows proposals, tasks, reminders, and custom events.
 * Centralized navigation bar with view switcher.
 */

import { useState, useMemo, useCallback } from 'react';
import { format, isSameDay, getYear, addDays, startOfWeek } from 'date-fns';
import { Plus } from '@phosphor-icons/react';
import { PageContent } from '@/components/common/layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/auth';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import {
  useCalendarItems,
  useDeleteCalendarEvent,
} from '@/hooks/queries/useCalendarEvents';
import { CalendarNavHeader } from '@/components/features/calendar/CalendarNavHeader';
import type { CalendarViewType } from '@/components/features/calendar/CalendarNavHeader';
import { CalendarMonthView } from '@/components/features/calendar/CalendarMonthView';
import { CalendarWeekView } from '@/components/features/calendar/CalendarWeekView';
import { CalendarDayView } from '@/components/features/calendar/CalendarDayView';
import { CalendarYearView } from '@/components/features/calendar/CalendarYearView';
import { CreateEventDialog } from '@/components/features/calendar/CreateEventDialog';
import { CalendarItemDetailSheet } from '@/components/features/calendar/CalendarItemDetailSheet';
import type { CalendarEvent, UnifiedCalendarItem } from '@/lib/types/calendarEvents';

const Calendar = () => {
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id || '');

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentYear, setCurrentYear] = useState<number>(getYear(new Date()));
  const [view, setView] = useState<CalendarViewType>('month');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [detailItem, setDetailItem] = useState<UnifiedCalendarItem | null>(null);

  const { data: calendarItems = [], isLoading } = useCalendarItems(
    organization?.id,
    currentMonth,
  );

  const deleteEvent = useDeleteCalendarEvent();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Group items by date
  const itemsByDate = useMemo(() => {
    const map = new Map<string, UnifiedCalendarItem[]>();
    for (const item of calendarItems) {
      const key = format(new Date(item.date), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [calendarItems]);

  // Items for the selected day
  const selectedDayItems = useMemo(() => {
    return calendarItems.filter((item) =>
      isSameDay(new Date(item.date), selectedDate),
    );
  }, [calendarItems, selectedDate]);

  // ── Centralized navigation ──

  const navTitle = useMemo(() => {
    switch (view) {
      case 'day':
        return format(selectedDate, 'EEEE, MMMM d, yyyy');
      case 'week': {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = addDays(weekStart, 6);
        return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
      }
      case 'month':
        return format(currentMonth, 'MMMM yyyy');
      case 'year':
        return String(currentYear);
    }
  }, [view, selectedDate, currentMonth, currentYear]);

  const handlePrev = useCallback(() => {
    switch (view) {
      case 'day': {
        const d = addDays(selectedDate, -1);
        setSelectedDate(d);
        setCurrentMonth(d);
        break;
      }
      case 'week': {
        const d = addDays(selectedDate, -7);
        setSelectedDate(d);
        setCurrentMonth(d);
        break;
      }
      case 'month':
        setCurrentMonth(
          new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
        );
        break;
      case 'year':
        setCurrentYear((y) => y - 1);
        break;
    }
  }, [view, selectedDate, currentMonth]);

  const handleNext = useCallback(() => {
    switch (view) {
      case 'day': {
        const d = addDays(selectedDate, 1);
        setSelectedDate(d);
        setCurrentMonth(d);
        break;
      }
      case 'week': {
        const d = addDays(selectedDate, 7);
        setSelectedDate(d);
        setCurrentMonth(d);
        break;
      }
      case 'month':
        setCurrentMonth(
          new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
        );
        break;
      case 'year':
        setCurrentYear((y) => y + 1);
        break;
    }
  }, [view, selectedDate, currentMonth]);

  const handleToday = useCallback(() => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
    setCurrentYear(getYear(today));
  }, []);

  const handleViewChange = useCallback(
    (newView: CalendarViewType) => {
      if (newView === 'month') {
        setCurrentMonth(selectedDate);
      } else if (newView === 'year') {
        setCurrentYear(getYear(selectedDate));
      }
      setView(newView);
    },
    [selectedDate],
  );

  // ── Event handlers ──

  const handleEventClick = (item: UnifiedCalendarItem) => {
    setDetailItem(item);
  };

  const handleEditFromDetail = () => {
    if (detailItem?.source === 'calendar_event' && detailItem.calendarEvent) {
      setEditingEvent(detailItem.calendarEvent);
      setDetailItem(null);
    }
  };

  const handleDeleteFromDetail = async () => {
    if (detailItem?.source === 'calendar_event' && detailItem.calendarEvent) {
      const eventId = detailItem.calendarEvent.id;
      setDeletingId(eventId);
      try {
        await deleteEvent.mutateAsync(eventId);
        setDetailItem(null);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleDayZoom = (date: Date) => {
    setSelectedDate(date);
    setView('day');
  };

  const handleMonthZoom = (date: Date) => {
    setCurrentMonth(date);
    setView('month');
  };

  if (isLoading) {
    return (
      <PageContent title="Calendar" showPageHeader>
        <div className="flex-1">
          <Skeleton className="h-full min-h-[500px] w-full rounded-xl" />
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent
      title="Calendar"
      subtitle="Track proposals, deadlines, and events"
      showPageHeader
      headerActions={
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
        >
          <Plus size={16} weight="bold" />
          New Event
        </Button>
      }
    >
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Unified navigation bar with view switcher */}
        <CalendarNavHeader
          title={navTitle}
          view={view}
          onViewChange={handleViewChange}
          onToday={handleToday}
          todayLabel={view === 'year' ? 'This Year' : 'Today'}
          onPrev={handlePrev}
          onNext={handleNext}
        />

        {/* View content */}
        <div className="flex-1 min-h-0">
          {view === 'month' && (
            <CalendarMonthView
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              itemsByDate={itemsByDate}
              onEventClick={handleEventClick}
              onDayZoom={handleDayZoom}
              organizationId={organization?.id || ''}
            />
          )}

          {view === 'week' && (
            <CalendarWeekView
              selectedDate={selectedDate}
              itemsByDate={itemsByDate}
              onEventClick={handleEventClick}
              onDayZoom={handleDayZoom}
              organizationId={organization?.id || ''}
            />
          )}

          {view === 'day' && (
            <CalendarDayView
              date={selectedDate}
              items={selectedDayItems}
              onEditEvent={handleEventClick}
              organizationId={organization?.id || ''}
            />
          )}

          {view === 'year' && (
            <CalendarYearView
              currentYear={currentYear}
              itemsByDate={itemsByDate}
              onDayZoom={handleDayZoom}
              onMonthZoom={handleMonthZoom}
            />
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <CreateEventDialog
        open={showCreateDialog || !!editingEvent}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingEvent(null);
          }
        }}
        organizationId={organization?.id || ''}
        event={editingEvent}
        defaultDate={selectedDate}
      />

      {/* Item Detail Sidebar */}
      <CalendarItemDetailSheet
        item={detailItem}
        open={!!detailItem}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null);
        }}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
        isDeleting={!!deletingId}
      />
    </PageContent>
  );
};

export default Calendar;
