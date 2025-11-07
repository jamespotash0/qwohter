/**
 * Properties Panel
 * Right sidebar for configuring selected field properties
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CaretDown,
  Check,
  Plus,
  Trash,
  Code,
  Palette,
  Function,
  ArrowsDownUp,
} from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { EnhancedFormField } from '../types/enhanced';

interface PropertiesPanelProps {
  selectedField: EnhancedFormField | null;
  onUpdate: (updates: Partial<EnhancedFormField>) => void;
  onClose: () => void;
  onDelete?: () => void; // Delete field
  allFields?: EnhancedFormField[]; // For dependency builder
  className?: string;
}

// Phone number formatting utilities
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');

  // Limit to 10 digits
  const limited = digits.slice(0, 10);

  // Format as (XXX) XXX-XXXX
  if (limited.length <= 3) {
    return limited;
  } else if (limited.length <= 6) {
    return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  } else {
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
  }
};

const getPhoneDigits = (value: string): string => {
  return value.replace(/\D/g, '');
};

// Convert label to snake_case for field ID
const labelToFieldId = (label: string): string => {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric chars with underscore
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
};

type SectionType = 'basic' | 'validation' | 'layout' | 'styling' | 'calculation' | 'dependency' | 'advanced';

const SHADOW_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' },
] as const;

export function PropertiesPanel({
  selectedField,
  onUpdate,
  onClose,
  onDelete,
  allFields = [],
  className,
}: PropertiesPanelProps) {
  const [expandedSections, setExpandedSections] = useState<SectionType[]>([
    'basic',
    'validation',
  ]);

  const toggleSection = (section: SectionType) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const isSectionExpanded = (section: SectionType) => expandedSections.includes(section);

  if (!selectedField) {
    return (
      <div className={cn('flex flex-col h-full bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800', className)}>
        <div className="flex items-center justify-center h-full p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm font-medium">No field selected</p>
            <p className="text-xs mt-2">Select a field to configure its properties</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Field Properties
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {selectedField.label || 'Untitled Field'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onDelete && !selectedField.isSystemField && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
              title="Delete field"
            >
              <Trash className="w-4 h-4" />
            </Button>
          )}
          {selectedField.isSystemField && (
            <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Protected</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
            title="Close properties"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Basic Properties Section */}
          <Section
            title="Basic Properties"
            icon={Code}
            expanded={isSectionExpanded('basic')}
            onToggle={() => toggleSection('basic')}
          >
            <BasicPropertiesSection field={selectedField} onUpdate={onUpdate} />
          </Section>

          {/* Validation Section */}
          <Section
            title="Validation"
            icon={Check}
            expanded={isSectionExpanded('validation')}
            onToggle={() => toggleSection('validation')}
          >
            <ValidationSection field={selectedField} onUpdate={onUpdate} />
          </Section>

          {/* Layout Section */}
          <Section
            title="Layout & Position"
            icon={ArrowsDownUp}
            expanded={isSectionExpanded('layout')}
            onToggle={() => toggleSection('layout')}
          >
            <LayoutSection field={selectedField} onUpdate={onUpdate} />
          </Section>

          {/* Styling Section */}
          <Section
            title="Styling"
            icon={Palette}
            expanded={isSectionExpanded('styling')}
            onToggle={() => toggleSection('styling')}
          >
            <StylingSection field={selectedField} onUpdate={onUpdate} />
          </Section>

          {/* Calculation Section */}
          {selectedField.field_type === 'calculated' && (
            <Section
              title="Calculation Formula"
              icon={Function}
              expanded={isSectionExpanded('calculation')}
              onToggle={() => toggleSection('calculation')}
            >
              <CalculationSection field={selectedField} onUpdate={onUpdate} allFields={allFields} />
            </Section>
          )}

          {/* Dependency Section */}
          <Section
            title="Dependencies"
            icon={ArrowsDownUp}
            expanded={isSectionExpanded('dependency')}
            onToggle={() => toggleSection('dependency')}
          >
            <DependencySection field={selectedField} onUpdate={onUpdate} allFields={allFields} />
          </Section>

          {/* Advanced Section */}
          <Section
            title="Advanced"
            icon={Code}
            expanded={isSectionExpanded('advanced')}
            onToggle={() => toggleSection('advanced')}
          >
            <AdvancedSection field={selectedField} onUpdate={onUpdate} />
          </Section>
        </div>
      </ScrollArea>
    </div>
  );
}

