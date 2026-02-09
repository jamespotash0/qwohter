/**
 * useConfigSchema Hook
 *
 * React hook for managing product configuration schemas.
 * Handles:
 * - Fetching and resolving value set references (values_ref → config_value_sets)
 * - Cascading logic (filtering child values by parent selection)
 * - Visibility conditions (showing/hiding fields)
 * - Computed field evaluation
 * - Form validation
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { configValueSetsService } from '@/features/admin/services/configValueSetsService';
import type {
  ConfigSchema,
  OptionField,
  ResolvedOptionField,
  ResolvedConfigSchema,
  ResolvedValueOption,
  ConfigFormValues,
  ConfigValidationError,
  ConditionExpression,
  VisibilityCondition,
} from '@/lib/types/configSchema';
import {
  isStaticValuesRef,
  isCascadingValuesRef,
  getReferencedValueSetSlugs,
  normalizeInlineValues,
  filterValuesByCodes,
} from '@/lib/types/configSchema';
import type { ConfigValueSet, ValueOption } from '@/lib/types/configValueSet';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const configSchemaQueryKeys = {
  all: ['configSchema'] as const,
  valueSets: () => [...configSchemaQueryKeys.all, 'valueSets'] as const,
  valueSetsBySlug: (slugs: string[]) =>
    [...configSchemaQueryKeys.valueSets(), slugs.sort().join(',')] as const,
};

// =============================================================================
// HOOK TYPES
// =============================================================================

interface UseConfigSchemaOptions {
  /** The config schema to process */
  schema: ConfigSchema | null | undefined;
  /** Initial form values (for editing) */
  initialValues?: ConfigFormValues;
  /** Callback when form values change */
  onChange?: (values: ConfigFormValues) => void;
}

