/**
 * Revision Dialog
 *
 * A revised specification, against the order already on the job.
 *
 * The chronic disaster this exists for: the designer revises after the quote is
 * signed, and nobody can tell which of 520 lines moved. Everyone re-reads the
 * whole file, or nobody does — and the second is what actually happens.
 *
 * Two things it refuses to do. It will not apply a change to product already on
 * a manufacturer order, because that edits what the factory was told to build;
 * those lead the list and are excluded from the apply. And it never resequences
 * line numbers, because a line number is what a factory and a warehouse quote
 * back at you.
 */

import { useMemo, useRef, useState } from 'react';
import { UploadSimple, Plus, Minus, PencilSimple, Lock } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/pricing';
import { parseSpecFile } from '@/lib/sif/parse';
import { guessMapping, rowsToOrderLines } from '@/lib/sif/map';
import { diffSpecification, sortDiff, type LineChange } from '@/lib/sif/diff';
import { useLinesForDiff, useApplyRevision } from '@/hooks/queries/useSalesOrders';
import { cn } from '@/lib/utils';

const KIND_META: Record<
  string,
  { label: string; icon: typeof Plus; tone: string; row: string }
> = {
  added: {
    label: 'Added',
    icon: Plus,
    tone: 'text-emerald-600 dark:text-emerald-400',
    row: 'bg-emerald-50/50 dark:bg-emerald-900/10',
  },
  removed: {
    label: 'Removed',
    icon: Minus,
    tone: 'text-red-600 dark:text-red-400',
    row: 'bg-red-50/50 dark:bg-red-900/10',
  },
  quantity: { label: 'Quantity', icon: PencilSimple, tone: 'text-amber-600 dark:text-amber-400', row: '' },
  cost: { label: 'Cost', icon: PencilSimple, tone: 'text-amber-600 dark:text-amber-400', row: '' },
  options: { label: 'Options', icon: PencilSimple, tone: 'text-violet-600 dark:text-violet-400', row: '' },
  unchanged: { label: 'Unchanged', icon: PencilSimple, tone: 'text-gray-400', row: '' },
};

interface RevisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salesOrderId: string;
}

