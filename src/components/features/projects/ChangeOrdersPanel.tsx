/**
 * Change Orders Panel
 *
 * The customer wants something different after signing.
 *
 * Today that is an email thread and a revised quote, and the reason it belongs
 * in the system is the gap between *requested* and *priced*: that is where a
 * dealer does work nobody has agreed to pay for. So the list leads with what is
 * unanswered, and an unpriced change order says so rather than showing a
 * confident zero.
 *
 * Approving one does not edit the signed order. It becomes its own scope —
 * which is what sales_orders was built for — because rewriting the original
 * destroys the record of what the customer actually agreed to.
 */

import { useState } from 'react';
import { Plus, ArrowsClockwise, Warning } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/pricing';
import {
  useChangeOrders,
  useCreateChangeOrder,
  useUpdateChangeOrder,
  OPEN_CHANGE_ORDER_STATUSES,
  type ChangeOrder,
  type ChangeOrderStatus,
} from '@/hooks/queries/useProjectHub';
import {
  tonePillClass,
  toneFor,
  CHANGE_ORDER_STATUS_TONES,
} from '@/components/common/backoffice';
import { cn } from '@/lib/utils';

const STATUSES: ChangeOrderStatus[] = [
  'Requested',
  'Pricing',
  'Submitted',
  'Approved',
  'Rejected',
  'Withdrawn',
];

interface ChangeOrdersPanelProps {
  organizationId: string;
  projectId: string;
}

export function ChangeOrdersPanel({ organizationId, projectId }: ChangeOrdersPanelProps) {
  const { data: changeOrders = [], isLoading } = useChangeOrders(projectId);
  const createChangeOrder = useCreateChangeOrder();
  const updateChangeOrder = useUpdateChangeOrder();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [description, setDescription] = useState('');

  const openOnes = changeOrders.filter(co =>
    OPEN_CHANGE_ORDER_STATUSES.includes(co.status as ChangeOrderStatus)
  );
  const unpriced = openOnes.filter(co => co.sell_delta === null);

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      await createChangeOrder.mutateAsync({
        organization_id: organizationId,
        project_id: projectId,
        title,
        description,
        change_order_number: number,
        requested_by_name: requestedBy,
      });
      setTitle('');
      setNumber('');
      setRequestedBy('');
      setDescription('');
      setOpen(false);
    } catch {
      // Surfaced as a toast by the mutation hook.
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Change orders
          </h3>
          <p className="text-xs text-gray-500">
            {openOnes.length === 0
              ? 'Nothing outstanding.'
              : `${openOnes.length} awaiting an answer.`}
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Log a change
        </Button>
      </div>

      {unpriced.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
          <div className="flex items-start gap-2">
            <Warning className="w-4 h-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <span className="font-medium">
                {unpriced.length} change{unpriced.length === 1 ? '' : 's'} not yet
                priced.
              </span>{' '}
              Work requested but not costed is work nobody has agreed to pay for.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="h-20 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
      ) : changeOrders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-10 text-center text-sm text-gray-500">
          No changes requested on this job.
        </p>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {changeOrders.map((co, index) => (
            <ChangeOrderRow
              key={co.id}
              changeOrder={co}
              isFirst={index === 0}
              onStatusChange={(status) =>
                updateChangeOrder.mutate({ changeOrderId: co.id, patch: { status } })
              }
              onPrice={(sell_delta, cost_delta) =>
                updateChangeOrder.mutate({
                  changeOrderId: co.id,
                  patch: { sell_delta, cost_delta },
                })
              }
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log a change request</DialogTitle>
            <DialogDescription>
              Record it when the customer asks, not when it gets priced — the gap
              between the two is the part worth seeing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="co-title" className="text-xs">What changed</Label>
              <Input
                id="co-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Add 12 guest chairs to reception"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="co-number" className="text-xs">Number</Label>
                <Input
                  id="co-number"
                  value={number}
                  onChange={e => setNumber(e.target.value)}
                  placeholder="CO-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="co-by" className="text-xs">Requested by</Label>
                <Input
                  id="co-by"
                  value={requestedBy}
                  onChange={e => setRequestedBy(e.target.value)}
                  placeholder="Who asked"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-desc" className="text-xs">Detail</Label>
              <Textarea
                id="co-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="What they asked for, and why"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!title.trim() || createChangeOrder.isPending}
            >
              {createChangeOrder.isPending ? 'Saving…' : 'Log it'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ChangeOrderRowProps {
  changeOrder: ChangeOrder;
  isFirst: boolean;
  onStatusChange: (status: ChangeOrderStatus) => void;
  onPrice: (sellDelta: number | null, costDelta: number | null) => void;
}

function ChangeOrderRow({
  changeOrder: co,
  isFirst,
  onStatusChange,
  onPrice,
}: ChangeOrderRowProps) {
  const [sell, setSell] = useState(co.sell_delta === null ? '' : String(co.sell_delta));
  const [cost, setCost] = useState(co.cost_delta === null ? '' : String(co.cost_delta));

  const priced = co.sell_delta !== null;
  const margin =
    co.sell_delta !== null && co.cost_delta !== null
      ? Number(co.sell_delta) - Number(co.cost_delta)
      : null;

  const commitPrice = () => {
    const s = sell.trim() === '' ? null : Number(sell);
    const c = cost.trim() === '' ? null : Number(cost);
    if (s !== null && !Number.isFinite(s)) return;
    if (c !== null && !Number.isFinite(c)) return;
    if (s === co.sell_delta && c === co.cost_delta) return;
    onPrice(s, c);
  };

  return (
    <div
      className={cn(
        'p-4',
        !isFirst && 'border-t border-gray-100 dark:border-gray-700/50'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ArrowsClockwise className="w-4 h-4 text-gray-400 shrink-0" />
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {co.title}
            </p>
            {co.change_order_number && (
              <span className="text-xs text-gray-500">{co.change_order_number}</span>
            )}
          </div>
          {co.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {co.description}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Requested {co.requested_at}
            {co.requested_by_name ? ` by ${co.requested_by_name}` : ''}
            {co.responded_at ? ` · answered ${co.responded_at}` : ''}
          </p>
        </div>

        <Select
          value={co.status ?? 'Requested'}
          onValueChange={v => onStatusChange(v as ChangeOrderStatus)}
        >
          <SelectTrigger
            className={cn(
              'h-7 w-[130px] border-0 text-xs font-medium',
              tonePillClass(toneFor(CHANGE_ORDER_STATUS_TONES, co.status ?? 'Requested'))
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-gray-500">
            Sell
          </Label>
          <Input
            value={sell}
            onChange={e => setSell(e.target.value)}
            onBlur={commitPrice}
            placeholder="Not priced"
            aria-label={`Sell impact for ${co.title}`}
            className="h-8 w-32 tabular-nums"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-gray-500">
            Cost
          </Label>
          <Input
            value={cost}
            onChange={e => setCost(e.target.value)}
            onBlur={commitPrice}
            placeholder="Not costed"
            aria-label={`Cost impact for ${co.title}`}
            className="h-8 w-32 tabular-nums"
          />
        </div>
        <div className="pb-1 text-sm">
          {margin !== null ? (
            <span
              className={cn(
                'tabular-nums font-medium',
                margin >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {formatCurrency(margin)} margin
            </span>
          ) : (
            // Deliberately not "$0.00" — not costed is a different fact.
            <span className="text-gray-400">
              {priced ? 'No cost recorded' : 'Not yet priced'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChangeOrdersPanel;
