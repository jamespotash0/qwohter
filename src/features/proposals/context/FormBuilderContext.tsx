/**
 * Form Builder Context
 *
 * Shared state for all tabs in the ProposalEditor (builder mode).
 * This allows tab data to be collected and saved/loaded properly.
 *
 * Supports both:
 * - config: Form structure (which tabs/sections/fields are enabled)
 * - defaults: Default values for tabs (pricing, lead times, etc.)
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  type FormConfiguration,
  type FormMetadata,
  createDefaultFormConfiguration,
} from '@/lib/types/forms';

// ============ Pricing Tab Data ============
export interface PricingLineItem {
  id: string;
  name: string;
  quantity: number;
  sellRule: string;
  unitCost: number;
  markupPercent: number;
  /** Markup type: 'percent' or 'dollar' (default: percent) */
  markupType?: 'percent' | 'dollar';
  isTaxable?: boolean;
  /** Source product ID - links to Product.id for cascade delete */
  sourceProductId?: string;
  /** Discount value (applied after markup, before tax) */
  discountValue?: number;
  /** Discount type: 'percent' or 'dollar' */
  discountType?: 'percent' | 'dollar';
  // Calculated fields (stored for reference)
  /** Calculated sell price for this line item */
  sellPrice?: number;
  /** Calculated tax amount for this line item */
  taxAmount?: number;
}

export interface PricingSection {
  id: string;
  name: string;
  type: string;
  collapsed: boolean;
  lineItems: PricingLineItem[];
}

/** Calculated pricing summary (stored for reference/reporting) */
export interface PricingSummary {
  /** Total cost of goods (before markup) */
  totalCost: number;
  /** Subtotal (after markup, before tax) - this is total_value */
  subtotal: number;
  /** Gross profit (subtotal - totalCost) */
  grossProfit: number;
  /** Gross profit as percentage of subtotal */
  grossProfitPercent: number;
  /** Total tax amount */
  totalTax: number;
  /** Grand total (subtotal + tax) */
  grandTotal: number;
}

export interface PricingData {
  sections: PricingSection[];
  salesTaxPercent?: number;
  taxState?: string; // US state code for auto tax rate lookup
  /** Calculated summary totals */
  summary?: PricingSummary;
}

// ============ Lead Times Tab Data ============
export interface LeadTimePhase {
  id: string;
  phaseName: string;
  duration: string;
  durationUnit?: string;
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
  /** User-editable alias for variable reference (e.g., "wallA", "ceilingB") */
  alias?: string;
  /** Unit cost for pricing */
  unitCost?: number;
  /** Discount percentage (0-100) */
  discountPercent?: number;
}

export interface ProductsData {
  items: Product[];
}

// ============ Presentation Tab Data ============
// Page settings for presentation layout
export interface PresentationPageSettings {
  pageSize: 'letter' | 'a4' | 'legal';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

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
  pageSettings?: PresentationPageSettings;
}

// ============ Complete Form Structure ============
export interface FormBuilderData {
  pricing: PricingData;
  leadTimes: LeadTimesData;
  miscellaneous: MiscellaneousData;
  products: ProductsData;
  presentation: PresentationData;
}

// Default empty state for builder mode
const DEFAULT_BUILDER_DATA: FormBuilderData = {
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
    pageSettings: {
      pageSize: 'letter',
      orientation: 'portrait',
      margins: { top: 1, bottom: 1, left: 1, right: 1 },
    },
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
      pricing: (defaults.pricing as PricingData) || DEFAULT_BUILDER_DATA.pricing,
      leadTimes: (defaults.leadTimes as LeadTimesData) || DEFAULT_BUILDER_DATA.leadTimes,
      miscellaneous: (defaults.miscellaneous as MiscellaneousData) || DEFAULT_BUILDER_DATA.miscellaneous,
      products: (defaults.products as ProductsData) || DEFAULT_BUILDER_DATA.products,
      presentation: (defaults.presentation as PresentationData) || DEFAULT_BUILDER_DATA.presentation,
    };
  }

  // Legacy format
  return {
    pricing: (parsed.pricing as PricingData) || DEFAULT_BUILDER_DATA.pricing,
    leadTimes: (parsed.leadTimes as LeadTimesData) || DEFAULT_BUILDER_DATA.leadTimes,
    miscellaneous: (parsed.miscellaneous as MiscellaneousData) || DEFAULT_BUILDER_DATA.miscellaneous,
    products: (parsed.products as ProductsData) || DEFAULT_BUILDER_DATA.products,
    presentation: (parsed.presentation as PresentationData) || DEFAULT_BUILDER_DATA.presentation,
  };
}

export { DEFAULT_BUILDER_DATA };
