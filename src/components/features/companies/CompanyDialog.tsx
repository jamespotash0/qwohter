/**
 * Company dialog
 *
 * Create or edit a customer. This is the front door that was missing: the
 * bill-to picker on a new order read from a table nothing wrote to, so on a
 * fresh organization it was empty and there was nowhere to go and fix that.
 *
 * Only the name is required. Everything else has a sensible default or can be
 * filled in later — somebody halfway through raising an order should not have
 * to go and find a postal code before they can carry on.
 *
 * Shipping defaults to the billing address because for most customers they are
 * the same, and re-typing an address is how the two drift apart. Unticking it
 * keeps whatever was already stored rather than blanking the fields, so an
 * accidental tick is not destructive.
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateCompany, useUpdateCompany } from '@/hooks/queries/useCompanies';
import type { Company } from '@/services/companiesService';

const COMPANY_TYPES = ['Customer', 'Prospect', 'Partner', 'Other'] as const;

/** What a dealer actually puts on an invoice, most common first. */
const PAYMENT_TERMS = [
  'Net 30',
  'Net 45',
  'Net 60',
  'Due on receipt',
  '50% deposit, balance on completion',
] as const;

interface AddressFields {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

const EMPTY_ADDRESS: AddressFields = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
};

interface CompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  /** Absent means create. */
  company?: Company | null;
  /** Handed the saved company, so a caller mid-order can select it straight away. */
  onSaved?: (company: Company) => void;
}

export function CompanyDialog({
  open,
  onOpenChange,
  organizationId,
  company = null,
  onSaved,
}: CompanyDialogProps) {
  const isEdit = !!company;
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();

  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [companyType, setCompanyType] = useState<string>('Customer');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [billing, setBilling] = useState<AddressFields>(EMPTY_ADDRESS);
  const [shipping, setShipping] = useState<AddressFields>(EMPTY_ADDRESS);
  const [shipSameAsBill, setShipSameAsBill] = useState(true);
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [taxExempt, setTaxExempt] = useState(false);
  const [notes, setNotes] = useState('');

  // Reloaded whenever the dialog opens so a second edit never shows the first
  // one's values.
  useEffect(() => {
    if (!open) return;
    setName(company?.name ?? '');
    setLegalName(company?.legal_name ?? '');
    setCompanyType(company?.company_type ?? 'Customer');
    setPhone(company?.phone ?? '');
    setWebsite(company?.website ?? '');
    setBilling({
      line1: company?.billing_address_line1 ?? '',
      line2: company?.billing_address_line2 ?? '',
      city: company?.billing_city ?? '',
      state: company?.billing_state ?? '',
      postalCode: company?.billing_postal_code ?? '',
    });
    setShipping({
      line1: company?.shipping_address_line1 ?? '',
      line2: company?.shipping_address_line2 ?? '',
      city: company?.shipping_city ?? '',
      state: company?.shipping_state ?? '',
      postalCode: company?.shipping_postal_code ?? '',
    });
    // A new company starts linked; an existing one is judged on whether the two
    // addresses actually match today.
    setShipSameAsBill(
      !company ||
        (company.shipping_address_line1 ?? '') === (company.billing_address_line1 ?? '')
    );
    setPaymentTerms(company?.payment_terms ?? 'Net 30');
    setTaxExempt(company?.tax_exempt ?? false);
    setNotes(company?.notes ?? '');
  }, [open, company]);

  const trimmedName = name.trim();
  const isSaving = createCompany.isPending || updateCompany.isPending;
  const canSave = trimmedName.length > 0 && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;
    const shipFrom = shipSameAsBill ? billing : shipping;

    const payload = {
      organization_id: organizationId,
      name: trimmedName,
      legal_name: legalName.trim() || null,
      company_type: companyType,
      phone: phone.trim() || null,
      website: website.trim() || null,
      billing_address_line1: billing.line1.trim() || null,
      billing_address_line2: billing.line2.trim() || null,
      billing_city: billing.city.trim() || null,
      billing_state: billing.state.trim() || null,
      billing_postal_code: billing.postalCode.trim() || null,
      shipping_address_line1: shipFrom.line1.trim() || null,
      shipping_address_line2: shipFrom.line2.trim() || null,
      shipping_city: shipFrom.city.trim() || null,
      shipping_state: shipFrom.state.trim() || null,
      shipping_postal_code: shipFrom.postalCode.trim() || null,
      payment_terms: paymentTerms || null,
      tax_exempt: taxExempt,
      notes: notes.trim() || null,
    };

    const saved = isEdit
      ? await updateCompany.mutateAsync({ companyId: company!.id, patch: payload })
      : await createCompany.mutateAsync(payload);

    onSaved?.(saved);
    onOpenChange(false);
  };

  const addressFields = (
    value: AddressFields,
    setValue: (next: AddressFields) => void,
    idPrefix: string,
    disabled = false
  ) => (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 space-y-1.5">
        <Label htmlFor={`${idPrefix}-line1`}>Street</Label>
        <Input
          id={`${idPrefix}-line1`}
          value={value.line1}
          disabled={disabled}
          onChange={e => setValue({ ...value, line1: e.target.value })}
        />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label htmlFor={`${idPrefix}-line2`}>Suite, floor</Label>
        <Input
          id={`${idPrefix}-line2`}
          value={value.line2}
          disabled={disabled}
          placeholder="Floor 3"
          onChange={e => setValue({ ...value, line2: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-city`}>City</Label>
        <Input
          id={`${idPrefix}-city`}
          value={value.city}
          disabled={disabled}
          onChange={e => setValue({ ...value, city: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-state`}>State</Label>
          <Input
            id={`${idPrefix}-state`}
            value={value.state}
            disabled={disabled}
            onChange={e => setValue({ ...value, state: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-zip`}>ZIP</Label>
          <Input
            id={`${idPrefix}-zip`}
            value={value.postalCode}
            disabled={disabled}
            onChange={e => setValue({ ...value, postalCode: e.target.value })}
          />
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit company' : 'New company'}</DialogTitle>
          <DialogDescription>
            Who gets billed, and where product ships. Only the name is required —
            the rest can wait.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="co-name">Name</Label>
              <Input
                id="co-name"
                value={name}
                autoFocus
                onChange={e => setName(e.target.value)}
                placeholder="Acme Corporation"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-legal">Legal name</Label>
              <Input
                id="co-legal"
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
                placeholder="If it differs on the invoice"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={companyType} onValueChange={setCompanyType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-phone">Phone</Label>
              <Input
                id="co-phone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-web">Website</Label>
              <Input
                id="co-web"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="acme.com"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Bill to
            </h4>
            {addressFields(billing, setBilling, 'co-bill')}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Ship to
              </h4>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Checkbox
                  checked={shipSameAsBill}
                  onCheckedChange={checked => setShipSameAsBill(checked === true)}
                />
                Same as billing
              </label>
            </div>
            {shipSameAsBill ? (
              <p className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500 dark:border-gray-700">
                Product ships to the billing address. Individual orders can still
                override it.
              </p>
            ) : (
              addressFields(shipping, setShipping, 'co-ship')
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payment terms</Label>
              <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map(term => (
                    <SelectItem key={term} value={term}>
                      {term}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Checkbox
                  checked={taxExempt}
                  onCheckedChange={checked => setTaxExempt(checked === true)}
                />
                Tax exempt
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="co-notes">Notes</Label>
            <Textarea
              id="co-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Dock hours, who signs off, anything the next person needs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Create company'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
