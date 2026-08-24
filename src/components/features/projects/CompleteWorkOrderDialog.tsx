/**
 * Complete Work Order Dialog
 *
 * Closing out a day on site. This is what moves a job from "installing" to
 * "ready to bill", so it is the last link in the chain that started at the
 * quote — and until it exists, a job can be scheduled but never finished.
 *
 * Quantities default to what was planned, because a day that went as planned is
 * the common case and a crew lead should be able to confirm it in one click.
 * Everything stays editable: crews routinely finish part of a run and leave the
 * rest for a punch visit, and a completion screen that cannot express that
 * forces someone to lie to it.
 *
 * Completing writes `installed` events, so installed quantities stay derived.
 * Nothing here updates a counter.
 */

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Warning } from '@phosphor-icons/react';
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
import {
  useWorkOrderLines,
  useCompleteWorkOrder,
  type WorkOrder,
} from '@/hooks/queries/useWorkOrders';
import { useOrderLines } from '@/hooks/queries/useSalesOrders';
import { cn } from '@/lib/utils';

interface CompleteWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder: WorkOrder | null;
  salesOrderId?: string | null;
}

export function CompleteWorkOrderDialog({
  open,
  onOpenChange,
  workOrder,
  salesOrderId,
}: CompleteWorkOrderDialogProps) {
  const { data: lines = [] } = useWorkOrderLines(workOrder?.id);
  const { data: orderLines = [] } = useOrderLines(salesOrderId ?? undefined);
  const complete = useCompleteWorkOrder();

  const [done, setDone] = useState<Record<string, string>>({});

  const describe = useMemo(
    () => Object.fromEntries(orderLines.map(l => [l.id, l.description])),
    [orderLines]
  );

  useEffect(() => {
    if (!open) return;
    setDone({});
  }, [open]);

  // Seed planned quantities as lines arrive, filling only missing keys so a
  // refetch cannot overwrite what the crew lead has already corrected.
  useEffect(() => {
    if (!open) return;
    setDone(prev => {
      let added = false;
      const next = { ...prev };
      for (const line of lines) {
        if (next[line.id]) continue;
        next[line.id] = String(Number(line.quantity));
        added = true;
      }
      return added ? next : prev;
    });
  }, [open, lines]);

  const totals = useMemo(() => {
    let planned = 0;
    let completed = 0;
    for (const line of lines) {
      planned += Number(line.quantity);
      const n = Number(done[line.id]);
      completed += Number.isFinite(n) && n > 0 ? n : 0;
    }
    return { planned, completed, short: planned - completed };
  }, [lines, done]);

  const handleComplete = async () => {
    if (!workOrder) return;
    try {
      await complete.mutateAsync({
        workOrderId: workOrder.id,
        lines: lines.map(line => ({
          work_order_line_id: line.id,
          completed_quantity: Math.max(0, Number(done[line.id]) || 0),
        })),
      });
      onOpenChange(false);
    } catch {
      // Surfaced as a toast by the mutation hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Close out{workOrder?.work_order_number ? ` ${workOrder.work_order_number}` : ''}
          </DialogTitle>
          <DialogDescription>
            Quantities default to what was planned. Change any the crew did not
            finish — what is left stays outstanding and can go on a punch visit.
          </DialogDescription>
        </DialogHeader>

        {lines.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 py-8 text-center text-sm text-gray-500">
            This work order covers no lines.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[460px] text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2.5">Work</th>
                  <th className="px-3 py-2.5 text-right">Planned</th>
                  <th className="px-3 py-2.5 w-28">Completed</th>
                </tr>
              </thead>
              <tbody>
                {lines.map(line => {
                  const planned = Number(line.quantity);
                  const value = Number(done[line.id]);
                  const short = Number.isFinite(value) && value < planned;
                  return (
                    <tr
                      key={line.id}
                      className="border-t border-gray-100 dark:border-gray-700/50"
                    >
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                        {describe[line.order_line_id] ?? 'Line'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                        {planned}
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={done[line.id] ?? ''}
                          onChange={e =>
                            setDone(prev => ({ ...prev, [line.id]: e.target.value }))
                          }
                          aria-label={`Completed quantity for ${describe[line.order_line_id] ?? 'line'}`}
                          className={cn(
                            'h-8 tabular-nums',
                            short && 'border-amber-400 dark:border-amber-600'
                          )}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totals.short > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <span className="font-medium">{totals.short} left unfinished.</span>{' '}
              That quantity stays outstanding on the order and can be scheduled
              as a punch visit.
            </p>
          </div>
        )}

        <DialogFooter className="items-center gap-3 sm:justify-between">
          <span className="text-sm text-gray-500">
            <CheckCircle className="mr-1.5 -mt-0.5 inline h-4 w-4" />
            <span className="tabular-nums font-medium text-gray-900 dark:text-gray-100">
              {totals.completed}
            </span>{' '}
            of {totals.planned} installed
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={lines.length === 0 || complete.isPending}
            >
              {complete.isPending ? 'Closing…' : 'Complete work order'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CompleteWorkOrderDialog;
