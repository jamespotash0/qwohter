/**
 * Types for bulk proposal import feature
 * Supports PDF, DOCX, CSV, and TXT file imports
 */

// Supported file types for import
export type ImportFileType = 'pdf' | 'docx' | 'csv' | 'txt';

export const SUPPORTED_FILE_TYPES: ImportFileType[] = ['pdf', 'docx', 'csv', 'txt'];

export const FILE_TYPE_MIME_MAP: Record<ImportFileType, string[]> = {
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  csv: ['text/csv', 'application/csv'],
  txt: ['text/plain'],
};

export const ACCEPTED_FILE_EXTENSIONS = '.pdf,.docx,.csv,.txt';

// Text extraction result
export interface TextExtractionResult {
  text: string;
  method: 'direct' | 'ocr';
  pageCount?: number;
  confidence: number; // 0-1 confidence in extraction quality
  // For PDFs sent to OpenAI Vision
  base64Data?: string;
  mimeType?: string;
}

// Client/contact information extracted from proposal
export interface ExtractedClient {
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

// Job/project information extracted from proposal
export interface ExtractedJob {
  proposalNumber: string | null;
  date: string | null;
  location: string | null;
}

// Line item from proposal
export interface ExtractedLineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
}

// Pricing information extracted from proposal
export interface ExtractedPricing {
  total: number | null;
  subtotal: number | null;
  materials: number | null;
  labor: number | null;
  tax: number | null;
  lineItems: ExtractedLineItem[];
}

// Project/job specifications extracted from proposal (generic for any project type)
export interface ExtractedSpecifications {
  // Common measurements
  dimensions: string | null;      // e.g., "10ft x 25ft", "500 sq ft"
  quantity: string | null;        // e.g., "15 units", "3 rooms"

  // Material/product info
  materials: string | null;       // e.g., "Oak hardwood", "Vinyl wallpaper"
  productType: string | null;     // e.g., "Demountable wall", "Office furniture"

  // Additional specs (flexible key-value pairs for any industry)
  additionalSpecs: Record<string, string>;
}

// Product dimensions
export interface ExtractedProductDimensions {
  height: string | null;
  width: string | null;
  length: string | null;
  depth: string | null;
  area: string | null;
  weight: string | null;
}

// Generic product specification - supports any product type with flexible nested specs
export interface ExtractedProductSpec {
  // Core identifiers
  name: string;                           // Product name/identifier (e.g., "Wall A", "Conference Table 1")
  productType: string | null;             // Type of product (e.g., "Operable Wall", "Office Chair")
  manufacturer: string | null;            // Manufacturer/brand name
  model: string | null;                   // Model number
  series: string | null;                  // Series/line
  sku: string | null;                     // SKU or part number

  // Quantities & Pricing
  quantity: string | null;
  unitPrice: number | null;
  totalPrice: number | null;

  // Dimensions (flexible - can be used for any product)
  dimensions: ExtractedProductDimensions | null;

  // All other specifications as flexible key-value pairs
  specifications: Record<string, any>;

  // For complex nested specifications (e.g., wall seals, door configs)
  components: Record<string, any> | null;

  // Notes specific to this product
  notes: string | null;
}

// Products container
export interface ExtractedProducts {
  items: ExtractedProductSpec[];
}

// Complete extracted proposal data from AI
export interface ExtractedProposalData {
  client: ExtractedClient;
  job: ExtractedJob;
  pricing: ExtractedPricing;
  specifications: ExtractedSpecifications;  // Legacy/summary specs
  products: ExtractedProducts;              // Detailed product breakdown
  notes: string | null;
  confidence: number; // 0-1 overall confidence in extraction
  rawText?: string; // Original extracted text (for debugging)
}

// Default empty extracted data
export const EMPTY_EXTRACTED_DATA: ExtractedProposalData = {
  client: {
    name: null,
    company: null,
    email: null,
    phone: null,
    address: null,
  },
  job: {
    proposalNumber: null,
    date: null,
    location: null,
  },
  pricing: {
    total: null,
    subtotal: null,
    materials: null,
    labor: null,
    tax: null,
    lineItems: [],
  },
  specifications: {
    dimensions: null,
    quantity: null,
    materials: null,
    productType: null,
    additionalSpecs: {},
  },
  products: {
    items: [],
  },
  notes: null,
  confidence: 0,
};

// Wizard step for import dialog
export type ImportWizardStep = 'upload' | 'processing' | 'review';

// Proposal status options
export type ImportProposalStatus = 'Draft' | 'Submitted' | 'Won' | 'Rejected';

// Complete import state
export interface ImportProposalState {
  step: ImportWizardStep;
  file: File | null;
  fileType: ImportFileType | null;
  extractionResult: TextExtractionResult | null;
  extractedData: ExtractedProposalData;

  // Manual fields (user must fill these)
  manual: {
    projectName: string;
    status: ImportProposalStatus;
    proposalNumber: string;
    proposalDate: string;
  };

  // Processing state
  isExtracting: boolean;
  isParsing: boolean;
  error: string | null;
}

// Initial import state
export const INITIAL_IMPORT_STATE: ImportProposalState = {
  step: 'upload',
  file: null,
  fileType: null,
  extractionResult: null,
  extractedData: EMPTY_EXTRACTED_DATA,
  manual: {
    projectName: '',
    status: 'Draft',
    proposalNumber: '',
    proposalDate: new Date().toISOString().split('T')[0] || '',
  },
  isExtracting: false,
  isParsing: false,
  error: null,
};

// Parse proposal API request
export interface ParseProposalRequest {
  documentText: string;
  fileName?: string;
  fileType?: ImportFileType;
}

// Parse proposal API response
export interface ParseProposalResponse {
  success: boolean;
  data?: ExtractedProposalData;
  error?: string;
}
