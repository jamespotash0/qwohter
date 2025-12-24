/**
 * Extracted Products Preview Modal
 * Shows AI-extracted products for user review before adding
 * Supports both configurable products (with options) and simple line items
 */

import { useState } from 'react';
import { Check, X, Package, Sparkle, Gear, ListBullets, CaretDown, CaretRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { ExtractedProduct, ExtractedProductOption } from '@/services/productExtraction';

interface ExtractedProductsPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ExtractedProduct[];
  onConfirm: (selectedProducts: ExtractedProduct[]) => void;
  fileName?: string;
  summary?: {
    configurableCount: number;
    simpleCount: number;
    confidence: number;
    passes: string[];
  };
}

function OptionsDisplay({ options }: { options: ExtractedProductOption[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!options || options.length === 0) return null;

  const displayOptions = expanded ? options : options.slice(0, 3);
  const hasMore = options.length > 3;

  return (
    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
        <Gear className="w-3 h-3" />
        <span>{options.length} configuration option{options.length !== 1 ? 's' : ''}</span>
        {hasMore && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="ml-1 text-purple-600 hover:text-purple-700 flex items-center"
          >
            {expanded ? (
              <>
                <CaretDown className="w-3 h-3" />
                <span>less</span>
              </>
            ) : (
              <>
                <CaretRight className="w-3 h-3" />
                <span>+{options.length - 3} more</span>
              </>
            )}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {displayOptions.map((option, idx) => {
          const selectedValue = option.values.find(v => v.isSelected);
          return (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 rounded text-xs"
            >
              <span className="text-purple-700 dark:text-purple-300 font-medium">
                {option.optionName}:
              </span>
              <span className="text-purple-600 dark:text-purple-400">
                {selectedValue?.label || `${option.values.length} options`}
              </span>
              {selectedValue?.priceDelta && selectedValue.priceDelta > 0 && (
                <span className="text-green-600 dark:text-green-400">
                  +${selectedValue.priceDelta.toLocaleString()}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function PricingDisplay({ pricing }: { pricing: ExtractedProduct['pricing'] }) {
  if (!pricing) return null;

  const hasMaterialPricing = pricing.material?.subtotal || pricing.material?.pricePerSqFt;
  const hasFreight = pricing.freight?.total;
  const hasTotal = pricing.totalPrice || pricing.unitPrice;

  if (!hasMaterialPricing && !hasFreight && !hasTotal) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs">
      {pricing.material?.subtotal && (
        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-green-700 dark:text-green-300">
          Material: ${pricing.material.subtotal.toLocaleString()}
        </span>
      )}
      {pricing.material?.pricePerSqFt && (
        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-green-700 dark:text-green-300">
          ${pricing.material.pricePerSqFt}/sqft
        </span>
      )}
      {hasFreight && (
        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 rounded text-orange-700 dark:text-orange-300">
          Freight: ${pricing.freight!.total!.toLocaleString()}
        </span>
      )}
      {pricing.totalPrice && (
        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-700 dark:text-blue-300 font-medium">
          Total: ${pricing.totalPrice.toLocaleString()}
        </span>
      )}
    </div>
  );
}

export function ExtractedProductsPreview({
  open,
  onOpenChange,
  products,
  onConfirm,
  fileName,
  summary,
}: ExtractedProductsPreviewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(products.map(p => p.id))
  );

  const toggleProduct = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(products.map(p => p.id)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = () => {
    const selectedProducts = products.filter(p => selectedIds.has(p.id));
    onConfirm(selectedProducts);
    onOpenChange(false);
  };

  const selectedCount = selectedIds.size;
  const configurableCount = products.filter(p => p.isConfigurable).length;
  const simpleCount = products.length - configurableCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkle className="w-5 h-5 text-purple-600" />
            AI Extracted Products
            {fileName && (
              <span className="text-sm font-normal text-gray-500">
                from {fileName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Summary Bar */}
        <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedCount} of {products.length} selected
            </span>
            <div className="flex gap-1">
              {configurableCount > 0 && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  <Gear className="w-3 h-3 mr-1" />
                  {configurableCount} configurable
                </Badge>
              )}
              {simpleCount > 0 && (
                <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  <ListBullets className="w-3 h-3 mr-1" />
                  {simpleCount} line items
                </Badge>
              )}
            </div>
            {summary?.confidence && (
              <span className="text-xs text-gray-400">
                {Math.round(summary.confidence * 100)}% confidence
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={selectNone}>
              Select None
            </Button>
          </div>
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {products.map((product) => (
            <div
              key={product.id}
              className={`
                p-3 rounded-lg border transition-colors cursor-pointer
                ${selectedIds.has(product.id)
                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
                }
              `}
              onClick={() => toggleProduct(product.id)}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedIds.has(product.id)}
                  onCheckedChange={() => toggleProduct(product.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  {/* Product Header */}
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {product.name}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                      x{product.quantity} {product.unit}
                    </span>
                    {product.isConfigurable && (
                      <Badge variant="outline" className="text-purple-600 border-purple-300 text-xs">
                        <Gear className="w-3 h-3 mr-1" />
                        Configurable
                      </Badge>
                    )}
                  </div>

                  {/* Product Hierarchy */}
                  {(product.manufacturer || product.series || product.model) && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {[
                        product.manufacturer,
                        product.series,
                        product.model && `Model: ${product.model}`
                      ].filter(Boolean).join(' • ')}
                    </div>
                  )}

                  {/* Key Details */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {product.productType && (
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                        {product.productType}
                      </span>
                    )}
                    {product.productCategory && (
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                        {product.productCategory}
                      </span>
                    )}
                    {product.performanceRatings?.stc && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-700 dark:text-blue-300">
                        STC {product.performanceRatings.stc}
                      </span>
                    )}
                    {product.performanceRatings?.fireRating && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 rounded text-red-700 dark:text-red-300">
                        {product.performanceRatings.fireRating}
                      </span>
                    )}
                    {product.appearance?.color && (
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded text-purple-700 dark:text-purple-300">
                        {product.appearance.color}
                      </span>
                    )}
                  </div>

                  {/* Options (for configurable products) */}
                  {product.isConfigurable && product.options && (
                    <OptionsDisplay options={product.options} />
                  )}

                  {/* Pricing (for configurable products) */}
                  {product.isConfigurable && product.pricing && (
                    <PricingDisplay pricing={product.pricing} />
                  )}

                  {/* Description Preview */}
                  {product.description && !product.isConfigurable && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Check className="w-4 h-4 mr-2" />
            Add {selectedCount} Product{selectedCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
