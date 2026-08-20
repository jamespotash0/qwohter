/**
 * Products Tab - Orchestrator
 *
 * Entry-point cards when empty, stacked sections when products exist:
 * - Line Items section (manual products)
 * - Catalog Products section (catalog + AI-extracted products)
 *
 * Builder Mode: Disabled (no functionality)
 * Filler Mode: Full functionality - persisted via FormBuilderContext
 */

import { useState, useCallback, useRef } from 'react';
import { Plus, UploadSimple, Package, Database, PencilSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TAB_INPUT_CLASS } from './shared/tabStyles';
import { toast } from '@/components/ui/sonner';
import type { EditorMode } from '../ProposalEditor';
import { extractProductsWithSummary, type ExtractedProduct, type ExtractionResult } from '@/services/productExtraction';
import { useFormBuilder, type Product, type PricingSection, type PricingLineItem } from '../../context/FormBuilderContext';
import { ExtractedProductsPreview } from './ExtractedProductsPreview';
import { ExtractionProgressDialog } from './ExtractionProgressDialog';
import { ExtractedProductEditor } from './ExtractedProductEditor';
import { generateProductAlias } from '../../utils/productVariables';
import { ProductLibraryPicker } from '@/components/features/products/ProductLibraryPicker';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { useUser } from '@/auth';
import type { Product as LibraryProduct } from '@/lib/types/products';
import { ProductEntryCards } from './products/ProductEntryCards';
import { LineItemsSection } from './products/LineItemsSection';
import { CatalogProductsSection } from './products/CatalogProductsSection';
import { trackEvent } from '@/lib/analytics';

