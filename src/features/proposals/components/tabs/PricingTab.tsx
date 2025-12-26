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

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash, CaretDown, CaretRight, DotsSixVertical, Calculator } from '@phosphor-icons/react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { EditorMode } from '../ProposalEditor';
import { useFormBuilder } from '../../context/FormBuilderContext';
import { getStateOptions, getStateTaxRate, formatTaxRate } from '../../utils/salesTaxRates';

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
  markupValue: number; // Markup value - interpreted based on markupType
  markupType?: 'percent' | 'dollar'; // Markup type (default: percent)
  isTaxable: boolean; // Whether this item has sales tax applied
  discountValue?: number; // Discount value (applied after markup, before tax)
  discountType?: 'percent' | 'dollar'; // Discount type
  sourceProductId?: string; // Optional: links to a product, if any
  // Calculated fields (stored for reference)
  sellPrice?: number; // Calculated sell price (after markup/discount, before tax)
  taxAmount?: number; // Calculated tax amount for this item
}

// Pricing section interface
interface PricingSection {
  id: string;
  name: string;
  type: string;
  collapsed: boolean;
  lineItems: PricingLineItem[];
}

// Pricing summary interface (calculated totals)
interface PricingSummary {
  totalCost: number;
  subtotal: number;
  grossProfit: number;
  grossProfitPercent: number;
  totalTax: number;
  grandTotal: number;
}

