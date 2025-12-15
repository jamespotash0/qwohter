/**
 * Products Tab
 *
 * Two modes for entering product data:
 * 1. Manual Entry - Line item style product list
 * 2. AI Extract - Upload document and extract product data with AI
 *
 * Builder Mode: Disabled (no functionality)
 * Filler Mode: Full functionality
 */

import { useState, useCallback, useRef } from 'react';
import { Plus, Trash, UploadSimple, Package, Sparkle, FileText } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

interface ProductsTabProps {
  mode: EditorMode;
}

interface Product {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  description?: string;
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

export function ProductsTab({ mode }: ProductsTabProps) {
  const isBuilderMode = mode === 'builder';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [entryMode, setEntryMode] = useState<EntryMode>('manual');
  // Start with empty products array
  const [products, setProducts] = useState<Product[]>([]);
  const [extracting, setExtracting] = useState(false);

  // Add new product
  const addProduct = useCallback(() => {
    const newProduct: Product = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      quantity: 1,
      unit: 'ea',
      description: '',
    };
    setProducts(prev => [...prev, newProduct]);
  }, []);

  // Update product
  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts(prev =>
      prev.map(product =>
        product.id === id ? { ...product, ...updates } : product
      )
    );
  }, []);

  // Remove product
  const removeProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(product => product.id !== id));
  }, []);

  // Handle file upload for AI extraction
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    handleAIExtract(files[0]);
  }, []);

  // Handle AI extraction
  const handleAIExtract = useCallback(async (file: File) => {
    // Validate file type
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'text/plain',
    ];

    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PDF, image, or text file.');
      return;
    }

    setExtracting(true);

    try {
      // TODO: Implement actual AI extraction
      // This would call an API endpoint that uses AI to extract product data from the file

      // Simulate AI extraction delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock extracted products
      const extractedProducts: Product[] = [
        {
          id: Math.random().toString(36).substr(2, 9),
          name: 'Product A (Extracted)',
          quantity: 10,
          unit: 'ea',
          description: 'Extracted from document',
        },
        {
          id: Math.random().toString(36).substr(2, 9),
          name: 'Product B (Extracted)',
          quantity: 5,
          unit: 'box',
          description: 'Extracted from document',
        },
      ];

      setProducts(prev => [...prev, ...extractedProducts]);
      toast.success(`Extracted ${extractedProducts.length} products from ${file.name}`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('AI extraction error:', error);
      toast.error('Failed to extract products from file');
    } finally {
      setExtracting(false);
    }
  }, []);

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
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {products.length} {products.length === 1 ? 'product' : 'products'}
          </span>
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
                  Upload a document (PDF, image, or text) and our AI will automatically extract product information including names, quantities, and descriptions.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.txt"
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

          {/* Extracted Products Cards */}
          {products.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Extracted Products ({products.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <h5 className="font-semibold text-gray-900 dark:text-gray-100">
                          {product.name || 'Untitled Product'}
                        </h5>
                      </div>
                      <button
                        onClick={() => removeProduct(product.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {product.quantity} {product.unit}
                        </span>
                      </div>
                      {product.description && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Description:</span>
                          <p className="text-gray-900 dark:text-gray-100 mt-1">
                            {product.description}
                          </p>
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

            {/* Product Rows */}
            {products.map((product) => (
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
    </div>
  );
}

export default ProductsTab;
