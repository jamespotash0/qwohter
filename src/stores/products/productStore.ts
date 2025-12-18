/**
 * Product Store
 * Manages product hierarchy state for cascading selection
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductType {
  id: string;
  name: string;
  code: string;
  required: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductManufacturer {
  id: string;
  product_type_id: string;
  name: string;
  code: string;
  required: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: string;
  manufacturer_id: string;
  name: string;
  code: string;
  required: boolean;
  has_series: boolean;
  has_model: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductSeries {
  id: string;
  product_category_id: string;
  name: string;
  has_model: boolean;
  required: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductModel {
  id: string;
  product_category_id: string;
  product_series_id: string;
  name: string;
  default_configurations: Record<string, FieldDefinition>;
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
  product_hierarchy: {
    type: string;
    type_id: string;
    manufacturer: string;
    manufacturer_id: string;
    category: string;
    category_id: string;
    series: string;
    series_id: string;
    model: string;
    model_number: string;
  };
  specifications: Record<string, any>;
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
  types: ProductType[];
  manufacturers: Map<string, ProductManufacturer[]>;
  categories: Map<string, ProductCategory[]>;
  series: Map<string, ProductSeries[]>;
  models: Map<string, ProductModel[]>;

  // Selected state
  selectedType: ProductType | null;
  selectedManufacturer: ProductManufacturer | null;
  selectedCategory: ProductCategory | null;
  selectedSeries: ProductSeries | null;
  selectedModel: ProductModel | null;

  // Loading states
  loading: {
    types: boolean;
    manufacturers: boolean;
    categories: boolean;
    series: boolean;
    models: boolean;
  };

  error: string | null;

  // Actions
  fetchTypes: () => Promise<void>;
  fetchManufacturers: (typeId: string) => Promise<void>;
  fetchCategories: (manufacturerId: string) => Promise<void>;
  fetchSeries: (categoryId: string) => Promise<void>;
  fetchModels: (seriesId: string) => Promise<void>;
  fetchModelsByCategory: (categoryId: string) => Promise<void>;
  getModelDetails: (modelId: string) => Promise<ProductModel | null>;

  // Selection actions
  selectType: (type: ProductType | null) => void;
  selectManufacturer: (manufacturer: ProductManufacturer | null) => void;
  selectCategory: (category: ProductCategory | null) => void;
  selectSeries: (series: ProductSeries | null) => void;
  selectModel: (model: ProductModel | null) => void;

  // Utilities
  reset: () => void;
  clearFromLevel: (level: 'manufacturer' | 'category' | 'series' | 'model') => void;
  setError: (error: string | null) => void;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useProductStore = create<ProductState>()(
  devtools((set, get) => ({
    // Initial state
    types: [],
    manufacturers: new Map(),
    categories: new Map(),
    series: new Map(),
    models: new Map(),

    selectedType: null,
    selectedManufacturer: null,
    selectedCategory: null,
    selectedSeries: null,
    selectedModel: null,

    loading: {
      types: false,
      manufacturers: false,
      categories: false,
      series: false,
      models: false,
    },

    error: null,

    // Fetch product types
    fetchTypes: async () => {
      // Check cache first
      if (get().types.length > 0) {
        return;
      }

      set((state) => ({
        loading: { ...state.loading, types: true },
        error: null,
      }));

      try {
        const { data, error } = await supabase
          .from('product_types')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;

        set({ types: data || [] });
      } catch (error: any) {
        set({ error: error.message });
        console.error('Error fetching product types:', error);
      } finally {
        set((state) => ({
          loading: { ...state.loading, types: false },
        }));
      }
    },

    // Fetch manufacturers for a type
    fetchManufacturers: async (typeId: string) => {
      // Check cache
      const cached = get().manufacturers.get(typeId);
      if (cached && cached.length > 0) {
        return;
      }

      set((state) => ({
        loading: { ...state.loading, manufacturers: true },
        error: null,
      }));

      try {
        const { data, error } = await supabase
          .from('product_manufacturers')
          .select('*')
          .eq('product_type_id', typeId)
          .order('name', { ascending: true });

        if (error) throw error;

        const newMap = new Map(get().manufacturers);
        newMap.set(typeId, data || []);
        set({ manufacturers: newMap });
      } catch (error: any) {
        set({ error: error.message });
        console.error('Error fetching manufacturers:', error);
      } finally {
        set((state) => ({
          loading: { ...state.loading, manufacturers: false },
        }));
      }
    },

    // Fetch categories for a manufacturer
    fetchCategories: async (manufacturerId: string) => {
      const cached = get().categories.get(manufacturerId);
      if (cached && cached.length > 0) {
        return;
      }

      set((state) => ({
        loading: { ...state.loading, categories: true },
        error: null,
      }));

      try {
        const { data, error } = await supabase
          .from('product_categories')
          .select('*')
          .eq('manufacturer_id', manufacturerId)
          .order('name', { ascending: true });

        if (error) throw error;

        const newMap = new Map(get().categories);
        newMap.set(manufacturerId, data || []);
        set({ categories: newMap });
      } catch (error: any) {
        set({ error: error.message });
        console.error('Error fetching categories:', error);
      } finally {
        set((state) => ({
          loading: { ...state.loading, categories: false },
        }));
      }
    },

    // Fetch series for a category
    fetchSeries: async (categoryId: string) => {
      const cached = get().series.get(categoryId);
      if (cached && cached.length > 0) {
        return;
      }

      set((state) => ({
        loading: { ...state.loading, series: true },
        error: null,
      }));

      try {
        const { data, error } = await supabase
          .from('product_series')
          .select('*')
          .eq('product_category_id', categoryId)
          .order('name', { ascending: true });

        if (error) throw error;

        const newMap = new Map(get().series);
        newMap.set(categoryId, data || []);
        set({ series: newMap });
      } catch (error: any) {
        set({ error: error.message });
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
      if (cached && cached.length > 0) {
        return;
      }

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
      } catch (error: any) {
        set({ error: error.message });
        console.error('Error fetching models:', error);
      } finally {
        set((state) => ({
          loading: { ...state.loading, models: false },
        }));
      }
    },

    // Fetch models directly by category (for categories without series)
    fetchModelsByCategory: async (categoryId: string) => {
      const cacheKey = `cat_${categoryId}`;
      const cached = get().models.get(cacheKey);
      if (cached && cached.length > 0) {
        return;
      }

      set((state) => ({
        loading: { ...state.loading, models: true },
        error: null,
      }));

      try {
        const { data, error } = await supabase
          .from('product_models')
          .select('*')
          .eq('product_category_id', categoryId)
          .order('name', { ascending: true });

        if (error) throw error;

        const newMap = new Map(get().models);
        newMap.set(cacheKey, data || []);
        set({ models: newMap });
      } catch (error: any) {
        set({ error: error.message });
        console.error('Error fetching models by category:', error);
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
      } catch (error: any) {
        set({ error: error.message });
        console.error('Error fetching model details:', error);
        return null;
      }
    },

    // Selection actions
    selectType: (type) => {
      set({
        selectedType: type,
        selectedManufacturer: null,
        selectedCategory: null,
        selectedSeries: null,
        selectedModel: null,
      });

      if (type) {
        get().fetchManufacturers(type.id);
      }
    },

    selectManufacturer: (manufacturer) => {
      set({
        selectedManufacturer: manufacturer,
        selectedCategory: null,
        selectedSeries: null,
        selectedModel: null,
      });

      if (manufacturer) {
        get().fetchCategories(manufacturer.id);
      }
    },

    selectCategory: (category) => {
      set({
        selectedCategory: category,
        selectedSeries: null,
        selectedModel: null,
      });

      if (category) {
        get().fetchSeries(category.id);
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
            selectedCategory: null,
            selectedSeries: null,
            selectedModel: null,
          });
          break;
        case 'category':
          set({
            selectedCategory: null,
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
        selectedType: null,
        selectedManufacturer: null,
        selectedCategory: null,
        selectedSeries: null,
        selectedModel: null,
        error: null,
      });
    },

    setError: (error) => set({ error }),
  }))
);
