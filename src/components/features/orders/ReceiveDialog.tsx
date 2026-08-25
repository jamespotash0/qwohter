/**
 * Receive Dialog
 *
 * What came off the truck, against what is still owed.
 *
 * Quantities pre-fill with what is outstanding, because a full delivery is the
 * common case and a receiving clerk should not retype numbers the system
 * already knows. Everything remains editable: partials, shortages, and
 * overages are all normal, and a clerk must be able to record what is
 * physically on the dock rather than what the paperwork expected.
 *
 * Damage sits beside received quantity rather than replacing it, and the
 * running summary says plainly that damaged product is still owed — because
 * the one thing a receiving screen must not do is let a job look complete
 * while broken product sits in the warehouse.
 */

import { useEffect, useMemo, useState } from 'react';
import { Warning, Package } from '@phosphor-icons/react';
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
import { useCreateReceipt } from '@/hooks/queries/useReceipts';
import { useOrderLines, useOrderFulfillment } from '@/hooks/queries/useSalesOrders';
import { usePOLines } from '@/hooks/queries/useVarianceQueue';
import { useShipmentLines } from '@/hooks/queries/useShipments';
import { summarizeReceipt, buildReceiptLines } from '@/lib/pricing';
import { cn } from '@/lib/utils';

interface ReceiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  salesOrderId: string;
  /** Which manufacturer order this delivery satisfies, if known. */
  vendorPOId?: string | null;
  /**
   * The shipment being counted, when the delivery was tracked in.
   *
   * Recording it is what lets "the carrier said delivered" and "we counted it"
   * be compared — which is the entire point of tracking a shipment rather than
   * just watching one.
   */
  shipmentId?: string | null;
  poNumber?: string | null;
  manufacturerName?: string | null;
  /**
   * Restricts the lines shown. Rarely needed: when `vendorPOId` is given the
   * dialog scopes itself to that order's lines automatically.
   */
  orderLineIds?: string[];
}

interface LineEntry {
  received: string;
  damaged: string;
  damageNotes: string;
}

