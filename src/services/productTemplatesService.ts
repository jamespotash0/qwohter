/**
 * Product Templates Service
 *
 * Service for fetching and managing product configuration templates.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ProductTemplate,
  TemplateListItem,
  FetchTemplateParams,
  ConfiguratorSelections,
  PriceModifier,
  ValidationRule,
  ValidationError,
  OptionDefinition,
} from '@/lib/types/productTemplates';

// =============================================================================
// Fetch Operations
// =============================================================================

/**
 * Fetch a single product template by ID or hierarchy
 */
export async function fetchProductTemplate(
  params: FetchTemplateParams
): Promise<ProductTemplate | null> {
  let query = (supabase.from('product_templates') as any)
    .select('*')
    .eq('is_active', true);

  if (params.id) {
    query = query.eq('id', params.id);
  } else {
    if (params.manufacturer) query = query.eq('manufacturer', params.manufacturer);
    if (params.domain) query = query.eq('domain', params.domain);
    if (params.series) query = query.eq('series', params.series);
    if (params.model) query = query.eq('model', params.model);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error('[productTemplatesService] Fetch error:', error);
    return null;
  }

  return data as ProductTemplate;
}

/**
 * Fetch list of available templates (for selector)
 */
export async function fetchTemplateList(
  filters?: { manufacturer?: string; domain?: string }
): Promise<TemplateListItem[]> {
  let query = (supabase.from('product_templates') as any)
    .select('id, manufacturer, domain, series, model, name, description, image_url, base_price, is_active')
    .eq('is_active', true)
    .order('manufacturer')
    .order('domain')
    .order('name');

  if (filters?.manufacturer) {
    query = query.eq('manufacturer', filters.manufacturer);
  }
  if (filters?.domain) {
    query = query.eq('domain', filters.domain);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[productTemplatesService] List fetch error:', error);
    return [];
  }

  return (data || []) as TemplateListItem[];
}

/**
 * Fetch unique manufacturers
 */
export async function fetchManufacturers(): Promise<string[]> {
  const { data, error } = await (supabase.from('product_templates') as any)
    .select('manufacturer')
    .eq('is_active', true)
    .order('manufacturer');

  if (error) {
    console.error('[productTemplatesService] Manufacturers fetch error:', error);
    return [];
  }

  // Get unique manufacturers
  const manufacturers = [...new Set((data || []).map((d: { manufacturer: string }) => d.manufacturer))];
  return manufacturers as string[];
}

/**
 * Fetch unique domains (optionally filtered by manufacturer)
 */
export async function fetchDomains(manufacturer?: string): Promise<string[]> {
  let query = (supabase.from('product_templates') as any)
    .select('domain')
    .eq('is_active', true)
    .order('domain');

  if (manufacturer) {
    query = query.eq('manufacturer', manufacturer);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[productTemplatesService] Domains fetch error:', error);
    return [];
  }

  // Get unique domains
  const domains = [...new Set((data || []).map((d: { domain: string }) => d.domain))];
  return domains as string[];
}

// =============================================================================
// Price Calculation
// =============================================================================

/**
 * Calculate total price based on selections and modifiers
 */
export function calculatePrice(
  template: ProductTemplate,
  selections: ConfiguratorSelections
): { totalPrice: number; unitPrice: number; breakdown: PriceBreakdownItem[] } {
  const quantity = Number(selections.quantity) || 1;
  let unitPrice = template.base_price;
  const breakdown: PriceBreakdownItem[] = [
    { label: 'Base Price', amount: template.base_price, type: 'base' }
  ];

  // Add option price modifiers from config_data
  const options = template.config_data.options || {};

  for (const [optionKey, optionValues] of Object.entries(options)) {
    const selectedValue = selections[optionKey];
    if (!selectedValue) continue;

    const selectedOption = (optionValues as OptionDefinition[]).find(
      opt => opt.code === selectedValue
    );

    if (selectedOption && selectedOption.price_modifier) {
      const modifierType = selectedOption.modifier_type || 'fixed';
      let adjustment: number;

      if (modifierType === 'percentage') {
        adjustment = template.base_price * selectedOption.price_modifier;
      } else {
        adjustment = selectedOption.price_modifier;
      }

      unitPrice += adjustment;
      breakdown.push({
        label: selectedOption.label,
        amount: adjustment,
        type: 'option'
      });
    }
  }

  // Apply custom price modifiers
  for (const modifier of template.price_modifiers || []) {
    const selectedValue = selections[modifier.condition_field];
    const conditionMet = checkCondition(selectedValue, modifier);

    if (conditionMet) {
      let adjustment: number;

      if (modifier.adjustment_type === 'percentage') {
        adjustment = template.base_price * modifier.price_adjustment;
      } else {
        adjustment = modifier.price_adjustment;
      }

      unitPrice += adjustment;
      breakdown.push({
        label: modifier.description || `${modifier.condition_field} adjustment`,
        amount: adjustment,
        type: 'modifier'
      });
    }
  }

  const totalPrice = unitPrice * quantity;

  return {
    totalPrice: Math.round(totalPrice * 100) / 100,
    unitPrice: Math.round(unitPrice * 100) / 100,
    breakdown
  };
}

