/**
 * Project Detail
 *
 * The job, in one place. Once a quote is won the project stops being a card on
 * a board and becomes the thing everything else hangs off — orders,
 * acknowledgments, deliveries, crews, change orders, tasks, files, and
 * eventually billing all carry its id already.
 *
 * The header shows TWO statuses on purpose. `workflow_status` is the Kanban
 * column somebody dragged the card into; `stage` is derived from what has
 * actually happened. They disagree constantly, and the disagreement is the
 * useful part — a job sitting in "Installing" with nothing received is a job
 * somebody has stopped looking at.
 */

import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ClockCounterClockwise,
  ListChecks,
  ShoppingCart,
  ArrowsClockwise,
  Paperclip,
  Warning,
} from '@phosphor-icons/react';
import { PageContent } from '@/components/common/layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/pricing';
import { fetchBoardItemById } from '@/services/boardService';
import { useProjectProgress } from '@/hooks/queries/useProjectHub';
import { useSalesOrdersForProject } from '@/hooks/queries/useSalesOrders';
import { ProjectActivityFeed } from '@/components/features/projects/ProjectActivityFeed';
import { ChangeOrdersPanel } from '@/components/features/projects/ChangeOrdersPanel';
import { EntityAttachments } from '@/components/features/attachments/EntityAttachments';
import { ProjectTasks } from '@/components/features/board/ProjectTasks';
import { cn } from '@/lib/utils';

