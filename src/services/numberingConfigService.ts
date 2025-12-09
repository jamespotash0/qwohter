/**
 * Numbering Configuration Service
 *
 * Manages custom document types and numbering settings per organization.
 * Supports flexible numbering formats with optional prefixes, separators, and padding.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types
// ============================================================================

/**
 * Flexible numbering format: [prefix][sep1][incrementingNumber][sep2][subSeries]
 * All parts are optional except incrementingNumber
 * Examples:
 *   - P-100       = prefix:"P", sep1:"-", lastNumber:99 (next is 100)
 *   - 1001        = prefix:"", sep1:"", lastNumber:1000
 *   - ES-1-014    = prefix:"ES", sep1:"-", lastNumber:0, sep2:"-", baseNumber:"14", padding:3
 */
export interface NumberingConfig {
  prefix: string;       // Optional: e.g., "P", "PROP", "Q", "EST", ""
  separator1: string;   // Separator after prefix (e.g., "-", "")
  lastNumber: number;   // Last used incrementing number (next will be lastNumber + 1)
  separator2: string;   // Separator before sub-series (e.g., "-", "")
  baseNumber: string;   // Sub-series/suffix (e.g., "14", "2024", "") - appears after incrementing number
  padding: number;      // Zero-padding for sub-series (0 = none, 3 = "014")
}

export interface OrganizationNumberingConfig {
  [documentType: string]: NumberingConfig;
}

/**
 * Custom document types for an organization
 */
export interface OrganizationDocumentTypes {
  types: string[];  // List of custom document type names
}

// Suggested document types for new organizations
export const SUGGESTED_DOCUMENT_TYPES = [
  'Proposal',
  'Quote',
  'Bid',
  'Estimate',
  'Service Request',
  'Invoice',
  'Work Order',
];

// Default numbering config (used when creating new document type)
export const DEFAULT_NUMBERING_CONFIG: NumberingConfig = {
  prefix: '',
  separator1: '',
  baseNumber: '',
  separator2: '',
  lastNumber: 1000,
  padding: 0,
};

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get numbering config for a specific document type
 */
export async function getNumberingConfig(
  organizationId: string,
  documentType: string
): Promise<NumberingConfig | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('numbering_config')
    .eq('id', organizationId)
    .single();

  if (error || !data) {
    console.error('Failed to fetch numbering config:', error);
    return null;
  }

  const config = data.numbering_config as OrganizationNumberingConfig | null;
  return config?.[documentType] || null;
}

/**
 * Get all numbering configs for an organization
 */
export async function getAllNumberingConfigs(
  organizationId: string
): Promise<OrganizationNumberingConfig | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('numbering_config')
    .eq('id', organizationId)
    .single();

  if (error || !data) {
    console.error('Failed to fetch numbering configs:', error);
    return null;
  }

  return data.numbering_config as OrganizationNumberingConfig | null;
}

/**
 * Set numbering config for a specific document type
 */
export async function setNumberingConfig(
  organizationId: string,
  documentType: string,
  config: NumberingConfig
): Promise<boolean> {
  // First get existing config
  const { data: existing } = await supabase
    .from('organizations')
    .select('numbering_config')
    .eq('id', organizationId)
    .single();

  const currentConfig = (existing?.numbering_config as OrganizationNumberingConfig) || {};

  // Merge with new config
  const updatedConfig = {
    ...currentConfig,
    [documentType]: config,
  };

  const { error } = await supabase
    .from('organizations')
    .update({ numbering_config: updatedConfig })
    .eq('id', organizationId);

  if (error) {
    console.error('Failed to update numbering config:', error);
    return false;
  }

  return true;
}

/**
 * Update the lastNumber for a document type (after creating a proposal)
 */
export async function incrementLastNumber(
  organizationId: string,
  documentType: string,
  newLastNumber: number
): Promise<boolean> {
  const config = await getNumberingConfig(organizationId, documentType);
  if (!config) return false;

  return setNumberingConfig(organizationId, documentType, {
    ...config,
    lastNumber: newLastNumber,
  });
}

/**
 * Generate a formatted proposal number based on config
 * Format: [prefix][sep1][number][sep2][paddedSubSeries]
 * Examples:
 *   - P-100      = prefix:"P", sep1:"-", number:100
 *   - ES-1-014   = prefix:"ES", sep1:"-", number:1, sep2:"-", baseNumber:"14", padding:3
 */
export function formatProposalNumber(config: NumberingConfig, number: number): string {
  // Build the full number string
  let result = '';

  // Add prefix if present
  if (config.prefix) {
    result += config.prefix;
    result += config.separator1 || '';
  }

  // Add the incrementing number (always present)
  result += String(number);

  // Add sub-series if present (with optional padding)
  if (config.baseNumber) {
    result += config.separator2 || '';
    const paddedSubSeries = config.padding > 0
      ? String(config.baseNumber).padStart(config.padding, '0')
      : config.baseNumber;
    result += paddedSubSeries;
  }

  return result;
}

/**
 * Parse a proposal number to extract the incrementing numeric part
 * Works with flexible format: [prefix][sep1][number][sep2][subSeries]
 * Returns null if parsing fails
 */