export function RevisionDialog({ open, onOpenChange, salesOrderId }: RevisionDialogProps) {
  const { data: existing = [] } = useLinesForDiff(open ? salesOrderId : undefined);
  const applyRevision = useApplyRevision();
  const fileInput = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [incoming, setIncoming] = useState<ReturnType<typeof rowsToOrderLines>['lines']>([]);
  const [showUnchanged, setShowUnchanged] = useState(false);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const parsed = parseSpecFile(await file.text());
    const mapping = guessMapping(parsed.headers);
    setIncoming(rowsToOrderLines(parsed.rows, mapping).lines);
    setFileName(file.name);
  };

  const diff = useMemo(() => {
    if (incoming.length === 0) return null;
    return diffSpecification(existing, incoming);
  }, [existing, incoming]);

  const visible = useMemo(() => {
    if (!diff) return [];
    const sorted = sortDiff(diff.changes);
    return showUnchanged ? sorted : sorted.filter(c => c.kind !== 'unchanged');
  }, [diff, showUnchanged]);

  const handleApply = async () => {
    if (!diff) return;
    // Blocked changes are excluded here and refused again by the database.
    const safe = (c: LineChange) => !c.alreadyOrdered;

    await applyRevision.mutateAsync({
      salesOrderId,
      payload: {
        updates: diff.modified.filter(safe).map(c => ({
          id: c.existing!.id,
          quantity: c.incoming!.quantity,
          unit_cost: c.incoming!.unit_cost,
          list_price: c.incoming!.list_price,
          dealer_discount_percent: c.incoming!.dealer_discount_percent,
          option_string: c.incoming!.option_string,
          description: c.incoming!.description,
        })),
        additions: diff.added.map(c => c.incoming as unknown as Record<string, unknown>),
        removals: diff.removed.filter(safe).map(c => ({ id: c.existing!.id })),
      },
    });
    onOpenChange(false);
    setIncoming([]);
    setFileName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare a revised specification</DialogTitle>
          <DialogDescription>
            Matched line for line against this order, so renumbering does not
            read as everything having changed.
          </DialogDescription>
        </DialogHeader>

        {!diff ? (
          <button
            onClick={() => fileInput.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-14 transition-colors hover:border-gray-400 dark:hover:border-gray-600"
          >
            <UploadSimple className="h-6 w-6 text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Choose the revised file
            </span>
            <span className="text-xs text-gray-500">
              Comparing against {existing.length} lines on this order
            </span>
          </button>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { label: 'Added', value: diff.added.length },
                { label: 'Removed', value: diff.removed.length },
                { label: 'Changed', value: diff.modified.length },
                { label: 'Unchanged', value: diff.unchanged.length },
                {
                  label: 'Net cost',
                  value: formatCurrency(diff.netCostDelta),
                  warn: diff.netCostDelta > 0,
                },
              ].map(t => (
                <div
                  key={t.label}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                >
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    {t.label}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100',
                      t.warn && 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {t.value}
                  </p>
                </div>
              ))}
            </div>

            {diff.blocked.length > 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                <div className="flex items-start gap-2">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    <span className="font-medium">
                      {diff.blocked.length} change
                      {diff.blocked.length === 1 ? '' : 's'} touch product already
                      ordered.
                    </span>{' '}
                    These are left alone — editing a line the factory has been
                    told to build destroys the record of what was ordered. Raise
                    a change order or cancel with the manufacturer instead.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                {fileName} · {incoming.length} lines
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUnchanged(v => !v)}
              >
                {showUnchanged ? 'Hide unchanged' : `Show ${diff.unchanged.length} unchanged`}
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2 w-28">Change</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">What moved</th>
                    <th className="px-3 py-2 text-right w-32">Cost delta</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((change, i) => {
                    const meta = KIND_META[change.kind] ?? KIND_META.unchanged!;
                    const Icon = meta.icon;
                    const line = change.incoming ?? change.existing;
                    return (
                      <tr
                        key={`${change.kind}-${change.existing?.id ?? ''}-${i}`}
                        className={cn(
                          'border-t border-gray-100 dark:border-gray-700/50',
                          meta.row,
                          change.alreadyOrdered &&
                            change.kind !== 'unchanged' &&
                            'bg-amber-50/60 dark:bg-amber-900/10'
                        )}
                      >
                        <td className="px-3 py-2">
                          <span className={cn('inline-flex items-center gap-1 text-xs font-medium', meta.tone)}>
                            {change.alreadyOrdered && change.kind !== 'unchanged' ? (
                              <Lock className="h-3.5 w-3.5" />
                            ) : (
                              <Icon className="h-3.5 w-3.5" />
                            )}
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <p className="text-gray-900 dark:text-gray-100">
                            {line?.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {[
                              change.existing
                                ? `Line ${change.existing.line_number}`
                                : 'New',
                              line?.model_number,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                          {change.details.map(d => (
                            <span key={d} className="block">
                              {d}
                            </span>
                          ))}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2 text-right tabular-nums',
                            change.costDelta > 0
                              ? 'text-red-600 dark:text-red-400'
                              : change.costDelta < 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-gray-400'
                          )}
                        >
                          {change.costDelta === 0 ? '—' : formatCurrency(change.costDelta)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {diff.modified.length === 0 &&
              diff.added.length === 0 &&
              diff.removed.length === 0 && (
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  Nothing changed. This revision matches the order as it stands.
                </p>
              )}
          </div>
        )}

        <input
          ref={fileInput}
          type="file"
          accept=".sif,.txt,.csv,.tsv,text/*"
          className="hidden"
          onChange={handleFile}
          aria-label="Revised specification file"
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={
              !diff ||
              applyRevision.isPending ||
              diff.added.length + diff.removed.length + diff.modified.length === 0
            }
          >
            {applyRevision.isPending
              ? 'Applying…'
              : diff
                ? `Apply ${
                    diff.added.length +
                    diff.removed.filter(c => !c.alreadyOrdered).length +
                    diff.modified.filter(c => !c.alreadyOrdered).length
                  } changes`
                : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RevisionDialog;
