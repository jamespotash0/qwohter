/**
 * Rate Drift Panel
 *
 * The systemic version of the variance queue.
 *
 * A single line acknowledged seven points light is a nuisance somebody chases.
 * A SERIES that has been running seven points light for a year means every
 * quote written against it was wrong — and the fix is one number in Giza or
 * CET, not a renegotiation. That is a different finding, so it gets a different
 * panel rather than being buried among individual lines.
 *
 * The rate compared against is what manufacturers actually acknowledged, never
 * what the quote assumed. Inferring it from the quote would be circular: the
 * quote was priced by the specification tool applying the dealer's own
 * multiplier, so it would read the assumption back as evidence — confidently,
 * and most confidently in exactly the case where the assumption had gone stale.
 */

import { TrendDown, TrendUp, CheckCircle } from '@phosphor-icons/react';
import { useRateDrift } from '@/hooks/queries/useVarianceQueue';
import { cn } from '@/lib/utils';

interface RateDriftPanelProps {
  organizationId?: string;
}

export function RateDriftPanel({ organizationId }: RateDriftPanelProps) {
  const { drift, rateCount, isLoading } = useRateDrift(organizationId);

  if (isLoading) {
    return <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />;
  }

  // No acknowledgments recorded is "no evidence", not "no drift". Saying
  // everything is fine here would be the most expensive kind of wrong.
  if (rateCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          No acknowledged costs yet
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Discount drift is measured against what manufacturers actually charge.
          Record some acknowledgments and this fills itself in — nothing to
          configure.
        </p>
      </div>
    );
  }

  if (drift.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm text-emerald-800 dark:text-emerald-300">
          <span className="font-medium">Your discounts match reality.</span>{' '}
          Across {rateCount} manufacturer/series combination
          {rateCount === 1 ? '' : 's'}, what you quote and what factories
          acknowledge agree.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Discount drift
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Where the rate your specification tool assumes has stopped matching
          what manufacturers actually give you. Every quote written against these
          is wrong by the same amount.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="w-1" />
              <th className="px-3 py-2.5">Manufacturer</th>
              <th className="px-3 py-2.5">Series</th>
              <th className="px-3 py-2.5 text-right">You quote</th>
              <th className="px-3 py-2.5 text-right">They give</th>
              <th className="px-3 py-2.5 text-right">Drift</th>
              <th className="px-3 py-2.5 text-right">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {drift.map(row => {
              const optimistic = row.direction === 'optimistic';
              return (
                <tr
                  key={`${row.manufacturerName}-${row.seriesName ?? 'any'}-${row.contractVehicle ?? 'any'}`}
                  className="border-t border-gray-100 dark:border-gray-700/50"
                >
                  {/* Severity down the edge: optimistic drift costs money. */}
                  <td
                    className={cn(
                      'w-1 p-0',
                      optimistic ? 'bg-red-500' : 'bg-emerald-500'
                    )}
                  />
                  <td className="px-3 py-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {row.manufacturerName}
                  </td>
                  <td className="px-3 py-3 text-gray-600 dark:text-gray-300">
                    {row.seriesName ?? (
                      <span className="text-gray-400">Any series</span>
                    )}
                    {row.contractVehicle && (
                      <span className="ml-2 text-xs text-gray-500">
                        {row.contractVehicle}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                    {row.assumedPercent.toFixed(1)}%
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-gray-900 dark:text-gray-100">
                    {row.acknowledgedPercent.toFixed(1)}%
                  </td>
                  <td
                    className={cn(
                      'px-3 py-3 text-right tabular-nums font-medium',
                      optimistic
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {optimistic ? (
                        <TrendDown className="h-3.5 w-3.5" />
                      ) : (
                        <TrendUp className="h-3.5 w-3.5" />
                      )}
                      {Math.abs(row.driftPercent).toFixed(1)} pts
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-xs text-gray-500">
                    {row.lineCount} lines
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        Rates come from acknowledged cost, not from the quote — a rate inferred
        from your own quote would just repeat your own assumption back to you.
        Only patterns backed by five or more acknowledged lines and more than two
        points of drift are shown.
      </p>
    </div>
  );
}

export default RateDriftPanel;
