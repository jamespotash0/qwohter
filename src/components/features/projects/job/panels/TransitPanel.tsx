/**
 * Transit panel
 *
 * Where the freight is between the factory and the dock.
 *
 * The gap this covers is the one nobody owns: a manufacturer has acknowledged
 * a ship date, the product has left, and until it arrives the only person who
 * knows anything is a carrier. Recording the shipment is what turns that into
 * a date the install schedule can be built on.
 */

import { Truck } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { ShipmentsPanel } from '@/components/features/orders/ShipmentsPanel';
import { EmptyState } from '@/components/common/backoffice';
import type { JobActions } from '../jobModel';

interface TransitPanelProps {
  salesOrderId: string | null;
  actions: Pick<JobActions, 'onShip' | 'onReceive'>;
}

export function TransitPanel({ salesOrderId, actions }: TransitPanelProps) {
  if (!salesOrderId) {
    return (
      <EmptyState
        icon={Truck}
        title="Nothing in transit"
        description="Nothing has been ordered on this job, so there is no freight to track."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => actions.onShip(null)}>
          <Truck className="mr-1.5 h-4 w-4" />
          Record shipment
        </Button>
      </div>
      <ShipmentsPanel
        salesOrderId={salesOrderId}
        onRecordShipment={() => actions.onShip(null)}
        onReceive={(shipmentId, vendorPOId) => actions.onReceive(vendorPOId, shipmentId)}
      />
    </div>
  );
}
