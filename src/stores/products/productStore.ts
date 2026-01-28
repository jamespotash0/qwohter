/**
 * Product Store
 * Manages product hierarchy state for cascading selection
 *
 * Hierarchy: Domain → Manufacturer → Product Line → Series → Model
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

/**
 * Legacy field definition for default_configurations
 * @deprecated Use config_schema instead for new development
 */
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
  options?: unknown[];
  depends_on?: { field_id: string; value: unknown }[] | null;
  default_value?: unknown;
  placeholder?: string;
  multi_select?: boolean;
  manual_select?: boolean;
  display_order?: number;
  display_group?: 'primary' | 'secondary' | 'advanced';
  grid_span?: number;
}

export interface ProductModel {
  id: string;
  product_series_id: string;
  product_line_id?: string;
  product_manufacturer_id?: string;
  name: string;
  /** @deprecated Use config_schema instead */
  default_configurations?: Record<string, FieldDefinition>;
  /** Configuration schema for product options (replaces pc_* tables) */
  config_schema?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ProductSelection {
  product_model_id: string;
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
  };
  specifications: Record<string, unknown>;
  /** Human-readable labels for specification codes */
  specification_labels?: Record<string, string>;
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
  manufacturers: Map<string, ProductManufacturer[]>;
  productLines: Map<string, ProductLine[]>;
  series: Map<string, ProductSeries[]>;
  models: Map<string, ProductModel[]>;

  // Selected state
  selectedDomain: ProductDomain | null;
  selectedManufacturer: ProductManufacturer | null;
  selectedProductLine: ProductLine | null;
  selectedSeries: ProductSeries | null;
  selectedModel: ProductModel | null;

  // Loading states
  loading: {
    domains: boolean;
    manufacturers: boolean;
    productLines: boolean;
    series: boolean;
    models: boolean;
  };

  error: string | null;

  // Actions
  fetchDomains: () => Promise<void>;
  fetchManufacturers: (domainId: string) => Promise<void>;
  fetchProductLines: (manufacturerId: string) => Promise<void>;
  fetchSeries: (productLineId: string) => Promise<void>;
  fetchSeriesByManufacturer: (manufacturerId: string) => Promise<void>;
  fetchModels: (seriesId: string) => Promise<void>;
  fetchModelsByProductLine: (productLineId: string) => Promise<void>;
  fetchModelsByManufacturer: (manufacturerId: string) => Promise<void>;
  getModelDetails: (modelId: string) => Promise<ProductModel | null>;

  // Selection actions
  selectDomain: (domain: ProductDomain | null) => void;
  selectManufacturer: (manufacturer: ProductManufacturer | null) => void;
  selectProductLine: (productLine: ProductLine | null) => void;
  selectSeries: (series: ProductSeries | null) => void;
  selectModel: (model: ProductModel | null) => void;

  // Utilities
  reset: () => void;
  clearFromLevel: (level: 'manufacturer' | 'productLine' | 'series' | 'model') => void;
  setError: (error: string | null) => void;
  /** Restore hierarchy state from saved product data (for editing) */
  restoreFromProduct: (rawData: Record<string, unknown>) => Promise<void>;

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

    selectedDomain: null,
    selectedManufacturer: null,
    selectedProductLine: null,
    selectedSeries: null,
    selectedModel: null,

