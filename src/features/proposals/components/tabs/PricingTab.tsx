/**
 * Pricing Tab - Unified Table Layout
 *
 * Two modes:
 * - Builder mode: Define pricing section structure (add/remove/configure sections)
 * - Filler mode: Enter actual values (qty, cost, markup, etc.)
 *
 * Cost sections with line items and calculations:
 * - Merchandise (from products)
 * - Delivery & Installation
 * - Labor
 * - Freight & Shipping
 * - Tariffs & Fees
 * - Other Costs
 *
 * Each line item: Name | Qty | Sell Rule | Unit Cost | Markup % | Sell Price
 */

import { useState, useMemo } from 'react';
import { Plus, Trash, CaretDown, CaretRight, DotsSixVertical } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { EditorMode } from '../ProposalEditor';

// Sell rule options
const SELL_RULES = [
  { value: 'per_hour', label: 'Per Hour' },
  { value: 'per_day', label: 'Per Day' },
  { value: 'per_job', label: 'Per Job' },
  { value: 'per_unit', label: 'Per Unit' },
  { value: 'per_sqft', label: 'Per Sq Ft' },
  { value: 'flat_rate', label: 'Flat Rate' },
];

// Pricing line item interface
interface PricingLineItem {
  id: string;
  name: string;
  quantity: number;
  sellRule: string;
  unitCost: number;
  markupPercent: number;
}

// Pricing section interface
interface PricingSection {
  id: string;
  name: string;
  type: string;
  collapsed: boolean;
  lineItems: PricingLineItem[];
}

// Calculate sell price
const calculateSellPrice = (item: PricingLineItem): number => {
  const baseCost = item.quantity * item.unitCost;
  const markup = baseCost * (item.markupPercent / 100);
  return baseCost + markup;
};

// Calculate section subtotal (sell price with markup)
const calculateSubtotal = (items: PricingLineItem[]): number => {
  return items.reduce((sum, item) => sum + calculateSellPrice(item), 0);
};

// Calculate total cost (without markup)
const calculateTotalCost = (items: PricingLineItem[]): number => {
  return items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
};

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Default sections
const DEFAULT_SECTIONS: PricingSection[] = [
  {
    id: 'merchandise',
    name: 'Merchandise',
    type: 'merchandise',
    collapsed: false,
    lineItems: [],
  },
  {
    id: 'delivery_install',
    name: 'Delivery & Installation',
    type: 'delivery_install',
    collapsed: false,
    lineItems: [
      { id: '1', name: 'D&I Labor', quantity: 2, sellRule: 'per_day', unitCost: 800, markupPercent: 25 },
      { id: '2', name: 'Equipment', quantity: 1, sellRule: 'flat_rate', unitCost: 400, markupPercent: 0 },
    ],
  },
  {
    id: 'labor',
    name: 'Labor',
    type: 'labor',
    collapsed: false,
    lineItems: [
      { id: '3', name: 'Installer 1', quantity: 24, sellRule: 'per_hour', unitCost: 85, markupPercent: 20 },
      { id: '4', name: 'Installer 2', quantity: 16, sellRule: 'per_hour', unitCost: 75, markupPercent: 20 },
    ],
  },
  {
    id: 'freight',
    name: 'Freight & Shipping',
    type: 'freight',
    collapsed: true,
    lineItems: [
      { id: '5', name: 'Freight', quantity: 1, sellRule: 'flat_rate', unitCost: 950, markupPercent: 25 },
    ],
  },
  {
    id: 'tariffs',
    name: 'Tariffs & Fees',
    type: 'tariffs',
    collapsed: true,
    lineItems: [],
  },
  {
    id: 'other',
    name: 'Other Costs',
    type: 'other',
    collapsed: true,
    lineItems: [],
  },
];

interface PricingTabProps {
  mode: EditorMode;
}

