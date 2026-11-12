/**
 * Tracking Timeline
 *
 * The carrier's scan history, newest first, exactly as reported.
 *
 * Verbatim on purpose. "Delayed due to weather in Memphis" is what a customer
 * actually needs to hear, and no normalized status will ever carry it. This is
 * also the record a freight claim is argued from, so nothing here is
 * summarized, deduplicated for tidiness, or reworded.
 */

import { CircleNotch, MapPin, Package } from '@phosphor-icons/react';
import { useTrackingEvents } from '@/hooks/queries/useShipments';
import { cn } from '@/lib/utils';

interface TrackingTimelineProps {
  shipmentId: string;
  /** Manual carriers have no scans, and an empty list needs different words. */
  isManual?: boolean;
}

const formatWhen = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export function TrackingTimeline({ shipmentId, isManual }: TrackingTimelineProps) {
  const { data: events = [], isLoading } = useTrackingEvents(shipmentId);

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 px-3 py-4 text-xs text-gray-500">
        <CircleNotch className="w-3.5 h-3.5 animate-spin" />
        Loading tracking history…
      </p>
    );
  }

  if (events.length === 0) {
    return (
      <p className="px-3 py-4 text-xs text-gray-500">
        {isManual
          ? 'This carrier reports no scans. Mark it delivered when it lands, then count it in.'
          : 'No carrier scans yet. The first one usually lands when the freight is picked up.'}
      </p>
    );
  }

  return (
    <ol className="space-y-0">
      {events.map((event, index) => (
        <li
          key={event.id}
          className={cn(
            'flex gap-3 px-3 py-2.5',
            index > 0 && 'border-t border-gray-100 dark:border-gray-700/50'
          )}
        >
          <div className="flex flex-col items-center pt-1">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                // The newest scan is where the freight is now. Everything above
                // it is history.
                index === 0
                  ? 'bg-blue-500 ring-4 ring-blue-500/15'
                  : 'bg-gray-300 dark:bg-gray-600'
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'text-sm',
                index === 0
                  ? 'text-gray-900 dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              {event.message ?? event.status ?? 'Scan recorded'}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
              <span className="tabular-nums">{formatWhen(event.occurred_at)}</span>
              {event.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {event.location}
                </span>
              )}
              {event.status && (
                <span className="inline-flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {event.status}
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default TrackingTimeline;
