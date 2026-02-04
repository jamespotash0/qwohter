/**
 * Content Renderer Utilities
 *
 * Shared functions for resolving variables and rendering Tiptap content to HTML.
 * Used by PreviewDialog and PDF/DOCX exports.
 */

import type { FormBuilderData } from '../context/FormBuilderContext';
import type { EditorContent } from '../components/presentation/PresentationEditor';

// ============================================================================
// Types
// ============================================================================

export interface ProposalData {
  proposalNumber?: string;
  status?: string;
  documentType?: string;
  createdAt?: string;
}

export interface InfoData {
  // Project Details
  projectName?: string;
  proposalDate?: string;
  contactName?: string;
  contactEmail?: string;
  // Work Details
  proposalSource?: string;
  categoryOfWork?: string;
  laborType?: string;
  projectType?: string;
  // Client Info
  clientName?: string;
  clientCompany?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientContactType?: string;
  // Job Details
  jobLocationName?: string;
  jobLocation?: string;
  jobFloor?: string;
  locationType?: string;
  estimatedDueDate?: string;
  jobNotes?: string;
}

export interface OrgData {
  name?: string;
  phone?: string;
  fax?: string;
  address?: string;
  website?: string;
  industry?: string;
}

// ============================================================================
// Variable Resolution
// ============================================================================

function resolveProposalVariable(parts: string[], proposalData?: ProposalData): string {
  if (!proposalData) return `{proposal.${parts.join('.')}}`;

  switch (parts[0]) {
    case 'number':
      return proposalData.proposalNumber || `{proposal.number}`;
    default:
      return `{proposal.${parts.join('.')}}`;
  }
}

function resolveProjectVariable(parts: string[], infoData?: InfoData): string {
  if (!infoData) return `{project.${parts.join('.')}}`;

  switch (parts[0]) {
    case 'name':
      return infoData.projectName || `{project.name}`;
    case 'date':
      return infoData.proposalDate || `{project.date}`;
    case 'locationName':
      return infoData.jobLocationName || `{project.locationName}`;
    case 'location':
      return infoData.jobLocation || `{project.location}`;
    case 'floor':
      return infoData.jobFloor || `{project.floor}`;
    case 'locationType':
      return infoData.locationType || `{project.locationType}`;
    case 'dueDate':
      return infoData.estimatedDueDate || `{project.dueDate}`;
    case 'notes':
      return infoData.jobNotes || `{project.notes}`;
    case 'source':
      return infoData.proposalSource || `{project.source}`;
    case 'workType':
      return infoData.categoryOfWork || `{project.workType}`;
    case 'laborType':
      return infoData.laborType || `{project.laborType}`;
    case 'projectType':
      return infoData.projectType || `{project.projectType}`;
    default:
      return `{project.${parts.join('.')}}`;
  }
}

function resolveContactVariable(parts: string[], infoData?: InfoData): string {
  if (!infoData) return `{contact.${parts.join('.')}}`;

  switch (parts[0]) {
    case 'name':
      return infoData.contactName || `{contact.name}`;
    case 'email':
      return infoData.contactEmail || `{contact.email}`;
    default:
      return `{contact.${parts.join('.')}}`;
  }
}

function resolveClientVariable(parts: string[], infoData?: InfoData): string {
  if (!infoData) return `{client.${parts.join('.')}}`;

  switch (parts[0]) {
    case 'name':
      return infoData.clientName || `{client.name}`;
    case 'company':
      return infoData.clientCompany || `{client.company}`;
    case 'email':
      return infoData.clientEmail || `{client.email}`;
    case 'phone':
      return infoData.clientPhone || `{client.phone}`;
    case 'address':
      return infoData.clientAddress || `{client.address}`;
    default:
      return `{client.${parts.join('.')}}`;
  }
}

function resolveOrgVariable(parts: string[], orgData?: OrgData): string {
  if (!orgData) return `{org.${parts.join('.')}}`;

  switch (parts[0]) {
    case 'name':
      return orgData.name || `{org.name}`;
    case 'phone':
      return orgData.phone || `{org.phone}`;
    case 'fax':
      return orgData.fax || `{org.fax}`;
    case 'address':
      return orgData.address || `{org.address}`;
    case 'website':
      return orgData.website || `{org.website}`;
    case 'industry':
      return orgData.industry || `{org.industry}`;
    default:
      return `{org.${parts.join('.')}}`;
  }
}

/**
 * Calculate sell price for a line item (matches PricingTab logic)
 * Handles markup type (percent/dollar) and discounts
 */
