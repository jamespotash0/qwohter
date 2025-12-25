/**
 * Extracted Products Preview Modal
 * Shows AI-extracted products for user review before adding
 * Supports human-in-the-loop editing for correction of AI extraction
 */

import { useState, useCallback, useEffect } from 'react';
import { Check, X, Sparkle, Gear, ListBullets, PencilSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ExtractedProductEditor } from './ExtractedProductEditor';
import type { ExtractedProduct } from '@/services/productExtraction';

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

export function ExtractedProductsPreview({
  open,
  onOpenChange,
  products,
  onConfirm,
  fileName,
  summary,
}: ExtractedProductsPreviewProps) {
  // Track selected products
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(products.map(p => p.id))
  );

  // Track edited products (human-in-the-loop edits)
  const [editedProducts, setEditedProducts] = useState<Map<string, ExtractedProduct>>(
    () => new Map(products.map(p => [p.id, p]))
  );

  // Reset edited products when products change
  useEffect(() => {
    setEditedProducts(new Map(products.map(p => [p.id, p])));
    setSelectedIds(new Set(products.map(p => p.id)));
  }, [products]);

  const toggleProduct = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleProductChange = useCallback((id: string, updatedProduct: ExtractedProduct) => {
    setEditedProducts(prev => {
      const next = new Map(prev);
      next.set(id, updatedProduct);
      return next;
    });
  }, []);

  const selectAll = () => {
    setSelectedIds(new Set(products.map(p => p.id)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = () => {
    // Use edited versions of selected products
    const selectedProducts = Array.from(selectedIds)
      .map(id => editedProducts.get(id))
      .filter((p): p is ExtractedProduct => p !== undefined);
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

        {/* Human-in-the-loop hint */}
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <PencilSimple className="w-4 h-4 text-amber-600" />
          <span className="text-xs text-amber-700 dark:text-amber-300">
            Click the expand arrow to review and edit extracted fields. Changes are preserved when you confirm.
          </span>
        </div>

        {/* Products List with Editable Fields */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {products.map((product) => {
            const editedProduct = editedProducts.get(product.id) || product;
            return (
              <ExtractedProductEditor
                key={product.id}
                product={editedProduct}
                onChange={(updated) => handleProductChange(product.id, updated)}
                isSelected={selectedIds.has(product.id)}
                onToggleSelect={() => toggleProduct(product.id)}
              />
            );
          })}
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