interface ProductsTabProps {
  mode: EditorMode;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function ProductsTab({ mode, onDirtyChange }: ProductsTabProps) {
  const isBuilderMode = mode === 'builder';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Context for products and pricing data persistence
  const { data, setProductsData, setPricingData } = useFormBuilder();
  const products = data.products.items;
  const pricingSections = data.pricing.sections;

  const [extracting, setExtracting] = useState(false);
  const [extractingFile, setExtractingFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([]);
  const [extractedFileName, setExtractedFileName] = useState<string>();
  const [extractionSummary, setExtractionSummary] = useState<ExtractionResult['summary']>();

  // Catalog selection state
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id ?? '');

  // AI-extracted product editing state
  const [aiEditDialogOpen, setAiEditDialogOpen] = useState(false);
  const [editingAiProduct, setEditingAiProduct] = useState<Product | null>(null);

  // Separate products by source
  const isAIExtractedProduct = useCallback((product: Product): boolean => {
    return !!(product.rawData?.source);
  }, []);
  const catalogProducts = products.filter(isAIExtractedProduct);
  const manualProducts = products.filter(p => !isAIExtractedProduct(p));
  const hasManualProducts = manualProducts.length > 0;
  const hasCatalogProducts = catalogProducts.length > 0;
  const hasAnyProducts = hasManualProducts || hasCatalogProducts;

  // ==================== Product CRUD ====================

  const addProduct = useCallback(() => {
    trackEvent('line_item_added', { method: 'manual' });
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

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    const updatedProducts = products.map(product =>
      product.id === id ? { ...product, ...updates } : product
    );
    setProductsData({ items: updatedProducts });

    // Cascade updates to linked pricing line items
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

    if (Object.keys(pricingUpdates).length > 0) {
      const updatedPricingSections = pricingSections.map(section => ({
        ...section,
        lineItems: section.lineItems.map(item =>
          item.sourceProductId === id ? { ...item, ...pricingUpdates } : item
        ),
      }));
      const hasLinkedItem = pricingSections.some(section =>
        section.lineItems.some(item => item.sourceProductId === id)
      );
      if (hasLinkedItem) {
        setPricingData({ ...data.pricing, sections: updatedPricingSections });
      }
    }
    onDirtyChange?.(true);
  }, [products, setProductsData, pricingSections, data.pricing, setPricingData, onDirtyChange]);

  const removeProduct = useCallback((id: string) => {
    setProductsData({ items: products.filter(product => product.id !== id) });
    const updatedPricingSections = pricingSections.map(section => ({
      ...section,
      lineItems: section.lineItems.filter(item => item.sourceProductId !== id),
    }));
    const hasChanges = pricingSections.some((section, i) => {
      const updatedSection = updatedPricingSections[i];
      return updatedSection && section.lineItems.length !== updatedSection.lineItems.length;
    });
    if (hasChanges) {
      setPricingData({ ...data.pricing, sections: updatedPricingSections });
      toast.info('Also removed linked pricing item(s)');
    }
    onDirtyChange?.(true);
  }, [products, setProductsData, pricingSections, data.pricing, setPricingData, onDirtyChange]);

  // ==================== Add to Pricing ====================

  const addToPricing = useCallback((product: Product, targetSectionId?: string) => {
    let updatedSections = [...pricingSections];
    let targetSection: PricingSection | undefined;
    if (targetSectionId) {
      targetSection = updatedSections.find(s => s.id === targetSectionId);
    }
    if (!targetSection) {
      targetSection = updatedSections.find(s => s.type === 'merchandise');
      if (!targetSection) {
        targetSection = {
          id: 'merchandise', name: 'Merchandise', type: 'merchandise',
          collapsed: false, lineItems: [],
        };
        updatedSections = [targetSection, ...updatedSections];
      }
    }
    if (targetSection.lineItems.some(item => item.sourceProductId === product.id)) {
      toast.warning(`"${product.name || 'Product'}" is already in ${targetSection.name}`);
      return;
    }
    const newLineItem = {
      id: `${Date.now()}`, name: product.name || 'Unnamed Product',
      modelNumber: product.rawData?.model || undefined,
      quantity: 1, sellRule: 'per_unit', unitCost: 0,
      markupValue: 0, markupType: 'percent' as const,
      isTaxable: false, sourceProductId: product.id,
      discountValue: 0, discountType: 'percent' as const,
    };
    updatedSections = updatedSections.map(s =>
      s.id === targetSection!.id ? { ...s, lineItems: [...s.lineItems, newLineItem] } : s
    );
    setPricingData({ ...data.pricing, sections: updatedSections });
    toast.success(`Added "${product.name || 'Product'}" to ${targetSection.name}`);
    onDirtyChange?.(true);
  }, [pricingSections, data.pricing, setPricingData, onDirtyChange]);

  // ==================== AI Extraction ====================

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleAIExtract(file);
  }, []);

  const handleAIExtract = useCallback(async (file: File) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/jpg', 'image/png', 'text/plain',
    ];
    const isValidExtension = file.name.toLowerCase().endsWith('.docx');
    if (!validTypes.includes(file.type) && !isValidExtension) {
      toast.error('Invalid file type. Please upload PDF, DOCX, image, or text file.');
      return;
    }
    trackEvent('ai_extraction_used');
    setExtracting(true);
    setExtractingFile(file);
    try {
      const result = await extractProductsWithSummary(file);
      setExtracting(false);
      setExtractingFile(null);
      if (result.products.length === 0) {
        toast.warning(`No products found in ${file.name}`);
      } else {
        setExtractedProducts(result.products);
        setExtractedFileName(file.name);
        setExtractionSummary(result.summary);
        setPreviewOpen(true);
        const { configurableCount, simpleCount, confidence } = result.summary;
        const parts: string[] = [];
        if (configurableCount > 0) parts.push(`${configurableCount} configurable`);
        if (simpleCount > 0) parts.push(`${simpleCount} line items`);
        toast.success(
          `Found ${result.products.length} product${result.products.length === 1 ? '' : 's'} (${parts.join(', ')}) - ${Math.round(confidence * 100)}% confidence`
        );
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('AI extraction error:', error);
      toast.error(`Failed to extract products: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setExtracting(false);
      setExtractingFile(null);
    }
  }, []);

  const handleConfirmExtraction = useCallback((selectedProducts: ExtractedProduct[]) => {
    if (selectedProducts.length > 0) {
      const existingAliases = products.filter(p => p.alias).map(p => p.alias as string);
      const generatedAliases: string[] = [];
      const productsWithAliases: Product[] = selectedProducts.map((product, index) => {
        const rawData = {
          ...product.rawData,
          ...(product.frame && { frame: product.frame }),
          ...(product.closures && { closures: product.closures }),
          ...(product.seals && { seals: product.seals }),
          ...(product.track && { track: product.track }),
          ...(product.stacking && { stacking: product.stacking }),
          ...(product.dimensions?.panelCount != null && { panelCount: product.dimensions.panelCount }),
        };
        const converted: Product = {
          id: product.id, name: product.name, quantity: product.quantity,
          unit: product.unit, description: product.description, rawData,
          isConfigurable: product.isConfigurable, options: product.options,
          selectedConfiguration: product.selectedConfiguration, pricing: product.pricing,
        } as Product;
        if (product.rawData && Object.keys(product.rawData).length > 0) {
          const alias = generateProductAlias(converted, [...existingAliases, ...generatedAliases], index);
          generatedAliases.push(alias);
          converted.alias = alias;
        }
        return converted;
      });
      setProductsData({ items: [...products, ...productsWithAliases] });
      onDirtyChange?.(true);
      toast.success(`Added ${selectedProducts.length} product${selectedProducts.length === 1 ? '' : 's'} with variable aliases`);
    }
    setExtractedProducts([]);
    setExtractedFileName(undefined);
    setExtractionSummary(undefined);
  }, [products, setProductsData, onDirtyChange]);

  // ==================== Product Library ====================

  /** Map a saved product into a proposal line. */
  const createProductFromLibrary = useCallback((
    libraryProduct: LibraryProduct, existingProducts: Product[]
  ): Product => {
    const existingAliases = existingProducts.filter(p => p.alias).map(p => p.alias as string);
    const newProduct: Product = {
      id: Math.random().toString(36).substr(2, 9),
      name: libraryProduct.name,
      quantity: 1,
      unit: 'ea',
      description: '',
      rawData: {
        // Manufacturer, series, and model are plain text on a saved product.
        // There is no catalog hierarchy to record ids from.
        manufacturer: libraryProduct.manufacturer,
        series: libraryProduct.series,
        model: libraryProduct.model,
        sku: libraryProduct.display_id,
        ...(libraryProduct.specifications ?? {}),
        source: 'library',
      },
    };
    newProduct.alias = generateProductAlias(newProduct, existingAliases, existingProducts.length);
    return newProduct;
  }, []);

  const handleLibraryProductSelect = useCallback((libraryProduct: LibraryProduct) => {
    if (editingProduct) {
      const updatedProduct: Product = {
        ...editingProduct,
        name: libraryProduct.name,
        rawData: {
          ...editingProduct.rawData,
          manufacturer: libraryProduct.manufacturer,
          series: libraryProduct.series,
          model: libraryProduct.model,
          sku: libraryProduct.display_id,
          ...(libraryProduct.specifications ?? {}),
          source: 'library',
        },
      };
      setProductsData({ items: products.map(p => p.id === editingProduct.id ? updatedProduct : p) });
      onDirtyChange?.(true);
      toast.success(`Updated "${updatedProduct.name}"`);
    } else {
      const newProduct = createProductFromLibrary(libraryProduct, products);
      setProductsData({ items: [...products, newProduct] });
      onDirtyChange?.(true);
      toast.success(`Added "${newProduct.name}"`);
    }
    setEditingProduct(null);
    setCatalogDialogOpen(false);
  }, [products, setProductsData, onDirtyChange, editingProduct, createProductFromLibrary]);

  const handleLibraryProductSelectAndContinue = useCallback((libraryProduct: LibraryProduct) => {
    const newProduct = createProductFromLibrary(libraryProduct, products);
    setProductsData({ items: [...products, newProduct] });
    onDirtyChange?.(true);
    toast.success(`Added "${newProduct.name}" - pick another`);
  }, [products, setProductsData, onDirtyChange, createProductFromLibrary]);

  const handleCatalogCancel = useCallback(() => {
    setEditingProduct(null);
    setCatalogDialogOpen(false);
  }, []);

  const handleEditCatalogProduct = useCallback((product: Product) => {
    setEditingProduct(product);
    setCatalogDialogOpen(true);
  }, []);

  // ==================== AI Edit ====================

  const handleEditAiProduct = useCallback((product: Product) => {
    setEditingAiProduct(product);
    setAiEditDialogOpen(true);
  }, []);

  const handleAiProductUpdate = useCallback((updatedProduct: ExtractedProduct) => {
    if (!editingAiProduct) return;
    const updatedProductData: Product = {
      ...editingAiProduct,
      name: updatedProduct.name, quantity: updatedProduct.quantity,
      unit: updatedProduct.unit, description: updatedProduct.description,
      rawData: updatedProduct.rawData, isConfigurable: updatedProduct.isConfigurable,
      options: updatedProduct.options, selectedConfiguration: updatedProduct.selectedConfiguration,
      pricing: updatedProduct.pricing,
    };
    const productRecord = updatedProductData as unknown as Record<string, unknown>;
    if (updatedProduct.frame) productRecord.frame = updatedProduct.frame;
    if (updatedProduct.closures) productRecord.closures = updatedProduct.closures;
    if (updatedProduct.seals) productRecord.seals = updatedProduct.seals;
    if (updatedProduct.track) productRecord.track = updatedProduct.track;
    if (updatedProduct.stacking) productRecord.stacking = updatedProduct.stacking;
    if (updatedProduct.performanceRatings) productRecord.performanceRatings = updatedProduct.performanceRatings;
    if (updatedProduct.appearance) productRecord.appearance = updatedProduct.appearance;
    if (updatedProduct.dimensions) productRecord.dimensions = updatedProduct.dimensions;

    setProductsData({ items: products.map(p => p.id === editingAiProduct.id ? updatedProductData : p) });
    setEditingAiProduct({ ...editingAiProduct, ...updatedProductData });
    onDirtyChange?.(true);
  }, [editingAiProduct, products, setProductsData, onDirtyChange]);

  const handleCloseAiEditDialog = useCallback(() => {
    setAiEditDialogOpen(false);
    setEditingAiProduct(null);
  }, []);

  // Input styling
  const inputClassName = TAB_INPUT_CLASS;

  // ==================== Builder Mode ====================

  if (isBuilderMode) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium">Products Tab</p>
          <p className="text-sm mt-1">Products are added when filling out proposals</p>
        </div>
      </div>
    );
  }

  // ==================== Filler Mode ====================

  return (
    <div className="space-y-6">
      {/* Hidden file input for AI upload */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.docx,.png,.jpg,.jpeg,.txt"
        disabled={extracting}
      />

      {/* Entry Cards (shown when no products) */}
      {!hasAnyProducts && (
        <ProductEntryCards
          onAddLineItem={addProduct}
          onBrowseCatalog={() => { trackEvent('catalog_browsed'); setCatalogDialogOpen(true); }}
          onUploadDocument={() => fileInputRef.current?.click()}
          isExtracting={extracting}
        />
      )}

      {/* Compact Action Bar (shown when products exist) */}
      {hasAnyProducts && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={addProduct}
            className="text-gray-400 hover:text-coral hover:bg-coral/5 h-7 text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Line Item
          </Button>
          <Button
            size="sm"
            onClick={() => setCatalogDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
          >
            <Database className="w-3.5 h-3.5 mr-1" />
            Browse Catalog
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={extracting}
            className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20 h-7 text-xs"
          >
            <UploadSimple className="w-3.5 h-3.5 mr-1" />
            {extracting ? 'Extracting...' : 'Upload (AI)'}
          </Button>
        </div>
      )}

      {/* Stacked Sections */}
      {hasManualProducts && (
        <LineItemsSection
          products={manualProducts}
          pricingSections={pricingSections}
          inputClassName={inputClassName}
          onAddProduct={addProduct}
          onUpdateProduct={updateProduct}
          onRemoveProduct={removeProduct}
          onAddToPricing={addToPricing}
        />
      )}

      {hasCatalogProducts && (
        <CatalogProductsSection
          products={catalogProducts}
          onUpdateProduct={updateProduct}
          onRemoveProduct={removeProduct}
          onEditCatalogProduct={handleEditCatalogProduct}
          onEditAiProduct={handleEditAiProduct}
        />
      )}

      {/* ==================== Dialogs ==================== */}

      <ExtractionProgressDialog
        open={extracting}
        file={extractingFile}
        isExtracting={extracting}
      />

      <ExtractedProductsPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        products={extractedProducts}
        onConfirm={handleConfirmExtraction}
        fileName={extractedFileName}
        summary={extractionSummary}
      />

      {/* Catalog Selection Dialog */}
      <Dialog open={catalogDialogOpen} onOpenChange={(open) => { if (!open) handleCatalogCancel(); }}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {editingProduct ? (
                <><PencilSimple className="w-5 h-5 text-emerald-600" /> Replace Product</>
              ) : (
                <><Database className="w-5 h-5 text-emerald-600" /> Add from Product Library</>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <ProductLibraryPicker
              organizationId={organization?.id}
              onSelect={handleLibraryProductSelect}
              onSelectAndContinue={editingProduct ? undefined : handleLibraryProductSelectAndContinue}
              onCancel={handleCatalogCancel}
              className="h-full"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* AI-Extracted Product Edit Dialog */}
      <Dialog open={aiEditDialogOpen} onOpenChange={(open) => { if (!open) handleCloseAiEditDialog(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PencilSimple className="w-5 h-5 text-purple-600" />
              Edit Extracted Product
            </DialogTitle>
          </DialogHeader>
          {editingAiProduct && (() => {
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
            <Button variant="outline" onClick={handleCloseAiEditDialog}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductsTab;
