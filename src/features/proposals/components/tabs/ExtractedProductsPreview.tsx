/**
 * Extracted Products Preview Modal
 * Shows AI-extracted products for user review before adding
 */

import { useState } from 'react';
import { Check, X, Trash, Package, Sparkle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Product } from '../../context/FormBuilderContext';

interface ExtractedProductsPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onConfirm: (selectedProducts: Product[]) => void;
  fileName?: string;
}

export function ExtractedProductsPreview({
  open,
  onOpenChange,
  products,
  onConfirm,
  fileName,
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
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedCount} of {products.length} products selected
          </span>
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
                  </div>

                  {/* Product Hierarchy */}
                  {product.rawData && (product.rawData.manufacturer || product.rawData.series || product.rawData.model) && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {[
                        product.rawData.manufacturer,
                        product.rawData.series,
                        product.rawData.model && `Model: ${product.rawData.model}`
                      ].filter(Boolean).join(' • ')}
                    </div>
                  )}

                  {/* Key Details */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {product.rawData?.productType && (
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                        {product.rawData.productType}
                      </span>
                    )}
                    {product.rawData?.productCategory && (
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                        {product.rawData.productCategory}
                      </span>
                    )}
                    {product.rawData?.performanceRatings?.stc && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-700 dark:text-blue-300">
                        STC {product.rawData.performanceRatings.stc}
                      </span>
                    )}
                    {product.rawData?.performanceRatings?.fireRating && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 rounded text-red-700 dark:text-red-300">
                        {product.rawData.performanceRatings.fireRating}
                      </span>
                    )}
                    {product.rawData?.appearance?.color && (
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded text-purple-700 dark:text-purple-300">
                        {product.rawData.appearance.color}
                      </span>
                    )}
                  </div>

                  {/* Description Preview */}
                  {product.description && (
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