const STAGE_STYLES: Record<string, string> = {
  Quoted: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  Released: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  Ordering: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  'Awaiting delivery':
    'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
  Receiving: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400',
  Installing: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
  'Ready to bill':
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
};

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading } = useQuery({
    queryKey: ['board-item', projectId],
    enabled: !!projectId,
    queryFn: () => fetchBoardItemById(projectId!),
  });

  const { data: progress } = useProjectProgress(projectId);
  const { data: orders = [] } = useSalesOrdersForProject(projectId);

  const organizationId = project?.organization_id;
  const proposal = (project as { proposal?: Record<string, unknown> } | undefined)
    ?.proposal;

  if (isLoading) {
    return (
      <PageContent>
        <div className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </PageContent>
    );
  }

  if (!project || !projectId || !organizationId) {
    return (
      <PageContent showPageHeader title="Project not found">
        <Button variant="outline" onClick={() => navigate('/project-board')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to the board
        </Button>
      </PageContent>
    );
  }

  const projectName = (proposal?.project_name as string) ?? null;
  const proposalNumber = (proposal?.proposal_number as string) ?? null;
  const name = projectName ?? proposalNumber ?? 'Untitled project';
  const client =
    (proposal?.client_company as string) ?? (proposal?.client_name as string) ?? null;

  // Only show the proposal number in the subtitle when it is not already the
  // title — otherwise a project with no name of its own reads "PR-1001 / PR-1001".
  const subtitle = [client, name === proposalNumber ? null : proposalNumber]
    .filter(Boolean)
    .join(' · ');

  const sell = Number(progress?.sell_total ?? 0);
  const quotedCost = Number(progress?.quoted_cost_total ?? 0);
  const variance = progress?.acknowledged_cost_variance;
  // Margin against the cost the quote was built on, then adjusted by what
  // manufacturers have actually acknowledged. The second number is the honest one.
  const quotedMargin = sell - quotedCost;
  const realMargin = variance === null || variance === undefined
    ? null
    : quotedMargin - Number(variance);

  const attention: string[] = [];
  if (Number(progress?.open_change_orders ?? 0) > 0) {
    attention.push(
      `${progress?.open_change_orders} change order${
        Number(progress?.open_change_orders) === 1 ? '' : 's'
      } awaiting an answer`
    );
  }
  if (Number(progress?.lines_awaiting_ack ?? 0) > 0) {
    attention.push(`${progress?.lines_awaiting_ack} lines not acknowledged`);
  }
  if (Number(progress?.qty_damaged ?? 0) > 0) {
    attention.push(`${progress?.qty_damaged} damaged and still owed`);
  }

  return (
    <PageContent
      showPageHeader
      title={name}
      subtitle={subtitle}
      headerActions={
        <Button variant="outline" size="sm" onClick={() => navigate('/project-board')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Board
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Where it is, two ways */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium',
              STAGE_STYLES[progress?.stage ?? 'Quoted'] ?? STAGE_STYLES.Quoted
            )}
          >
            {progress?.stage ?? 'Quoted'}
          </span>
          <span className="text-xs text-gray-500">
            on the board as{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {project.workflow_status}
            </span>
          </span>
        </div>

        {/* Money */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Sell', value: formatCurrency(sell) },
            { label: 'Quoted cost', value: formatCurrency(quotedCost) },
            {
              label: 'Quoted margin',
              value: formatCurrency(quotedMargin),
              hint: sell > 0 ? `${((quotedMargin / sell) * 100).toFixed(1)}%` : undefined,
            },
            {
              label: 'Margin after acks',
              value: realMargin === null ? '—' : formatCurrency(realMargin),
              hint:
                realMargin === null
                  ? 'Nothing acknowledged yet'
                  : sell > 0
                    ? `${((realMargin / sell) * 100).toFixed(1)}%`
                    : undefined,
              tone:
                realMargin !== null && realMargin < quotedMargin
                  ? 'text-red-600 dark:text-red-400'
                  : undefined,
            },
          ].map(tile => (
            <div
              key={tile.label}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
            >
              <p className="text-[10px] uppercase tracking-wide text-gray-500">
                {tile.label}
              </p>
              <p
                className={cn(
                  'mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100',
                  tile.tone
                )}
              >
                {tile.value}
              </p>
              {tile.hint && (
                <p className="mt-0.5 text-xs text-gray-500">{tile.hint}</p>
              )}
            </div>
          ))}
        </div>

        {/* What needs a person */}
        {attention.length > 0 && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
            <div className="flex items-start gap-2">
              <Warning className="w-4 h-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {attention.join(' · ')}
              </p>
            </div>
          </div>
        )}

        <Tabs defaultValue="activity">
          <TabsList>
            <TabsTrigger value="activity">
              <ClockCounterClockwise className="w-4 h-4 mr-1.5" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <ListChecks className="w-4 h-4 mr-1.5" />
              Tasks
              {Number(progress?.open_tasks ?? 0) > 0 && (
                <span className="ml-1.5 text-xs text-gray-500">
                  {progress?.open_tasks}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="orders">
              <ShoppingCart className="w-4 h-4 mr-1.5" />
              Orders ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="changes">
              <ArrowsClockwise className="w-4 h-4 mr-1.5" />
              Changes
              {Number(progress?.open_change_orders ?? 0) > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 px-1.5 text-xs text-amber-700 dark:text-amber-400">
                  {progress?.open_change_orders}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="files">
              <Paperclip className="w-4 h-4 mr-1.5" />
              Files
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-4">
            <ProjectActivityFeed
              organizationId={organizationId}
              projectId={projectId}
            />
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <ProjectTasks
              projectId={projectId}
              organizationId={organizationId}
              projectName={name}
            />
          </TabsContent>

          {/* Every order on the job, and where each has got to. */}
          <TabsContent value="orders" className="mt-4">
            {orders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-10 text-center text-sm text-gray-500">
                Nothing has been ordered on this project yet.
              </p>
            ) : (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {orders.map((order, index) => (
                  <button
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className={cn(
                      'flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                      index > 0 && 'border-t border-gray-100 dark:border-gray-700/50'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {order.order_number ?? 'Draft order'}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {[
                          order.customer_po_number &&
                            `Customer PO ${order.customer_po_number}`,
                          order.contract_vehicle,
                          `Created ${new Date(order.created_at).toLocaleDateString()}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">Open →</span>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="changes" className="mt-4">
            <ChangeOrdersPanel
              organizationId={organizationId}
              projectId={projectId}
            />
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <EntityAttachments
              organizationId={organizationId}
              entityType="project"
              entityId={projectId}
              title="Project files"
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageContent>
  );
}
