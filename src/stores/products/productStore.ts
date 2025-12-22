/**
 * Product Store
 * Manages product hierarchy state for cascading selection
 *
 * Hierarchy: Domain → Manufacturer → Product Line → Series → Model → Variant
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductDomain {
  id: string;
  name: string;
  code?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductLine {
  id: string;
  manufacturer_id: string;
  name: string;
  code?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductManufacturer {
  id: string;
  name: string;
  code?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductSeries {
  id: string;
  product_line_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProductModel {
  id: string;
  product_series_id: string;
  product_line_id?: string;
  product_manufacturer_id?: string;
  name: string;
  default_configurations: Record<string, FieldDefinition>;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  model_id: string;
  name: string;
  sku?: string;
  description?: string;
  specifications: Record<string, unknown>;
  pricing: Record<string, unknown>;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FieldDefinition {
  field_type:
    | 'input'
    | 'checkbox'
    | 'textarea'
    | 'date'
    | 'dropdown'
    | 'multi-select'
    | 'radio'
    | 'auto';
  input_type?: 'string' | 'number' | 'email' | 'tel' | 'url' | 'date' | 'datetime-local' | 'time';
  required: boolean;
  options?: any[]; // available choices (can be numbers or strings)
  depends_on?: { field_id: string; value: any }[] | null; // triggers dependency logic
  default_value?: any;
  placeholder?: string;
  multi_select?: boolean; // true if multiple selections allowed
  manual_select?: boolean; // true if user can manually pick (vs auto-calculated)

  // Display metadata for UI rendering
  display_order?: number; // sort order (lower = first)
  display_group?: 'primary' | 'secondary' | 'advanced'; // grouping for layout
  grid_span?: number; // number of columns to span (1-4)
}


export interface ProductSelection {
  product_model_id: string;
  product_variant_id: string | null;
  product_hierarchy: {
    domain: string;
    domain_id: string;
    manufacturer: string;
    manufacturer_id: string;
    product_line: string;
    product_line_id: string;
    series: string;
    series_id: string;
    model: string;
    variant: string | null;
    variant_id: string | null;
  };
  specifications: Record<string, unknown>;
  pricing: {
    unit_price: number;
    quantity: number;
    subtotal: number;
  };
}

// ============================================================================
// STORE STATE
// ============================================================================

interface ProductState {
  // Hierarchy data (cached)
  domains: ProductDomain[];
  manufacturers: Map<string, ProductManufacturer[]>; // keyed by domain_id (via junction)
  productLines: Map<string, ProductLine[]>; // keyed by manufacturer_id
  series: Map<string, ProductSeries[]>; // keyed by product_line_id
  models: Map<string, ProductModel[]>; // keyed by product_series.id or pl_${product_line_id}
  variants: Map<string, ProductVariant[]>; // keyed by model_id

  // Selected state
  selectedDomain: ProductDomain | null;
  selectedManufacturer: ProductManufacturer | null;
  selectedProductLine: ProductLine | null;
  selectedSeries: ProductSeries | null;
  selectedModel: ProductModel | null;
  selectedVariant: ProductVariant | null;

  // Loading states
  loading: {
    domains: boolean;
    manufacturers: boolean;
    productLines: boolean;
    series: boolean;
    models: boolean;
    variants: boolean;
  };

  error: string | null;

  // Actions
  fetchDomains: () => Promise<void>;
  fetchManufacturers: (domainId: string) => Promise<void>;
  fetchProductLines: (manufacturerId: string) => Promise<void>;
  fetchSeries: (productLineId: string) => Promise<void>;
  fetchModels: (seriesId: string) => Promise<void>;
  fetchModelsByProductLine: (productLineId: string) => Promise<void>;
  fetchModelsByManufacturer: (manufacturerId: string) => Promise<void>;
  fetchVariants: (modelId: string) => Promise<void>;
  getModelDetails: (modelId: string) => Promise<ProductModel | null>;

  // Selection actions
  selectDomain: (domain: ProductDomain | null) => void;
  selectManufacturer: (manufacturer: ProductManufacturer | null) => void;
  selectProductLine: (productLine: ProductLine | null) => void;
  selectSeries: (series: ProductSeries | null) => void;
  selectModel: (model: ProductModel | null) => void;
  selectVariant: (variant: ProductVariant | null) => void;

  // Utilities
  reset: () => void;
  clearFromLevel: (level: 'manufacturer' | 'productLine' | 'series' | 'model' | 'variant') => void;
  setError: (error: string | null) => void;

  // Legacy aliases for backward compatibility
  types: ProductDomain[];
  selectedType: ProductDomain | null;
  fetchTypes: () => Promise<void>;
  selectType: (domain: ProductDomain | null) => void;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useProductStore = create<ProductState>()(
  devtools((set, get) => ({
    // Initial state
    domains: [],
    manufacturers: new Map(),
    productLines: new Map(),
    series: new Map(),
    models: new Map(),
    variants: new Map(),

    selectedDomain: null,
    selectedManufacturer: null,
    selectedProductLine: null,
    selectedSeries: null,
    selectedModel: null,
    selectedVariant: null,

    loading: {
      domains: false,
      manufacturers: false,
      productLines: false,
      series: false,
      models: false,
      variants: false,
    },

    error: null,

    // Legacy aliases (computed getters)
    get types() {
      return get().domains;
    },
    get selectedType() {
      return get().selectedDomain;
    },

    // Fetch product domains (top level)
    fetchDomains: async () => {
      if (get().domains.length > 0) return;

      set((state) => ({
        loading: { ...state.loading, domains: true },
        error: null,
      }));

      try {
        const { data, error } = await supabase
          .from('product_domain')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        set({ domains: data || [] });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message });
        console.error('Error fetching product domains:', error);
      } finally {
        set((state) => ({
          loading: { ...state.loading, domains: false },
        }));
      }
    },

    // Legacy alias
    fetchTypes: async () => {
      return get().fetchDomains();
    },

    // Fetch product lines for a manufacturer
    fetchProductLines: async (manufacturerId: string) => {
      const cached = get().productLines.get(manufacturerId);
      if (cached && cached.length > 0) return;

      set((state) => ({
        loading: { ...state.loading, productLines: true },
        error: null,
      }));

      try {
        const { data, error } = await supabase
          .from('product_line')
          .select('*')
          .eq('manufacturer_id', manufacturerId)
          .order('name', { ascending: true });

        if (error) throw error;

        const newMap = new Map(get().productLines);
        newMap.set(manufacturerId, data || []);
        set({ productLines: newMap });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message });
        console.error('Error fetching product lines:', error);
      } finally {
        set((state) => ({
          loading: { ...state.loading, productLines: false },
        }));
      }
    },

    // Fetch manufacturers for a domain (via junction table)
    fetchManufacturers: async (domainId: string) => {
      const cached = get().manufacturers.get(domainId);
      if (cached && cached.length > 0) return;

      set((state) => ({
        loading: { ...state.loading, manufacturers: true },
        error: null,
      }));

      try {
        // Query via junction table to get manufacturers for this domain
        const { data, error } = await supabase
          .from('manufacturer_product_domains')
          .select(`
            manufacturer_id,
            product_manufacturers (
              id,
              name,
              code,
              created_at,
              updated_at
            )
          `)
          .eq('domain_id', domainId);

        if (error) throw error;

        // Extract manufacturer data from the joined result
        const manufacturers = (data || [])
          .map((row) => row.product_manufacturers as ProductManufacturer)
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name));

        const newMap = new Map(get().manufacturers);
        newMap.set(domainId, manufacturers);
        set({ manufacturers: newMap });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message });
        console.error('Error fetching manufacturers:', error);
      } finally {
        set((state) => ({
          loading: { ...state.loading, manufacturers: false },
        }));
      }
    },

    // Fetch series for a product line
    fetchSeries: async (productLineId: string) => {
      const cached = get().series.get(productLineId);
      if (cached && cached.length > 0) return;

      set((state) => ({
        loading: { ...state.loading, series: true },
        error: null,
      }));

      try {
        const { data, error } = await supabase
          .from('product_series')
          .select('*')
          .eq('product_line_id', productLineId)
          .order('name', { ascending: true });

        if (error) throw error;

        const newMap = new Map(get().series);
        newMap.set(productLineId, data || []);
        set({ series: newMap });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message });
        console.error('Error fetching series:', error);
      } finally {
        set((state) => ({
          loading: { ...state.loading, series: false },
        }));
      }
    },

    // Fetch models for a series
    fetchModels: async (seriesId: string) => {
      const cached = get().models.get(seriesId);
      if (cached && cached.length > 0) return;

      set((state) => ({
        loading: { ...state.loading, models: true },
        error: null,
      }));

      try {
        const { data, error } = await supabase
          .from('product_models')
          .select('*')
          .eq('product_series_id', seriesId)
          .order('name', { ascending: true });

        if (error) throw error;

        const newMap = new Map(get().models);
        newMap.set(seriesId, data || []);
        set({ models: newMap });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message });
        console.error('Error fetching models:', error);
      } finally {
        set((state) => ({
          loading: { ...state.loading, models: false },
        }));
      }
    },

    // Fetch models directly by product line (alternative path, skipping series)
    fetchModelsByProductLine: async (productLineId: string) => {
      const cacheKey = `pl_${productLineId}`;
      const cached = get().models.get(cacheKey);
      if (cached && cached.length > 0) return;

      set((state) => ({
        loading: { ...state.loading, models: true },
        error: null,
      }));

      try {
        const { data, error } = await supabase
          .from('product_models')
          .select('*')
          .eq('product_line_id', productLineId)
          .order('name', { ascending: true });

        if (error) throw error;

        const newMap = new Map(get().models);
        newMap.set(cacheKey, data || []);
        set({ models: newMap });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message });
        console.error('Error fetching models by product line:', error);
      } finally {
        set((state) => ({
          loading: { ...state.loading, models: false },
        }));
      }
    },

    // Fetch models directly by manufacturer (for manufacturers without series)
    fetchModelsByManufacturer: async (manufacturerId: string) => {
      const cacheKey = `mfr_${manufacturerId}`;
      const cached = get().models.get(cacheKey);
      if (cached && cached.length > 0) return;

      set((state) => ({
        loading: { ...state.loading, models: true },
        error: null,
      }));

      try {
        const { data, error } = await supabase
          .from('product_models')
          .select('*')
          .eq('product_manufacturer_id', manufacturerId)
          .is('product_series_id', null) // Only models directly under manufacturer (no series)
          .order('name', { ascending: true });

        if (error) throw error;

        const newMap = new Map(get().models);
        newMap.set(cacheKey, data || []);
        set({ models: newMap });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message });
        console.error('Error fetching models by manufacturer:', error);
      } finally {
        set((state) => ({
          loading: { ...state.loading, models: false },
        }));
      }
    },

    // Fetch variants for a model
    fetchVariants: async (modelId: string) => {
      const cached = get().variants.get(modelId);
      if (cached && cached.length > 0) return;

      set((state) => ({
        loading: { ...state.loading, variants: true },
        error: null,
      }));

      try {
        const { data, error } = await supabase
          .from('product_variants')
          .select('*')
          .eq('model_id', modelId)
          .order('sort_order', { ascending: true });

        if (error) throw error;

        const newMap = new Map(get().variants);
        newMap.set(modelId, data || []);
        set({ variants: newMap });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message });
        console.error('Error fetching variants:', error);
      } finally {
        set((state) => ({
          loading: { ...state.loading, variants: false },
        }));
      }
    },

    // Get detailed model information
    getModelDetails: async (modelId: string) => {
      try {
        const { data, error } = await supabase
          .from('product_models')
          .select('*')
          .eq('id', modelId)
          .single();

        if (error) throw error;
        return data;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message });
        console.error('Error fetching model details:', error);
        return null;
      }
    },

    // Selection actions
    selectDomain: (domain) => {
      set({
        selectedDomain: domain,
        selectedManufacturer: null,
        selectedProductLine: null,
        selectedSeries: null,
        selectedModel: null,
        selectedVariant: null,
      });

      if (domain) {
        // Fetch manufacturers for the domain
        get().fetchManufacturers(domain.id);
      }
    },

    // Legacy alias
    selectType: (domain) => {
      get().selectDomain(domain);
    },

    selectManufacturer: (manufacturer) => {
      set({
        selectedManufacturer: manufacturer,
        selectedProductLine: null,
        selectedSeries: null,
        selectedModel: null,
        selectedVariant: null,
      });

      if (manufacturer) {
        // Fetch product lines for this manufacturer
        get().fetchProductLines(manufacturer.id);
      }
    },

    selectProductLine: (productLine) => {
      set({
        selectedProductLine: productLine,
        selectedSeries: null,
        selectedModel: null,
        selectedVariant: null,
      });

      if (productLine) {
        // Fetch series for this product line
        get().fetchSeries(productLine.id);
      }
    },

    selectSeries: (series) => {
      set({
        selectedSeries: series,
        selectedModel: null,
        selectedVariant: null,
      });

      if (series) {
        get().fetchModels(series.id);
      }
    },

    selectModel: (model) => {
      set({
        selectedModel: model,
        selectedVariant: null,
      });

      if (model) {
        get().fetchVariants(model.id);
      }
    },

    selectVariant: (variant) => {
      set({ selectedVariant: variant });
    },

    // Clear from a specific level
    clearFromLevel: (level) => {
      switch (level) {
        case 'manufacturer':
          set({
            selectedManufacturer: null,
            selectedProductLine: null,
            selectedSeries: null,
            selectedModel: null,
            selectedVariant: null,
          });
          break;
        case 'productLine':
          set({
            selectedProductLine: null,
            selectedSeries: null,
            selectedModel: null,
            selectedVariant: null,
          });
          break;
        case 'series':
          set({
            selectedSeries: null,
            selectedModel: null,
            selectedVariant: null,
          });
          break;
        case 'model':
          set({
            selectedModel: null,
            selectedVariant: null,
          });
          break;
        case 'variant':
          set({ selectedVariant: null });
          break;
      }
    },

    // Reset all state
    reset: () => {
      set({
        selectedDomain: null,
        selectedManufacturer: null,
        selectedProductLine: null,
        selectedSeries: null,
        selectedModel: null,
        selectedVariant: null,
        error: null,
      });
    },

    setError: (error) => set({ error }),
  }))
);