    loading: {
      domains: false,
      manufacturers: false,
      productLines: false,
      series: false,
      models: false,
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
          .map((row: { product_manufacturers: ProductManufacturer | null }) =>
            row.product_manufacturers
          )
          .filter((m): m is ProductManufacturer => m !== null)
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

    // Fetch series directly by manufacturer (for manufacturers without product lines)
    fetchSeriesByManufacturer: async (manufacturerId: string) => {
      const cacheKey = `mfr_${manufacturerId}`;
      const cached = get().series.get(cacheKey);
      if (cached && cached.length > 0) return;

      set((state) => ({
        loading: { ...state.loading, series: true },
        error: null,
      }));

      try {
        const { data, error } = await supabase
          .from('product_series')
          .select('*')
          .eq('manufacturer_id', manufacturerId)
          .is('product_line_id', null)
          .order('name', { ascending: true });

        if (error) throw error;

        const newMap = new Map(get().series);
        newMap.set(cacheKey, data || []);
        set({ series: newMap });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message });
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
          .is('product_series_id', null)
          .order('name', { ascending: true });

        if (error) throw error;

        const newMap = new Map(get().models);
        newMap.set(cacheKey, data || []);
        set({ models: newMap });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message });
      } finally {
        set((state) => ({
          loading: { ...state.loading, models: false },
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
      });

      if (domain) {
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
      });

      if (manufacturer) {
        get().fetchProductLines(manufacturer.id);
      }
    },

    selectProductLine: (productLine) => {
      set({
        selectedProductLine: productLine,
        selectedSeries: null,
        selectedModel: null,
      });

      if (productLine) {
        get().fetchSeries(productLine.id);
      }
    },

    selectSeries: (series) => {
      set({
        selectedSeries: series,
        selectedModel: null,
      });

      if (series) {
        get().fetchModels(series.id);
      }
    },

    selectModel: (model) => {
      set({ selectedModel: model });
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
          });
          break;
        case 'productLine':
          set({
            selectedProductLine: null,
            selectedSeries: null,
            selectedModel: null,
          });
          break;
        case 'series':
          set({
            selectedSeries: null,
            selectedModel: null,
          });
          break;
        case 'model':
          set({ selectedModel: null });
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
        error: null,
      });
    },

    // Restore hierarchy state from saved product data (for editing)
    restoreFromProduct: async (rawData: Record<string, unknown>) => {
      // Reset first
      set({
        selectedDomain: null,
        selectedManufacturer: null,
        selectedProductLine: null,
        selectedSeries: null,
        selectedModel: null,
        error: null,
      });

      // Extract hierarchy IDs from rawData
      const domainId = rawData.domain_id as string | undefined;
      const manufacturerId = rawData.manufacturer_id as string | undefined;
      const productLineId = rawData.product_line_id as string | undefined;
      const seriesId = rawData.series_id as string | undefined;
      const modelId = rawData.model_id as string | undefined;

      if (!domainId) {
        console.warn('[productStore] No domain_id found in product rawData');
        return;
      }

      try {
        // 1. Fetch and select domain
        await get().fetchDomains();
        const domain = get().domains.find(d => d.id === domainId);
        if (!domain) {
          console.warn('[productStore] Domain not found:', domainId);
          return;
        }
        set({ selectedDomain: domain });

        if (!manufacturerId) return;

        // 2. Fetch and select manufacturer
        await get().fetchManufacturers(domainId);
        const manufacturersList = get().manufacturers.get(domainId) || [];
        const manufacturer = manufacturersList.find(m => m.id === manufacturerId);
        if (!manufacturer) {
          console.warn('[productStore] Manufacturer not found:', manufacturerId);
          return;
        }
        set({ selectedManufacturer: manufacturer });

        // 3. Fetch product lines
        await get().fetchProductLines(manufacturerId);
        const productLinesList = get().productLines.get(manufacturerId) || [];

        // If product line exists, select it
        if (productLineId && productLinesList.length > 0) {
          const productLine = productLinesList.find(pl => pl.id === productLineId);
          if (productLine) {
            set({ selectedProductLine: productLine });

            // 4. Fetch series for this product line
            if (seriesId) {
              await get().fetchSeries(productLineId);
              const seriesList = get().series.get(productLineId) || [];
              const series = seriesList.find(s => s.id === seriesId);
              if (series) {
                set({ selectedSeries: series });
              }
            }
          }
        } else if (seriesId) {
          // No product line - try fetching series by manufacturer
          await get().fetchSeriesByManufacturer(manufacturerId);
          const seriesList = get().series.get(`mfr_${manufacturerId}`) || [];
          const series = seriesList.find(s => s.id === seriesId);
          if (series) {
            set({ selectedSeries: series });
          }
        }

        // 5. Fetch and select model
        if (modelId) {
          const currentSeries = get().selectedSeries;
          if (currentSeries) {
            await get().fetchModels(currentSeries.id);
            const modelsList = get().models.get(currentSeries.id) || [];
            const model = modelsList.find(m => m.id === modelId);
            if (model) {
              set({ selectedModel: model });
            }
          } else {
            // Try fetching models by manufacturer (no series)
            await get().fetchModelsByManufacturer(manufacturerId);
            const modelsList = get().models.get(`mfr_${manufacturerId}`) || [];
            const model = modelsList.find(m => m.id === modelId);
            if (model) {
              set({ selectedModel: model });
            }
          }
        }
      } catch (error) {
        console.error('[productStore] Error restoring from product:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to restore product' });
      }
    },

    setError: (error) => set({ error }),
  }))
);
