/**
 * Form Builder Context
 *
 * Shared state for all tabs in the ProposalEditor (builder mode).
 * This allows tab data to be collected and saved/loaded properly.
 *
 * Supports both:
 * - config: Form structure (which tabs/sections/fields are enabled)
 * - defaults: Default values for tabs (terms, pricing, etc.)
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  type FormConfiguration,
  type FormMetadata,
  createDefaultFormConfiguration,
} from '@/lib/types/forms';

// ============ Terms Tab Data ============
export interface PaymentMilestone {
  id: string;
  percentage: number;
  trigger: string;
}

export interface WarrantyItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface Exclusion {
  id: string;
  label: string;
  checked: boolean;
}

export interface TermsData {
  paymentMilestones: PaymentMilestone[];
  warranties: WarrantyItem[];
  exclusions: Exclusion[];
}

// ============ Pricing Tab Data ============
export interface PricingLineItem {
  id: string;
  name: string;
  quantity: number;
  sellRule: string;
  unitCost: number;
  markupPercent: number;
}

export interface PricingSection {
  id: string;
  name: string;
  type: string;
  collapsed: boolean;
  lineItems: PricingLineItem[];
}

export interface PricingData {
  sections: PricingSection[];
}

// ============ Lead Times Tab Data ============
export interface LeadTimePhase {
  id: string;
  phaseName: string;
  duration: string;
  estCompletionDate: string;
}

export interface LeadTimeSection {
  id: string;
  name: string;
  collapsed: boolean;
  phases: LeadTimePhase[];
}

export interface LeadTimesData {
  sections: LeadTimeSection[];
}

// ============ Miscellaneous Tab Data ============
export interface MiscField {
  id: string;
  label: string;
  value: string;
}

export interface MiscellaneousData {
  fields: MiscField[];
  notes: string;
}

// ============ Products Tab Data ============
export interface ProductRawData {
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
  specifications?: Record<string, unknown>;
}

export interface Product {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  description?: string;
  rawData?: ProductRawData;
}

export interface ProductsData {
  items: Product[];
}

// ============ Presentation Tab Data ============
// Slate/Plate.js node structure for rich text content
export interface PresentationTextNode {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface PresentationVariableNode {
  type: 'variable';
  variableKey: string;
  variableLabel: string;
  children: [{ text: '' }];
}

export interface PresentationElement {
  type: 'paragraph' | 'heading-one' | 'heading-two' | 'heading-three' | 'bulleted-list' | 'numbered-list' | 'list-item' | 'table' | 'table-row' | 'table-cell' | 'variable';
  children: (PresentationTextNode | PresentationVariableNode | PresentationElement)[];
  align?: 'left' | 'center' | 'right';
}

export interface PresentationSection {
  id: string;
  title: string;
  content: PresentationElement[];
  collapsed?: boolean;
}

export interface PresentationData {
  sections: PresentationSection[];
}

// ============ Complete Form Structure ============
export interface FormBuilderData {
  terms: TermsData;
  pricing: PricingData;
  leadTimes: LeadTimesData;
  miscellaneous: MiscellaneousData;
  products: ProductsData;
  presentation: PresentationData;
}

// Default empty state for builder mode
const DEFAULT_BUILDER_DATA: FormBuilderData = {
  terms: {
    paymentMilestones: [],
    warranties: [],
    exclusions: [],
  },
  pricing: {
    sections: [],
  },
  leadTimes: {
    sections: [],
  },
  miscellaneous: {
    fields: [],
    notes: '',
  },
  products: {
    items: [],
  },
  presentation: {
    sections: [],
  },
};

// ============ Context Definition ============
interface FormBuilderContextType {
  // Form configuration (structure - which tabs/fields are enabled)
  config: FormConfiguration;
  setConfig: (config: FormConfiguration) => void;
  updateConfig: (updates: Partial<FormConfiguration>) => void;

  // Form defaults (values for tabs)
  data: FormBuilderData;
  isDirty: boolean;

  // Terms
  setTermsData: (data: TermsData) => void;

  // Pricing
  setPricingData: (data: PricingData) => void;

  // Lead Times
  setLeadTimesData: (data: LeadTimesData) => void;

  // Miscellaneous
  setMiscellaneousData: (data: MiscellaneousData) => void;

  // Products
  setProductsData: (data: ProductsData) => void;

  // Presentation
  setPresentationData: (data: PresentationData) => void;

  // Load/reset - now accepts FormMetadata (new format) or FormBuilderData (legacy)
  loadData: (data: FormBuilderData) => void;
  loadMetadata: (metadata: FormMetadata | Record<string, unknown> | null) => void;
  resetData: () => void;
  markClean: () => void;
}

const FormBuilderContext = createContext<FormBuilderContextType | null>(null);

// ============ Provider ============
interface FormBuilderProviderProps {
  children: ReactNode;
  initialData?: FormBuilderData;
  initialConfig?: FormConfiguration;
}

export function FormBuilderProvider({ children, initialData, initialConfig }: FormBuilderProviderProps) {
  // Form configuration (structure)
  const [config, setConfigState] = useState<FormConfiguration>(
    initialConfig || createDefaultFormConfiguration()
  );

  // Form data (values/defaults)
  const [data, setData] = useState<FormBuilderData>(initialData || DEFAULT_BUILDER_DATA);
  const [isDirty, setIsDirty] = useState(false);

  // Config setters
  const setConfig = useCallback((newConfig: FormConfiguration) => {
    setConfigState(newConfig);
    setIsDirty(true);
  }, []);

  const updateConfig = useCallback((updates: Partial<FormConfiguration>) => {
    setConfigState(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  // Data setters
  const setTermsData = useCallback((termsData: TermsData) => {
    setData(prev => ({ ...prev, terms: termsData }));
    setIsDirty(true);
  }, []);

  const setPricingData = useCallback((pricingData: PricingData) => {
    setData(prev => ({ ...prev, pricing: pricingData }));
    setIsDirty(true);
  }, []);

  const setLeadTimesData = useCallback((leadTimesData: LeadTimesData) => {
    setData(prev => ({ ...prev, leadTimes: leadTimesData }));
    setIsDirty(true);
  }, []);

  const setMiscellaneousData = useCallback((miscData: MiscellaneousData) => {
    setData(prev => ({ ...prev, miscellaneous: miscData }));
    setIsDirty(true);
  }, []);

  const setProductsData = useCallback((productsData: ProductsData) => {
    setData(prev => ({ ...prev, products: productsData }));
    setIsDirty(true);
  }, []);

  const setPresentationData = useCallback((presentationData: PresentationData) => {
    setData(prev => ({ ...prev, presentation: presentationData }));
    setIsDirty(true);
  }, []);

  // Legacy: load just the data portion
  const loadData = useCallback((newData: FormBuilderData) => {
    setData(newData);
    setIsDirty(false);
  }, []);

  // New: load full metadata (config + defaults) with backward compatibility
  const loadMetadata = useCallback((metadata: FormMetadata | Record<string, unknown> | null) => {
    if (!metadata) {
      setConfigState(createDefaultFormConfiguration());
      setData(DEFAULT_BUILDER_DATA);
      setIsDirty(false);
      return;
    }

    // Check if it's the new FormMetadata format (has 'config' key)
    if ('config' in metadata && metadata.config) {
      // New format
      setConfigState(metadata.config as FormConfiguration);
      if ('defaults' in metadata && metadata.defaults) {
        const defaults = metadata.defaults as Record<string, unknown>;
        setData({
          terms: (defaults.terms as TermsData) || DEFAULT_BUILDER_DATA.terms,
          pricing: (defaults.pricing as PricingData) || DEFAULT_BUILDER_DATA.pricing,
          leadTimes: (defaults.leadTimes as LeadTimesData) || DEFAULT_BUILDER_DATA.leadTimes,
          miscellaneous: (defaults.miscellaneous as MiscellaneousData) || DEFAULT_BUILDER_DATA.miscellaneous,
          products: (defaults.products as ProductsData) || DEFAULT_BUILDER_DATA.products,
          presentation: (defaults.presentation as PresentationData) || DEFAULT_BUILDER_DATA.presentation,
        });
      } else {
        setData(DEFAULT_BUILDER_DATA);
      }
    } else {
      // Legacy format - treat entire metadata as data, use default config
      setConfigState(createDefaultFormConfiguration());
      const legacyData = metadata as Record<string, unknown>;
      setData({
        terms: (legacyData.terms as TermsData) || DEFAULT_BUILDER_DATA.terms,
        pricing: (legacyData.pricing as PricingData) || DEFAULT_BUILDER_DATA.pricing,
        leadTimes: (legacyData.leadTimes as LeadTimesData) || DEFAULT_BUILDER_DATA.leadTimes,
        miscellaneous: (legacyData.miscellaneous as MiscellaneousData) || DEFAULT_BUILDER_DATA.miscellaneous,
        products: (legacyData.products as ProductsData) || DEFAULT_BUILDER_DATA.products,
        presentation: (legacyData.presentation as PresentationData) || DEFAULT_BUILDER_DATA.presentation,
      });
    }
    setIsDirty(false);
  }, []);

  const resetData = useCallback(() => {
    setConfigState(createDefaultFormConfiguration());
    setData(DEFAULT_BUILDER_DATA);
    setIsDirty(false);
  }, []);

  const markClean = useCallback(() => {
    setIsDirty(false);
  }, []);

  return (
    <FormBuilderContext.Provider
      value={{
        config,
        setConfig,
        updateConfig,
        data,
        isDirty,
        setTermsData,
        setPricingData,
        setLeadTimesData,
        setMiscellaneousData,
        setProductsData,
        setPresentationData,
        loadData,
        loadMetadata,
        resetData,
        markClean,
      }}
    >
      {children}
    </FormBuilderContext.Provider>
  );
}

// ============ Hook ============
export function useFormBuilder() {
  const context = useContext(FormBuilderContext);
  if (!context) {
    throw new Error('useFormBuilder must be used within a FormBuilderProvider');
  }
  return context;
}

// ============ Serialization Helpers ============

/**
 * Serialize form metadata to the new FormMetadata format for saving
 * This is the primary serialization function for builder mode
 */
