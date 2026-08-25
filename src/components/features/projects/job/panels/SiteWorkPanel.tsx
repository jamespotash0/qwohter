/**
 * Site work panel
 *
 * The labour half of the job: who is going, when, and whether the building
 * will let them in.
 *
 * Closing a work order out is what writes the 'installed' events, which is
 * what eventually moves the job to 'Ready to bill'. A job that can be
 * scheduled but never finished is a job that never gets invoiced, so the
 * close-out button stays visible on every open work order rather than hiding
 * behind a row menu.
 *
 * Missing access notes are called out because they are the single most common
 * reason a crew is turned away at a door — a wasted trip that the schedule
 * showed as booked.
 */

import { Wrench, Plus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  EmptyState,
  StatusChip,
  toneFor,
  WORK_ORDER_STATUS_TONES,
} from '@/components/common/backoffice';
import { useWorkOrdersForProject } from '@/hooks/queries/useWorkOrders';
import { cn } from '@/lib/utils';
import type { JobActions } from '../jobModel';

interface SiteWorkPanelProps {
  projectId: string;
  /** False when the job has no order, so there is nothing crewable. */
  hasOrders: boolean;
  actions: Pick<JobActions, 'onScheduleWork' | 'onCompleteWorkOrder'>;
}

export function SiteWorkPanel({ projectId, hasOrders, actions }: SiteWorkPanelProps) {
  const { data: workOrders = [] } = useWorkOrdersForProject(projectId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Site work
          </h3>
          <p className="text-xs text-gray-500">
            Self-performed and subcontracted lines, crewed onto days.
          </p>
        </div>
        <Button size="sm" onClick={actions.onScheduleWork} disabled={!hasOrders}>
          <Plus className="mr-1.5 h-4 w-4" />
          Schedule work
        </Button>
      </div>

      {workOrders.length === 0 ? (
        <EmptyState
          icon={Wrench}
          size="sm"
          title={hasOrders ? 'No site work scheduled' : 'Nothing to crew yet'}
          description={
            hasOrders
              ? 'Only self-performed and subcontracted lines can be crewed onto a day.'
              : 'Nothing sold on this job needs crewing until it has been ordered.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          {workOrders.map((wo, index) => {
            const isOpen = wo.status !== 'Complete' && wo.status !== 'Cancelled';
            return (
              <div
                key={wo.id}
                className={cn(
                  'flex flex-wrap items-start gap-3 px-4 py-3 sm:items-center',
                  index > 0 && 'border-t border-gray-100 dark:border-gray-700/50'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {wo.work_order_number ?? wo.work_type}
                    </p>
                    <StatusChip
                      tone={toneFor(WORK_ORDER_STATUS_TONES, wo.status)}
                      size="sm"
                    >
                      {wo.status}
                    </StatusChip>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
                    {wo.scheduled_start && (
                      <span>{new Date(wo.scheduled_start).toLocaleString()}</span>
                    )}
                    {wo.site_name && <span>{wo.site_name}</span>}
                    {wo.subcontractor_name && <span>{wo.subcontractor_name}</span>}
                    {!wo.access_notes && (
                      <span className="text-amber-600 dark:text-amber-400">
                        No access notes
                      </span>
                    )}
                  </div>
                </div>
                {isOpen && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => actions.onCompleteWorkOrder(wo.id)}
                  >
                    Close out
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
