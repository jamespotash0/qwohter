/**
 * Import Specification Dialog
 *
 * A designer's export becomes a sales order.
 *
 * The mapping step is deliberate, not a fallback. SIF is a family of formats
 * rather than one, and a dealer's first import is also how they find out their
 * tool exports something unexpected — far better then than after 500 lines have
 * landed wrong. The guess from the header labels is usually right, so
 * confirming it costs one glance.
 *
 * Nothing is written until the preview has been read. What gets rejected is
 * shown with the reason, because the failure that matters here is silent: a
 * line imported at zero cost reads as pure margin, and a job quoted off it
 * loses money in a way nobody notices until the invoice.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { UploadSimple, Warning, CheckCircle } from '@phosphor-icons/react';
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
import { parseSpecFile, type ParsedFile } from '@/lib/sif/parse';
import {
  guessMapping,
  missingRequired,
  rowsToOrderLines,
  type ColumnMapping,
  type MappableField,
} from '@/lib/sif/map';
import { cn } from '@/lib/utils';

const FIELD_LABELS: [MappableField, string][] = [
  ['manufacturer_name', 'Manufacturer'],
  ['description', 'Description'],
  ['model_number', 'Part number'],
  ['series_name', 'Series'],
  ['option_string', 'Options'],
  ['area', 'Area'],
  ['spec_phase', 'Phase'],
  ['quantity', 'Quantity'],
  ['list_price', 'List price'],
  ['dealer_discount_percent', 'Discount %'],
  ['unit_cost', 'Cost'],
  ['sell_price', 'Sell price'],
  ['source_line_number', 'Source line #'],
];

const NONE = '__none__';

interface ImportSpecDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (
    lines: ReturnType<typeof rowsToOrderLines>['lines'],
    fileName: string
  ) => Promise<void> | void;
  isImporting?: boolean;
}

export function ImportSpecDialog({
  open,
  onOpenChange,
  onImport,
  isImporting,
}: ImportSpecDialogProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [fallbackDiscount, setFallbackDiscount] = useState('');

  useEffect(() => {
    if (open) return;
    setFileName('');
    setParsed(null);
    setMapping({});
    setFallbackDiscount('');
  }, [open]);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const text = await file.text();
    const result = parseSpecFile(text);
    setFileName(file.name);
    setParsed(result);
    setMapping(guessMapping(result.headers));
  };

  const discount =
    fallbackDiscount.trim() === '' ? undefined : Number(fallbackDiscount);

  const result = useMemo(() => {
    if (!parsed) return null;
    return rowsToOrderLines(parsed.rows, mapping, {
      fallbackDiscountPercent:
        discount !== undefined && Number.isFinite(discount) ? discount : undefined,
    });
  }, [parsed, mapping, discount]);

  const missing = missingRequired(mapping);
  const totals = useMemo(() => {
    if (!result) return { cost: 0, list: 0 };
    let cost = 0;
    let list = 0;
    for (const line of result.lines) {
      cost += line.quantity * line.unit_cost;
      list += line.quantity * (line.list_price ?? 0);
    }
    return { cost, list };
  }, [result]);

  const canImport =
    !!result && result.lines.length > 0 && missing.length === 0 && !isImporting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import a specification</DialogTitle>
          <DialogDescription>
            An export from CET, Giza, or 2020. Check the column mapping before
            importing — a file exported for a spreadsheet rarely labels its
            columns the way the next one does.
          </DialogDescription>
        </DialogHeader>

        {!parsed ? (
          <button
            onClick={() => fileInput.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-14 transition-colors hover:border-gray-400 dark:hover:border-gray-600"
          >
            <UploadSimple className="h-6 w-6 text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Choose a specification file
            </span>
            <span className="text-xs text-gray-500">
              Comma, tab, semicolon, or pipe delimited
            </span>
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {fileName}
                </p>
                <p className="text-xs text-gray-500">
                  {parsed.rows.length} rows ·{' '}
                  {parsed.delimiter === '\t'
                    ? 'tab'
                    : parsed.delimiter === '|'
                      ? 'pipe'
                      : parsed.delimiter === ';'
                        ? 'semicolon'
                        : 'comma'}{' '}
                  delimited
                  {parsed.hasHeaderRow ? ' · header row detected' : ' · no header row'}
                  {parsed.skipped.length > 0 &&
                    ` · ${parsed.skipped.length} non-record line${parsed.skipped.length === 1 ? '' : 's'} skipped`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                Choose another
              </Button>
            </div>

            {/* Mapping */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Column mapping
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {FIELD_LABELS.map(([field, label]) => {
                  const required = field === 'manufacturer_name' || field === 'description';
                  const value = mapping[field];
                  return (
                    <div key={field} className="flex items-center gap-2">
                      <Label
                        className={cn(
                          'w-28 shrink-0 text-xs',
                          required && value === undefined && 'text-amber-600 dark:text-amber-400'
                        )}
                      >
                        {label}
                        {required && ' *'}
                      </Label>
                      <Select
                        value={value === undefined ? NONE : String(value)}
                        onValueChange={v =>
                          setMapping(prev => ({
                            ...prev,
                            [field]: v === NONE ? undefined : Number(v),
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Not in this file</SelectItem>
                          {parsed.headers.map((header, i) => (
                            <SelectItem key={`${header}-${i}`} value={String(i)}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>

            {mapping.dealer_discount_percent === undefined &&
              mapping.unit_cost === undefined && (
                <div className="flex flex-wrap items-end gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="imp-disc" className="text-xs text-amber-800 dark:text-amber-300">
                      Discount off list for this file
                    </Label>
                    <Input
                      id="imp-disc"
                      type="number"
                      min={0}
                      max={100}
                      value={fallbackDiscount}
                      onChange={e => setFallbackDiscount(e.target.value)}
                      placeholder="55"
                      className="h-8 w-28"
                    />
                  </div>
                  <p className="flex-1 text-sm text-amber-800 dark:text-amber-300">
                    This file carries no cost and no discount column. Without a
                    rate every line imports at list, which reads as zero margin.
                  </p>
                </div>
              )}

            {/* What will be created */}
            {result && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Lines', value: String(result.lines.length) },
                  { label: 'List value', value: formatCurrency(totals.list) },
                  { label: 'Your cost', value: formatCurrency(totals.cost) },
                  {
                    label: 'Flagged',
                    value: String(result.rejected.length),
                    warn: result.rejected.length > 0,
                  },
                ].map(tile => (
                  <div
                    key={tile.label}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                  >
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      {tile.label}
                    </p>
                    <p
                      className={cn(
                        'mt-0.5 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100',
                        tile.warn && 'text-amber-600 dark:text-amber-400'
                      )}
                    >
                      {tile.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Preview */}
            {result && result.lines.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2 w-10">#</th>
                      <th className="px-3 py-2">Manufacturer</th>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">List</th>
                      <th className="px-3 py-2 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.lines.slice(0, 8).map(line => (
                      <tr
                        key={line.line_number}
                        className="border-t border-gray-100 dark:border-gray-700/50"
                      >
                        <td className="px-3 py-2 text-xs text-gray-400 tabular-nums">
                          {line.line_number}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                          {line.manufacturer_name ?? (
                            <span className="text-amber-600 dark:text-amber-400">
                              None
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                          {line.description}
                          {line.option_string && (
                            <span className="block text-xs text-gray-500">
                              {line.option_string}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {line.quantity}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                          {line.list_price === null ? '—' : formatCurrency(line.list_price)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCurrency(line.unit_cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.lines.length > 8 && (
                  <p className="border-t border-gray-100 dark:border-gray-700/50 px-3 py-2 text-xs text-gray-500">
                    and {result.lines.length - 8} more
                  </p>
                )}
              </div>
            )}

            {/* Never silent */}
            {result && result.rejected.length > 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                <div className="flex items-start gap-2">
                  <Warning className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="min-w-0 text-sm text-amber-800 dark:text-amber-300">
                    <p className="font-medium">
                      {result.rejected.length} row
                      {result.rejected.length === 1 ? '' : 's'} need a look
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {result.rejected.slice(0, 5).map(r => (
                        <li key={r.rowNumber}>
                          Row {r.rowNumber}: {r.reason}
                        </li>
                      ))}
                      {result.rejected.length > 5 && (
                        <li>and {result.rejected.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {missing.length > 0 && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Map {missing.map(f => FIELD_LABELS.find(([k]) => k === f)?.[1]).join(' and ')}{' '}
                before importing.
              </p>
            )}

            {result && result.lines.length > 0 && result.rejected.length === 0 && (
              <p className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                Every row priced and accounted for.
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
          aria-label="Specification file"
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => result && onImport(result.lines, fileName)}
            disabled={!canImport}
          >
            {isImporting
              ? 'Importing…'
              : result
                ? `Import ${result.lines.length} lines`
                : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImportSpecDialog;
