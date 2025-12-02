/**
 * ProductsTable Component
 *
 * Card-row list with always-editable inputs for products.
 * Clicking + immediately creates a new product.
 */

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product, CreateProductInput } from '@/lib/types/products';
import { PRODUCT_CATEGORIES } from '@/lib/types/products';
import { Trash2, Plus } from 'lucide-react';

interface ProductsTableProps {
  products: Product[];
  onEdit: (productId: string, input: CreateProductInput) => Promise<void>;
  onCreate: (input: CreateProductInput) => Promise<void>;
  onDelete: (productId: string) => void;
  isLoading?: boolean;
  isSaving?: boolean;
}

export const ProductsTable = ({
  products,
  onEdit,
  onCreate,
  onDelete,
  isLoading = false,
  isSaving = false,
}: ProductsTableProps) => {
  // Handle field blur for existing product - saves on blur
  const handleFieldBlur = useCallback(
    async (product: Product, field: string, value: string) => {
      // Get current value for comparison
      const currentValue =
        field === 'display_id'
          ? product.display_id || `${product.product_number}`
          : field === 'price'
            ? product.price !== null
              ? product.price.toString()
              : ''
            : field === 'category'
              ? product.category || ''
              : product.name;

      // Skip if value hasn't changed
      if (value === currentValue) return;

      const input: CreateProductInput = {
        name: product.name,
        display_id: product.display_id || undefined,
        category: product.category || undefined,
        price: product.price ?? undefined,
      };

      // Update the specific field
      if (field === 'price') {
        const parsed = parseFloat(value);
        input.price = value === '' ? undefined : isNaN(parsed) ? undefined : parsed;
      } else if (field === 'category') {
        input.category = value || undefined;
      } else if (field === 'display_id') {
        // Only save if user changed from the auto-generated number
        const autoId = `${product.product_number}`;
        input.display_id = value === autoId ? undefined : value || undefined;
      } else if (field === 'name') {
        if (!value.trim()) return; // Don't save empty name
        input.name = value.trim();
      }

      await onEdit(product.id, input);
    },
    [onEdit]
  );

  // Handle price input validation
  const handlePriceInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      return value;
    }
    return e.target.defaultValue;
  };

  // Handle add new product - immediately creates with default name
  const handleAddProduct = useCallback(async () => {
    await onCreate({ name: 'New Product' });
  }, [onCreate]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 bg-card border rounded-lg"
          >
            <Skeleton className="h-11 w-28" />
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 w-44" />
            <Skeleton className="h-11 w-32" />
            <Skeleton className="h-11 w-11" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Existing product rows - always editable */}
      {products.map((product) => (
        <div
          key={`${product.id}-${product.product_number}-${product.updated_at}`}
          className="flex items-center gap-3 p-3 bg-card border rounded-lg"
        >
          {/* Product ID */}
          <div className="w-28 flex-shrink-0">
            <Input
              defaultValue={product.display_id || `${product.product_number}`}
              onBlur={(e) => handleFieldBlur(product, 'display_id', e.target.value)}
              placeholder="ID"
              className="h-11 text-sm font-mono rounded-sm"
              disabled={isSaving}
            />
          </div>

          {/* Name */}
          <div className="w-[440px] flex-shrink-0">
            <Input
              defaultValue={product.name}
              onBlur={(e) => handleFieldBlur(product, 'name', e.target.value)}
              placeholder="Product name"
              className="h-11 rounded-sm"
              disabled={isSaving}
            />
          </div>

          {/* Category */}
          <div className="w-52 flex-shrink-0">
            <Select
              defaultValue={product.category || undefined}
              onValueChange={(value) =>
                handleFieldBlur(product, 'category', value)
              }
              disabled={isSaving}
            >
              <SelectTrigger className="h-11 rounded-sm">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price */}
          <div className="w-52 flex-shrink-0">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                $
              </span>
              <Input
                defaultValue={product.price !== null ? product.price.toString() : ''}
                onBlur={(e) => handleFieldBlur(product, 'price', e.target.value)}
                onChange={(e) => {
                  const validated = handlePriceInput(e);
                  if (validated !== e.target.value) {
                    e.target.value = validated;
                  }
                }}
                placeholder="0.00"
                className="h-11 pl-6 text-right rounded-sm"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(product.id)}
            disabled={isSaving}
            className="h-11 w-11 p-0 text-red-500 hover:text-red-700 bg-transparent hover:bg-transparent"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}

      {/* Add Product Button - immediately creates a new product */}
      <button
        onClick={handleAddProduct}
        disabled={isSaving}
        className="flex items-center gap-3 p-3 w-full border-2 border-dashed rounded-lg hover:bg-muted/30 hover:border-muted-foreground/50 transition-colors text-muted-foreground disabled:opacity-50"
      >
        <div className="w-28 flex-shrink-0 flex justify-center">
          <Plus className="w-4 h-4" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm">Add new product</span>
        </div>
      </button>
    </div>
  );
};
