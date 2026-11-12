/**
 * Schedule
 *
 * A week of site work, by crew.
 *
 * This is the screen that decides whether an install day happens. A dealer's
 * most expensive routine mistake is sending a crew to a building that is not
 * ready — no dock booked, no elevator, an expired certificate of insurance —
 * and the second most expensive is sending two crews to the same place because
 * a spreadsheet was out of date.
 *
 * The second one is impossible here rather than discouraged: crews are held
 * against overlapping bookings by a database exclusion constraint, so the
 * scheduling UI cannot create one even if it tries.
 *
 * Site access is shown on the card, not behind a click. Dock hours and COI
 * requirements are the whole reason a crew gets turned away at the door, and a
 * detail a dispatcher has to go looking for is one they will not check.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CaretLeft,
  CaretRight,
  Users,
  MapPin,
  Warning,
  CalendarBlank,
} from '@phosphor-icons/react';
import { PageContent } from '@/components/common/layout';
import { Button } from '@/components/ui/button';
import { useUser } from '@/auth';
import { useCurrentOrganization } from '@/hooks/queries';
import { useSchedule, useCrews, type ScheduledWorkOrder } from '@/hooks/queries/useWorkOrders';
import {
  EmptyState,
  TONE_SURFACE,
  toneFor,
  WORK_ORDER_STATUS_TONES,
} from '@/components/common/backoffice';
import { cn } from '@/lib/utils';

/** Monday of the week containing `date`. Weeks start Monday on a job site. */
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SchedulePage() {
  const user = useUser();
  const navigate = useNavigate();
  const { organization } = useCurrentOrganization(user?.id ?? '');
  const organizationId = organization?.id;

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart]
  );

  const from = iso(days[0]!);
  // Exclusive upper bound: the day after the last day shown.
  const toExclusive = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return iso(d);
  }, [weekStart]);

  const { data: scheduled = [], isLoading } = useSchedule(organizationId, from, toExclusive);
  const { data: crews = [] } = useCrews(organizationId);

  /**
   * Work grouped by crew, then by day.
   *
   * Subcontracted work has no crew_id, so it gets its own lane rather than
   * being dropped — it still occupies a day on site and still needs the dock.
   */
  const lanes = useMemo(() => {
    const byCrew = new Map<string, ScheduledWorkOrder[]>();
    for (const wo of scheduled) {
      const key = (wo.crew_id as string) ?? '__subcontracted__';
      const list = byCrew.get(key) ?? [];
      list.push(wo);
      byCrew.set(key, list);
    }

    const rows = crews.map(crew => ({
      key: crew.id,
      label: crew.name,
      sub: `${crew.size} ${crew.size === 1 ? 'person' : 'people'}`,
      items: byCrew.get(crew.id) ?? [],
    }));

    const subcontracted = byCrew.get('__subcontracted__') ?? [];
    if (subcontracted.length > 0) {
      rows.push({
        key: '__subcontracted__',
        label: 'Subcontracted',
        sub: 'Not your crews',
        items: subcontracted,
      });
    }
    return rows;
  }, [scheduled, crews]);

  const shiftWeek = (weeks: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + weeks * 7);
    setWeekStart(d);
  };

  const todayISO = iso(new Date());
  const totalScheduled = scheduled.length;

  return (
    <PageContent
      showPageHeader
      title="Schedule"
      subtitle="Site work by crew. A crew cannot be booked twice — the database refuses it."
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => shiftWeek(-1)}>
            <CaretLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            This week
          </Button>
          <Button variant="outline" size="sm" onClick={() => shiftWeek(1)}>
            <CaretRight className="w-4 h-4" />
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {days[0]!.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
            {' – '}
            {days[6]!.toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <p className="text-xs text-gray-500">
            {totalScheduled} scheduled
          </p>
        </div>

        {crews.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No crews yet"
            description="Add your install crews under Settings &rsaquo; Crews before scheduling."
          />
        ) : (
          <>
          {/* A seven-by-n grid cannot be made to work on a phone, and an
              install coordinator standing on a site is exactly who needs this
              screen. Same week, same data, read down instead of across. */}
          <div className="space-y-3 md:hidden">
            {days.map(day => {
              const key = iso(day);
              const dayItems = lanes.flatMap(lane =>
                lane.items
                  .filter(
                    wo =>
                      wo.scheduled_start &&
                      iso(new Date(wo.scheduled_start as string)) === key
                  )
                  .map(wo => ({ wo, laneLabel: lane.label }))
              );
              return (
                <div key={key}>
                  <p
                    className={cn(
                      'mb-1.5 text-xs font-medium uppercase tracking-wide',
                      key === todayISO
                        ? 'text-[#D9501B] dark:text-orange-400'
                        : 'text-gray-500'
                    )}
                  >
                    {DAY_LABELS[(day.getDay() + 6) % 7]}{' '}
                    <span className="tabular-nums">{day.getDate()}</span>
                  </p>
                  {dayItems.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-400 dark:border-gray-700">
                      Nothing scheduled
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {dayItems.map(({ wo, laneLabel }) => (
                        <div key={wo.work_order_id as string}>
                          <p className="mb-0.5 text-[11px] text-gray-500">
                            {laneLabel}
                          </p>
                          <WorkOrderCard
                            workOrder={wo}
                            onOpen={() =>
                              wo.project_id && navigate(`/projects/${wo.project_id}`)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 md:block">
            <table className="w-full min-w-[1040px] table-fixed border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th className="w-[160px] px-3 py-2.5 text-left text-xs uppercase tracking-wide text-gray-500">
                    Crew
                  </th>
                  {days.map(day => {
                    const key = iso(day);
                    const isToday = key === todayISO;
                    return (
                      <th
                        key={key}
                        className={cn(
                          'px-2 py-2.5 text-left text-xs font-medium',
                          isToday
                            ? 'text-[#D9501B] dark:text-orange-400'
                            : 'text-gray-500'
                        )}
                      >
                        <span className="uppercase tracking-wide">
                          {DAY_LABELS[(day.getDay() + 6) % 7]}
                        </span>{' '}
                        <span className="tabular-nums">{day.getDate()}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-sm text-gray-500">
                      Loading…
                    </td>
                  </tr>
                ) : (
                  lanes.map(lane => (
                    <tr
                      key={lane.key}
                      className="border-t border-gray-100 dark:border-gray-700/50 align-top"
                    >
                      <td className="px-3 py-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {lane.label}
                        </p>
                        <p className="text-xs text-gray-500">{lane.sub}</p>
                      </td>
                      {days.map(day => {
                        const key = iso(day);
                        const items = lane.items.filter(
                          wo =>
                            wo.scheduled_start &&
                            iso(new Date(wo.scheduled_start as string)) === key
                        );
                        return (
                          <td
                            key={key}
                            className={cn(
                              'px-1.5 py-2 align-top',
                              key === todayISO && 'bg-orange-50/40 dark:bg-orange-900/5'
                            )}
                          >
                            <div className="space-y-1.5">
                              {items.map(wo => (
                                <WorkOrderCard
                                  key={wo.work_order_id as string}
                                  workOrder={wo}
                                  onOpen={() =>
                                    wo.project_id &&
                                    navigate(`/projects/${wo.project_id}`)
                                  }
                                />
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </>
        )}

        {!isLoading && crews.length > 0 && totalScheduled === 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <CalendarBlank className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <p className="text-sm text-gray-500">
              Nothing scheduled this week. Work orders are created from a
              project&rsquo;s installation lines.
            </p>
          </div>
        )}
      </div>
    </PageContent>
  );
}

function WorkOrderCard({
  workOrder: wo,
  onOpen,
}: {
  workOrder: ScheduledWorkOrder;
  onOpen: () => void;
}) {
  const hours = wo.scheduled_hours === null ? null : Number(wo.scheduled_hours);
  // Either part may be null or blank, so filter rather than coalesce.
  const location = [wo.site_city, wo.site_state].filter(Boolean).join(', ');
  const needsAccessInfo = !wo.access_notes;

  return (
    <button
      onClick={onOpen}
      className={cn(
        'w-full rounded-md border p-2 text-left transition-shadow hover:shadow-sm',
        TONE_SURFACE[toneFor(WORK_ORDER_STATUS_TONES, wo.status as string)]
      )}
    >
      <p className="truncate text-xs font-medium text-gray-900 dark:text-gray-100">
        {wo.site_name ?? wo.work_order_number ?? 'Work order'}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-gray-600 dark:text-gray-400">
        {wo.work_type}
        {hours !== null ? ` · ${hours}h` : ''}
      </p>
      {location && (
        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-gray-500">
          <MapPin className="h-3 w-3 shrink-0" />
          {location}
        </p>
      )}
      {/* The thing that turns a crew away at the door. */}
      {needsAccessInfo ? (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
          <Warning className="h-3 w-3 shrink-0" />
          No access notes
        </p>
      ) : (
        <p
          className="mt-1 line-clamp-2 text-[11px] leading-snug text-gray-500"
          title={wo.access_notes as string}
        >
          {wo.access_notes}
        </p>
      )}
    </button>
  );
}
