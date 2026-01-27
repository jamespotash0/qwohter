/**
 * Product Extraction Service
 * Uses multi-pass AI extraction to identify configurable and simple products
 */

import { supabase } from '@/integrations/supabase/client';
import { extractTextFromPDF, isPDF } from './pdfExtractor';
import { extractTextFromDocx, isDocx } from './docxExtractor';

// ============================================================================
// TYPE DEFINITIONS - API Response
// ============================================================================

interface ProductOption {
  optionName: string;
  optionCategory: string;
  values: Array<{
    label: string;
    priceDelta?: number | null;
    absolutePrice?: number | null;
    isSelected?: boolean;
  }>;
}

interface PricingBreakdown {
  material?: {
    subtotal?: number | null;
    components?: Record<string, number>;
    pricePerUnit?: number | null;
    pricePerSqFt?: number | null;
  };
  freight?: {
    items?: Record<string, number>;
    total?: number | null;
  };
  escalation?: {
    terms?: string | null;
    percentage?: number | null;
    validUntil?: string | null;
  };
  unitPrice?: number | null;
  totalPrice?: number | null;
}

interface ConfigurableProductResponse {
  id: string;
  manufacturer: string | null;
  productDomain: string | null;
  productLine: string | null;
  series: string | null;
  model: string | null;
  name: string;
  description: string | null;
  baseSpecifications: {
    dimensions?: {
      height?: string | null;
      width?: string | null;
      length?: string | null;
      thickness?: string | null;
      area?: string | null;
    };
    quantity?: number | null;
    unit?: string | null;
    panelCount?: number | null;
    weight?: string | null;
    weightPerSqFt?: number | null;
  };
  frame?: {
    type?: string | null;
    material?: string | null;
  };
  closures?: {
    left?: string | null;
    right?: string | null;
  };
  seals?: {
    top?: string | null;
    bottom?: string | null;
    perimeter?: string | null;
  };
  track?: {
    type?: string | null;
    hangingWeight?: number | null;
  };
  stacking?: {
    configuration?: string | null;
    direction?: string | null;
  };
  options: ProductOption[];
  selectedConfiguration: Record<string, string>;
  pricing: PricingBreakdown;
  performanceRatings: {
    stc?: number | null;
    fireRating?: string | null;
    acousticRating?: string | null;
  };
  appearance?: {
    color?: string | null;
    finish?: string | null;
    trim?: string | null;
    surface?: string | null;
  };
  certifications: string[];
}

interface SimpleProductResponse {
  id: string;
  manufacturer: string | null;
  productDomain: string | null;
  productLine: string | null;
  series: string | null;
  model: string | null;
  name: string;
  quantity: string | null;
  unit: string | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
  dimensions: {
    height: string | null;
    width: string | null;
    length: string | null;
    thickness: string | null;
  };
  performanceRatings: {
    stc: number | null;
    fireRating: string | null;
    acousticRating: string | null;
  };
  appearance: {
    color: string | null;
    finish: string | null;
    trim: string | null;
  };
  materials: {
    core: string | null;
    face: string | null;
    frame: string | null;
  };
  certifications: string[];
  specifications: Record<string, unknown>;
  description: string | null;
}

interface DocumentPricingSummaryResponse {
  materialCost?: number | null;
  laborCost?: number | null;
  freightCost?: number | null;
  markup?: {
    amount?: number | null;
    percentage?: number | null;
  };
  subtotal?: number | null;
  tax?: {
    amount?: number | null;
    percentage?: number | null;
  };
  grandTotal?: number | null;
  pricePerSqFt?: number | null;
  currency?: string;
}

interface DocumentMetadataResponse {
  validUntil?: string | null;
  quoteNumber?: string | null;
  quoteDate?: string | null;
  pricingSummary: DocumentPricingSummaryResponse;
  paymentTerms?: string | null;
  leadTime?: string | null;
  escalationTerms?: string | null;
  notes?: string | null;
}

