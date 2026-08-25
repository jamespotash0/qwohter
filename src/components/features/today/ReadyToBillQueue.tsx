/**
 * Ready to bill queue
 *
 * Jobs that have been installed and not yet invoiced.
 *
 * The stage is derived from the same event log everything else uses, so a job
 * appears here because product was received and a crew closed a work order —
 * not because a date passed. Finishing an install in March and getting round
 * to the final invoice in May is a normal way to lose a month of cash, and it
 * is invisible on a calendar.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Receipt } from '@phosphor-icons/react';
import {
  DataTable,
  EmptyState,
  StageRailCompact,
  asJobStage,
  type DataColumn,
} from '@/components/common/backoffice';
import { formatCurrency } from '@/lib/pricing';
import { useAllProjectProgress } from '@/hooks/queries/useProjectHub';
import { fetchBoardItems } from '@/services/boardService';

interface BillableJob {
  projectId: string;
  name: string;
  client: string | null;
  sell: number;
}

export function ReadyToBillQueue({ organizationId }: { organizationId?: string }) {
  const navigate = useNavigate();
  const { data: progressById = {}, isLoading } = useAllProjectProgress(organizationId);

  // Names live on the proposal, not on `project_progress`, so the board's own
  // read is reused rather than teaching the progress view about titles.
  const { data: boardItems = [] } = useQuery({
    queryKey: ['board-items', organizationId],
    enabled: !!organizationId,
    staleTime: 60 * 1000,
    queryFn: () => fetchBoardItems(organizationId!),
  });

  const jobs = useMemo<BillableJob[]>(() => {
    const byId = new Map(boardItems.map(item => [item.id, item]));
    return Object.values(progressById)
      .filter(progress => asJobStage(progress.stage as string | null) === 'Ready to bill')
      .map(progress => {
        const item = byId.get(progress.project_id as string);
        const proposal = (item as { proposal?: Record<string, unknown> } | undefined)
          ?.proposal;
        return {
          projectId: progress.project_id as string,
          name:
            (proposal?.project_name as string) ??
            (proposal?.proposal_number as string) ??
            'Untitled job',
          client:
            (proposal?.client_company as string) ??
            (proposal?.client_name as string) ??
            null,
          sell: Number(progress.sell_total ?? 0),
        };
      })
      .sort((a, b) => b.sell - a.sell);
  }, [progressById, boardItems]);

  const columns = useMemo<DataColumn<BillableJob>[]>(
    () => [
      {
        key: 'name',
        header: 'Job',
        primary: true,
        render: job => (
          <>
            <p className="text-gray-900 dark:text-gray-100">{job.name}</p>
            {job.client && (
              <p className="text-xs font-normal text-gray-500">{job.client}</p>
            )}
          </>
        ),
      },
      {
        key: 'stage',
        header: 'Stage',
        hideInCard: true,
        render: () => <StageRailCompact current="Ready to bill" />,
      },
      {
        key: 'sell',
        header: 'Value',
        align: 'right',
        className: 'tabular-nums font-medium',
        render: job => formatCurrency(job.sell),
      },
    ],
    []
  );

  return (
    <DataTable
      rows={jobs}
      columns={columns}
      getRowId={job => job.projectId}
      isLoading={isLoading}
      onRowClick={job =>
        navigate(`/projects/${job.projectId}?view=${encodeURIComponent('Ready to bill')}`)
      }
      empty={
        <EmptyState
          icon={Receipt}
          title="Nothing waiting to be billed"
          description="No job has everything installed. A job lands here when its last work order is closed out."
        />
      }
    />
  );
}
