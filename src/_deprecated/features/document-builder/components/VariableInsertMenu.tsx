/**
 * Variable Insert Menu Component
 * Dropdown menu for inserting variables into the document
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User, Briefcase, DollarSign, Building, Calendar, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DOCUMENT_VARIABLES,
  VARIABLE_CATEGORIES,
} from '../config/variables';
import type { VariableCategory, VariableDefinition, FormFieldVariable } from '../types';

// ============================================================================
// Types
// ============================================================================

interface VariableInsertMenuProps {
  onSelect: (variableKey: string) => void;
  formFields?: FormFieldVariable[]; // Form fields from linked form
  formName?: string; // Name of the linked form
}

// ============================================================================
// Category Icons
// ============================================================================

const CATEGORY_ICONS: Record<VariableCategory, React.ReactNode> = {
  client: <User className="h-4 w-4" />,
  project: <Briefcase className="h-4 w-4" />,
  pricing: <DollarSign className="h-4 w-4" />,
  company: <Building className="h-4 w-4" />,
  dates: <Calendar className="h-4 w-4" />,
  form: <FileText className="h-4 w-4" />,
};

// ============================================================================
// Component
// ============================================================================

export function VariableInsertMenu({ onSelect, formFields, formName }: VariableInsertMenuProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // If formFields are provided, show those; otherwise show static variables
  const hasFormFields = formFields && formFields.length > 0;

  // Filter form fields based on search
  const filteredFormFields = hasFormFields
    ? formFields.filter((field) => {
        if (searchQuery === '') return true;
        return (
          field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          field.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          field.tabName?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
    : [];

  // Group form fields by tab
  const groupedFormFields = filteredFormFields.reduce(
    (acc, field) => {
      const tabName = field.tabName || 'Other';
      if (!acc[tabName]) {
        acc[tabName] = [];
      }
      acc[tabName].push(field);
      return acc;
    },
    {} as Record<string, FormFieldVariable[]>
  );

  // Filter static variables based on search (only if no form fields)
  const filteredVariables = !hasFormFields
    ? DOCUMENT_VARIABLES.filter((variable) => {
        const matchesSearch =
          searchQuery === '' ||
          variable.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          variable.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          variable.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      })
    : [];

  // Group static variables by category
  const groupedVariables = VARIABLE_CATEGORIES.reduce(
    (acc, category) => {
      const categoryVariables = filteredVariables.filter(
        (v) => v.category === category.key
      );
      if (categoryVariables.length > 0) {
        acc[category.key] = categoryVariables;
      }
      return acc;
    },
    {} as Record<VariableCategory, VariableDefinition[]>
  );

  return (
    <div className="flex flex-col">
      {/* Header */}
      {hasFormFields && formName && (
        <div className="px-3 py-2 bg-blue-50 border-b">
          <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
            <FileText className="h-3.5 w-3.5" />
            Variables from: {formName}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search variables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Variable List */}
      <ScrollArea className="h-[300px]">
        {hasFormFields ? (
          // Show form fields grouped by tab
          Object.entries(groupedFormFields).length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No variables found
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(groupedFormFields).map(([tabName, fields]) => (
                <FormFieldGroup
                  key={tabName}
                  tabName={tabName}
                  fields={fields}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )
        ) : (
          // Show static variables
          Object.entries(groupedVariables).length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No variables found. Link a form to use its fields as variables.
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(groupedVariables).map(([categoryKey, variables]) => (
                <VariableCategoryGroup
                  key={categoryKey}
                  categoryKey={categoryKey as VariableCategory}
                  variables={variables}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )
        )}
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface CategoryTabProps {
  label: string;
  icon?: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

function CategoryTab({ label, icon, isActive, onClick }: CategoryTabProps) {
  return (
    <button
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap',
        'transition-colors',
        isActive
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100'
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

interface VariableCategoryGroupProps {
  categoryKey: VariableCategory;
  variables: VariableDefinition[];
  onSelect: (variableKey: string) => void;
}

function VariableCategoryGroup({
  categoryKey,
  variables,
  onSelect,
}: VariableCategoryGroupProps) {
  const category = VARIABLE_CATEGORIES.find((c) => c.key === categoryKey);

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
        {CATEGORY_ICONS[categoryKey]}
        {category?.label}
      </div>
      <div className="space-y-0.5">
        {variables.map((variable) => (
          <VariableItem
            key={variable.key}
            variable={variable}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

interface VariableItemProps {
  variable: VariableDefinition;
  onSelect: (variableKey: string) => void;
}

function VariableItem({ variable, onSelect }: VariableItemProps) {
  return (
    <button
      className={cn(
        'w-full flex items-start gap-2 px-2 py-1.5 rounded',
        'text-left hover:bg-gray-100 transition-colors'
      )}
      onClick={() => onSelect(variable.key)}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {variable.label}
        </div>
        {variable.description && (
          <div className="text-xs text-gray-500 truncate">
            {variable.description}
          </div>
        )}
      </div>
      <code className="text-xs text-blue-600 bg-blue-50 px-1 py-0.5 rounded shrink-0">
        {`{{${variable.key}}}`}
      </code>
    </button>
  );
}

// ============================================================================
// Form Field Components
// ============================================================================

interface FormFieldGroupProps {
  tabName: string;
  fields: FormFieldVariable[];
  onSelect: (variableKey: string) => void;
}

function FormFieldGroup({ tabName, fields, onSelect }: FormFieldGroupProps) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
        <FileText className="h-3.5 w-3.5" />
        {tabName}
      </div>
      <div className="space-y-0.5">
        {fields.map((field) => (
          <FormFieldItem
            key={field.key}
            field={field}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

interface FormFieldItemProps {
  field: FormFieldVariable;
  onSelect: (variableKey: string) => void;
}

function FormFieldItem({ field, onSelect }: FormFieldItemProps) {
  return (
    <button
      className={cn(
        'w-full flex items-start gap-2 px-2 py-1.5 rounded',
        'text-left hover:bg-gray-100 transition-colors'
      )}
      onClick={() => onSelect(field.key)}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {field.label}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {field.fieldType}
        </div>
      </div>
      <code className="text-xs text-blue-600 bg-blue-50 px-1 py-0.5 rounded shrink-0">
        {`{{${field.key}}}`}
      </code>
    </button>
  );
}
