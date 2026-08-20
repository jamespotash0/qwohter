/**
 * Product Variable Utilities
 *
 * Handles dynamic variable generation for products (AI-extracted and catalog).
 * Enables referencing individual product fields via aliases (e.g., Wall A.stc, Wall A.track_system).
 */

import type { Product } from '../context/FormBuilderContext';

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
  { key: 'type', label: 'Product Domain', path: ['productDomain'], category: 'Identity' },
  { key: 'category', label: 'Product Line', path: ['productLine'], category: 'Identity' },
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

  // Hardware - Frame
  { key: 'frameType', label: 'Frame Type', path: ['frame', 'type'], category: 'Hardware' },
  { key: 'frameMat', label: 'Frame Material', path: ['frame', 'material'], category: 'Hardware' },

  // Hardware - Closures
  { key: 'closureLeft', label: 'Left Closure', path: ['closures', 'left'], category: 'Hardware' },
  { key: 'closureRight', label: 'Right Closure', path: ['closures', 'right'], category: 'Hardware' },

  // Hardware - Seals
  { key: 'sealTop', label: 'Top Seal', path: ['seals', 'top'], category: 'Hardware' },
  { key: 'sealBottom', label: 'Bottom Seal', path: ['seals', 'bottom'], category: 'Hardware' },
  { key: 'sealPerimeter', label: 'Perimeter Seal', path: ['seals', 'perimeter'], category: 'Hardware' },

  // Hardware - Track
  { key: 'trackType', label: 'Track Type', path: ['track', 'type'], category: 'Hardware' },
  { key: 'trackWeight', label: 'Track Hanging Weight', path: ['track', 'hangingWeight'], category: 'Hardware' },

  // Hardware - Stacking
  { key: 'stackConfig', label: 'Stacking Configuration', path: ['stacking', 'configuration'], category: 'Hardware' },
  { key: 'stackDirection', label: 'Stacking Direction', path: ['stacking', 'direction'], category: 'Hardware' },

  // Panel Specs
  { key: 'panelCount', label: 'Panel Count', path: ['panelCount'], category: 'Dimensions' },
];

/** Keys in rawData that are internal metadata, not user-facing spec fields */
const INTERNAL_RAWDATA_KEYS = new Set([
  '_specificationLabels', 'source',
  // Already handled by PRODUCT_VARIABLE_FIELDS (identity fields)
  'productDomain', 'productLine', 'manufacturer', 'series', 'model',
  // Quantity is handled as a base product field
  'quantity', 'Quantity',
]);

