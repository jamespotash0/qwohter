/**
 * Today
 *
 * What needs a person, across every job.
 *
 * The back office used to expose its stages as sidebar items — Orders,
 * Acknowledgments — which meant finding work started with guessing which noun
 * it was filed under. A job's stages belong to the job; work that spans jobs
 * belongs here. Those are different questions and this page answers the second
 * one.
 *
 * Ordered by what it costs to ignore, not by table. Damage and cost variance
 * are money already moving; acknowledgments are money about to; freight is a
 * date the install schedule depends on; billing is cash sitting uninvoiced.
 */

import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ClipboardText,
  CurrencyDollar,
  Truck,
  WarningOctagon,
  Receipt,
  TrendDown,
} from '@phosphor-icons/react';
import { PageContent } from '@/components/common/layout';
import { StatusChip, asJobStage, type Tone } from '@/components/common/backoffice';
import { useUser } from '@/auth';
import { useCurrentOrganization } from '@/hooks/queries';
import { useVarianceQueue, useRateDrift } from '@/hooks/queries/useVarianceQueue';
import { useOpenShipments, useShipmentProgressForOrg } from '@/hooks/queries/useShipments';
import { useDamagedLines } from '@/hooks/queries/useReceipts';
import { useAllProjectProgress } from '@/hooks/queries/useProjectHub';
import { describeTracking } from '@/lib/tracking';
import { VarianceTable } from '@/components/features/variance/VarianceTable';
import { RateDriftPanel } from '@/components/features/variance/RateDriftPanel';
import { FreightQueue } from '@/components/features/today/FreightQueue';
import { DamagedQueue } from '@/components/features/today/DamagedQueue';
import { ReadyToBillQueue } from '@/components/features/today/ReadyToBillQueue';
import { cn } from '@/lib/utils';

const SEGMENTS = [
  { key: 'damaged', label: 'Damaged', icon: WarningOctagon, tone: 'danger' as Tone },
  { key: 'variance', label: 'Cost variance', icon: CurrencyDollar, tone: 'danger' as Tone },
  { key: 'acks', label: 'Acknowledgments', icon: ClipboardText, tone: 'warn' as Tone },
  { key: 'freight', label: 'Freight', icon: Truck, tone: 'warn' as Tone },
  { key: 'billing', label: 'Ready to bill', icon: Receipt, tone: 'success' as Tone },
  { key: 'drift', label: 'Rate drift', icon: TrendDown, tone: 'neutral' as Tone },
] as const;

type SegmentKey = (typeof SEGMENTS)[number]['key'];

export default function TodayPage() {
  const navigate = useNavigate();
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id ?? '');
  const organizationId = organization?.id;

  const [searchParams, setSearchParams] = useSearchParams();
  const param = searchParams.get('q');
  const segment: SegmentKey = SEGMENTS.some(s => s.key === param)
    ? (param as SegmentKey)
    : 'damaged';

  const { lines: varianceLines, isLoading: varianceLoading } =
    useVarianceQueue(organizationId);
  const { data: shipments = [] } = useOpenShipments(organizationId);
  const { data: shipmentProgress = {} } = useShipmentProgressForOrg(organizationId);
  const { data: damagedLines = [] } = useDamagedLines(organizationId);
  const { data: progressById = {} } = useAllProjectProgress(organizationId);
  const { drift } = useRateDrift(organizationId);

  // Both acknowledgment views read the same queue; only the filter differs.
  // Splitting the fetch would let the two counts drift apart.
  const awaitingAck = useMemo(
    () => varianceLines.filter(l => l.variance_status === 'awaiting_ack'),
    [varianceLines]
  );
  const varianceOnly = useMemo(
    () => varianceLines.filter(l => l.variance_status !== 'awaiting_ack'),
    [varianceLines]
  );

  const flaggedFreight = useMemo(
    () =>
      shipments.filter(
        shipment =>
          describeTracking(shipment, {
            hasReceipt: Number(shipmentProgress[shipment.id]?.receipt_count ?? 0) > 0,
          }).attention !== null
      ).length,
    [shipments, shipmentProgress]
  );

  const readyToBill = useMemo(
    () =>
      Object.values(progressById).filter(
        p => asJobStage(p.stage as string | null) === 'Ready to bill'
      ).length,
    [progressById]
  );

  const counts: Record<SegmentKey, number> = {
    damaged: damagedLines.length,
    variance: varianceOnly.length,
    acks: awaitingAck.length,
    freight: flaggedFreight,
    billing: readyToBill,
    drift: drift.length,
  };

  const total = counts.damaged + counts.variance + counts.acks + counts.freight;

  return (
    <PageContent
      showPageHeader
      title="Today"
      subtitle={
        total === 0
          ? 'Nothing across any job needs a person right now.'
          : `${total} thing${total === 1 ? '' : 's'} across your jobs need a person.`
      }
    >
      <div className="space-y-4">
        {/* The strip is the navigation and the summary at once — a count that
            is only visible after you click into a tab is a count nobody sees. */}
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex min-w-max items-stretch gap-2">
            {SEGMENTS.map(item => {
              const Icon = item.icon;
              const count = counts[item.key];
              const isActive = segment === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set('q', item.key);
                    setSearchParams(next, { replace: true });
                  }}
                  className={cn(
                    'flex min-w-[132px] flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors',
                    isActive
                      ? 'border-coral bg-coral/5 dark:bg-coral/10'
                      : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
                  )}
                >
                  <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-gray-500">
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                      {count}
                    </span>
                    {count > 0 && item.tone !== 'neutral' && (
                      <StatusChip tone={item.tone} size="sm" dot>
                        {item.tone === 'danger' ? 'Costing money' : 'Waiting'}
                      </StatusChip>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {segment === 'damaged' && <DamagedQueue organizationId={organizationId} />}

          {segment === 'variance' && (
            <VarianceTable
              lines={varianceOnly}
              isLoading={varianceLoading}
              onSelect={line =>
                line.sales_order_id && navigate(`/orders/${line.sales_order_id}`)
              }
            />
          )}

          {segment === 'acks' && (
            <VarianceTable
              lines={awaitingAck}
              isLoading={varianceLoading}
              onSelect={line =>
                line.sales_order_id && navigate(`/orders/${line.sales_order_id}`)
              }
            />
          )}

          {segment === 'freight' && <FreightQueue organizationId={organizationId} />}

          {segment === 'billing' && <ReadyToBillQueue organizationId={organizationId} />}

          {segment === 'drift' && <RateDriftPanel organizationId={organizationId} />}
        </div>
      </div>
    </PageContent>
  );
}
