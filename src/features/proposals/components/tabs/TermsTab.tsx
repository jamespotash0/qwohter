/**
 * Terms Tab - Horizontal Subsections
 *
 * Simplified terms with horizontal navigation:
 * - Pricing Terms (payment schedule, methods, net terms)
 * - Delivery Terms (delivery method, warranty with qty + unit)
 * - Exclusions (checklist, general notes)
 */

import { useState } from 'react';
import { Plus, Trash, Check, CurrencyDollar, Truck, Warning } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { cn } from '@/lib/utils';
import type { EditorMode } from '../ProposalEditor';

// Subsection type
type Subsection = 'pricing' | 'delivery' | 'exclusions';

// Payment milestone interface
interface PaymentMilestone {
  id: string;
  percentage: number;
  trigger: string;
}

// Exclusion interface
interface Exclusion {
  id: string;
  label: string;
  checked: boolean;
}

// Warranty item interface
interface WarrantyItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

// Delivery method options
const DELIVERY_METHODS = [
  { value: 'on_site', label: 'On-site Delivery' },
  { value: 'curbside', label: 'Curbside Delivery' },
  { value: 'customer_pickup', label: 'Customer Pickup' },
  { value: 'freight', label: 'Freight Carrier' },
];

// Warranty unit options
const WARRANTY_UNITS = [
  { value: 'years', label: 'Year(s)' },
  { value: 'months', label: 'Month(s)' },
  { value: 'days', label: 'Day(s)' },
  { value: 'lifetime', label: 'Lifetime' },
];

// Default milestones for builder mode (empty values)
const BUILDER_DEFAULT_MILESTONES: PaymentMilestone[] = [
  { id: '1', percentage: 0, trigger: 'Contract Signing' },
  { id: '2', percentage: 0, trigger: 'Track Installation' },
  { id: '3', percentage: 0, trigger: 'Project Completion' },
];

// Default milestones for filler mode (with sample values)
const FILLER_DEFAULT_MILESTONES: PaymentMilestone[] = [
  { id: '1', percentage: 30, trigger: 'Contract Signing' },
  { id: '2', percentage: 40, trigger: 'Track Installation' },
  { id: '3', percentage: 30, trigger: 'Project Completion' },
];

// Default warranties for builder mode
const BUILDER_DEFAULT_WARRANTIES: WarrantyItem[] = [
  { id: '1', name: 'Product Warranty', quantity: 0, unit: 'years' },
  { id: '2', name: 'Labor Warranty', quantity: 0, unit: 'years' },
];

// Default warranties for filler mode
const FILLER_DEFAULT_WARRANTIES: WarrantyItem[] = [
  { id: '1', name: 'Product Warranty', quantity: 5, unit: 'years' },
  { id: '2', name: 'Labor Warranty', quantity: 1, unit: 'years' },
];

// Default exclusions for builder mode (just names, unchecked)
const BUILDER_DEFAULT_EXCLUSIONS: Exclusion[] = [
  { id: '1', label: 'Electrical work', checked: false },
  { id: '2', label: 'Structural modifications', checked: false },
  { id: '3', label: 'Permits and inspections', checked: false },
  { id: '4', label: 'Site cleanup', checked: false },
];

// Default exclusions for filler mode
const FILLER_DEFAULT_EXCLUSIONS: Exclusion[] = [
  { id: '1', label: 'Electrical work', checked: true },
  { id: '2', label: 'Structural modifications', checked: true },
  { id: '3', label: 'Permits and inspections', checked: true },
  { id: '4', label: 'Site cleanup', checked: false },
  { id: '5', label: 'Painting/finishing', checked: false },
];

interface TermsTabProps {
  mode: EditorMode;
}

