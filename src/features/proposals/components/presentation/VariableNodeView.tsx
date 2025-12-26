/**
 * Variable Node View
 *
 * React component for rendering variable nodes in the Tiptap editor.
 * Displays resolved values when possible, otherwise shows the label.
 */

import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useFormBuilder } from '../../context/FormBuilderContext';
import type { FormBuilderData } from '../../context/FormBuilderContext';

/**
 * Resolve a variable key to its value from FormBuilderData
 */
function resolveVariableValue(key: string, data: FormBuilderData): string | null {
  const parts = key.split('.');

  switch (parts[0]) {
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
      // project, client, org variables need InfoTab data - return null
      return null;
  }
}

function resolvePricingVariable(parts: string[], data: FormBuilderData): string | null {
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
    let hasItems = false;
    pricing.sections.forEach(section => {
      section.lineItems.forEach(item => {
        total += getItemSellPrice(item);
        hasItems = true;
      });
    });
    if (!hasItems) return null;
    return formatCurrency(total);
  }

  if (parts[0] === 'itemCount') {
    let count = 0;
    pricing.sections.forEach(section => {
      count += section.lineItems.length;
    });
    if (count === 0) return null;
    return count.toString();
  }

  // Tax variables
  if (parts[0] === 'salesTaxPercent') {
    const taxPercent = pricing.salesTaxPercent ?? 0;
    if (taxPercent === 0) return null;
    return `${taxPercent}%`;
  }

  if (parts[0] === 'taxAmount') {
    // Use stored summary if available
    if (pricing.summary?.totalTax !== undefined) {
      if (pricing.summary.totalTax === 0) return null;
      return formatCurrency(pricing.summary.totalTax);
    }
    const taxPercent = pricing.salesTaxPercent ?? 0;
    if (taxPercent === 0) return null;
    let taxableTotal = 0;
    pricing.sections.forEach(section => {
      section.lineItems.forEach(item => {
        if (item.isTaxable) {
          taxableTotal += getItemSellPrice(item);
        }
      });
    });
    if (taxableTotal === 0) return null;
    return formatCurrency(taxableTotal * (taxPercent / 100));
  }

  if (parts[0] === 'grandTotalWithTax') {
    // Use stored summary if available
    if (pricing.summary?.grandTotal !== undefined) {
      return formatCurrency(pricing.summary.grandTotal);
    }
    let total = 0;
    let taxableTotal = 0;
    let hasItems = false;
    pricing.sections.forEach(section => {
      section.lineItems.forEach(item => {
        const itemTotal = getItemSellPrice(item);
        total += itemTotal;
        if (item.isTaxable) {
          taxableTotal += itemTotal;
        }
        hasItems = true;
      });
    });
    if (!hasItems) return null;
    const taxPercent = pricing.salesTaxPercent ?? 0;
    const taxAmount = taxableTotal * (taxPercent / 100);
    return formatCurrency(total + taxAmount);
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
      if (section.lineItems.length === 0) return null;
      return formatCurrency(total);
    }
    if (parts[1] === 'items') {
      if (section.lineItems.length === 0) return null;
      return section.lineItems.map(item => item.name).join(', ');
    }
  }

  return null;
}

function resolveLeadTimesVariable(parts: string[], data: FormBuilderData): string | null {
  const leadTimes = data.leadTimes;

  for (const section of leadTimes.sections) {
    const sectionKey = section.name.toLowerCase().replace(/\s+/g, '_');

    if (parts[0] === sectionKey || parts[0]?.startsWith(sectionKey)) {
      if (parts[1] === 'phases') {
        if (section.phases.length === 0) return null;
        return section.phases
          .map(p => `${p.phaseName}: ${p.duration}`)
          .join(', ');
      }

      // Individual phase variables
      const phaseMatch = parts[0].match(/_phase(\d+)$/);
      if (phaseMatch) {
        const phaseIdx = parseInt(phaseMatch[1], 10) - 1;
        const phase = section.phases[phaseIdx];
        if (phase) {
          if (parts[1] === 'name') return phase.phaseName || null;
          if (parts[1] === 'duration') return phase.duration || null;
          if (parts[1] === 'completion') return phase.estCompletionDate || null;
        }
      }
    }
  }

  return null;
}

