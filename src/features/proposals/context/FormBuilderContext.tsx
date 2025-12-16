/**
 * Form Builder Context
 *
 * Shared state for all tabs in the ProposalEditor (builder mode).
 * This allows tab data to be collected and saved/loaded properly.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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

  // Load/reset
  loadData: (data: FormBuilderData) => void;
  resetData: () => void;
  markClean: () => void;
}

const FormBuilderContext = createContext<FormBuilderContextType | null>(null);

// ============ Provider ============
interface FormBuilderProviderProps {
  children: ReactNode;
  initialData?: FormBuilderData;
}

export function FormBuilderProvider({ children, initialData }: FormBuilderProviderProps) {
  const [data, setData] = useState<FormBuilderData>(initialData || DEFAULT_BUILDER_DATA);
  const [isDirty, setIsDirty] = useState(false);

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

  const loadData = useCallback((newData: FormBuilderData) => {
    setData(newData);
    setIsDirty(false);
  }, []);

  const resetData = useCallback(() => {
    setData(DEFAULT_BUILDER_DATA);
    setIsDirty(false);
  }, []);

  const markClean = useCallback(() => {
    setIsDirty(false);
  }, []);

  return (
    <FormBuilderContext.Provider
      value={{
        data,
        isDirty,
        setTermsData,
        setPricingData,
        setLeadTimesData,
        setMiscellaneousData,
        setProductsData,
        setPresentationData,
        loadData,
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
 * Convert FormBuilderData to the tabs JSONB structure for saving
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
 * Parse tabs JSONB data into FormBuilderData
 */
export function parseFormBuilderData(tabsData: unknown): FormBuilderData {
  if (!tabsData || typeof tabsData !== 'object') {
    return DEFAULT_BUILDER_DATA;
  }

  const parsed = tabsData as Record<string, unknown>;

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
