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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  isTaxable: boolean; // Whether this item has sales tax applied
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

// Default sections - all start empty with no pre-filled line items
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
    lineItems: [],
  },
  {
    id: 'freight',
    name: 'Freight & Shipping',
    type: 'freight',
    collapsed: false,
    lineItems: [],
  },
  {
    id: 'tariffs',
    name: 'Tariffs & Fees',
    type: 'tariffs',
    collapsed: false,
    lineItems: [],
  },
  {
    id: 'other',
    name: 'Other Costs',
    type: 'other',
    collapsed: false,
    lineItems: [],
  },
];

interface PricingTabProps {
  mode: EditorMode;
}

// Sortable Section Row Component for Builder Mode
interface SortableSectionRowProps {
  section: PricingSection;
  sectionIndex: number;
  onUpdateName: (name: string) => void;
  onToggleCollapse: (checked: boolean) => void;
  onRemove: () => void;
}

function SortableSectionRow({
  section,
  sectionIndex,
  onUpdateName,
  onToggleCollapse,
  onRemove,
}: SortableSectionRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'grid grid-cols-12 gap-3 px-4 py-3 items-center bg-gray-100/80 dark:bg-gray-700/50',
        sectionIndex > 0 && 'border-t-2 border-gray-200 dark:border-gray-600'
      )}
    >
      {/* Drag Handle */}
      <div className="col-span-1 flex justify-center">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        >
          <DotsSixVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Section Name (editable) */}
      <div className="col-span-9">
        <Input
          value={section.name}
          onChange={(e) => onUpdateName(e.target.value)}
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
            onChange={(e) => onToggleCollapse(e.target.checked)}
            className="rounded border-gray-300 w-3 h-3"
          />
          Collapse
        </label>
      </div>

      {/* Delete Section */}
      <div className="col-span-1 flex justify-center">
        <button
          onClick={onRemove}
          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-white dark:hover:bg-gray-600"
        >
          <Trash className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function PricingTab({ mode }: PricingTabProps) {
  const [sections, setSections] = useState<PricingSection[]>(DEFAULT_SECTIONS);
  const [salesTaxPercent, setSalesTaxPercent] = useState<number>(0);
  const isBuilderMode = mode === 'builder';

  // Drag-and-drop sensors for section reordering
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle section drag end
  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);

    setSections(arrayMove(sections, oldIndex, newIndex));
  };

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

  // Calculate subtotal (before tax)
  const subtotal = useMemo(() => {
    return sections.reduce((total, section) => total + calculateSubtotal(section.lineItems), 0);
  }, [sections]);

  // Calculate taxable amount (only items marked as taxable)
  const taxableAmount = useMemo(() => {
    return sections.reduce((total, section) => {
      const taxableItems = section.lineItems.filter(item => item.isTaxable);
      return total + calculateSubtotal(taxableItems);
    }, 0);
  }, [sections]);

  // Calculate tax amount
  const taxAmount = useMemo(() => {
    return taxableAmount * (salesTaxPercent / 100);
  }, [taxableAmount, salesTaxPercent]);

  // Calculate grand total (subtotal + tax)
  const grandTotal = useMemo(() => {
    return subtotal + taxAmount;
  }, [subtotal, taxAmount]);

  // Calculate total cost, gross profit, and margin percentage
  const { totalCost, grossProfit, grossProfitPercent } = useMemo(() => {
    const cost = sections.reduce((total, section) => total + calculateTotalCost(section.lineItems), 0);
    const profit = subtotal - cost; // Profit is before tax
    const percent = subtotal > 0 ? (profit / subtotal) * 100 : 0;
    return {
      totalCost: cost,
      grossProfit: profit,
      grossProfitPercent: percent,
    };
  }, [sections, subtotal]);

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
                  isTaxable: false,
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

  // Select/Deselect all items as taxable
  const toggleAllTaxable = () => {
    // Check if all items are currently taxable
    const allItems = sections.flatMap(s => s.lineItems);
    const allTaxable = allItems.length > 0 && allItems.every(item => item.isTaxable);

    // Toggle all to opposite state
    const newTaxableState = !allTaxable;

    setSections(
      sections.map(section => ({
        ...section,
        lineItems: section.lineItems.map(item => ({
          ...item,
          isTaxable: newTaxableState,
        })),
      }))
    );
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSectionDragEnd}
          >
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div>
                {sections.map((section, sectionIndex) => (
                  <div key={section.id}>
                    {/* Section Divider Row - Sortable */}
                    <SortableSectionRow
                      section={section}
                      sectionIndex={sectionIndex}
                      onUpdateName={(name) => updateSectionName(section.id, name)}
                      onToggleCollapse={(checked) => {
                        setSections(
                          sections.map((s) =>
                            s.id === section.id ? { ...s, collapsed: checked } : s
                          )
                        );
                      }}
                      onRemove={() => removeSection(section.id)}
                    />

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
        </SortableContext>
      </DndContext>
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

  // ========== FILLER MODE: Unified table with data entry ==========
  return (
    <div className="space-y-6">
      {/* Unified Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <div className="col-span-3">Name</div>
          <div className="col-span-1 text-center">Qty</div>
          <div className="col-span-2">Sell Rule</div>
          <div className="col-span-2 text-right">Unit Cost</div>
          <div className="col-span-1 text-center">Markup</div>
          <div className="col-span-1 text-center">Tax</div>
          <div className="col-span-1 text-right">Sell Price</div>
          <div className="col-span-1"></div>
        </div>

        {/* Sections with Line Items */}
        <div>
          {sections.map((section) => {
            const subtotal = calculateSubtotal(section.lineItems);

            return (
              <div key={section.id}>
                {/* Section Divider Row */}
                <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-100/50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-600 items-center">
                  <div className="col-span-11">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {section.name}
                    </span>
                  </div>
                  <div className="col-span-1 text-right">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                </div>

                {/* Line Items for this section */}
                {section.lineItems.map((item) => {
                  const sellPrice = calculateSellPrice(item);

                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-3 px-4 py-2.5 items-center border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20"
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
                          value={item.quantity === 0 ? '' : item.quantity}
                          onChange={(e) =>
                            updateLineItem(section.id, item.id, {
                              quantity: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="0"
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
                            value={item.unitCost === 0 ? '' : item.unitCost}
                            onChange={(e) =>
                              updateLineItem(section.id, item.id, {
                                unitCost: parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="0.00"
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
                            value={item.markupPercent === 0 ? '' : item.markupPercent}
                            onChange={(e) =>
                              updateLineItem(section.id, item.id, {
                                markupPercent: parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="0"
                            className={cn(numberInputClassName, 'text-center pr-6')}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                            %
                          </span>
                        </div>
                      </div>

                      {/* Tax Checkbox */}
                      <div className="col-span-1 flex justify-center">
                        <input
                          type="checkbox"
                          checked={item.isTaxable}
                          onChange={(e) =>
                            updateLineItem(section.id, item.id, {
                              isTaxable: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-gray-300 text-coral focus:ring-coral focus:ring-offset-0 cursor-pointer"
                        />
                      </div>

                      {/* Sell Price (calculated) */}
                      <div className="col-span-1 text-right">
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

                {/* Add Line Item Row */}
                <div className="grid grid-cols-12 gap-3 px-4 py-2 items-center border-t border-gray-100 dark:border-gray-700/50">
                  <div className="col-span-12">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addLineItem(section.id)}
                      className="text-coral hover:text-coral-hover hover:bg-coral/5 h-8"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Line Item
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tax Summary Section */}
        <div className="border-t-2 border-gray-300 dark:border-gray-600">
          {/* Sales Tax Input Row */}
          <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/30 items-center">
            <div className="col-span-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sales Tax %
              </label>
            </div>
            <div className="col-span-2">
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={salesTaxPercent === 0 ? '' : salesTaxPercent}
                  onChange={(e) => setSalesTaxPercent(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={cn(numberInputClassName, 'text-center pr-6')}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  %
                </span>
              </div>
            </div>
            <div className="col-span-7 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllTaxable}
                className="text-coral hover:text-coral-hover hover:bg-coral/5"
              >
                Select All Taxable
              </Button>
            </div>
          </div>

          {/* Subtotal Row */}
          <div className="grid grid-cols-12 gap-3 px-4 py-2.5 items-center">
            <div className="col-span-9"></div>
            <div className="col-span-2 text-right">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Subtotal (incl. margin):
              </span>
            </div>
            <div className="col-span-1 text-right">
              <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(subtotal)}
              </span>
            </div>
          </div>

          {/* Gross Profit Row */}
          <div className="grid grid-cols-12 gap-3 px-4 py-2.5 items-center">
            <div className="col-span-9"></div>
            <div className="col-span-2 text-right">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Gross Profit:
              </span>
            </div>
            <div className="col-span-1 text-right">
              <span className={`font-mono text-sm ${grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {formatCurrency(grossProfit)} ({grossProfitPercent.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Taxable Amount Row */}
          <div className="grid grid-cols-12 gap-3 px-4 py-2.5 items-center">
            <div className="col-span-9"></div>
            <div className="col-span-2 text-right">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Taxable Amount:
              </span>
            </div>
            <div className="col-span-1 text-right">
              <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                {formatCurrency(taxableAmount)}
              </span>
            </div>
          </div>

          {/* Tax Amount Row */}
          <div className="grid grid-cols-12 gap-3 px-4 py-2.5 items-center">
            <div className="col-span-9"></div>
            <div className="col-span-2 text-right">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Tax ({salesTaxPercent}%):
              </span>
            </div>
            <div className="col-span-1 text-right">
              <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                {formatCurrency(taxAmount)}
              </span>
            </div>
          </div>

          {/* Grand Total Row */}
          <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-coral/5 dark:bg-coral/10 items-center">
            <div className="col-span-9"></div>
            <div className="col-span-2 text-right">
              <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                Grand Total:
              </span>
            </div>
            <div className="col-span-1 text-right">
              <span className="font-mono text-lg font-bold text-coral">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PricingTab;
