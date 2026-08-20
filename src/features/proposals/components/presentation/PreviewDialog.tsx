/**
 * Preview Dialog
 *
 * Modal dialog that shows the document with all variables resolved.
 * Provides a preview of what the exported PDF/DOCX will look like.
 */

import { useMemo } from 'react';
import { FilePdf, FileDoc, Printer } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { EditorContent } from './PresentationEditor';
import type { FormBuilderData } from '../../context/FormBuilderContext';

/**
 * Proposal direct fields for resolving proposal variables
 */
interface ProposalData {
  proposalNumber?: string;
  status?: string;
  documentType?: string;
  createdAt?: string;
}

/**
 * Info tab data for resolving project/client variables (from form_data.info)
 */
interface InfoData {
  // Project Details
  projectName?: string;
  proposalDate?: string;
  contactName?: string;
  contactEmail?: string;
  // Work Details
  proposalSource?: string;
  scope?: string;
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

/**
 * Organization data for resolving org variables (from organizations table)
 */
interface OrgData {
  name?: string;
  phone?: string;
  fax?: string;
  address?: string;
  website?: string;
  industry?: string;
}

interface PreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  content: EditorContent | null;
  formData: FormBuilderData;
  proposalData?: ProposalData;
  infoData?: InfoData;
  orgData?: OrgData;
  onExportPdf?: () => void;
  onExportDocx?: () => void;
}

/**
 * Resolve variables in text content
 */
function resolveVariable(
  key: string,
  data: FormBuilderData,
  proposalData?: ProposalData,
  infoData?: InfoData,
  orgData?: OrgData
): string {
  // Split key into parts (e.g., "client.name" -> ["client", "name"])
  const parts = key.split('.');

  // Handle static variables
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
      // Check if it's a product alias variable (e.g., "wallA.stc")
      const product = data.products.items.find(p => p.alias === parts[0]);
      if (product && product.rawData) {
        return resolveProductFieldVariable(parts.slice(1), product);
      }
      return `{${key}}`;
  }
}

