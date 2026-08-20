/**
 * Vendors Settings Tab
 *
 * The buy side of the business. Every manufacturer whose product ends up on a
 * quote needs a record here, because a purchase order is addressed to a vendor
 * — a manufacturer named only as text on a line cannot be ordered from.
 *
 * The list flags that directly: a vendor with no discounts on file cannot price
 * a line, and one with no order email cannot be sent a PO.
 */

import { useState } from 'react';
import { Plus, PencilSimple, Percent, Warning } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useVendors,
  useAllVendorDiscounts,
  useDeactivateVendor,
  getOrderDestination,
  type Vendor,
} from '@/hooks/queries/useVendors';
import { VendorDialog } from './VendorDialog';
import { VendorDiscountsDialog } from './VendorDiscountsDialog';
import { cn } from '@/lib/utils';

interface VendorsTabProps {
  organizationId?: string;
}

export function VendorsTab({ organizationId }: VendorsTabProps) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [discountsFor, setDiscountsFor] = useState<Vendor | null>(null);

  const { data: vendors = [], isLoading } = useVendors(organizationId);
  const { data: allDiscounts = [] } = useAllVendorDiscounts(organizationId);
  const deactivate = useDeactivateVendor();

  const discountCount = new Map<string, number>();
  for (const d of allDiscounts) {
    discountCount.set(d.vendor_id, (discountCount.get(d.vendor_id) ?? 0) + 1);
  }

  const term = search.trim().toLowerCase();
  const filtered = term
    ? vendors.filter(v => v.name.toLowerCase().includes(term))
    : vendors;

  if (!organizationId) {
    return <p className="text-sm text-gray-500">Loading organization…</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Vendors
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Who you buy from, and what you pay them. Purchase orders are addressed
            here.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setVendorDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add vendor
        </Button>
      </div>

      {vendors.length > 4 && (
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search vendors"
          className="max-w-xs"
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="h-16 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-12 text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {vendors.length === 0 ? 'No vendors yet' : `Nothing matches “${search.trim()}”`}
          </p>
          {vendors.length === 0 && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Add the manufacturers you buy from. Until a manufacturer has a vendor
              record, its lines cannot be put on a purchase order.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {filtered.map((vendor, index) => {
            const destination = getOrderDestination(vendor);
            const discounts = discountCount.get(vendor.id) ?? 0;
            const needsAttention = !destination.canSend || discounts === 0;

            return (
              <div
                key={vendor.id}
                className={cn(
                  'flex items-center gap-4 px-4 py-3',
                  index > 0 && 'border-t border-gray-100 dark:border-gray-700/50'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                      {vendor.name}
                    </p>
                    <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-600 dark:text-gray-300">
                      {vendor.vendor_type}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    {vendor.account_number && <span>Acct {vendor.account_number}</span>}
                    <span>{vendor.payment_terms ?? 'No terms'}</span>
                    {destination.canSend ? (
                      <span>{destination.destination}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Warning className="w-3 h-3" />
                        No {vendor.order_method?.toLowerCase()} destination — cannot send a PO
                      </span>
                    )}
                    {discounts === 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Warning className="w-3 h-3" />
                        No discounts on file
                      </span>
                    ) : (
                      <span>
                        {discounts} discount{discounts === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    variant={needsAttention && discounts === 0 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDiscountsFor(vendor)}
                  >
                    <Percent className="w-4 h-4 mr-1" />
                    Discounts
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(vendor);
                      setVendorDialogOpen(true);
                    }}
                    aria-label={`Edit ${vendor.name}`}
                  >
                    <PencilSimple className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-500"
                    onClick={() => deactivate.mutate(vendor.id)}
                  >
                    Deactivate
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <VendorDialog
        open={vendorDialogOpen}
        onOpenChange={setVendorDialogOpen}
        organizationId={organizationId}
        vendor={editing}
      />
      <VendorDiscountsDialog
        open={!!discountsFor}
        onOpenChange={open => !open && setDiscountsFor(null)}
        organizationId={organizationId}
        vendor={discountsFor}
      />
    </div>
  );
}

export default VendorsTab;
