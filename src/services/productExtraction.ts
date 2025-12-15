/**
 * Product Extraction Service
 * Uses the existing OpenAI integration to extract product data from documents
 */

import { supabase } from '@/integrations/supabase/client';

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
    // Call the dedicated extract-products edge function
    const { data, error } = await supabase.functions.invoke<ProductExtractionResponse>(
      'ai-product-extraction',
      {
        body: {
          documentText,
          fileName,
        },
      }
    );

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(`Failed to extract products: ${error.message}`);
    }

    if (!data?.success || !data.data?.products) {
      throw new Error(data?.error || 'Failed to extract product data');
    }

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
    // For text files, read directly
    if (file.type === 'text/plain') {
      const text = await file.text();
      return extractProductsFromDocument(text, file.name);
    }

    // For PDFs and images, we'd need to extract text first
    // For now, just read as text if possible
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        if (text) {
          try {
            const products = await extractProductsFromDocument(text, file.name);
            resolve(products);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error('Failed to read file content'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  } catch (error) {
    console.error('File extraction error:', error);
    throw error;
  }
}
