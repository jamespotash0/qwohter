/**
 * Catalog Products Section
 *
 * Displays catalog-selected and AI-extracted products in a card grid.
 * Each card shows alias, manufacturer/series/model, key info, and specs.
 */

import { Database, Package, PencilSimple, Trash } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Product } from '../../../context/FormBuilderContext';
import {
  formatDimension,
  findFieldValue,
  getSpecificationFields,
  formatLabel,
  KEY_INFO_FIELDS,
} from './productHelpers';

interface CatalogProductsSectionProps {
  products: Product[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onRemoveProduct: (id: string) => void;
  onEditCatalogProduct: (product: Product) => void;
  onEditAiProduct: (product: Product) => void;
}

export function CatalogProductsSection({
  products,
  onUpdateProduct,
  onRemoveProduct,
  onEditCatalogProduct,
  onEditAiProduct,
}: CatalogProductsSectionProps) {
  return (
    <div className="space-y-2">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-1">
        <Database className="w-4 h-4 text-emerald-500" />
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Catalog Products</h3>
        <span className="text-xs text-gray-400">{products.length}</span>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {products.map((product) => (
          <CatalogProductCard
            key={product.id}
            product={product}
            onUpdate={onUpdateProduct}
            onRemove={onRemoveProduct}
            onEditCatalog={onEditCatalogProduct}
            onEditAi={onEditAiProduct}
          />
        ))}
      </div>
    </div>
  );
}

/** Single product card in the catalog grid */
function CatalogProductCard({
  product,
  onUpdate,
  onRemove,
  onEditCatalog,
  onEditAi,
}: {
  product: Product;
  onUpdate: (id: string, updates: Partial<Product>) => void;
  onRemove: (id: string) => void;
  onEditCatalog: (product: Product) => void;
  onEditAi: (product: Product) => void;
}) {
  const isCatalogProduct = product.rawData?.source === 'catalog';
  const rawData = product.rawData as unknown as Record<string, unknown> | undefined;

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 transition-colors',
        isCatalogProduct
          ? 'hover:border-emerald-300 dark:hover:border-emerald-600'
          : 'hover:border-purple-300 dark:hover:border-purple-600'
      )}
    >
      {/* Header: Alias + Actions */}
      <div className="flex items-center gap-2 mb-2">
        {isCatalogProduct ? (
          <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : (
          <Package className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <Input
            value={product.alias || ''}
            onChange={(e) => onUpdate(product.id, { alias: e.target.value.replace(/[^a-zA-Z0-9]/g, '') })}
            placeholder="Wall A"
            className="h-7 text-sm font-semibold font-mono px-2 py-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 w-24"
          />
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {isCatalogProduct ? (
            <button
              onClick={() => onEditCatalog(product)}
              className="p-1 text-gray-400 hover:text-emerald-600 transition-colors rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              title="Edit product"
            >
              <PencilSimple className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => onEditAi(product)}
              className="p-1 text-gray-400 hover:text-purple-600 transition-colors rounded hover:bg-purple-50 dark:hover:bg-purple-900/20"
              title="Edit extracted data"
            >
              <PencilSimple className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onRemove(product.id)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
          >
            <Trash className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Manufacturer | Series | Model line */}
      <ManufacturerLine rawData={rawData} />

      {/* Product Details */}
      <div className="space-y-1 text-[11px]">
        <KeyInfoRow rawData={rawData} />
        <SpecificationFields rawData={rawData} />
      </div>
    </div>
  );
}

/** Manufacturer | Series | Model display line */
function ManufacturerLine({ rawData }: { rawData: Record<string, unknown> | undefined }) {
  const manufacturer = rawData?.manufacturer as string | undefined;
  const series = rawData?.series as string | undefined;
  const model = rawData?.model as string | undefined;
  if (!manufacturer && !series && !model) return null;

  return (
    <div className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400 mb-1 pb-1 border-b border-gray-100 dark:border-gray-700">
      {manufacturer && <span className="font-medium">{manufacturer}</span>}
      {manufacturer && series && <span className="text-gray-400">|</span>}
      {series && <span>{series}</span>}
      {(manufacturer || series) && model && <span className="text-gray-400">|</span>}
      {model && <span className="font-mono">{model}</span>}
    </div>
  );
}

/** Key Info Row: Dimensions | Panels | Qty | Glass */
function KeyInfoRow({ rawData }: { rawData: Record<string, unknown> | undefined }) {
  const heightVal = findFieldValue(rawData, KEY_INFO_FIELDS.height);
  const widthVal = findFieldValue(rawData, KEY_INFO_FIELDS.width);
  const panelCountVal = findFieldValue(rawData, KEY_INFO_FIELDS.panelCount);
  const quantityVal = findFieldValue(rawData, KEY_INFO_FIELDS.quantity);
  const glassTypeVal = findFieldValue(rawData, KEY_INFO_FIELDS.glassType);
  const specLabels = rawData?._specificationLabels as Record<string, string> | undefined;
  const hasKeyInfo = heightVal || widthVal || panelCountVal || quantityVal || glassTypeVal;

  if (!hasKeyInfo) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1 border-b border-gray-200 dark:border-gray-600">
      {(heightVal || widthVal) && (
        <div className="flex items-center gap-1">
          <span className="text-gray-500 dark:text-gray-400">Dimensions:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {heightVal != null && <>{formatDimension(String(heightVal))} H</>}
            {heightVal && widthVal && ' x '}
            {widthVal != null && <>{formatDimension(String(widthVal))} W</>}
          </span>
        </div>
      )}
      {panelCountVal != null && (
        <div className="flex items-center gap-1 pl-2 border-l border-gray-300 dark:border-gray-600">
          <span className="text-gray-500 dark:text-gray-400">Panels:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{String(panelCountVal)}</span>
        </div>
      )}
      {quantityVal != null && (
        <div className="flex items-center gap-1 pl-2 border-l border-gray-300 dark:border-gray-600">
          <span className="text-gray-500 dark:text-gray-400">Qty:</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{String(quantityVal)}</span>
        </div>
      )}
      {glassTypeVal != null && (
        <div className="flex items-center gap-1 pl-2 border-l border-gray-300 dark:border-gray-600">
          <span className="text-gray-500 dark:text-gray-400">Glass:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {specLabels?.glass_type || specLabels?.glassType || String(glassTypeVal)}
          </span>
        </div>
      )}
    </div>
  );
}

/** Alphabetically sorted specification fields */
function SpecificationFields({ rawData }: { rawData: Record<string, unknown> | undefined }) {
  const fields = getSpecificationFields(rawData);
  if (fields.length === 0) return null;

  const specLabels = rawData?._specificationLabels as Record<string, string> | undefined;

  return (
    <>
      {fields.map(([key, value]) => {
        const valueLabel = specLabels?.[key];
        const fieldLabelText = formatLabel(key);
        const displayValue = valueLabel || (Array.isArray(value)
          ? (value as unknown[]).map(v => String(v)).join(', ')
          : String(value));

        return (
          <div key={key} className="flex justify-between py-0.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <span className="text-gray-500 dark:text-gray-400">{fieldLabelText}:</span>
            <span className="text-gray-900 dark:text-gray-100 text-right max-w-[55%] truncate" title={displayValue}>
              {displayValue}
            </span>
          </div>
        );
      })}
    </>
  );
}
