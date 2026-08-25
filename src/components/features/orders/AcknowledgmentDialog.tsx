/**
 * Acknowledgment Dialog
 *
 * Record what a manufacturer actually came back with, line by line.
 *
 * Each line pre-fills with what was ordered, so confirming an unchanged
 * acknowledgment is one click and only the lines that moved need typing. The
 * running variance total updates as you type, because the number a dealer wants
 * is not "what did they say" but "what is this costing me".
 */

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { UploadSimple } from '@phosphor-icons/react';
import { Callout } from '@/components/common/backoffice';
import {
  ingestAcknowledgmentFile,
  type AckIngestResult,
  type MatchTarget,
} from '@/lib/ack';
import { formatCurrency, round2 } from '@/lib/pricing';
import { usePOLines, useAcknowledgePOLines } from '@/hooks/queries/useVarianceQueue';
import { cn } from '@/lib/utils';
import type { POLine } from '@/services/vendorPOService';

interface AcknowledgmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorPOId: string | null;
  poNumber?: string | null;
  manufacturerName?: string | null;
  requestedShipDate?: string | null;
  /** Order line id → description, so the dialog can label rows. */
  lineLabels?: Record<string, string>;
  /**
   * Order line id → model number. Only used for matching an uploaded
   * acknowledgment: the manufacturer writes their own part numbers, not our
   * line numbers, so the model is the one stable thing to match on.
   */
  lineModels?: Record<string, string | null>;
}

interface Entry {
  quantity: string;
  unitCost: string;
}