function resolveProposalVariable(parts: string[], proposalData?: ProposalData): string {
  if (!proposalData) return `{proposal.${parts.join('.')}}`;

  switch (parts[0]) {
    case 'number':
      return proposalData.proposalNumber || `{proposal.number}`;
    case 'status':
      return proposalData.status || `{proposal.status}`;
    case 'documentType':
      return proposalData.documentType || `{proposal.documentType}`;
    case 'createdAt':
      if (proposalData.createdAt) {
        return new Date(proposalData.createdAt).toLocaleDateString();
      }
      return `{proposal.createdAt}`;
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
      return infoData.scope || `{project.workType}`;
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
    case 'type':
      return infoData.clientContactType || `{client.type}`;
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

function resolvePricingVariable(parts: string[], data: FormBuilderData): string {
  const pricing = data.pricing;

  // Helper to get item sell price (use stored value or fallback to calculation)
  const getItemSellPrice = (item: {
    sellPrice?: number;
    quantity: number;
    unitCost: number;
    markupValue?: number;
    markupType?: 'percent' | 'dollar';
  }) => {
    if (item.sellPrice !== undefined) return item.sellPrice;
    const baseCost = item.quantity * item.unitCost;
    if (item.markupType === 'dollar') {
      return baseCost + (item.markupValue || 0);
    }
    return baseCost * (1 + (item.markupValue || 0) / 100);
  };

  if (parts[0] === 'grandTotal') {
    let total = 0;
    pricing.sections.forEach(section => {
      section.lineItems.forEach(item => {
        total += getItemSellPrice(item);
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

  // Section-level variables
  const section = pricing.sections.find(
    s => s.name.toLowerCase().replace(/\s+/g, '_') === parts[0]
  );
  if (section) {
    if (parts[1] === 'total') {
      let total = 0;
      section.lineItems.forEach(item => {
        total += getItemSellPrice(item);
      });
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(total);
    }
    if (parts[1] === 'items') {
      return section.lineItems.map(item => item.name).join(', ');
    }
  }

  return `{pricing.${parts.join('.')}}`;
}

function resolveLeadTimesVariable(parts: string[], data: FormBuilderData): string {
  const leadTimes = data.leadTimes;

  // Find the section and phase from the key
  for (const section of leadTimes.sections) {
    const sectionKey = section.name.toLowerCase().replace(/\s+/g, '_');

    if (parts[0] === sectionKey || parts[0]?.startsWith(sectionKey)) {
      if (parts[1] === 'phases') {
        return section.phases
          .map(p => `${p.phaseName}: ${p.duration}`)
          .join('\n');
      }

      // Individual phase variables
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

  // Find field by key
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
 * Recursively process content and resolve variables
 */
function resolveContentVariables(
  content: EditorContent,
  data: FormBuilderData,
  proposalData?: ProposalData,
  infoData?: InfoData,
  orgData?: OrgData
): EditorContent {
  const resolved = { ...content };

  // Resolve variable nodes
  if (resolved.type === 'variable' && resolved.attrs?.variableKey) {
    const value = resolveVariable(resolved.attrs.variableKey as string, data, proposalData, infoData, orgData);
    // Convert variable to text
    return {
      type: 'text',
      text: value,
    };
  }

  // Process children recursively
  if (resolved.content) {
    resolved.content = resolved.content.map(child =>
      resolveContentVariables(child, data, proposalData, infoData, orgData)
    );
  }

  return resolved;
}

/**
 * Render content to HTML string
 */
function renderContentToHtml(content: EditorContent): string {
  const renderNode = (node: EditorContent): string => {
    if (node.type === 'text') {
      let text = node.text || '';
      // Apply marks
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
              text = `<a href="${href}" class="text-blue-600 underline">${text}</a>`;
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
        return `<p style="${align}" class="mb-3 leading-relaxed">${children || '&nbsp;'}</p>`;
      case 'heading':
        const level = node.attrs?.level || 1;
        const sizes = { 1: 'text-3xl', 2: 'text-2xl', 3: 'text-xl' };
        const size = sizes[level as keyof typeof sizes] || 'text-xl';
        return `<h${level} style="${align}" class="${size} font-bold mb-4">${children}</h${level}>`;
      case 'bulletList':
        return `<ul class="list-disc pl-6 my-3">${children}</ul>`;
      case 'orderedList':
        return `<ol class="list-decimal pl-6 my-3">${children}</ol>`;
      case 'listItem':
        return `<li class="my-1">${children}</li>`;
      case 'blockquote':
        return `<blockquote class="border-l-4 border-gray-300 pl-4 py-1 italic my-4">${children}</blockquote>`;
      case 'table':
        return `<table class="border-collapse w-full my-4 border border-gray-300">${children}</table>`;
      case 'tableRow':
        return `<tr>${children}</tr>`;
      case 'tableHeader':
        return `<th class="bg-gray-100 border border-gray-300 px-3 py-2 text-left font-semibold">${children}</th>`;
      case 'tableCell':
        return `<td class="border border-gray-300 px-3 py-2">${children}</td>`;
      case 'horizontalRule':
        return '<hr class="border-gray-200 my-6" />';
      default:
        return children;
    }
  };

  return renderNode(content);
}

export function PreviewDialog({
  isOpen,
  onClose,
  content,
  formData,
  proposalData,
  infoData,
  orgData,
  onExportPdf,
  onExportDocx,
}: PreviewDialogProps) {
  // Resolve all variables in content
  const resolvedContent = useMemo(() => {
    if (!content) return null;
    return resolveContentVariables(content, formData, proposalData, infoData, orgData);
  }, [content, formData, proposalData, infoData, orgData]);

  // Render to HTML
  const htmlContent = useMemo(() => {
    if (!resolvedContent) return '';
    return renderContentToHtml(resolvedContent);
  }, [resolvedContent]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Document Preview</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 816px;
              margin: 0 auto;
              padding: 48px;
              color: #333;
            }
            h1 { font-size: 1.875rem; font-weight: bold; margin-bottom: 1rem; }
            h2 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.75rem; }
            h3 { font-size: 1.25rem; font-weight: 500; margin-bottom: 0.5rem; }
            p { margin-bottom: 0.75rem; line-height: 1.625; }
            ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.75rem 0; }
            ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.75rem 0; }
            li { margin: 0.25rem 0; }
            table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
            th, td { border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; }
            th { background: #f3f4f6; font-weight: 600; text-align: left; }
            blockquote { border-left: 4px solid #d1d5db; padding-left: 1rem; margin: 1rem 0; font-style: italic; }
            a { color: #2563eb; text-decoration: underline; }
          </style>
        </head>
        <body>${htmlContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Document Preview
          </h2>
          <div className="flex items-center gap-2 mr-8">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
            {onExportPdf && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onExportPdf();
                }}
                className="gap-1.5"
              >
                <FilePdf className="w-4 h-4 text-red-500" />
                PDF
              </Button>
            )}
            {onExportDocx && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onExportDocx();
                }}
                className="gap-1.5"
              >
                <FileDoc className="w-4 h-4 text-blue-500" />
                DOCX
              </Button>
            )}
          </div>
        </div>

        {/* Preview Content */}
        <div className="overflow-y-auto bg-gray-100 dark:bg-gray-800 p-8">
          <div
            className={cn(
              'mx-auto bg-white dark:bg-gray-900',
              'shadow-lg rounded-sm',
              'max-w-[816px]', // ~8.5" at 96dpi
              'min-h-[1056px]', // ~11" at 96dpi
              'px-16 py-12', // ~1" margins
              'prose prose-gray dark:prose-invert max-w-none'
            )}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PreviewDialog;
