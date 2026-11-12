/**
 * Purchasing panel
 *
 * Splitting one sold job across the manufacturers who actually make it.
 *
 * A thin wrapper over the fan-out planner so that the stage rail has something
 * to open at 'Released'. The planning itself lives in FanOutPanel, which is
 * also reachable from the order deep link.
 */

import { ShoppingCart } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/backoffice';
import { FanOutPanel } from '@/components/features/orders/FanOutPanel';
import { useSalesOrder } from '@/hooks/queries/useSalesOrders';

interface PurchasingPanelProps {
  salesOrderId: string | null;
  onCreateOrder?: () => void;
}

export function PurchasingPanel({ salesOrderId, onCreateOrder }: PurchasingPanelProps) {
  const { data: order } = useSalesOrder(salesOrderId ?? undefined);

  if (!order) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Nothing to purchase yet"
        description="This job has no order, so there are no lines to split across manufacturers."
        action={
          onCreateOrder && <Button onClick={onCreateOrder}>Release to order</Button>
        }
      />
    );
  }

  return <FanOutPanel order={order} />;
}
