/**
 * Money tiles
 *
 * The row of figures at the top of a job or an order: sell, cost, margin, and
 * what the margin has done since the quote.
 *
 * Every value is tabular-nums and right-weighted so a column of them can be
 * compared down the page rather than read one at a time. `delta` is the point
 * of the component — a margin figure on its own is information, but a margin
 * figure beside the one that was quoted is the thing that makes somebody pick
 * up the phone.
 */

import React from 'react';
import { TrendDown, TrendUp } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface MoneyTile {
  label: string;
  /** Pre-formatted. Callers own their own currency and percentage formatting. */
  value: React.ReactNode;
  /** Secondary line — a percentage, a count, or why the value is a dash. */
  hint?: React.ReactNode;
  /**
   * Movement against a baseline. `direction` is which way the number went;
   * `isBad` is whether that direction is bad here, because a cost going up and
   * a margin going up are opposite news.
   */
  delta?: {
    label: React.ReactNode;
    direction: 'up' | 'down';
    isBad?: boolean;
  };
}

interface MoneyTilesProps {
  tiles: MoneyTile[];
  /** Rendered while the numbers are still loading. */
  isLoading?: boolean;
  className?: string;
}

export function MoneyTiles({ tiles, isLoading = false, className }: MoneyTilesProps) {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="h-[86px] animate-pulse rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>
      {tiles.map(tile => {
        const TrendIcon = tile.delta?.direction === 'up' ? TrendUp : TrendDown;
        return (
          <div
            key={tile.label}
            className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 sm:p-4"
          >
            <p className="text-[10px] uppercase tracking-wide text-gray-500">
              {tile.label}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100 sm:text-xl">
              {tile.value}
            </p>
            {tile.hint && <p className="mt-0.5 text-xs text-gray-500">{tile.hint}</p>}
            {tile.delta && (
              <p
                className={cn(
                  'mt-0.5 flex items-center gap-1 text-xs tabular-nums',
                  tile.delta.isBad
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                <TrendIcon className="h-3 w-3 shrink-0" />
                {tile.delta.label}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