// Calculate sell price (after markup and discount, before tax)
const calculateSellPrice = (item: PricingLineItem): number => {
  const baseCost = item.quantity * item.unitCost;

  // Apply markup (percent or flat dollar amount)
  let priceAfterMarkup: number;
  if (item.markupType === 'dollar') {
    // Flat dollar markup
    priceAfterMarkup = baseCost + (item.markupValue || 0);
  } else {
    // Percentage markup (default)
    const markup = baseCost * (item.markupValue / 100);
    priceAfterMarkup = baseCost + markup;
  }

  // Apply discount if present
  if (item.discountValue && item.discountValue > 0) {
    if (item.discountType === 'percent') {
      return priceAfterMarkup * (1 - item.discountValue / 100);
    } else {
      // Dollar discount
      return Math.max(0, priceAfterMarkup - item.discountValue);
    }
  }

  return priceAfterMarkup;
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

// Scientific Calculator Component (inline in table header)
function CalculatorPopover() {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const calculate = useCallback(() => {
    if (!expression.trim()) {
      setResult(null);
      return;
    }
    try {
      // Safe eval with scientific functions
      let processed = expression
        .replace(/π/g, 'Math.PI')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/pow\(/g, 'Math.pow(')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/abs\(/g, 'Math.abs(')
        .replace(/round\(/g, 'Math.round(')
        .replace(/floor\(/g, 'Math.floor(')
        .replace(/ceil\(/g, 'Math.ceil(')
        .replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)') // Handle percentage
        .replace(/\^/g, '**'); // Power operator

      // Sanitize - only allow safe characters
      const sanitized = processed.replace(/[^0-9+\-*/().Math\s,PIpowsqrtsincostalogabsroundflorceil]/g, '');

      const evalResult = Function(`"use strict"; return (${sanitized})`)();
      if (typeof evalResult === 'number' && !isNaN(evalResult) && isFinite(evalResult)) {
        const formatted = evalResult.toLocaleString('en-US', { maximumFractionDigits: 8 });
        setResult(formatted);
        setHistory(prev => [`${expression} = ${formatted}`, ...prev.slice(0, 4)]);
      } else {
        setResult('Error');
      }
    } catch {
      setResult('Error');
    }
  }, [expression]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      calculate();
    }
  };

  const insert = (value: string) => {
    setExpression(prev => prev + value);
    inputRef.current?.focus();
  };

  const clear = () => {
    setExpression('');
    setResult(null);
    inputRef.current?.focus();
  };

  const backspace = () => {
    setExpression(prev => prev.slice(0, -1));
    inputRef.current?.focus();
  };

  const useResult = () => {
    if (result && result !== 'Error') {
      setExpression(result.replace(/,/g, ''));
      setResult(null);
      inputRef.current?.focus();
    }
  };

  const btnClass = "h-8 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors";
  const fnBtnClass = "h-8 text-[10px] font-medium rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors";
  const opBtnClass = "h-8 text-xs font-medium rounded bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-coral transition-colors"
          title="Calculator"
        >
          <Calculator className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-80 p-4 shadow-xl"
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Calculator</span>
            <button
              onClick={clear}
              className="text-[10px] px-2 py-0.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Clear
            </button>
          </div>

          {/* Display */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 space-y-1">
            <Input
              ref={inputRef}
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter expression..."
              className="h-9 text-base font-mono border-0 bg-transparent shadow-none focus-visible:ring-0 px-1"
            />
            {result !== null && (
              <div
                onClick={useResult}
                className={cn(
                  'text-right font-mono text-lg font-semibold px-1 cursor-pointer',
                  result === 'Error' ? 'text-red-500' : 'text-coral hover:text-coral-hover'
                )}
                title="Click to use result"
              >
                = {result}
              </div>
            )}
          </div>

          {/* Scientific Functions Row */}
          <div className="grid grid-cols-6 gap-1">
            <button type="button" onClick={() => insert('sqrt(')} className={fnBtnClass}>√</button>
            <button type="button" onClick={() => insert('^')} className={fnBtnClass}>x^y</button>
            <button type="button" onClick={() => insert('π')} className={fnBtnClass}>π</button>
            <button type="button" onClick={() => insert('sin(')} className={fnBtnClass}>sin</button>
            <button type="button" onClick={() => insert('cos(')} className={fnBtnClass}>cos</button>
            <button type="button" onClick={() => insert('tan(')} className={fnBtnClass}>tan</button>
          </div>
          <div className="grid grid-cols-6 gap-1">
            <button type="button" onClick={() => insert('log(')} className={fnBtnClass}>log</button>
            <button type="button" onClick={() => insert('ln(')} className={fnBtnClass}>ln</button>
            <button type="button" onClick={() => insert('abs(')} className={fnBtnClass}>|x|</button>
            <button type="button" onClick={() => insert('round(')} className={fnBtnClass}>rnd</button>
            <button type="button" onClick={() => insert('floor(')} className={fnBtnClass}>flr</button>
            <button type="button" onClick={() => insert('ceil(')} className={fnBtnClass}>ceil</button>
          </div>

          {/* Main Keypad */}
          <div className="grid grid-cols-5 gap-1">
            <button type="button" onClick={() => insert('(')} className={btnClass}>(</button>
            <button type="button" onClick={() => insert(')')} className={btnClass}>)</button>
            <button type="button" onClick={() => insert('%')} className={opBtnClass}>%</button>
            <button type="button" onClick={backspace} className={opBtnClass}>←</button>
            <button type="button" onClick={() => insert('/')} className={opBtnClass}>÷</button>

            <button type="button" onClick={() => insert('7')} className={btnClass}>7</button>
            <button type="button" onClick={() => insert('8')} className={btnClass}>8</button>
            <button type="button" onClick={() => insert('9')} className={btnClass}>9</button>
            <button type="button" onClick={() => insert('*')} className={opBtnClass}>×</button>
            <button type="button" onClick={() => insert('-')} className={opBtnClass}>−</button>

            <button type="button" onClick={() => insert('4')} className={btnClass}>4</button>
            <button type="button" onClick={() => insert('5')} className={btnClass}>5</button>
            <button type="button" onClick={() => insert('6')} className={btnClass}>6</button>
            <button type="button" onClick={() => insert('+')} className={opBtnClass}>+</button>
            <button
              type="button"
              onClick={calculate}
              className="row-span-2 h-full text-lg font-bold rounded bg-coral text-white hover:bg-coral-hover transition-colors flex items-center justify-center"
            >
              =
            </button>

            <button type="button" onClick={() => insert('1')} className={btnClass}>1</button>
            <button type="button" onClick={() => insert('2')} className={btnClass}>2</button>
            <button type="button" onClick={() => insert('3')} className={btnClass}>3</button>
            <button type="button" onClick={() => insert('.')} className={btnClass}>.</button>

            <button type="button" onClick={() => insert('0')} className={cn(btnClass, 'col-span-2')}>0</button>
            <button type="button" onClick={() => insert('00')} className={btnClass}>00</button>
            <button type="button" onClick={() => insert(',')} className={btnClass}>,</button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">History</p>
              <div className="space-y-0.5 max-h-16 overflow-y-auto">
                {history.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const parts = item.split(' = ');
                      if (parts[0]) setExpression(parts[0]);
                    }}
                    className="block w-full text-left text-[10px] font-mono text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 truncate"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
  const isBuilderMode = mode === 'builder';

  // Get context data and setter
  const { data: formData, setPricingData } = useFormBuilder();

  // Initialize local state from context or defaults
  const [sections, setSections] = useState<PricingSection[]>(() => {
    const contextSections = formData.pricing?.sections;
    if (contextSections && contextSections.length > 0) {
      // Convert context sections to local format (add isTaxable if missing)
      return contextSections.map(s => ({
        ...s,
        lineItems: s.lineItems.map(item => ({
          ...item,
          isTaxable: item.isTaxable ?? false,
        })),
      }));
    }
    return DEFAULT_SECTIONS;
  });

  const [salesTaxPercent, setSalesTaxPercent] = useState<number>(
    formData.pricing?.salesTaxPercent ?? 0
  );

  const [selectedTaxState, setSelectedTaxState] = useState<string>(
    formData.pricing?.taxState ?? ''
  );

  // Memoize state options for dropdown
  const stateOptions = useMemo(() => getStateOptions(), []);

  // Get selected option label for display
  const selectedTaxLabel = useMemo(() => {
    if (!selectedTaxState) return null;
    const option = stateOptions.find(opt => opt.value === selectedTaxState);
    if (!option) return selectedTaxState;
    // For cities: "NYC, NY" -> "NYC"
    // For states: "New York (4%)" -> "NY"
    return option.isCity
      ? option.label.split(',')[0] // Just the city name
      : selectedTaxState; // State code
  }, [selectedTaxState, stateOptions]);

  // Handle state selection - auto-populate tax rate
  const handleStateSelect = (stateCode: string) => {
    setSelectedTaxState(stateCode);
    if (stateCode) {
      const rate = getStateTaxRate(stateCode);
      setSalesTaxPercent(rate);
    }
  };

  // Track if initial data has been loaded from context
  const hasLoadedInitialData = useRef(false);

  // Track if we're currently updating from context to avoid sync loops
  const isUpdatingFromContext = useRef(false);

  // Track if we should allow syncing (prevents premature sync before data loads)
  const canSync = useRef(false);

  // Load data from context when proposal data changes (e.g., proposal loaded async)
  useEffect(() => {
    // Skip if we've already loaded
    if (hasLoadedInitialData.current) return;

    const contextSections = formData.pricing?.sections;

    // If context has sections with data, load them
    if (contextSections && contextSections.length > 0) {
      isUpdatingFromContext.current = true;
      setSections(contextSections.map(s => ({
        ...s,
        lineItems: s.lineItems.map(item => ({
          ...item,
          isTaxable: item.isTaxable ?? false,
        })),
      })));
      hasLoadedInitialData.current = true;
      canSync.current = true; // Now we can sync
    }

    // Load tax settings
    if (formData.pricing?.salesTaxPercent !== undefined) {
      setSalesTaxPercent(formData.pricing.salesTaxPercent);
    }
    if (formData.pricing?.taxState) {
      setSelectedTaxState(formData.pricing.taxState);
    }
  }, [formData.pricing]);

  // Enable syncing after a brief delay to allow initial data to load
  // This prevents overwriting saved data with defaults on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!canSync.current) {
        // No context data loaded after delay, safe to start syncing user edits
        canSync.current = true;
        hasLoadedInitialData.current = true;
      }
    }, 500); // Wait 500ms for proposal data to load

    return () => clearTimeout(timer);
  }, []);

  // Sync local state changes back to context
  useEffect(() => {
    // Don't sync until we're ready (data has loaded or timeout passed)
    if (!canSync.current) return;

    // Skip syncing back if we're currently loading from context
    if (isUpdatingFromContext.current) {
      isUpdatingFromContext.current = false;
      return;
    }

    // Helper to round to 2 decimal places
    const round2 = (num: number) => Math.round(num * 100) / 100;

    // Calculate per-item sellPrice and taxAmount, then create enriched sections
    const enrichedSections = sections.map(section => ({
      ...section,
      lineItems: section.lineItems.map(item => {
        const sellPrice = round2(calculateSellPrice(item));
        const taxAmount = item.isTaxable ? round2(sellPrice * (salesTaxPercent / 100)) : 0;
        return {
          ...item,
          sellPrice,
          taxAmount,
        };
      }),
    }));

    // Calculate summary totals from enriched sections
    const subtotalValue = round2(enrichedSections.reduce((total, section) =>
      total + section.lineItems.reduce((sum, item) => sum + (item.sellPrice || 0), 0), 0));
    const totalCostValue = round2(enrichedSections.reduce((total, section) =>
      total + section.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0), 0));
    const totalTaxValue = round2(enrichedSections.reduce((total, section) =>
      total + section.lineItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0), 0));
    const grossProfitValue = round2(subtotalValue - totalCostValue);
    const grossProfitPercentValue = round2(subtotalValue > 0 ? (grossProfitValue / subtotalValue) * 100 : 0);

    const summary: PricingSummary = {
      totalCost: totalCostValue,
      subtotal: subtotalValue,
      grossProfit: grossProfitValue,
      grossProfitPercent: grossProfitPercentValue,
      totalTax: totalTaxValue,
      grandTotal: round2(subtotalValue + totalTaxValue),
    };

    // Sync to context whenever local state changes (includes calculated summary and per-item values)
    setPricingData({
      sections: enrichedSections,
      salesTaxPercent: salesTaxPercent,
      taxState: selectedTaxState,
      summary: summary,
    });
  }, [sections, salesTaxPercent, selectedTaxState, setPricingData]);

  // Listen for cascade deletes from ProductsTab
  // When a product is deleted, ProductsTab updates context - we need to sync those deletions
  useEffect(() => {
    const contextSections = formData.pricing?.sections;
    if (!contextSections) return;

    // Build a set of all sourceProductIds that exist in context
    const contextSourceIds = new Set<string>();
    contextSections.forEach(section => {
      section.lineItems.forEach(item => {
        if (item.sourceProductId) {
          contextSourceIds.add(`${section.id}:${item.sourceProductId}`);
        }
      });
    });

    // Check if any local items with sourceProductId are missing from context
    let hasRemovals = false;
    const updatedSections = sections.map(section => {
      const filteredItems = section.lineItems.filter(item => {
        if (!item.sourceProductId) return true; // Keep non-linked items
        const key = `${section.id}:${item.sourceProductId}`;
        const existsInContext = contextSourceIds.has(key);
        if (!existsInContext) hasRemovals = true;
        return existsInContext;
      });
      return { ...section, lineItems: filteredItems };
    });

    if (hasRemovals) {
      isUpdatingFromContext.current = true;
      setSections(updatedSections);
    }
  }, [formData.pricing?.sections, sections]);

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
    'h-7 text-xs rounded border-gray-200 dark:border-gray-600 px-2',
    'focus:ring-1 focus:ring-coral/20 focus:border-coral'
  );

  // Hide number input spinners
  const numberInputClassName = cn(
    inputClassName,
    '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
  );

  const selectTriggerClassName = cn(
    'h-7 rounded border-gray-200 dark:border-gray-600 text-xs',
    'focus:ring-1 focus:ring-coral/20 focus:border-coral'
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

  // Calculate total cost, gross profit, margin percentage, and cost markup
  const { totalCost, grossProfit, grossProfitPercent, costMarkupPercent } = useMemo(() => {
    const cost = sections.reduce((total, section) => total + calculateTotalCost(section.lineItems), 0);
    const profit = subtotal - cost; // Profit is before tax
    const marginPercent = subtotal > 0 ? (profit / subtotal) * 100 : 0;
    const markupPercent = cost > 0 ? (profit / cost) * 100 : 0;
    return {
      totalCost: cost,
      grossProfit: profit,
      grossProfitPercent: marginPercent,
      costMarkupPercent: markupPercent,
    };
  }, [sections, subtotal]);

  // Calculate section breakdown for subtotal popover
  const sectionBreakdown = useMemo(() => {
    return sections
      .map(section => ({
        name: section.name,
        total: calculateSubtotal(section.lineItems),
      }))
      .filter(s => s.total > 0);
  }, [sections]);

  // Calculate taxable items breakdown for tax popover
  const taxableBreakdown = useMemo(() => {
    const items: { name: string; sectionName: string; amount: number }[] = [];
    sections.forEach(section => {
      section.lineItems.forEach(item => {
        if (item.isTaxable) {
          items.push({
            name: item.name || 'Unnamed item',
            sectionName: section.name,
            amount: calculateSellPrice(item),
          });
        }
      });
    });
    return items;
  }, [sections]);

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
                  markupValue: 0,
                  markupType: 'percent' as const,
                  isTaxable: false,
                  discountValue: 0,
                  discountType: 'percent' as const,
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
          <div className="grid grid-cols-12 gap-3 px-4 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
                    className="grid grid-cols-12 gap-3 px-4 py-3.5 items-center border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20"
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
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                          $
                        </span>
                        <Input
                          type="number"
                          value=""
                          placeholder="—"
                          disabled
                          className={cn(disabledInputClassName, 'pl-5 text-right')}
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
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Sell Price - DISABLED */}
                    <div className="col-span-1 text-right">
                      <span className="font-mono text-gray-400 text-xs">—</span>
                    </div>

                    {/* Delete */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => removeLineItem(section.id, item.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Field Row */}
                <div className="grid grid-cols-12 gap-3 px-4 py-2.5 items-center border-t border-gray-100 dark:border-gray-700/50">
                  <div className="col-span-1"></div>
                  <div className="col-span-11">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addLineItem(section.id)}
                      className="text-coral hover:text-coral-hover hover:bg-coral/5 h-7 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
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
        <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider items-center">
          <div className="col-span-3 flex items-center">Name</div>
          <div className="col-span-1 flex items-center justify-center">Qty</div>
          <div className="col-span-1 flex items-center">Rule</div>
          <div className="col-span-2 flex items-center justify-end">Unit Cost</div>
          <div className="col-span-1 flex items-center justify-center">Markup</div>
          <div className="col-span-1 flex items-center justify-center">Disc</div>
          <div className="col-span-1 flex items-center justify-center">Tax</div>
          <div className="col-span-1 flex items-center justify-end">Sell</div>
          <div className="col-span-1 flex items-center justify-center">
            <CalculatorPopover />
          </div>
        </div>

        {/* Sections with Line Items */}
        <div>
          {sections.map((section) => {
            const subtotal = calculateSubtotal(section.lineItems);

            return (
              <div key={section.id}>
                {/* Section Divider Row */}
                <div className="grid grid-cols-12 gap-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-700/40 border-t border-gray-200 dark:border-gray-600 items-center">
                  <div className="col-span-11">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      {section.name}
                    </span>
                  </div>
                  <div className="col-span-1 text-right">
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                </div>

                {/* Line Items for this section */}
                {section.lineItems.map((item) => {
                  const sellPrice = calculateSellPrice(item);
                  const markupType = item.markupType || 'percent';
                  const discountType = item.discountType || 'percent';

                  // Calculate breakdown for popover
                  const baseCost = item.quantity * item.unitCost;
                  const markupAmount = markupType === 'dollar'
                    ? (item.markupValue || 0)
                    : baseCost * (item.markupValue / 100);
                  const priceAfterMarkup = baseCost + markupAmount;
                  const discountAmount = item.discountValue && item.discountValue > 0
                    ? (discountType === 'percent'
                      ? priceAfterMarkup * (item.discountValue / 100)
                      : item.discountValue)
                    : 0;
                  const itemTax = item.isTaxable ? sellPrice * (salesTaxPercent / 100) : 0;
                  const taxAdjustedPrice = sellPrice + itemTax;

                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-1 px-3 py-2.5 items-center border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20"
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
                          className={cn(numberInputClassName, 'text-center px-1')}
                        />
                      </div>

                      {/* Sell Rule */}
                      <div className="col-span-1">
                        <Select
                          value={item.sellRule}
                          onValueChange={(v) =>
                            updateLineItem(section.id, item.id, { sellRule: v })
                          }
                        >
                          <SelectTrigger className={cn(selectTriggerClassName, 'px-1.5 text-[12px]')}>
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
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">$</span>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={0.01}
                            value={item.unitCost === 0 ? '' : item.unitCost}
                            onChange={(e) =>
                              updateLineItem(section.id, item.id, {
                                unitCost: parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="0.00"
                            className={cn(numberInputClassName, 'text-right pl-4 pr-1')}
                          />
                        </div>
                      </div>

                      {/* Markup (clickable to toggle type) */}
                      <div className="col-span-1">
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            max={markupType === 'percent' ? 999 : undefined}
                            step={markupType === 'dollar' ? 0.01 : 1}
                            value={item.markupValue === 0 ? '' : item.markupValue}
                            onChange={(e) =>
                              updateLineItem(section.id, item.id, {
                                markupValue: parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="0"
                            className={cn(numberInputClassName, 'text-center pl-1 pr-4')}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateLineItem(section.id, item.id, {
                                markupType: markupType === 'percent' ? 'dollar' : 'percent',
                              })
                            }
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-coral text-[9px] font-medium"
                            title={`Click to switch to ${markupType === 'percent' ? 'dollar' : 'percent'}`}
                          >
                            {markupType === 'percent' ? '%' : '$'}
                          </button>
                        </div>
                      </div>

                      {/* Discount (clickable to toggle type) */}
                      <div className="col-span-1">
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            max={discountType === 'percent' ? 100 : undefined}
                            step={discountType === 'dollar' ? 0.01 : 1}
                            value={item.discountValue === 0 ? '' : item.discountValue}
                            onChange={(e) =>
                              updateLineItem(section.id, item.id, {
                                discountValue: parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="0"
                            className={cn(numberInputClassName, 'text-center pl-1 pr-4')}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateLineItem(section.id, item.id, {
                                discountType: discountType === 'percent' ? 'dollar' : 'percent',
                              })
                            }
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-coral text-[9px] font-medium"
                            title={`Click to switch to ${discountType === 'percent' ? 'dollar' : 'percent'}`}
                          >
                            {discountType === 'percent' ? '%' : '$'}
                          </button>
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
                          className="w-3.5 h-3.5 rounded border-gray-300 text-coral focus:ring-coral focus:ring-offset-0 cursor-pointer"
                        />
                      </div>

                      {/* Sell Price (calculated) - Clickable with breakdown */}
                      <div className="col-span-1 text-right">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="font-mono text-xs text-gray-700 dark:text-gray-300 hover:text-coral hover:underline underline-offset-2 cursor-pointer transition-colors text-right"
                            >
                              {formatCurrency(sellPrice)}
                              {item.isTaxable && salesTaxPercent > 0 && (
                                <span className="text-[10px] text-blue-500 ml-1">
                                  +{formatCurrency(itemTax)}
                                </span>
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-56 p-3">
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                Price Breakdown
                              </p>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                                  <span>{item.quantity} × {formatCurrency(item.unitCost)}</span>
                                  <span className="font-mono">{formatCurrency(baseCost)}</span>
                                </div>
                                {markupAmount !== 0 && (
                                  <div className="flex justify-between text-green-600 dark:text-green-400">
                                    <span>+ Markup ({markupType === 'percent' ? `${item.markupValue}%` : 'Flat'})</span>
                                    <span className="font-mono">+{formatCurrency(markupAmount)}</span>
                                  </div>
                                )}
                                {discountAmount > 0 && (
                                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                                    <span>− Discount ({discountType === 'percent' ? `${item.discountValue}%` : 'Flat'})</span>
                                    <span className="font-mono">−{formatCurrency(discountAmount)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-600 font-medium">
                                  <span className="text-gray-700 dark:text-gray-200">Sell Price</span>
                                  <span className="font-mono text-gray-900 dark:text-gray-100">{formatCurrency(sellPrice)}</span>
                                </div>
                                {item.isTaxable && salesTaxPercent > 0 && (
                                  <>
                                    <div className="flex justify-between text-blue-500 dark:text-blue-400">
                                      <span>+ Tax ({formatTaxRate(salesTaxPercent)}%)</span>
                                      <span className="font-mono">+{formatCurrency(itemTax)}</span>
                                    </div>
                                    <div className="flex justify-between font-medium text-gray-900 dark:text-gray-100">
                                      <span>Total w/ Tax</span>
                                      <span className="font-mono">{formatCurrency(taxAdjustedPrice)}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Delete */}
                      <div className="col-span-1 flex justify-center">
                        <button
                          onClick={() => removeLineItem(section.id, item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add Line Item Row */}
                <div className="grid grid-cols-12 gap-1 px-3 py-2 items-center border-t border-gray-100 dark:border-gray-700/50">
                  <div className="col-span-12">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addLineItem(section.id)}
                      className="text-gray-400 hover:text-coral hover:bg-coral/5 h-6 text-[10px]"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Item
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Section */}
        <div className="border-t border-gray-200 dark:border-gray-600 pl-3 pr-4 py-3">
          <div className="flex justify-between items-start">
            {/* Left: Profit info */}
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
              <div>Cost: {formatCurrency(totalCost)}</div>
              <div>Markup: {formatCurrency(grossProfit)} ({costMarkupPercent.toFixed(1)}%)</div>
              <div>Margin: {formatCurrency(grossProfit)} ({grossProfitPercent.toFixed(1)}%)</div>
            </div>

            {/* Right: Clean calculation */}
            <div className="text-xs space-y-1">
              {/* Subtotal - Clickable with breakdown */}
              <div className="flex items-center">
                <span className="text-gray-500 dark:text-gray-400 w-[180px]">Subtotal</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="font-mono text-gray-700 dark:text-gray-300 w-24 text-right hover:text-coral hover:underline underline-offset-2 cursor-pointer transition-colors"
                    >
                      {formatCurrency(subtotal)}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 p-3">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Breakdown
                      </p>
                      {sectionBreakdown.length === 0 ? (
                        <p className="text-xs text-gray-400">No items yet</p>
                      ) : (
                        <div className="space-y-1">
                          {sectionBreakdown.map((section, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-300 truncate mr-2">
                                {section.name}
                              </span>
                              <span className="font-mono text-gray-700 dark:text-gray-200">
                                {formatCurrency(section.total)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between text-xs pt-1 border-t border-gray-200 dark:border-gray-600">
                            <span className="font-medium text-gray-700 dark:text-gray-200">Total</span>
                            <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrency(subtotal)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Tax Row - State/City dropdown merged with Tax label */}
              <div className="flex items-center">
                <Select value={selectedTaxState} onValueChange={handleStateSelect}>
                  <SelectTrigger className="h-6 w-42 text-xs px-0 border-0 bg-transparent shadow-none gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 [&>svg]:w-3 [&>svg]:h-3 [&>span]:ml-0 whitespace-nowrap">
                    <SelectValue placeholder="Select Tax">
                      {selectedTaxLabel
                        ? `${selectedTaxLabel} Tax (${formatTaxRate(salesTaxPercent)}%)`
                        : 'Select Tax'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-80 w-64">
                    {/* States section */}
                    <div className="px-2 py-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">States</div>
                    {stateOptions.filter(opt => !opt.isCity).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                    {/* Cities section */}
                    <div className="px-2 py-1 mt-1 border-t text-[10px] font-medium text-gray-400 uppercase tracking-wider">Cities</div>
                    {stateOptions.filter(opt => opt.isCity).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="font-mono text-gray-700 dark:text-gray-300 w-24 text-right hover:text-coral hover:underline underline-offset-2 cursor-pointer transition-colors"
                    >
                      {formatCurrency(taxAmount)}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 p-3">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Taxable Items ({formatTaxRate(salesTaxPercent)}%)
                      </p>
                      {taxableBreakdown.length === 0 ? (
                        <p className="text-xs text-gray-400">No taxable items</p>
                      ) : (
                        <div className="space-y-1">
                          {taxableBreakdown.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-300 truncate mr-2">
                                {item.name}
                              </span>
                              <span className="font-mono text-gray-700 dark:text-gray-200">
                                {formatCurrency(item.amount)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between text-xs pt-1 border-t border-gray-200 dark:border-gray-600">
                            <span className="font-medium text-gray-700 dark:text-gray-200">Taxable Total</span>
                            <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrency(taxableAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500 dark:text-gray-400">Tax ({formatTaxRate(salesTaxPercent)}%)</span>
                            <span className="font-mono text-coral font-medium">
                              {formatCurrency(taxAmount)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Total */}
              <div className="flex items-center pt-1 border-t border-gray-200 dark:border-gray-600">
                <span className="text-gray-700 dark:text-gray-300 font-medium w-[180px]">Total</span>
                <span className="font-mono text-gray-900 dark:text-gray-100 w-24 text-right font-medium">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PricingTab;
