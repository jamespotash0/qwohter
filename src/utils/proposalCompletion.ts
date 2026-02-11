/**
 * Proposal Completion Utility
 *
 * Determines whether a proposal is "complete" based on filled fields.
 * Used to automatically set `is_complete` when saving proposals.
 *
 * Completion Criteria:
 * - Info Tab: All fields except notes, either jobLocation OR jobLocationName (one is enough)
 * - Products: At least 1 product
 * - Pricing: Has pricing (subtotal > 0)
 * - Lead Times: Has at least 1 phase
 * - Miscellaneous: NOT required
 * - Documents: NOT required
 * - Presentation: Has template/document connected (google_doc_id) OR generated
 */

import type { InfoTabData } from '@/features/proposals/components/tabs/InfoTab';

// Type for the form data structure
interface ProposalFormData {
  info?: Partial<InfoTabData>;
  products?: {
    items?: Array<unknown>;
  };
  pricing?: {
    summary?: {
      subtotal?: number;
    };
  };
  leadTimes?: {
    sections?: Array<{
      phases?: Array<unknown>;
    }>;
  };
}

// Type for the proposal object passed to completion check
interface ProposalForCompletion {
  google_doc_id?: string | null;
  form_data?: ProposalFormData;
}

// Result type for detailed completion status
export interface CompletionResult {
  isComplete: boolean;
  sections: {
    info: { complete: boolean; missing: string[] };
    products: { complete: boolean; count: number };
    pricing: { complete: boolean; subtotal: number };
    leadTimes: { complete: boolean; phaseCount: number };
    presentation: { complete: boolean; hasDocument: boolean };
  };
}

/**
 * Check if Info Tab fields are complete
 * All fields required except:
 * - jobNotes (optional)
 * - Either jobLocation OR jobLocationName (one is enough)
 */
function checkInfoComplete(info: Partial<InfoTabData> | undefined): { complete: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!info) {
    return {
      complete: false,
      missing: ['All info fields are missing'],
    };
  }

  // Required text fields
  const requiredFields: { key: keyof InfoTabData; label: string }[] = [
    { key: 'projectName', label: 'Project Name' },
    { key: 'proposalDate', label: 'Proposal Date' },
    { key: 'validUntil', label: 'Valid Until' },
    { key: 'contactName', label: 'Contact Name' },
    { key: 'contactEmail', label: 'Contact Email' },
    { key: 'proposalSource', label: 'Proposal Source' },
    { key: 'scope', label: 'Scope' },
    { key: 'projectType', label: 'Project Type' },
    { key: 'clientName', label: 'Client Name' },
    { key: 'clientCompany', label: 'Client Company' },
    { key: 'clientEmail', label: 'Client Email' },
    { key: 'clientPhone', label: 'Client Phone' },
    { key: 'clientAddress', label: 'Client Address' },
    { key: 'clientContactType', label: 'Contact Type' },
    { key: 'jobFloor', label: 'Floor' },
    { key: 'locationType', label: 'Location Type' },
    { key: 'estimatedDueDate', label: 'Estimated Due Date' },
  ];

  for (const field of requiredFields) {
    const value = info[field.key];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missing.push(field.label);
    }
  }

  // Either jobLocation OR jobLocationName is required (one is enough)
  const hasJobLocation = info.jobLocation && info.jobLocation.trim() !== '';
  const hasJobLocationName = info.jobLocationName && info.jobLocationName.trim() !== '';
  if (!hasJobLocation && !hasJobLocationName) {
    missing.push('Job Location or Job Location Name');
  }

  return {
    complete: missing.length === 0,
    missing,
  };
}

/**
 * Check if Products section is complete
 * At least 1 product required
 */
function checkProductsComplete(products: ProposalFormData['products']): { complete: boolean; count: number } {
  const items = products?.items ?? [];
  const count = items.length;
  return {
    complete: count > 0,
    count,
  };
}

/**
 * Check if Pricing section is complete
 * Subtotal must be > 0
 */
function checkPricingComplete(pricing: ProposalFormData['pricing']): { complete: boolean; subtotal: number } {
  const subtotal = pricing?.summary?.subtotal ?? 0;
  return {
    complete: subtotal > 0,
    subtotal,
  };
}

/**
 * Check if Lead Times section is complete
 * At least 1 phase required across all sections
 */
function checkLeadTimesComplete(leadTimes: ProposalFormData['leadTimes']): { complete: boolean; phaseCount: number } {
  const sections = leadTimes?.sections ?? [];
  let phaseCount = 0;

  for (const section of sections) {
    phaseCount += section.phases?.length ?? 0;
  }

  return {
    complete: phaseCount > 0,
    phaseCount,
  };
}

/**
 * Check if Presentation section is complete
 * Must have google_doc_id set (document connected or generated)
 */
function checkPresentationComplete(googleDocId: string | null | undefined): { complete: boolean; hasDocument: boolean } {
  const hasDocument = !!googleDocId && googleDocId.trim() !== '';
  return {
    complete: hasDocument,
    hasDocument,
  };
}

/**
 * Calculate whether a proposal is complete based on all required sections
 *
 * @param proposal - The proposal object containing form_data and google_doc_id
 * @returns CompletionResult with overall status and per-section details
 */
export function calculateProposalCompletion(proposal: ProposalForCompletion): CompletionResult {
  const formData = proposal.form_data ?? {};

  const info = checkInfoComplete(formData.info);
  const products = checkProductsComplete(formData.products);
  const pricing = checkPricingComplete(formData.pricing);
  const leadTimes = checkLeadTimesComplete(formData.leadTimes);
  const presentation = checkPresentationComplete(proposal.google_doc_id);

  const isComplete =
    info.complete &&
    products.complete &&
    pricing.complete &&
    leadTimes.complete &&
    presentation.complete;

  return {
    isComplete,
    sections: {
      info,
      products,
      pricing,
      leadTimes,
      presentation,
    },
  };
}

/**
 * Simple boolean check for proposal completion
 *
 * @param proposal - The proposal object
 * @returns true if proposal is complete, false otherwise
 */
export function isProposalComplete(proposal: ProposalForCompletion): boolean {
  return calculateProposalCompletion(proposal).isComplete;
}

/**
 * Get a human-readable summary of what's missing for completion
 *
 * @param proposal - The proposal object
 * @returns Array of missing items descriptions
 */
export function getMissingForCompletion(proposal: ProposalForCompletion): string[] {
  const result = calculateProposalCompletion(proposal);
  const missing: string[] = [];

  if (!result.sections.info.complete) {
    const infoMissing = result.sections.info.missing;
    if (infoMissing.length <= 3) {
      missing.push(`Info: ${infoMissing.join(', ')}`);
    } else {
      missing.push(`Info: ${infoMissing.length} fields missing`);
    }
  }

  if (!result.sections.products.complete) {
    missing.push('Products: At least 1 product required');
  }

  if (!result.sections.pricing.complete) {
    missing.push('Pricing: Subtotal must be greater than $0');
  }

  if (!result.sections.leadTimes.complete) {
    missing.push('Lead Times: At least 1 phase required');
  }

  if (!result.sections.presentation.complete) {
    missing.push('Presentation: Document not generated');
  }

  return missing;
}
