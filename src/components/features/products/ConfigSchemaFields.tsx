/**
 * Config Schema Fields
 * Renders dynamic configuration fields based on a model's config_schema
 *
 * Uses the useConfigSchema hook for:
 * - Fetching and resolving value set references
 * - Cascading logic (filtering child values by parent selection)
 * - Visibility conditions
 * - Computed field evaluation
 */

import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfigSchema } from '@/hooks/useConfigSchema';
import type { ConfigSchema, ConfigFormValues, ResolvedOptionField, ResolvedValueOption, MaxValidationRule, ConditionExpression } from '@/lib/types/configSchema';

interface ConfigSchemaFieldsProps {
  /** The config schema to render */
  schema: ConfigSchema | null | undefined;
  /** Current form values */
  values: ConfigFormValues;
  /** Callback when values change */
  onChange: (values: ConfigFormValues) => void;
  /** Optional class name */
  className?: string;
}

export function ConfigSchemaFields({
  schema,
  values,
  onChange,
  className,
}: ConfigSchemaFieldsProps) {
  const {
    resolvedSchema,
    setValue,
    getFieldOptions,
    isFieldVisible,
    isLoading,
  } = useConfigSchema({
    schema,
    initialValues: values,
    onChange,
  });

  // Get all visible fields sorted by order (flat list, no grouping)
  const sortedFields = useMemo(() => {
    if (!resolvedSchema) return [];

    const fields = Object.entries(resolvedSchema.options);

    // Build a map of field key to schema position (for fallback ordering)
    const schemaPositionMap = new Map<string, number>();
    fields.forEach(([key], idx) => schemaPositionMap.set(key, idx));

    // Filter visible fields
    const visibleFields = fields.filter(([key]) => isFieldVisible(key));

    // Sort fields by order (use schema position as fallback)
    visibleFields.sort((a, b) => {
      const orderA = a[1].order ?? ((schemaPositionMap.get(a[0]) ?? 0) + 100);
      const orderB = b[1].order ?? ((schemaPositionMap.get(b[0]) ?? 0) + 100);
      return orderA - orderB;
    });

    return visibleFields;
  }, [resolvedSchema, isFieldVisible]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-gray-500', className)}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading options...</span>
      </div>
    );
  }

  if (!resolvedSchema || sortedFields.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {/* All fields in a flat 4-column grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedFields.map(([key, field]) => {
          // Check for max validation error
          const maxError = getMaxValidationError(field, values[key], values);

          return (
            <div key={key} className={cn('space-y-1', getGridColClass(field.grid_span))}>
              <FieldLabel field={field} fieldKey={key} />
              <FieldInput
                fieldKey={key}
                field={field}
                value={values[key]}
                options={getFieldOptions(key)}
                onChange={(value) => setValue(key, value)}
                hasError={!!maxError}
              />
              {/* Max validation error - only show when value exceeds max */}
              {maxError && (
                <div className="px-2 py-1.5 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-[11px] text-red-600 dark:text-red-400 leading-tight">
                    {maxError}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function FieldLabel({ field, fieldKey }: { field: ResolvedOptionField; fieldKey: string }) {
  return (
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {field.label || fieldKey}
      {field.required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

interface FieldInputProps {
  fieldKey: string;
  field: ResolvedOptionField;
  value: ConfigFormValues[string];
  options: ResolvedValueOption[];
  onChange: (value: ConfigFormValues[string]) => void;
  hasError?: boolean;
}

function FieldInput({
  fieldKey,
  field,
  value,
  options,
  onChange,
  hasError = false,
}: FieldInputProps) {
  // Auto-readonly: required fields with exactly 1 allowed_code in schema, no dependencies or filters
  // This means the field value is fixed by schema definition, not by runtime filtering
  const isAutoReadonly =
    field.required &&
    field.allowed_codes?.length === 1 &&
    !field.depends_on &&
    !field.filter_by &&
    !field.filters;
  const isEffectivelyReadonly = field.readonly || isAutoReadonly;
  const readonlyStyles = isEffectivelyReadonly
    ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70'
    : '';

  const errorStyles = hasError
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
    : '';

  switch (field.type) {
    case 'select': {
      const placeholderText = field.placeholder || `Select ${field.label}...`;
      const hasValue = value !== null && value !== undefined && value !== '';
      const selectedOption = hasValue ? options.find((o) => o.code === String(value)) : null;

      return (
        <div className="relative">
          <Select
            value={value?.toString() || ''}
            onValueChange={onChange}
            disabled={isEffectivelyReadonly}
          >
            <SelectTrigger className={cn('w-full', hasValue && !isEffectivelyReadonly && !field.required && 'pr-16', readonlyStyles)}>
              <SelectValue placeholder={placeholderText}>
                {selectedOption && (
                  <span className="flex items-center gap-2">
                    {selectedOption.hex && (
                      <span
                        className="w-4 h-4 rounded-full border border-gray-200"
                        style={{ backgroundColor: selectedOption.hex }}
                      />
                    )}
                    {selectedOption.label}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.code} value={opt.code}>
                  <span className="flex items-center gap-2">
                    {opt.hex && (
                      <span
                        className="w-4 h-4 rounded-full border border-gray-200"
                        style={{ backgroundColor: opt.hex }}
                      />
                    )}
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Clear button - only for optional fields with value */}
          {hasValue && !isEffectivelyReadonly && !field.required && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded-sm hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 z-10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      );
    }

    case 'multi-select': {
      const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
      const placeholderText = field.placeholder || `Select ${field.label.toLowerCase()}...`;

      const toggleOption = (code: string) => {
        if (isEffectivelyReadonly) return;
        const newValues = selectedValues.includes(code)
          ? selectedValues.filter((v) => v !== code)
          : [...selectedValues, code];
        onChange(newValues.length > 0 ? (newValues as string[]) : null);
      };

      const clearAll = () => {
        if (isEffectivelyReadonly) return;
        onChange(null);
      };

      if (isEffectivelyReadonly) {
        return (
          <div className={cn(
            'flex h-10 w-full items-center rounded-md border border-input px-3 py-2 text-sm',
            readonlyStyles
          )}>
            <span className="truncate">
              {selectedValues.length > 0
                ? selectedValues.map((code) =>
                    options.find((o) => o.code === code)?.label || code
                  ).join(', ')
                : placeholderText}
            </span>
          </div>
        );
      }

      return (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
              )}
            >
              <span className={cn('truncate text-left', selectedValues.length === 0 && 'text-muted-foreground')}>
                {selectedValues.length > 0
                  ? selectedValues.map((code) =>
                      options.find((o) => o.code === code)?.label || code
                    ).join(', ')
                  : placeholderText}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <div className="max-h-60 overflow-y-auto p-1">
              {/* Clear all option */}
              {selectedValues.length > 0 && (
                <>
                  <div
                    onClick={clearAll}
                    className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm text-gray-500 italic hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Clear all
                  </div>
                  <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                </>
              )}
              {options.map((opt) => {
                const isSelected = selectedValues.includes(opt.code);
                return (
                  <div
                    key={opt.code}
                    onClick={() => toggleOption(opt.code)}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm',
                      'hover:bg-gray-100 dark:hover:bg-gray-800',
                      isSelected && 'bg-emerald-50 dark:bg-emerald-900/20'
                    )}
                  >
                    <Checkbox checked={isSelected} className="pointer-events-none" />
                    {opt.hex && (
                      <span
                        className="w-4 h-4 rounded-full border border-gray-200 shrink-0"
                        style={{ backgroundColor: opt.hex }}
                      />
                    )}
                    <span>{opt.label}</span>
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    case 'number': {
      const numberPlaceholder = field.placeholder || `Enter ${field.label.toLowerCase()}`;
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => {
              const num = parseFloat(e.target.value);
              onChange(isNaN(num) ? null : num);
            }}
            placeholder={numberPlaceholder}
            min={field.min}
            max={field.max}
            step={field.step}
            readOnly={isEffectivelyReadonly}
            className={cn('flex-1', readonlyStyles, errorStyles)}
          />
          {field.unit && (
            <span className="text-sm text-gray-500 shrink-0">{field.unit}</span>
          )}
        </div>
      );
    }

    case 'text': {
      // Text fields can also have units (e.g., dimension fields like wall_height)
      const textPlaceholder = field.placeholder || `Enter ${field.label.toLowerCase()}`;
      if (field.unit) {
        return (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={value?.toString() || ''}
              onChange={(e) => onChange(e.target.value || null)}
              placeholder={textPlaceholder}
              maxLength={field.max_length}
              readOnly={isEffectivelyReadonly}
              className={cn('flex-1', readonlyStyles, errorStyles)}
            />
            <span className="text-sm text-gray-500 shrink-0">{field.unit}</span>
          </div>
        );
      }
      return (
        <Input
          type="text"
          value={value?.toString() || ''}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={textPlaceholder}
          maxLength={field.max_length}
          readOnly={isEffectivelyReadonly}
          className={cn(readonlyStyles, errorStyles)}
        />
      );
    }

    case 'textarea': {
      const textareaPlaceholder = field.placeholder || `Enter ${field.label.toLowerCase()}`;
      return (
        <Textarea
          value={value?.toString() || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={textareaPlaceholder}
          maxLength={field.max_length}
          readOnly={isEffectivelyReadonly}
          className={cn('min-h-[80px]', readonlyStyles)}
        />
      );
    }

    case 'checkbox':
      return (
        <div className={cn('flex items-center gap-2', (isEffectivelyReadonly) && 'opacity-70')}>
          <Checkbox
            checked={!!value}
            onCheckedChange={(checked) => onChange(!!checked)}
            disabled={isEffectivelyReadonly}
          />
          {field.placeholder && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {field.placeholder}
            </span>
          )}
        </div>
      );

    case 'computed':
      return (
        <Input
          type="text"
          value={value?.toString() || ''}
          readOnly
          className="bg-gray-100 dark:bg-gray-800 cursor-default opacity-70"
        />
      );

    default:
      return (
        <Input
          type="text"
          value={value?.toString() || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          readOnly={isEffectivelyReadonly}
          className={readonlyStyles}
        />
      );
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function getGridColClass(gridSpan?: 1 | 2 | 3 | 4): string {
  switch (gridSpan) {
    case 1: return 'col-span-1';
    case 2: return 'col-span-2';
    case 3: return 'col-span-3';
    case 4: return 'col-span-4';
    default: return 'col-span-1'; // Default to single column for compact layout
  }
}

/**
 * Parse a dimension value in feet-inches notation
 *
 * Supported formats:
 * - Simple decimal: "15", "15.5"
 * - Decimal feet with marker: "15.75'" → 15.75 feet
 * - Feet-inches: "15'-2\"", "15' 2\"", "15-2\"", "15 2\"" → 15 feet 2 inches
 * - Feet with fractional inches: "15-3/4\"", "15 3/4\"" → 15 feet 0.75 inches
 * - Feet with mixed number inches: "15-1 3/4\"", "15 1 3/4\"" → 15 feet 1.75 inches
 *
 * Returns the value in decimal feet for validation against max_rules
 */
function parseDimensionValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;

  // If already a number, return it
  if (typeof value === 'number') return value;

  let str = value.toString().trim();
  if (!str) return null;

  // Normalize: remove double quotes at end if present
  str = str.replace(/"$/, '');

  // Format 1: Decimal feet with ' marker (e.g., "15.75'" → 15.75)
  const decimalFeetMatch = str.match(/^(\d+\.?\d*)'\s*$/);
  if (decimalFeetMatch) {
    return parseFloat(decimalFeetMatch[1]);
  }

  // Format 2: Feet with mixed number inches (e.g., "15-1 3/4", "15'-1 3/4", "15 1 3/4")
  // Pattern: feet + separator + whole inches + space + fraction
  const mixedNumberMatch = str.match(/^(\d+)(?:')?[\s-]+(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedNumberMatch) {
    const feet = parseInt(mixedNumberMatch[1], 10);
    const wholeInches = parseInt(mixedNumberMatch[2], 10);
    const fracNum = parseInt(mixedNumberMatch[3], 10);
    const fracDen = parseInt(mixedNumberMatch[4], 10);

    if (fracDen !== 0) {
      const totalInches = wholeInches + (fracNum / fracDen);
      return feet + (totalInches / 12);
    }
  }

  // Format 3: Feet with whole inches only (e.g., "15'-2", "15' 2", "15-2", "15 2")
  const feetWholeInchesMatch = str.match(/^(\d+)(?:')?[\s-]+(\d+)$/);
  if (feetWholeInchesMatch) {
    const feet = parseInt(feetWholeInchesMatch[1], 10);
    const inches = parseInt(feetWholeInchesMatch[2], 10);
    return feet + (inches / 12);
  }

  // Format 4: Feet with fractional inches only (e.g., "15-3/4", "15 3/4", "15'-3/4")
  const feetFracInchesMatch = str.match(/^(\d+)(?:')?[\s-]+(\d+)\/(\d+)$/);
  if (feetFracInchesMatch) {
    const feet = parseInt(feetFracInchesMatch[1], 10);
    const fracNum = parseInt(feetFracInchesMatch[2], 10);
    const fracDen = parseInt(feetFracInchesMatch[3], 10);

    if (fracDen !== 0) {
      const fracInches = fracNum / fracDen;
      return feet + (fracInches / 12);
    }
  }

  // Format 5: Simple fraction (e.g., "3/4") - unlikely for wall height but supported
  const simpleFractionMatch = str.match(/^(\d+)\/(\d+)$/);
  if (simpleFractionMatch) {
    const num = parseInt(simpleFractionMatch[1], 10);
    const den = parseInt(simpleFractionMatch[2], 10);
    if (den !== 0) {
      return num / den;
    }
  }

  // Format 6: Simple decimal number (e.g., "15", "15.5")
  const simpleNum = parseFloat(str);
  if (!isNaN(simpleNum)) {
    return simpleNum;
  }

  return null;
}

/**
 * Evaluate a condition expression against a value
 */
function evaluateConditionForMax(
  value: ConfigFormValues[string],
  condition: ConditionExpression
): boolean {
  // Handle is_set check first
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

  // Numeric comparisons
  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(numValue)) return false;

  if (condition['>'] !== undefined) {
    return numValue > condition['>'];
  }
  if (condition['<'] !== undefined) {
    return numValue < condition['<'];
  }
  if (condition['>='] !== undefined) {
    return numValue >= condition['>='];
  }
  if (condition['<='] !== undefined) {
    return numValue <= condition['<='];
  }
  if (condition.in !== undefined) {
    return condition.in.includes(value as string | number);
  }
  if (condition.not_in !== undefined) {
    return !condition.not_in.includes(value as string | number);
  }

  return false;
}

/**
 * Get the max validation error message for a field, if any
 * Returns null if no error, or the error message string
 */
function getMaxValidationError(
  field: ResolvedOptionField,
  fieldValue: ConfigFormValues[string],
  allValues: ConfigFormValues
): string | null {
  // Only check if field has max_rules and has a value
  if (!field.max_rules || field.max_rules.length === 0) return null;

  // Parse the current field value
  const numericValue = parseDimensionValue(fieldValue);
  if (numericValue === null) return null; // No value entered yet

  // Find the first matching rule
  for (const rule of field.max_rules) {
    const conditions = rule.when;

    // Check if all conditions match (empty conditions = default rule)
    const allConditionsMatch = Object.keys(conditions).length === 0 ||
      Object.entries(conditions).every(([fieldName, condition]) =>
        evaluateConditionForMax(allValues[fieldName], condition)
      );

    if (allConditionsMatch) {
      // Found matching rule - check if value exceeds max
      if (numericValue > rule.max) {
        // Return error message
        return rule.message || `Maximum allowed is ${rule.max}${field.unit ? ` ${field.unit}` : ''}`;
      }
      // Value is within max - no error
      return null;
    }
  }

  // No matching rule found - no validation error
  return null;
}
