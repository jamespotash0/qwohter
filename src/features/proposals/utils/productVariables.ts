/**
 * Product Variable Utilities
 *
 * Handles dynamic variable generation for AI-extracted products.
 * Enables referencing individual product fields via aliases (e.g., wallA.stc, wallA.manufacturer).
 */

import type { Product, ProductRawData } from '../context/FormBuilderContext';

/**
 * Field definitions that can be extracted from ProductRawData
 * Each field maps to a flattened variable path
 */
export interface ProductVariableField {
  key: string;           // Field key (e.g., 'stc', 'manufacturer')
  label: string;         // Human-readable label
  path: string[];        // Path in rawData (e.g., ['performanceRatings', 'stc'])
  category: string;      // Grouping category for UI
}

/** All extractable fields from AI products */
export const PRODUCT_VARIABLE_FIELDS: ProductVariableField[] = [
  // Basic Info
  { key: 'name', label: 'Product Name', path: [], category: 'Basic' },
  { key: 'quantity', label: 'Quantity', path: [], category: 'Basic' },
  { key: 'unit', label: 'Unit', path: [], category: 'Basic' },
  { key: 'description', label: 'Description', path: [], category: 'Basic' },

  // Product Identity
  { key: 'manufacturer', label: 'Manufacturer', path: ['manufacturer'], category: 'Identity' },
  { key: 'type', label: 'Product Type', path: ['productType'], category: 'Identity' },
  { key: 'category', label: 'Category', path: ['productCategory'], category: 'Identity' },
  { key: 'series', label: 'Series', path: ['series'], category: 'Identity' },
  { key: 'model', label: 'Model', path: ['model'], category: 'Identity' },

  // Dimensions
  { key: 'height', label: 'Height', path: ['dimensions', 'height'], category: 'Dimensions' },
  { key: 'width', label: 'Width', path: ['dimensions', 'width'], category: 'Dimensions' },
  { key: 'length', label: 'Length', path: ['dimensions', 'length'], category: 'Dimensions' },
  { key: 'thickness', label: 'Thickness', path: ['dimensions', 'thickness'], category: 'Dimensions' },

  // Performance
  { key: 'stc', label: 'STC Rating', path: ['performanceRatings', 'stc'], category: 'Performance' },
  { key: 'fireRating', label: 'Fire Rating', path: ['performanceRatings', 'fireRating'], category: 'Performance' },
  { key: 'acousticRating', label: 'Acoustic Rating', path: ['performanceRatings', 'acousticRating'], category: 'Performance' },

  // Appearance
  { key: 'color', label: 'Color', path: ['appearance', 'color'], category: 'Appearance' },
  { key: 'finish', label: 'Finish', path: ['appearance', 'finish'], category: 'Appearance' },
  { key: 'trim', label: 'Trim', path: ['appearance', 'trim'], category: 'Appearance' },

  // Materials
  { key: 'coreMaterial', label: 'Core Material', path: ['materials', 'core'], category: 'Materials' },
  { key: 'faceMaterial', label: 'Face Material', path: ['materials', 'face'], category: 'Materials' },
  { key: 'frameMaterial', label: 'Frame Material', path: ['materials', 'frame'], category: 'Materials' },
];

/**
 * Generate a human-readable alias from product name/type
 * Produces aliases like "Wall A", "Ceiling B", "Partition 1"
 * Allows spaces for readability
 */
export function generateProductAlias(
  product: Product,
  existingAliases: string[],
  _index: number
): string {
  // Try to create alias from product type or category
  const rawData = product.rawData;
  let baseAlias = '';

  if (rawData?.productType) {
    baseAlias = formatAliasBase(rawData.productType);
  } else if (rawData?.productCategory) {
    baseAlias = formatAliasBase(rawData.productCategory);
  } else if (product.name) {
    // Extract first meaningful word from name
    const firstWord = product.name.split(/[\s-_]/)[0];
    baseAlias = formatAliasBase(firstWord);
  } else {
    baseAlias = 'Wall';
  }

  // Default to "Wall" if we couldn't extract a valid base
  if (!baseAlias || baseAlias.length < 2) {
    baseAlias = 'Wall';
  }

  // Find unique suffix (A, B, C... or 1, 2, 3...)
  let suffix = '';
  let counter = 0;
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  do {
    suffix = counter < 26 ? letters[counter] : String(counter - 25);
    counter++;
  } while (existingAliases.includes(`${baseAlias} ${suffix}`) && counter < 100);

  return `${baseAlias} ${suffix}`;
}

/**
 * Format string to Title Case alias base (e.g., "operable wall" -> "Wall")
 * Extracts first meaningful word and capitalizes it
 */
function formatAliasBase(input: string): string {
  // Clean and get first word
  const cleaned = input
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim();

  // Get first word and capitalize
  const firstWord = cleaned.split(/\s+/)[0] || '';

  if (!firstWord) return '';

  // Title case the word
  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
}

/**
 * Get a value from product by field path
 */
export function getProductFieldValue(product: Product, field: ProductVariableField): string | number | null {
  // Handle base product fields
  if (field.path.length === 0) {
    switch (field.key) {
      case 'name': return product.name;
      case 'quantity': return product.quantity;
      case 'unit': return product.unit;
      case 'description': return product.description || null;
      default: return null;
    }
  }

  // Navigate rawData path
  if (!product.rawData) return null;

  let value: unknown = product.rawData;
  for (const key of field.path) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return null;
    }
  }

  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  return String(value);
}

/**
 * Check if a product has any valid data for a given field
 */
export function productHasField(product: Product, field: ProductVariableField): boolean {
  const value = getProductFieldValue(product, field);
  return value !== null && value !== '';
}

/**
 * Get all available fields for a specific product
 */
export function getAvailableFieldsForProduct(product: Product): ProductVariableField[] {
  return PRODUCT_VARIABLE_FIELDS.filter(field => productHasField(product, field));
}

/**
 * Build variable key from alias and field
 */
export function buildVariableKey(alias: string, fieldKey: string): string {
  return `${alias}.${fieldKey}`;
}

/**
 * Parse variable key to extract alias and field
 */
export function parseVariableKey(variableKey: string): { alias: string; fieldKey: string } | null {
  const parts = variableKey.split('.');
  if (parts.length !== 2) return null;
  return { alias: parts[0], fieldKey: parts[1] };
}

/**
 * Resolve a product variable to its actual value
 */
export function resolveProductVariable(
  variableKey: string,
  products: Product[]
): string | null {
  const parsed = parseVariableKey(variableKey);
  if (!parsed) return null;

  const { alias, fieldKey } = parsed;

  // Find product with matching alias
  const product = products.find(p => p.alias === alias);
  if (!product) return null;

  // Find field definition
  const field = PRODUCT_VARIABLE_FIELDS.find(f => f.key === fieldKey);
  if (!field) return null;

  const value = getProductFieldValue(product, field);
  if (value === null) return null;

  return String(value);
}

/**
 * Check if a variable key refers to a product variable
 */
export function isProductVariable(variableKey: string): boolean {
  return parseVariableKey(variableKey) !== null;
}

/**
 * Get grouped variable fields for UI display
 */
export function getFieldsByCategory(): Record<string, ProductVariableField[]> {
  return PRODUCT_VARIABLE_FIELDS.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, ProductVariableField[]>);
}