export function serializeFormMetadata(
  config: FormConfiguration,
  data: FormBuilderData
): FormMetadata {
  return {
    config,
    defaults: {
      terms: data.terms,
      pricing: data.pricing,
      leadTimes: data.leadTimes,
      miscellaneous: data.miscellaneous,
      products: data.products,
      presentation: data.presentation,
    },
  };
}

/**
 * @deprecated Use serializeFormMetadata instead
 * Legacy: Convert FormBuilderData to the old tabs JSONB structure
 * Kept for backward compatibility with proposal form_data
 */
export function serializeFormBuilderData(data: FormBuilderData): Record<string, unknown> {
  return {
    terms: data.terms,
    pricing: data.pricing,
    leadTimes: data.leadTimes,
    miscellaneous: data.miscellaneous,
    products: data.products,
    presentation: data.presentation,
  };
}

/**
 * Parse metadata from database - handles both new and legacy formats
 */
export function parseFormMetadata(metadata: unknown): {
  config: FormConfiguration;
  data: FormBuilderData;
} {
  if (!metadata || typeof metadata !== 'object') {
    return {
      config: createDefaultFormConfiguration(),
      data: DEFAULT_BUILDER_DATA,
    };
  }

  const parsed = metadata as Record<string, unknown>;

  // Check if it's the new FormMetadata format (has 'config' key)
  if ('config' in parsed && parsed.config) {
    const defaults = (parsed.defaults as Record<string, unknown>) || {};
    return {
      config: parsed.config as FormConfiguration,
      data: {
        terms: (defaults.terms as TermsData) || DEFAULT_BUILDER_DATA.terms,
        pricing: (defaults.pricing as PricingData) || DEFAULT_BUILDER_DATA.pricing,
        leadTimes: (defaults.leadTimes as LeadTimesData) || DEFAULT_BUILDER_DATA.leadTimes,
        miscellaneous: (defaults.miscellaneous as MiscellaneousData) || DEFAULT_BUILDER_DATA.miscellaneous,
        products: (defaults.products as ProductsData) || DEFAULT_BUILDER_DATA.products,
        presentation: (defaults.presentation as PresentationData) || DEFAULT_BUILDER_DATA.presentation,
      },
    };
  }

  // Legacy format - treat entire metadata as data
  return {
    config: createDefaultFormConfiguration(),
    data: {
      terms: (parsed.terms as TermsData) || DEFAULT_BUILDER_DATA.terms,
      pricing: (parsed.pricing as PricingData) || DEFAULT_BUILDER_DATA.pricing,
      leadTimes: (parsed.leadTimes as LeadTimesData) || DEFAULT_BUILDER_DATA.leadTimes,
      miscellaneous: (parsed.miscellaneous as MiscellaneousData) || DEFAULT_BUILDER_DATA.miscellaneous,
      products: (parsed.products as ProductsData) || DEFAULT_BUILDER_DATA.products,
      presentation: (parsed.presentation as PresentationData) || DEFAULT_BUILDER_DATA.presentation,
    },
  };
}

