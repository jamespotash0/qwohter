/**
 * Template Markers Utility
 *
 * This utility provides semantic markup for quote templates, allowing us to:
 * - Mark dynamic values with explicit data bindings
 * - Mark conditional static text with dependencies
 * - Re-evaluate conditionals when data changes
 * - Preserve user edits while updating computed values
 */

import type {
  ContentType,
  DynamicValueConfig,
  ConditionalConfig,
  ParsedMarkedElement,
  ReEvaluationOptions,
} from '@/lib/types/template/semanticMarkup';
import { formatDateEST } from '@/utils/dateUtils';

/**
 * Escape HTML to prevent XSS when embedding in attributes
 */
const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * Escape quotes for use in HTML attributes
 */
const escapeAttribute = (str: string): string => {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

/**
 * Format a value according to the specified format
 */
const formatValue = (value: string | number, format?: string): string => {
  if (!format) return String(value);

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(Number(value));

    case 'date': {
      const dateString = String(value);
      if (!dateString) return '-';

      // Handle YYYY-MM-DD format (standard database format)
      const parts = dateString.split('-');
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const isoDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}T12:00:00Z`;
        return formatDateEST(isoDate, { year: 'numeric', month: 'long', day: 'numeric' });
      }

      // Otherwise pass to formatDateEST as-is
      return formatDateEST(dateString, { year: 'numeric', month: 'long', day: 'numeric' });
    }

    case 'number':
      return new Intl.NumberFormat('en-US').format(Number(value));

    default:
      return String(value);
  }
};

/**
 * Get a nested value from an object using a dot-notation path
 */
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    return current?.[key];
  }, obj);
};

/**
 * TemplateMarkers - Core utility for semantic markup
 */
export class TemplateMarkers {
  /**
   * Mark a dynamic value in the template
   *
   * @example
   * const name = TemplateMarkers.dynamic({
   *   path: 'quote_details.contactName',
   *   value: 'John Doe'
   * });
   * // Returns: <span data-type="dynamic" data-value="quote_details.contactName">John Doe</span>
   */
  static dynamic(config: DynamicValueConfig): string {
    const formattedValue = formatValue(config.value, config.format);
    const escapedValue = escapeHtml(formattedValue);

    const attributes = [
      'data-type="dynamic"',
      `data-value="${escapeAttribute(config.path)}"`,
    ];

    if (config.format) {
      attributes.push(`data-format="${escapeAttribute(config.format)}"`);
    }

    attributes.push(`data-original-value="${escapeAttribute(formattedValue)}"`);

    return `<span ${attributes.join(' ')}>${escapedValue}</span>`;
  }

  /**
   * Mark conditional static text in the template
   *
   * @example
   * const text = TemplateMarkers.conditional({
   *   expression: 'panelCount > 1 ? "panels" : "panel"',
   *   result: 'panels',
   *   dependencies: ['wall_details.panelCount']
   * });
   * // Returns: <span data-type="conditional" data-conditional="..." data-deps="...">panels</span>
   */
  static conditional(config: ConditionalConfig): string {
    const escapedResult = escapeHtml(config.result);

    const attributes = [
      'data-type="conditional"',
      `data-conditional="${escapeAttribute(config.expression)}"`,
      `data-deps="${escapeAttribute(config.dependencies.join(','))}"`,
      `data-original-value="${escapeAttribute(config.result)}"`,
    ];

    return `<span ${attributes.join(' ')}>${escapedResult}</span>`;
  }

  /**
   * Parse marked HTML and extract all marked elements
   */
  static parseMarkedHTML(html: string): ParsedMarkedElement[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const markedElements = doc.querySelectorAll('[data-type]');

    const parsed: ParsedMarkedElement[] = [];

    markedElements.forEach((element) => {
      if (!(element instanceof HTMLElement)) return;

      const type = element.getAttribute('data-type') as ContentType;
      const isUserEdited = element.getAttribute('data-user-edited') === 'true';
      const originalValue = element.getAttribute('data-original-value') || undefined;

      const base = {
        element,
        type,
        currentValue: element.textContent || '',
        isUserEdited,
        originalValue,
      };

      if (type === 'dynamic') {
        parsed.push({
          ...base,
          valuePath: element.getAttribute('data-value') || undefined,
          format: element.getAttribute('data-format') || undefined,
        });
      } else if (type === 'conditional') {
        const deps = element.getAttribute('data-deps');
        parsed.push({
          ...base,
          conditionalExpression: element.getAttribute('data-conditional') || undefined,
          dependencies: deps ? deps.split(',') : undefined,
        });
      }
    });

    return parsed;
  }

  /**
   * Re-evaluate marked HTML with updated form data
   *
   * This is the core function that:
   * 1. Parses HTML for marked elements
   * 2. Re-evaluates dynamic values and conditionals
   * 3. Preserves user edits (unless explicitly overridden)
   * 4. Returns updated HTML
   */
  static reEvaluate(
    html: string,
    formData: any,
    options: ReEvaluationOptions = {}
  ): string {
    const { preserveUserEdits = true, updateOriginalValues = true } = options;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const markedElements = doc.querySelectorAll('[data-type]');

    markedElements.forEach((element) => {
      if (!(element instanceof HTMLElement)) return;

      const type = element.getAttribute('data-type') as ContentType;
      const isUserEdited = element.getAttribute('data-user-edited') === 'true';

      // Skip user-edited elements if preserveUserEdits is true
      if (preserveUserEdits && isUserEdited) {
        return;
      }

      if (type === 'dynamic') {
        this.reEvaluateDynamic(element, formData, updateOriginalValues);
      } else if (type === 'conditional') {
        this.reEvaluateConditional(element, formData, updateOriginalValues);
      }
    });

    return doc.body.innerHTML;
  }

  /**
   * Re-evaluate a dynamic value element
   */
  private static reEvaluateDynamic(
    element: HTMLElement,
    formData: any,
    updateOriginalValue: boolean
  ): void {
    const valuePath = element.getAttribute('data-value');
    const format = element.getAttribute('data-format') || undefined;

    if (!valuePath) return;

    const newValue = getNestedValue(formData, valuePath);
    if (newValue === undefined || newValue === null) return;

    const formattedValue = formatValue(newValue, format);
    element.textContent = formattedValue;

    if (updateOriginalValue) {
      element.setAttribute('data-original-value', formattedValue);
    }
  }

  /**
   * Re-evaluate a conditional element
   *
   * This handles smart replacement:
   * - If user hasn't edited: replace entirely
   * - If user has edited: try to replace just the conditional part
   */
  private static reEvaluateConditional(
    element: HTMLElement,
    formData: any,
    updateOriginalValue: boolean
  ): void {
    const expression = element.getAttribute('data-conditional');
    const depsStr = element.getAttribute('data-deps');
    const originalValue = element.getAttribute('data-original-value');

    if (!expression || !depsStr) return;

    const dependencies = depsStr.split(',');

    // Evaluate the conditional expression
    const newResult = this.evaluateConditionalExpression(
      expression,
      formData,
      dependencies
    );

    if (newResult === null) return;

    const currentValue = element.textContent || '';
    const isUserEdited = element.getAttribute('data-user-edited') === 'true';

    if (isUserEdited && originalValue) {
      // Edge Case Fix #3: Global replace for multiple occurrences
      // Smart replacement: try to replace ALL occurrences of old conditional value with new one
      const escapedOriginal = originalValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const globalRegex = new RegExp(escapedOriginal, 'g');
      const updatedValue = currentValue.replace(globalRegex, newResult);
      element.textContent = updatedValue;

      // Log if no replacement was made (user might have completely rewritten)
      if (updatedValue === currentValue && originalValue !== newResult) {
        console.warn(`[TemplateMarkers] Could not find "${originalValue}" in user-edited text "${currentValue}". Text will not be updated.`);
      }
    } else {
      // Direct replacement for computed values
      element.textContent = newResult;
    }

    if (updateOriginalValue) {
      element.setAttribute('data-original-value', newResult);
    }
  }

  /**
   * Evaluate a conditional expression
   *
   * This safely evaluates expressions like:
   * - "panelCount > 1 ? 'panels' : 'panel'"
   * - "wallCount === 1 ? 'wall system' : 'wall systems'"
   */
  private static evaluateConditionalExpression(
    expression: string,
    formData: any,
    dependencies: string[]
  ): string | null {
    try {
      // Extract dependency values
      const dependencyValues: Record<string, any> = {};
      dependencies.forEach((dep) => {
        const value = getNestedValue(formData, dep);
        // Get the last part of the path as the variable name
        const varName = dep.split('.').pop() || dep;
        dependencyValues[varName] = value;
      });

      // Create a safe evaluation context
      // We'll parse common patterns instead of using eval()
      const result = this.safeEvaluateExpression(expression, dependencyValues);
      return result;
    } catch (error) {
      console.error('Failed to evaluate conditional expression:', expression, error);
      return null;
    }
  }

  /**
   * Safely evaluate common conditional expressions without eval()
   *
   * Supports patterns like:
   * - "count > 1 ? 'plural' : 'singular'"
   * - "count === 1 ? 'singular' : 'plural'"
   */
  private static safeEvaluateExpression(
    expression: string,
    variables: Record<string, any>
  ): string | null {
    // Remove whitespace for easier parsing
    const expr = expression.trim();

    // Match ternary pattern: condition ? trueValue : falseValue
    const ternaryMatch = expr.match(/^(.+?)\s*\?\s*['"](.+?)['"]\s*:\s*['"](.+?)['"]$/);

    if (!ternaryMatch) {
      console.warn('Unsupported expression pattern:', expression);
      return null;
    }

    const [, condition, trueValue, falseValue] = ternaryMatch;

    // Evaluate the condition
    const conditionResult = this.evaluateCondition(condition, variables);

    if (conditionResult === null) {
      return null;
    }

    return conditionResult ? trueValue : falseValue;
  }

  /**
   * Evaluate a condition like "count > 1" or "count === 1"
   *
   * Edge Case Fix #1: Handles null/undefined values gracefully
   */
  private static evaluateCondition(
    condition: string,
    variables: Record<string, any>
  ): boolean | null {
    const cond = condition.trim();

    // Match patterns: varName operator value
    const patterns = [
      { regex: /^(\w+)\s*>\s*(\d+)$/, op: (a: number, b: number) => a > b },
      { regex: /^(\w+)\s*>=\s*(\d+)$/, op: (a: number, b: number) => a >= b },
      { regex: /^(\w+)\s*<\s*(\d+)$/, op: (a: number, b: number) => a < b },
      { regex: /^(\w+)\s*<=\s*(\d+)$/, op: (a: number, b: number) => a <= b },
      { regex: /^(\w+)\s*===\s*(\d+)$/, op: (a: number, b: number) => a === b },
      { regex: /^(\w+)\s*!==\s*(\d+)$/, op: (a: number, b: number) => a !== b },
      { regex: /^(\w+)\s*==\s*(\d+)$/, op: (a: number, b: number) => a == b },
      { regex: /^(\w+)\s*!=\s*(\d+)$/, op: (a: number, b: number) => a != b },
    ];

    for (const { regex, op } of patterns) {
      const match = cond.match(regex);
      if (match) {
        const [, varName, valueStr] = match;
        const varValue = variables[varName];
        const compareValue = parseFloat(valueStr);

        // Edge Case #1: Handle null/undefined/NaN values
        if (varValue === undefined || varValue === null) {
          console.warn(`[TemplateMarkers] Variable "${varName}" is ${varValue}, skipping conditional evaluation for: "${condition}"`);
          return null;
        }

        if (isNaN(compareValue)) {
          console.warn(`[TemplateMarkers] Invalid comparison value in condition: "${condition}"`);
          return null;
        }

        // Convert to number and compare
        const numericValue = Number(varValue);
        if (isNaN(numericValue)) {
          console.warn(`[TemplateMarkers] Variable "${varName}" cannot be converted to number (value: ${varValue}), skipping evaluation`);
          return null;
        }

        return op(numericValue, compareValue);
      }
    }

    console.warn('Unsupported condition pattern:', condition);
    return null;
  }

  /**
   * Mark an element as user-edited
   *
   * This is called by the editor when the user manually modifies content
   */
  static markAsUserEdited(html: string, elementSelector: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const element = doc.querySelector(elementSelector);

    if (element instanceof HTMLElement && element.hasAttribute('data-type')) {
      element.setAttribute('data-user-edited', 'true');
    }

    return doc.body.innerHTML;
  }

  /**
   * Reset a user-edited element back to computed value
   *
   * This is called when the user clicks "Reset to Computed"
   */
  static resetToComputed(html: string, elementSelector: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const element = doc.querySelector(elementSelector);

    if (element instanceof HTMLElement && element.hasAttribute('data-type')) {
      const originalValue = element.getAttribute('data-original-value');
      if (originalValue) {
        element.textContent = originalValue;
      }
      element.removeAttribute('data-user-edited');
    }

    return doc.body.innerHTML;
  }

  /**
   * Check if HTML contains any marked elements
   */
  static hasMarkedElements(html: string): boolean {
    return html.includes('data-type="dynamic"') || html.includes('data-type="conditional"');
  }

  /**
   * Strip all semantic markup from HTML (for export/email)
   *
   * This removes all data-* attributes but keeps the text content
   */
  static stripMarkup(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const markedElements = doc.querySelectorAll('[data-type]');

    markedElements.forEach((element) => {
      if (!(element instanceof HTMLElement)) return;

      // Remove all data attributes
      element.removeAttribute('data-type');
      element.removeAttribute('data-value');
      element.removeAttribute('data-format');
      element.removeAttribute('data-conditional');
      element.removeAttribute('data-deps');
      element.removeAttribute('data-user-edited');
      element.removeAttribute('data-original-value');

      // If the span has no other attributes, replace it with just its text content
      if (element.attributes.length === 0 && element.tagName === 'SPAN') {
        const textNode = doc.createTextNode(element.textContent || '');
        element.parentNode?.replaceChild(textNode, element);
      }
    });

    return doc.body.innerHTML;
  }

  /**
   * Edge Case Fix #8: Debounced re-evaluation
   *
   * Prevents race conditions when user is typing while data changes trigger re-evaluation
   *
   * @param delay - Milliseconds to wait before re-evaluating (default: 300ms)
   */
  private static debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  static reEvaluateDebounced(
    html: string,
    formData: any,
    options: ReEvaluationOptions = {},
    delay: number = 300
  ): Promise<string> {
    return new Promise((resolve) => {
      // Clear existing timer for this HTML
      const key = 'reEvaluate';
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = setTimeout(() => {
        const result = this.reEvaluate(html, formData, options);
        this.debounceTimers.delete(key);
        resolve(result);
      }, delay);

      this.debounceTimers.set(key, timer);
    });
  }

  /**
   * Edge Case Fix #12: XSS Protection Verification
   *
   * Ensures that conditional results cannot contain executable code
   * All results are rendered as text, never as HTML
   */
  static sanitizeConditionalResult(result: string): string {
    // Edge Case #12: Prevent XSS in conditional results
    // Even though we use textContent (not innerHTML), double-check for safety

    // Check for dangerous patterns
    const dangerousPatterns = [
      /<script[^>]*>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(result)) {
        console.error(`[TemplateMarkers] XSS attempt detected in conditional result: "${result}"`);
        // Return empty string if dangerous content detected
        return '';
      }
    }

    return result;
  }
}
