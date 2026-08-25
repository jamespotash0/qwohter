/**
 * Shipment Dialog
 *
 * The moment a vendor emails "your order shipped, PRO 0123456789 via Estes".
 * Everything on this screen exists to get that email into the system in under a
 * minute, because the alternative — and the current state of the industry — is
 * that it stays in the inbox and someone phones the freight line every Tuesday.
 *
 * Two things it deliberately does not do:
 *
 *   * It does not ask for a status. Status comes from the carrier and nowhere
 *     else, so there is no field for it here at all.
 *
 *   * It does not require a manifest. A tracking number with no line list is
 *     still worth watching, and refusing to save one until someone types
 *     quantities is exactly how tracking numbers end up in a spreadsheet.
 */

import { useEffect, useMemo, useState } from 'react';
import { Truck, MagicWand } from '@phosphor-icons/react';
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateShipment, useDetectCarrier } from '@/hooks/queries/useShipments';
import { useOrderLines, useOrderFulfillment } from '@/hooks/queries/useSalesOrders';
import { usePOLines } from '@/hooks/queries/useVarianceQueue';
import {
  CARRIER_OPTIONS,
  isManualCarrierCode,
  carrierName,
  summarizeShipment,
  buildShipmentLines,
  canSaveShipment,
  type ShipmentEntry,
} from '@/lib/tracking';

interface ShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  salesOrderId: string;
  vendorPOId?: string | null;
  poNumber?: string | null;
  manufacturerName?: string | null;
}

const GROUPS: Array<'Parcel' | 'Freight' | 'Direct'> = ['Freight', 'Parcel', 'Direct'];

