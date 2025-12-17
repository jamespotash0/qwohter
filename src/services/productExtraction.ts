/**
 * Product Extraction Service
 * Uses the existing OpenAI integration to extract product data from documents
 */

import { supabase } from '@/integrations/supabase/client';
import { extractTextFromPDF, isPDF } from './pdfExtractor';
import { extractTextFromDocx, isDocx } from './docxExtractor';

export interface ExtractedProduct {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  description?: string;
  // Raw extracted data for rich display
  rawData?: {
    manufacturer?: string | null;
    productType?: string | null;
    productCategory?: string | null;
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
    specifications?: Record<string, any>;
  };
}

interface ProductExtractionResponse {
  success: boolean;
  data?: {
    products: Array<{
      manufacturer: string | null;
      productType: string | null;
      productCategory: string | null;
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
      specifications: Record<string, any>;
      description: string | null;
    }>;
    summary?: string;
  };
  error?: string;
}

/**
 * Extract products from document text using AI
 */
export async function extractProductsFromDocument(
  documentText: string,
  fileName?: string
): Promise<ExtractedProduct[]> {
  try {
    // DEBUG: Log input data
    console.log('=== AI Product Extraction Debug ===');
    console.log('File name:', fileName);
    console.log('Document text length:', documentText.length);
    console.log('Document text preview (first 500 chars):', documentText.substring(0, 500));
    console.log('Document text preview (last 500 chars):', documentText.substring(Math.max(0, documentText.length - 500)));

    // Call the dedicated ai-product-extraction edge function
    console.log('Calling edge function: ai-product-extraction');
    const { data, error } = await supabase.functions.invoke<ProductExtractionResponse>(
      'ai-product-extraction',
      {
        body: {
          documentText,
          fileName,
        },
      }
    );

    // DEBUG: Log response
    console.log('Edge function response:', { data, error });

    if (error) {
      console.error('Edge function error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to extract products: ${error.message}`);
    }

    if (!data?.success || !data.data?.products) {
      console.error('Extraction failed - data:', data);
      throw new Error(data?.error || 'Failed to extract product data');
    }

    console.log('Extraction successful - products count:', data.data.products.length);
    console.log('Extracted products:', JSON.stringify(data.data.products, null, 2));

    // Convert the extracted data to our Product format
    const products: ExtractedProduct[] = data.data.products
      .filter(item => item.name) // Only include items with names
      .map((item) => {
        // Parse quantity from string to number
        let quantity = 1;
        let unit = 'ea';

        if (item.quantity) {
          const parsedQty = parseFloat(item.quantity);
          if (!isNaN(parsedQty) && parsedQty > 0) {
            quantity = parsedQty;
          }
        }

        // Use the unit from the response or default to 'ea'
        if (item.unit) {
          unit = item.unit.toLowerCase();
        }

        // Build comprehensive description from all available data
        const descriptionParts: string[] = [];

        // Add product hierarchy
        const hierarchy: string[] = [];
        if (item.manufacturer) hierarchy.push(item.manufacturer);
        if (item.series) hierarchy.push(item.series);
        if (item.model) hierarchy.push(`Model: ${item.model}`);
        if (hierarchy.length > 0) {
          descriptionParts.push(hierarchy.join(' '));
        }

        // Add product category
        if (item.productType && item.productCategory) {
          descriptionParts.push(`${item.productType} - ${item.productCategory}`);
        } else if (item.productType) {
          descriptionParts.push(item.productType);
        } else if (item.productCategory) {
          descriptionParts.push(item.productCategory);
        }

        // Add base description
        if (item.description) {
          descriptionParts.push(item.description);
        }

        // Add dimensions
        const dimensions: string[] = [];
        if (item.dimensions.height) dimensions.push(`H: ${item.dimensions.height}`);
        if (item.dimensions.width) dimensions.push(`W: ${item.dimensions.width}`);
        if (item.dimensions.length) dimensions.push(`L: ${item.dimensions.length}`);
        if (item.dimensions.thickness) dimensions.push(`T: ${item.dimensions.thickness}`);
        if (dimensions.length > 0) {
          descriptionParts.push(`Dimensions: ${dimensions.join(', ')}`);
        }

        // Add performance ratings
        const ratings: string[] = [];
        if (item.performanceRatings.stc) ratings.push(`STC ${item.performanceRatings.stc}`);
        if (item.performanceRatings.fireRating) ratings.push(`Fire: ${item.performanceRatings.fireRating}`);
        if (item.performanceRatings.acousticRating) ratings.push(`Acoustic: ${item.performanceRatings.acousticRating}`);
        if (ratings.length > 0) {
          descriptionParts.push(ratings.join(' | '));
        }

        // Add appearance
        const appearance: string[] = [];
        if (item.appearance.color) appearance.push(`Color: ${item.appearance.color}`);
        if (item.appearance.finish) appearance.push(`Finish: ${item.appearance.finish}`);
        if (item.appearance.trim) appearance.push(`Trim: ${item.appearance.trim}`);
        if (appearance.length > 0) {
          descriptionParts.push(appearance.join(', '));
        }

        // Add materials
        const materials: string[] = [];
        if (item.materials.core) materials.push(`Core: ${item.materials.core}`);
        if (item.materials.face) materials.push(`Face: ${item.materials.face}`);
        if (item.materials.frame) materials.push(`Frame: ${item.materials.frame}`);
        if (materials.length > 0) {
          descriptionParts.push(materials.join(', '));
        }

        // Add certifications
        if (item.certifications && item.certifications.length > 0) {
          descriptionParts.push(`Certifications: ${item.certifications.join(', ')}`);
        }

        // Add key specifications (limit to 3 most important)
        if (item.specifications) {
          const specEntries = Object.entries(item.specifications)
            .filter(([key, value]) => value)
            .slice(0, 3);

          specEntries.forEach(([key, value]) => {
            descriptionParts.push(`${key}: ${value}`);
          });
        }

        // Determine if this product has rich data (for smart display)
        const hasRichData = !!(
          item.manufacturer ||
          item.productType ||
          item.productCategory ||
          item.series ||
          item.model ||
          Object.values(item.dimensions || {}).some(v => v) ||
          Object.values(item.performanceRatings || {}).some(v => v) ||
          Object.values(item.appearance || {}).some(v => v) ||
          Object.values(item.materials || {}).some(v => v) ||
          (item.certifications && item.certifications.length > 0) ||
          (item.specifications && Object.keys(item.specifications).length > 0)
        );

        return {
          id: Math.random().toString(36).substr(2, 9),
          name: item.name,
          quantity,
          unit,
          description: descriptionParts.length > 0 ? descriptionParts.join(' | ') : undefined,
          // Preserve raw data only if there's rich metadata
          rawData: hasRichData ? {
            manufacturer: item.manufacturer,
            productType: item.productType,
            productCategory: item.productCategory,
            series: item.series,
            model: item.model,
            dimensions: item.dimensions,
            performanceRatings: item.performanceRatings,
            appearance: item.appearance,
            materials: item.materials,
            certifications: item.certifications,
            specifications: item.specifications,
          } : undefined,
        };
      });

    return products;
  } catch (error) {
    console.error('Product extraction error:', error);
    throw error;
  }
}

/**
 * Extract products from an uploaded file
 * Supports PDF, images, and text files
 */
export async function extractProductsFromFile(file: File): Promise<ExtractedProduct[]> {
  try {
    // DEBUG: Log file info
    console.log('=== File Extraction Debug ===');
    console.log('File name:', file.name);
    console.log('File type:', file.type);
    console.log('File size:', file.size, 'bytes');

    // Handle PDF files with proper text extraction
    if (isPDF(file)) {
      console.log('Detected PDF file, using PDF text extraction');
      const text = await extractTextFromPDF(file);
      return extractProductsFromDocument(text, file.name);
    }

    // Handle DOCX files with mammoth
    if (isDocx(file)) {
      console.log('Detected DOCX file, using mammoth text extraction');
      const text = await extractTextFromDocx(file);
      return extractProductsFromDocument(text, file.name);
    }

    // For text files, read directly
    if (file.type === 'text/plain') {
      console.log('Reading as plain text file');
      const text = await file.text();
      return extractProductsFromDocument(text, file.name);
    }

    // For images, we need OCR - not yet supported
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

    return extractProductsFromDocument(text, file.name);
  } catch (error) {
    console.error('File extraction error:', error);
    throw error;
  }
}
