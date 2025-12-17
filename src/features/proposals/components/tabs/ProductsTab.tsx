/**
 * Products Tab
 *
 * Two modes for entering product data:
 * 1. Manual Entry - Line item style product list
 * 2. AI Extract - Upload document and extract product data with AI
 *
 * Builder Mode: Disabled (no functionality)
 * Filler Mode: Full functionality - persisted via FormBuilderContext
 */

import { useState, useCallback, useRef } from 'react';
import { Plus, Trash, UploadSimple, Package, Sparkle } from '@phosphor-icons/react';
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
import { toast } from 'sonner';
import type { EditorMode } from '../ProposalEditor';
import { extractProductsFromFile } from '@/services/productExtraction';
import { useFormBuilder, type Product } from '../../context/FormBuilderContext';
import { ExtractedProductsPreview } from './ExtractedProductsPreview';
import { generateProductAlias } from '../../utils/productVariables';

interface ProductsTabProps {
  mode: EditorMode;
  onDirtyChange?: (isDirty: boolean) => void;
}

const UNITS = [
  { value: 'ea', label: 'Each' },
  { value: 'box', label: 'Box' },
  { value: 'case', label: 'Case' },
  { value: 'ft', label: 'Feet' },
  { value: 'sqft', label: 'Sq Ft' },
  { value: 'lbs', label: 'Pounds' },
  { value: 'gal', label: 'Gallon' },
];

type EntryMode = 'manual' | 'ai-extract';