export function ShipmentDialog({
  open,
  onOpenChange,
  organizationId,
  salesOrderId,
  vendorPOId,
  poNumber,
  manufacturerName,
}: ShipmentDialogProps) {
  const { data: allLines = [] } = useOrderLines(salesOrderId);
  const { data: fulfillment = {} } = useOrderFulfillment(salesOrderId);
  const { data: poLines = [] } = usePOLines(vendorPOId ?? undefined);
  const createShipment = useCreateShipment();
  const detect = useDetectCarrier();

  const [carrierCode, setCarrierCode] = useState<string | null>(null);
  const [otherCarrier, setOtherCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [proNumber, setProNumber] = useState('');
  const [billOfLading, setBillOfLading] = useState('');
  const [shipDate, setShipDate] = useState('');
  const [pieceCount, setPieceCount] = useState('');
  const [entries, setEntries] = useState<Record<string, ShipmentEntry>>({});

  const isManual = isManualCarrierCode(carrierCode) || carrierCode === '__other__';
  const isFreight =
    CARRIER_OPTIONS.find(c => c.code === carrierCode)?.group === 'Freight';

  useEffect(() => {
    if (!open) return;
    setCarrierCode(null);
    setOtherCarrier('');
    setTrackingNumber('');
    setProNumber('');
    setBillOfLading('');
    setShipDate(new Date().toISOString().slice(0, 10));
    setPieceCount('');
    setEntries({});
  }, [open]);

  // Scoped to the manufacturer order when there is one — same reasoning as the
  // receiving dialog: a Steelcase line recorded as shipped on a Haworth truck
  // saves cleanly, reads as progress, and is wrong.
  const lines = useMemo(() => {
    const allowed =
      vendorPOId && poLines.length > 0
        ? new Set(poLines.map(l => l.order_line_id))
        : null;
    const scoped = allowed ? allLines.filter(l => allowed.has(l.id)) : allLines;
    return scoped.filter(l => Number(fulfillment[l.id]?.qty_to_receive ?? 0) > 0);
  }, [allLines, poLines, vendorPOId, fulfillment]);

  const visibleIds = useMemo(() => lines.map(l => l.id), [lines]);
  const totals = useMemo(() => summarizeShipment(entries, visibleIds), [entries, visibleIds]);

  /**
   * Carrier detection, on leaving the number field.
   *
   * Only ever fills a carrier the user has not chosen. Overwriting a deliberate
   * choice with a guess is how a correct entry silently becomes a wrong one.
   */
  const handleDetect = async () => {
    const number = (trackingNumber || proNumber).trim();
    if (!number || carrierCode) return;

    const candidates = await detect.mutateAsync(number);
    const match = candidates.find(code => CARRIER_OPTIONS.some(c => c.code === code));
    if (match) setCarrierCode(match);
  };

  const resolvedCode = carrierCode === '__other__' ? null : carrierCode;
  const canSave =
    canSaveShipment({
      carrierCode: carrierCode === '__other__' ? otherCarrier.trim() || null : carrierCode,
      trackingNumber,
      proNumber,
      isManual,
    }) && !createShipment.isPending;

  const handleSave = async () => {
    try {
      await createShipment.mutateAsync({
        shipment: {
          organization_id: organizationId,
          sales_order_id: salesOrderId,
          vendor_po_id: vendorPOId ?? null,
          carrier_code: resolvedCode,
          carrier_name:
            carrierCode === '__other__'
              ? otherCarrier.trim() || null
              : carrierName(carrierCode, null),
          tracking_number: trackingNumber.trim() || null,
          pro_number: proNumber.trim() || null,
          bill_of_lading: billOfLading.trim() || null,
          ship_date: shipDate || null,
          piece_count: pieceCount ? Number(pieceCount) : null,
          // A carrier with nobody to ask is recorded as manual, so the poller
          // never spends a lookup on it and the UI never shows it as stale.
          tracking_provider: isManual ? 'manual' : undefined,
        },
        lines: buildShipmentLines(entries, visibleIds),
      });
      onOpenChange(false);
    } catch {
      // Surfaced as a toast by the mutation hook; keep the dialog open.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Record shipment
            {manufacturerName ? ` — ${manufacturerName}` : ''}
          </DialogTitle>
          <DialogDescription>
            {poNumber ? `Against order ${poNumber}. ` : ''}
            Status, ETA, and scans come from the carrier once this is saved — there
            is nothing to type for those.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Carrier</Label>
              <Select
                value={carrierCode ?? ''}
                onValueChange={value => setCarrierCode(value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Who has it…" />
                </SelectTrigger>
                <SelectContent>
                  {GROUPS.map(group => (
                    <SelectGroup key={group}>
                      <SelectLabel>{group}</SelectLabel>
                      {CARRIER_OPTIONS.filter(c => c.group === group).map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                  <SelectGroup>
                    <SelectLabel>Not listed</SelectLabel>
                    <SelectItem value="__other__">Someone else…</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {carrierCode === '__other__' ? (
              <div className="space-y-1.5">
                <Label htmlFor="shp-other" className="text-xs">Carrier name</Label>
                <Input
                  id="shp-other"
                  value={otherCarrier}
                  onChange={e => setOtherCarrier(e.target.value)}
                  placeholder="As the acknowledgment names them"
                  className="h-9"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="shp-ship-date" className="text-xs">Shipped</Label>
                <Input
                  id="shp-ship-date"
                  type="date"
                  value={shipDate}
                  onChange={e => setShipDate(e.target.value)}
                  className="h-9"
                />
              </div>
            )}
          </div>

          {isManual ? (
            <p className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-3 py-2.5 text-xs text-gray-500">
              This carrier has no tracking service to ask, so its status is
              yours to move by hand. Recording it here still puts the delivery on
              the order, the schedule, and the receiving screen.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="shp-pro" className="text-xs">
                  PRO number{isFreight && <span className="text-gray-400"> · freight</span>}
                </Label>
                <Input
                  id="shp-pro"
                  value={proNumber}
                  onChange={e => setProNumber(e.target.value)}
                  onBlur={handleDetect}
                  placeholder="What the freight line answers to"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shp-tracking" className="text-xs">Tracking number</Label>
                <Input
                  id="shp-tracking"
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                  onBlur={handleDetect}
                  placeholder="Parcel"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shp-bol" className="text-xs">Bill of lading</Label>
                <Input
                  id="shp-bol"
                  value={billOfLading}
                  onChange={e => setBillOfLading(e.target.value)}
                  placeholder="What a claim is filed with"
                  className="h-9"
                />
              </div>
            </div>
          )}

          {detect.isPending && (
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <MagicWand className="w-3.5 h-3.5" />
              Working out who has it…
            </p>
          )}

          {!isManual && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="shp-pieces" className="text-xs">Pieces</Label>
                <Input
                  id="shp-pieces"
                  type="number"
                  min={1}
                  value={pieceCount}
                  onChange={e => setPieceCount(e.target.value)}
                  placeholder="Cartons or pallets on the BOL"
                  className="h-9 tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shp-ship-date-2" className="text-xs">Shipped</Label>
                <Input
                  id="shp-ship-date-2"
                  type="date"
                  value={shipDate}
                  onChange={e => setShipDate(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          )}

          {/* The manifest. Optional throughout. */}
          {lines.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                What the vendor says is on it
                <span className="ml-1.5 font-normal text-gray-400">
                  optional — receiving counts it again anyway
                </span>
              </Label>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 max-h-72 overflow-y-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2.5 w-10">#</th>
                      <th className="px-3 py-2.5">Item</th>
                      <th className="px-3 py-2.5 text-right w-20">Owed</th>
                      <th className="px-3 py-2.5 w-28">Shipped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map(line => {
                      const owed = Number(fulfillment[line.id]?.qty_to_receive ?? 0);
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
                              {[line.manufacturer_name, line.model_number]
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
                              value={entries[line.id]?.shipped ?? ''}
                              onChange={e =>
                                setEntries(prev => ({
                                  ...prev,
                                  [line.id]: { shipped: e.target.value },
                                }))
                              }
                              aria-label={`Quantity shipped for line ${line.line_number}`}
                              className="h-8 tabular-nums"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="items-center gap-3 sm:justify-between">
          <span className="text-sm text-gray-500">
            <Truck className="inline w-4 h-4 mr-1.5 -mt-0.5" />
            {totals.shipped > 0 ? (
              <>
                <span className="tabular-nums font-medium text-gray-900 dark:text-gray-100">
                  {totals.shipped}
                </span>{' '}
                across {totals.lineCount} line{totals.lineCount === 1 ? '' : 's'}
              </>
            ) : (
              'No manifest — the number alone is enough'
            )}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {createShipment.isPending ? 'Recording…' : 'Record shipment'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ShipmentDialog;
