/**
 * Shipments Panel
 *
 * The weeks between "the factory acknowledged it" and "it is on our dock" —
 * the part of a job a dealer currently tracks by phoning freight lines.
 *
 * Sorted by what needs a person, not by date. A pallet the carrier flagged and
 * a pallet delivered that nobody has counted both outrank one that is quietly
 * in transit, because both have a clock running on them: freight claim windows
 * are measured in days and start at delivery.
 */

import { useMemo, useState } from 'react';
import {
  ArrowClockwise,
  ArrowUUpLeft,
  CaretDown,
  CaretRight,
  Package,
  Truck,
  CheckCircle,
  Warning,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  useShipments,
  useShipmentProgress,
  useRefreshTracking,
  useMarkManualDelivery,
} from '@/hooks/queries/useShipments';
import {
  ATTENTION_COPY,
  carrierName,
  describeLastChecked,
  describeTracking,
} from '@/lib/tracking';
import { TrackingTimeline } from './TrackingTimeline';
import { cn } from '@/lib/utils';

interface ShipmentsPanelProps {
  salesOrderId: string;
  /** Opens the receiving dialog scoped to one shipment. */
  onReceive?: (shipmentId: string, vendorPOId: string | null) => void;
  onRecordShipment?: () => void;
}

/** Attention first, then soonest expected. */
const ATTENTION_RANK: Record<string, number> = {
  exception: 0,
  uncounted: 1,
  late: 2,
  unreachable: 3,
};

export function ShipmentsPanel({
  salesOrderId,
  onReceive,
  onRecordShipment,
}: ShipmentsPanelProps) {
  const { data: shipments = [], isLoading } = useShipments(salesOrderId);
  const { data: progress = {} } = useShipmentProgress(salesOrderId);
  const refresh = useRefreshTracking();
  const markDelivered = useMarkManualDelivery();

  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(() => {
    const described = shipments.map(shipment => ({
      shipment,
      progress: progress[shipment.id],
      summary: describeTracking(shipment, {
        // The single most valuable thing this panel reports, and it cannot be
        // derived from carrier data alone.
        hasReceipt: (progress[shipment.id]?.receipt_count ?? 0) > 0,
      }),
    }));

    return described.sort((a, b) => {
      const rankA = a.summary.attention ? ATTENTION_RANK[a.summary.attention] : 9;
      const rankB = b.summary.attention ? ATTENTION_RANK[b.summary.attention] : 9;
      if (rankA !== rankB) return rankA - rankB;

      const etaA = a.shipment.estimated_delivery_date ?? '9999-12-31';
      const etaB = b.shipment.estimated_delivery_date ?? '9999-12-31';
      return etaA.localeCompare(etaB);
    });
  }, [shipments, progress]);

  if (isLoading) {
    return <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />;
  }

  if (shipments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-12 text-center">
        <Truck className="w-8 h-8 mx-auto mb-3 text-gray-300" />
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Nothing in transit
        </p>
        <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
          When a manufacturer sends a PRO or tracking number, record it here and
          the carrier reports the rest — where it is, when it is due, and the
          moment it lands.
        </p>
        {onRecordShipment && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onRecordShipment}>
            Record a shipment
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {rows.map(({ shipment, progress: p, summary }, index) => {
        const isOpen = expanded === shipment.id;
        const isManual = shipment.tracking_provider === 'manual';
        const isDelivered = shipment.tracking_status === 'delivered';
        // The PRO is the freight identity and the one a dispatcher will ask
        // for; the parcel number is the fallback.
        const number = shipment.pro_number ?? shipment.tracking_number;

        return (
          <div
            key={shipment.id}
            className={cn(index > 0 && 'border-t border-gray-100 dark:border-gray-700/50')}
          >
            <div className="flex items-start gap-3 px-4 py-3">
              <button
                onClick={() => setExpanded(isOpen ? null : shipment.id)}
                className="mt-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label={isOpen ? 'Hide tracking history' : 'Show tracking history'}
              >
                {isOpen ? <CaretDown className="w-4 h-4" /> : <CaretRight className="w-4 h-4" />}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {carrierName(shipment.carrier_code, shipment.carrier_name)}
                  </span>
                  {number && (
                    <span className="text-xs tabular-nums text-gray-500">{number}</span>
                  )}
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                      summary.className
                    )}
                  >
                    {summary.label}
                  </span>
                </div>

                {summary.detail && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {summary.detail}
                  </p>
                )}

                <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
                  {shipment.ship_date && <span>Shipped {shipment.ship_date}</span>}
                  {shipment.estimated_delivery_date && (
                    <span>Due {shipment.estimated_delivery_date}</span>
                  )}
                  {shipment.tracking_location && <span>{shipment.tracking_location}</span>}
                  {Number(p?.qty_shipped ?? 0) > 0 && (
                    <span>
                      {Number(p?.qty_received ?? 0)} of {Number(p?.qty_shipped)} counted
                    </span>
                  )}
                  {!isManual && (
                    <span className={cn(summary.isStale && 'text-amber-600 dark:text-amber-400')}>
                      {describeLastChecked(shipment.last_checked_at)}
                    </span>
                  )}
                </div>

                {summary.attention && (
                  <div
                    className={cn(
                      'mt-2 flex items-start gap-2 rounded-lg px-3 py-2 text-xs',
                      summary.attention === 'exception' || summary.attention === 'uncounted'
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300'
                    )}
                  >
                    <Warning className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <p>
                      <span className="font-medium">
                        {ATTENTION_COPY[summary.attention].label}
                      </span>{' '}
                      — {ATTENTION_COPY[summary.attention].detail}
                      {summary.attention === 'unreachable' && shipment.tracking_error && (
                        <span className="block mt-0.5 opacity-80">
                          {shipment.tracking_error}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {!isManual && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refresh.mutate({ shipmentId: shipment.id })}
                    disabled={refresh.isPending}
                    title="Ask the carrier now"
                  >
                    <ArrowClockwise
                      className={cn('w-4 h-4', refresh.isPending && 'animate-spin')}
                    />
                  </Button>
                )}
                {/*
                  A carrier with no API is advanced by the person who dispatched
                  it. Only ever the one terminal assertion -- an own truck has no
                  intermediate status worth keeping current -- plus an undo,
                  because this is a button a thumb finds by accident.
                */}
                {isManual && !isDelivered && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markDelivered.mutate({ shipmentId: shipment.id })}
                    disabled={markDelivered.isPending}
                    title="Record that this arrived"
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    Delivered
                  </Button>
                )}
                {isManual && isDelivered && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      markDelivered.mutate({ shipmentId: shipment.id, deliveredAt: null })
                    }
                    disabled={markDelivered.isPending}
                    title="It has not arrived after all"
                  >
                    <ArrowUUpLeft className="w-4 h-4" />
                  </Button>
                )}
                {onReceive && Number(p?.qty_uncounted ?? 1) > 0 && (
                  <Button
                    variant={summary.attention === 'uncounted' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onReceive(shipment.id, shipment.vendor_po_id)}
                  >
                    <Package className="w-4 h-4 mr-1.5" />
                    Receive
                  </Button>
                )}
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/60 dark:bg-gray-800/30">
                <TrackingTimeline shipmentId={shipment.id} isManual={isManual} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ShipmentsPanel;