export function PricingTab({ mode }: PricingTabProps) {
  const [sections, setSections] = useState<PricingSection[]>(DEFAULT_SECTIONS);
  const isBuilderMode = mode === 'builder';

  const inputClassName = cn(
    'h-9 rounded-lg border-gray-200 dark:border-gray-600',
    'focus:ring-2 focus:ring-coral/20 focus:border-coral'
  );

  // Hide number input spinners
  const numberInputClassName = cn(
    inputClassName,
    '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
  );

  const selectTriggerClassName = cn(
    'h-9 rounded-lg border-gray-200 dark:border-gray-600 text-sm',
    'focus:ring-2 focus:ring-coral/20 focus:border-coral'
  );

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return sections.reduce((total, section) => total + calculateSubtotal(section.lineItems), 0);
  }, [sections]);

  // Calculate total cost, gross profit, and margin percentage
  const { totalCost, grossProfit, grossProfitPercent } = useMemo(() => {
    const cost = sections.reduce((total, section) => total + calculateTotalCost(section.lineItems), 0);
    const profit = grandTotal - cost;
    const percent = grandTotal > 0 ? (profit / grandTotal) * 100 : 0;
    return {
      totalCost: cost,
      grossProfit: profit,
      grossProfitPercent: percent,
    };
  }, [sections, grandTotal]);

  // Toggle section collapse
  const toggleSection = (sectionId: string) => {
    setSections(
      sections.map((s) => (s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s))
    );
  };

  // Add line item to section
  const addLineItem = (sectionId: string) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              lineItems: [
                ...s.lineItems,
                {
                  id: `${Date.now()}`,
                  name: '',
                  quantity: 1,
                  sellRule: 'flat_rate',
                  unitCost: 0,
                  markupPercent: 0,
                },
              ],
            }
          : s
      )
    );
  };

  // Update line item
  const updateLineItem = (sectionId: string, itemId: string, updates: Partial<PricingLineItem>) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              lineItems: s.lineItems.map((item) =>
                item.id === itemId ? { ...item, ...updates } : item
              ),
            }
          : s
      )
    );
  };

  // Remove line item
  const removeLineItem = (sectionId: string, itemId: string) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              lineItems: s.lineItems.filter((item) => item.id !== itemId),
            }
          : s
      )
    );
  };

  // Update section name
  const updateSectionName = (sectionId: string, name: string) => {
    setSections(
      sections.map((s) => (s.id === sectionId ? { ...s, name } : s))
    );
  };

  // Remove section
  const removeSection = (sectionId: string) => {
    setSections(sections.filter((s) => s.id !== sectionId));
  };

  // Add new section
  const addSection = () => {
    const newSection: PricingSection = {
      id: `section_${Date.now()}`,
      name: 'New Section',
      type: 'other',
      collapsed: false,
      lineItems: [],
    };
    setSections([...sections, newSection]);
  };

  // Disabled input styles for builder mode
  const disabledInputClassName = cn(
    inputClassName,
    'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-60'
  );

  const disabledSelectClassName = cn(
    selectTriggerClassName,
    'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-60'
  );

  // ========== BUILDER MODE: Unified table with section dividers ==========
  if (isBuilderMode) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pricing Sections</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Define the cost categories and line item fields for this form
          </p>
        </div>

        {/* Unified Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div className="col-span-1"></div>
            <div className="col-span-3">Name</div>
            <div className="col-span-1 text-center">Qty</div>
            <div className="col-span-2">Sell Rule</div>
            <div className="col-span-2 text-right">Unit Cost</div>
            <div className="col-span-1 text-center">Markup</div>
            <div className="col-span-1 text-right">Sell Price</div>
            <div className="col-span-1"></div>
          </div>

          {/* Sections with Line Items */}
          <div>
            {sections.map((section, sectionIndex) => (
              <div key={section.id}>
                {/* Section Divider Row */}
                <div className={cn(
                  'grid grid-cols-12 gap-3 px-4 py-3 items-center bg-gray-100/80 dark:bg-gray-700/50',
                  sectionIndex > 0 && 'border-t-2 border-gray-200 dark:border-gray-600'
                )}>
                  {/* Drag Handle */}
                  <div className="col-span-1 flex justify-center">
                    <button className="p-1 text-gray-400 hover:text-gray-600 cursor-grab">
                      <DotsSixVertical className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Section Name (editable) */}
                  <div className="col-span-9">
                    <Input
                      value={section.name}
                      onChange={(e) => updateSectionName(section.id, e.target.value)}
                      className="h-8 font-semibold text-gray-900 dark:text-gray-100 border-transparent bg-transparent hover:border-gray-300 focus:border-coral"
                      placeholder="Section name"
                    />
                  </div>

                  {/* Collapsed by default checkbox */}
                  <div className="col-span-1">
                    <label className="flex items-center gap-1.5 text-[10px] text-gray-500 whitespace-nowrap cursor-pointer">
                      <input
                        type="checkbox"
                        checked={section.collapsed}
                        onChange={(e) => {
                          setSections(
                            sections.map((s) =>
                              s.id === section.id ? { ...s, collapsed: e.target.checked } : s
                            )
                          );
                        }}
                        className="rounded border-gray-300 w-3 h-3"
                      />
                      Collapse
                    </label>
                  </div>

                  {/* Delete Section */}
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => removeSection(section.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-white dark:hover:bg-gray-600"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Line Items for this section */}
                {section.lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-3 px-4 py-2.5 items-center border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20"
                  >
                    {/* Indent spacer */}
                    <div className="col-span-1"></div>

                    {/* Name - EDITABLE */}
                    <div className="col-span-3">
                      <Input
                        value={item.name}
                        onChange={(e) =>
                          updateLineItem(section.id, item.id, { name: e.target.value })
                        }
                        placeholder="Field name"
                        className={inputClassName}
                      />
                    </div>

                    {/* Qty - DISABLED */}
                    <div className="col-span-1">
                      <Input
                        type="number"
                        value=""
                        placeholder="—"
                        disabled
                        className={cn(disabledInputClassName, 'text-center')}
                      />
                    </div>

                    {/* Sell Rule - DISABLED */}
                    <div className="col-span-2">
                      <Select disabled>
                        <SelectTrigger className={disabledSelectClassName}>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {SELL_RULES.map((rule) => (
                            <SelectItem key={rule.value} value={rule.value}>
                              {rule.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Unit Cost - DISABLED */}
                    <div className="col-span-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          $
                        </span>
                        <Input
                          type="number"
                          value=""
                          placeholder="—"
                          disabled
                          className={cn(disabledInputClassName, 'pl-7 text-right')}
                        />
                      </div>
                    </div>

                    {/* Markup % - DISABLED */}
                    <div className="col-span-1">
                      <div className="relative">
                        <Input
                          type="number"
                          value=""
                          placeholder="—"
                          disabled
                          className={cn(disabledInputClassName, 'text-center pr-5')}
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Sell Price - DISABLED */}
                    <div className="col-span-1 text-right">
                      <span className="font-mono text-gray-400 text-sm">—</span>
                    </div>

                    {/* Delete */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => removeLineItem(section.id, item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Field Row */}
                <div className="grid grid-cols-12 gap-3 px-4 py-2 items-center border-t border-gray-100 dark:border-gray-700/50">
                  <div className="col-span-1"></div>
                  <div className="col-span-11">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addLineItem(section.id)}
                      className="text-coral hover:text-coral-hover hover:bg-coral/5 h-8"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Field
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Section Button */}
        <div className="flex justify-center">
          <Button variant="outline" onClick={addSection} className="rounded-lg">
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        </div>
      </div>
    );
  }

  // ========== FILLER MODE: Enter actual values ==========
  return (
    <div className="space-y-6">
      {/* Header with Grand Total and Gross Profit */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pricing</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Cost breakdown by category
          </p>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Gross Profit</p>
            <p className={`text-xl font-semibold ${grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {formatCurrency(grossProfit)}
              <span className="text-sm font-normal ml-1.5">
                ({grossProfitPercent.toFixed(1)}%)
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Grand Total</p>
            <p className="text-2xl font-bold text-coral">{formatCurrency(grandTotal)}</p>
          </div>
        </div>
      </div>

      {/* Pricing Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const subtotal = calculateSubtotal(section.lineItems);
          const hasItems = section.lineItems.length > 0;

          return (
            <div
              key={section.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {section.collapsed ? (
                    <CaretRight className="w-4 h-4 text-gray-400" />
                  ) : (
                    <CaretDown className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {section.name}
                  </span>
                  {hasItems && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({section.lineItems.length} item{section.lineItems.length !== 1 ? 's' : ''})
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'font-semibold',
                    subtotal > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'
                  )}
                >
                  {formatCurrency(subtotal)}
                </span>
              </button>

              {/* Section Content */}
              {!section.collapsed && (
                <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700/50">
                  {/* Table Header */}
                  {hasItems && (
                    <div className="grid grid-cols-12 gap-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <div className="col-span-3">Name</div>
                      <div className="col-span-1 text-center">Qty</div>
                      <div className="col-span-2">Sell Rule</div>
                      <div className="col-span-2 text-right">Unit Cost</div>
                      <div className="col-span-1 text-center">Markup</div>
                      <div className="col-span-2 text-right">Sell Price</div>
                      <div className="col-span-1"></div>
                    </div>
                  )}

                  {/* Line Items */}
                  <div className="space-y-2">
                    {section.lineItems.map((item) => {
                      const sellPrice = calculateSellPrice(item);

                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-12 gap-3 items-center py-2 hover:bg-gray-50 dark:hover:bg-gray-700/20 rounded-lg px-1 -mx-1 transition-colors"
                        >
                          {/* Name */}
                          <div className="col-span-3">
                            <Input
                              value={item.name}
                              onChange={(e) =>
                                updateLineItem(section.id, item.id, { name: e.target.value })
                              }
                              placeholder="Item name"
                              className={inputClassName}
                            />
                          </div>

                          {/* Quantity */}
                          <div className="col-span-1">
                            <Input
                              type="number"
                              min={0}
                              value={item.quantity}
                              onChange={(e) =>
                                updateLineItem(section.id, item.id, {
                                  quantity: parseFloat(e.target.value) || 0,
                                })
                              }
                              className={cn(numberInputClassName, 'text-center')}
                            />
                          </div>

                          {/* Sell Rule */}
                          <div className="col-span-2">
                            <Select
                              value={item.sellRule}
                              onValueChange={(v) =>
                                updateLineItem(section.id, item.id, { sellRule: v })
                              }
                            >
                              <SelectTrigger className={selectTriggerClassName}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SELL_RULES.map((rule) => (
                                  <SelectItem key={rule.value} value={rule.value}>
                                    {rule.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Unit Cost */}
                          <div className="col-span-2">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                $
                              </span>
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={item.unitCost}
                                onChange={(e) =>
                                  updateLineItem(section.id, item.id, {
                                    unitCost: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className={cn(numberInputClassName, 'pl-7 text-right')}
                              />
                            </div>
                          </div>

                          {/* Markup % */}
                          <div className="col-span-1">
                            <div className="relative">
                              <Input
                                type="number"
                                min={0}
                                max={999}
                                value={item.markupPercent}
                                onChange={(e) =>
                                  updateLineItem(section.id, item.id, {
                                    markupPercent: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className={cn(numberInputClassName, 'text-center pr-6')}
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                %
                              </span>
                            </div>
                          </div>

                          {/* Sell Price (calculated) */}
                          <div className="col-span-2 text-right">
                            <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrency(sellPrice)}
                            </span>
                          </div>

                          {/* Delete */}
                          <div className="col-span-1 flex justify-center">
                            <button
                              onClick={() => removeLineItem(section.id, item.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Line Item */}
                  <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-700/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addLineItem(section.id)}
                      className="text-coral hover:text-coral-hover hover:bg-coral/5"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Line Item
                    </Button>
                  </div>

                  {/* Section note for merchandise */}
                  {section.type === 'merchandise' && section.lineItems.length === 0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 italic py-4 text-center">
                      Products will appear here when added from the Products tab
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Custom Section */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={addSection} className="rounded-lg">
          <Plus className="w-4 h-4 mr-2" />
          Add Section
        </Button>
      </div>
    </div>
  );
}

export default PricingTab;
