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
    default:
      return `{org.${parts.join('.')}}`;
  }
}

function resolveTermsVariable(parts: string[], data: FormBuilderData): string {
  const terms = data.terms;

  if (parts[0] === 'paymentSchedule') {
    return terms.paymentMilestones
      .map(m => `${m.percentage}% - ${m.trigger}`)
      .join('\n');
  }

  if (parts[0]?.startsWith('milestone')) {
    const idx = parseInt(parts[0].replace('milestone', ''), 10) - 1;
    const milestone = terms.paymentMilestones[idx];
    if (milestone) {
      if (parts[1] === 'percentage') return `${milestone.percentage}%`;
      if (parts[1] === 'trigger') return milestone.trigger;
    }
  }

  if (parts[0] === 'warranties') {
    return terms.warranties
      .map(w => `${w.name}: ${w.quantity} ${w.unit}`)
      .join('\n');
  }

  if (parts[0]?.startsWith('warranty')) {
    const idx = parseInt(parts[0].replace('warranty', ''), 10) - 1;
    const warranty = terms.warranties[idx];
    if (warranty) {
      return `${warranty.name}: ${warranty.quantity} ${warranty.unit}`;
    }
  }

  if (parts[0] === 'exclusions') {
    return terms.exclusions
      .filter(e => e.checked)
      .map(e => e.label)
      .join('\n');
  }

  return `{terms.${parts.join('.')}}`;
}

function resolvePricingVariable(parts: string[], data: FormBuilderData): string {
  const pricing = data.pricing;

  if (parts[0] === 'grandTotal') {
    let total = 0;
    pricing.sections.forEach(section => {
      section.lineItems.forEach(item => {
        total += item.quantity * item.unitCost * (1 + item.markupPercent / 100);
      });
    });
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(total);
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
        total += item.quantity * item.unitCost * (1 + item.markupPercent / 100);
      });
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(total);
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
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(lineItem.unitCost);
          case 'total':
            const total = lineItem.quantity * lineItem.unitCost * (1 + lineItem.markupPercent / 100);
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(total);
        }
      }
    }
  }

  return `{pricing.${parts.join('.')}}`;
}

function resolveLeadTimesVariable(parts: string[], data: FormBuilderData): string {
  const leadTimes = data.leadTimes;

  for (const section of leadTimes.sections) {
    const sectionKey = section.name.toLowerCase().replace(/\s+/g, '_');

    if (parts[0] === sectionKey || parts[0]?.startsWith(sectionKey)) {
      if (parts[1] === 'phases') {
        return section.phases
          .map(p => `${p.phaseName}: ${p.duration}`)
          .join('\n');
      }

      const phaseMatch = parts[0].match(/_phase(\d+)$/);
      if (phaseMatch) {
        const phaseIdx = parseInt(phaseMatch[1], 10) - 1;
        const phase = section.phases[phaseIdx];
        if (phase) {
          if (parts[1] === 'name') return phase.phaseName;
          if (parts[1] === 'duration') return phase.duration;
          if (parts[1] === 'completion') return phase.estCompletionDate;
        }
      }
    }
  }

  return `{leadtimes.${parts.join('.')}}`;
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
  product: { rawData?: Record<string, unknown> }
): string {
  if (!product.rawData) return '';

  const fieldKey = parts[0];
  const rawData = product.rawData as Record<string, unknown>;

  if (fieldKey in rawData) {
    const value = rawData[fieldKey];
    if (value != null) return String(value);
  }

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
    case 'terms':
      return resolveTermsVariable(parts.slice(1), data);
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
