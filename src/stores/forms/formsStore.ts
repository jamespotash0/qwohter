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
  input_type?: 'text' | 'number' | 'email' | 'tel' | 'url' | 'address';
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

// Form definition
export interface Form {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  tags?: string[];
  tabs: FormTab[];
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  is_default?: boolean; // Marks this as the default form for quote creation
  form_type?: string; // Type of form this represents (can be custom or preset like 'quote', 'service_request', etc.)
  starting_proposal_number?: string; // Starting proposal number that auto-increments (e.g., "Q1200", "ER-2025-001")
}

// Default tabs
export const DEFAULT_COMPANY_INFO_TAB: FormTab = {
  id: 'company-info',
  name: 'Company Information',
  order: 0,
  is_default: true,
  fields: [
    {
      id: 'contact_name',
      label: 'Contact Name',
      field_type: 'dropdown',
      required: true,
      placeholder: 'Select contact',
      options: [], // Will be populated from organization members
      order: 0,
      dataSource: {
        type: 'organization_members',
        field: 'full_name',
        allowOverride: true,
      },
      description: 'Select from organization members. System field - cannot be deleted.',
      isSystemField: true,
    },
    {
      id: 'contact_email',
      label: 'Contact Email',
      field_type: 'dropdown',
      required: true,
      placeholder: 'Select email',
      options: [], // Will be populated from organization members
      order: 1,
      dataSource: {
        type: 'organization_members',
        field: 'email',
        allowOverride: true,
      },
      description: 'Select from organization members. System field - cannot be deleted.',
      isSystemField: true,
    },
    {
      id: 'phone_number',
      label: 'Phone Number',
      field_type: 'input',
      input_type: 'tel',
      required: false,
      placeholder: 'Enter a phone number',
      order: 2,
      dataSource: {
        type: 'organization',
        field: 'phone_number',
        allowOverride: true,
      },
      description: 'Auto-populated from organization settings. System field - cannot be deleted.',
      isSystemField: true,
    },
    {
      id: 'fax_number',
      label: 'Fax Number',
      field_type: 'input',
      input_type: 'tel',
      required: false,
      placeholder: 'Enter a fax number',
      order: 3,
      dataSource: {
        type: 'organization',
        field: 'fax_number',
        allowOverride: true,
      },
      description: 'Auto-populated from organization settings. System field - cannot be deleted.',
      isSystemField: true,
    },
    {
      id: 'website',
      label: 'Website',
      field_type: 'input',
      input_type: 'url',
      required: false,
      placeholder: 'https://example.com',
      order: 4,
      dataSource: {
        type: 'organization',
        field: 'website',
        allowOverride: true,
      },
      description: 'Auto-populated from organization settings. System field - cannot be deleted.',
      isSystemField: true,
    },
    {
      id: 'company_address',
      label: 'Company Address',
      field_type: 'textarea',
      required: false,
      placeholder: 'Enter full address',
      order: 5,
      dataSource: {
        type: 'organization',
        field: 'company_address',
        allowOverride: true,
      },
      description: 'Auto-populated from organization settings. System field - cannot be deleted.',
      isSystemField: true,
    },
  ],
};

export const DEFAULT_PROJECT_DETAILS_TAB: FormTab = {
  id: 'project-details',
  name: 'Project Details',
  order: 1,
  is_default: true,
  fields: [
    {
      id: 'client_name',
      label: 'Client Name',
      field_type: 'input',
      input_type: 'text',
      required: true,
      placeholder: 'Enter client name',
      order: 0,
    },
    {
      id: 'client_company',
      label: 'Client Company',
      field_type: 'input',
      input_type: 'text',
      required: false,
      placeholder: 'Enter client company',
      order: 1,
    },
    {
      id: 'project_name',
      label: 'Project Name',
      field_type: 'input',
      input_type: 'text',
      required: true,
      placeholder: 'Enter project name',
      order: 2,
    },
    {
      id: 'project_location',
      label: 'Project Location',
      field_type: 'input',
      input_type: 'text',
      required: false,
      placeholder: 'Enter project location',
      order: 3,
    },
    {
      id: 'project_description',
      label: 'Project Description',
      field_type: 'textarea',
      required: false,
      placeholder: 'Describe the project',
      order: 4,
    },
    {
      id: 'estimated_start_date',
      label: 'Estimated Start Date',
      field_type: 'date',
      required: false,
      order: 5,
    },
    {
      id: 'estimated_completion_date',
      label: 'Estimated Completion Date',
      field_type: 'date',
      required: false,
      order: 6,
    },
  ],
};

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
