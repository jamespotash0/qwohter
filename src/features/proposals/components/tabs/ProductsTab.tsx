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

import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash, UploadSimple, Package, CurrencyDollar, CaretDown, Check, Database, PencilSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { TAB_INPUT_CLASS } from './shared/tabStyles';
import { toast } from 'sonner';
import type { EditorMode } from '../ProposalEditor';
import { extractProductsWithSummary, type ExtractedProduct, type ExtractionResult } from '@/services/productExtraction';
import { useFormBuilder, type Product, type PricingSection, type PricingLineItem } from '../../context/FormBuilderContext';
import { ExtractedProductsPreview } from './ExtractedProductsPreview';
import { ExtractionProgressDialog } from './ExtractionProgressDialog';
import { ExtractedProductEditor } from './ExtractedProductEditor';
import { generateProductAlias } from '../../utils/productVariables';
import { CascadingProductSelectorV2 } from '@/components/features/products/CascadingProductSelectorV2';
import { useProductStore, type ProductSelection } from '@/stores/products/productStore';

interface ProductsTabProps {
  mode: EditorMode;
  onDirtyChange?: (isDirty: boolean) => void;
}

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

type EntryMode = 'manual' | 'selector';

export function ProductsTab({ mode, onDirtyChange }: ProductsTabProps) {
  const isBuilderMode = mode === 'builder';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use context for products and pricing data persistence
  const { data, setProductsData, setPricingData } = useFormBuilder();
  const products = data.products.items;
  const pricingSections = data.pricing.sections;

  const [entryMode, setEntryMode] = useState<EntryMode>('manual');
  const [extracting, setExtracting] = useState(false);
  const [extractingFile, setExtractingFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([]);
  const [extractedFileName, setExtractedFileName] = useState<string>();
  const [extractionSummary, setExtractionSummary] = useState<ExtractionResult['summary']>();

  // Catalog selection state
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { reset: resetProductStore, fetchTypes, restoreFromProduct } = useProductStore();

  // AI-extracted product editing state
  const [aiEditDialogOpen, setAiEditDialogOpen] = useState(false);
  const [editingAiProduct, setEditingAiProduct] = useState<Product | null>(null);

  // Pre-fetch product types when selector mode is selected
  useEffect(() => {
    if (entryMode === 'selector') {
      fetchTypes();
    }
  }, [entryMode, fetchTypes]);

  // Helper function to determine if a product was AI-extracted or from catalog
  // Check for rawData.source specifically - manual products may have rawData.model but no source
  const isAIExtractedProduct = useCallback((product: Product): boolean => {
    return !!(product.rawData?.source);
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

  // Update product and cascade relevant changes to linked pricing items
  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    const updatedProducts = products.map(product =>
      product.id === id ? { ...product, ...updates } : product
    );
    setProductsData({ items: updatedProducts });

    // Cascade updates to linked pricing line items
    // Only cascade: unitCost, quantity, name, discountPercent, rawData.model
    const pricingUpdates: Partial<PricingLineItem> = {};
    if ('unitCost' in updates) pricingUpdates.unitCost = updates.unitCost || 0;
    if ('quantity' in updates) pricingUpdates.quantity = updates.quantity || 0;
    if ('name' in updates) pricingUpdates.name = updates.name || '';
    if ('discountPercent' in updates) {
      pricingUpdates.discountValue = updates.discountPercent || 0;
      pricingUpdates.discountType = 'percent';
    }
    if ('rawData' in updates && updates.rawData?.model !== undefined) {
      pricingUpdates.modelNumber = updates.rawData.model || undefined;
    }

    // Only update pricing if there are relevant changes
    if (Object.keys(pricingUpdates).length > 0) {
      const updatedPricingSections = pricingSections.map(section => ({
        ...section,
        lineItems: section.lineItems.map(item =>
          item.sourceProductId === id
            ? { ...item, ...pricingUpdates }
            : item
        ),
      }));

      // Check if any pricing item was actually linked to this product
      const hasLinkedItem = pricingSections.some(section =>
        section.lineItems.some(item => item.sourceProductId === id)
      );

      if (hasLinkedItem) {
        setPricingData({
          ...data.pricing,
          sections: updatedPricingSections,
        });
      }
    }

    onDirtyChange?.(true);
  }, [products, setProductsData, pricingSections, data.pricing, setPricingData, onDirtyChange]);

  // Remove product and cascade delete from pricing
  const removeProduct = useCallback((id: string) => {
    // Remove from products
    setProductsData({ items: products.filter(product => product.id !== id) });

    // Cascade delete: remove any pricing line items linked to this product
    const updatedPricingSections = pricingSections.map(section => ({
      ...section,
      lineItems: section.lineItems.filter(item => item.sourceProductId !== id),
    }));

    // Only update pricing if something changed
    const hasChanges = pricingSections.some((section, i) => {
      const updatedSection = updatedPricingSections[i];
      return updatedSection && section.lineItems.length !== updatedSection.lineItems.length;
    });

    if (hasChanges) {
      setPricingData({
        ...data.pricing,
        sections: updatedPricingSections,
      });
      toast.info('Also removed linked pricing item(s)');
    }

    onDirtyChange?.(true);
  }, [products, setProductsData, pricingSections, data.pricing, setPricingData, onDirtyChange]);

  // Add product to pricing tab as a line item in specified section
  const addToPricing = useCallback((product: Product, targetSectionId?: string) => {
    let updatedSections = [...pricingSections];
    let targetSection: PricingSection | undefined;

    if (targetSectionId) {
      // Use specified section
      targetSection = updatedSections.find(s => s.id === targetSectionId);
    }

    if (!targetSection) {
      // Fall back to or create "Merchandise" section
      targetSection = updatedSections.find(s => s.type === 'merchandise');
      if (!targetSection) {
        targetSection = {
          id: 'merchandise',
          name: 'Merchandise',
          type: 'merchandise',
          collapsed: false,
          lineItems: [],
        };
        updatedSections = [targetSection, ...updatedSections];
      }
    }

    // Check if product is already in this section
    const alreadyExists = targetSection.lineItems.some(
      item => item.sourceProductId === product.id
    );

    if (alreadyExists) {
      toast.warning(`"${product.name || 'Product'}" is already in ${targetSection.name}`);
      return;
    }

    // Add product as line item with link back to source product
    // Pricing details (qty, cost, markup, etc.) are entered in the Pricing tab
    const newLineItem = {
      id: `${Date.now()}`,
      name: product.name || 'Unnamed Product',
      modelNumber: product.rawData?.model || undefined,
      quantity: 1,
      sellRule: 'per_unit',
      unitCost: 0,
      markupValue: 0,
      markupType: 'percent' as const,
      isTaxable: false,
      sourceProductId: product.id, // Link to source product for cascade delete
      discountValue: 0,
      discountType: 'percent' as const,
    };

    updatedSections = updatedSections.map(s =>
      s.id === targetSection!.id
        ? { ...s, lineItems: [...s.lineItems, newLineItem] }
        : s
    );

    setPricingData({
      ...data.pricing,
      sections: updatedSections,
    });

    toast.success(`Added "${product.name || 'Product'}" to ${targetSection.name}`);
    onDirtyChange?.(true);
  }, [pricingSections, data.pricing, setPricingData, onDirtyChange]);

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
    setExtractingFile(file);

    try {
      // Use multi-pass AI extraction with summary
      const result = await extractProductsWithSummary(file);

      // Close progress dialog first
      setExtracting(false);
      setExtractingFile(null);

      if (result.products.length === 0) {
        toast.warning(`No products found in ${file.name}`);
      } else {
        // Show preview modal with extraction summary
        setExtractedProducts(result.products);
        setExtractedFileName(file.name);
        setExtractionSummary(result.summary);
        setPreviewOpen(true);

        // Build summary message
        const { configurableCount, simpleCount, confidence } = result.summary;
        const parts: string[] = [];
        if (configurableCount > 0) parts.push(`${configurableCount} configurable`);
        if (simpleCount > 0) parts.push(`${simpleCount} line items`);
        const confidencePercent = Math.round(confidence * 100);

        toast.success(
          `Found ${result.products.length} product${result.products.length === 1 ? '' : 's'} (${parts.join(', ')}) - ${confidencePercent}% confidence`
        );
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('AI extraction error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to extract products: ${errorMessage}`);
      setExtracting(false);
      setExtractingFile(null);
    }
  }, []);

  // Handle confirming selected products from preview
  const handleConfirmExtraction = useCallback((selectedProducts: ExtractedProduct[]) => {
    if (selectedProducts.length > 0) {
      // Get existing aliases to avoid duplicates
      const existingAliases = products
        .filter(p => p.alias)
        .map(p => p.alias as string);

      // Auto-generate aliases for AI-extracted products using reduce for accumulation
      const generatedAliases: string[] = [];
      const productsWithAliases: Product[] = selectedProducts.map((product, index) => {
        // Convert ExtractedProduct to Product format
        const convertedProduct: Product = {
          id: product.id,
          name: product.name,
          quantity: product.quantity,
          unit: product.unit,
          description: product.description,
          rawData: product.rawData,
          // Store additional extracted data
          isConfigurable: product.isConfigurable,
          options: product.options,
          selectedConfiguration: product.selectedConfiguration,
          pricing: product.pricing,
        } as Product;

        // Generate alias for AI-extracted products
        if (product.rawData && Object.keys(product.rawData).length > 0) {
          const allAliases = [...existingAliases, ...generatedAliases];
          const alias = generateProductAlias(convertedProduct, allAliases, index);
          generatedAliases.push(alias);
          convertedProduct.alias = alias;
        }
        return convertedProduct;
      });

      setProductsData({ items: [...products, ...productsWithAliases] });
      onDirtyChange?.(true);
      toast.success(`Added ${selectedProducts.length} product${selectedProducts.length === 1 ? '' : 's'} with variable aliases`);
    }
    setExtractedProducts([]);
    setExtractedFileName(undefined);
    setExtractionSummary(undefined);
  }, [products, setProductsData, onDirtyChange]);

  // Helper to create product from catalog selection
  const createProductFromSelection = useCallback((
    selection: ProductSelection,
    existingProducts: Product[]
  ): Product => {
    const { product_hierarchy, specifications, specification_labels } = selection;
    const qty = typeof specifications.Quantity === 'number' ? specifications.Quantity : null;

    // Get existing aliases to avoid duplicates
    const existingAliases = existingProducts
      .filter(p => p.alias)
      .map(p => p.alias as string);

    const newProduct: Product = {
      id: Math.random().toString(36).substr(2, 9),
      name: `${product_hierarchy.manufacturer} ${product_hierarchy.series} ${product_hierarchy.model}`.trim(),
      quantity: qty ?? 1,
      unit: 'ea',
      description: '',
      rawData: {
        // Hierarchy names (for display)
        productDomain: product_hierarchy.domain,
        productLine: product_hierarchy.product_line,
        manufacturer: product_hierarchy.manufacturer,
        series: product_hierarchy.series,
        model: product_hierarchy.model,
        // Hierarchy IDs (for restoring state when editing)
        domain_id: product_hierarchy.domain_id,
        manufacturer_id: product_hierarchy.manufacturer_id,
        product_line_id: product_hierarchy.product_line_id,
        series_id: product_hierarchy.series_id,
        model_id: selection.product_model_id,
        // Specifications from config schema
        ...specifications,
        _specificationLabels: specification_labels,
        source: 'catalog',
      },
    };

    // Generate alias for the product
    const alias = generateProductAlias(newProduct, existingAliases, existingProducts.length);
    newProduct.alias = alias;

    return newProduct;
  }, []);

  // Handle product selected from catalog (add or update) - closes dialog
  const handleCatalogProductSelect = useCallback((selection: ProductSelection) => {
    const { product_hierarchy, specifications, specification_labels } = selection;

    // Extract quantity safely - ensure it's a number
    const qty = typeof specifications.Quantity === 'number' ? specifications.Quantity : null;

    if (editingProduct) {
      // Update existing product
      const updatedProduct: Product = {
        ...editingProduct,
        name: `${product_hierarchy.manufacturer} ${product_hierarchy.series} ${product_hierarchy.model}`.trim(),
        quantity: qty ?? editingProduct.quantity ?? 1,
        rawData: {
          // Hierarchy names (for display)
          productDomain: product_hierarchy.domain,
          productLine: product_hierarchy.product_line,
          manufacturer: product_hierarchy.manufacturer,
          series: product_hierarchy.series,
          model: product_hierarchy.model,
          // Hierarchy IDs (for restoring state when editing)
          domain_id: product_hierarchy.domain_id,
          manufacturer_id: product_hierarchy.manufacturer_id,
          product_line_id: product_hierarchy.product_line_id,
          series_id: product_hierarchy.series_id,
          model_id: selection.product_model_id,
          // Specifications from config schema
          ...specifications,
          _specificationLabels: specification_labels,
          source: 'catalog',
        },
      };

      const updatedProducts = products.map(p =>
        p.id === editingProduct.id ? updatedProduct : p
      );
      setProductsData({ items: updatedProducts });
      onDirtyChange?.(true);

      toast.success(`Updated "${updatedProduct.name}"`);
    } else {
      // Add new product
      const newProduct = createProductFromSelection(selection, products);
      setProductsData({ items: [...products, newProduct] });
      onDirtyChange?.(true);
      toast.success(`Added "${newProduct.name}" from catalog`);
    }

    // Reset the store and close dialog
    resetProductStore();
    setEditingProduct(null);
    setCatalogDialogOpen(false);
  }, [products, setProductsData, onDirtyChange, resetProductStore, editingProduct, createProductFromSelection]);

  // Handle "Add & Continue" - adds product but keeps dialog open
  const handleCatalogProductSelectAndContinue = useCallback((selection: ProductSelection) => {
    const newProduct = createProductFromSelection(selection, products);
    const updatedProducts = [...products, newProduct];
    setProductsData({ items: updatedProducts });
    onDirtyChange?.(true);
    toast.success(`Added "${newProduct.name}" - select another product`);

    // Reset the store but keep dialog open
    resetProductStore();
  }, [products, setProductsData, onDirtyChange, resetProductStore, createProductFromSelection]);

  // Handle closing catalog dialog
  const handleCatalogCancel = useCallback(() => {
    resetProductStore();
    setEditingProduct(null);
    setCatalogDialogOpen(false);
  }, [resetProductStore]);

  // Handle edit button click for catalog products
  const handleEditCatalogProduct = useCallback(async (product: Product) => {
    // Restore hierarchy state from product data before opening dialog
    if (product.rawData) {
      await restoreFromProduct(product.rawData as Record<string, unknown>);
    }
    setEditingProduct(product);
    setCatalogDialogOpen(true);
  }, [restoreFromProduct]);

  // Handle edit button click for AI-extracted products
  const handleEditAiProduct = useCallback((product: Product) => {
    setEditingAiProduct(product);
    setAiEditDialogOpen(true);
  }, []);

  // Handle AI-extracted product update from editor
  const handleAiProductUpdate = useCallback((updatedProduct: ExtractedProduct) => {
    if (!editingAiProduct) return;

    // Convert ExtractedProduct back to Product format with updates
    const updatedProductData: Product = {
      ...editingAiProduct,
      name: updatedProduct.name,
      quantity: updatedProduct.quantity,
      unit: updatedProduct.unit,
      description: updatedProduct.description,
      rawData: updatedProduct.rawData,
      isConfigurable: updatedProduct.isConfigurable,
      options: updatedProduct.options,
      selectedConfiguration: updatedProduct.selectedConfiguration,
      pricing: updatedProduct.pricing,
    };

    // Add the new fields if present (cast through unknown for TypeScript)
    const productRecord = updatedProductData as unknown as Record<string, unknown>;
    if (updatedProduct.frame) productRecord.frame = updatedProduct.frame;
    if (updatedProduct.closures) productRecord.closures = updatedProduct.closures;
    if (updatedProduct.seals) productRecord.seals = updatedProduct.seals;
    if (updatedProduct.track) productRecord.track = updatedProduct.track;
    if (updatedProduct.stacking) productRecord.stacking = updatedProduct.stacking;
    if (updatedProduct.performanceRatings) productRecord.performanceRatings = updatedProduct.performanceRatings;
    if (updatedProduct.appearance) productRecord.appearance = updatedProduct.appearance;
    if (updatedProduct.dimensions) productRecord.dimensions = updatedProduct.dimensions;

    const updatedProducts = products.map(p =>
      p.id === editingAiProduct.id ? updatedProductData : p
    );
    setProductsData({ items: updatedProducts });
    setEditingAiProduct({ ...editingAiProduct, ...updatedProductData }); // Update local state for dialog
    onDirtyChange?.(true);
  }, [editingAiProduct, products, setProductsData, onDirtyChange]);

  // Close AI edit dialog
  const handleCloseAiEditDialog = useCallback(() => {
    setAiEditDialogOpen(false);
    setEditingAiProduct(null);
  }, []);

  // Helper to find a field value by checking multiple possible keys (case-insensitive)
  const findFieldValue = useCallback((rawData: Record<string, unknown> | undefined, possibleKeys: string[]): unknown => {
    if (!rawData) return undefined;

    // First try exact match
    for (const key of possibleKeys) {
      if (key in rawData && rawData[key] !== null && rawData[key] !== undefined && rawData[key] !== '') {
        return rawData[key];
      }
    }

    // Then try case-insensitive match
    const rawDataKeys = Object.keys(rawData);
    for (const searchKey of possibleKeys) {
      const foundKey = rawDataKeys.find(k => k.toLowerCase() === searchKey.toLowerCase());
      if (foundKey && rawData[foundKey] !== null && rawData[foundKey] !== undefined && rawData[foundKey] !== '') {
        return rawData[foundKey];
      }
    }

    return undefined;
  }, []);

  // Key info field definitions - order matters, first match wins
  // These cover common variations from database field names
  const KEY_INFO_FIELDS = {
    height: [
      'Wall Height', 'Partition Height', 'Height', 'height',
      'Panel Height', 'wall_height', 'partition_height', 'panel_height',
      'WallHeight', 'PartitionHeight', 'PanelHeight'
    ],
    width: [
      'Wall Width', 'Width', 'width', 'Panel Width', 'Partition Width',
      'wall_width', 'panel_width', 'partition_width',
      'WallWidth', 'PanelWidth', 'PartitionWidth'
    ],
    panelCount: [
      'Panel Count', 'PanelCount', 'panelCount', 'Panels', 'panels',
      'Number of Panels', 'panel_count', 'number_of_panels',
      'NumPanels', 'num_panels', 'Total Panels'
    ],
    quantity: ['Quantity', 'quantity', 'Qty', 'qty', 'QTY', 'Count', 'count'],
  };

  // Helper to get specification fields from rawData (exclude metadata and key info fields)
  const getSpecificationFields = useCallback((rawData: Record<string, unknown> | undefined) => {
    if (!rawData) return [];
    const metaFields = ['source', 'productDomain', 'productLine', 'manufacturer', 'series', 'model', '_specificationLabels',
      'domain_id', 'manufacturer_id', 'product_line_id', 'series_id', 'model_id'];
    // Also exclude key info fields that are shown separately
    const keyInfoFields = [
      ...KEY_INFO_FIELDS.height,
      ...KEY_INFO_FIELDS.width,
      ...KEY_INFO_FIELDS.panelCount,
      ...KEY_INFO_FIELDS.quantity,
    ];
    const excludeFields = [...metaFields, ...keyInfoFields];
    return Object.entries(rawData)
      .filter(([key]) => !excludeFields.includes(key))
      .filter(([_, value]) => value !== null && value !== undefined && value !== '');
  }, []);

  // Format field keys to human-readable labels (snake_case/camelCase → Title Case)
  const formatLabel = useCallback((key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')     // camelCase → "camel Case"
      .replace(/[_-]/g, ' ')          // snake_case → "snake case"
      .replace(/\b\w/g, c => c.toUpperCase()) // Capitalize first letters
      .trim();
  }, []);

  // Input styling - shared sizing from tabStyles
  const inputClassName = TAB_INPUT_CLASS;

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
      {/* Header with Mode Toggle - PRODUCT SELECTOR DISABLED FOR PRODUCTION TESTING */}
      {/*
      <div className="flex items-center justify-end">
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
            onClick={() => setEntryMode('selector')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              entryMode === 'selector'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            Product Selector
          </button>
        </div>
      </div>
      */}

      {/* Product Selector Mode */}
      {entryMode === 'selector' && (
        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => setCatalogDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Database className="w-4 h-4 mr-2" />
              Browse Catalog
            </Button>
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
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20"
            >
              <UploadSimple className="w-4 h-4 mr-2" />
              {extracting ? 'Extracting...' : 'Upload Document (AI)'}
            </Button>
          </div>

          {/* Selected Products Display */}
          {aiExtractedProducts.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {aiExtractedProducts.map((product) => {
                  const isCatalogProduct = product.rawData?.source === 'catalog';

                  return (
                    <div
                      key={product.id}
                      className={cn(
                        'bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 transition-colors',
                        isCatalogProduct
                          ? 'hover:border-emerald-300 dark:hover:border-emerald-600'
                          : 'hover:border-purple-300 dark:hover:border-purple-600'
                      )}
                    >
                      {/* Header: Name + Alias + Actions */}
                      <div className="flex items-center gap-2 mb-2">
                        {isCatalogProduct ? (
                          <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <Package className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                            {product.name}
                          </h5>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500">alias:</span>
                            <Input
                              value={product.alias || ''}
                              onChange={(e) => updateProduct(product.id, { alias: e.target.value.replace(/[^a-zA-Z0-9]/g, '') })}
                              placeholder="wallA"
                              className="h-5 text-[10px] font-mono px-1 py-0 border-0 bg-transparent focus:ring-0 w-20"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {isCatalogProduct ? (
                            <button
                              onClick={() => handleEditCatalogProduct(product)}
                              className="p-1 text-gray-400 hover:text-emerald-600 transition-colors rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                              title="Edit product"
                            >
                              <PencilSimple className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEditAiProduct(product)}
                              className="p-1 text-gray-400 hover:text-purple-600 transition-colors rounded hover:bg-purple-50 dark:hover:bg-purple-900/20"
                              title="Edit extracted data"
                            >
                              <PencilSimple className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => removeProduct(product.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="space-y-1 text-[11px]">
                        {/* Key Info Row: Model, Size, Panel Count */}
                        {(() => {
                          const rawData = product.rawData as unknown as Record<string, unknown> | undefined;
                          const heightVal = findFieldValue(rawData, KEY_INFO_FIELDS.height);
                          const widthVal = findFieldValue(rawData, KEY_INFO_FIELDS.width);
                          const panelCountVal = findFieldValue(rawData, KEY_INFO_FIELDS.panelCount);
                          const quantityVal = findFieldValue(rawData, KEY_INFO_FIELDS.quantity);
                          const modelVal = rawData?.model;
                          const hasKeyInfo = modelVal || heightVal || widthVal || panelCountVal || quantityVal;

                          if (!hasKeyInfo) return null;

                          // Build size string
                          const sizeStr = [
                            heightVal ? `${String(heightVal)}' H` : null,
                            widthVal ? `${String(widthVal)}' W` : null,
                          ].filter(Boolean).join(' × ');

                          return (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 py-1 border-b border-gray-200 dark:border-gray-600">
                              {modelVal != null && (
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Model: </span>
                                  <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                                    {String(modelVal)}
                                  </span>
                                </div>
                              )}
                              {sizeStr && (
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Size: </span>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {sizeStr}
                                  </span>
                                </div>
                              )}
                              {panelCountVal != null && (
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Panels: </span>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {String(panelCountVal)}
                                  </span>
                                </div>
                              )}
                              {quantityVal != null && (
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Qty: </span>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {String(quantityVal)}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Other Specification Fields */}
                        {getSpecificationFields(product.rawData as unknown as Record<string, unknown>).map(([key, value]) => {
                          // Check if we have a human-readable label for this specification value
                          const specLabels = (product.rawData as unknown as Record<string, unknown>)?._specificationLabels as Record<string, string> | undefined;
                          const valueLabel = specLabels?.[key];

                          // Format the field key as a readable label
                          const fieldLabel = formatLabel(key);

                          // Use the value label if available, otherwise format the raw value
                          const displayValue = valueLabel || (Array.isArray(value)
                            ? (value as unknown[]).map(v => String(v)).join(', ')
                            : String(value));
                          return (
                            <div key={key} className="flex justify-between py-0.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                              <span className="text-gray-500 dark:text-gray-400">{fieldLabel}:</span>
                              <span className="text-gray-900 dark:text-gray-100 text-right max-w-[55%] truncate" title={displayValue}>
                                {displayValue}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Products Table - Only show in Manual Entry mode */}
      {entryMode === 'manual' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Model #</div>
            <div className="col-span-2">SKU / Part #</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-2"></div>
          </div>

          {/* Product Rows */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {manualProducts.map((product) => {
              const linkedSection = pricingSections.find(section =>
                section.lineItems.some(item => item.sourceProductId === product.id)
              );

              return (
                <div
                  key={product.id}
                  className="grid grid-cols-12 gap-1 px-3 py-2 items-center hover:bg-gray-50 dark:hover:bg-gray-700/20"
                >
                  {/* Name */}
                  <div className="col-span-3">
                    <Input
                      value={product.name}
                      onChange={(e) => updateProduct(product.id, { name: e.target.value })}
                      placeholder="Name"
                      className={inputClassName}
                    />
                  </div>

                  {/* Model # */}
                  <div className="col-span-2">
                    <Input
                      value={product.rawData?.model ?? ''}
                      onChange={(e) => {
                        updateProduct(product.id, {
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
                        updateProduct(product.id, {
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
                      onChange={(e) => updateProduct(product.id, { description: e.target.value })}
                      placeholder="Description"
                      className={inputClassName}
                    />
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex justify-end gap-1">
                    {linkedSection ? (
                      (() => {
                        // Find the specific line item linked to this product
                        const linkedItem = linkedSection.lineItems.find(
                          item => item.sourceProductId === product.id
                        );
                        // Calculate the line item amount
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
                      })()
                    ) : (
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
                              onClick={() => addToPricing(product)}
                              className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Package className="w-3 h-3 text-gray-400" />
                              <span>Create Merchandise</span>
                            </button>
                          ) : (
                            pricingSections.map((section) => (
                              <button
                                key={section.id}
                                onClick={() => addToPricing(product, section.id)}
                                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 truncate"
                              >
                                {section.name}
                              </button>
                            ))
                          )}
                        </PopoverContent>
                      </Popover>
                    )}
                    <button
                      onClick={() => removeProduct(product.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Delete"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add Product */}
            <div className="px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={addProduct}
                className="text-gray-400 hover:text-coral hover:bg-coral/5 h-6 text-[10px]"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Product
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Extraction Progress Dialog */}
      <ExtractionProgressDialog
        open={extracting}
        file={extractingFile}
        isExtracting={extracting}
      />

      {/* Extracted Products Preview Modal */}
      <ExtractedProductsPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        products={extractedProducts}
        onConfirm={handleConfirmExtraction}
        fileName={extractedFileName}
        summary={extractionSummary}
      />

      {/* Catalog Selection Dialog - Full Screen Overlay */}
      <Dialog open={catalogDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleCatalogCancel();
        }
      }}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {editingProduct ? (
                <>
                  <PencilSimple className="w-5 h-5 text-emerald-600" />
                  Edit Product Configuration
                </>
              ) : (
                <>
                  <Database className="w-5 h-5 text-emerald-600" />
                  Select Product from Catalog
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <CascadingProductSelectorV2
              onProductSelect={handleCatalogProductSelect}
              onProductSelectAndContinue={editingProduct ? undefined : handleCatalogProductSelectAndContinue}
              onCancel={handleCatalogCancel}
              initialValues={editingProduct?.rawData as Record<string, unknown> | undefined}
              className="h-full"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* AI-Extracted Product Edit Dialog */}
      <Dialog open={aiEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseAiEditDialog();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PencilSimple className="w-5 h-5 text-purple-600" />
              Edit Extracted Product
            </DialogTitle>
          </DialogHeader>
          {editingAiProduct && (() => {
            // Cast through unknown for TypeScript
            const aiProduct = editingAiProduct as unknown as Record<string, unknown>;
            return (
            <ExtractedProductEditor
              product={{
                id: editingAiProduct.id,
                name: editingAiProduct.name,
                quantity: editingAiProduct.quantity || 1,
                unit: editingAiProduct.unit || 'ea',
                description: editingAiProduct.description,
                isConfigurable: !!aiProduct.isConfigurable,
                manufacturer: editingAiProduct.rawData?.manufacturer as string | undefined,
                productDomain: editingAiProduct.rawData?.productDomain as string | undefined,
                productLine: editingAiProduct.rawData?.productLine as string | undefined,
                series: editingAiProduct.rawData?.series as string | undefined,
                model: editingAiProduct.rawData?.model as string | undefined,
                options: aiProduct.options as ExtractedProduct['options'],
                selectedConfiguration: aiProduct.selectedConfiguration as Record<string, string>,
                pricing: editingAiProduct.pricing,
                dimensions: aiProduct.dimensions as ExtractedProduct['dimensions'],
                frame: aiProduct.frame as ExtractedProduct['frame'],
                closures: aiProduct.closures as ExtractedProduct['closures'],
                seals: aiProduct.seals as ExtractedProduct['seals'],
                track: aiProduct.track as ExtractedProduct['track'],
                stacking: aiProduct.stacking as ExtractedProduct['stacking'],
                performanceRatings: aiProduct.performanceRatings as ExtractedProduct['performanceRatings'],
                appearance: aiProduct.appearance as ExtractedProduct['appearance'],
                certifications: aiProduct.certifications as string[],
                rawData: editingAiProduct.rawData,
              }}
              onChange={handleAiProductUpdate}
              isSelected={true}
              onToggleSelect={() => {}}
              onDelete={() => {
                removeProduct(editingAiProduct.id);
                handleCloseAiEditDialog();
              }}
            />
          );
          })()}
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={handleCloseAiEditDialog}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductsTab;
