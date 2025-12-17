/**
 * Variable Resolver
 *
 * Resolves variable placeholders to actual values.
 * Handles both static variables and dynamic product-based variables.
 */

import type { Product, FormBuilderData } from '../context/FormBuilderContext';
import { resolveProductVariable, isProductVariable } from './productVariables';

/**
 * Context data for resolving variables
 */
export interface VariableContext {
  // Project data
  project?: {
    name?: string;
    location?: string;
    date?: string;
  };

  // Client data
  client?: {
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
  };

  // Pricing data
  pricing?: {
    total?: number;
    subtotal?: number;
    tax?: number;
    discount?: number;
  };

  // Products data
  products?: Product[];

  // Terms data
  terms?: {
    payment?: string;
    warranty?: string;
  };

  // Lead times
  leadtimes?: {
    total?: string;
    start?: string;
    end?: string;
  };

  // Organization data
  org?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    // Format currency for pricing fields
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

/**
 * Resolve a static variable key to its value
 */
function resolveStaticVariable(key: string, context: VariableContext): string | null {
  const parts = key.split('.');
  if (parts.length !== 2) return null;

  const [category, field] = parts;

  switch (category) {
    case 'project':
      return context.project?.[field as keyof typeof context.project] ?? null;

    case 'client':
      return context.client?.[field as keyof typeof context.client] ?? null;

    case 'pricing': {
      const value = context.pricing?.[field as keyof typeof context.pricing];
      return value !== undefined ? formatValue(value) : null;
    }

    case 'products':
      if (field === 'count') {
        return String(context.products?.length ?? 0);
      }
      if (field === 'list') {
        return context.products?.map(p => p.name).join(', ') ?? '';
      }
      return null;

    case 'terms':
      return context.terms?.[field as keyof typeof context.terms] ?? null;

    case 'leadtimes':
      return context.leadtimes?.[field as keyof typeof context.leadtimes] ?? null;

    case 'org':
      return context.org?.[field as keyof typeof context.org] ?? null;

    default:
      return null;
  }
}

/**
 * Resolve a variable key to its actual value
 *
 * @param key - The variable key (e.g., "client.name" or "wallA.stc")
 * @param context - The data context for resolving values
 * @returns The resolved value or the original placeholder if not found
 */
export function resolveVariable(key: string, context: VariableContext): string {
  // Check if it's a product variable (has dot but not a known category prefix)
  if (isProductVariable(key)) {
    const resolved = resolveProductVariable(key, context.products ?? []);
    if (resolved !== null) {
      return resolved;
    }
    // Return empty or placeholder for unresolved product variables
    return `{${key}}`;
  }

  // Try to resolve as static variable
  const staticValue = resolveStaticVariable(key, context);
  if (staticValue !== null) {
    return staticValue;
  }

  // Return original placeholder if not resolved
  return `{${key}}`;
}

/**
 * Resolve all variables in a text string
 *
 * @param text - Text containing variable placeholders like {client.name}
 * @param context - The data context for resolving values
 * @returns Text with all variables resolved
 */
export function resolveVariablesInText(text: string, context: VariableContext): string {
  // Match {variableKey} patterns
  const variablePattern = /\{([a-zA-Z0-9_.]+)\}/g;

  return text.replace(variablePattern, (match, key) => {
    return resolveVariable(key, context);
  });
}

/**
 * Build a variable context from FormBuilderData
 * This is useful for resolving variables in presentation preview
 */
export function buildContextFromFormData(
  formData: FormBuilderData,
  additionalContext?: Partial<VariableContext>
): VariableContext {
  return {
    products: formData.products.items,
    terms: {
      payment: formData.terms.paymentMilestones
        .map(m => `${m.percentage}% - ${m.trigger}`)
        .join('; ') || undefined,
      warranty: formData.terms.warranties
        .map(w => `${w.name}: ${w.quantity} ${w.unit}`)
        .join(', ') || undefined,
    },
    leadtimes: {
      total: formData.leadTimes.sections
        .flatMap(s => s.phases)
        .map(p => p.duration)
        .join(' + ') || undefined,
    },
    ...additionalContext,
  };
}

/**
 * Check if a variable key will resolve to a value
 */
export function canResolveVariable(key: string, context: VariableContext): boolean {
  const resolved = resolveVariable(key, context);
  // If it still has the curly braces, it wasn't resolved
  return !resolved.startsWith('{') || !resolved.endsWith('}');
}
