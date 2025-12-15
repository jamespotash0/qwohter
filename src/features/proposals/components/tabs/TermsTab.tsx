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

// Warranty unit options
const WARRANTY_UNITS = [
  { value: 'years', label: 'Year(s)' },
  { value: 'months', label: 'Month(s)' },
  { value: 'days', label: 'Day(s)' },
  { value: 'lifetime', label: 'Lifetime' },
];

// No defaults - all start empty for both builder and filler modes

interface TermsTabProps {
  mode: EditorMode;
}

export function TermsTab({ mode }: TermsTabProps) {
  const isBuilderMode = mode === 'builder';
  const [activeSubsection, setActiveSubsection] = useState<Subsection>('pricing');

  // Pricing Terms State - start empty for both modes
  const [paymentMilestones, setPaymentMilestones] = useState<PaymentMilestone[]>([]);
  const [netTerms, setNetTerms] = useState('');

  // Delivery Terms State - start empty for both modes
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Warranty State - start empty for both modes
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [warrantyNotes, setWarrantyNotes] = useState('');

  // Exclusions State - start empty for both modes
  const [exclusions, setExclusions] = useState<Exclusion[]>([]);
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
              <Input disabled placeholder="—" className={disabledInputClassName} />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Delivery Notes</span>
              <Textarea
                disabled
                placeholder="—"
                className={cn(
                  disabledInputClassName,
                  'min-h-[80px] resize-none'
                )}
              />
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

  // ========== FILLER MODE: Quartet layout with data entry ==========
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
                  <div className="relative w-24">
                    <Input
                      type="text"
                      value={milestone.percentage}
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                        updateMilestone(milestone.id, { percentage: Math.min(100, val) });
                      }}
                      className={cn(inputClassName, 'text-center pr-7')}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                  </div>
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
            <Input
              value={netTerms}
              onChange={(e) => setNetTerms(e.target.value)}
              placeholder="30 days"
              className={cn(inputClassName, 'w-28')}
            />
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
            <Input
              value={deliveryMethod}
              onChange={(e) => setDeliveryMethod(e.target.value)}
              placeholder="e.g., On-site Delivery, Curbside..."
              className={inputClassName}
            />
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Delivery Notes</span>
            <Textarea
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Additional delivery instructions..."
              className={cn(
                inputClassName,
                'min-h-[80px] resize-none'
              )}
            />
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
                type="number"
                min={0}
                value={warranty.quantity || ''}
                onChange={(e) => updateWarranty(warranty.id, { quantity: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className={cn(inputClassName, 'w-16 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none')}
              />
              <Select
                value={warranty.unit}
                onValueChange={(v) => updateWarranty(warranty.id, { unit: v })}
              >
                <SelectTrigger className={cn(selectTriggerClassName, 'w-28')}>
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
            <Input
              value={warrantyNotes}
              onChange={(e) => setWarrantyNotes(e.target.value)}
              placeholder="Additional warranty terms..."
              className={inputClassName}
            />
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
          <div className="flex items-center gap-2">
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
          <div className="pt-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">General Notes</span>
            <Textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Additional terms, conditions, or notes..."
              className={cn(
                inputClassName,
                'min-h-[80px] resize-none'
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TermsTab;
