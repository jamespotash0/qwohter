/**
 * Job header
 *
 * Everything a person needs before they decide what to do: what the job is,
 * where it has got to, what it is worth, what is wrong with it, and the one
 * action the stage calls for.
 *
 * The rail is the navigation. Beneath it sits a slim row for the things that
 * are not stages — activity, tasks, changes, files — which apply to the whole
 * job rather than a step of it. Opening one of those clears the rail's
 * selection underline but never its position marker: where the job is stays
 * true regardless of what you happen to be reading.
 */

import React from 'react';
import { ArrowLeft, CaretDown } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  StageRail,
  MoneyTiles,
  Callout,
  type JobStage,
} from '@/components/common/backoffice';
import type { ProjectProgress } from '@/hooks/queries/useProjectHub';
import type { SalesOrder } from '@/hooks/queries/useSalesOrders';
import { jobAttention, jobMoneyTiles, stageCounts } from './jobModel';
import { AUX_VIEWS, AUX_LABELS, type AuxView } from './auxViews';
import { cn } from '@/lib/utils';

interface JobHeaderProps {
  name: string;
  subtitle: string;
  boardStatus: string | null;
  stage: JobStage;
  /** The stage whose panel is open, or null when an aux view is. */
  selectedStage: JobStage | null;
  onSelectStage: (stage: JobStage) => void;
  auxView: AuxView | null;
  onSelectAux: (view: AuxView) => void;
  progress: ProjectProgress | null | undefined;
  isLoading?: boolean;
  orders: SalesOrder[];
  selectedOrderId: string | null;
  onSelectOrder: (orderId: string) => void;
  /** The stage's single call to action. */
  primaryAction?: React.ReactNode;
  onBack: () => void;
}

export function JobHeader({
  name,
  subtitle,
  boardStatus,
  stage,
  selectedStage,
  onSelectStage,
  auxView,
  onSelectAux,
  progress,
  isLoading = false,
  orders,
  selectedOrderId,
  onSelectOrder,
  primaryAction,
  onBack,
}: JobHeaderProps) {
  const attention = jobAttention(progress);
  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  const auxCounts: Partial<Record<AuxView, number>> = {
    tasks: Number(progress?.open_tasks ?? 0),
    changes: Number(progress?.open_change_orders ?? 0),
  };

  return (
    <div className="space-y-4">
      {/* Identity */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            className="mb-1 flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-900 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Jobs
          </button>
          <h1 className="truncate text-2xl font-bold tracking-tight text-[var(--content-header-text)] sm:text-3xl">
            {name}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {subtitle}
            {boardStatus && (
              <>
                {subtitle && ' · '}
                on the board as{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {boardStatus}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Most jobs have one order; a change order can add another. The
              switcher earns its space only when there is a choice to make. */}
          {orders.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {selectedOrder?.order_number ?? 'Order'}
                  <CaretDown className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {orders.map(order => (
                  <DropdownMenuItem
                    key={order.id}
                    onClick={() => onSelectOrder(order.id)}
                  >
                    {order.order_number ?? 'Draft order'}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {primaryAction}
        </div>
      </div>

      <StageRail
        current={stage}
        selected={selectedStage ?? undefined}
        onSelect={onSelectStage}
        counts={stageCounts(progress)}
        className={cn(auxView !== null && 'opacity-90')}
      />

      {/* The whole-job panels, deliberately quieter than the rail. */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 pb-2 dark:border-gray-700">
        {AUX_VIEWS.map(view => {
          const count = auxCounts[view] ?? 0;
          const isActive = auxView === view;
          return (
            <button
              key={view}
              type="button"
              onClick={() => onSelectAux(view)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
              )}
            >
              {AUX_LABELS[view]}
              {count > 0 && (
                <span className="ml-1.5 tabular-nums text-gray-400">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <MoneyTiles tiles={jobMoneyTiles(progress)} isLoading={isLoading} />

      {attention.length > 0 && (
        <Callout tone="warn">{attention.join(' · ')}</Callout>
      )}
    </div>
  );
}
