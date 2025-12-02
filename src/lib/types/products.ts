/**
 * Product Types
 *
 * Simplified product catalog types.
 */

/**
 * Price modifier for product options
 */
export interface ProductPriceModifier {
  name: string;
  value: number;
  type: 'fixed' | 'percentage';
}

/**
 * Product options that can affect pricing
 */
export interface ProductOptions {
  additions?: ProductPriceModifier[];
  deductions?: ProductPriceModifier[];
}

/**
 * Main Product interface
 */
export interface Product {
  id: string;
  organization_id: string;
  product_number: number;
  display_id: string | null;
  name: string;
  price: number | null;
  category: string | null;
  manufacturer: string | null;
  product_type: string | null;
  series: string | null;
  model: string | null;
  specifications: Record<string, unknown>;
  options: ProductOptions;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new product
 */
export interface CreateProductInput {
  name: string;
  price?: number | null;
  category?: string;
  display_id?: string;
  manufacturer?: string;
  product_type?: string;
  series?: string;
  model?: string;
  specifications?: Record<string, unknown>;
  options?: ProductOptions;
}

/**
 * Input for updating an existing product
 */
export interface UpdateProductInput {
  name?: string;
  price?: number | null;
  category?: string | null;
  display_id?: string | null;
  manufacturer?: string | null;
  product_type?: string | null;
  series?: string | null;
  model?: string | null;
  specifications?: Record<string, unknown>;
  options?: ProductOptions;
  sort_order?: number;
}

/**
 * Predefined product categories
 */
export const PRODUCT_CATEGORIES = [
  'Shipping & Freight',
  'Labor',
  'Installation',
  'Delivery',
  'Project Management',
  'Design Services',
  'Permits & Fees',
  'Storage & Warehousing',
  'Disposal & Removal',
  'Equipment Rental',
  'Materials',
  'Miscellaneous',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/**
 * Get display ID for a product
 * Returns custom display_id if set, otherwise formats product_number
 */
export const getProductDisplayId = (product: Product): string => {
  if (product.display_id) {
    return product.display_id;
  }
  return `${product.product_number}`;
};

/**
 * Format price for display - empty if null
 */
export const formatProductPrice = (price: number | null): string => {
  if (price === null) {
    return '';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(price);
};