interface ProductExtractionResponse {
  success: boolean;
  data?: {
    configurableProducts: ConfigurableProductResponse[];
    simpleProducts: SimpleProductResponse[];
    documentMetadata: DocumentMetadataResponse;
    documentSummary: {
      totalProducts: number;
      configurableCount: number;
      simpleCount: number;
      hasFreight: boolean;
      hasEscalation: boolean;
    };
    extractionMetadata: {
      passes: string[];
      confidence: number;
    };
  };
  error?: string;
}

// ============================================================================
// TYPE DEFINITIONS - Exported Types
// ============================================================================

export interface ExtractedProductOption {
  optionName: string;
  optionCategory: string;
  values: Array<{
    label: string;
    priceDelta?: number | null;
    absolutePrice?: number | null;
    isSelected?: boolean;
  }>;
}

export interface ExtractedPricing {
  material?: {
    subtotal?: number | null;
    components?: Record<string, number>;
    pricePerUnit?: number | null;
    pricePerSqFt?: number | null;
  };
  freight?: {
    items?: Record<string, number>;
    total?: number | null;
  };
  escalation?: {
    terms?: string | null;
    percentage?: number | null;
    validUntil?: string | null;
  };
  unitPrice?: number | null;
  totalPrice?: number | null;
}

export interface ExtractedProduct {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  description?: string;
  isConfigurable: boolean;

  // Product hierarchy
  manufacturer?: string | null;
  productDomain?: string | null;
  productLine?: string | null;
  series?: string | null;
  model?: string | null;

  // For configurable products
  options?: ExtractedProductOption[];
  selectedConfiguration?: Record<string, string>;
  pricing?: ExtractedPricing;

  // Dimensions
  dimensions?: {
    height?: string | null;
    width?: string | null;
    length?: string | null;
    thickness?: string | null;
    area?: string | null;
    panelCount?: number | null;
    weight?: string | null;
    weightPerSqFt?: number | null;
  };

  // Selected specifications (for configurable products)
  frame?: {
    type?: string | null;
    material?: string | null;
  };
  closures?: {
    left?: string | null;
    right?: string | null;
  };
  seals?: {
    top?: string | null;
    bottom?: string | null;
    perimeter?: string | null;
  };
  track?: {
    type?: string | null;
    hangingWeight?: number | null;
  };
  stacking?: {
    configuration?: string | null;
    direction?: string | null;
  };

  // Performance
  performanceRatings?: {
    stc?: number | null;
    fireRating?: string | null;
    acousticRating?: string | null;
  };

  // Appearance
  appearance?: {
    color?: string | null;
    finish?: string | null;
    trim?: string | null;
    surface?: string | null;
  };

  // Materials (for simple products)
  materials?: {
    core?: string | null;
    face?: string | null;
    frame?: string | null;
  };

  certifications?: string[];
  specifications?: Record<string, unknown>;

  // Raw data for backward compatibility
  rawData?: {
    manufacturer?: string | null;
    productDomain?: string | null;
    productLine?: string | null;
    series?: string | null;
    model?: string | null;
    dimensions?: {
      height?: string | null;
      width?: string | null;
      length?: string | null;
      thickness?: string | null;
    };
    performanceRatings?: {
      stc?: number | null;
      fireRating?: string | null;
      acousticRating?: string | null;
    };
    appearance?: {
      color?: string | null;
      finish?: string | null;
      trim?: string | null;
    };
    materials?: {
      core?: string | null;
      face?: string | null;
      frame?: string | null;
    };
    certifications?: string[];
    specifications?: Record<string, unknown>;
  };
}

export interface ExtractedPricingSummary {
  materialCost?: number | null;
  laborCost?: number | null;
  freightCost?: number | null;
  markup?: {
    amount?: number | null;
    percentage?: number | null;
  };
  subtotal?: number | null;
  tax?: {
    amount?: number | null;
    percentage?: number | null;
  };
  grandTotal?: number | null;
  pricePerSqFt?: number | null;
  currency?: string;
}

