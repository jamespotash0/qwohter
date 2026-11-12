/**
 * Job
 *
 * One job, from a won quote through to money owed.
 *
 * This is the only detail page in the back office. Everything a dealer does
 * after a quote is won already carries a project_id — orders, manufacturer
 * orders, shipments, receipts, work orders, change orders, tasks, files and
 * billing — so there is one record to open rather than five, and the stage
 * rail is how you move between them.
 *
 * The rail reports `project_progress.stage`, which is derived from an event
 * log rather than typed by anybody. It disagrees with the Kanban column the
 * card was dragged into, and the disagreement is the useful part: a job
 * sitting in "Installing" with nothing received is a job somebody stopped
 * looking at.
 *
 * Which panel is open lives in the URL, so a link to a job can point at the
 * thing being discussed rather than at the job's front door.
 */

import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowsClockwise } from '@phosphor-icons/react';
import { PageContent } from '@/components/common/layout';
import { Button } from '@/components/ui/button';
import {
  asJobStage,
  isJobStage,
  STAGE_PRIMARY_ACTIONS,
  type JobStage,
} from '@/components/common/backoffice';
import { fetchBoardItemById } from '@/services/boardService';
import { useProjectProgress } from '@/hooks/queries/useProjectHub';
import {
  useSalesOrdersForProject,
  useVendorPOs,
  useOrderLines,
} from '@/hooks/queries/useSalesOrders';
import { useWorkOrdersForProject } from '@/hooks/queries/useWorkOrders';
import {
  JobHeader,
  OrderLinesPanel,
  OrdersPlacedPanel,
  PurchasingPanel,
  TransitPanel,
  ReceivingPanel,
  SiteWorkPanel,
  BillingPanel,
  STAGE_ACTION_KEYS,
  AUX_VIEWS,
  type AuxView,
  type JobActions,
} from '@/components/features/projects/job';
import { ProjectActivityFeed } from '@/components/features/projects/ProjectActivityFeed';
import { ChangeOrdersPanel } from '@/components/features/projects/ChangeOrdersPanel';
import { WorkOrderDialog } from '@/components/features/projects/WorkOrderDialog';
import { CompleteWorkOrderDialog } from '@/components/features/projects/CompleteWorkOrderDialog';
import { ProjectTasks } from '@/components/features/board/ProjectTasks';
import { EntityAttachments } from '@/components/features/attachments/EntityAttachments';
import { CreateOrderDialog } from '@/components/features/orders/CreateOrderDialog';
import { AcknowledgmentDialog } from '@/components/features/orders/AcknowledgmentDialog';
import { RevisionDialog } from '@/components/features/orders/RevisionDialog';
import { ReceiveDialog } from '@/components/features/orders/ReceiveDialog';
import { ShipmentDialog } from '@/components/features/orders/ShipmentDialog';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: project, isLoading } = useQuery({
    queryKey: ['board-item', projectId],
    enabled: !!projectId,
    queryFn: () => fetchBoardItemById(projectId!),
  });

  const { data: progress, isLoading: progressLoading } = useProjectProgress(projectId);
  const { data: orders = [] } = useSalesOrdersForProject(projectId);
  const { data: workOrders = [] } = useWorkOrdersForProject(projectId);

  // Dialog state lives here rather than in the panels so that receiving opened
  // from a shipment and receiving opened from a manufacturer order are the same
  // dialog in the same state, not two that can disagree.
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [ackPOId, setAckPOId] = useState<string | null>(null);
  const [receivePOId, setReceivePOId] = useState<string | null>(null);
  const [receiveShipmentId, setReceiveShipmentId] = useState<string | null>(null);
  const [shipPOId, setShipPOId] = useState<string | null>(null);
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const stage = asJobStage(progress?.stage as string | null | undefined);

  // Which order the stage panels read. A job normally has one; a change order
  // can add another, and then the header offers a switcher.
  const orderParam = searchParams.get('order');
  const selectedOrderId =
    orders.find(o => o.id === orderParam)?.id ?? orders[0]?.id ?? null;

  // The open panel, as a URL parameter so a link can point at it. An absent
  // parameter follows the job's own stage rather than pinning to one, so a
  // bookmark to a job keeps up as the job moves.
  const viewParam = searchParams.get('view');
  const auxView: AuxView | null = AUX_VIEWS.includes(viewParam as AuxView)
    ? (viewParam as AuxView)
    : null;
  const selectedStage: JobStage | null = auxView
    ? null
    : isJobStage(viewParam)
      ? viewParam
      : stage;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const { data: pos = [] } = useVendorPOs(selectedOrderId ?? undefined);
  const { data: lines = [] } = useOrderLines(selectedOrderId ?? undefined);

  const lineLabels = useMemo(
    () => Object.fromEntries(lines.map(l => [l.id, l.description])),
    [lines]
  );

  // Matching an uploaded acknowledgment needs the part number the manufacturer
  // knows the line by, which lives on the order line rather than the PO line.
  const lineModels = useMemo(
    () => Object.fromEntries(lines.map(l => [l.id, l.model_number])),
    [lines]
  );

  const organizationId = project?.organization_id;
  const proposal = (project as { proposal?: Record<string, unknown> } | undefined)
    ?.proposal;

  if (isLoading) {
    return (
      <PageContent>
        <div className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      </PageContent>
    );
  }

  if (!project || !projectId || !organizationId) {
    return (
      <PageContent showPageHeader title="Job not found">
        <Button variant="outline" onClick={() => navigate('/project-board')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to the board
        </Button>
      </PageContent>
    );
  }

  const projectName = (proposal?.project_name as string) ?? null;
  const proposalNumber = (proposal?.proposal_number as string) ?? null;
  const proposalId = (proposal?.id as string) ?? null;
  const name = projectName ?? proposalNumber ?? 'Untitled job';
  const client =
    (proposal?.client_company as string) ?? (proposal?.client_name as string) ?? null;

  // Only show the proposal number when it is not already the title — otherwise
  // a job with no name of its own reads "PR-1001 · PR-1001".
  const subtitle = [client, name === proposalNumber ? null : proposalNumber]
    .filter(Boolean)
    .join(' · ');

  const activePO = pos.find(p => p.id === ackPOId);
  const receivingPO = pos.find(p => p.id === receivePOId);
  const shippingPO = pos.find(p => p.id === shipPOId);

  const goToStage = (next: JobStage) => setParam('view', next);

  const actions: JobActions = {
    onCreateOrder: () => setCreateOrderOpen(true),
    onCompareRevision: () => setRevisionOpen(true),
    onRecordAck: poId => setAckPOId(poId),
    onShip: poId => {
      setShipPOId(poId);
      setShipDialogOpen(true);
    },
    onReceive: (poId, shipmentId) => {
      setReceiveShipmentId(shipmentId);
      setReceivePOId(poId);
    },
    onScheduleWork: () => setScheduleOpen(true),
    onCompleteWorkOrder: id => setCompletingId(id),
  };

  // One button, chosen by where the job is rather than where the reader is
  // looking. Most of them move to the panel that owns the work; the two that
  // open a dialog do so because there is nothing to choose between first.
  const actionKey = STAGE_ACTION_KEYS[stage];
  const primaryAction = actionKey ? (
    <Button
      size="sm"
      onClick={() => {
        switch (actionKey) {
          case 'createOrder':
            return setCreateOrderOpen(true);
          case 'addShipment':
            return actions.onShip(null);
          case 'scheduleWork':
            return setScheduleOpen(true);
          case 'fanOut':
            return goToStage('Released');
          case 'recordAck':
            return goToStage('Ordering');
          case 'receive':
            return goToStage('Receiving');
          case 'createBilling':
            return goToStage('Ready to bill');
        }
      }}
    >
      {STAGE_PRIMARY_ACTIONS[stage]}
    </Button>
  ) : null;

  return (
    <PageContent>
      <div className="space-y-5">
        <JobHeader
          name={name}
          subtitle={subtitle}
          boardStatus={project.workflow_status ?? null}
          stage={stage}
          selectedStage={selectedStage}
          onSelectStage={goToStage}
          auxView={auxView}
          onSelectAux={view => setParam('view', view)}
          progress={progress}
          isLoading={progressLoading}
          orders={orders}
          selectedOrderId={selectedOrderId}
          onSelectOrder={id => setParam('order', id)}
          primaryAction={primaryAction}
          onBack={() => navigate('/project-board')}
        />

        <div>
          {auxView === 'lines' && (
            <OrderLinesPanel
              salesOrderId={selectedOrderId}
              onCreateOrder={actions.onCreateOrder}
            />
          )}
          {auxView === 'activity' && (
            <ProjectActivityFeed
              organizationId={organizationId}
              projectId={projectId}
            />
          )}
          {auxView === 'tasks' && (
            <ProjectTasks
              projectId={projectId}
              organizationId={organizationId}
              projectName={name}
            />
          )}
          {auxView === 'changes' && (
            <ChangeOrdersPanel
              organizationId={organizationId}
              projectId={projectId}
            />
          )}
          {auxView === 'files' && (
            <EntityAttachments
              organizationId={organizationId}
              entityType="project"
              entityId={projectId}
              title="Job files"
            />
          )}

          {!auxView && selectedStage === 'Quoted' && (
            <OrderLinesPanel
              salesOrderId={selectedOrderId}
              onCreateOrder={actions.onCreateOrder}
            />
          )}
          {!auxView && selectedStage === 'Released' && (
            <PurchasingPanel
              salesOrderId={selectedOrderId}
              onCreateOrder={actions.onCreateOrder}
            />
          )}
          {!auxView && selectedStage === 'Ordering' && (
            <OrdersPlacedPanel
              salesOrderId={selectedOrderId}
              actions={actions}
              onGoToPurchasing={() => goToStage('Released')}
            />
          )}
          {!auxView && selectedStage === 'Awaiting delivery' && (
            <TransitPanel salesOrderId={selectedOrderId} actions={actions} />
          )}
          {!auxView && selectedStage === 'Receiving' && (
            <ReceivingPanel
              salesOrderId={selectedOrderId}
              damagedCount={Number(progress?.qty_damaged ?? 0)}
              actions={actions}
            />
          )}
          {!auxView && selectedStage === 'Installing' && (
            <SiteWorkPanel
              projectId={projectId}
              hasOrders={orders.length > 0}
              actions={actions}
            />
          )}
          {!auxView && selectedStage === 'Ready to bill' && (
            <BillingPanel
              organizationId={organizationId}
              projectId={projectId}
              contractDefault={Number(progress?.sell_total ?? 0)}
            />
          )}
        </div>

        {/*
          The specification is imported at the quote, not here. A second import
          path landing straight on an order would produce a job with no
          proposal behind it — no client document, no win/loss, and a second
          description of the same lines. Revisions still arrive as a file; they
          are diffed rather than re-imported.
        */}
        {selectedOrderId && (
          <div className="flex flex-wrap justify-end gap-2">
            {/* The designer revised after the quote. Which of 520 lines moved? */}
            <Button variant="ghost" size="sm" onClick={actions.onCompareRevision}>
              <ArrowsClockwise className="mr-1.5 h-4 w-4" />
              Compare revision
            </Button>
          </div>
        )}
      </div>

      <CreateOrderDialog
        open={createOrderOpen}
        onOpenChange={setCreateOrderOpen}
        organizationId={organizationId}
        proposalId={proposalId}
        projectId={projectId}
        proposalNumber={proposalNumber}
        onCreated={id => setParam('order', id)}
      />

      {selectedOrderId && (
        <>
          <RevisionDialog
            open={revisionOpen}
            onOpenChange={setRevisionOpen}
            salesOrderId={selectedOrderId}
          />

          <ReceiveDialog
            open={!!receivePOId || !!receiveShipmentId}
            onOpenChange={open => {
              if (open) return;
              setReceivePOId(null);
              setReceiveShipmentId(null);
            }}
            organizationId={organizationId}
            salesOrderId={selectedOrderId}
            vendorPOId={receivePOId}
            shipmentId={receiveShipmentId}
            poNumber={receivingPO?.po_number}
            manufacturerName={receivingPO?.manufacturer_name}
          />

          <ShipmentDialog
            open={shipDialogOpen}
            onOpenChange={setShipDialogOpen}
            organizationId={organizationId}
            salesOrderId={selectedOrderId}
            vendorPOId={shipPOId}
            poNumber={shippingPO?.po_number}
            manufacturerName={shippingPO?.manufacturer_name}
          />
        </>
      )}

      <AcknowledgmentDialog
        open={!!ackPOId}
        onOpenChange={open => !open && setAckPOId(null)}
        vendorPOId={ackPOId}
        poNumber={activePO?.po_number}
        manufacturerName={activePO?.manufacturer_name}
        requestedShipDate={activePO?.requested_ship_date}
        lineLabels={lineLabels}
        lineModels={lineModels}
      />

      <WorkOrderDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        organizationId={organizationId}
        projectId={projectId}
        salesOrderId={selectedOrderId}
        defaultSite={{
          name: orders[0]?.ship_to_name,
          city: orders[0]?.ship_to_city,
          state: orders[0]?.ship_to_state,
        }}
      />

      <CompleteWorkOrderDialog
        open={!!completingId}
        onOpenChange={open => !open && setCompletingId(null)}
        workOrder={workOrders.find(w => w.id === completingId) ?? null}
        salesOrderId={
          workOrders.find(w => w.id === completingId)?.sales_order_id ??
          selectedOrderId
        }
      />
    </PageContent>
  );
}
