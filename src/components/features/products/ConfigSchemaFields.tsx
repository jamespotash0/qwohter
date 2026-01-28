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
import { ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfigSchema } from '@/hooks/useConfigSchema';
import type { ConfigSchema, ConfigFormValues, ResolvedOptionField, ResolvedValueOption } from '@/lib/types/configSchema';

interface ConfigSchemaFieldsProps {
  /** The config schema to render */
  schema: ConfigSchema | null | undefined;
  /** Current form values */
  values: ConfigFormValues;
  /** Callback when values change */
  onChange: (values: ConfigFormValues) => void;
  /** Whether form is in edit mode (readonly) */
  isEditMode?: boolean;
  /** Optional class name */
  className?: string;
}

export function ConfigSchemaFields({
  schema,
  values,
  onChange,
  isEditMode = false,
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

  // Group fields by their group property and sort by order
  const groupedFields = useMemo(() => {
    if (!resolvedSchema) return { ungrouped: [], groups: [] };

    const fields = Object.entries(resolvedSchema.options);
    const groups = resolvedSchema.groups || [];

    // Build a map of field key to schema position (for fallback ordering)
    const schemaPositionMap = new Map<string, number>();
    fields.forEach(([key], idx) => schemaPositionMap.set(key, idx));

    // Create field groups
    const fieldsByGroup = new Map<string, Array<[string, ResolvedOptionField]>>();
    const ungrouped: Array<[string, ResolvedOptionField]> = [];

    for (const [key, field] of fields) {
      // Check visibility
      if (!isFieldVisible(key)) continue;

      if (field.group) {
        const existing = fieldsByGroup.get(field.group) || [];
        existing.push([key, field]);
        fieldsByGroup.set(field.group, existing);
      } else {
        ungrouped.push([key, field]);
      }
    }

    // Sort fields within each group by order (use schema position as fallback)
    const sortFields = (
      a: [string, ResolvedOptionField],
      b: [string, ResolvedOptionField]
    ) => {
      // Use explicit order if set, otherwise use schema position + 100 as fallback
      const orderA = a[1].order ?? ((schemaPositionMap.get(a[0]) ?? 0) + 100);
      const orderB = b[1].order ?? ((schemaPositionMap.get(b[0]) ?? 0) + 100);
      return orderA - orderB;
    };

    ungrouped.sort(sortFields);
    for (const fields of fieldsByGroup.values()) {
      fields.sort(sortFields);
    }

    // Sort groups by order
    const sortedGroups = [...groups].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    return {
      ungrouped,
      groups: sortedGroups.map((group) => ({
        ...group,
        fields: fieldsByGroup.get(group.id) || [],
      })),
    };
  }, [resolvedSchema, isFieldVisible]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-gray-500', className)}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading options...</span>
      </div>
    );
  }

  if (!resolvedSchema || Object.keys(resolvedSchema.options).length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {/* Ungrouped fields - responsive 6 column grid */}
      {groupedFields.ungrouped.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-3 mb-4">
          {groupedFields.ungrouped.map(([key, field]) => (
            <div key={key} className={cn('space-y-1', getGridColClass(field.grid_span))}>
              <FieldLabel field={field} fieldKey={key} />
              <FieldInput
                fieldKey={key}
                field={field}
                value={values[key]}
                options={getFieldOptions(key)}
                onChange={(value) => setValue(key, value)}
                isEditMode={isEditMode}
              />
              {field.help_text && (
                <p className="text-[10px] text-gray-400 leading-tight">{field.help_text}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Grouped fields */}
      {groupedFields.groups.map((group) => {
        if (group.fields.length === 0) return null;

        return (
          <div key={group.id} className="mb-4">
            <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
              {group.label}
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-3">
              {group.fields.map(([key, field]) => (
                <div key={key} className={cn('space-y-1', getGridColClass(field.grid_span))}>
                  <FieldLabel field={field} fieldKey={key} />
                  <FieldInput
                    fieldKey={key}
                    field={field}
                    value={values[key]}
                    options={getFieldOptions(key)}
                    onChange={(value) => setValue(key, value)}
                    isEditMode={isEditMode}
                  />
                  {field.help_text && (
                    <p className="text-[10px] text-gray-400 leading-tight">{field.help_text}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
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
  isEditMode: boolean;
}

function FieldInput({
  fieldKey,
  field,
  value,
  options,
  onChange,
  isEditMode,
}: FieldInputProps) {
  const readonlyStyles = isEditMode
    ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70'
    : '';

  switch (field.type) {
    case 'select':
      return (
        <Select
          value={value?.toString() || ''}
          onValueChange={onChange}
          disabled={isEditMode || field.readonly}
        >
          <SelectTrigger className={cn('w-full', readonlyStyles)}>
            <SelectValue placeholder={field.placeholder || `Select ${field.label}...`} />
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
      );

    case 'multi-select': {
      const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

      const toggleOption = (code: string) => {
        if (isEditMode || field.readonly) return;
        const newValues = selectedValues.includes(code)
          ? selectedValues.filter((v) => v !== code)
          : [...selectedValues, code];
        onChange(newValues as string[]);
      };

      if (isEditMode || field.readonly) {
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
                : field.placeholder || 'Select...'}
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
              <span className="truncate text-left">
                {selectedValues.length > 0
                  ? selectedValues.map((code) =>
                      options.find((o) => o.code === code)?.label || code
                    ).join(', ')
                  : field.placeholder || 'Select...'}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <div className="max-h-60 overflow-y-auto p-1">
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

    case 'number':
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => {
              const num = parseFloat(e.target.value);
              onChange(isNaN(num) ? null : num);
            }}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step}
            readOnly={isEditMode || field.readonly}
            className={cn('flex-1', readonlyStyles)}
          />
          {field.unit && (
            <span className="text-sm text-gray-500 shrink-0">{field.unit}</span>
          )}
        </div>
      );

    case 'text':
      return (
        <Input
          type="text"
          value={value?.toString() || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.max_length}
          readOnly={isEditMode || field.readonly}
          className={readonlyStyles}
        />
      );

    case 'textarea':
      return (
        <Textarea
          value={value?.toString() || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.max_length}
          readOnly={isEditMode || field.readonly}
          className={cn('min-h-[80px]', readonlyStyles)}
        />
      );

    case 'checkbox':
      return (
        <div className={cn('flex items-center gap-2', isEditMode && 'opacity-70')}>
          <Checkbox
            checked={!!value}
            onCheckedChange={(checked) => onChange(!!checked)}
            disabled={isEditMode || field.readonly}
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
          readOnly={isEditMode || field.readonly}
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
