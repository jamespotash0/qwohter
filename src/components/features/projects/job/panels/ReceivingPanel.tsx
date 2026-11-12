/**
 * Receiving panel
 *
 * What is still owed on this job, from the dock's point of view.
 *
 * Deliberately narrower than the list of manufacturer orders: an order that
 * has been received in full is not the receiving clerk's problem, so it drops
 * off. What is left is what somebody is expected to check against a packing
 * slip, which is why the counts are stated as a shortfall rather than a total.
 *
 * Damage leads, because a damage claim has a window that closes.
 */

import { Package, CheckCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Callout, EmptyState, StatusChip } from '@/components/common/backoffice';
import { useVendorPOs, type VendorPO } from '@/hooks/queries/useSalesOrders';
import { usePOProgress } from '@/hooks/queries/useReceipts';
import { cn } from '@/lib/utils';
import type { JobActions } from '../jobModel';

interface ReceivingPanelProps {
  salesOrderId: string | null;
  /** From `project_progress`, so the damage warning matches the header. */
  damagedCount?: number;
  actions: Pick<JobActions, 'onReceive'>;
}

export function ReceivingPanel({
  salesOrderId,
  damagedCount = 0,
  actions,
}: ReceivingPanelProps) {
  const { data: pos = [] } = useVendorPOs(salesOrderId ?? undefined);
  const { data: poProgress = {} } = usePOProgress(salesOrderId ?? undefined);

  const outstanding = pos.filter((po: VendorPO) => {
    const progress = poProgress[po.id];
    const ordered = Number(progress?.qty_ordered ?? 0);
    const received = Number(progress?.qty_received ?? 0);
    return ordered === 0 || received < ordered;
  });

  return (
    <div className="space-y-3">
      {damagedCount > 0 && (
        <Callout tone="danger" title="Damaged product on this job">
          {damagedCount} unit{damagedCount === 1 ? '' : 's'} arrived damaged and are
          still owed. A freight claim has to be filed inside the carrier's window.
        </Callout>
      )}

      {outstanding.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title={pos.length === 0 ? 'Nothing expected' : 'Everything has been received'}
          description={
            pos.length === 0
              ? 'Nothing has been placed with a manufacturer, so nothing is on its way.'
              : 'Every manufacturer order on this job has been received in full.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          {outstanding.map((po: VendorPO, index: number) => {
            const progress = poProgress[po.id];
            const ordered = Number(progress?.qty_ordered ?? 0);
            const received = Number(progress?.qty_received ?? 0);
            const short = Math.max(0, ordered - received);

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
                      {po.manufacturer_name}
                    </p>
                    <span className="text-sm text-gray-500">
                      {po.po_number ?? 'No order number'}
                    </span>
                    {short > 0 && (
                      <StatusChip tone="warn" size="sm">
                        {short} outstanding
                      </StatusChip>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
                    {ordered > 0 && (
                      <span>
                        {received} of {ordered} received
                      </span>
                    )}
                    {po.acknowledged_ship_date && (
                      <span>Confirmed to ship {po.acknowledged_ship_date}</span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() => actions.onReceive(po.id, null)}
                >
                  <Package className="mr-1.5 h-4 w-4" />
                  Receive
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