function calculateItemSellPrice(item: {
  quantity: number;
  unitCost: number;
  markupValue: number;
  markupType?: 'percent' | 'dollar';
  discountValue?: number;
  discountType?: 'percent' | 'dollar';
}): number {
  const baseCost = item.quantity * item.unitCost;
  let priceAfterMarkup: number;

  if (item.markupType === 'dollar') {
    // Flat dollar markup (total amount, not per unit)
    priceAfterMarkup = baseCost + (item.markupValue || 0);
  } else {
    // Percentage markup (default)
    const markup = baseCost * (item.markupValue / 100);
    priceAfterMarkup = baseCost + markup;
  }

  // Apply discount if present
  if (item.discountValue && item.discountValue > 0) {
    if (item.discountType === 'percent') {
      return priceAfterMarkup * (1 - item.discountValue / 100);
    } else {
      return Math.max(0, priceAfterMarkup - item.discountValue);
    }
  }

  return priceAfterMarkup;
}

/**
 * Round to 2 decimal places
 */
function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function resolvePricingVariable(parts: string[], data: FormBuilderData): string {
  const pricing = data.pricing;
  const summary = pricing.summary;

  // Summary variables - use stored values if available
  if (parts[0] === 'subtotal') {
    if (summary?.subtotal !== undefined) {
      return formatCurrency(summary.subtotal);
    }
    // Fallback: calculate
    let total = 0;
    pricing.sections.forEach(section => {
      section.lineItems.forEach(item => {
        total += calculateItemSellPrice(item);
      });
    });
    return formatCurrency(round2(total));
  }

  if (parts[0] === 'totalCost') {
    if (summary?.totalCost !== undefined) {
      return formatCurrency(summary.totalCost);
    }
    // Fallback: calculate
    let cost = 0;
    pricing.sections.forEach(section => {
      section.lineItems.forEach(item => {
        cost += item.quantity * item.unitCost;
      });
    });
    return formatCurrency(round2(cost));
  }

  if (parts[0] === 'grossProfit') {
    if (summary?.grossProfit !== undefined) {
      return formatCurrency(summary.grossProfit);
    }
    return formatCurrency(0);
  }

  if (parts[0] === 'grossProfitPercent') {
    if (summary?.grossProfitPercent !== undefined) {
      return `${summary.grossProfitPercent.toFixed(2)}%`;
    }
    return '0%';
  }

  // Grand total (with tax) - this is the main total variable
  if (parts[0] === 'grandTotal') {
    if (summary?.grandTotal !== undefined) {
      return formatCurrency(summary.grandTotal);
    }
    // Fallback: calculate
    let total = 0;
    let taxableTotal = 0;
    pricing.sections.forEach(section => {
      section.lineItems.forEach(item => {
        const itemTotal = calculateItemSellPrice(item);
        total += itemTotal;
        if (item.isTaxable) {
          taxableTotal += itemTotal;
        }
      });
    });
    const taxPercent = pricing.salesTaxPercent ?? 0;
    const taxAmount = taxableTotal * (taxPercent / 100);
    return formatCurrency(round2(total + taxAmount));
  }

  // Tax variables
  if (parts[0] === 'salesTaxPercent') {
    return `${pricing.salesTaxPercent ?? 0}%`;
  }

  if (parts[0] === 'taxAmount') {
    if (summary?.totalTax !== undefined) {
      return formatCurrency(summary.totalTax);
    }
    // Fallback: calculate
    const taxPercent = pricing.salesTaxPercent ?? 0;
    let taxableTotal = 0;
    pricing.sections.forEach(section => {
      section.lineItems.forEach(item => {
        if (item.isTaxable) {
          taxableTotal += calculateItemSellPrice(item);
        }
      });
    });
    const taxAmount = taxableTotal * (taxPercent / 100);
    return formatCurrency(round2(taxAmount));
  }

  // Legacy: grandTotalWithTax (alias for grandTotal)
  if (parts[0] === 'grandTotalWithTax') {
    if (summary?.grandTotal !== undefined) {
      return formatCurrency(summary.grandTotal);
    }
    // Fallback: calculate
    let total = 0;
    let taxableTotal = 0;
    pricing.sections.forEach(section => {
      section.lineItems.forEach(item => {
        const itemTotal = calculateItemSellPrice(item);
        total += itemTotal;
        if (item.isTaxable) {
          taxableTotal += itemTotal;
        }
      });
    });
    const taxPercent = pricing.salesTaxPercent ?? 0;
    const taxAmount = taxableTotal * (taxPercent / 100);
    return formatCurrency(round2(total + taxAmount));
  }

  if (parts[0] === 'itemCount') {
    let count = 0;
    pricing.sections.forEach(section => {
      count += section.lineItems.length;
    });
    return count.toString();
  }

  // Find matching section by key
  const section = pricing.sections.find(
    s => s.name.toLowerCase().replace(/\s+/g, '_') === parts[0]
  );
  if (section) {
    // Section total
    if (parts[1] === 'total') {
      let total = 0;
      section.lineItems.forEach(item => {
        total += calculateItemSellPrice(item);
      });
      return formatCurrency(round2(total));
    }
    // Section items list
    if (parts[1] === 'items') {
      return section.lineItems.map(item => item.name).join(', ');
    }
    // Section item count
    if (parts[1] === 'itemCount') {
      return section.lineItems.length.toString();
    }
    // Individual line item: pricing.{section}.item{N}.{field}
    const itemMatch = parts[1]?.match(/^item(\d+)$/);
    if (itemMatch) {
      const itemIdx = parseInt(itemMatch[1], 10) - 1;
      const lineItem = section.lineItems[itemIdx];
      if (lineItem && parts[2]) {
        switch (parts[2]) {
          case 'name':
            return lineItem.name || '';
          case 'quantity':
            return lineItem.quantity.toString();
          case 'unitCost':
            return formatCurrency(lineItem.unitCost);
          case 'total':
            const total = calculateItemSellPrice(lineItem);
            return formatCurrency(round2(total));
        }
      }
    }
  }

  return `{pricing.${parts.join('.')}}`;
}

