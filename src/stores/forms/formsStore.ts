/**
 * Forms Store
 * State management for form definitions and form builder
 */

import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

// Field definition for form builder
export interface FormField {
  id: string;
  label: string;
  field_type: 'input' | 'textarea' | 'dropdown' | 'checkbox' | 'date' | 'product_selector' | 'calculated';
  input_type?: 'text' | 'number' | 'email' | 'tel' | 'url';
  required: boolean;
  placeholder?: string;
  default_value?: any;
  options?: any[]; // For dropdown/multi-select
  calculation?: string; // For calculated fields (formula)
  depends_on?: { field_id: string; value: any }[] | null;
  order: number;
}

// Tab definition
export interface FormTab {
  id: string;
  name: string;
  order: number;
  fields: FormField[];
  is_default?: boolean; // For Company Info and Project Details tabs
}

// Form definition
export interface FormDefinition {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  tabs: FormTab[];
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

// Default tabs
export const DEFAULT_COMPANY_INFO_TAB: FormTab = {
  id: 'company-info',
  name: 'Company Information',
  order: 0,
  is_default: true,
  fields: [
    {
      id: 'organization_name',
      label: 'Organization Name',
      field_type: 'input',
      input_type: 'text',
      required: true,
      placeholder: 'Enter organization name',
      order: 0,
    },
    {
      id: 'contact_name',
      label: 'Contact Name',
      field_type: 'input',
      input_type: 'text',
      required: true,
      placeholder: 'Enter contact name',
      order: 1,
    },
    {
      id: 'contact_email',
      label: 'Contact Email',
      field_type: 'input',
      input_type: 'email',
      required: true,
      placeholder: 'contact@example.com',
      order: 2,
    },
    {
      id: 'phone_number',
      label: 'Phone Number',
      field_type: 'input',
      input_type: 'tel',
      required: false,
      placeholder: '(555) 555-5555',
      order: 3,
    },
    {
      id: 'fax_number',
      label: 'Fax Number',
      field_type: 'input',
      input_type: 'tel',
      required: false,
      placeholder: '(555) 555-5556',
      order: 4,
    },
    {
      id: 'website',
      label: 'Website',
      field_type: 'input',
      input_type: 'url',
      required: false,
      placeholder: 'https://example.com',
      order: 5,
    },
    {
      id: 'company_address',
      label: 'Company Address',
      field_type: 'textarea',
      required: false,
      placeholder: 'Enter full address',
      order: 6,
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
      id: 'client_location',
      label: 'Client Location',
      field_type: 'input',
      input_type: 'text',
      required: false,
      placeholder: 'City, State',
      order: 2,
    },
    {
      id: 'job_location',
      label: 'Job Location',
      field_type: 'textarea',
      required: false,
      placeholder: 'Enter job site address',
      order: 3,
    },
    {
      id: 'proposal_number',
      label: 'Proposal Number',
      field_type: 'input',
      input_type: 'text',
      required: true,
      placeholder: 'Auto-generated or custom',
      order: 4,
    },
    {
      id: 'current_date',
      label: 'Date',
      field_type: 'date',
      required: true,
      default_value: new Date().toISOString().split('T')[0],
      order: 5,
    },
    {
      id: 'quote_source',
      label: 'Quote Source',
      field_type: 'dropdown',
      required: false,
      options: ['Website', 'Email', 'Phone', 'Referral', 'Trade Show', 'Other'],
      placeholder: 'Select source',
      order: 6,
    },
  ],
};

interface FormsStoreState {
  // State
  forms: FormDefinition[];
  currentForm: FormDefinition | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchForms: (organizationId: string) => Promise<void>;
  fetchFormById: (formId: string) => Promise<FormDefinition | null>;
  createForm: (form: Omit<FormDefinition, 'id' | 'created_at' | 'updated_at'>) => Promise<FormDefinition | null>;
  updateForm: (formId: string, updates: Partial<FormDefinition>) => Promise<boolean>;
  deleteForm: (formId: string) => Promise<boolean>;
  copyForm: (formId: string, newName: string) => Promise<FormDefinition | null>;
  setCurrentForm: (form: FormDefinition | null) => void;
  clearError: () => void;
}

export const useFormsStore = create<FormsStoreState>((set, get) => ({
  // Initial state
  forms: [],
  currentForm: null,
  isLoading: false,
  error: null,

  // Fetch all forms for an organization
  fetchForms: async (organizationId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('form_definitions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      set({ forms: data || [], isLoading: false });
    } catch (error: any) {
      console.error('Error fetching forms:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Fetch single form by ID
  fetchFormById: async (formId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('form_definitions')
        .select('*')
        .eq('id', formId)
        .single();

      if (error) throw error;

      set({ currentForm: data, isLoading: false });
      return data;
    } catch (error: any) {
      console.error('Error fetching form:', error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  // Create new form
  createForm: async (form) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('form_definitions')
        .insert([form])
        .select()
        .single();

      if (error) throw error;

      // Add to forms list
      set((state) => ({
        forms: [data, ...state.forms],
        currentForm: data,
        isLoading: false,
      }));

      return data;
    } catch (error: any) {
      console.error('Error creating form:', error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  // Update form
  updateForm: async (formId, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('form_definitions')
        .update(updates)
        .eq('id', formId)
        .select()
        .single();

      if (error) throw error;

      // Update in forms list
      set((state) => ({
        forms: state.forms.map((f) => (f.id === formId ? data : f)),
        currentForm: state.currentForm?.id === formId ? data : state.currentForm,
        isLoading: false,
      }));

      return true;
    } catch (error: any) {
      console.error('Error updating form:', error);
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  // Delete form (soft delete by setting is_active to false)
  deleteForm: async (formId) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('form_definitions')
        .update({ is_active: false })
        .eq('id', formId);

      if (error) throw error;

      // Remove from forms list
      set((state) => ({
        forms: state.forms.filter((f) => f.id !== formId),
        currentForm: state.currentForm?.id === formId ? null : state.currentForm,
        isLoading: false,
      }));

      return true;
    } catch (error: any) {
      console.error('Error deleting form:', error);
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  // Copy form
  copyForm: async (formId, newName) => {
    set({ isLoading: true, error: null });
    try {
      // Fetch original form
      const { data: original, error: fetchError } = await supabase
        .from('form_definitions')
        .select('*')
        .eq('id', formId)
        .single();

      if (fetchError) throw fetchError;

      // Create copy
      const copy = {
        ...original,
        id: undefined, // Will be auto-generated
        name: newName,
        created_at: undefined,
        updated_at: undefined,
      };

      const { data: newForm, error: createError } = await supabase
        .from('form_definitions')
        .insert([copy])
        .select()
        .single();

      if (createError) throw createError;

      // Add to forms list
      set((state) => ({
        forms: [newForm, ...state.forms],
        isLoading: false,
      }));

      return newForm;
    } catch (error: any) {
      console.error('Error copying form:', error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  // Set current form
  setCurrentForm: (form) => {
    set({ currentForm: form });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
