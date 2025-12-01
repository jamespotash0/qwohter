/**
 * 📊 Enhanced Chart Card Component
 *
 * Advanced chart wrapper with:
 * - Time period toggle (Monthly/Weekly/Yearly)
 * - Filter button
 * - Action menu (ellipsis with Export/Enlarge options)
 * - Clean styling matching screenshot design
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Maximize2, MoreVertical, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { format, subMonths, subWeeks, subYears, startOfWeek } from 'date-fns';

export type TimePeriod = 'weekly' | 'monthly' | 'yearly';

export interface EnhancedChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode | ((timePeriod: TimePeriod, periodOffset: number) => ReactNode);
  showTimePeriodToggle?: boolean;
  showFilter?: boolean;
  showCumulativeToggle?: boolean;
  isCumulative?: boolean;
  onCumulativeToggle?: (cumulative: boolean) => void;
  onExport?: () => void;
  onExpand?: () => void;
  onFilterClick?: () => void;
  onTimePeriodChange?: (period: TimePeriod) => void;
  onPeriodOffsetChange?: (offset: number) => void;
  defaultTimePeriod?: TimePeriod;
  className?: string;
  height?: string;
  hideHeader?: boolean; // Hide title/subtitle (useful for enlarged modal)
  isEnlarged?: boolean; // Whether the card is in enlarged/modal view
  // Additional metrics to display in header
  primaryMetric?: {
    value: string;
    label: string;
    trend?: string;
    trendDirection?: 'up' | 'down' | 'neutral';
  };
  secondaryMetric?: {
    value: string;
    label: string;
    trend?: string;
    trendDirection?: 'up' | 'down' | 'neutral';
  };
}

export const EnhancedChartCard = ({
  title,
  subtitle,
  children,
  showTimePeriodToggle = false,
  showFilter = false,
  showCumulativeToggle = false,
  isCumulative = false,
  onCumulativeToggle,
  onExport,
  onExpand,
  onFilterClick,
  onTimePeriodChange,
  onPeriodOffsetChange,
  defaultTimePeriod = 'monthly',
  className,
  height = 'h-80',
  hideHeader = false,
  isEnlarged = false,
  primaryMetric,
  secondaryMetric,
}: EnhancedChartCardProps) => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(defaultTimePeriod);
  const [periodOffset, setPeriodOffset] = useState(0);

  const handleTimePeriodChange = (period: TimePeriod) => {
    setTimePeriod(period);
    setPeriodOffset(0); // Reset offset when changing period type
    onTimePeriodChange?.(period);
    onPeriodOffsetChange?.(0);
  };

  const handlePeriodNavigation = (direction: 'prev' | 'next') => {
    const newOffset = direction === 'prev' ? periodOffset + 1 : periodOffset - 1;
    if (newOffset < 0) return; // Can't go to future
    setPeriodOffset(newOffset);
    onPeriodOffsetChange?.(newOffset);
  };

  const getPeriodLabel = () => {
    const now = new Date();

    let targetDate: Date;
    switch (timePeriod) {
      case 'weekly':
        targetDate = subWeeks(now, periodOffset);
        const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 });
        return format(weekStart, "MMM d ''yy");
      case 'monthly':
        targetDate = subMonths(now, periodOffset);
        return format(targetDate, "MMM ''yy"); // Oct '24, Nov '24, etc.
      case 'yearly':
        targetDate = subYears(now, periodOffset);
        return format(targetDate, 'yyyy');
      default:
        return '';
    }
  };

  const getTrendColor = (direction?: 'up' | 'down' | 'neutral') => {
    if (!direction) return 'text-gray-500';
    return direction === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : direction === 'down'
      ? 'text-red-600 dark:text-red-400'
      : 'text-gray-500';
  };

  return (
    <Card
      className={cn(
        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
        'shadow-sm hover:shadow-md transition-shadow',
        isEnlarged ? 'flex flex-col h-full' : '',
        className
      )}
    >
      <CardHeader className="pb-3">
        {/* Top row: Title/Subtitle on left, Controls on right */}
        <div className="flex items-start justify-between gap-4">
          {/* Title and subtitle */}
          {!hideHeader && (
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* Right side controls (right to left: Ellipsis → Monthly View → Calendar) */}
          <div className={cn("flex items-center gap-2 flex-shrink-0", hideHeader ? "" : "ml-auto")}>
            {/* Filter button */}
            {showFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={onFilterClick}
                className="h-8 px-3 text-xs border-gray-200 dark:border-gray-700"
              >
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Filter
              </Button>
            )}

            {/* Period navigation - leftmost of the right side */}
            {showTimePeriodToggle && (
              <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-md px-2 h-8">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePeriodNavigation('prev')}
                  className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[70px] text-center">
                  {getPeriodLabel()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePeriodNavigation('next')}
                  disabled={periodOffset === 0}
                  className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Time period selector - middle */}
            {showTimePeriodToggle && (
              <Select value={timePeriod} onValueChange={handleTimePeriodChange}>
                <SelectTrigger className="h-8 w-[130px] text-xs border-gray-200 dark:border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly View</SelectItem>
                  <SelectItem value="monthly">Monthly View</SelectItem>
                  <SelectItem value="yearly">Yearly View</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Action menu (ellipsis) - rightmost */}
            {(onExport || onExpand) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {onExpand && (
                    <DropdownMenuItem onClick={onExpand} className="text-sm">
                      <Maximize2 className="h-3.5 w-3.5 mr-2" />
                      Enlarge
                    </DropdownMenuItem>
                  )}
                  {onExport && (
                    <DropdownMenuItem onClick={onExport} className="text-sm">
                      <Download className="h-3.5 w-3.5 mr-2" />
                      Export Data
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Second row: Cumulative toggle aligned under view dropdown */}
        {showCumulativeToggle && (
          <div className="mt-3 flex justify-end">
            <div className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 rounded-md px-2 h-8 w-fit mr-10">
              <span className="text-xs text-gray-600 dark:text-gray-400">Cumulative</span>
              <Switch
                checked={isCumulative}
                onCheckedChange={onCumulativeToggle}
                className="scale-75"
              />
            </div>
          </div>
        )}

        {/* Metrics row */}
        {(primaryMetric || secondaryMetric) && (
          <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            {primaryMetric && (
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {primaryMetric.label}
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {primaryMetric.value}
                  </p>
                </div>
                {primaryMetric.trend && (
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full bg-opacity-10',
                      getTrendColor(primaryMetric.trendDirection)
                    )}
                    style={{
                      backgroundColor:
                        primaryMetric.trendDirection === 'up'
                          ? 'rgba(16, 185, 129, 0.1)'
                          : primaryMetric.trendDirection === 'down'
                          ? 'rgba(239, 68, 68, 0.1)'
                          : 'rgba(107, 114, 128, 0.1)',
                    }}
                  >
                    {primaryMetric.trend}
                  </span>
                )}
              </div>
            )}

            {secondaryMetric && (
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {secondaryMetric.label}
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {secondaryMetric.value}
                  </p>
                </div>
                {secondaryMetric.trend && (
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      getTrendColor(secondaryMetric.trendDirection)
                    )}
                    style={{
                      backgroundColor:
                        secondaryMetric.trendDirection === 'up'
                          ? 'rgba(16, 185, 129, 0.1)'
                          : secondaryMetric.trendDirection === 'down'
                          ? 'rgba(239, 68, 68, 0.1)'
                          : 'rgba(107, 114, 128, 0.1)',
                    }}
                  >
                    {secondaryMetric.trend}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className={cn('pt-2', isEnlarged ? 'flex-1 min-h-0' : height)}>
        {typeof children === 'function' ? children(timePeriod, periodOffset) : children}
      </CardContent>
    </Card>
  );
};
