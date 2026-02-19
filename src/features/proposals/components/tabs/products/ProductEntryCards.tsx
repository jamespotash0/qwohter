/**
 * Product Entry Cards
 *
 * Two side-by-side cards shown when no products exist yet.
 * Card 1: Product Line Item (manual entry)
 * Card 2: Product Catalog (browse catalog + AI upload)
 */

import { Package, Database, UploadSimple, Plus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProductEntryCardsProps {
  onAddLineItem: () => void;
  onBrowseCatalog: () => void;
  onUploadDocument: () => void;
  isExtracting: boolean;
}

export function ProductEntryCards({
  onAddLineItem,
  onBrowseCatalog,
  onUploadDocument,
  isExtracting,
}: ProductEntryCardsProps) {
  const cardBase = cn(
    'bg-white dark:bg-gray-800 rounded-xl shadow-sm',
    'border border-gray-100 dark:border-gray-700/50',
    'p-8 flex flex-col items-center text-center',
    'transition-all hover:shadow-md',
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Card 1: Product Line Item */}
      <div className={cn(cardBase, 'hover:border-gray-300 dark:hover:border-gray-600')}>
        <Package className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-3" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Product Line Item
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-4 leading-relaxed max-w-xs">
          Manually enter product name, model, SKU, and description
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddLineItem}
          className="text-coral hover:text-coral-hover hover:bg-coral/5 h-8 text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Line Item
        </Button>
      </div>

      {/* Card 2: Product Catalog */}
      <div className={cn(cardBase, 'hover:border-emerald-300 dark:hover:border-emerald-600')}>
        <Database className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mb-3" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Product Catalog
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-4 leading-relaxed max-w-xs">
          Browse your product catalog or upload a document for AI extraction
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onBrowseCatalog}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
          >
            <Database className="w-3.5 h-3.5 mr-1" />
            Browse Catalog
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onUploadDocument}
            disabled={isExtracting}
            className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20 h-8 text-xs"
          >
            <UploadSimple className="w-3.5 h-3.5 mr-1" />
            {isExtracting ? 'Extracting...' : 'Upload (AI)'}
          </Button>
        </div>
      </div>
    </div>
  );
}
