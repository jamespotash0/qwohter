/**
 * Calendar Page
 *
 * Unified calendar with Day / Week / Month / Year views.
 * Shows proposals, tasks, reminders, and custom events.
 */

import { useState, useMemo } from 'react';
import { format, isSameDay, getYear } from 'date-fns';
import { Plus } from '@phosphor-icons/react';
import { PageContent } from '@/components/common/layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/auth';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { useCalendarItems } from '@/hooks/queries/useCalendarEvents';
import { CalendarMonthView } from '@/components/features/calendar/CalendarMonthView';
import { CalendarWeekView } from '@/components/features/calendar/CalendarWeekView';
import { CalendarDayView } from '@/components/features/calendar/CalendarDayView';
import { CalendarYearView } from '@/components/features/calendar/CalendarYearView';
import { CreateEventDialog } from '@/components/features/calendar/CreateEventDialog';
import { CalendarItemDetailSheet } from '@/components/features/calendar/CalendarItemDetailSheet';
import { cn } from '@/lib/utils';
import type { CalendarEvent, UnifiedCalendarItem } from '@/lib/types/calendarEvents';

type CalendarViewType = 'day' | 'week' | 'month' | 'year';
const VIEW_OPTIONS: { value: CalendarViewType; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

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

  const handleEventClick = (item: UnifiedCalendarItem) => {
    setDetailItem(item);
  };

  const handleEditFromDetail = () => {
    if (detailItem?.source === 'calendar_event' && detailItem.calendarEvent) {
      setEditingEvent(detailItem.calendarEvent);
      setDetailItem(null);
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
        <div className="flex items-center gap-3">
          {/* View switcher */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setView(opt.value)}
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

          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
          >
            <Plus size={16} weight="bold" />
            New Event
          </Button>
        </div>
      }
    >
      <div className="flex-1 min-h-0">
        {view === 'month' && (
          <CalendarMonthView
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            itemsByDate={itemsByDate}
            isLoading={isLoading}
            onEventClick={handleEventClick}
            onDayZoom={handleDayZoom}
            organizationId={organization?.id || ''}
          />
        )}

        {view === 'week' && (
          <CalendarWeekView
            selectedDate={selectedDate}
            onDateChange={(date) => {
              setSelectedDate(date);
              setCurrentMonth(date);
            }}
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
            onBack={() => setView('month')}
            onEditEvent={handleEventClick}
            organizationId={organization?.id || ''}
          />
        )}

        {view === 'year' && (
          <CalendarYearView
            currentYear={currentYear}
            onYearChange={setCurrentYear}
            itemsByDate={itemsByDate}
            onDayZoom={handleDayZoom}
            onMonthZoom={handleMonthZoom}
          />
        )}
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
      />
    </PageContent>
  );
};

export default Calendar;
