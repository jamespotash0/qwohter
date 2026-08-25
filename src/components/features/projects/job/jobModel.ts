/**
 * Job model
 *
 * The reading of `project_progress` that the job header needs: what is wrong,
 * what the money is doing, and which stages have something waiting on a person.
 *
 * Kept apart from the components so it can be tested without rendering, and so
 * the same reading drives the header, the rail's badges and the job list. A
 * count that appears on the rail but not in the list is how two screens start
 * disagreeing about the same job.
 */

import { formatCurrency } from '@/lib/pricing';
import type { MoneyTile, JobStage } from '@/components/common/backoffice';
import type { ProjectProgress } from '@/hooks/queries/useProjectHub';

/** The numbers the header reads. Structural, so tests need no database row. */
export interface ProgressLike {
  sell_total?: number | string | null;
  quoted_cost_total?: number | string | null;
  acknowledged_cost_variance?: number | string | null;
  open_change_orders?: number | string | null;
  lines_awaiting_ack?: number | string | null;
  qty_damaged?: number | string | null;
  qty_total?: number | string | null;
  qty_ordered?: number | string | null;
  qty_received?: number | string | null;
  qty_installed?: number | string | null;
  open_tasks?: number | string | null;
}

const num = (value: number | string | null | undefined): number => Number(value ?? 0);

const plural = (count: number, singular: string, pluralForm?: string): string =>
  `${count} ${count === 1 ? singular : (pluralForm ?? `${singular}s`)}`;

/**
 * What needs a person, worst first.
 *
 * Ordered by what it costs to ignore: money already lost, then money about to
 * be, then a decision somebody is waiting on. A flat list sorted by table name
 * buries the expensive one under the tidy one.
 */
export function jobAttention(progress: ProgressLike | null | undefined): string[] {
  if (!progress) return [];
  const items: string[] = [];

  const damaged = num(progress.qty_damaged);
  if (damaged > 0) {
    items.push(`${plural(damaged, 'unit')} damaged and still owed`);
  }

  const awaitingAck = num(progress.lines_awaiting_ack);
  if (awaitingAck > 0) {
    items.push(`${plural(awaitingAck, 'line')} not acknowledged`);
  }

  const openChanges = num(progress.open_change_orders);
  if (openChanges > 0) {
    items.push(`${plural(openChanges, 'change order')} awaiting an answer`);
  }

  return items;
}

/**
 * Badge counts for the stage rail. Only stages a person can act on carry one,
 * and only when the count is real — a zero badge is noise that trains people
 * to stop reading badges.
 */
export function stageCounts(
  progress: ProgressLike | null | undefined
): Partial<Record<JobStage, number>> {
  if (!progress) return {};
  return {
    Ordering: num(progress.lines_awaiting_ack),
    Receiving: num(progress.qty_damaged),
  };
}

export interface JobMoney {
  sell: number;
  quotedCost: number;
  quotedMargin: number;
  /** Margin once acknowledged costs are taken into account, or null if nothing is acknowledged. */
  realMargin: number | null;
  /** How far the margin has moved since the quote. Negative means it got worse. */
  marginDelta: number | null;
}

export function jobMoney(progress: ProgressLike | null | undefined): JobMoney {
  const sell = num(progress?.sell_total);
  const quotedCost = num(progress?.quoted_cost_total);
  const quotedMargin = sell - quotedCost;

  // A null variance means nothing has come back from a manufacturer yet, which
  // is different from a variance of zero. Showing 0 there would claim the quote
  // has been confirmed when nobody has answered.
  const variance = progress?.acknowledged_cost_variance;
  const realMargin =
    variance === null || variance === undefined ? null : quotedMargin - Number(variance);

  return {
    sell,
    quotedCost,
    quotedMargin,
    realMargin,
    marginDelta: realMargin === null ? null : realMargin - quotedMargin,
  };
}

const pct = (part: number, whole: number): string | undefined =>
  whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : undefined;

/** The four figures at the top of a job. */
export function jobMoneyTiles(progress: ProjectProgress | null | undefined): MoneyTile[] {
  const money = jobMoney(progress as ProgressLike | null);

  return [
    { label: 'Sell', value: formatCurrency(money.sell) },
    { label: 'Quoted cost', value: formatCurrency(money.quotedCost) },
    {
      label: 'Quoted margin',
      value: formatCurrency(money.quotedMargin),
      hint: pct(money.quotedMargin, money.sell),
    },
    {
      label: 'Margin after acks',
      value: money.realMargin === null ? '—' : formatCurrency(money.realMargin),
      hint:
        money.realMargin === null
          ? 'Nothing acknowledged yet'
          : pct(money.realMargin, money.sell),
      delta:
        money.marginDelta === null || money.marginDelta === 0
          ? undefined
          : {
              label: `${formatCurrency(Math.abs(money.marginDelta))} vs quote`,
              direction: money.marginDelta > 0 ? 'up' : 'down',
              isBad: money.marginDelta < 0,
            },
    },
  ];
}

/**
 * What the job's single primary action should do, given where it is.
 *
 * Returning null means the stage has no one obvious next step — 'Awaiting
 * delivery' is genuinely a waiting state, and offering a button there invents
 * work rather than reflecting it.
 */
export type JobActionKey =
  | 'createOrder'
  | 'fanOut'
  | 'recordAck'
  | 'addShipment'
  | 'receive'
  | 'scheduleWork'
  | 'createBilling';

export const STAGE_ACTION_KEYS: Record<JobStage, JobActionKey | null> = {
  Quoted: 'createOrder',
  Released: 'fanOut',
  Ordering: 'recordAck',
  'Awaiting delivery': 'addShipment',
  Receiving: 'receive',
  Installing: 'scheduleWork',
  'Ready to bill': 'createBilling',
};

/**
 * Every callback a stage panel can raise. Dialogs are owned by the page rather
 * than the panels so that receiving opened from a shipment and receiving opened
 * from a manufacturer order are the same dialog in the same state, not two.
 */
export interface JobActions {
  onCreateOrder: () => void;
  onCompareRevision: () => void;
  onRecordAck: (vendorPOId: string) => void;
  onShip: (vendorPOId: string | null) => void;
  onReceive: (vendorPOId: string | null, shipmentId: string | null) => void;
  onScheduleWork: () => void;
  onCompleteWorkOrder: (workOrderId: string) => void;
}
