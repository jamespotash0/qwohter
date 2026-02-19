/**
 * Line Items Section
 *
 * Manual product entry table with Name, Model #, SKU, Description columns.
 * Includes "Add to Pricing" popover per row and pricing detail display.
 */

import { Plus, Trash, Package, CurrencyDollar, CaretDown, Check } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Product, PricingSection } from '../../../context/FormBuilderContext';
import { formatCurrency } from './productHelpers';

interface LineItemsSectionProps {
  products: Product[];
  pricingSections: PricingSection[];
  inputClassName: string;
  onAddProduct: () => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onRemoveProduct: (id: string) => void;
  onAddToPricing: (product: Product, targetSectionId?: string) => void;
}

export function LineItemsSection({
  products,
  pricingSections,
  inputClassName,
  onAddProduct,
  onUpdateProduct,
  onRemoveProduct,
  onAddToPricing,
}: LineItemsSectionProps) {
  return (
    <div className="space-y-2">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-1">
        <Package className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Line Items</h3>
        <span className="text-xs text-gray-400">{products.length}</span>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          <div className="col-span-3">Name</div>
          <div className="col-span-2">Model #</div>
          <div className="col-span-2">SKU / Part #</div>
          <div className="col-span-3">Description</div>
          <div className="col-span-2"></div>
        </div>

        {/* Product Rows */}
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {products.map((product) => (
            <LineItemRow
              key={product.id}
              product={product}
              pricingSections={pricingSections}
              inputClassName={inputClassName}
              onUpdate={onUpdateProduct}
              onRemove={onRemoveProduct}
              onAddToPricing={onAddToPricing}
            />
          ))}

          {/* Add Product */}
          <div className="px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddProduct}
              className="text-gray-400 hover:text-coral hover:bg-coral/5 h-6 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Line Item
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Single row in the line items table */
function LineItemRow({
  product,
  pricingSections,
  inputClassName,
  onUpdate,
  onRemove,
  onAddToPricing,
}: {
  product: Product;
  pricingSections: PricingSection[];
  inputClassName: string;
  onUpdate: (id: string, updates: Partial<Product>) => void;
  onRemove: (id: string) => void;
  onAddToPricing: (product: Product, targetSectionId?: string) => void;
}) {
  const linkedSection = pricingSections.find(section =>
    section.lineItems.some(item => item.sourceProductId === product.id)
  );

  return (
    <div className="grid grid-cols-12 gap-1 px-3 py-2 items-center hover:bg-gray-50 dark:hover:bg-gray-700/20">
      {/* Name */}
      <div className="col-span-3">
        <Input
          value={product.name}
          onChange={(e) => onUpdate(product.id, { name: e.target.value })}
          placeholder="Name"
          className={inputClassName}
        />
      </div>

      {/* Model # */}
      <div className="col-span-2">
        <Input
          value={product.rawData?.model ?? ''}
          onChange={(e) => {
            onUpdate(product.id, {
              rawData: { ...(product.rawData || {}), model: e.target.value || null },
            });
          }}
          placeholder="Model #"
          className={cn(inputClassName, 'font-mono text-xs')}
        />
      </div>

      {/* SKU */}
      <div className="col-span-2">
        <Input
          value={product.rawData?.sku ?? ''}
          onChange={(e) => {
            onUpdate(product.id, {
              rawData: { ...(product.rawData || {}), sku: e.target.value || null },
            });
          }}
          placeholder="SKU"
          className={cn(inputClassName, 'font-mono text-xs')}
        />
      </div>

      {/* Description */}
      <div className="col-span-3">
        <Input
          value={product.description ?? ''}
          onChange={(e) => onUpdate(product.id, { description: e.target.value })}
          placeholder="Description"
          className={inputClassName}
        />
      </div>

      {/* Actions */}
      <div className="col-span-2 flex justify-end gap-1">
        {linkedSection ? (
          <PricingLinkedBadge
            product={product}
            linkedSection={linkedSection}
          />
        ) : (
          <AddToPricingPopover
            product={product}
            pricingSections={pricingSections}
            onAddToPricing={onAddToPricing}
          />
        )}
        <button
          onClick={() => onRemove(product.id)}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Delete"
        >
          <Trash className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Badge shown when product is already linked to a pricing section */
function PricingLinkedBadge({
  product,
  linkedSection,
}: {
  product: Product;
  linkedSection: PricingSection;
}) {
  const linkedItem = linkedSection.lineItems.find(
    item => item.sourceProductId === product.id
  );
  const baseAmount = (linkedItem?.unitCost || 0) * (linkedItem?.quantity || 1);
  const markupAmount = linkedItem?.markupType === 'percent'
    ? baseAmount * ((linkedItem?.markupValue || 0) / 100)
    : (linkedItem?.markupValue || 0);
  const totalAmount = baseAmount + markupAmount;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1 px-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors cursor-pointer"
          title="View pricing details"
        >
          <Check className="w-3 h-3" />
          <span className="truncate max-w-[60px]">{linkedSection.name}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
            <CurrencyDollar className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
              {linkedSection.name}
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Quantity:</span>
              <span className="font-medium">{linkedItem?.quantity || 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Unit Cost:</span>
              <span className="font-medium">{formatCurrency(linkedItem?.unitCost || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Markup:</span>
              <span className="font-medium">
                {linkedItem?.markupType === 'percent'
                  ? `${linkedItem?.markupValue || 0}%`
                  : formatCurrency(linkedItem?.markupValue || 0)}
              </span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-gray-100 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Total:</span>
              <span className="font-semibold text-green-600">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 pt-1 italic">
            Edit in Pricing tab
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Popover for adding a product to a pricing section */
function AddToPricingPopover({
  product,
  pricingSections,
  onAddToPricing,
}: {
  product: Product;
  pricingSections: PricingSection[];
  onAddToPricing: (product: Product, targetSectionId?: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="p-1 text-gray-400 hover:text-green-600 transition-colors rounded hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-0.5"
          title="Add to Pricing"
        >
          <CurrencyDollar className="w-3.5 h-3.5" />
          <CaretDown className="w-2.5 h-2.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <div className="text-[10px] font-medium text-gray-500 uppercase px-2 py-1">Add to Section</div>
        {pricingSections.length === 0 ? (
          <button
            onClick={() => onAddToPricing(product)}
            className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Package className="w-3 h-3 text-gray-400" />
            <span>Create Merchandise</span>
          </button>
        ) : (
          pricingSections.map((section) => (
            <button
              key={section.id}
              onClick={() => onAddToPricing(product, section.id)}
              className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 truncate"
            >
              {section.name}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