export function ReceiveDialog({
  open,
  onOpenChange,
  organizationId,
  salesOrderId,
  vendorPOId,
  shipmentId,
  poNumber,
  manufacturerName,
  orderLineIds,
}: ReceiveDialogProps) {
  const { data: allLines = [] } = useOrderLines(salesOrderId);
  const { data: fulfillment = {} } = useOrderFulfillment(salesOrderId);
  // Lines belonging to the manufacturer order being received against.
  const { data: poLines = [] } = usePOLines(vendorPOId ?? undefined);
  // What this particular truck was carrying, when the delivery was tracked in.
  const { data: shipmentLines = [] } = useShipmentLines(shipmentId ?? undefined);
  const createReceipt = useCreateReceipt();

  const [receivedDate, setReceivedDate] = useState('');
  const [carrier, setCarrier] = useState('');
  const [billOfLading, setBillOfLading] = useState('');
  const [entries, setEntries] = useState<Record<string, LineEntry>>({});

  /**
   * Which lines this delivery can cover.
   *
   * Scoped to the manufacturer order automatically when there is one. Showing
   * every outstanding line would let a clerk record Steelcase product against a
   * Haworth delivery — which saves cleanly, reads as progress, and leaves the
   * Steelcase order looking untouched while its product sits in the warehouse.
   * Derived here rather than left to the caller so it cannot be forgotten.
   */
  const allowedIds = useMemo(() => {
    if (orderLineIds) return new Set(orderLineIds);
    // A shipment's manifest is the tightest scope there is: it names what was
    // physically on this truck, which is narrower than everything the
    // manufacturer still owes.
    if (shipmentId && shipmentLines.length > 0) {
      return new Set(shipmentLines.map(l => l.order_line_id));
    }
    if (vendorPOId && poLines.length > 0) {
      return new Set(poLines.map(l => l.order_line_id));
    }
    return null;
  }, [orderLineIds, vendorPOId, poLines, shipmentId, shipmentLines]);

  // Only lines with something still owed. A fully received line on a partial
  // delivery is noise, and hiding it keeps the clerk's eye on the short ones.
  const lines = useMemo(() => {
    const scoped = allowedIds
      ? allLines.filter(line => allowedIds.has(line.id))
      : allLines;
    return scoped.filter(line => Number(fulfillment[line.id]?.qty_to_receive ?? 0) > 0);
  }, [allLines, fulfillment, allowedIds]);

  // Reset on open. Separate from seeding below, because the lines this dialog
  // pre-fills from arrive asynchronously and are frequently not loaded yet at
  // the moment it opens.
  useEffect(() => {
    if (!open) return;
    setReceivedDate(new Date().toISOString().slice(0, 10));
    setCarrier('');
    setBillOfLading('');
    setEntries({});
  }, [open]);

  // Seed each line's outstanding quantity as the lines become available.
  // Deliberately fills only MISSING keys rather than rebuilding the map: this
  // effect re-runs whenever the queries refetch, and replacing wholesale would
  // wipe out whatever the clerk had already typed.
  useEffect(() => {
    if (!open) return;
    setEntries(prev => {
      let added = false;
      const next = { ...prev };
      for (const line of lines) {
        if (next[line.id]) continue;
        next[line.id] = {
          received: String(Number(fulfillment[line.id]?.qty_to_receive ?? 0)),
          damaged: '',
          damageNotes: '',
        };
        added = true;
      }
      // Returning the same reference when nothing changed stops this from
      // looping: `fulfillment` is a fresh object on every render.
      return added ? next : prev;
    });
  }, [open, lines, fulfillment]);

  const set = (lineId: string, patch: Partial<LineEntry>) =>
    setEntries(prev => ({
      ...prev,
      [lineId]: { received: '', damaged: '', damageNotes: '', ...prev[lineId], ...patch },
    }));

  const visibleIds = useMemo(() => lines.map(line => line.id), [lines]);

  // Summed over the visible lines only — see summarizeReceipt for why.
  const totals = useMemo(
    () => summarizeReceipt(entries, visibleIds),
    [entries, visibleIds]
  );

  const canSave =
    (totals.received > 0 || totals.damaged > 0) && !createReceipt.isPending;

  const handleSave = async () => {
    const payload = buildReceiptLines(entries, visibleIds);

    try {
      await createReceipt.mutateAsync({
        receipt: {
          organization_id: organizationId,
          sales_order_id: salesOrderId,
          vendor_po_id: vendorPOId ?? null,
          shipment_id: shipmentId ?? null,
          received_date: receivedDate || null,
          carrier: carrier.trim() || null,
          bill_of_lading: billOfLading.trim() || null,
        },
        lines: payload,
      });
      onOpenChange(false);
    } catch {
      // Surfaced as a toast by the mutation hook; keep the dialog open.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Receive delivery
            {manufacturerName ? ` — ${manufacturerName}` : ''}
          </DialogTitle>
          <DialogDescription>
            {poNumber ? `Against order ${poNumber}. ` : ''}
            Quantities are pre-filled with what is still owed. Damaged product is
            recorded but stays outstanding, because it still has to be delivered.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rcv-date" className="text-xs">Received</Label>
              <Input
                id="rcv-date"
                type="date"
                value={receivedDate}
                onChange={e => setReceivedDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rcv-carrier" className="text-xs">Carrier</Label>
              <Input
                id="rcv-carrier"
                value={carrier}
                onChange={e => setCarrier(e.target.value)}
                placeholder="ABF, Estes…"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rcv-bol" className="text-xs">Bill of lading</Label>
              <Input
                id="rcv-bol"
                value={billOfLading}
                onChange={e => setBillOfLading(e.target.value)}
                placeholder="What a claim is filed with"
                className="h-9"
              />
            </div>
          </div>

          {lines.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 py-10 text-center text-sm text-gray-500">
              Nothing outstanding to receive on this order.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2.5 w-10">#</th>
                    <th className="px-3 py-2.5">Item</th>
                    <th className="px-3 py-2.5 text-right w-20">Owed</th>
                    <th className="px-3 py-2.5 w-28">Received</th>
                    <th className="px-3 py-2.5 w-28">Damaged</th>
                    <th className="px-3 py-2.5">Damage notes</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map(line => {
                    const owed = Number(fulfillment[line.id]?.qty_to_receive ?? 0);
                    const entry = entries[line.id];
                    const damaged = Number(entry?.damaged) || 0;
                    return (
                      <tr
                        key={line.id}
                        className="border-t border-gray-100 dark:border-gray-700/50"
                      >
                        <td className="px-3 py-2 text-xs text-gray-400 tabular-nums">
                          {line.line_number}
                        </td>
                        <td className="px-3 py-2">
                          <p className="text-gray-900 dark:text-gray-100">
                            {line.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {[line.manufacturer_name, line.model_number, line.area]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                          {owed}
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min={0}
                            value={entry?.received ?? ''}
                            onChange={e => set(line.id, { received: e.target.value })}
                            aria-label={`Quantity received for line ${line.line_number}`}
                            className="h-8 tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min={0}
                            value={entry?.damaged ?? ''}
                            onChange={e => set(line.id, { damaged: e.target.value })}
                            aria-label={`Quantity damaged for line ${line.line_number}`}
                            className={cn(
                              'h-8 tabular-nums',
                              damaged > 0 && 'border-red-400 dark:border-red-600'
                            )}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={entry?.damageNotes ?? ''}
                            onChange={e => set(line.id, { damageNotes: e.target.value })}
                            placeholder={damaged > 0 ? 'What was wrong with it' : ''}
                            disabled={damaged === 0}
                            aria-label={`Damage notes for line ${line.line_number}`}
                            className="h-8"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totals.damaged > 0 && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
              <div className="flex items-start gap-2">
                <Warning className="w-4 h-4 mt-0.5 text-red-600 dark:text-red-400 shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-300">
                  <span className="font-medium">
                    {totals.damaged} damaged
                  </span>{' '}
                  — still owed on the order, and worth a freight claim while the
                  carrier&rsquo;s window is open. Photograph it and attach the
                  photos to this order.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="items-center gap-3 sm:justify-between">
          <span className="text-sm text-gray-500">
            <Package className="inline w-4 h-4 mr-1.5 -mt-0.5" />
            <span className="tabular-nums font-medium text-gray-900 dark:text-gray-100">
              {totals.received}
            </span>{' '}
            received
            {totals.damaged > 0 && (
              <>
                {', '}
                <span className="tabular-nums font-medium text-red-600 dark:text-red-400">
                  {totals.damaged}
                </span>{' '}
                damaged
              </>
            )}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {createReceipt.isPending ? 'Recording…' : 'Record delivery'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ReceiveDialog;
