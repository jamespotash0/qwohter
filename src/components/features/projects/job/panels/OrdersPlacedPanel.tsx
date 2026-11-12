/**
 * Orders placed panel
 *
 * The orders that went out to manufacturers, and what came back.
 *
 * Placement happens in the manufacturer's own portal, so these records are a
 * landing zone rather than a document this application sent — the portal's
 * order number, who it went to, and the acknowledgment. The button that
 * matters is "Record ack": until somebody does that, the cost this job is
 * carrying is the one the quote guessed at.
 */

import { Truck, Package, Storefront } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  EmptyState,
  StatusChip,
  toneFor,
  ORDER_STATUS_TONES,
} from '@/components/common/backoffice';
import { useVendorPOs, type VendorPO } from '@/hooks/queries/useSalesOrders';
import { usePOProgress } from '@/hooks/queries/useReceipts';
import { cn } from '@/lib/utils';
import type { JobActions } from '../jobModel';

interface OrdersPlacedPanelProps {
  salesOrderId: string | null;
  actions: Pick<JobActions, 'onRecordAck' | 'onShip' | 'onReceive'>;
  /** Sends the reader to the stage where orders get placed. */
  onGoToPurchasing?: () => void;
}

export function OrdersPlacedPanel({
  salesOrderId,
  actions,
  onGoToPurchasing,
}: OrdersPlacedPanelProps) {
  const { data: pos = [] } = useVendorPOs(salesOrderId ?? undefined);
  const { data: poProgress = {} } = usePOProgress(salesOrderId ?? undefined);

  if (pos.length === 0) {
    return (
      <EmptyState
        icon={Storefront}
        title="Nothing placed yet"
        description="Split this order across its manufacturers, then record the order number each portal gives back."
        action={
          onGoToPurchasing && (
            <Button variant="outline" onClick={onGoToPurchasing}>
              Go to purchasing
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      {pos.map((po: VendorPO, index: number) => {
        const progress = poProgress[po.id];
        const status = progress?.derived_status ?? po.status;
        const received = Number(progress?.qty_received ?? 0);
        const ordered = Number(progress?.qty_ordered ?? 0);

        return (
          <div
            key={po.id}
            className={cn(
              'flex flex-wrap items-start gap-3 px-4 py-3 sm:items-center',
              index > 0 && 'border-t border-gray-100 dark:border-gray-700/50'
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {po.po_number ?? 'No order number yet'}
                </p>
                <span className="text-sm text-gray-500">{po.manufacturer_name}</span>
                <StatusChip tone={toneFor(ORDER_STATUS_TONES, status)} size="sm">
                  {status}
                </StatusChip>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
                {received > 0 && (
                  <span>
                    {received} of {ordered} received
                  </span>
                )}
                {po.placed_at && (
                  <span>Placed {new Date(po.placed_at).toLocaleDateString()}</span>
                )}
                {po.requested_ship_date && (
                  <span>Requested {po.requested_ship_date}</span>
                )}
                {po.acknowledged_ship_date && (
                  <span>Confirmed {po.acknowledged_ship_date}</span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                variant={po.acknowledged_at ? 'ghost' : 'default'}
                size="sm"
                onClick={() => actions.onRecordAck(po.id)}
              >
                {po.acknowledged_at ? 'Update ack' : 'Record ack'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => actions.onShip(po.id)}>
                <Truck className="mr-1.5 h-4 w-4" />
                Ship
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => actions.onReceive(po.id, null)}
              >
                <Package className="mr-1.5 h-4 w-4" />
                Receive
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