/**
 * Convert a phase name to a camelCase key (matches VariableExtension.ts)
 */
function toCamelCaseKey(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .map((word, idx) => idx === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function resolveLeadTimesVariable(parts: string[], data: FormBuilderData): string {
  const leadTimes = data.leadTimes;
  const targetPhaseKey = parts[0]; // e.g., "trackDelivery"
  const fieldKey = parts[1]; // e.g., "duration", "name", "completion"

  // Search all sections for a phase matching the camelCase key
  for (const section of leadTimes.sections) {
    for (const phase of section.phases) {
      const phaseKey = toCamelCaseKey(phase.phaseName);

      if (phaseKey === targetPhaseKey) {
        switch (fieldKey) {
          case 'name':
            return phase.phaseName || '';
          case 'duration':
            // Combine duration value with unit (e.g., "2 weeks", "3 days")
            if (!phase.duration) return '';
            return phase.durationUnit
              ? `${phase.duration} ${phase.durationUnit}`
              : phase.duration;
          case 'completion':
            return phase.estCompletionDate || '';
        }
      }
    }
  }

  // Variable not found - return empty string instead of placeholder
  return '';
}

function resolveMiscVariable(parts: string[], data: FormBuilderData): string {
  const misc = data.miscellaneous;

  if (parts[0] === 'notes') {
    return misc.notes || '';
  }

  const field = misc.fields.find(
    f => f.label.toLowerCase().replace(/\s+/g, '_') === parts[0]
  );
  if (field) {
    return field.value;
  }

  return `{misc.${parts.join('.')}}`;
}

function resolveProductsVariable(parts: string[], data: FormBuilderData): string {
  const products = data.products.items;

  if (parts[0] === 'list') {
    return products.map(p => p.name).join(', ');
  }

  if (parts[0] === 'count') {
    return products.length.toString();
  }

  return `{products.${parts.join('.')}}`;
}

function resolveProductFieldVariable(
  parts: string[],
  product: {
    name?: string;
    quantity?: number;
    unit?: string;
    description?: string;
    rawData?: Record<string, unknown>;
  }
): string {
  const fieldKey = parts[0];

  // Direct fields on the Product object itself
  switch (fieldKey) {
    case 'name':
      return product.name || '';
    case 'quantity':
      return product.quantity != null ? String(product.quantity) : '';
    case 'unit':
      return product.unit || '';
    case 'description':
      return product.description || '';
  }

  // Fields in rawData
  if (!product.rawData) return '';
  const rawData = product.rawData as Record<string, unknown>;

  // Map common field names to rawData property names
  const fieldMappings: Record<string, string> = {
    category: 'productLine',
    type: 'productDomain',
  };

  const mappedKey = fieldMappings[fieldKey] || fieldKey;

  // Direct fields in rawData
  if (mappedKey in rawData) {
    const value = rawData[mappedKey];
    if (value != null) return String(value);
  }

  // Nested fields
  const nestedPaths: Record<string, string[]> = {
    stc: ['performanceRatings', 'stc'],
    fireRating: ['performanceRatings', 'fireRating'],
    acousticRating: ['performanceRatings', 'acousticRating'],
    height: ['dimensions', 'height'],
    width: ['dimensions', 'width'],
    length: ['dimensions', 'length'],
    thickness: ['dimensions', 'thickness'],
    color: ['appearance', 'color'],
    finish: ['appearance', 'finish'],
    trim: ['appearance', 'trim'],
    core: ['materials', 'core'],
    face: ['materials', 'face'],
    frame: ['materials', 'frame'],
  };

  const path = nestedPaths[fieldKey];
  if (path) {
    let value: unknown = rawData;
    for (const key of path) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return '';
      }
    }
    return value != null ? String(value) : '';
  }

  return '';
}

