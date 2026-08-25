/**
 * Freight queue
 *
 * Every shipment across every job that somebody has to do something about.
 *
 * The ranking is by what it costs to ignore rather than by date. A pallet the
 * carrier says it delivered and nobody has counted outranks one still in
 * Memphis, because a freight claim window is measured in days and a truck in
 * transit is nobody's problem yet.
 *
 * `hasReceipt` comes from `shipment_progress` rather than being assumed. Guess
 * it wrong and every delivered shipment reads as uncounted, which is how a
 * queue teaches people to stop reading it.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, CheckCircle } from '@phosphor-icons/react';
import {
  DataTable,
  EmptyState,
  StatusChip,
  type DataColumn,
  type Tone,
} from '@/components/common/backoffice';
import {
  describeTracking,
  carrierName,
  ATTENTION_COPY,
  type TrackingAttention,
} from '@/lib/tracking';
import {
  useOpenShipments,
  useShipmentProgressForOrg,
  type Shipment,
} from '@/hooks/queries/useShipments';

/** Worst first. The order is the queue's meaning, so it is stated once here. */
const ATTENTION_RANK: Record<TrackingAttention, number> = {
  exception: 0,
  uncounted: 1,
  late: 2,
  unreachable: 3,
};

const ATTENTION_TONES: Record<TrackingAttention, Tone> = {
  exception: 'danger',
  uncounted: 'danger',
  late: 'warn',
  unreachable: 'neutral',
};

interface FlaggedShipment {
  shipment: Shipment;
  attention: TrackingAttention;
  statusLabel: string;
}

export function FreightQueue({ organizationId }: { organizationId?: string }) {
  const navigate = useNavigate();
  const { data: shipments = [], isLoading } = useOpenShipments(organizationId);
  const { data: progress = {} } = useShipmentProgressForOrg(organizationId);

  const flagged = useMemo<FlaggedShipment[]>(() => {
    const rows: FlaggedShipment[] = [];
    for (const shipment of shipments) {
      const summary = describeTracking(shipment, {
        hasReceipt: Number(progress[shipment.id]?.receipt_count ?? 0) > 0,
      });
      if (!summary.attention) continue;
      rows.push({
        shipment,
        attention: summary.attention,
        statusLabel: summary.label,
      });
    }
    return rows.sort(
      (a, b) => ATTENTION_RANK[a.attention] - ATTENTION_RANK[b.attention]
    );
  }, [shipments, progress]);

  const columns = useMemo<DataColumn<FlaggedShipment>[]>(
    () => [
      {
        key: 'problem',
        header: 'Needs',
        primary: true,
        render: row => (
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone={ATTENTION_TONES[row.attention]} size="sm">
              {ATTENTION_COPY[row.attention].label}
            </StatusChip>
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {row.shipment.tracking_number ??
                row.shipment.pro_number ??
                row.shipment.bill_of_lading ??
                'No tracking number'}
            </span>
          </div>
        ),
      },
      {
        key: 'carrier',
        header: 'Carrier',
        render: row => (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {carrierName(row.shipment.carrier_code, row.shipment.carrier_name)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Carrier says',
        render: row => (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {row.statusLabel}
          </span>
        ),
      },
      {
        key: 'eta',
        header: 'ETA',
        render: row =>
          row.shipment.estimated_delivery_date ? (
            <span className="text-sm tabular-nums text-gray-600 dark:text-gray-300">
              {row.shipment.estimated_delivery_date}
            </span>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          ),
      },
      {
        key: 'why',
        header: 'Why',
        hideInTable: true,
        cardLabel: 'Why',
        render: row => (
          <span className="text-xs text-gray-500">
            {ATTENTION_COPY[row.attention].detail}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      rows={flagged}
      columns={columns}
      getRowId={row => row.shipment.id}
      isLoading={isLoading}
      onRowClick={row =>
        row.shipment.sales_order_id &&
        navigate(`/orders/${row.shipment.sales_order_id}`)
      }
      empty={
        <EmptyState
          icon={shipments.length === 0 ? Truck : CheckCircle}
          title={
            shipments.length === 0
              ? 'Nothing in transit'
              : 'Every shipment is behaving'
          }
          description={
            shipments.length === 0
              ? 'No open shipments have been recorded against any job.'
              : `${shipments.length} shipment${shipments.length === 1 ? '' : 's'} in the air, none of them flagged.`
          }
        />
      }
    />
  );
}
