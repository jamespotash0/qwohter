/**
 * Damaged queue
 *
 * Product that arrived broken, across every job.
 *
 * This is money the dealer has already paid for and cannot install, and it
 * stops being recoverable when the carrier's claim window closes — which is
 * why it gets a queue of its own rather than a line in a report somebody runs
 * at month end.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from '@phosphor-icons/react';
import {
  DataTable,
  EmptyState,
  StatusChip,
  type DataColumn,
} from '@/components/common/backoffice';
import { useDamagedLines } from '@/hooks/queries/useReceipts';

type DamagedRow = ReturnType<typeof useDamagedLines>['data'] extends
  | Array<infer T>
  | undefined
  ? T
  : never;

export function DamagedQueue({ organizationId }: { organizationId?: string }) {
  const navigate = useNavigate();
  const { data: lines = [], isLoading } = useDamagedLines(organizationId);

  const columns = useMemo<DataColumn<DamagedRow>[]>(
    () => [
      {
        key: 'description',
        header: 'Item',
        primary: true,
        render: line => (
          <span className="text-gray-900 dark:text-gray-100">
            {line.description ?? 'Unnamed line'}
          </span>
        ),
      },
      {
        key: 'damaged',
        header: 'Damaged',
        align: 'right',
        render: line => (
          <StatusChip tone="danger" size="sm">
            {Number(line.quantity_damaged ?? 0)}
          </StatusChip>
        ),
      },
      {
        key: 'received',
        header: 'Received',
        align: 'right',
        className: 'tabular-nums text-gray-500',
        render: line => Number(line.quantity_received ?? 0),
      },
      {
        key: 'when',
        header: 'Received on',
        render: line => (
          <span className="text-sm tabular-nums text-gray-600 dark:text-gray-300">
            {line.receipts?.received_at
              ? new Date(line.receipts.received_at).toLocaleDateString()
              : '—'}
          </span>
        ),
      },
      {
        key: 'notes',
        header: 'What was wrong',
        render: line => (
          <span className="text-xs text-gray-500">{line.damage_notes ?? '—'}</span>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      rows={lines}
      columns={columns}
      getRowId={line => line.id}
      isLoading={isLoading}
      onRowClick={line =>
        line.receipts?.sales_order_id &&
        navigate(`/orders/${line.receipts.sales_order_id}`)
      }
      empty={
        <EmptyState
          icon={CheckCircle}
          title="Nothing arrived damaged"
          description="No receipt across any job has recorded damage."
        />
      }
    />
  );
}
