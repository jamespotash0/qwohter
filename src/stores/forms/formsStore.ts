/**
 * @deprecated This store has been migrated to React Query
 * Use hooks from @/hooks/queries instead
 *
 * Migration:
 * - import { useForms, useForm, useCreateForm, useUpdateForm, useDeleteForm } from '@/hooks/queries'
 * - const { data: forms = [] } = useForms(organizationId)
 * - const { data: form } = useForm(formId)
 * - const { mutate: createForm } = useCreateForm()
 * - const { mutate: updateForm } = useUpdateForm()
 * - const { mutate: deleteForm } = useDeleteForm()
 * - const { mutate: copyForm } = useCopyForm()
 *
 * Types and React Query hooks are exported for backward compatibility
 */

// Field definition for form builder
export interface FormField {
  id: string;
  name?: string; // Variable name for template (optional for backward compatibility)
  label: string;
  type?: string; // Legacy field type
  field_type: 'input' | 'textarea' | 'dropdown' | 'checkbox' | 'radio' | 'date' | 'product_selector' | 'math';
  input_type?: 'text' | 'number' | 'email' | 'tel' | 'url' | 'address' | 'password';
  number_format?: 'decimal' | 'currency' | 'percent' | 'integer'; // Format for number inputs
  required: boolean;
  placeholder?: string;
  default_value?: any;
  options?: any[]; // For dropdown/multi-select
  calculation?: string; // For calculated fields (formula)
  depends_on?: { field_id: string; value: any }[] | null;
  order: number;
  description?: string;
  helpText?: string;
  errorMessage?: string; // Custom error message to display when validation fails
  size?: 'normal' | 'half' | 'full';
  minLength?: number; // For text: min chars, for number: min value
  maxLength?: number; // For text: max chars, for number: max value
  contains?: string; // Text that must be contained in the value (for text validation)
  pattern?: string; // Custom regex pattern for validation
  cssClass?: string;
  // UI variant for rendering (e.g., toggle switch vs standard checkbox)
  uiVariant?: 'default' | 'toggle';
  // Data source mapping for auto-population from organization/user data
  dataSource?: {
    type: 'organization' | 'user' | 'organization_members';
    field: string; // e.g., 'phone_number', 'full_name', 'email'
    allowOverride?: boolean; // Whether users can change the auto-populated value
  };
  // System field protection - cannot be deleted or edited
  isSystemField?: boolean; // Marks this as a protected system field that cannot be removed
  // Template variables support for database value interpolation
  supportsTemplateVariables?: boolean; // Whether this field supports {{templateVar}} syntax
  // Skip validation when default value is present
  skipValidationForDefault?: boolean; // If true, validation is skipped when default_value is set
}

// Tab definition
export interface FormTab {
  id: string;
  name: string;
  description?: string;
  order: number;
  fields: FormField[];
  is_default?: boolean; // For Company Info and Project Details tabs
}

// Document type is now a string to support custom document types per organization
export type DocumentType = string;

// Presentation template structure for document generation
export interface PresentationTemplate {
  version: number;
  layout: string;
  sections: PresentationSection[];
}

export interface PresentationSection {
  id: string;
  type: 'header' | 'content' | 'table' | 'footer' | 'signature';
  content?: string; // HTML/markdown with {{placeholder}} syntax
  order: number;
  settings?: Record<string, any>;
}

// Form definition
export interface Form {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  tabs: FormTab[];
  created_by: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  is_default?: boolean; // Marks this as the default form for quote creation
  document_type?: DocumentType; // Type of document this form creates (Proposal, Quote, Bid, Estimate, Service_Request)
  presentation_template?: PresentationTemplate | null; // Template for document generation with {{placeholder}} syntax
}

// Re-export React Query hooks for backward compatibility
export {
  useForms,
  useForm,
  useDefaultForm,
  useCreateForm,
  useUpdateForm,
  useDeleteForm,
  useCopyForm,
  useSetDefaultForm,
  useUnsetDefaultForm,
} from '@/hooks/queries/useForms';

// Legacy alias for backward compatibility
export { useForms as useFormsStore } from '@/hooks/queries/useForms';
