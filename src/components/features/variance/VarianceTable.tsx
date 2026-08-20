/**
 * Variance Table
 *
 * One row per purchase order line that needs a look. State is encoded in form
 * as well as in number — a severity stripe down the left and a status pill — so
 * the rows that matter are findable without reading every figure.
 *
 * Ordering comes from the service (awaiting acknowledgment first, then by
 * exposure) and is deliberately not re-sorted here; the queue's ranking is part
 * of its meaning.
 */

import { ArrowRight } from '@phosphor-icons/react';
import { formatCurrency } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import type { POLineVariance } from '@/hooks/queries/useVarianceQueue';

interface VarianceTableProps {
  lines: POLineVariance[];
  isLoading?: boolean;
  onSelect?: (line: POLineVariance) => void;
}

type Status = 'awaiting_ack' | 'match' | 'price' | 'date' | 'price_and_date';

const STATUS_META: Record<
  Status,
  { label: string; pill: string; stripe: string }
> = {
  awaiting_ack: {
    label: 'Awaiting ack',
    pill: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    stripe: 'bg-amber-400',
  },
  price: {
    label: 'Price',
    pill: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    stripe: 'bg-red-500',
  },
  date: {
    label: 'Date',
    pill: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
    stripe: 'bg-orange-400',
  },
  price_and_date: {
    label: 'Price + date',
    pill: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    stripe: 'bg-red-600',
  },
  match: {
    label: 'Matched',
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    stripe: 'bg-emerald-400',
  },
};

const meta = (status: string | null) =>
  STATUS_META[(status as Status) ?? 'match'] ?? STATUS_META.match;

/** Slip in days, worded so the sign is unambiguous at a glance. */
function formatSlip(days: number | null): { text: string; tone: string } {
  if (days === null || days === 0) return { text: '—', tone: 'text-gray-400' };
  if (days > 0)
    return {
      text: `+${days}d`,
      tone: days > 14 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400',
    };
  return { text: `${days}d`, tone: 'text-emerald-600 dark:text-emerald-400' };
}

export function VarianceTable({ lines, isLoading, onSelect }: VarianceTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="h-14 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-14 text-center">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Nothing needs review
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Every purchase order line has been acknowledged at the price and date you
          ordered.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <th className="w-1" />
            <th className="px-3 py-2.5">PO</th>
            <th className="px-3 py-2.5">Item</th>
            <th className="px-3 py-2.5 text-right">Qty</th>
            <th className="px-3 py-2.5 text-right">Ordered</th>
            <th className="px-3 py-2.5 text-right">Acknowledged</th>
            <th className="px-3 py-2.5 text-right">Variance</th>
            <th className="px-3 py-2.5 text-right">Slip</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {lines.map(line => {
            const status = meta(line.variance_status);
            const variance = Number(line.cost_variance ?? 0);
            const slip = formatSlip(
              line.ship_date_slip_days === null ? null : Number(line.ship_date_slip_days)
            );
            const awaiting = line.variance_status === 'awaiting_ack';

            return (
              <tr
                key={line.po_line_id}
                onClick={() => onSelect?.(line)}
                className={cn(
                  'border-b border-gray-100 dark:border-gray-700/50 last:border-0',
                  onSelect && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50'
                )}
              >
                {/*
                  Severity stripe: state readable before any number is parsed.
                  The colour goes on the cell itself — a child div with h-full
                  collapses, because a td does not give its children a height.
                */}
                <td className={cn('w-1 p-0', status.stripe)} />
                <td className="px-3 py-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  {line.po_number ?? 'Draft'}
                </td>
                <td className="px-3 py-3 max-w-[260px]">
                  <p className="truncate text-gray-900 dark:text-gray-100">
                    {line.description}
                  </p>
                  {line.model_number && (
                    <p className="truncate text-xs text-gray-500">{line.model_number}</p>
                  )}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                  {Number(line.ordered_quantity ?? 0)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                  {formatCurrency(Number(line.ordered_unit_cost ?? 0))}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {awaiting ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <span className="text-gray-900 dark:text-gray-100">
                      {formatCurrency(Number(line.acked_unit_cost ?? 0))}
                    </span>
                  )}
                </td>
                <td
                  className={cn(
                    'px-3 py-3 text-right tabular-nums font-medium',
                    variance > 0
                      ? 'text-red-600 dark:text-red-400'
                      : variance < 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-400'
                  )}
                >
                  {awaiting ? '—' : variance === 0 ? '—' : formatCurrency(variance)}
                </td>
                <td className={cn('px-3 py-3 text-right tabular-nums', slip.tone)}>
                  {slip.text}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                      status.pill
                    )}
                  >
                    {status.label}
                  </span>
                </td>
                <td className="px-2 py-3">
                  {onSelect && <ArrowRight className="w-4 h-4 text-gray-300" />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default VarianceTable;
