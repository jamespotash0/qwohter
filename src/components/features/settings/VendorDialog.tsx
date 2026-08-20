/**
 * Vendor Dialog
 *
 * Create or edit a vendor — a manufacturer, freight carrier, or subcontractor
 * the dealer buys from. A purchase order is addressed to one of these, so a
 * manufacturer with no vendor record here is one whose lines cannot be ordered.
 */

import { useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateVendor, useUpdateVendor, type Vendor } from '@/hooks/queries/useVendors';

const VENDOR_TYPES = ['Manufacturer', 'Supplier', 'Subcontractor', 'Freight', 'Other'] as const;
const ORDER_METHODS = ['Email', 'Portal', 'EDI', 'Fax', 'Phone'] as const;
const FREIGHT_TERMS = [
  'FOB Origin',
  'FOB Destination',
  'Prepaid',
  'Prepaid and Add',
  'Collect',
] as const;

interface VendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  vendor?: Vendor | null;
}

type FormState = {
  name: string;
  vendor_type: string;
  account_number: string;
  order_method: string;
  order_email: string;
  acknowledgment_email: string;
  payment_terms: string;
  freight_terms: string;
  standard_lead_time_days: string;
  rep_name: string;
  rep_email: string;
  notes: string;
};

const EMPTY: FormState = {
  name: '',
  vendor_type: 'Manufacturer',
  account_number: '',
  order_method: 'Email',
  order_email: '',
  acknowledgment_email: '',
  payment_terms: 'Net 30',
  freight_terms: '',
  standard_lead_time_days: '',
  rep_name: '',
  rep_email: '',
  notes: '',
};

export function VendorDialog({
  open,
  onOpenChange,
  organizationId,
  vendor,
}: VendorDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const isEdit = !!vendor;

  useEffect(() => {
    if (!open) return;
    setForm(
      vendor
        ? {
            name: vendor.name,
            vendor_type: vendor.vendor_type ?? 'Manufacturer',
            account_number: vendor.account_number ?? '',
            order_method: vendor.order_method ?? 'Email',
            order_email: vendor.order_email ?? '',
            acknowledgment_email: vendor.acknowledgment_email ?? '',
            payment_terms: vendor.payment_terms ?? '',
            freight_terms: vendor.freight_terms ?? '',
            standard_lead_time_days:
              vendor.standard_lead_time_days === null ? '' : `${vendor.standard_lead_time_days}`,
            rep_name: vendor.rep_name ?? '',
            rep_email: vendor.rep_email ?? '',
            notes: vendor.notes ?? '',
          }
        : EMPTY
    );
  }, [open, vendor]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const isSaving = createVendor.isPending || updateVendor.isPending;
  const canSave = form.name.trim().length > 0 && !isSaving;

  const handleSave = async () => {
    const payload = {
      organization_id: organizationId,
      name: form.name.trim(),
      vendor_type: form.vendor_type as Vendor['vendor_type'],
      account_number: form.account_number.trim() || null,
      order_method: form.order_method as Vendor['order_method'],
      order_email: form.order_email.trim() || null,
      acknowledgment_email: form.acknowledgment_email.trim() || null,
      payment_terms: form.payment_terms.trim() || null,
      freight_terms: (form.freight_terms || null) as Vendor['freight_terms'],
      standard_lead_time_days: form.standard_lead_time_days
        ? Number(form.standard_lead_time_days)
        : null,
      rep_name: form.rep_name.trim() || null,
      rep_email: form.rep_email.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      if (isEdit && vendor) {
        await updateVendor.mutateAsync({ vendorId: vendor.id, patch: payload });
      } else {
        await createVendor.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // The mutation hooks surface the error as a toast; keep the dialog open.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit vendor' : 'Add vendor'}</DialogTitle>
          <DialogDescription>
            Who you buy from. Purchase orders are addressed here, and
            acknowledgments come back to the address you name.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="vendor-name">Name</Label>
              <Input
                id="vendor-name"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Steelcase"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.vendor_type} onValueChange={v => set('vendor_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VENDOR_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="vendor-account">Your account number</Label>
              <Input
                id="vendor-account"
                value={form.account_number}
                onChange={e => set('account_number', e.target.value)}
                placeholder="Goes on every PO"
              />
            </div>
            <div className="space-y-1.5">
              <Label>How orders are sent</Label>
              <Select value={form.order_method} onValueChange={v => set('order_method', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORDER_METHODS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="vendor-order-email">Order email</Label>
              <Input
                id="vendor-order-email"
                type="email"
                value={form.order_email}
                onChange={e => set('order_email', e.target.value)}
                placeholder="orders@vendor.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vendor-ack-email">Acknowledgment email</Label>
              <Input
                id="vendor-ack-email"
                type="email"
                value={form.acknowledgment_email}
                onChange={e => set('acknowledgment_email', e.target.value)}
                placeholder="Falls back to the order email"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="vendor-terms">Payment terms</Label>
              <Input
                id="vendor-terms"
                value={form.payment_terms}
                onChange={e => set('payment_terms', e.target.value)}
                placeholder="Net 30"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Freight terms</Label>
              <Select
                value={form.freight_terms || 'none'}
                onValueChange={v => set('freight_terms', v === 'none' ? '' : v)}
              >
                <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {FREIGHT_TERMS.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vendor-lead">Lead time (days)</Label>
              <Input
                id="vendor-lead"
                type="number"
                min={0}
                value={form.standard_lead_time_days}
                onChange={e => set('standard_lead_time_days', e.target.value)}
                placeholder="Planning default"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="vendor-rep">Rep name</Label>
              <Input
                id="vendor-rep"
                value={form.rep_name}
                onChange={e => set('rep_name', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vendor-rep-email">Rep email</Label>
              <Input
                id="vendor-rep-email"
                type="email"
                value={form.rep_email}
                onChange={e => set('rep_email', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vendor-notes">Notes</Label>
            <Textarea
              id="vendor-notes"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Add vendor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default VendorDialog;
