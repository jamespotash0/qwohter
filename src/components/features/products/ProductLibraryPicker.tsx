/**
 * Product Library Picker
 *
 * Pick an item from the organization's own product list.
 *
 * Replaces the cascading catalog selector, which walked a
 * domain → manufacturer → line → series → model hierarchy with per-model
 * configuration schemas. Maintaining that catalog meant tracking manufacturer
 * price books, and specification tools (CET, Giza, 2020) already resolve part
 * numbers, options, and list price before a line ever reaches this app. What is
 * left is a flat list the dealer curates for labor, freight, and ancillary
 * items — which is what this picks from.
 */

import { useMemo, useState } from 'react';
import { MagnifyingGlass, Package, Plus } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProducts } from '@/hooks/useProducts';
import type { Product } from '@/lib/types/products';

interface ProductLibraryPickerProps {
  organizationId: string | undefined;
  /** Add the item and close. */
  onSelect: (product: Product) => void;
  /** Add the item and stay open, for building a list in one pass. */
  onSelectAndContinue?: (product: Product) => void;
  onCancel?: () => void;
  className?: string;
}

/** Manufacturer / series / model, for whichever of them a product carries. */
function describe(product: Product): string {
  return [product.manufacturer, product.series, product.model]
    .filter(part => part?.trim())
    .join(' · ');
}

function formatAmount(product: Product): string | null {
  if (product.amount === null) return null;
  const value = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(product.amount);
  return product.amount_unit && product.amount_unit !== 'Flat'
    ? `${value} / ${product.amount_unit}`
    : value;
}

export function ProductLibraryPicker({
  organizationId,
  onSelect,
  onSelectAndContinue,
  onCancel,
  className,
}: ProductLibraryPickerProps) {
  const [search, setSearch] = useState('');
  const { data: products = [], isLoading } = useProducts(organizationId);

  // The list is org-curated and small, so filtering locally beats a round trip
  // per keystroke.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(product =>
      [
        product.name,
        product.display_id,
        product.manufacturer,
        product.series,
        product.model,
        product.category,
      ]
        .filter(Boolean)
        .some(field => field!.toLowerCase().includes(term))
    );
  }, [products, search]);

  return (
    <div className={className}>
      <div className="relative mb-4">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search by name, number, manufacturer, or model"
          className="pl-9"
          autoFocus
        />
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-gray-500">Loading products…</p>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500">
            {products.length === 0
              ? 'No products yet. Add them under Products to reuse them across proposals.'
              : `Nothing matches “${search.trim()}”.`}
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[52vh] pr-3">
          <div className="space-y-1.5">
            {filtered.map(product => {
              const subtitle = describe(product);
              const amount = formatAmount(product);
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {product.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      {product.display_id && <span>{product.display_id}</span>}
                      {subtitle && <span className="truncate">{subtitle}</span>}
                      {amount && <span className="tabular-nums">{amount}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {onSelectAndContinue && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onSelectAndContinue(product)}
                        title="Add and keep this list open"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                    <Button size="sm" onClick={() => onSelect(product)}>
                      Add
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {onCancel && (
        <div className="mt-4 flex justify-end border-t border-gray-200 dark:border-gray-700 pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export default ProductLibraryPicker;