interface UseConfigSchemaResult {
  /** Resolved schema with all values fetched */
  resolvedSchema: ResolvedConfigSchema | null;
  /** Current form values */
  values: ConfigFormValues;
  /** Set a single field value */
  setValue: (field: string, value: ConfigFormValues[string]) => void;
  /** Set multiple field values */
  setValues: (values: Partial<ConfigFormValues>) => void;
  /** Reset form to initial/default values */
  resetValues: () => void;
  /** Get available options for a field (handles cascading) */
  getFieldOptions: (fieldKey: string) => ResolvedValueOption[];
  /** Check if a field is visible based on conditions */
  isFieldVisible: (fieldKey: string) => boolean;
  /** Validate all values */
  validate: () => ConfigValidationError[];
  /** Validate a single field */
  validateField: (fieldKey: string) => ConfigValidationError | null;
  /** Whether value sets are being fetched */
  isLoading: boolean;
  /** Error if value set fetch failed */
  error: Error | null;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useConfigSchema({
  schema,
  initialValues = {},
  onChange,
}: UseConfigSchemaOptions): UseConfigSchemaResult {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [values, setValuesState] = useState<ConfigFormValues>(() =>
    initializeValues(schema, initialValues)
  );

  // ---------------------------------------------------------------------------
  // FETCH VALUE SETS
  // ---------------------------------------------------------------------------

  // Extract all value set slugs referenced in the schema
  const valueSetsToFetch = useMemo(() => {
    if (!schema) return [];
    return getReferencedValueSetSlugs(schema);
  }, [schema]);

  // Fetch all referenced value sets in one query
  const {
    data: valueSets,
    isLoading,
    error,
  } = useQuery({
    queryKey: configSchemaQueryKeys.valueSetsBySlug(valueSetsToFetch),
    queryFn: async () => {
      if (valueSetsToFetch.length === 0) return new Map<string, ConfigValueSet>();

      console.log('[useConfigSchema] Fetching value sets:', valueSetsToFetch);
      const sets = await configValueSetsService.getValueSetsBySlugs(valueSetsToFetch);
      console.log('[useConfigSchema] Fetched value sets:', sets.map(s => ({ slug: s.slug, valueCount: s.values?.length })));

      // Create a map for quick lookup by slug
      const map = new Map<string, ConfigValueSet>();
      for (const set of sets) {
        map.set(set.slug, set);
      }
      return map;
    },
    enabled: valueSetsToFetch.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - value sets don't change often
  });

  // ---------------------------------------------------------------------------
  // RESOLVED SCHEMA
  // ---------------------------------------------------------------------------

  const resolvedSchema = useMemo((): ResolvedConfigSchema | null => {
    if (!schema) return null;

    console.log('[useConfigSchema] Resolving schema with', Object.keys(schema.options).length, 'options');
    console.log('[useConfigSchema] Available value sets:', valueSets instanceof Map ? Array.from(valueSets.keys()) : 'none');

    const resolvedOptions: Record<string, ResolvedOptionField> = {};

    for (const [key, field] of Object.entries(schema.options)) {
      resolvedOptions[key] = resolveOptionField(field, valueSets instanceof Map ? valueSets : new Map());
      if (field.values_ref) {
        console.log(`[useConfigSchema] Field "${key}": values_ref="${JSON.stringify(field.values_ref)}", resolved_values=${resolvedOptions[key].resolved_values.length}`);
      }
    }

    return {
      version: schema.version,
      options: resolvedOptions,
      groups: schema.groups || [],
    };
  }, [schema, valueSets]);

  // ---------------------------------------------------------------------------
  // VALUE MANAGEMENT
  // ---------------------------------------------------------------------------

  // Track if this is the first mount to avoid re-initialization loops
  const isFirstMount = useRef(true);
  const prevSchemaRef = useRef(schema);
  const prevValueSetsLoadedRef = useRef(false);

  // Initialize values when schema changes (not on initialValues changes to prevent loops)
  useEffect(() => {
    // Only re-initialize if schema actually changed, not on every render
    const schemaChanged = prevSchemaRef.current !== schema;
    prevSchemaRef.current = schema;

    if (schema && (isFirstMount.current || schemaChanged)) {
      setValuesState(initializeValues(schema, initialValues));
      isFirstMount.current = false;
    }
  }, [schema]); // Only depend on schema, not initialValues

  // Auto-apply default values for readonly fields when value sets finish loading
  // This handles fields with single allowed_code that should auto-select
  useEffect(() => {
    const valueSetsJustLoaded = !prevValueSetsLoadedRef.current && valueSets instanceof Map && valueSets.size > 0;
    prevValueSetsLoadedRef.current = valueSets instanceof Map && valueSets.size > 0;

    if (!schema || !valueSetsJustLoaded) return;

    console.log('[useConfigSchema] Value sets loaded, checking for auto-select fields...');

    setValuesState((prev) => {
      const updated = { ...prev };
      let hasChanges = false;

      for (const [key, field] of Object.entries(schema.options)) {
        // Skip if field already has a value
        if (updated[key] !== null && updated[key] !== undefined && updated[key] !== '') {
          continue;
        }

        // Auto-select for readonly fields with single allowed_code
        if (field.readonly && field.allowed_codes?.length === 1) {
          console.log(`[useConfigSchema] Auto-selecting readonly field "${key}" with single option: ${field.allowed_codes[0]}`);
          updated[key] = field.allowed_codes[0];
          hasChanges = true;
          continue;
        }

        // Auto-select for readonly fields with default_value
        if (field.readonly && field.default_value !== undefined) {
          console.log(`[useConfigSchema] Auto-applying default value for readonly field "${key}": ${field.default_value}`);
          updated[key] = field.default_value;
          hasChanges = true;
          continue;
        }

        // Auto-select if there's only one option available after filtering (only for required fields)
        if (field.values_ref && field.allowed_codes?.length === 1 && !field.depends_on && field.required) {
          console.log(`[useConfigSchema] Auto-selecting required field "${key}" with single allowed option: ${field.allowed_codes[0]}`);
          updated[key] = field.allowed_codes[0];
          hasChanges = true;
        }
      }

      return hasChanges ? updated : prev;
    });
  }, [schema, valueSets]);

  // Notify parent of changes (skip on first render to avoid unnecessary calls)
  const isFirstOnChange = useRef(true);
  useEffect(() => {
    if (isFirstOnChange.current) {
      isFirstOnChange.current = false;
      return;
    }
    onChange?.(values);
  }, [values, onChange]);

  const setValue = useCallback(
    (field: string, value: ConfigFormValues[string]) => {
      setValuesState((prev) => {
        const updated = { ...prev, [field]: value };

        // Clear dependent fields when parent changes
        if (schema) {
          for (const [childKey, childField] of Object.entries(schema.options)) {
            if (childField.depends_on === field) {
              updated[childKey] = null;
            }
          }
        }

        return updated;
      });
    },
    [schema]
  );

  const setValues = useCallback((newValues: Partial<ConfigFormValues>) => {
    setValuesState((prev) => {
      const updated: ConfigFormValues = { ...prev };
      for (const [key, value] of Object.entries(newValues)) {
        if (value !== undefined) {
          updated[key] = value;
        }
      }
      return updated;
    });
  }, []);

  const resetValues = useCallback(() => {
    if (schema) {
      setValuesState(initializeValues(schema, initialValues));
    }
  }, [schema, initialValues]);

  // ---------------------------------------------------------------------------
  // CASCADING / FIELD OPTIONS
  // ---------------------------------------------------------------------------

  const getFieldOptions = useCallback(
    (fieldKey: string): ResolvedValueOption[] => {
      if (!resolvedSchema) return [];

      const field = resolvedSchema.options[fieldKey];
      if (!field) return [];

      let options = field.resolved_values;

      // Handle cascading: filter by parent value's category
      if (field.depends_on && field.original_values_ref) {
        const parentValue = values[field.depends_on];
        console.log(`[useConfigSchema] getFieldOptions "${fieldKey}": depends_on="${field.depends_on}", parentValue="${parentValue}", values_ref="${field.original_values_ref}"`);

        if (isCascadingValuesRef(field.original_values_ref)) {
          // Cascading via multiple value sets (e.g., material_option depends on material_type)
          // The resolved_values should already be populated from the correct set based on parent
          const valueSetSlug = parentValue
            ? field.original_values_ref[String(parentValue)]
            : null;

          if (valueSetSlug && valueSets instanceof Map) {
            const valueSet = valueSets.get(valueSetSlug);
            if (valueSet) {
              options = convertToResolvedOptions(valueSet.values);
            }
          } else {
            options = [];
          }
        } else if (isStaticValuesRef(field.original_values_ref)) {
          // Cascading via category filtering (e.g., finish_color filtered by finish_style)
          if (parentValue && valueSets instanceof Map) {
            const valueSet = valueSets.get(field.original_values_ref);
            console.log(`[useConfigSchema] getFieldOptions "${fieldKey}": valueSet found=${!!valueSet}, valueCount=${valueSet?.values?.length}`);
            if (valueSet) {
              // Filter by category matching parent value (exact match, case-insensitive)
              const normalizedParent = String(parentValue).toUpperCase().trim();
              const filtered = valueSet.values.filter((v) => {
                if (!v.category) return false;
                const normalizedCategory = v.category.toUpperCase().trim();
                return normalizedCategory === normalizedParent;
              });
              console.log(`[useConfigSchema] getFieldOptions "${fieldKey}": filtered by category "${normalizedParent}", found ${filtered.length} options`);
              // Only return filtered values - empty array if no matches (don't fall back to all)
              options = convertToResolvedOptions(filtered);
            }
          } else if (!parentValue) {
            // Parent not selected yet - show empty options for dependent field
            console.log(`[useConfigSchema] getFieldOptions "${fieldKey}": parent not selected, showing empty options`);
            options = [];
          }
        }
      }

      // Apply allowed_codes / excluded_codes filtering
      const originalField = schema?.options[fieldKey];
      if (originalField) {
        options = filterValuesByCodes(
          options,
          originalField.allowed_codes,
          originalField.excluded_codes
        );
      }

      // Apply filter_by rules (conditional filtering)
      // Check filters array first (priority-based), then fallback to filter_by
      const filtersToCheck = originalField?.filters || (field.filter_by ? [field.filter_by] : []);

      for (const filterConfig of filtersToCheck) {
        const filterFieldValue = values[filterConfig.field];

        // Find the first matching rule in this filter
        const matchingRule = filterConfig.rules.find((rule) =>
          evaluateCondition(filterFieldValue, rule.when)
        );

        if (matchingRule) {
          // Found a match - apply this filter and stop checking others
          const allowedSet = new Set(matchingRule.show);
          options = options.filter((o) => allowedSet.has(o.code));
          break; // First matching filter wins
        }
      }

      return options;
    },
    [resolvedSchema, values, valueSets, schema]
  );

  // ---------------------------------------------------------------------------
  // VISIBILITY
  // ---------------------------------------------------------------------------

  const isFieldVisible = useCallback(
    (fieldKey: string): boolean => {
      if (!schema) return true;

      const field = schema.options[fieldKey];
      if (!field?.visible_when) return true;

      return evaluateVisibilityCondition(field.visible_when, values);
    },
    [schema, values]
  );

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  // Update computed field values when dependencies change
  useEffect(() => {
    if (!schema) return;

    const computedUpdates: Partial<ConfigFormValues> = {};
    let hasUpdates = false;

    for (const [key, field] of Object.entries(schema.options)) {
      if (field.type !== 'computed' || !field.compute_rules) continue;

      const computedValue = evaluateComputeRules(field.compute_rules, values);
      if (computedValue !== undefined && values[key] !== computedValue) {
        computedUpdates[key] = computedValue;
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      setValuesState((prev) => {
        const updated: ConfigFormValues = { ...prev };
        for (const [key, value] of Object.entries(computedUpdates)) {
          if (value !== undefined) {
            updated[key] = value;
          }
        }
        return updated;
      });
    }
  }, [schema, values]);

  // ---------------------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------------------

  const validateField = useCallback(
    (fieldKey: string): ConfigValidationError | null => {
      if (!schema) return null;

      const field = schema.options[fieldKey];
      if (!field) return null;

      // Skip validation for hidden fields
      if (!isFieldVisible(fieldKey)) return null;

      const value = values[fieldKey];

      // Required validation
      if (field.required && (value === null || value === undefined || value === '')) {
        return {
          field: fieldKey,
          message: `${field.label} is required`,
          type: 'required',
        };
      }

      // Number validations
      if (field.type === 'number' && typeof value === 'number') {
        if (field.min !== undefined && value < field.min) {
          return {
            field: fieldKey,
            message: `${field.label} must be at least ${field.min}`,
            type: 'min',
          };
        }
        if (field.max !== undefined && value > field.max) {
          return {
            field: fieldKey,
            message: `${field.label} must be at most ${field.max}`,
            type: 'max',
          };
        }
      }

      // Text validations
      if ((field.type === 'text' || field.type === 'textarea') && typeof value === 'string') {
        if (field.min_length !== undefined && value.length < field.min_length) {
          return {
            field: fieldKey,
            message: `${field.label} must be at least ${field.min_length} characters`,
            type: 'min',
          };
        }
        if (field.max_length !== undefined && value.length > field.max_length) {
          return {
            field: fieldKey,
            message: `${field.label} must be at most ${field.max_length} characters`,
            type: 'max',
          };
        }
        if (field.pattern) {
          const regex = new RegExp(field.pattern);
          if (!regex.test(value)) {
            return {
              field: fieldKey,
              message: `${field.label} has an invalid format`,
              type: 'pattern',
            };
          }
        }
      }

      return null;
    },
    [schema, values, isFieldVisible]
  );

  const validate = useCallback((): ConfigValidationError[] => {
    if (!schema) return [];

    const errors: ConfigValidationError[] = [];

    for (const fieldKey of Object.keys(schema.options)) {
      const error = validateField(fieldKey);
      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }, [schema, validateField]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    resolvedSchema,
    values,
    setValue,
    setValues,
    resetValues,
    getFieldOptions,
    isFieldVisible,
    validate,
    validateField,
    isLoading,
    error: error as Error | null,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Initialize form values from schema defaults and initial values
 */
function initializeValues(
  schema: ConfigSchema | null | undefined,
  initialValues: ConfigFormValues
): ConfigFormValues {
  if (!schema) return { ...initialValues };

  const values: ConfigFormValues = {};

  for (const [key, field] of Object.entries(schema.options)) {
    // Use initial value if provided
    if (key in initialValues && initialValues[key] !== null && initialValues[key] !== undefined) {
      values[key] = initialValues[key];
      continue;
    }

    // For readonly fields with default_value, always apply it
    if (field.readonly && field.default_value !== undefined) {
      values[key] = field.default_value;
      continue;
    }

    // For readonly fields with single allowed_code, auto-select it
    if (field.readonly && field.allowed_codes?.length === 1 && field.allowed_codes[0]) {
      values[key] = field.allowed_codes[0];
      continue;
    }

    // For non-readonly fields with default_value
    if (field.default_value !== undefined) {
      values[key] = field.default_value;
      continue;
    }

    // Default to null
    values[key] = null;
  }

  return values;
}

/**
 * Resolve an option field by fetching its values from value sets
 */
function resolveOptionField(
  field: OptionField,
  valueSets: Map<string, ConfigValueSet>
): ResolvedOptionField {
  let resolvedValues: ResolvedValueOption[] = [];

  if (field.values) {
    // Inline values
    resolvedValues = normalizeInlineValues(field.values);
  } else if (field.values_ref) {
    if (isStaticValuesRef(field.values_ref)) {
      // Static reference to a single value set
      const valueSet = valueSets.get(field.values_ref);
      if (valueSet) {
        resolvedValues = convertToResolvedOptions(valueSet.values);
      }
    } else if (isCascadingValuesRef(field.values_ref)) {
      // Cascading reference - values will be resolved at runtime based on parent value
      // For now, collect all possible values for type-ahead/search purposes
      const allValues: ResolvedValueOption[] = [];
      for (const slug of Object.values(field.values_ref)) {
        const valueSet = valueSets.get(slug);
        if (valueSet) {
          allValues.push(...convertToResolvedOptions(valueSet.values));
        }
      }
      resolvedValues = allValues;
    }
  }

  // Sort by sort_order then label
  resolvedValues.sort((a, b) => {
    const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.label.localeCompare(b.label);
  });

  // Return resolved field without values_ref
  const { values_ref, ...restField } = field;
  return {
    ...restField,
    resolved_values: resolvedValues,
    original_values_ref: values_ref,
  };
}

/**
 * Convert ValueOption array to ResolvedValueOption array
 */
function convertToResolvedOptions(values: ValueOption[]): ResolvedValueOption[] {
  return values.map((v) => ({
    code: v.code,
    label: v.label,
    hex: v.hex,
    image_url: v.image_url,
    description: v.description,
    sort_order: v.sort_order,
    metadata: v.metadata,
  }));
}

/**
 * Evaluate a condition expression against a value
 */
function evaluateCondition(
  value: ConfigFormValues[string],
  condition: ConditionExpression
): boolean {
  // Handle is_set check first (before null check)
  if (condition.is_set !== undefined) {
    const hasValue = value !== null && value !== undefined && value !== '';
    return condition.is_set ? hasValue : !hasValue;
  }

  if (value === null || value === undefined) return false;

  if (condition['=='] !== undefined) {
    return value === condition['=='];
  }
  if (condition['!='] !== undefined) {
    return value !== condition['!='];
  }
  if (condition['>'] !== undefined && typeof value === 'number') {
    return value > condition['>'];
  }
  if (condition['<'] !== undefined && typeof value === 'number') {
    return value < condition['<'];
  }
  if (condition['>='] !== undefined && typeof value === 'number') {
    return value >= condition['>='];
  }
  if (condition['<='] !== undefined && typeof value === 'number') {
    return value <= condition['<='];
  }
  if (condition['in'] !== undefined) {
    return condition['in'].includes(value as string | number);
  }
  if (condition['not_in'] !== undefined) {
    return !condition['not_in'].includes(value as string | number);
  }

  return false;
}

/**
 * Evaluate visibility condition for a field
 */
function evaluateVisibilityCondition(
  condition: VisibilityCondition,
  values: ConfigFormValues
): boolean {
  const fieldValue = values[condition.field];
  const targetValue = condition.value;

  switch (condition.operator) {
    case '==':
      return fieldValue === targetValue;
    case '!=':
      return fieldValue !== targetValue;
    case '>':
      return typeof fieldValue === 'number' && fieldValue > (targetValue as number);
    case '<':
      return typeof fieldValue === 'number' && fieldValue < (targetValue as number);
    case '>=':
      return typeof fieldValue === 'number' && fieldValue >= (targetValue as number);
    case '<=':
      return typeof fieldValue === 'number' && fieldValue <= (targetValue as number);
    case 'in':
      return Array.isArray(targetValue) && targetValue.includes(fieldValue as any);
    case 'not_in':
      return Array.isArray(targetValue) && !targetValue.includes(fieldValue as any);
    case 'is_set':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    case 'is_not_set':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    default:
      return true;
  }
}

/**
 * Evaluate compute rules to get a computed field value
 */
function evaluateComputeRules(
  rules: Array<{
    when?: Record<string, ConditionExpression>;
    value: string | number;
    default?: boolean;
  }>,
  values: ConfigFormValues
): string | number | undefined {
  // Find the first matching rule
  for (const rule of rules) {
    if (rule.when) {
      // Check all conditions
      const allMatch = Object.entries(rule.when).every(([field, condition]) =>
        evaluateCondition(values[field], condition)
      );
      if (allMatch) {
        return rule.value;
      }
    } else if (rule.default) {
      // Default rule (no condition)
      return rule.value;
    }
  }

  // No rule matched, return undefined
  return undefined;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type {
  UseConfigSchemaOptions,
  UseConfigSchemaResult,
};