export function ProductsTab({ mode, onDirtyChange }: ProductsTabProps) {
  const isBuilderMode = mode === 'builder';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use context for products data persistence
  const { data, setProductsData } = useFormBuilder();
  const products = data.products.items;

  const [entryMode, setEntryMode] = useState<EntryMode>('manual');
  const [extracting, setExtracting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [extractedProducts, setExtractedProducts] = useState<Product[]>([]);
  const [extractedFileName, setExtractedFileName] = useState<string>();

  // Helper function to determine if a product was AI-extracted (has rawData)
  const isAIExtractedProduct = useCallback((product: Product): boolean => {
    return !!(product.rawData && Object.keys(product.rawData).length > 0);
  }, []);

  // Separate products by source
  const aiExtractedProducts = products.filter(isAIExtractedProduct);
  const manualProducts = products.filter(p => !isAIExtractedProduct(p));

  // Add new product
  const addProduct = useCallback(() => {
    const newProduct: Product = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      quantity: 1,
      unit: 'ea',
      description: '',
    };
    setProductsData({ items: [...products, newProduct] });
    onDirtyChange?.(true);
  }, [products, setProductsData, onDirtyChange]);

  // Update product
  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    const updatedProducts = products.map(product =>
      product.id === id ? { ...product, ...updates } : product
    );
    setProductsData({ items: updatedProducts });
    onDirtyChange?.(true);
  }, [products, setProductsData, onDirtyChange]);

  // Remove product
  const removeProduct = useCallback((id: string) => {
    setProductsData({ items: products.filter(product => product.id !== id) });
    onDirtyChange?.(true);
  }, [products, setProductsData, onDirtyChange]);

  // Handle file upload for AI extraction
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    handleAIExtract(file);
  }, []);

  // Handle AI extraction - shows preview modal
  const handleAIExtract = useCallback(async (file: File) => {
    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'image/jpeg',
      'image/jpg',
      'image/png',
      'text/plain',
    ];

    // Also check by extension for DOCX (some browsers report different MIME types)
    const isValidExtension = file.name.toLowerCase().endsWith('.docx');

    if (!validTypes.includes(file.type) && !isValidExtension) {
      toast.error('Invalid file type. Please upload PDF, DOCX, image, or text file.');
      return;
    }

    setExtracting(true);

    try {
      // Use the real AI extraction service
      const extracted = await extractProductsFromFile(file);

      if (extracted.length === 0) {
        toast.warning(`No products found in ${file.name}`);
      } else {
        // Show preview modal instead of directly adding
        setExtractedProducts(extracted as Product[]);
        setExtractedFileName(file.name);
        setPreviewOpen(true);
        toast.success(`Found ${extracted.length} product${extracted.length === 1 ? '' : 's'}. Review before adding.`);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('AI extraction error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to extract products: ${errorMessage}`);
    } finally {
      setExtracting(false);
    }
  }, []);

  // Handle confirming selected products from preview
  const handleConfirmExtraction = useCallback((selectedProducts: Product[]) => {
    if (selectedProducts.length > 0) {
      // Get existing aliases to avoid duplicates
      const existingAliases = products
        .filter(p => p.alias)
        .map(p => p.alias as string);

      // Auto-generate aliases for AI-extracted products using reduce for accumulation
      const generatedAliases: string[] = [];
      const productsWithAliases = selectedProducts.map((product, index) => {
        // Only generate alias for AI-extracted products (those with rawData)
        if (product.rawData && Object.keys(product.rawData).length > 0 && !product.alias) {
          const allAliases = [...existingAliases, ...generatedAliases];
          const alias = generateProductAlias(product, allAliases, index);
          generatedAliases.push(alias);
          return { ...product, alias };
        }
        return product;
      });

      setProductsData({ items: [...products, ...productsWithAliases] });
      onDirtyChange?.(true);
      toast.success(`Added ${selectedProducts.length} product${selectedProducts.length === 1 ? '' : 's'} with variable aliases`);
    }
    setExtractedProducts([]);
    setExtractedFileName(undefined);
  }, [products, setProductsData, onDirtyChange]);

  // Input styling
  const inputClassName = cn(
    'h-9 rounded-lg border-gray-200 dark:border-gray-600',
    'focus:ring-2 focus:ring-coral/20 focus:border-coral',
    'transition-colors'
  );

  // Builder mode: Show disabled state
  if (isBuilderMode) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium">Products Tab</p>
          <p className="text-sm mt-1">
            Products are added when filling out proposals
          </p>
        </div>
      </div>
    );
  }

  // Filler mode: Full functionality
  return (
    <div className="space-y-4">
      {/* Header with Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {entryMode === 'manual'
              ? `${manualProducts.length} manual product${manualProducts.length !== 1 ? 's' : ''}`
              : `${aiExtractedProducts.length} AI-extracted product${aiExtractedProducts.length !== 1 ? 's' : ''}`
            }
          </span>
          {products.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              ({products.length} total)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button
            onClick={() => setEntryMode('manual')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              entryMode === 'manual'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setEntryMode('ai-extract')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              entryMode === 'ai-extract'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            Upload (AI)
          </button>
        </div>
      </div>

      {/* AI Extract Mode */}
      {entryMode === 'ai-extract' && (
        <div className="space-y-4">
          {/* Upload Section */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Sparkle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  AI-Powered Product Extraction
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Upload a document (PDF, Word, or text) and our AI will automatically extract product information including names, quantities, and descriptions.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.docx,.png,.jpg,.jpeg,.txt"
                  disabled={extracting}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={extracting}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <UploadSimple className="w-4 h-4 mr-2" />
                  {extracting ? 'Extracting...' : 'Upload Document'}
                </Button>
              </div>
            </div>
          </div>

          {/* AI Extracted Products Display */}
          {aiExtractedProducts.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  AI-Extracted Products ({aiExtractedProducts.length})
                </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {aiExtractedProducts.map((product) => (
                        <div
                          key={product.id}
                          className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                        >
                          {/* Product Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                <h5 className="font-semibold text-gray-900 dark:text-gray-100">
                                  {product.name}
                                </h5>
                              </div>
                              {/* Product Hierarchy */}
                              {(product.rawData?.manufacturer || product.rawData?.series) && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {[product.rawData.manufacturer, product.rawData.series].filter(Boolean).join(' • ')}
                                  {product.rawData.model && (
                                    <span className="ml-1">({product.rawData.model})</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => removeProduct(product.id)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Variable Alias */}
                          <div className="mb-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                Variable Alias:
                              </span>
                              <Input
                                value={product.alias || ''}
                                onChange={(e) => updateProduct(product.id, { alias: e.target.value.replace(/[^a-zA-Z0-9]/g, '') })}
                                placeholder="e.g., wallA"
                                className="h-7 text-xs font-mono flex-1 bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-700"
                              />
                            </div>
                            {product.alias && (
                              <div className="mt-1.5 text-xs text-purple-600 dark:text-purple-400">
                                Use in templates: <code className="px-1 py-0.5 bg-purple-100 dark:bg-purple-800 rounded font-mono">{'{' + product.alias + '.stc}'}</code>
                                {', '}
                                <code className="px-1 py-0.5 bg-purple-100 dark:bg-purple-800 rounded font-mono">{'{' + product.alias + '.manufacturer}'}</code>
                                {' etc.'}
                              </div>
                            )}
                          </div>

                          {/* Product Details */}
                          <div className="space-y-2 text-xs">
                            {/* Quantity */}
                            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                              <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {product.quantity} {product.unit}
                              </span>
                            </div>

                            {/* Category */}
                            {(product.rawData?.productType || product.rawData?.productCategory) && (
                              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400">Category:</span>
                                <span className="text-gray-900 dark:text-gray-100">
                                  {[product.rawData.productType, product.rawData.productCategory].filter(Boolean).join(' / ')}
                                </span>
                              </div>
                            )}

                            {/* Dimensions */}
                            {product.rawData?.dimensions && Object.values(product.rawData.dimensions).some(v => v) && (
                              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400">Dimensions:</span>
                                <div className="text-gray-900 dark:text-gray-100 mt-1">
                                  {Object.entries(product.rawData.dimensions)
                                    .filter(([_, v]) => v)
                                    .map(([k, v]) => `${k.charAt(0).toUpperCase()}: ${v}`)
                                    .join(', ')}
                                </div>
                              </div>
                            )}

                            {/* Performance Ratings */}
                            {product.rawData?.performanceRatings && Object.values(product.rawData.performanceRatings).some(v => v) && (
                              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400">Performance:</span>
                                <div className="text-gray-900 dark:text-gray-100 mt-1">
                                  {product.rawData.performanceRatings.stc && `STC ${product.rawData.performanceRatings.stc}`}
                                  {product.rawData.performanceRatings.fireRating && ` • Fire: ${product.rawData.performanceRatings.fireRating}`}
                                  {product.rawData.performanceRatings.acousticRating && ` • ${product.rawData.performanceRatings.acousticRating}`}
                                </div>
                              </div>
                            )}

                            {/* Appearance */}
                            {product.rawData?.appearance && Object.values(product.rawData.appearance).some(v => v) && (
                              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400">Appearance:</span>
                                <div className="text-gray-900 dark:text-gray-100 mt-1">
                                  {Object.entries(product.rawData.appearance)
                                    .filter(([_, v]) => v)
                                    .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
                                    .join(', ')}
                                </div>
                              </div>
                            )}

                            {/* Materials */}
                            {product.rawData?.materials && Object.values(product.rawData.materials).some(v => v) && (
                              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400">Materials:</span>
                                <div className="text-gray-900 dark:text-gray-100 mt-1">
                                  {Object.entries(product.rawData.materials)
                                    .filter(([_, v]) => v)
                                    .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
                                    .join(', ')}
                                </div>
                              </div>
                            )}

                            {/* Certifications */}
                            {product.rawData?.certifications && product.rawData.certifications.length > 0 && (
                              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400">Certifications:</span>
                                <div className="text-gray-900 dark:text-gray-100 mt-1">
                                  {product.rawData.certifications.join(', ')}
                                </div>
                              </div>
                            )}

                            {/* Specifications */}
                            {product.rawData?.specifications && Object.keys(product.rawData.specifications).length > 0 && (
                              <div className="py-1">
                                <span className="text-gray-600 dark:text-gray-400">Specifications:</span>
                                <div className="text-gray-900 dark:text-gray-100 mt-1 space-y-0.5">
                                  {Object.entries(product.rawData.specifications).map(([k, v]) => (
                                    <div key={k}>{k}: {String(v)}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
              </div>
          )}
        </div>
      )}

      {/* Products Table - Only show in Manual Entry mode */}
      {entryMode === 'manual' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div className="col-span-4">Product Name</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-2">Unit</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-1"></div>
          </div>

          {/* Product Rows */}
          <div>
            {/* Add Product Row - First Row */}
            <div className="grid grid-cols-12 gap-3 px-4 py-2 items-center border-t border-gray-100 dark:border-gray-700/50">
              <div className="col-span-12">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addProduct}
                  className="text-coral hover:text-coral-hover hover:bg-coral/5 h-8"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Product
                </Button>
              </div>
            </div>

            {/* Product Rows - Only manual products (no rawData) */}
            {manualProducts.map((product) => (
              <div
                key={product.id}
                className="grid grid-cols-12 gap-3 px-4 py-2.5 items-center border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20"
              >
                {/* Product Name */}
                <div className="col-span-4">
                  <Input
                    value={product.name}
                    onChange={(e) =>
                      updateProduct(product.id, { name: e.target.value })
                    }
                    placeholder="Product name"
                    className={inputClassName}
                  />
                </div>

                {/* Quantity */}
                <div className="col-span-2">
                  <Input
                    type="number"
                    min={0}
                    value={product.quantity || ''}
                    onChange={(e) =>
                      updateProduct(product.id, {
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    className={cn(
                      inputClassName,
                      '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                    )}
                  />
                </div>

                {/* Unit */}
                <div className="col-span-2">
                  <Select
                    value={product.unit}
                    onValueChange={(v) =>
                      updateProduct(product.id, { unit: v })
                    }
                  >
                    <SelectTrigger className={inputClassName}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="col-span-3">
                  <Input
                    value={product.description || ''}
                    onChange={(e) =>
                      updateProduct(product.id, { description: e.target.value })
                    }
                    placeholder="Optional description"
                    className={inputClassName}
                  />
                </div>

                {/* Delete */}
                <div className="col-span-1 flex justify-center">
                  <button
                    onClick={() => removeProduct(product.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted Products Preview Modal */}
      <ExtractedProductsPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        products={extractedProducts}
        onConfirm={handleConfirmExtraction}
        fileName={extractedFileName}
      />
    </div>
  );
}

export default ProductsTab;
