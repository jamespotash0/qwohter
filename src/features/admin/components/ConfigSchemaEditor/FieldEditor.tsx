/**
 * Field Editor Component
 * Form for editing a single config schema field
 */

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus, GripVertical } from 'lucide-react';
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
  const hasValuesRef = !!field.values_ref;
  const hasInlineValues = field.values && field.values.length > 0;

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
                  <Input
                    value={field.depends_on || ''}
                    onChange={(e) =>
                      handleFieldChange('depends_on', e.target.value || undefined)
                    }
                    placeholder="Parent field key (e.g., finish_style)"
                  />
                  <p className="text-xs text-gray-400">
                    Filter this field's values by the category matching the parent's value
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
