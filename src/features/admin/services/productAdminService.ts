/**
 * Product Admin Service
 * CRUD operations for product hierarchy management
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface ProductDomain {
  id: string;
  name: string;
  code: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductManufacturer {
  id: string;
  name: string;
  code: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
  domains?: ProductDomain[]; // Populated via junction table
}

export interface ProductLine {
  id: string;
  manufacturer_id: string;
  name: string;
  code: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductSeries {
  id: string;
  manufacturer_id: string | null;
  product_line_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProductModel {
  id: string;
  series_id: string | null;
  manufacturer_id: string | null;
  category_id: string | null;
  product_series_id: string | null;
  product_line_id: string | null;
  product_manufacturer_id: string | null;
  name: string;
  default_configurations: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  model_id: string;
  name: string;
  description: string | null;
  specifications: Record<string, any>;
  pricing: Record<string, any>;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Service Class
// ============================================================================

class ProductAdminService {
  // ==========================================================================
  // Domains
  // ==========================================================================

  async getDomains(): Promise<ProductDomain[]> {
    const { data, error } = await supabase
      .from('product_domain')
      .select('*')
      .order('name');

    if (error) throw new Error(`Failed to fetch domains: ${error.message}`);
    return data || [];
  }

  async getDomain(id: string): Promise<ProductDomain | null> {
    const { data, error } = await supabase
      .from('product_domain')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch domain: ${error.message}`);
    }
    return data;
  }

  async createDomain(input: { name: string; code?: string | null }): Promise<ProductDomain> {
    const { data, error } = await supabase
      .from('product_domain')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(`Failed to create domain: ${error.message}`);
    return data;
  }

  async updateDomain(id: string, updates: { name?: string; code?: string | null }): Promise<ProductDomain> {
    const { data, error } = await supabase
      .from('product_domain')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update domain: ${error.message}`);
    return data;
  }

  async deleteDomain(id: string): Promise<void> {
    const { error } = await supabase
      .from('product_domain')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete domain: ${error.message}`);
  }

  // ==========================================================================
  // Manufacturers
  // ==========================================================================

  async getManufacturers(): Promise<ProductManufacturer[]> {
    const { data, error } = await supabase
      .from('product_manufacturers')
      .select('*')
      .order('name');

    if (error) throw new Error(`Failed to fetch manufacturers: ${error.message}`);
    return data || [];
  }

  async getManufacturersByDomain(domainId: string): Promise<ProductManufacturer[]> {
    const { data, error } = await supabase
      .from('manufacturer_product_domains')
      .select(`
        manufacturer_id,
        product_manufacturers (*)
      `)
      .eq('domain_id', domainId);

    if (error) throw new Error(`Failed to fetch manufacturers: ${error.message}`);
    return (data || [])
      .map((row) => row.product_manufacturers as ProductManufacturer)
      .filter(Boolean);
  }

  async createManufacturer(input: {
    name: string;
    code?: string | null;
    logo_url?: string | null;
  }): Promise<ProductManufacturer> {
    const { data, error } = await supabase
      .from('product_manufacturers')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(`Failed to create manufacturer: ${error.message}`);
    return data;
  }

  async updateManufacturer(
    id: string,
    updates: { name?: string; code?: string | null; logo_url?: string | null }
  ): Promise<ProductManufacturer> {
    const { data, error } = await supabase
      .from('product_manufacturers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update manufacturer: ${error.message}`);
    return data;
  }

  async deleteManufacturer(id: string): Promise<void> {
    const { error } = await supabase
      .from('product_manufacturers')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete manufacturer: ${error.message}`);
  }

  async linkManufacturerToDomain(manufacturerId: string, domainId: string): Promise<void> {
    const { error } = await supabase
      .from('manufacturer_product_domains')
      .insert({ manufacturer_id: manufacturerId, domain_id: domainId });

    if (error && !error.message.includes('duplicate')) {
      throw new Error(`Failed to link manufacturer to domain: ${error.message}`);
    }
  }

  async unlinkManufacturerFromDomain(manufacturerId: string, domainId: string): Promise<void> {
    const { error } = await supabase
      .from('manufacturer_product_domains')
      .delete()
      .eq('manufacturer_id', manufacturerId)
      .eq('domain_id', domainId);

    if (error) throw new Error(`Failed to unlink manufacturer from domain: ${error.message}`);
  }

  /**
   * Get domains for a manufacturer (reverse lookup)
   */
  async getDomainsForManufacturer(manufacturerId: string): Promise<ProductDomain[]> {
    const { data, error } = await supabase
      .from('manufacturer_product_domains')
      .select(`
        domain_id,
        product_domain (*)
      `)
      .eq('manufacturer_id', manufacturerId);

    if (error) throw new Error(`Failed to fetch domains for manufacturer: ${error.message}`);
    return (data || [])
      .map((row) => row.product_domain as ProductDomain)
      .filter(Boolean);
  }

  /**
   * Get all manufacturer-domain associations
   * Returns a map of manufacturer_id -> domain_ids[]
   */
  async getAllManufacturerDomainLinks(): Promise<Map<string, string[]>> {
    const { data, error } = await supabase
      .from('manufacturer_product_domains')
      .select('manufacturer_id, domain_id');

    if (error) throw new Error(`Failed to fetch domain links: ${error.message}`);

    const map = new Map<string, string[]>();
    for (const row of data || []) {
      const existing = map.get(row.manufacturer_id) || [];
      existing.push(row.domain_id);
      map.set(row.manufacturer_id, existing);
    }
    return map;
  }

  // ==========================================================================
  // Product Lines
  // ==========================================================================

  async getProductLines(manufacturerId?: string): Promise<ProductLine[]> {
    let query = supabase.from('product_line').select('*').order('name');

    if (manufacturerId) {
      query = query.eq('manufacturer_id', manufacturerId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch product lines: ${error.message}`);
    return data || [];
  }

  async createProductLine(input: {
    manufacturer_id: string;
    name: string;
    code?: string | null;
  }): Promise<ProductLine> {
    const { data, error } = await supabase
      .from('product_line')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(`Failed to create product line: ${error.message}`);
    return data;
  }

  async updateProductLine(
    id: string,
    updates: { name?: string; code?: string | null }
  ): Promise<ProductLine> {
    const { data, error } = await supabase
      .from('product_line')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update product line: ${error.message}`);
    return data;
  }

  async deleteProductLine(id: string): Promise<void> {
    const { error } = await supabase.from('product_line').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete product line: ${error.message}`);
  }

  // ==========================================================================
  // Series
  // ==========================================================================

  async getSeries(productLineId?: string): Promise<ProductSeries[]> {
    let query = supabase.from('product_series').select('*').order('name');

    if (productLineId) {
      query = query.eq('product_line_id', productLineId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch series: ${error.message}`);
    return data || [];
  }

  async createSeries(input: {
    product_line_id?: string | null;
    manufacturer_id?: string | null;
    name: string;
  }): Promise<ProductSeries> {
    const { data, error } = await supabase
      .from('product_series')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(`Failed to create series: ${error.message}`);
    return data;
  }

  async updateSeries(id: string, updates: { name?: string }): Promise<ProductSeries> {
    const { data, error } = await supabase
      .from('product_series')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update series: ${error.message}`);
    return data;
  }

  async deleteSeries(id: string): Promise<void> {
    const { error } = await supabase.from('product_series').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete series: ${error.message}`);
  }

  // ==========================================================================
  // Models
  // ==========================================================================

  async getModels(seriesId?: string): Promise<ProductModel[]> {
    let query = supabase.from('product_models').select('*').order('name');

    if (seriesId) {
      query = query.eq('product_series_id', seriesId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch models: ${error.message}`);
    return data || [];
  }

  /**
   * Get models that don't belong to any series (directly under manufacturer)
   */
  async getModelsWithoutSeries(manufacturerId: string): Promise<ProductModel[]> {
    const { data, error } = await supabase
      .from('product_models')
      .select('*')
      .eq('product_manufacturer_id', manufacturerId)
      .is('product_series_id', null)
      .order('name');

    if (error) throw new Error(`Failed to fetch models: ${error.message}`);
    return data || [];
  }

  async createModel(input: {
    product_series_id?: string | null;
    product_manufacturer_id?: string | null;
    name: string;
    default_configurations?: Record<string, any> | null;
  }): Promise<ProductModel> {
    const { data, error } = await supabase
      .from('product_models')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(`Failed to create model: ${error.message}`);
    return data;
  }

  async updateModel(
    id: string,
    updates: { name?: string; default_configurations?: Record<string, any> | null }
  ): Promise<ProductModel> {
    const { data, error } = await supabase
      .from('product_models')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update model: ${error.message}`);
    return data;
  }

  async deleteModel(id: string): Promise<void> {
    const { error } = await supabase.from('product_models').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete model: ${error.message}`);
  }

  // ==========================================================================
  // Variants
  // ==========================================================================

  async getVariants(modelId?: string): Promise<ProductVariant[]> {
    let query = supabase.from('product_variants').select('*').order('sort_order');

    if (modelId) {
      query = query.eq('model_id', modelId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch variants: ${error.message}`);
    return data || [];
  }

  async createVariant(input: {
    model_id: string;
    name: string;
    description?: string | null;
    specifications?: Record<string, any>;
    pricing?: Record<string, any>;
    is_default?: boolean;
    sort_order?: number;
  }): Promise<ProductVariant> {
    const { data, error } = await supabase
      .from('product_variants')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(`Failed to create variant: ${error.message}`);
    return data;
  }

  async updateVariant(
    id: string,
    updates: Partial<Omit<ProductVariant, 'id' | 'created_at'>>
  ): Promise<ProductVariant> {
    const { data, error } = await supabase
      .from('product_variants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update variant: ${error.message}`);
    return data;
  }

  async deleteVariant(id: string): Promise<void> {
    const { error } = await supabase.from('product_variants').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete variant: ${error.message}`);
  }
}

// Export singleton instance
export const productAdminService = new ProductAdminService();
