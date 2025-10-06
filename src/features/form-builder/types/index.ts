/**
 * Form Builder Type Definitions
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'number'
  | 'currency'
  | 'phone'
  | 'date'
  | 'time'
  | 'datetime'
  | 'dropdown'
  | 'multi-select'
  | 'radio'
  | 'checkbox'
  | 'switch'
  | 'file'
  | 'url'
  | 'color'
  | 'rating'
  | 'slider'
  | 'cascading_product';

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customMessage?: string;
}

export interface ConditionalLogic {
  fieldId: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
  value: any;
}

export interface CascadeLevel {
  id: string;
  name: string;
  label: string;
  dependsOn?: string;
  options?: FieldOption[];
}

export interface FormField {
  id: string;
  name: string; // Variable name for template
  label: string;
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  validation?: FieldValidation;
  options?: FieldOption[]; // For dropdown, multi-select, radio
  dependsOn?: string; // Field ID this depends on
  showIf?: ConditionalLogic[]; // Conditional visibility
  cascadeLevels?: CascadeLevel[]; // For cascading_product
  order: number;
  width?: 'full' | 'half' | 'third'; // Layout width
}

export interface FormTab {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order: number;
  fields: FormField[];
}

export interface FormDefinition {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  tabs: FormTab[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}

export interface FormData {
  [key: string]: any;
}

// UI State types
export interface FormBuilderState {
  selectedTab: string | null;
  selectedField: string | null;
  isDragging: boolean;
  showFieldEditor: boolean;
  previewMode: boolean;
}
