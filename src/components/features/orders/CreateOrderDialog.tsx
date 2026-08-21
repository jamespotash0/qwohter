/**
 * Create Order Dialog
 *
 * Turns a won proposal into a sales order. The proposal's priced line items stop
 * being a JSONB blob and become durable rows that can be bought, received, and
 * installed independently over the following months.
 *
 * The preview is the point of this dialog. Materialization is not reversible in
 * any friendly way, and a dealer needs to see "3 manufacturers have no vendor
 * account, 47 lines cannot be ordered" *before* the order exists — not discover
 * it when the fan-out comes up short.
 */

import { useEffect, useMemo, useState } from 'react';
import { Warning, CheckCircle } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/pricing';
import { useCompanies } from '@/hooks/queries/useCompanies';
import { useOrderPreview, useCreateOrderFromProposal } from '@/hooks/queries/useSalesOrders';

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  /** The won proposal to materialize. */
  proposalId: string | null;
  /** The project the resulting order hangs off. */
  projectId: string | null;
  proposalNumber?: string | null;
  onCreated?: (salesOrderId: string) => void;
}

export function CreateOrderDialog({
  open,
  onOpenChange,
  organizationId,
  proposalId,
  projectId,
  proposalNumber,
  onCreated,
}: CreateOrderDialogProps) {
  const [customerPO, setCustomerPO] = useState('');
  const [contractVehicle, setContractVehicle] = useState('');
  const [companyId, setCompanyId] = useState<string>('');

  const { data: companies = [] } = useCompanies(organizationId);
  const {
    data: preview,
    isLoading: previewLoading,
    error: previewError,
  } = useOrderPreview(open ? (proposalId ?? undefined) : undefined);
  const createOrder = useCreateOrderFromProposal();

  useEffect(() => {
    if (!open) {
      setCustomerPO('');
      setContractVehicle('');
      setCompanyId('');
    }
  }, [open]);

  const summary = preview?.summary;

  const blockers = useMemo(() => {
    if (!summary) return [];
    const items: string[] = [];
    if (summary.unnamedManufacturerLineCount > 0) {
      const n = summary.unnamedManufacturerLineCount;
      items.push(`${n} line${n === 1 ? '' : 's'} name no manufacturer`);
    }
    return items;
  }, [summary]);

  const canCreate = !!proposalId && !!projectId && !!preview && !createOrder.isPending;

  const handleCreate = async () => {
    if (!proposalId || !projectId) return;
    try {
      const salesOrderId = await createOrder.mutateAsync({
        proposalId,
        input: {
          organization_id: organizationId,
          project_id: projectId,
          company_id: companyId || null,
          customer_po_number: customerPO.trim() || null,
          contract_vehicle: contractVehicle.trim() || null,
          status: 'Draft',
        },
      });
      onOpenChange(false);
      onCreated?.(salesOrderId);
    } catch {
      // Reported as a toast by the mutation hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Create sales order{proposalNumber ? ` from ${proposalNumber}` : ''}
          </DialogTitle>
          <DialogDescription>
            The proposal&rsquo;s priced lines become order lines that can be
            purchased, received, and installed independently.
          </DialogDescription>
        </DialogHeader>

        {previewError ? (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              This proposal cannot be ordered
            </p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-400">
              {(previewError as Error).message}
            </p>
          </div>
        ) : previewLoading ? (
          <div className="py-10 text-center text-sm text-gray-500">
            Working out what this order contains…
          </div>
        ) : summary ? (
          <div className="space-y-4">
            {/* What will be created */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Lines', value: `${summary.lineCount}` },
                { label: 'Units', value: `${summary.totalQuantity}` },
                { label: 'Cost', value: formatCurrency(summary.totalCost) },
                { label: 'Sell', value: formatCurrency(summary.totalSell) },
              ].map(tile => (
                <div
                  key={tile.label}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                >
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    {tile.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                    {tile.value}
                  </p>
                </div>
              ))}
            </div>

            {blockers.length > 0 ? (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                <div className="flex items-start gap-2">
                  <Warning className="w-4 h-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-300">
                      {blockers.join(', ')}
                    </p>
                    <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
                      The order is still created — this is scope the customer bought.
                      Those lines just cannot be grouped into an order with anyone
                      until the specification names who supplies them.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-sm text-emerald-800 dark:text-emerald-300">
                <CheckCircle className="w-4 h-4" />
                {summary.manufacturers.length === 1
                  ? 'Every line names a manufacturer and is ready to order.'
                  : `Every line names a manufacturer — ${summary.manufacturers.length} in total.`}
              </div>
            )}

            {/* Order details */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <Select
                  value={companyId || 'none'}
                  onValueChange={v => setCompanyId(v === 'none' ? '' : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="co-po">Customer PO number</Label>
                <Input
                  id="co-po"
                  value={customerPO}
                  onChange={e => setCustomerPO(e.target.value)}
                  placeholder="They will expect this on the invoice"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="co-contract">Contract vehicle</Label>
                <Input
                  id="co-contract"
                  value={contractVehicle}
                  onChange={e => setContractVehicle(e.target.value)}
                  placeholder="GSA, Omnia, E&I…"
                />
                <p className="text-[11px] text-gray-500">
                  Selects which vendor discount applies.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createOrder.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate}>
            {createOrder.isPending ? 'Creating…' : 'Create order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateOrderDialog;