export function AcknowledgmentDialog({
  open,
  onOpenChange,
  vendorPOId,
  poNumber,
  manufacturerName,
  requestedShipDate,
  lineLabels = {},
  lineModels = {},
}: AcknowledgmentDialogProps) {
  const { data, isLoading } = usePOLines(open ? (vendorPOId ?? undefined) : undefined);
  // Memoized rather than defaulted inline: `data ?? []` builds a new array on
  // every render, and this list is an effect dependency below — an unstable
  // reference there sets state forever.
  const poLines = useMemo(() => data ?? [], [data]);
  const acknowledge = useAcknowledgePOLines();

  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [ackNumber, setAckNumber] = useState('');
  const [shipDate, setShipDate] = useState('');
  const [ingest, setIngest] = useState<AckIngestResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Pre-fill with what was ordered: an unchanged acknowledgment is the common
  // case and should not require retyping every figure.
  useEffect(() => {
    if (!open) return;
    setAckNumber('');
    setShipDate(requestedShipDate ?? '');
    setIngest(null);
    setEntries(
      Object.fromEntries(
        poLines.map((line: POLine) => [
          line.id,
          {
            quantity: `${Number(line.acked_quantity ?? line.quantity)}`,
            unitCost: `${Number(line.acked_unit_cost ?? line.unit_cost)}`,
          },
        ])
      )
    );
  }, [open, poLines, requestedShipDate]);

  // What an uploaded acknowledgment gets matched against. Description and model
  // come from the order line, since a PO line only references one.
  const matchTargets = useMemo<MatchTarget[]>(
    () =>
      poLines.map((line: POLine) => ({
        poLineId: line.id,
        lineNumber: line.line_number,
        modelNumber: lineModels[line.order_line_id] ?? null,
        description: lineLabels[line.order_line_id] ?? null,
        quantity: Number(line.quantity),
        unitCost: Number(line.unit_cost),
      })),
    [poLines, lineLabels, lineModels]
  );

  const handleUpload = async (file: File) => {
    const result = ingestAcknowledgmentFile(await file.text(), matchTargets);
    setIngest(result);

    // Nothing is saved here. The figures land in the form and the person who
    // uploaded the file still has to agree to them.
    if (result.appliedCount > 0) {
      setEntries(prev => ({ ...prev, ...result.applied }));
    }
    if (result.shipDate) setShipDate(result.shipDate);
    if (fileInput.current) fileInput.current.value = '';
  };

  const set = (lineId: string, field: keyof Entry, value: string) =>
    setEntries(prev => ({
      ...prev,
      [lineId]: { ...(prev[lineId] ?? { quantity: '', unitCost: '' }), [field]: value },
    }));

  const runningVariance = useMemo(() => {
    let total = 0;
    for (const line of poLines) {
      const entry = entries[line.id];
      if (!entry) continue;
      const qty = Number(entry.quantity);
      const cost = Number(entry.unitCost);
      if (!Number.isFinite(qty) || !Number.isFinite(cost)) continue;
      total += qty * cost - Number(line.quantity) * Number(line.unit_cost);
    }
    return round2(total);
  }, [poLines, entries]);

  const slipDays = useMemo(() => {
    if (!shipDate || !requestedShipDate) return 0;
    const diff =
      (new Date(shipDate).getTime() - new Date(requestedShipDate).getTime()) /
      86_400_000;
    return Math.round(diff);
  }, [shipDate, requestedShipDate]);

  const handleSave = async () => {
    if (!vendorPOId) return;
    try {
      await acknowledge.mutateAsync({
        vendorPOId,
        lines: poLines.map((line: POLine) => ({
          poLineId: line.id,
          ackedQuantity: Number(entries[line.id]?.quantity ?? line.quantity),
          ackedUnitCost: Number(entries[line.id]?.unitCost ?? line.unit_cost),
          ackedShipDate: shipDate || null,
        })),
        header: {
          vendorAckNumber: ackNumber.trim() || null,
          acknowledgedShipDate: shipDate || null,
        },
      });
      onOpenChange(false);
    } catch {
      // Reported as a toast by the mutation hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Record acknowledgment — {poNumber ?? 'Draft PO'}
            {manufacturerName ? ` · ${manufacturerName}` : ''}
          </DialogTitle>
          <DialogDescription>
            What the manufacturer confirmed. Lines start at what you ordered;
            change only the ones that moved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/*
            The manufacturer's own export, rather than retyping it. Delimited
            files are read here; the figures still have to be agreed to below.
          */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-gray-300 p-3 dark:border-gray-700">
            <input
              ref={fileInput}
              type="file"
              accept=".csv,.tsv,.txt,.sif"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInput.current?.click()}
              disabled={poLines.length === 0}
            >
              <UploadSimple className="mr-1.5 h-4 w-4" />
              Upload their acknowledgment
            </Button>
            <p className="flex-1 text-xs text-gray-500">
              A CSV or tab-delimited export. Rows are matched to lines on the part
              number, then the description — nothing is saved until you press
              Record below.
            </p>
          </div>

          {ingest?.error && <Callout tone="danger">{ingest.error}</Callout>}

          {ingest && !ingest.error && (
            <Callout
              tone={
                ingest.needsCheck.length > 0 ||
                ingest.unmatchedRows.length > 0 ||
                ingest.unmatchedTargets.length > 0
                  ? 'warn'
                  : 'success'
              }
              title={`Filled in ${ingest.appliedCount} of ${poLines.length} lines`}
            >
              <ul className="mt-0.5 space-y-0.5">
                {ingest.needsCheck.map(match => (
                  <li key={match.row.sourceRow}>
                    Row {match.row.sourceRow}
                    {match.row.description ? ` (${match.row.description})` : ''} —{' '}
                    {match.reason}. Not filled in.
                  </li>
                ))}
                {ingest.unmatchedRows.length > 0 && (
                  <li>
                    {ingest.unmatchedRows.length} row
                    {ingest.unmatchedRows.length === 1 ? '' : 's'} on their file
                    matched nothing on this order.
                  </li>
                )}
                {ingest.unmatchedTargets.length > 0 && (
                  <li>
                    {ingest.unmatchedTargets.length} line
                    {ingest.unmatchedTargets.length === 1 ? '' : 's'} on this order
                    were not mentioned — those stay at what you ordered.
                  </li>
                )}
              </ul>
            </Callout>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ack-number">Their acknowledgment number</Label>
              <Input
                id="ack-number"
                value={ackNumber}
                onChange={e => setAckNumber(e.target.value)}
                placeholder="Their reference"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ack-ship">Confirmed ship date</Label>
              <Input
                id="ack-ship"
                type="date"
                value={shipDate}
                onChange={e => setShipDate(e.target.value)}
              />
              {slipDays !== 0 && (
                <p
                  className={cn(
                    'text-xs',
                    slipDays > 0
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {slipDays > 0 ? `${slipDays} days later` : `${-slipDays} days earlier`} than
                  requested
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Line</th>
                  <th className="px-3 py-2 text-right">Ordered</th>
                  <th className="px-3 py-2 text-right w-24">Ack qty</th>
                  <th className="px-3 py-2 text-right w-28">Ack unit cost</th>
                  <th className="px-3 py-2 text-right">Variance</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                      Loading lines…
                    </td>
                  </tr>
                ) : (
                  poLines.map((line: POLine) => {
                    const entry = entries[line.id];
                    const qty = Number(entry?.quantity ?? line.quantity);
                    const cost = Number(entry?.unitCost ?? line.unit_cost);
                    const variance =
                      Number.isFinite(qty) && Number.isFinite(cost)
                        ? round2(qty * cost - Number(line.quantity) * Number(line.unit_cost))
                        : 0;

                    return (
                      <tr
                        key={line.id}
                        className="border-t border-gray-100 dark:border-gray-700/50"
                      >
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                          {lineLabels[line.order_line_id] ?? `Line ${line.line_number}`}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                          {Number(line.quantity)} @ {formatCurrency(Number(line.unit_cost))}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            value={entry?.quantity ?? ''}
                            onChange={e => set(line.id, 'quantity', e.target.value)}
                            className="h-8 text-right tabular-nums"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={entry?.unitCost ?? ''}
                            onChange={e => set(line.id, 'unitCost', e.target.value)}
                            className="h-8 text-right tabular-nums"
                          />
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2 text-right tabular-nums font-medium',
                            variance > 0
                              ? 'text-red-600 dark:text-red-400'
                              : variance < 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-gray-400'
                          )}
                        >
                          {variance === 0 ? '—' : formatCurrency(variance)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2 text-sm">
            <span className="text-gray-500">Total variance</span>
            <span
              className={cn(
                'tabular-nums text-lg font-semibold',
                runningVariance > 0
                  ? 'text-red-600 dark:text-red-400'
                  : runningVariance < 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500'
              )}
            >
              {formatCurrency(runningVariance)}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={acknowledge.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={acknowledge.isPending || isLoading}>
            {acknowledge.isPending ? 'Saving…' : 'Record acknowledgment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AcknowledgmentDialog;
