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
      // project, client, org variables need InfoTab data - return null
      return null;
  }
}

function resolveTermsVariable(parts: string[], data: FormBuilderData): string | null {
  const terms = data.terms;

  if (parts[0] === 'paymentSchedule') {
    if (terms.paymentMilestones.length === 0) return null;
    return terms.paymentMilestones
      .map(m => `${m.percentage}% - ${m.trigger}`)
      .join(', ');
  }

  if (parts[0]?.startsWith('milestone')) {
    const idx = parseInt(parts[0].replace('milestone', ''), 10) - 1;
    const milestone = terms.paymentMilestones[idx];
    if (milestone) {
      if (parts[1] === 'percentage') return `${milestone.percentage}%`;
      if (parts[1] === 'trigger') return milestone.trigger;
    }
    return null;
  }

  if (parts[0] === 'warranties') {
    if (terms.warranties.length === 0) return null;
    return terms.warranties
      .map(w => `${w.name}: ${w.quantity} ${w.unit}`)
      .join(', ');
  }

  if (parts[0]?.startsWith('warranty')) {
    const idx = parseInt(parts[0].replace('warranty', ''), 10) - 1;
    const warranty = terms.warranties[idx];
    if (warranty) {
      return `${warranty.name}: ${warranty.quantity} ${warranty.unit}`;
    }
    return null;
  }

  if (parts[0] === 'exclusions') {
    const checked = terms.exclusions.filter(e => e.checked);
    if (checked.length === 0) return null;
    return checked.map(e => e.label).join(', ');
  }

  return null;
}

function resolvePricingVariable(parts: string[], data: FormBuilderData): string | null {
  const pricing = data.pricing;

  if (parts[0] === 'grandTotal') {
    let total = 0;
    let hasItems = false;
    pricing.sections.forEach(section => {
      section.lineItems.forEach(item => {
        total += item.quantity * item.unitCost * (1 + item.markupPercent / 100);
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

function resolveProductFieldVariable(parts: string[], product: { rawData?: Record<string, unknown> }): string | null {
  if (!product.rawData) return null;

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
export function VariableNodeView({ node }: NodeViewProps) {
  const { variableKey, variableLabel } = node.attrs;
  const { data } = useFormBuilder();

  // Try to resolve the variable value
  const resolvedValue = useMemo(() => {
    return resolveVariableValue(variableKey, data);
  }, [variableKey, data]);

  // Determine what to display
  const displayValue = resolvedValue || variableLabel;
  const isResolved = resolvedValue !== null;

  return (
    <NodeViewWrapper
      as="span"
      className={cn(
        'variable-node inline px-1 py-0.5 rounded text-sm',
        'select-none cursor-pointer transition-colors',
        isResolved
          ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 hover:border-green-300 dark:hover:border-green-700'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-dashed border-gray-400 dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:border-gray-500 dark:hover:border-gray-400'
      )}
      contentEditable={false}
      data-variable={variableKey}
      title={isResolved ? `${variableLabel}: ${resolvedValue}` : `${variableLabel} (will resolve in preview)`}
    >
      {displayValue}
    </NodeViewWrapper>
  );
}

export default VariableNodeView;
