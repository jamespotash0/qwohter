/**
 * Preview Dialog
 *
 * Modal dialog that shows the document with all variables resolved.
 * Provides a preview of what the exported PDF/DOCX will look like.
 */

import { useMemo } from 'react';
import { X, FilePdf, FileDoc, Printer } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { EditorContent } from './PresentationEditor';
import type { FormBuilderData } from '../../context/FormBuilderContext';

interface PreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  content: EditorContent | null;
  formData: FormBuilderData;
  onExportPdf?: () => void;
  onExportDocx?: () => void;
}

/**
 * Resolve variables in text content
 */
function resolveVariable(key: string, data: FormBuilderData): string {
  // Split key into parts (e.g., "client.name" -> ["client", "name"])
  const parts = key.split('.');

  // Handle static variables
  switch (parts[0]) {
    case 'project':
      // These would come from proposal data, use placeholder for now
      return `[${key}]`;
    case 'client':
      return `[${key}]`;
    case 'org':
      return `[${key}]`;
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
      // Check if it's a product alias variable (e.g., "wallA.stc")
      const product = data.products.items.find(p => p.alias === parts[0]);
      if (product && product.rawData) {
        return resolveProductFieldVariable(parts.slice(1), product);
      }
      return `{${key}}`;
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

  // Section-level variables
  const section = pricing.sections.find(
    s => s.name.toLowerCase().replace(/\s+/g, '_') === parts[0]
  );
  if (section) {
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

function resolveProductFieldVariable(parts: string[], product: { rawData?: Record<string, unknown> }): string {
  if (!product.rawData) return '';

  const fieldKey = parts[0];
  const rawData = product.rawData as Record<string, unknown>;

  // Direct fields
  if (fieldKey in rawData) {
    const value = rawData[fieldKey];
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
  data: FormBuilderData
): EditorContent {
  const resolved = { ...content };

  // Resolve variable nodes
  if (resolved.type === 'variable' && resolved.attrs?.variableKey) {
    const value = resolveVariable(resolved.attrs.variableKey as string, data);
    // Convert variable to text
    return {
      type: 'text',
      text: value,
    };
  }

  // Process children recursively
  if (resolved.content) {
    resolved.content = resolved.content.map(child =>
      resolveContentVariables(child, data)
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
  onExportPdf,
  onExportDocx,
}: PreviewDialogProps) {
  // Resolve all variables in content
  const resolvedContent = useMemo(() => {
    if (!content) return null;
    return resolveContentVariables(content, formData);
  }, [content, formData]);

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
          <div className="flex items-center gap-2">
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
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
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
