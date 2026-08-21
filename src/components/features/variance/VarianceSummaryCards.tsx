/**
 * Variance Summary Cards
 *
 * The headline a project manager reads before anything else: how many
 * acknowledgments are outstanding, how many came back changed, and what those
 * changes cost.
 *
 * Exposure is the number that matters, so it gets the emphasis and a colour
 * that means something — red when a manufacturer is charging more than quoted,
 * green when the net is in the dealer's favour.
 */

import { Clock, CurrencyDollar, Warning, CalendarX } from '@phosphor-icons/react';
import { formatCurrency, type VarianceSummary } from '@/lib/pricing';
import { cn } from '@/lib/utils';

interface VarianceSummaryCardsProps {
  summary: VarianceSummary;
  isLoading?: boolean;
}

interface TileProps {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string; weight?: 'regular' | 'fill' }>;
  tone?: 'neutral' | 'warning' | 'critical' | 'good';
}

const TONE_STYLES: Record<NonNullable<TileProps['tone']>, string> = {
  neutral: 'text-gray-900 dark:text-gray-100',
  warning: 'text-amber-600 dark:text-amber-400',
  critical: 'text-red-600 dark:text-red-400',
  good: 'text-emerald-600 dark:text-emerald-400',
};

function Tile({ label, value, hint, icon: Icon, tone = 'neutral' }: TileProps) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <p
        className={cn(
          'mt-2 text-2xl font-semibold tabular-nums tracking-tight',
          TONE_STYLES[tone]
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </div>
  );
}

export function VarianceSummaryCards({
  summary,
  isLoading,
}: VarianceSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="h-[104px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // A credit is genuinely good news, so it should not be painted as a problem.
  const exposureTone =
    summary.totalExposure > 0 ? 'critical' : summary.totalExposure < 0 ? 'good' : 'neutral';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Tile
        label="Awaiting ack"
        value={`${summary.awaitingAck}`}
        hint={summary.awaitingAck === 0 ? 'All answered' : 'No reply yet'}
        icon={Clock}
        tone={summary.awaitingAck > 0 ? 'warning' : 'neutral'}
      />
      <Tile
        label="With variance"
        value={`${summary.withVariance}`}
        hint={summary.withVariance === 0 ? 'Nothing changed' : 'Price or date moved'}
        icon={Warning}
        tone={summary.withVariance > 0 ? 'critical' : 'neutral'}
      />
      <Tile
        label="Cost exposure"
        value={formatCurrency(summary.totalExposure)}
        hint={
          summary.totalExposure > 0
            ? 'More than you quoted'
            : summary.totalExposure < 0
              ? 'In your favour'
              : 'No cost impact'
        }
        icon={CurrencyDollar}
        tone={exposureTone}
      />
      <Tile
        label="Worst slip"
        value={summary.worstSlipDays > 0 ? `${summary.worstSlipDays}d` : '—'}
        hint={summary.worstSlipDays > 0 ? 'Later than requested' : 'On schedule'}
        icon={CalendarX}
        tone={summary.worstSlipDays > 14 ? 'critical' : summary.worstSlipDays > 0 ? 'warning' : 'neutral'}
      />
    </div>
  );
}

export default VarianceSummaryCards;