// Section Component
interface SectionProps {
  title: string;
  icon: React.ElementType;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ title, icon: Icon, expanded, onToggle, children }: SectionProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {title}
          </span>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <CaretDown className="w-4 h-4 text-gray-500" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-3 pt-0 space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Basic Properties Section
function BasicPropertiesSection({
  field,
  onUpdate,
}: {
  field: EnhancedFormField;
  onUpdate: (updates: Partial<EnhancedFormField>) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="field-id" className="text-xs">Field ID</Label>
        <Input
          id="field-id"
          value={field.id}
          onChange={(e) => onUpdate({ id: e.target.value })}
          className="h-8 text-sm bg-gray-50 dark:bg-gray-900"
          disabled
          title="Auto-generated from label"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="field-label" className="text-xs">Label</Label>
        <Input
          id="field-label"
          value={field.label}
          onChange={(e) => {
            const newLabel = e.target.value;
            const newFieldId = labelToFieldId(newLabel);
            onUpdate({
              label: newLabel,
              id: newFieldId || field.id // Keep original ID if conversion results in empty string
            });
          }}
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="field-type" className="text-xs">Field Type</Label>
        <Select
          value={field.field_type}
          onValueChange={(value) => onUpdate({ field_type: value as any })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="input">Input</SelectItem>
            <SelectItem value="textarea">Textarea</SelectItem>
            <SelectItem value="dropdown">Dropdown</SelectItem>
            <SelectItem value="checkbox">Checkbox</SelectItem>
            <SelectItem value="radio">Radio</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="calculated">Calculated</SelectItem>
            <SelectItem value="product_selector">Product Selector</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {field.field_type === 'input' && (
        <div className="space-y-2">
          <Label htmlFor="input-type" className="text-xs">Input Type</Label>
          <Select
            value={field.input_type || 'text'}
            onValueChange={(value) => onUpdate({ input_type: value as any })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="tel">Phone</SelectItem>
              <SelectItem value="url">URL</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Dropdown Options Editor - moved right after field type */}
      {field.field_type === 'dropdown' && (
        <div className="space-y-2">
          <Label className="text-xs">Dropdown Options</Label>
          <div className="space-y-2">
            {(field.options || []).map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...(field.options || [])];
                    newOptions[index] = e.target.value;
                    onUpdate({ options: newOptions });
                  }}
                  className="h-8 text-sm flex-1"
                  placeholder={`Option ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newOptions = (field.options || []).filter((_, i) => i !== index);
                    onUpdate({ options: newOptions });
                  }}
                  className="h-8 w-8 p-0 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                const newOptions = [...(field.options || []), ''];
                onUpdate({ options: newOptions });
              }}
              className="w-full h-8 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Option
            </Button>
          </div>
        </div>
      )}

      {/* Checkbox Options Editor */}
      {field.field_type === 'checkbox' && (
        <div className="space-y-2">
          <Label className="text-xs">Checkbox Options</Label>
          <div className="space-y-2">
            {(field.options || []).map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...(field.options || [])];
                    newOptions[index] = e.target.value;
                    onUpdate({ options: newOptions });
                  }}
                  className="h-8 text-sm flex-1"
                  placeholder={`Option ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newOptions = (field.options || []).filter((_, i) => i !== index);
                    onUpdate({ options: newOptions });
                  }}
                  className="h-8 w-8 p-0 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                const newOptions = [...(field.options || []), ''];
                onUpdate({ options: newOptions });
              }}
              className="w-full h-8 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Option
            </Button>
          </div>
        </div>
      )}

      {/* Radio Button Options Editor */}
      {field.field_type === 'radio' && (
        <div className="space-y-2">
          <Label className="text-xs">Radio Button Options</Label>
          <div className="space-y-2">
            {(field.options || []).map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...(field.options || [])];
                    newOptions[index] = e.target.value;
                    onUpdate({ options: newOptions });
                  }}
                  className="h-8 text-sm flex-1"
                  placeholder={`Option ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newOptions = (field.options || []).filter((_, i) => i !== index);
                    onUpdate({ options: newOptions });
                  }}
                  className="h-8 w-8 p-0 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                const newOptions = [...(field.options || []), ''];
                onUpdate({ options: newOptions });
              }}
              className="w-full h-8 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Option
            </Button>
          </div>
        </div>
      )}

      {/* Placeholder - hide for checkbox and radio */}
      {field.field_type !== 'checkbox' && field.field_type !== 'radio' && (
        <div className="space-y-2">
          <Label htmlFor="placeholder" className="text-xs">Placeholder</Label>
          <Input
            id="placeholder"
            value={field.placeholder || ''}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label htmlFor="required" className="text-xs">Required</Label>
        <Switch
          id="required"
          checked={field.required}
          onCheckedChange={(checked) => onUpdate({ required: checked })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-xs">Description</Label>
        <Textarea
          id="description"
          value={field.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          className="min-h-[60px] text-sm"
          placeholder="Optional field description"
        />
      </div>

      {/* Default Value Toggle */}
      {field.field_type !== 'checkbox' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="use-default-value" className="text-xs">Use Default Value</Label>
            <Switch
              id="use-default-value"
              checked={field.default_value !== undefined}
              onCheckedChange={(checked) => {
                if (!checked) {
                  onUpdate({ default_value: undefined });
                } else {
                  onUpdate({ default_value: '' });
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Default Value - show for non-dropdown/non-radio/non-date fields */}
      {field.field_type !== 'dropdown' && field.field_type !== 'checkbox' && field.field_type !== 'radio' && field.field_type !== 'date' && field.default_value !== undefined && (
        <div className="space-y-2">
          <Label htmlFor="default-value" className="text-xs">Default Value</Label>
          {field.field_type === 'input' && field.input_type === 'tel' ? (
            <Input
              id="default-value"
              value={field.default_value || ''}
              onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value);
                const digits = getPhoneDigits(formatted);
                if (digits.length <= 10) {
                  onUpdate({ default_value: formatted });
                }
              }}
              className="h-8 text-sm"
              placeholder="(555) 555-5555"
              maxLength={14} // (XXX) XXX-XXXX = 14 characters
            />
          ) : (
            <Input
              id="default-value"
              value={field.default_value || ''}
              onChange={(e) => onUpdate({ default_value: e.target.value })}
              className="h-8 text-sm"
              placeholder="Optional default value"
              type={field.field_type === 'input' ? field.input_type : 'text'}
            />
          )}
          {field.field_type === 'input' && field.input_type === 'tel' && (
            <p className="text-xs text-gray-500">
              {getPhoneDigits(field.default_value || '').length}/10 digits
            </p>
          )}
        </div>
      )}

      {/* Default Value for Date - with current date option */}
      {field.field_type === 'date' && field.default_value !== undefined && (
        <div className="space-y-2">
          <Label htmlFor="default-value" className="text-xs">Default Value</Label>
          <div className="flex items-center gap-2">
            <Switch
              id="use-current-date"
              checked={field.default_value === '{{CURRENT_DATE}}'}
              onCheckedChange={(checked) => {
                if (checked) {
                  onUpdate({ default_value: '{{CURRENT_DATE}}' });
                } else {
                  onUpdate({ default_value: '' });
                }
              }}
            />
            <Label htmlFor="use-current-date" className="text-xs cursor-pointer">
              Use Current Date
            </Label>
          </div>
          {field.default_value !== '{{CURRENT_DATE}}' && (
            <Input
              id="default-value"
              value={field.default_value || ''}
              onChange={(e) => onUpdate({ default_value: e.target.value })}
              className="h-8 text-sm"
              placeholder="YYYY-MM-DD"
              type="date"
            />
          )}
          {field.default_value === '{{CURRENT_DATE}}' && (
            <p className="text-xs text-gray-500">
              Forms will automatically populate with today's date
            </p>
          )}
        </div>
      )}

      {/* Default Value for Dropdown - as dropdown selector */}
      {field.field_type === 'dropdown' && field.default_value !== undefined && (
        <div className="space-y-2">
          <Label htmlFor="default-value" className="text-xs">Default Selection</Label>
          <Select
            value={field.default_value || '__none__'}
            onValueChange={(value) => onUpdate({ default_value: value === '__none__' ? undefined : value })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select default option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {(field.options || [])
                .filter(option => option && option.trim() !== '') // Filter out empty options
                .map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Default Value for Radio Button - as dropdown selector */}
      {field.field_type === 'radio' && field.default_value !== undefined && (
        <div className="space-y-2">
          <Label htmlFor="default-value" className="text-xs">Default Selection</Label>
          <Select
            value={field.default_value || '__none__'}
            onValueChange={(value) => onUpdate({ default_value: value === '__none__' ? undefined : value })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select default option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {(field.options || [])
                .filter(option => option && option.trim() !== '') // Filter out empty options
                .map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Default Value for Checkbox */}
      {field.field_type === 'checkbox' && (
        <div className="flex items-center justify-between">
          <Label htmlFor="default-checked" className="text-xs">Default Checked</Label>
          <Switch
            id="default-checked"
            checked={field.default_value === true}
            onCheckedChange={(checked) => onUpdate({ default_value: checked })}
          />
        </div>
      )}
    </>
  );
}

// Validation Section
function ValidationSection({
  field,
  onUpdate,
}: {
  field: EnhancedFormField;
  onUpdate: (updates: Partial<EnhancedFormField>) => void;
}) {
  // Determine which validation rules apply based on field type
  const isTextInput = field.field_type === 'input' &&
    (field.input_type === 'text' || field.input_type === 'email' ||
     field.input_type === 'tel' || field.input_type === 'url' || !field.input_type);
  const isTextarea = field.field_type === 'textarea';
  const isNumberInput = field.field_type === 'input' && field.input_type === 'number';
  const isDateInput = field.field_type === 'date';

  const showLengthValidation = isTextInput || isTextarea;
  const showNumberValidation = isNumberInput;

  return (
    <>
      {/* Length validation - only for text inputs and textareas */}
      {showLengthValidation && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="min-length" className="text-xs">Min Length</Label>
            <Input
              id="min-length"
              type="number"
              min="0"
              value={field.minLength || ''}
              onChange={(e) => onUpdate({ minLength: parseInt(e.target.value) || undefined })}
              className="h-8 text-sm"
              placeholder="Min chars"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-length" className="text-xs">Max Length</Label>
            <Input
              id="max-length"
              type="number"
              min="0"
              value={field.maxLength || ''}
              onChange={(e) => onUpdate({ maxLength: parseInt(e.target.value) || undefined })}
              className="h-8 text-sm"
              placeholder="Max chars"
            />
          </div>
        </div>
      )}

      {/* Number validation - only for number inputs */}
      {showNumberValidation && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="min-value" className="text-xs">Min Value</Label>
            <Input
              id="min-value"
              type="number"
              value={field.minLength || ''} // Reusing minLength for min value
              onChange={(e) => onUpdate({ minLength: parseInt(e.target.value) || undefined })}
              className="h-8 text-sm"
              placeholder="Minimum"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-value" className="text-xs">Max Value</Label>
            <Input
              id="max-value"
              type="number"
              value={field.maxLength || ''} // Reusing maxLength for max value
              onChange={(e) => onUpdate({ maxLength: parseInt(e.target.value) || undefined })}
              className="h-8 text-sm"
              placeholder="Maximum"
            />
          </div>
        </div>
      )}

      {/* Help text - available for all field types */}
      <div className="space-y-2">
        <Label htmlFor="help-text" className="text-xs">Help Text</Label>
        <Input
          id="help-text"
          value={field.helpText || ''}
          onChange={(e) => onUpdate({ helpText: e.target.value })}
          className="h-8 text-sm"
          placeholder="Helper text shown below field"
        />
      </div>

      {/* Show message if no validation options available */}
      {!showLengthValidation && !showNumberValidation && (
        <div className="text-xs text-gray-500 dark:text-gray-400 italic py-2">
          No additional validation options for this field type
        </div>
      )}
    </>
  );
}

// Layout Section
function LayoutSection({
  field,
  onUpdate,
}: {
  field: EnhancedFormField;
  onUpdate: (updates: Partial<EnhancedFormField>) => void;
}) {
  const layout = field.layout || { x: 0, y: 0, w: 6, h: 2 };

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="width" className="text-xs">Width (cols)</Label>
          <Input
            id="width"
            type="number"
            min="1"
            max="12"
            value={layout.w}
            onChange={(e) =>
              onUpdate({ layout: { ...layout, w: parseInt(e.target.value) || 1 } })
            }
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="height" className="text-xs">Height (rows)</Label>
          <Input
            id="height"
            type="number"
            min="1"
            value={layout.h}
            onChange={(e) =>
              onUpdate({ layout: { ...layout, h: parseInt(e.target.value) || 1 } })
            }
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="static-position" className="text-xs">Lock Position</Label>
        <Switch
          id="static-position"
          checked={layout.static || false}
          onCheckedChange={(checked) =>
            onUpdate({ layout: { ...layout, static: checked } })
          }
        />
      </div>
    </>
  );
}

// Styling Section
function StylingSection({
  field,
  onUpdate,
}: {
  field: EnhancedFormField;
  onUpdate: (updates: Partial<EnhancedFormField>) => void;
}) {
  const styling = field.styling || {};

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="bg-color" className="text-xs">Background Color</Label>
        <div className="flex gap-2">
          <Input
            id="bg-color"
            type="color"
            value={styling.backgroundColor || '#ffffff'}
            onChange={(e) =>
              onUpdate({ styling: { ...styling, backgroundColor: e.target.value } })
            }
            className="h-8 w-12 p-1"
          />
          <Input
            value={styling.backgroundColor || '#ffffff'}
            onChange={(e) =>
              onUpdate({ styling: { ...styling, backgroundColor: e.target.value } })
            }
            className="h-8 flex-1 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="border-color" className="text-xs">Border Color</Label>
        <div className="flex gap-2">
          <Input
            id="border-color"
            type="color"
            value={styling.borderColor || '#e5e7eb'}
            onChange={(e) =>
              onUpdate({ styling: { ...styling, borderColor: e.target.value } })
            }
            className="h-8 w-12 p-1"
          />
          <Input
            value={styling.borderColor || '#e5e7eb'}
            onChange={(e) =>
              onUpdate({ styling: { ...styling, borderColor: e.target.value } })
            }
            className="h-8 flex-1 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="border-width" className="text-xs">Border Width</Label>
          <Input
            id="border-width"
            type="number"
            min="0"
            max="10"
            value={styling.borderWidth || 1}
            onChange={(e) =>
              onUpdate({ styling: { ...styling, borderWidth: parseInt(e.target.value) || 0 } })
            }
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="border-radius" className="text-xs">Border Radius</Label>
          <Input
            id="border-radius"
            type="number"
            min="0"
            max="50"
            value={styling.borderRadius || 4}
            onChange={(e) =>
              onUpdate({ styling: { ...styling, borderRadius: parseInt(e.target.value) || 0 } })
            }
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="shadow" className="text-xs">Shadow</Label>
        <Select
          value={styling.shadow || 'none'}
          onValueChange={(value) =>
            onUpdate({ styling: { ...styling, shadow: value as any } })
          }
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHADOW_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

// Calculation Section
function CalculationSection({
  field,
  onUpdate,
  allFields,
}: {
  field: EnhancedFormField;
  onUpdate: (updates: Partial<EnhancedFormField>) => void;
  allFields: EnhancedFormField[];
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="formula" className="text-xs">Formula</Label>
        <Textarea
          id="formula"
          value={field.formula || ''}
          onChange={(e) => onUpdate({ formula: e.target.value })}
          className="min-h-[100px] font-mono text-sm"
          placeholder="=field1 + field2 * 1.5"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Use field IDs to reference other fields. Example: =price * quantity
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Available Fields</Label>
        <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2 space-y-1">
          {allFields
            .filter((f) => f.id !== field.id && (f.field_type === 'input' && f.input_type === 'number'))
            .map((f) => (
              <div
                key={f.id}
                className="text-xs font-mono text-gray-700 dark:text-gray-300 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                onClick={() => {
                  const currentFormula = field.formula || '';
                  onUpdate({ formula: currentFormula + f.id });
                }}
              >
                {f.id} ({f.label})
              </div>
            ))}
        </div>
      </div>
    </>
  );
}

// Dependency Section
function DependencySection({
  field,
  onUpdate,
  allFields,
}: {
  field: EnhancedFormField;
  onUpdate: (updates: Partial<EnhancedFormField>) => void;
  allFields: EnhancedFormField[];
}) {
  const dependencies = field.dependencies || [];

  const addDependency = () => {
    onUpdate({
      dependencies: [
        ...dependencies,
        {
          fieldId: '',
          condition: 'equals',
          value: '',
          action: 'show',
        },
      ],
    });
  };

  const removeDependency = (index: number) => {
    onUpdate({
      dependencies: dependencies.filter((_, i) => i !== index),
    });
  };

  const updateDependency = (index: number, updates: any) => {
    const newDeps = [...dependencies];
    newDeps[index] = { ...newDeps[index], ...updates };
    onUpdate({ dependencies: newDeps });
  };

  return (
    <>
      <div className="space-y-2">
        {dependencies.map((dep, index) => (
          <div
            key={index}
            className="border border-gray-200 dark:border-gray-700 rounded-md p-2 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Dependency {index + 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeDependency(index)}
                className="h-6 w-6"
              >
                <Trash className="w-3 h-3" />
              </Button>
            </div>

            <Select
              value={dep.fieldId}
              onValueChange={(value) => updateDependency(index, { fieldId: value })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {allFields
                  .filter((f) => f.id !== field.id)
                  .map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select
              value={dep.condition}
              onValueChange={(value) => updateDependency(index, { condition: value })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="not_equals">Not Equals</SelectItem>
                <SelectItem value="greater_than">Greater Than</SelectItem>
                <SelectItem value="less_than">Less Than</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
              </SelectContent>
            </Select>

            <Input
              value={dep.value}
              onChange={(e) => updateDependency(index, { value: e.target.value })}
              className="h-7 text-xs"
              placeholder="Value"
            />

            <Select
              value={dep.action}
              onValueChange={(value) => updateDependency(index, { action: value })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="show">Show</SelectItem>
                <SelectItem value="hide">Hide</SelectItem>
                <SelectItem value="enable">Enable</SelectItem>
                <SelectItem value="disable">Disable</SelectItem>
                <SelectItem value="calculate">Calculate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={addDependency}
        className="w-full h-8 text-xs"
      >
        <Plus className="w-3 h-3 mr-1" />
        Add Dependency
      </Button>
    </>
  );
}

// Advanced Section
function AdvancedSection({
  field,
  onUpdate,
}: {
  field: EnhancedFormField;
  onUpdate: (updates: Partial<EnhancedFormField>) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="css-class" className="text-xs">CSS Classes</Label>
        <Input
          id="css-class"
          value={field.cssClass || ''}
          onChange={(e) => onUpdate({ cssClass: e.target.value })}
          className="h-8 text-sm font-mono"
          placeholder="custom-class another-class"
        />
      </div>

      {field.customComponent && (
        <div className="space-y-2">
          <Label htmlFor="component-name" className="text-xs">Custom Component Name</Label>
          <Input
            id="component-name"
            value={field.customComponent.name}
            onChange={(e) =>
              onUpdate({
                customComponent: { ...field.customComponent!, name: e.target.value },
              })
            }
            className="h-8 text-sm font-mono"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="default-value" className="text-xs">Default Value</Label>
        <Input
          id="default-value"
          value={field.default_value || ''}
          onChange={(e) => onUpdate({ default_value: e.target.value })}
          className="h-8 text-sm"
        />
      </div>
    </>
  );
}