export interface ExtractedDocumentMetadata {
  validUntil?: string | null;
  quoteNumber?: string | null;
  quoteDate?: string | null;
  pricingSummary: ExtractedPricingSummary;
  paymentTerms?: string | null;
  leadTime?: string | null;
  escalationTerms?: string | null;
  notes?: string | null;
}

export interface ExtractionResult {
  products: ExtractedProduct[];
  documentMetadata: ExtractedDocumentMetadata;
  summary: {
    totalProducts: number;
    configurableCount: number;
    simpleCount: number;
    hasFreight: boolean;
    hasEscalation: boolean;
    confidence: number;
    passes: string[];
  };
}

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

function convertConfigurableProduct(product: ConfigurableProductResponse): ExtractedProduct {
  const quantity = product.baseSpecifications?.quantity || 1;
  const unit = product.baseSpecifications?.unit || 'ea';

  // Build description from options and configuration
  const descriptionParts: string[] = [];

  // Add product hierarchy
  const hierarchy: string[] = [];
  if (product.manufacturer) hierarchy.push(product.manufacturer);
  if (product.series) hierarchy.push(product.series);
  if (product.model) hierarchy.push(`Model: ${product.model}`);
  if (hierarchy.length > 0) {
    descriptionParts.push(hierarchy.join(' '));
  }

  // Add selected configuration
  if (Object.keys(product.selectedConfiguration).length > 0) {
    const configParts = Object.entries(product.selectedConfiguration)
      .map(([key, value]) => `${key}: ${value}`)
      .slice(0, 5);
    descriptionParts.push(configParts.join(', '));
  }

  // Add performance ratings
  const ratings: string[] = [];
  if (product.performanceRatings?.stc) ratings.push(`STC ${product.performanceRatings.stc}`);
  if (product.performanceRatings?.fireRating) ratings.push(`Fire: ${product.performanceRatings.fireRating}`);
  if (ratings.length > 0) {
    descriptionParts.push(ratings.join(' | '));
  }

  // Add base description
  if (product.description) {
    descriptionParts.push(product.description);
  }

  // Build dimensions with additional panel specs
  const dimensions = {
    ...product.baseSpecifications?.dimensions,
    panelCount: product.baseSpecifications?.panelCount,
    weight: product.baseSpecifications?.weight,
    weightPerSqFt: product.baseSpecifications?.weightPerSqFt,
  };

  return {
    id: product.id,
    name: product.name,
    quantity,
    unit,
    description: descriptionParts.join(' | ') || undefined,
    isConfigurable: true,

    manufacturer: product.manufacturer,
    productDomain: product.productDomain,
    productLine: product.productLine,
    series: product.series,
    model: product.model,

    options: product.options,
    selectedConfiguration: product.selectedConfiguration,
    pricing: product.pricing,

    dimensions,
    frame: product.frame,
    closures: product.closures,
    seals: product.seals,
    track: product.track,
    stacking: product.stacking,
    performanceRatings: product.performanceRatings,
    appearance: product.appearance,
    certifications: product.certifications,

    rawData: {
      manufacturer: product.manufacturer,
      productDomain: product.productDomain,
      productLine: product.productLine,
      series: product.series,
      model: product.model,
      dimensions: product.baseSpecifications?.dimensions,
      performanceRatings: product.performanceRatings,
      appearance: product.appearance,
      certifications: product.certifications,
    },
  };
}