/** Convert snake_case to Title Case label (e.g., "track_system" → "Track System") */
function snakeCaseToLabel(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Check if a product is from the catalog (vs AI-extracted)
 */
export function isCatalogProduct(product: Product): boolean {
  return product.rawData?.source === 'catalog';
}

/**
 * Get dynamic variable fields from catalog product specs.
 * Scans flat rawData keys and generates ProductVariableField entries.
 */
export function getDynamicFieldsForProduct(product: Product): ProductVariableField[] {
  const rawData = product.rawData;
  if (!rawData || rawData.source !== 'catalog') return [];

  const fields: ProductVariableField[] = [];

  for (const [key, value] of Object.entries(rawData)) {
    // Skip internal/meta keys
    if (INTERNAL_RAWDATA_KEYS.has(key)) continue;
    // Skip null/undefined/empty values
    if (value === null || value === undefined || value === '') continue;
    // Skip objects (nested structures aren't flat spec values)
    if (typeof value === 'object') continue;

    fields.push({
      key,
      label: snakeCaseToLabel(key),
      path: [key], // flat key — single-segment path
      category: 'Specifications',
    });
  }

  return fields;
}

/**
 * Resolve a raw value using _specificationLabels for human-readable display.
 * Codes like "425MD" get resolved to "425 Multi-Directional".
 */
export function resolveRawDataValue(
  rawValue: unknown,
  specLabels?: Record<string, string>
): string | null {
  if (rawValue === null || rawValue === undefined) return null;
  if (typeof rawValue === 'object') return null;

  const strValue = String(rawValue);
  if (!strValue) return null;

  // Look up code in specification labels
  if (specLabels && strValue in specLabels) {
    return specLabels[strValue] ?? strValue;
  }

  return strValue;
}

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

  if (rawData?.productDomain) {
    baseAlias = formatAliasBase(rawData.productDomain);
  } else if (rawData?.productLine) {
    baseAlias = formatAliasBase(rawData.productLine);
  } else if (product.name) {
    // Extract first meaningful word from name
    const firstWord = product.name.split(/[\s-_]/)[0] || '';
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
    suffix = counter < 26 ? (letters[counter] ?? String(counter)) : String(counter - 25);
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
  // Don't stringify objects — they need a deeper path
  if (typeof value === 'object') return null;
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
 * Get all available fields for a specific product.
 * For AI products: matches against PRODUCT_VARIABLE_FIELDS paths.
 * For catalog products: also includes dynamic flat spec fields.
 */
export function getAvailableFieldsForProduct(product: Product): ProductVariableField[] {
  const staticFields = PRODUCT_VARIABLE_FIELDS.filter(field => productHasField(product, field));

  // For catalog products, also scan dynamic flat spec keys
  if (isCatalogProduct(product)) {
    const dynamicFields = getDynamicFieldsForProduct(product);
    // Deduplicate: skip dynamic fields whose key already exists in static matches
    const staticKeys = new Set(staticFields.map(f => f.key));
    const uniqueDynamic = dynamicFields.filter(f => !staticKeys.has(f.key));
    return [...staticFields, ...uniqueDynamic];
  }

  return staticFields;
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
  const dotIndex = variableKey.indexOf('.');
  if (dotIndex === -1 || dotIndex === 0 || dotIndex === variableKey.length - 1) return null;
  const alias = variableKey.substring(0, dotIndex);
  const fieldKey = variableKey.substring(dotIndex + 1);
  // Reject if there are additional dots (multi-level keys like pricing.section.item)
  if (fieldKey.includes('.')) return null;
  return { alias, fieldKey };
}

/**
 * Resolve a product variable to its actual value.
 * Checks static PRODUCT_VARIABLE_FIELDS first, then flat rawData keys for catalog products.
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

  // Try static field definition first
  const field = PRODUCT_VARIABLE_FIELDS.find(f => f.key === fieldKey);
  if (field) {
    const value = getProductFieldValue(product, field);
    if (value !== null) return String(value);
  }

  // For catalog products, try flat rawData key with label resolution
  if (isCatalogProduct(product) && product.rawData) {
    const raw = product.rawData as Record<string, unknown>;
    const rawValue = raw[fieldKey];
    const specLabels = raw._specificationLabels as Record<string, string> | undefined;
    return resolveRawDataValue(rawValue, specLabels);
  }

  return null;
}

/** Known static variable prefixes (not product aliases) */
const STATIC_VARIABLE_PREFIXES = new Set([
  'proposal', 'project', 'contact', 'client', 'org', 'products',
  'pricing', 'leadtimes', 'misc', 'row',
]);

/**
 * Check if a variable key refers to a product variable.
 * Excludes known static variable prefixes like client.name, project.date, etc.
 */
export function isProductVariable(variableKey: string): boolean {
  const parsed = parseVariableKey(variableKey);
  if (!parsed) return false;
  // If the prefix is a known static category, it's not a product variable
  return !STATIC_VARIABLE_PREFIXES.has(parsed.alias.toLowerCase());
}

/**
 * Get grouped variable fields for UI display
 */
export function getFieldsByCategory(): Record<string, ProductVariableField[]> {
  return PRODUCT_VARIABLE_FIELDS.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category]!.push(field);
    return acc;
  }, {} as Record<string, ProductVariableField[]>);
}
