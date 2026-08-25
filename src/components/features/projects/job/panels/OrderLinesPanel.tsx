/**
 * Order lines panel
 *
 * What was sold, and how far each line has got.
 *
 * The four quantity columns are the whole point: ordered, received and
 * installed against what was sold. A line where those disagree is a line
 * somebody has to chase, and reading them side by side is faster than opening
 * three screens to compare.
 */

import { useMemo } from 'react';
import { Package } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  DataTable,
  EmptyState,
  StatusChip,
  type DataColumn,
} from '@/components/common/backoffice';
import {
  formatCurrency,
  FULFILLMENT_TYPE_LABELS,
  type FulfillmentType,
} from '@/lib/pricing';
import {
  useOrderLines,
  useOrderFulfillment,
  type OrderLine,
} from '@/hooks/queries/useSalesOrders';
import { cn } from '@/lib/utils';

interface OrderLinesPanelProps {
  salesOrderId: string | null;
  /** Offered when there is nothing to show because nothing has been ordered. */
  onCreateOrder?: () => void;
}

export function OrderLinesPanel({ salesOrderId, onCreateOrder }: OrderLinesPanelProps) {
  const { data: lines = [], isLoading } = useOrderLines(salesOrderId ?? undefined);
  const { data: fulfillment = {} } = useOrderFulfillment(salesOrderId ?? undefined);

  const columns = useMemo<DataColumn<OrderLine>[]>(
    () => [
      {
        key: 'line_number',
        header: '#',
        hideInCard: true,
        className: 'w-10 text-xs text-gray-400 tabular-nums',
        render: line => line.line_number,
      },
      {
        key: 'description',
        header: 'Item',
        primary: true,
        render: line => (
          <>
            <p className="text-gray-900 dark:text-gray-100">{line.description}</p>
            <p className="text-xs font-normal text-gray-500">
              {[line.manufacturer_name, line.model_number, line.area]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </>
        ),
      },
      {
        key: 'route',
        header: 'Route',
        render: line => {
          const route = line.fulfillment_type as FulfillmentType | null;
          // An unrouted line cannot be bought, crewed or billed, so it is the
          // one value in this table that is worth colouring.
          return route ? (
            <span className="text-xs text-gray-600 dark:text-gray-300">
              {FULFILLMENT_TYPE_LABELS[route].label}
            </span>
          ) : (
            <StatusChip tone="warn" size="sm">
              Not routed
            </StatusChip>
          );
        },
      },
      {
        key: 'quantity',
        header: 'Qty',
        align: 'right',
        className: 'tabular-nums',
        render: line => Number(line.quantity),
      },
      {
        key: 'ordered',
        header: 'Ordered',
        align: 'right',
        render: line => {
          const f = fulfillment[line.id];
          const outstanding = f && Number(f.qty_to_order) > 0;
          return (
            <span
              className={cn(
                'tabular-nums',
                outstanding ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'
              )}
            >
              {f ? Number(f.qty_ordered) : 0}
            </span>
          );
        },
      },
      {
        key: 'received',
        header: 'Received',
        align: 'right',
        className: 'tabular-nums text-gray-500',
        render: line => Number(fulfillment[line.id]?.qty_received ?? 0),
      },
      {
        key: 'installed',
        header: 'Installed',
        align: 'right',
        className: 'tabular-nums text-gray-500',
        render: line => Number(fulfillment[line.id]?.qty_installed ?? 0),
      },
      {
        key: 'sell',
        header: 'Sell',
        align: 'right',
        className: 'tabular-nums',
        render: line => formatCurrency(Number(line.sell_price)),
      },
    ],
    [fulfillment]
  );

  return (
    <DataTable
      rows={lines}
      columns={columns}
      getRowId={line => line.id}
      isLoading={isLoading && !!salesOrderId}
      empty={
        <EmptyState
          icon={Package}
          title="Nothing ordered yet"
          description="Release this job to create an order from the won proposal. Its priced lines become order lines you can buy, receive and install."
          action={
            onCreateOrder && <Button onClick={onCreateOrder}>Release to order</Button>
          }
        />
      }
    />
  );
}