/**
 * @deprecated Use parseFormMetadata instead
 * Legacy: Parse tabs JSONB data into FormBuilderData
 */
export function parseFormBuilderData(tabsData: unknown): FormBuilderData {
  if (!tabsData || typeof tabsData !== 'object') {
    return DEFAULT_BUILDER_DATA;
  }

  const parsed = tabsData as Record<string, unknown>;

  // Handle new format - extract defaults
  if ('defaults' in parsed && parsed.defaults) {
    const defaults = parsed.defaults as Record<string, unknown>;
    return {
      terms: (defaults.terms as TermsData) || DEFAULT_BUILDER_DATA.terms,
      pricing: (defaults.pricing as PricingData) || DEFAULT_BUILDER_DATA.pricing,
      leadTimes: (defaults.leadTimes as LeadTimesData) || DEFAULT_BUILDER_DATA.leadTimes,
      miscellaneous: (defaults.miscellaneous as MiscellaneousData) || DEFAULT_BUILDER_DATA.miscellaneous,
      products: (defaults.products as ProductsData) || DEFAULT_BUILDER_DATA.products,
      presentation: (defaults.presentation as PresentationData) || DEFAULT_BUILDER_DATA.presentation,
    };
  }

  // Legacy format
  return {
    terms: (parsed.terms as TermsData) || DEFAULT_BUILDER_DATA.terms,
    pricing: (parsed.pricing as PricingData) || DEFAULT_BUILDER_DATA.pricing,
    leadTimes: (parsed.leadTimes as LeadTimesData) || DEFAULT_BUILDER_DATA.leadTimes,
    miscellaneous: (parsed.miscellaneous as MiscellaneousData) || DEFAULT_BUILDER_DATA.miscellaneous,
    products: (parsed.products as ProductsData) || DEFAULT_BUILDER_DATA.products,
    presentation: (parsed.presentation as PresentationData) || DEFAULT_BUILDER_DATA.presentation,
  };
}

export { DEFAULT_BUILDER_DATA };
