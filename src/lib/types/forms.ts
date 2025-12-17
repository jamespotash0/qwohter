/**
 * Forms Type Definitions
 *
 * Canonical type definitions for the forms system used throughout the codebase.
 *
 * Note: The form structure is FIXED (8 tabs with predefined sections).
 * Customization happens through DEFAULT VALUES stored in FormMetadata.defaults.
 * See FormBuilderContext.tsx for the data types (TermsData, PricingData, etc.)
 */

// Document type is now a string to support custom document types per organization
export type DocumentType = string;

// Presentation template structure for document generation
export interface PresentationTemplate {
  version: number;
  layout: string;
  sections: PresentationSection[];
}

export interface PresentationSection {
  id: string;
  type: 'header' | 'content' | 'table' | 'footer' | 'signature';
  content?: string; // HTML/markdown with {{placeholder}} syntax
  order: number;
  settings?: Record<string, any>;
}

// ============ Form Configuration Types (Simplified) ============
// The form has a FIXED structure (8 tabs with predefined sections).
// Customization is primarily through DEFAULT VALUES (what sections/items are pre-populated).
// Config is kept minimal for future extensibility.

/**
 * @deprecated Field-level config is not currently used - structure is fixed
 * Kept for potential future use
 */
export interface FieldConfig {
  enabled: boolean;
  required: boolean;
  label?: string;
  placeholder?: string;
  tooltip?: string;
}

/**
 * Info Tab Configuration - Structure is fixed, no config needed
 */
export interface InfoTabConfig {
  enabled: boolean;
}

/**
 * Products Tab Configuration
 */
export interface ProductsTabConfig {
  enabled: boolean;
  allowCustomProducts: boolean;  // Can users add products not in catalog?
}

/**
 * Pricing Tab Configuration
 */
export interface PricingTabConfig {
  enabled: boolean;
  showMarkup: boolean;          // Show markup percentage column
  showUnitCost: boolean;        // Show unit cost column
}

/**
 * Terms Tab Configuration
 */
export interface TermsTabConfig {
  enabled: boolean;
  sections: {
    paymentMilestones: { enabled: boolean };
    warranties: { enabled: boolean };
    exclusions: { enabled: boolean };
  };
}

/**
 * Lead Times Tab Configuration
 */
export interface LeadTimesTabConfig {
  enabled: boolean;
}

/**
 * Miscellaneous Tab Configuration
 */
export interface MiscTabConfig {
  enabled: boolean;
  showNotes: boolean;
}

/**
 * Documents Tab Configuration
 */
export interface DocumentsTabConfig {
  enabled: boolean;
  allowedFileTypes: string[];   // e.g., ['pdf', 'jpg', 'png', 'docx']
  maxFileSizeMb: number;
}

/**
 * Presentation Tab Configuration
 */
export interface PresentationTabConfig {
  enabled: boolean;
}

/**
 * Form Configuration (Simplified)
 *
 * The form structure is FIXED - all tabs exist with predefined sections.
 * Config controls tab-level options only.
 *
 * CUSTOMIZATION happens through DEFAULTS (FormBuilderData):
 * - Which payment milestones are pre-populated
 * - Which warranties are pre-set
 * - Which exclusions are checked by default
 * - Which pricing sections exist
 * - Which lead time phases are pre-created
 * - etc.
 */
export interface FormConfiguration {
  version: number;  // Schema version for migrations
  tabs: {
    info: InfoTabConfig;
    products: ProductsTabConfig;
    pricing: PricingTabConfig;
    terms: TermsTabConfig;
    leadTimes: LeadTimesTabConfig;
    miscellaneous: MiscTabConfig;
    documents: DocumentsTabConfig;
    presentation: PresentationTabConfig;
  };
}

/**
 * Form Metadata Structure
 * Contains both configuration (structure) and default data (values)
 */
export interface FormMetadata {
  config: FormConfiguration;  // What the form looks like
  defaults: {                 // Default values for tabs that have them
    terms?: {
      paymentMilestones?: Array<{ percentage: number; trigger: string }>;
      warranties?: Array<{ name: string; quantity: number; unit: string }>;
      exclusions?: Array<{ label: string; checked: boolean }>;
    };
    pricing?: {
      sections?: Array<{ name: string; type: string }>;
    };
    leadTimes?: {
      sections?: Array<{ name: string }>;
    };
    miscellaneous?: {
      fields?: Array<{ label: string }>;
      notes?: string;
    };
    products?: {
      items?: Array<{ name: string; quantity: number; unit: string; description?: string }>;
    };
    presentation?: {
      sections?: Array<{ title: string; content: unknown[] }>;
    };
  };
}

// ============ Default Configuration Factory ============

/**
 * @deprecated Field-level config is not currently used
 * Kept for potential future use
 */
export function createDefaultFieldConfig(overrides?: Partial<FieldConfig>): FieldConfig {
  return {
    enabled: true,
    required: false,
    ...overrides,
  };
}

/**
 * Creates a default form configuration with all tabs enabled
 * Use this as a starting point when creating new forms
 *
 * Note: The form STRUCTURE is fixed. Customization happens through
 * the defaults (FormBuilderData) which define what sections/items
 * are pre-populated when creating new proposals.
 */
export function createDefaultFormConfiguration(): FormConfiguration {
  return {
    version: 1,
    tabs: {
      info: {
        enabled: true,
      },
      products: {
        enabled: true,
        allowCustomProducts: true,
      },
      pricing: {
        enabled: true,
        showMarkup: true,
        showUnitCost: true,
      },
      terms: {
        enabled: true,
        sections: {
          paymentMilestones: { enabled: true },
          warranties: { enabled: true },
          exclusions: { enabled: true },
        },
      },
      leadTimes: {
        enabled: true,
      },
      miscellaneous: {
        enabled: true,
        showNotes: true,
      },
      documents: {
        enabled: true,
        allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'],
        maxFileSizeMb: 10,
      },
      presentation: {
        enabled: true,
      },
    },
  };
}

/**
 * Creates empty form metadata with default configuration
 */
export function createDefaultFormMetadata(): FormMetadata {
  return {
    config: createDefaultFormConfiguration(),
    defaults: {},
  };
}

// ============ Form Definition ============

// Form definition
export interface Form {
  id: string;
  organization_id: string | null; // Null for system templates
  name: string;
  description?: string;
  metadata?: FormMetadata | Record<string, unknown> | null; // Form configuration and defaults
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  is_default?: boolean; // Marks this as the default form for quote creation
  is_template?: boolean; // True for system templates
  copied_from_form_id?: string | null; // Template lineage tracking
  document_type?: DocumentType; // Type of document this form creates (Proposal, Invoice, Service_Request)
  presentation_template?: PresentationTemplate | null; // Template for document generation with {{placeholder}} syntax
}