/**
 * Resolve a single variable key to its value
 */
export function resolveVariable(
  key: string,
  data: FormBuilderData,
  proposalData?: ProposalData,
  infoData?: InfoData,
  orgData?: OrgData
): string {
  const parts = key.split('.');

  switch (parts[0]) {
    case 'proposal':
      return resolveProposalVariable(parts.slice(1), proposalData);
    case 'project':
      return resolveProjectVariable(parts.slice(1), infoData);
    case 'contact':
      return resolveContactVariable(parts.slice(1), infoData);
    case 'client':
      return resolveClientVariable(parts.slice(1), infoData);
    case 'org':
      return resolveOrgVariable(parts.slice(1), orgData);
    case 'pricing':
      return resolvePricingVariable(parts.slice(1), data);
    case 'leadtimes':
      return resolveLeadTimesVariable(parts.slice(1), data);
    case 'misc':
      return resolveMiscVariable(parts.slice(1), data);
    case 'products':
      return resolveProductsVariable(parts.slice(1), data);
    default:
      const product = data.products.items.find(p => p.alias === parts[0]);
      if (product && product.rawData) {
        return resolveProductFieldVariable(parts.slice(1), product);
      }
      return `{${key}}`;
  }
}

/**
 * Recursively process content and resolve all variables
 */
export function resolveContentVariables(
  content: EditorContent,
  data: FormBuilderData,
  proposalData?: ProposalData,
  infoData?: InfoData,
  orgData?: OrgData
): EditorContent {
  const resolved = { ...content };

  if (resolved.type === 'variable' && resolved.attrs?.variableKey) {
    const value = resolveVariable(
      resolved.attrs.variableKey as string,
      data,
      proposalData,
      infoData,
      orgData
    );
    return {
      type: 'text',
      text: value,
    };
  }

  if (resolved.content) {
    resolved.content = resolved.content.map(child =>
      resolveContentVariables(child, data, proposalData, infoData, orgData)
    );
  }

  return resolved;
}

// ============================================================================
// HTML Rendering
// ============================================================================

/**
 * Render Tiptap content to HTML string
 */
export function renderContentToHtml(content: EditorContent): string {
  const renderNode = (node: EditorContent): string => {
    if (node.type === 'text') {
      let text = escapeHtml(node.text || '');
      if (node.marks) {
        node.marks.forEach(mark => {
          switch (mark.type) {
            case 'bold':
              text = `<strong>${text}</strong>`;
              break;
            case 'italic':
              text = `<em>${text}</em>`;
              break;
            case 'underline':
              text = `<u>${text}</u>`;
              break;
            case 'strike':
              text = `<s>${text}</s>`;
              break;
            case 'link':
              const href = mark.attrs?.href || '#';
              text = `<a href="${escapeHtml(String(href))}">${text}</a>`;
              break;
          }
        });
      }
      return text;
    }

    const children = node.content?.map(renderNode).join('') || '';
    const align = node.attrs?.textAlign ? `text-align: ${node.attrs.textAlign}` : '';

    switch (node.type) {
      case 'doc':
        return children;
      case 'paragraph':
        return `<p style="${align}">${children || '&nbsp;'}</p>`;
      case 'heading':
        const level = node.attrs?.level || 1;
        return `<h${level} style="${align}">${children}</h${level}>`;
      case 'bulletList':
        return `<ul>${children}</ul>`;
      case 'orderedList':
        return `<ol>${children}</ol>`;
      case 'listItem':
        return `<li>${children}</li>`;
      case 'blockquote':
        return `<blockquote>${children}</blockquote>`;
      case 'table':
        return `<table>${children}</table>`;
      case 'tableRow':
        return `<tr>${children}</tr>`;
      case 'tableHeader':
        return `<th>${children}</th>`;
      case 'tableCell':
        return `<td>${children}</td>`;
      case 'horizontalRule':
        return '<hr />';
      default:
        return children;
    }
  };

  return renderNode(content);
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
