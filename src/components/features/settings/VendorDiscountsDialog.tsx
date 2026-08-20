/**
 * Vendor Discounts Dialog
 *
 * A dealer's discount from one manufacturer is never a single number. It varies
 * by product series and by the contract the sale runs under — GSA pricing is not
 * standard pricing — and agreements expire.
 *
 * Rows here are matched most-specific-first at quote time. Leaving series or
 * contract blank means "applies to anything", so a vendor's blanket rate is one
 * row with both blank.
 */

import { useState } from 'react';
import { Trash, Plus } from '@phosphor-icons/react';
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
  useVendorDiscounts,
  useCreateVendorDiscount,
  useDeleteVendorDiscount,
  type Vendor,
} from '@/hooks/queries/useVendors';
import { discountToMultiplier } from '@/lib/pricing';

interface VendorDiscountsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  vendor: Vendor | null;
}

export function VendorDiscountsDialog({
  open,
  onOpenChange,
  organizationId,
  vendor,
}: VendorDiscountsDialogProps) {
  const { data: discounts = [], isLoading } = useVendorDiscounts(vendor?.id);
  const createDiscount = useCreateVendorDiscount();
  const deleteDiscount = useDeleteVendorDiscount();

  const [seriesName, setSeriesName] = useState('');
  const [contractVehicle, setContractVehicle] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');

  const percent = Number(discountPercent);
  const canAdd =
    !!vendor &&
    discountPercent !== '' &&
    Number.isFinite(percent) &&
    percent >= 0 &&
    percent <= 100 &&
    !createDiscount.isPending;

  const handleAdd = async () => {
    if (!vendor) return;
    try {
      await createDiscount.mutateAsync({
        organization_id: organizationId,
        vendor_id: vendor.id,
        series_name: seriesName.trim() || null,
        contract_vehicle: contractVehicle.trim() || null,
        discount_percent: percent,
        effective_to: effectiveTo || null,
      });
      setSeriesName('');
      setContractVehicle('');
      setDiscountPercent('');
      setEffectiveTo('');
    } catch {
      // Surfaced as a toast by the mutation hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Discounts — {vendor?.name}</DialogTitle>
          <DialogDescription>
            Your discount off this manufacturer&rsquo;s list price. Leave series or
            contract blank to mean &ldquo;any&rdquo;. The most specific match wins;
            ties go to the larger discount.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing agreements */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Series</th>
                  <th className="px-3 py-2">Contract</th>
                  <th className="px-3 py-2 text-right">Off list</th>
                  <th className="px-3 py-2 text-right">Multiplier</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                ) : discounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                      No discounts on file. Lines from this vendor cannot be priced
                      until you add one.
                    </td>
                  </tr>
                ) : (
                  discounts.map(d => (
                    <tr
                      key={d.id}
                      className="border-t border-gray-100 dark:border-gray-700/50"
                    >
                      <td className="px-3 py-2">
                        {d.series_name?.trim() ? d.series_name : <span className="text-gray-400">Any series</span>}
                      </td>
                      <td className="px-3 py-2">
                        {d.contract_vehicle?.trim() ? (
                          d.contract_vehicle
                        ) : (
                          <span className="text-gray-400">Any contract</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {Number(d.discount_percent)}%
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                        {discountToMultiplier(Number(d.discount_percent)).toFixed(4)}
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {d.effective_to ?? '—'}
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => deleteDiscount.mutate(d.id)}
                          aria-label="Remove discount"
                        >
                          <Trash className="w-4 h-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add a new one */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="d-series" className="text-xs">Series</Label>
              <Input
                id="d-series"
                value={seriesName}
                onChange={e => setSeriesName(e.target.value)}
                placeholder="Any"
                className="h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-contract" className="text-xs">Contract</Label>
              <Input
                id="d-contract"
                value={contractVehicle}
                onChange={e => setContractVehicle(e.target.value)}
                placeholder="GSA, Omnia…"
                className="h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-pct" className="text-xs">Off list %</Label>
              <Input
                id="d-pct"
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={e => setDiscountPercent(e.target.value)}
                placeholder="55"
                className="h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-exp" className="text-xs">Expires</Label>
              <Input
                id="d-exp"
                type="date"
                value={effectiveTo}
                onChange={e => setEffectiveTo(e.target.value)}
                className="h-8"
              />
            </div>
            <Button onClick={handleAdd} disabled={!canAdd} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {discountPercent !== '' && Number.isFinite(percent) && percent >= 0 && percent <= 100 && (
            <p className="text-xs text-gray-500">
              {percent}% off list is a {discountToMultiplier(percent).toFixed(4)}{' '}
              multiplier — a $1,000 list item costs you{' '}
              {(1000 * discountToMultiplier(percent)).toFixed(2)}.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default VendorDiscountsDialog;