interface PriceBreakdownItem {
  label: string;
  amount: number;
  type: 'base' | 'option' | 'modifier' | 'discount';
}

function checkCondition(
  selectedValue: string | number | boolean | null | undefined,
  modifier: PriceModifier
): boolean {
  const operator = modifier.condition_operator || 'equals';
  const conditionValue = modifier.condition_value;

  switch (operator) {
    case 'equals':
      return selectedValue === conditionValue;
    case 'not_equals':
      return selectedValue !== conditionValue;
    case 'greater_than':
      return Number(selectedValue) > Number(conditionValue);
    case 'less_than':
      return Number(selectedValue) < Number(conditionValue);
    case 'contains':
      return String(selectedValue).includes(String(conditionValue));
    default:
      return selectedValue === conditionValue;
  }
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate selections against template rules
 */
export function validateSelections(
  template: ProductTemplate,
  selections: ConfiguratorSelections
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const rule of template.validation_rules || []) {
    const value = selections[rule.field];
    const error = checkValidationRule(rule, value);

    if (error) {
      errors.push({ field: rule.field, message: error });
    }
  }

  return errors;
}

function checkValidationRule(
  rule: ValidationRule,
  value: unknown
): string | null {
  const ruleType = rule.rule.split(':')[0];
  const ruleParam = rule.rule.split(':')[1];

  switch (ruleType) {
    case 'required':
      if (value === null || value === undefined || value === '') {
        return rule.message;
      }
      break;

    case 'min':
      if (Number(value) < Number(ruleParam)) {
        return rule.message;
      }
      break;

    case 'max':
      if (Number(value) > Number(ruleParam)) {
        return rule.message;
      }
      break;

    case 'min_length':
      if (String(value).length < Number(ruleParam)) {
        return rule.message;
      }
      break;

    case 'max_length':
      if (String(value).length > Number(ruleParam)) {
        return rule.message;
      }
      break;

    case 'pattern':
      const regex = new RegExp(ruleParam);
      if (!regex.test(String(value))) {
        return rule.message;
      }
      break;
  }

  return null;
}

// =============================================================================
// Cascading Logic
// =============================================================================

/**
 * Get available options based on current selections (for cascading dropdowns)
 */
export function getAvailableOptions(
  template: ProductTemplate,
  optionKey: string,
  selections: ConfiguratorSelections
): OptionDefinition[] {
  const allOptions = template.config_data.options?.[optionKey] || [];

  // Filter based on available_for criteria
  return allOptions.filter(option => {
    const availableFor = option.available_for;

    // If no restriction, always available
    if (!availableFor || availableFor === 'all') {
      return true;
    }

    // Check parent selections
    const cascadeConfig = template.cascades || {};
    const parentFields = Object.entries(cascadeConfig)
      .filter(([, children]) => children.includes(optionKey))
      .map(([parent]) => parent);

    for (const parentField of parentFields) {
      const parentValue = selections[parentField];

      if (Array.isArray(availableFor)) {
        if (!availableFor.includes(String(parentValue))) {
          return false;
        }
      } else if (availableFor !== parentValue) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get fields that should be reset when a parent field changes
 */
export function getFieldsToReset(
  template: ProductTemplate,
  changedField: string
): string[] {
  const cascades = template.cascades || {};
  const fieldsToReset: string[] = [];

  // Direct children
  const directChildren = cascades[changedField] || [];
  fieldsToReset.push(...directChildren);

  // Recursively get grandchildren
  for (const child of directChildren) {
    const grandchildren = getFieldsToReset(template, child);
    fieldsToReset.push(...grandchildren);
  }

  return [...new Set(fieldsToReset)]; // Remove duplicates
}

// =============================================================================
// Label Resolution
// =============================================================================

/**
 * Get display labels for current selections
 */
export function getSelectionLabels(
  template: ProductTemplate,
  selections: ConfiguratorSelections
): Record<string, string> {
  const labels: Record<string, string> = {};
  const options = template.config_data.options || {};

  for (const [key, value] of Object.entries(selections)) {
    if (value === null || value === undefined) continue;

    const optionList = options[key] as OptionDefinition[] | undefined;
    if (optionList) {
      const selectedOption = optionList.find(opt => opt.code === value);
      if (selectedOption) {
        labels[`${key}_label`] = selectedOption.label;
      }
    }
  }

  return labels;
}
