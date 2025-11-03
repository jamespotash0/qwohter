/**
 * 📈 Trend Badge Component
 *
 * Shows percentage change with direction indicator:
 * - Up arrow (green) for positive trends
 * - Down arrow (red) for negative trends
 * - Neutral (gray) for no change
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TrendBadgeProps {
  value: number;
  direction: 'up' | 'down' | 'neutral';
  label?: string; // e.g., "vs last month"
  size?: 'sm' | 'md' | 'lg';
}

export const TrendBadge = ({
  value,
  direction,
  label,
  size = 'sm'
}: TrendBadgeProps) => {
  const colorClasses = {
    up: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    down: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    neutral: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700',
  };

  const icons = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus,
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const Icon = icons[direction];

  return (
    <div className="flex flex-col items-end gap-1">
      <div
        className={cn(
          'inline-flex items-center rounded-full font-medium border',
          colorClasses[direction],
          sizeClasses[size]
        )}
      >
        <Icon className={iconSizes[size]} />
        <span>{Math.abs(value).toFixed(1)}%</span>
      </div>
      {label && (
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {label}
        </span>
      )}
    </div>
  );
};
