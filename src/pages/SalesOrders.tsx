/**
 * Sales Orders Page
 *
 * Every job that has been sold. An order is created from a won proposal, and
 * from there it is bought, received, and installed.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, UploadSimple } from '@phosphor-icons/react';
import { PageContent } from '@/components/common/layout';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser } from '@/auth';
import { useCurrentOrganization } from '@/hooks/queries';
import { useProposals } from '@/hooks/queries/useProposals';
import {
  useSalesOrders,
  useProjectIdForProposal,
  useOrderProgress,
} from '@/hooks/queries/useSalesOrders';
import { CreateOrderDialog } from '@/components/features/orders/CreateOrderDialog';
import { ImportSpecDialog } from '@/components/features/orders/ImportSpecDialog';
import { createSalesOrderWithLines } from '@/services/salesOrdersService';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  Released: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  'Partially Ordered': 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  Ordered: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
  Receiving: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400',
  Installing: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
  Complete: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  Cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

export default function SalesOrdersPage() {
  const navigate = useNavigate();
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id ?? '');
  const organizationId = organization?.id;

  const { data: orders = [], isLoading } = useSalesOrders(organizationId);
  // Status is derived from events, not read from the stored column, which is
  // set once at creation and immediately starts lying.
  const { data: progress = {} } = useOrderProgress(organizationId);
  const { data: proposals = [] } = useProposals(organizationId, { status: 'Won' });

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState('');

  // Only won proposals can become an order, and only those that have a project
  // — an order hangs off the project, not the document.
  const wonProposals = useMemo(() => {
    const alreadyOrdered = new Set(orders.map(o => o.proposal_id).filter(Boolean));
    return proposals.filter(p => !alreadyOrdered.has(p.id));
  }, [proposals, orders]);

  const selectedProposal = wonProposals.find(p => p.id === selectedProposalId);

  // An order hangs off the project, not the proposal, so resolve it first.
  const { data: projectId } = useProjectIdForProposal(selectedProposalId || undefined);

  return (
    <PageContent
      showPageHeader
      title="Orders"
      subtitle="Jobs that have been sold, and where each one has got to"
      headerActions={
        <div className="flex items-center gap-2">
          <Select value={selectedProposalId} onValueChange={setSelectedProposalId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Won proposal…" />
            </SelectTrigger>
            <SelectContent>
              {wonProposals.length === 0 ? (
                <div className="px-2 py-3 text-sm text-gray-500">
                  No won proposals without an order
                </div>
              ) : (
                wonProposals.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.proposal_number ?? 'Untitled'}
                    {p.project_name ? ` — ${p.project_name}` : ''}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            disabled={!selectedProposalId}
            title={
              selectedProposalId
                ? undefined
                : 'Pick the won proposal this specification belongs to'
            }
          >
            <UploadSimple className="w-4 h-4 mr-1.5" />
            Import spec
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={!selectedProposalId}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create order
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="h-16 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 animate-pulse"
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-16 text-center">
          <Package className="w-8 h-8 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            No orders yet
          </p>
          <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
            Pick a won proposal above and create an order from it. Its priced lines
            become order lines you can buy, receive, and install.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {orders.map((order, index) => (
            <button
              key={order.id}
              onClick={() => navigate(`/orders/${order.id}`)}
              className={cn(
                'flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                index > 0 && 'border-t border-gray-100 dark:border-gray-700/50'
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {order.order_number ?? 'Draft order'}
                  {order.customer_po_number && (
                    <span className="ml-2 text-xs text-gray-500">
                      Customer PO {order.customer_po_number}
                    </span>
                  )}
                </p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
                  {order.contract_vehicle && <span>{order.contract_vehicle}</span>}
                  <span>
                    Created {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
                  STATUS_STYLES[progress[order.id]?.derived_status ?? order.status] ??
                    STATUS_STYLES.Draft
                )}
              >
                {progress[order.id]?.derived_status ?? order.status}
              </span>
            </button>
          ))}
        </div>
      )}

      {organizationId && (
        <>
        <ImportSpecDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          isImporting={importing}
          onImport={async (lines, fileName) => {
            if (!organizationId || !projectId) return;
            setImporting(true);
            try {
              const orderId = await createSalesOrderWithLines(
                {
                  organization_id: organizationId,
                  project_id: projectId,
                  proposal_id: selectedProposalId || null,
                  status: 'Draft',
                  notes: `Imported from ${fileName}`,
                },
                lines
              );
              toast.success('Specification imported', {
                description: `${lines.length} lines`,
              });
              setImportOpen(false);
              navigate(`/orders/${orderId}`);
            } catch (error) {
              toast.error('Could not import the specification', {
                description:
                  error instanceof Error ? error.message : 'Unknown error',
              });
            } finally {
              setImporting(false);
            }
          }}
        />

        <CreateOrderDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          organizationId={organizationId}
          proposalId={selectedProposalId || null}
          projectId={projectId ?? null}
          proposalNumber={selectedProposal?.proposal_number}
          onCreated={id => {
            setSelectedProposalId('');
            navigate(`/orders/${id}`);
          }}
        />
        </>
      )}
    </PageContent>
  );
}