export function TermsTab({ mode }: TermsTabProps) {
  const isBuilderMode = mode === 'builder';
  const [activeSubsection, setActiveSubsection] = useState<Subsection>('pricing');

  // Pricing Terms State
  const [paymentMilestones, setPaymentMilestones] = useState<PaymentMilestone[]>(
    isBuilderMode ? BUILDER_DEFAULT_MILESTONES : FILLER_DEFAULT_MILESTONES
  );
  const [netTerms, setNetTerms] = useState(isBuilderMode ? '' : '30');

  // Delivery Terms State
  const [deliveryMethod, setDeliveryMethod] = useState(isBuilderMode ? '' : 'on_site');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Warranty State (now with qty + unit)
  const [warranties, setWarranties] = useState<WarrantyItem[]>(
    isBuilderMode ? BUILDER_DEFAULT_WARRANTIES : FILLER_DEFAULT_WARRANTIES
  );
  const [warrantyNotes, setWarrantyNotes] = useState('');

  // Exclusions State
  const [exclusions, setExclusions] = useState<Exclusion[]>(
    isBuilderMode ? BUILDER_DEFAULT_EXCLUSIONS : FILLER_DEFAULT_EXCLUSIONS
  );
  const [newExclusion, setNewExclusion] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  const inputClassName = cn(
    'h-10 rounded-lg border-gray-200 dark:border-gray-600',
    'focus:ring-2 focus:ring-coral/20 focus:border-coral'
  );

  const selectTriggerClassName = cn(
    'h-10 rounded-lg border-gray-200 dark:border-gray-600',
    'focus:ring-2 focus:ring-coral/20 focus:border-coral'
  );

  const disabledInputClassName = cn(
    inputClassName,
    'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-60'
  );

  const disabledSelectClassName = cn(
    selectTriggerClassName,
    'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-60'
  );

  // Payment milestone handlers
  const addMilestone = () => {
    setPaymentMilestones([
      ...paymentMilestones,
      { id: `${Date.now()}`, percentage: 0, trigger: '' },
    ]);
  };

  const updateMilestone = (id: string, updates: Partial<PaymentMilestone>) => {
    setPaymentMilestones(paymentMilestones.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const removeMilestone = (id: string) => {
    setPaymentMilestones(paymentMilestones.filter((m) => m.id !== id));
  };

  // Warranty handlers
  const addWarranty = () => {
    setWarranties([
      ...warranties,
      { id: `${Date.now()}`, name: '', quantity: 0, unit: 'years' },
    ]);
  };

  const updateWarranty = (id: string, updates: Partial<WarrantyItem>) => {
    setWarranties(warranties.map((w) => (w.id === id ? { ...w, ...updates } : w)));
  };

  const removeWarranty = (id: string) => {
    setWarranties(warranties.filter((w) => w.id !== id));
  };

  // Exclusion handlers
  const toggleExclusion = (id: string) => {
    setExclusions(exclusions.map((e) => (e.id === id ? { ...e, checked: !e.checked } : e)));
  };

  const addExclusion = () => {
    if (!newExclusion.trim()) return;
    setExclusions([
      ...exclusions,
      { id: `${Date.now()}`, label: newExclusion.trim(), checked: true },
    ]);
    setNewExclusion('');
  };

  const removeExclusion = (id: string) => {
    setExclusions(exclusions.filter((e) => e.id !== id));
  };

  // Calculate total percentage
  const totalPercentage = paymentMilestones.reduce((sum, m) => sum + (m.percentage || 0), 0);

  // Subsection tabs
  const subsections: { id: Subsection; label: string; icon: React.ReactNode }[] = [
    { id: 'pricing', label: 'Pricing Terms', icon: <CurrencyDollar className="w-4 h-4" /> },
    { id: 'delivery', label: 'Delivery Terms', icon: <Truck className="w-4 h-4" /> },
    { id: 'exclusions', label: 'Exclusions', icon: <Warning className="w-4 h-4" /> },
  ];

  // ========== BUILDER MODE: 2x2 grid layout like InfoTab ==========
  if (isBuilderMode) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Left: Pricing Terms */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
          <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100 mb-5">
            <div className="p-2 rounded-xl bg-coral/10">
              <CurrencyDollar className="w-5 h-5 text-coral" />
            </div>
            <h3 className="text-base font-semibold">Pricing Terms</h3>
          </div>
          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Payment Schedule</span>
              <div className="space-y-2">
                {paymentMilestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center gap-2">
                    <Input
                      value={milestone.trigger}
                      onChange={(e) => updateMilestone(milestone.id, { trigger: e.target.value })}
                      placeholder="Milestone name..."
                      className={cn(inputClassName, 'flex-1')}
                    />
                    <Input disabled placeholder="—%" className={cn(disabledInputClassName, 'w-20 text-center')} />
                    <button
                      onClick={() => removeMilestone(milestone.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addMilestone}
                  className="text-coral hover:text-coral-hover hover:bg-coral/5"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Milestone
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Net Terms</span>
              <Input disabled placeholder="— days" className={cn(disabledInputClassName, 'w-28')} />
            </div>
          </div>
        </div>

        {/* Top Right: Delivery Terms */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
          <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100 mb-5">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Truck className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-base font-semibold">Delivery Terms</h3>
          </div>
          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Delivery Method</span>
              <Select disabled>
                <SelectTrigger className={disabledSelectClassName}>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_METHODS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Delivery Notes</span>
              <Input disabled placeholder="—" className={disabledInputClassName} />
            </div>
          </div>
        </div>

        {/* Bottom Left: Warranty - with qty + unit pattern */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
          <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100 mb-5">
            <div className="p-2 rounded-xl bg-green-500/10">
              <Check className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-base font-semibold">Warranty</h3>
          </div>
          <div className="space-y-3">
            {warranties.map((warranty) => (
              <div key={warranty.id} className="flex items-center gap-2">
                <Input
                  value={warranty.name}
                  onChange={(e) => updateWarranty(warranty.id, { name: e.target.value })}
                  placeholder="Warranty name..."
                  className={cn(inputClassName, 'flex-1')}
                />
                <Input
                  disabled
                  placeholder="—"
                  className={cn(disabledInputClassName, 'w-16 text-center')}
                />
                <Select disabled>
                  <SelectTrigger className={cn(disabledSelectClassName, 'w-28')}>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {WARRANTY_UNITS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => removeWarranty(warranty.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={addWarranty}
              className="text-coral hover:text-coral-hover hover:bg-coral/5"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Warranty
            </Button>
            <div className="pt-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Warranty Notes</span>
              <Input disabled placeholder="—" className={disabledInputClassName} />
            </div>
          </div>
        </div>

        {/* Bottom Right: Exclusions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
          <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100 mb-5">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Warning className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="text-base font-semibold">Exclusions</h3>
          </div>
          <div className="space-y-3">
            {exclusions.map((exclusion) => (
              <div key={exclusion.id} className="flex items-center gap-2">
                <Input
                  value={exclusion.label}
                  onChange={(e) => {
                    setExclusions(exclusions.map((ex) =>
                      ex.id === exclusion.id ? { ...ex, label: e.target.value } : ex
                    ));
                  }}
                  placeholder="Exclusion item..."
                  className={cn(inputClassName, 'flex-1')}
                />
                <button
                  onClick={() => removeExclusion(exclusion.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExclusions([...exclusions, { id: `${Date.now()}`, label: '', checked: false }])}
              className="text-coral hover:text-coral-hover hover:bg-coral/5"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Exclusion
            </Button>
            <div className="pt-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">General Notes</span>
              <Input disabled placeholder="—" className={disabledInputClassName} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== FILLER MODE: Full UI with data entry ==========
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Terms</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Payment, delivery, and exclusion terms
        </p>
      </div>

      {/* Horizontal Subsection Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        {subsections.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setActiveSubsection(sub.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all',
              'border-b-2 -mb-px',
              activeSubsection === sub.id
                ? 'text-coral border-coral'
                : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            {sub.icon}
            {sub.label}
          </button>
        ))}
      </div>

      {/* Subsection Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
        {/* Pricing Terms */}
        {activeSubsection === 'pricing' && (
          <div className="space-y-6">
            {/* Payment Schedule - Name and Percentage columns */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Payment Schedule</Label>

              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <div className="col-span-7">Milestone Name</div>
                <div className="col-span-3 text-center">Percentage</div>
                <div className="col-span-2"></div>
              </div>

              {/* Milestone Rows */}
              <div className="space-y-3">
                {paymentMilestones.map((milestone) => (
                  <div key={milestone.id} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-7">
                      <Input
                        value={milestone.trigger}
                        onChange={(e) => updateMilestone(milestone.id, { trigger: e.target.value })}
                        placeholder="e.g., Contract Signing"
                        className={inputClassName}
                      />
                    </div>
                    <div className="col-span-3">
                      <div className="relative">
                        <Input
                          type="text"
                          value={milestone.percentage}
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                            updateMilestone(milestone.id, { percentage: Math.min(100, val) });
                          }}
                          className={cn(inputClassName, 'text-center pr-8')}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <button
                        onClick={() => removeMilestone(milestone.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total indicator */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addMilestone}
                  className="text-coral hover:text-coral-hover hover:bg-coral/5"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Milestone
                </Button>
                <span
                  className={cn(
                    'text-sm font-medium px-3 py-1 rounded-full',
                    totalPercentage === 100
                      ? 'text-green-700 bg-green-50 dark:bg-green-900/20'
                      : totalPercentage > 100
                      ? 'text-red-700 bg-red-50 dark:bg-red-900/20'
                      : 'text-amber-700 bg-amber-50 dark:bg-amber-900/20'
                  )}
                >
                  Total: {totalPercentage}%
                  {totalPercentage !== 100 && (
                    <span className="ml-1 text-xs opacity-75">(should be 100%)</span>
                  )}
                </span>
              </div>
            </div>

            {/* Net Terms - Number input without arrows */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Net Terms</Label>
              <div className="flex items-center gap-3">
                <span className="text-gray-500">Net</span>
                <Input
                  type="text"
                  value={netTerms}
                  onChange={(e) => setNetTerms(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="30"
                  className={cn(inputClassName, 'w-20 text-center')}
                />
                <span className="text-gray-500">days</span>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Terms */}
        {activeSubsection === 'delivery' && (
          <div className="space-y-6">
            {/* Delivery Method */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Delivery Method</Label>
              <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                <SelectTrigger className={cn(selectTriggerClassName, 'w-64')}>
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_METHODS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Delivery Notes */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Delivery Notes</Label>
              <Input
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Additional delivery instructions..."
                className={inputClassName}
              />
            </div>

            {/* Warranty with qty + unit */}
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <Label className="text-base font-medium">Warranty</Label>

              {/* Table Header */}
              <div className="grid grid-cols-12 gap-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <div className="col-span-5">Warranty Type</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-3">Unit</div>
                <div className="col-span-2"></div>
              </div>

              {/* Warranty Rows */}
              <div className="space-y-3">
                {warranties.map((warranty) => (
                  <div key={warranty.id} className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-5">
                      <Input
                        value={warranty.name}
                        onChange={(e) => updateWarranty(warranty.id, { name: e.target.value })}
                        placeholder="e.g., Product Warranty"
                        className={inputClassName}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min={0}
                        value={warranty.quantity || ''}
                        onChange={(e) => updateWarranty(warranty.id, { quantity: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className={cn(inputClassName, 'text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none')}
                      />
                    </div>
                    <div className="col-span-3">
                      <Select
                        value={warranty.unit}
                        onValueChange={(v) => updateWarranty(warranty.id, { unit: v })}
                      >
                        <SelectTrigger className={selectTriggerClassName}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WARRANTY_UNITS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <button
                        onClick={() => removeWarranty(warranty.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={addWarranty}
                className="text-coral hover:text-coral-hover hover:bg-coral/5"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Warranty
              </Button>

              <div className="space-y-2 pt-2">
                <Label className="text-sm text-gray-600 dark:text-gray-400">Warranty Notes</Label>
                <Input
                  value={warrantyNotes}
                  onChange={(e) => setWarrantyNotes(e.target.value)}
                  placeholder="Additional warranty terms..."
                  className={inputClassName}
                />
              </div>
            </div>
          </div>
        )}

        {/* Exclusions */}
        {activeSubsection === 'exclusions' && (
          <div className="space-y-6">
            {/* Exclusions Checklist */}
            <div className="space-y-3">
              <Label className="text-base font-medium">What's NOT Included</Label>
              <div className="space-y-2">
                {exclusions.map((exclusion) => (
                  <div
                    key={exclusion.id}
                    className="flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-gray-700/30 px-3 py-2 rounded-lg transition-colors"
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <Checkbox
                        checked={exclusion.checked}
                        onCheckedChange={() => toggleExclusion(exclusion.id)}
                        className="data-[state=checked]:bg-coral data-[state=checked]:border-coral"
                      />
                      <span
                        className={cn(
                          'text-sm',
                          exclusion.checked
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-500 dark:text-gray-400'
                        )}
                      >
                        {exclusion.label}
                      </span>
                    </label>
                    <button
                      onClick={() => removeExclusion(exclusion.id)}
                      className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add new exclusion */}
              <div className="flex items-center gap-2 pt-2">
                <Input
                  value={newExclusion}
                  onChange={(e) => setNewExclusion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addExclusion()}
                  placeholder="Add exclusion..."
                  className={cn(inputClassName, 'flex-1')}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addExclusion}
                  disabled={!newExclusion.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* General Notes */}
            <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-700">
              <Label className="text-base font-medium">General Notes</Label>
              <Textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Additional terms, conditions, or notes..."
                className={cn(
                  'min-h-[100px] rounded-lg border-gray-200 dark:border-gray-600',
                  'focus:ring-2 focus:ring-coral/20 focus:border-coral',
                  'resize-none'
                )}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TermsTab;