export function parseProposalNumber(
  proposalNumber: string,
  config: NumberingConfig
): number | null {
  // Build prefix pattern (before the incrementing number)
  let prefixPart = '';
  if (config.prefix) {
    prefixPart += config.prefix;
    prefixPart += config.separator1 || '';
  }

  // Build suffix pattern (after the incrementing number)
  let suffixPart = '';
  if (config.baseNumber) {
    suffixPart += config.separator2 || '';
    // Sub-series may be padded, so match any digits of that length or more
    const minLength = config.padding > 0 ? config.padding : config.baseNumber.length;
    suffixPart += `\\d{${minLength},}`;
  }

  // Escape special regex characters in prefix
  const escapedPrefix = prefixPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedSuffix = suffixPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Pattern: prefix + (number) + suffix
  const regex = new RegExp(`^${escapedPrefix}(\\d+)${escapedSuffix}$`, 'i');
  const match = proposalNumber.match(regex);

  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Get the next proposal number for a document type
 * If no config exists, returns null (caller should prompt for setup)
 */
export async function getNextProposalNumber(
  organizationId: string,
  documentType: string
): Promise<{ number: string; nextNumeric: number; config: NumberingConfig } | null> {
  const config = await getNumberingConfig(organizationId, documentType);

  // If no config, return null to prompt user for setup
  if (!config) {
    return null;
  }

  // Find the highest existing number for this document type
  const { data: proposals } = await supabase
    .from('proposals')
    .select('proposal_number')
    .eq('organization_id', organizationId)
    .eq('document_type', documentType)
    .not('proposal_number', 'is', null);

  let maxNumber = config.lastNumber;

  if (proposals) {
    for (const proposal of proposals) {
      if (!proposal.proposal_number) continue;
      const num = parseProposalNumber(proposal.proposal_number, config);
      if (num !== null && num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  const nextNumeric = maxNumber + 1;
  const formattedNumber = formatProposalNumber(config, nextNumeric);

  return {
    number: formattedNumber,
    nextNumeric,
    config,
  };
}

/**
 * Initialize numbering config for a document type
 * Called when user creates first proposal and sets their preferences
 */
export async function initializeNumberingConfig(
  organizationId: string,
  documentType: string,
  config: Partial<NumberingConfig>
): Promise<NumberingConfig> {
  const fullConfig: NumberingConfig = {
    ...DEFAULT_NUMBERING_CONFIG,
    ...config,
    // Subtract 1 because first proposal will increment
    lastNumber: (config.lastNumber ?? DEFAULT_NUMBERING_CONFIG.lastNumber) - 1,
  };

  await setNumberingConfig(organizationId, documentType, fullConfig);
  return fullConfig;
}

/**
 * Get default config suggestion (no longer type-specific)
 */
export function getDefaultConfigSuggestion(): NumberingConfig {
  return { ...DEFAULT_NUMBERING_CONFIG };
}

/**
 * Remove numbering config for a document type
 */
export async function removeNumberingConfig(
  organizationId: string,
  documentType: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('organizations')
    .select('numbering_config')
    .eq('id', organizationId)
    .single();

  const currentConfig = (existing?.numbering_config as OrganizationNumberingConfig) || {};

  // Remove the document type from config
  const { [documentType]: _, ...remainingConfig } = currentConfig;

  const { error } = await supabase
    .from('organizations')
    .update({ numbering_config: remainingConfig })
    .eq('id', organizationId);

  if (error) {
    console.error('Failed to remove numbering config:', error);
    return false;
  }

  return true;
}

/**
 * Get all configured document types for an organization
 */
export async function getConfiguredDocumentTypes(
  organizationId: string
): Promise<string[]> {
  const configs = await getAllNumberingConfigs(organizationId);
  return configs ? Object.keys(configs) : [];
}

/**
 * Check if a document type has been used in any proposals
 * Returns true if at least one proposal exists with this document type
 */
export async function isDocumentTypeInUse(
  organizationId: string,
  documentType: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('proposals')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('document_type', documentType);

  if (error) {
    console.error('Failed to check document type usage:', error);
    return false; // Assume not in use on error to allow edits
  }

  return (count ?? 0) > 0;
}

/**
 * Get usage counts for all document types in an organization
 * Returns a map of document type -> count of proposals using it
 */
export async function getDocumentTypeUsageCounts(
  organizationId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('proposals')
    .select('document_type')
    .eq('organization_id', organizationId)
    .not('document_type', 'is', null);

  if (error || !data) {
    console.error('Failed to get document type usage counts:', error);
    return {};
  }

  // Count occurrences of each document type
  const counts: Record<string, number> = {};
  for (const proposal of data) {
    const docType = proposal.document_type;
    if (docType) {
      counts[docType] = (counts[docType] || 0) + 1;
    }
  }

  return counts;
}

/**
 * Get the highest existing proposal number for a document type
 * Used to detect potential collisions when editing numbering config
 * Returns the highest numeric part found, or null if no proposals exist
 */
export async function getHighestProposalNumber(
  organizationId: string,
  documentType: string,
  config: NumberingConfig
): Promise<number | null> {
  const { data: proposals, error } = await supabase
    .from('proposals')
    .select('proposal_number')
    .eq('organization_id', organizationId)
    .eq('document_type', documentType)
    .not('proposal_number', 'is', null);

  if (error || !proposals || proposals.length === 0) {
    return null;
  }

  let maxNumber: number | null = null;

  for (const proposal of proposals) {
    if (!proposal.proposal_number) continue;
    const num = parseProposalNumber(proposal.proposal_number, config);
    if (num !== null && (maxNumber === null || num > maxNumber)) {
      maxNumber = num;
    }
  }

  return maxNumber;
}
