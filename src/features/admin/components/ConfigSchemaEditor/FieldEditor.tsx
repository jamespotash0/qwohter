/**
 * Field Editor Component
 * Form for editing a single config schema field
 */

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Trash2, GripVertical, Check, ChevronsUpDown, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OptionFieldType } from '@/lib/types/configSchema';
import type { FieldEditorState, ValueSetOption } from './types';

interface FieldEditorProps {
  field: FieldEditorState;
  valueSets: ValueSetOption[];
  allFieldKeys: string[];
  onChange: (field: FieldEditorState) => void;
  onDelete: () => void;
  onKeyChange: (oldKey: string, newKey: string) => void;
}

const FIELD_TYPES: Array<{ value: OptionFieldType; label: string }> = [
  { value: 'select', label: 'Dropdown' },
  { value: 'multi-select', label: 'Multi-Select' },
  { value: 'number', label: 'Number' },
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'computed', label: 'Computed (readonly)' },
];

export function FieldEditor({
  field,
  valueSets,
  allFieldKeys,
  onChange,
  onDelete,
  onKeyChange,
}: FieldEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [keyInput, setKeyInput] = useState(field._key);

  // Sync key input with field key
  useEffect(() => {
    setKeyInput(field._key);
  }, [field._key]);

  const handleFieldChange = <K extends keyof FieldEditorState>(
    key: K,
    value: FieldEditorState[K]
  ) => {
    onChange({ ...field, [key]: value });
  };

  const handleKeyBlur = () => {
    if (keyInput !== field._key && keyInput.trim()) {
      // Validate key format
      const normalizedKey = keyInput
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');

      if (normalizedKey && !allFieldKeys.includes(normalizedKey)) {
        onKeyChange(field._key, normalizedKey);
      } else {
        setKeyInput(field._key); // Reset to original
      }
    }
  };

  const handleInlineValuesChange = (valuesStr: string) => {
    const values = valuesStr
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    handleFieldChange('values', values.length > 0 ? values : undefined);
  };

  const needsValues = field.type === 'select' || field.type === 'multi-select';
  const hasValuesRef = typeof field.values_ref === 'string' && field.values_ref.length > 0;
  const hasInlineValues = field.values && field.values.length > 0;

  // Get available values from the selected value set for filtering UI
  const selectedValueSet = useMemo(() => {
    if (!hasValuesRef || typeof field.values_ref !== 'string') return null;
    return valueSets.find((vs) => vs.slug === field.values_ref) || null;
  }, [hasValuesRef, field.values_ref, valueSets]);

  const availableValues = selectedValueSet?.values || [];

  // Handle allowed_codes toggle
  const handleAllowedCodeToggle = (code: string) => {
    const current = field.allowed_codes || [];
    const newCodes = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    handleFieldChange('allowed_codes', newCodes.length > 0 ? newCodes : undefined);
  };

  // Handle excluded_codes toggle
  const handleExcludedCodeToggle = (code: string) => {
    const current = field.excluded_codes || [];
    const newCodes = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    handleFieldChange('excluded_codes', newCodes.length > 0 ? newCodes : undefined);
  };

  // Get other field keys for depends_on dropdown (exclude current field)
  const otherFieldKeys = allFieldKeys.filter((k) => k !== field._key);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div className="pt-2 cursor-grab text-gray-400">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Row 1: Key, Label, Type */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Field Key</label>
              <Input
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onBlur={handleKeyBlur}
                placeholder="field_key"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Label</label>
              <Input
                value={field.label}
                onChange={(e) => handleFieldChange('label', e.target.value)}
                placeholder="Display Label"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Type</label>
              <Select
                value={field.type}
                onValueChange={(v) => handleFieldChange('type', v as OptionFieldType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Grid Span</label>
              <Select
                value={String(field.grid_span || 2)}
                onValueChange={(v) => handleFieldChange('grid_span', Number(v) as 1 | 2 | 3 | 4)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 col</SelectItem>
                  <SelectItem value="2">2 cols</SelectItem>
                  <SelectItem value="3">3 cols</SelectItem>
                  <SelectItem value="4">4 cols (full)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Values (for select types) */}
          {needsValues && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">
                  Values Reference
                  <span className="text-gray-400 ml-1">(from config_value_sets)</span>
                </label>
                <Select
                  value={typeof field.values_ref === 'string' ? field.values_ref : '_none'}
                  onValueChange={(v) =>
                    handleFieldChange('values_ref', v === '_none' ? undefined : v)
                  }
                  disabled={hasInlineValues}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select value set..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {valueSets.map((vs) => (
                      <SelectItem key={vs.slug} value={vs.slug}>
                        {vs.name} ({vs.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">
                  Inline Values
                  <span className="text-gray-400 ml-1">(comma-separated)</span>
                </label>
                <Input
                  value={field.values?.join(', ') || ''}
                  onChange={(e) => handleInlineValuesChange(e.target.value)}
                  placeholder="Option 1, Option 2, Option 3"
                  disabled={hasValuesRef}
                />
              </div>
            </div>
          )}

          {/* Row 3: Checkboxes */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={field.required}
                onCheckedChange={(v) => handleFieldChange('required', !!v)}
              />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={field.readonly}
                onCheckedChange={(v) => handleFieldChange('readonly', !!v)}
              />
              Readonly
            </label>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
            </button>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Placeholder</label>
                  <Input
                    value={field.placeholder || ''}
                    onChange={(e) =>
                      handleFieldChange('placeholder', e.target.value || undefined)
                    }
                    placeholder="Placeholder text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Default Value</label>
                  <Input
                    value={String(field.default_value ?? '')}
                    onChange={(e) =>
                      handleFieldChange(
                        'default_value',
                        e.target.value || undefined
                      )
                    }
                    placeholder="Default value"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Order</label>
                  <Input
                    type="number"
                    value={field.order ?? ''}
                    onChange={(e) =>
                      handleFieldChange(
                        'order',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    placeholder="Sort order"
                  />
                </div>
              </div>

              {/* Number-specific options */}
              {field.type === 'number' && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Min</label>
                    <Input
                      type="number"
                      value={field.min ?? ''}
                      onChange={(e) =>
                        handleFieldChange(
                          'min',
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Max</label>
                    <Input
                      type="number"
                      value={field.max ?? ''}
                      onChange={(e) =>
                        handleFieldChange(
                          'max',
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Step</label>
                    <Input
                      type="number"
                      value={field.step ?? ''}
                      onChange={(e) =>
                        handleFieldChange(
                          'step',
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Unit</label>
                    <Input
                      value={field.unit || ''}
                      onChange={(e) =>
                        handleFieldChange('unit', e.target.value || undefined)
                      }
                      placeholder="e.g., inches"
                    />
                  </div>
                </div>
              )}

              {/* Cascading options */}
              {needsValues && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">
                    Depends On (for cascading)
                  </label>
                  <Select
                    value={field.depends_on || '_none'}
                    onValueChange={(v) =>
                      handleFieldChange('depends_on', v === '_none' ? undefined : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent field..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      {otherFieldKeys.map((key) => (
                        <SelectItem key={key} value={key}>
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400">
                    Filter this field's values by the category matching the parent's value
                  </p>
                </div>
              )}

              {/* Value Filtering - only show when values_ref is set */}
              {needsValues && hasValuesRef && availableValues.length > 0 && (
                <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Value Filtering
                    </span>
                    <span className="text-xs text-gray-400">
                      ({availableValues.length} values in set)
                    </span>
                  </div>

                  {/* Allowed Codes */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500">
                      Allowed Codes
                      <span className="text-gray-400 ml-1">(whitelist - only show these)</span>
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between h-auto min-h-[36px] py-2"
                        >
                          <span className="flex flex-wrap gap-1">
                            {field.allowed_codes && field.allowed_codes.length > 0 ? (
                              field.allowed_codes.map((code) => (
                                <Badge key={code} variant="secondary" className="text-xs">
                                  {code}
                                  <X
                                    className="w-3 h-3 ml-1 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAllowedCodeToggle(code);
                                    }}
                                  />
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-400">All values allowed</span>
                            )}
                          </span>
                          <ChevronsUpDown className="w-4 h-4 ml-2 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search values..." />
                          <CommandList>
                            <CommandEmpty>No values found.</CommandEmpty>
                            <CommandGroup>
                              {availableValues.map((v) => (
                                <CommandItem
                                  key={v.code}
                                  onSelect={() => handleAllowedCodeToggle(v.code)}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      field.allowed_codes?.includes(v.code)
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                  />
                                  <span className="flex-1">{v.label}</span>
                                  <span className="text-xs text-gray-400 font-mono">{v.code}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Excluded Codes */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500">
                      Excluded Codes
                      <span className="text-gray-400 ml-1">(blacklist - hide these)</span>
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between h-auto min-h-[36px] py-2"
                        >
                          <span className="flex flex-wrap gap-1">
                            {field.excluded_codes && field.excluded_codes.length > 0 ? (
                              field.excluded_codes.map((code) => (
                                <Badge key={code} variant="destructive" className="text-xs">
                                  {code}
                                  <X
                                    className="w-3 h-3 ml-1 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExcludedCodeToggle(code);
                                    }}
                                  />
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-400">No values excluded</span>
                            )}
                          </span>
                          <ChevronsUpDown className="w-4 h-4 ml-2 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search values..." />
                          <CommandList>
                            <CommandEmpty>No values found.</CommandEmpty>
                            <CommandGroup>
                              {availableValues.map((v) => (
                                <CommandItem
                                  key={v.code}
                                  onSelect={() => handleExcludedCodeToggle(v.code)}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      field.excluded_codes?.includes(v.code)
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                  />
                                  <span className="flex-1">{v.label}</span>
                                  <span className="text-xs text-gray-400 font-mono">{v.code}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <p className="text-xs text-gray-400">
                    Use allowed_codes to show only specific values, or excluded_codes to hide specific values from the set.
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Help Text</label>
                <Textarea
                  value={field.help_text || ''}
                  onChange={(e) =>
                    handleFieldChange('help_text', e.target.value || undefined)
                  }
                  placeholder="Optional help text shown below the field"
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        {/* Delete Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
