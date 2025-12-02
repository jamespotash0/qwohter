/**
 * Products Service
 *
 * Handles all operations related to product catalog management
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  Product,
  CreateProductInput,
  UpdateProductInput,
} from '@/lib/types/products';

export class ProductsService {
  /**
   * Get all products for an organization
   */
  async getProducts(organizationId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Failed to fetch products:', error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    return (data as Product[]) || [];
  }

  /**
   * Get a single product by ID
   */
  async getProductById(productId: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) {
      console.error('Failed to fetch product:', error);
      throw new Error(`Failed to fetch product: ${error.message}`);
    }

    return data as Product;
  }

  /**
   * Search products by name or category
   */
  async searchProducts(
    organizationId: string,
    query: string
  ): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
      .order('product_number', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Failed to search products:', error);
      throw new Error(`Failed to search products: ${error.message}`);
    }

    return (data as Product[]) || [];
  }

  /**
   * Get the next available product number (fills gaps)
   */
  private async getNextProductNumber(organizationId: string): Promise<number> {
    const { data } = await supabase
      .from('products')
      .select('product_number')
      .eq('organization_id', organizationId)
      .order('product_number', { ascending: true });

    const products = data as { product_number: number }[] | null;

    if (!products || products.length === 0) {
      return 1;
    }

    // Find first gap in the sequence
    const numbers = products.map((p) => p.product_number);
    for (let i = 1; i <= numbers.length + 1; i++) {
      if (!numbers.includes(i)) {
        return i;
      }
    }

    return numbers.length + 1;
  }

  /**
   * Get the next available display ID (finds first unused number)
   */
  private async getNextDisplayId(organizationId: string): Promise<string> {
    const { data } = await supabase
      .from('products')
      .select('display_id')
      .eq('organization_id', organizationId);

    const products = data as { display_id: string | null }[] | null;

    if (!products || products.length === 0) {
      return '1';
    }

    // Get all numeric display IDs
    const numericIds = products
      .map((p) => parseInt(p.display_id || '', 10))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    if (numericIds.length === 0) {
      return '1';
    }

    // Find first gap in the sequence
    for (let i = 1; i <= numericIds.length + 1; i++) {
      if (!numericIds.includes(i)) {
        return String(i);
      }
    }

    return String(numericIds.length + 1);
  }

  /**
   * Create a new product
   */
  async createProduct(
    organizationId: string,
    input: CreateProductInput
  ): Promise<Product> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get next available product number (fills gaps)
    const nextProductNumber = await this.getNextProductNumber(organizationId);

    // Use provided display_id or find next available one
    let displayId = input.display_id;
    if (!displayId) {
      displayId = await this.getNextDisplayId(organizationId);
    }

    const insertData = {
      organization_id: organizationId,
      created_by: user.id,
      product_number: nextProductNumber,
      name: input.name,
      amount: input.amount ?? null,
      amount_unit: input.amount_unit || 'Flat',
      category: input.category || null,
      display_id: displayId,
      manufacturer: input.manufacturer || null,
      product_type: input.product_type || null,
      series: input.series || null,
      model: input.model || null,
      specifications: input.specifications || {},
      options: input.options || {},
    };

    // Type assertion needed until Supabase types are regenerated after migration
    const { data, error } = await supabase
      .from('products')
      .insert(insertData as never)
      .select()
      .single();

    if (error) {
      console.error('Failed to create product:', error);

      if (error.message.includes('unique')) {
        throw new Error('A product with this display ID already exists');
      }

      throw new Error(`Failed to create product: ${error.message}`);
    }

    return data as Product;
  }

  /**
   * Update an existing product
   */
  async updateProduct(
    productId: string,
    input: UpdateProductInput
  ): Promise<Product> {
    const updateData = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    // Type assertion needed until Supabase types are regenerated after migration
    const { data, error } = await supabase
      .from('products')
      .update(updateData as never)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update product:', error);

      if (error.message.includes('unique')) {
        throw new Error('A product with this display ID already exists');
      }

      throw new Error(`Failed to update product: ${error.message}`);
    }

    return data as Product;
  }

  /**
   * Delete a product (Owners/Admins only via RLS)
   */
  async deleteProduct(productId: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('Failed to delete product:', error);

      if (error.code === 'PGRST301' || error.message.includes('policy')) {
        throw new Error(
          'You do not have permission to delete products. Only Owners and Admins can delete products.'
        );
      }

      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }

  /**
   * Check if a display ID is available
   */
  async isDisplayIdAvailable(
    organizationId: string,
    displayId: string,
    excludeProductId?: string
  ): Promise<boolean> {
    let query = supabase
      .from('products')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('display_id', displayId);

    if (excludeProductId) {
      query = query.neq('id', excludeProductId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to check display ID:', error);
      throw new Error(`Failed to check display ID: ${error.message}`);
    }

    return !data || data.length === 0;
  }

  /**
   * Bulk create products (for CSV import)
   */
  async bulkCreateProducts(
    organizationId: string,
    products: CreateProductInput[]
  ): Promise<{ created: number; errors: string[] }> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const results = { created: 0, errors: [] as string[] };

    for (const product of products) {
      try {
        await this.createProduct(organizationId, product);
        results.created++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${product.name}: ${message}`);
      }
    }

    return results;
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(
    organizationId: string,
    category: string
  ): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('category', category)
      .order('product_number', { ascending: true });

    if (error) {
      console.error('Failed to fetch products by category:', error);
      throw new Error(`Failed to fetch products by category: ${error.message}`);
    }

    return (data as Product[]) || [];
  }

  /**
   * Reorder products by updating sort_order
   */
  async reorderProducts(
    productIds: string[]
  ): Promise<void> {
    // Update each product's sort_order based on its position in the array
    const updates = productIds.map((id, index) => ({
      id,
      sort_order: index,
      updated_at: new Date().toISOString(),
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('products')
        .update({ sort_order: update.sort_order, updated_at: update.updated_at } as never)
        .eq('id', update.id);

      if (error) {
        console.error('Failed to reorder product:', error);
        throw new Error(`Failed to reorder products: ${error.message}`);
      }
    }
  }
}

// Export singleton instance
export const productsService = new ProductsService();