function convertSimpleProduct(product: SimpleProductResponse): ExtractedProduct {
  // Parse quantity
  let quantity = 1;
  if (product.quantity) {
    const parsed = parseFloat(product.quantity);
    if (!isNaN(parsed) && parsed > 0) {
      quantity = parsed;
    }
  }

  const unit = product.unit?.toLowerCase() || 'ea';

  // Build description
  const descriptionParts: string[] = [];

  // Add product hierarchy
  const hierarchy: string[] = [];
  if (product.manufacturer) hierarchy.push(product.manufacturer);
  if (product.series) hierarchy.push(product.series);
  if (product.model) hierarchy.push(`Model: ${product.model}`);
  if (hierarchy.length > 0) {
    descriptionParts.push(hierarchy.join(' '));
  }

  // Add base description
  if (product.description) {
    descriptionParts.push(product.description);
  }

  // Add dimensions
  const dimensions: string[] = [];
  if (product.dimensions?.height) dimensions.push(`H: ${product.dimensions.height}`);
  if (product.dimensions?.width) dimensions.push(`W: ${product.dimensions.width}`);
  if (product.dimensions?.length) dimensions.push(`L: ${product.dimensions.length}`);
  if (dimensions.length > 0) {
    descriptionParts.push(`Dimensions: ${dimensions.join(', ')}`);
  }

  // Add performance ratings
  const ratings: string[] = [];
  if (product.performanceRatings?.stc) ratings.push(`STC ${product.performanceRatings.stc}`);
  if (product.performanceRatings?.fireRating) ratings.push(`Fire: ${product.performanceRatings.fireRating}`);
  if (ratings.length > 0) {
    descriptionParts.push(ratings.join(' | '));
  }

  // Add appearance
  const appearance: string[] = [];
  if (product.appearance?.color) appearance.push(`Color: ${product.appearance.color}`);
  if (product.appearance?.finish) appearance.push(`Finish: ${product.appearance.finish}`);
  if (appearance.length > 0) {
    descriptionParts.push(appearance.join(', '));
  }

  return {
    id: product.id,
    name: product.name,
    quantity,
    unit,
    description: descriptionParts.join(' | ') || undefined,
    isConfigurable: false,

    manufacturer: product.manufacturer,
    productDomain: product.productDomain,
    productLine: product.productLine,
    series: product.series,
    model: product.model,

    pricing: {
      unitPrice: product.unitPrice,
      totalPrice: product.totalPrice,
    },

    dimensions: product.dimensions,
    performanceRatings: product.performanceRatings,
    appearance: product.appearance,
    materials: product.materials,
    certifications: product.certifications,
    specifications: product.specifications,

    rawData: {
      manufacturer: product.manufacturer,
      productDomain: product.productDomain,
      productLine: product.productLine,
      series: product.series,
      model: product.model,
      dimensions: product.dimensions,
      performanceRatings: product.performanceRatings,
      appearance: product.appearance,
      materials: product.materials,
      certifications: product.certifications,
      specifications: product.specifications,
    },
  };
}

// ============================================================================
// MAIN EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Extract products from document text using multi-pass AI extraction
 */