function resolveMiscVariable(parts: string[], data: FormBuilderData): string | null {
  const misc = data.miscellaneous;

  if (parts[0] === 'notes') {
    return misc.notes || null;
  }

  // Find field by key
  const field = misc.fields.find(
    f => f.label.toLowerCase().replace(/\s+/g, '_') === parts[0]
  );
  if (field && field.value) {
    return field.value;
  }

  return null;
}

function resolveProductsVariable(parts: string[], data: FormBuilderData): string | null {
  const products = data.products.items;

  if (parts[0] === 'list') {
    if (products.length === 0) return null;
    return products.map(p => p.name).join(', ');
  }

  if (parts[0] === 'count') {
    return products.length.toString();
  }

  return null;
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
): string | null {
  const fieldKey = parts[0];

  // Direct fields on the Product object itself
  switch (fieldKey) {
    case 'name':
      return product.name || null;
    case 'quantity':
      return product.quantity != null ? String(product.quantity) : null;
    case 'unit':
      return product.unit || null;
    case 'description':
      return product.description || null;
  }

  // Fields in rawData
  if (!product.rawData) return null;
  const rawData = product.rawData as Record<string, unknown>;

  // Map common field names to rawData property names
  const fieldMappings: Record<string, string> = {
    category: 'productCategory',
    type: 'productType',
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
        return null;
      }
    }
    return value != null ? String(value) : null;
  }

  return null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Variable Node View Component
 */
export function VariableNodeView({ node, editor, getPos }: NodeViewProps) {
  const { variableKey, variableLabel } = node.attrs;
  const { data } = useFormBuilder();

  // Try to resolve the variable value
  const resolvedValue = useMemo(() => {
    return resolveVariableValue(variableKey, data);
  }, [variableKey, data]);

  // Get marks at this position to apply font styling
  const markStyles = useMemo(() => {
    const styles: React.CSSProperties = {};

    try {
      const pos = typeof getPos === 'function' ? getPos() : null;
      if (pos !== null && pos !== undefined && editor?.state?.doc) {
        const $pos = editor.state.doc.resolve(pos);
        const marks = $pos.marks();

        marks.forEach(mark => {
          if (mark.type.name === 'textStyle') {
            if (mark.attrs.fontFamily) {
              styles.fontFamily = mark.attrs.fontFamily;
            }
            if (mark.attrs.fontSize) {
              styles.fontSize = mark.attrs.fontSize;
            }
            if (mark.attrs.color) {
              styles.color = mark.attrs.color;
            }
            if (mark.attrs.lineHeight) {
              styles.lineHeight = mark.attrs.lineHeight;
            }
          }
          if (mark.type.name === 'bold') {
            styles.fontWeight = 'bold';
          }
          if (mark.type.name === 'italic') {
            styles.fontStyle = 'italic';
          }
        });
      }
    } catch {
      // If getPos fails (node being deleted, etc.), use defaults
    }

    return styles;
  }, [editor?.state?.doc, getPos]);

  // Determine what to display
  const displayValue = resolvedValue || variableLabel;
  const isResolved = resolvedValue !== null;

  return (
    <NodeViewWrapper
      as="span"
      className={cn(
        // Inherit text styling from surrounding content
        'variable-node inline-block align-baseline',
        // Minimal padding, no fixed font size - inherits from parent
        'px-0.5 rounded-sm',
        'select-none cursor-pointer transition-colors',
        isResolved
          ? 'bg-green-50/50 dark:bg-green-900/10 border-b border-green-300 dark:border-green-700'
          : 'bg-amber-50/50 dark:bg-amber-900/10 border-b border-dashed border-amber-400 dark:border-amber-600'
      )}
      style={{
        // Apply marks-based styles first, then inherit for anything not explicitly set
        ...markStyles,
        // Fallback to inherit for properties not set by marks
        fontFamily: markStyles.fontFamily || 'inherit',
        fontSize: markStyles.fontSize || 'inherit',
        fontWeight: markStyles.fontWeight || 'inherit',
        fontStyle: markStyles.fontStyle || 'inherit',
        lineHeight: markStyles.lineHeight || 'inherit',
        letterSpacing: 'inherit',
        color: markStyles.color || 'inherit',
      }}
      contentEditable={false}
      data-variable={variableKey}
      title={isResolved ? `${variableLabel}: ${resolvedValue}` : `${variableLabel} (will resolve in preview)`}
    >
      {displayValue}
    </NodeViewWrapper>
  );
}

export default VariableNodeView;