export async function extractProductsFromDocument(
  documentText: string,
  fileName?: string
): Promise<ExtractionResult> {
  try {
    console.log('=== AI Product Extraction Debug ===');
    console.log('File name:', fileName);
    console.log('Document text length:', documentText.length);
    console.log('Document text preview (first 500 chars):', documentText.substring(0, 500));

    console.log('Calling edge function: ai-product-extraction (multi-pass)');
    const { data, error } = await supabase.functions.invoke<ProductExtractionResponse>(
      'ai-product-extraction',
      {
        body: {
          documentText,
          fileName,
        },
      }
    );

    console.log('Edge function response:', { data, error });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(`Failed to extract products: ${error.message}`);
    }

    if (!data?.success || !data.data) {
      console.error('Extraction failed - data:', data);
      throw new Error(data?.error || 'Failed to extract product data');
    }

    const { configurableProducts, simpleProducts, documentMetadata, documentSummary, extractionMetadata } = data.data;

    console.log('Extraction successful:');
    console.log(`- Configurable products: ${configurableProducts.length}`);
    console.log(`- Simple products: ${simpleProducts.length}`);
    console.log(`- Passes: ${extractionMetadata.passes.join(', ')}`);
    console.log(`- Document metadata:`, documentMetadata);

    // Convert all products to unified format
    const products: ExtractedProduct[] = [
      ...configurableProducts.map(convertConfigurableProduct),
      ...simpleProducts.map(convertSimpleProduct),
    ];

    return {
      products,
      documentMetadata: {
        validUntil: documentMetadata?.validUntil,
        quoteNumber: documentMetadata?.quoteNumber,
        quoteDate: documentMetadata?.quoteDate,
        pricingSummary: documentMetadata?.pricingSummary || {},
        paymentTerms: documentMetadata?.paymentTerms,
        leadTime: documentMetadata?.leadTime,
        escalationTerms: documentMetadata?.escalationTerms,
        notes: documentMetadata?.notes,
      },
      summary: {
        totalProducts: documentSummary.totalProducts,
        configurableCount: documentSummary.configurableCount,
        simpleCount: documentSummary.simpleCount,
        hasFreight: documentSummary.hasFreight,
        hasEscalation: documentSummary.hasEscalation,
        confidence: extractionMetadata.confidence,
        passes: extractionMetadata.passes,
      },
    };
  } catch (error) {
    console.error('Product extraction error:', error);
    throw error;
  }
}

/**
 * Extract products from an uploaded file
 * Supports PDF, DOCX, and text files
 */
export async function extractProductsFromFile(file: File): Promise<ExtractedProduct[]> {
  try {
    console.log('=== File Extraction Debug ===');
    console.log('File name:', file.name);
    console.log('File type:', file.type);
    console.log('File size:', file.size, 'bytes');

    // Handle PDF files
    if (isPDF(file)) {
      console.log('Detected PDF file, using PDF text extraction');
      const text = await extractTextFromPDF(file);
      const result = await extractProductsFromDocument(text, file.name);
      return result.products;
    }

    // Handle DOCX files
    if (isDocx(file)) {
      console.log('Detected DOCX file, using mammoth text extraction');
      const text = await extractTextFromDocx(file);
      const result = await extractProductsFromDocument(text, file.name);
      return result.products;
    }

    // Handle text files
    if (file.type === 'text/plain') {
      console.log('Reading as plain text file');
      const text = await file.text();
      const result = await extractProductsFromDocument(text, file.name);
      return result.products;
    }

    // Handle images - not yet supported
    if (file.type.startsWith('image/')) {
      throw new Error('Image files require OCR which is not yet supported. Please upload a PDF or text file.');
    }

    // Try to read as text for other file types
    const text = await file.text();
    console.log('Read file as text, length:', text.length);

    // Check if it looks like binary data
    const looksLikeBinary = /[\x00-\x08\x0E-\x1F]/.test(text.substring(0, 100));
    if (looksLikeBinary) {
      throw new Error('File appears to be binary. Please upload a PDF or text file.');
    }

    const result = await extractProductsFromDocument(text, file.name);
    return result.products;
  } catch (error) {
    console.error('File extraction error:', error);
    throw error;
  }
}

/**
 * Extract products with full result including summary
 */
export async function extractProductsWithSummary(file: File): Promise<ExtractionResult> {
  try {
    let text: string;

    if (isPDF(file)) {
      text = await extractTextFromPDF(file);
    } else if (isDocx(file)) {
      text = await extractTextFromDocx(file);
    } else if (file.type === 'text/plain') {
      text = await file.text();
    } else {
      text = await file.text();
      const looksLikeBinary = /[\x00-\x08\x0E-\x1F]/.test(text.substring(0, 100));
      if (looksLikeBinary) {
        throw new Error('File appears to be binary. Please upload a PDF or text file.');
      }
    }

    return extractProductsFromDocument(text, file.name);
  } catch (error) {
    console.error('File extraction error:', error);
    throw error;
  }
}
