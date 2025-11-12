import { create } from 'zustand';
import { Form, FormTab, FormField, FormBuilderState } from '../types';
import { supabase } from '@/integrations/supabase/client';

interface FormBuilderStore {
  // Forms data
  forms: Form[];
  currentForm: Form | null;
  isLoading: boolean;
  error: string | null;

  // UI state
  uiState: FormBuilderState;

  // Actions
  fetchForms: () => Promise<void>;
  fetchFormById: (id: string) => Promise<void>;
  createForm: (form: Omit<Form, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateForm: (id: string, updates: Partial<Form>) => Promise<void>;
  deleteForm: (id: string) => Promise<void>;
  duplicateForm: (id: string) => Promise<string>;

  // Form building actions
  setCurrentForm: (form: Form | null) => void;
  addTab: (tab: Omit<FormTab, 'id' | 'fields'>) => void;
  updateTab: (tabId: string, updates: Partial<FormTab>) => void;
  deleteTab: (tabId: string) => void;
  reorderTabs: (tabs: FormTab[]) => void;

  addField: (tabId: string, field: Omit<FormField, 'id'>) => void;
  updateField: (tabId: string, fieldId: string, updates: Partial<FormField>) => void;
  deleteField: (tabId: string, fieldId: string) => void;
  reorderFields: (tabId: string, fields: FormField[]) => void;
  duplicateField: (tabId: string, fieldId: string) => void;

  // UI state actions
  setSelectedTab: (tabId: string | null) => void;
  setSelectedField: (fieldId: string | null) => void;
  setShowFieldEditor: (show: boolean) => void;
  setPreviewMode: (preview: boolean) => void;
}

export const useFormBuilderStore = create<FormBuilderStore>((set, get) => ({
  forms: [],
  currentForm: null,
  isLoading: false,
  error: null,

  uiState: {
    selectedTab: null,
    selectedField: null,
    isDragging: false,
    showFieldEditor: false,
    previewMode: false,
  },

  fetchForms: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase
        .from('forms') as any)
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const forms = (data || []).map((form: any) => ({
        ...form,
        tabs: (form.tabs as FormTab[]) || []
      })) as Form[];

      set({ forms, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchFormById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await (supabase
        .from('forms') as any)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const form = {
        ...data,
        tabs: (data.tabs as FormTab[]) || []
      } as Form;

      set({ currentForm: form, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createForm: async (form) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's organization
      const { data: membership } = await (supabase
        .from('memberships') as any)
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!membership?.organization_id) {
        throw new Error('User not assigned to an organization');
      }

      // Map to database schema - include all required fields
      const dbForm = {
        organization_id: membership.organization_id as string,
        name: form.name,
        description: form.description,
        form_type: form.form_type || 'Custom',
        tabs: form.tabs,
        created_by: user.id,
        is_archived: false,
        is_default: false,
        starting_proposal_number: form.startingProposalNumber || 'DOC-1000',
        allow_save_incomplete: true
      };

      const { data, error } = await (supabase
        .from('forms') as any)
        .insert(dbForm)
        .select()
        .single();

      if (error) throw error;

      const newForm = {
        ...data,
        tabs: (data.tabs as FormTab[]) || []
      } as Form;

      set(state => ({
        forms: [newForm, ...state.forms],
        currentForm: newForm,
        isLoading: false
      }));

      return data.id;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateForm: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      // Map to database schema
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.tabs !== undefined) dbUpdates.tabs = updates.tabs;
      if (updates.form_type !== undefined) dbUpdates.form_type = updates.form_type;

      const { error } = await (supabase
        .from('forms') as any)
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        forms: state.forms.map(f => f.id === id ? { ...f, ...updates } : f),
        currentForm: state.currentForm?.id === id
          ? { ...state.currentForm, ...updates }
          : state.currentForm,
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteForm: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await (supabase
        .from('forms') as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        forms: state.forms.filter(f => f.id !== id),
        currentForm: state.currentForm?.id === id ? null : state.currentForm,
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  duplicateForm: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const original = get().forms.find(f => f.id === id);
      if (!original) throw new Error('Form not found');

      const duplicate = {
        ...original,
        name: `${original.name} (Copy)`,
      };

      const newId = await get().createForm(duplicate);
      set({ isLoading: false });
      return newId;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  setCurrentForm: (form) => set({ currentForm: form }),

  addTab: (tab) => {
    const currentForm = get().currentForm;
    if (!currentForm) return;

    const newTab: FormTab = {
      id: crypto.randomUUID(),
      ...tab,
      fields: []
    };

    const updatedForm = {
      ...currentForm,
      tabs: [...currentForm.tabs, newTab]
    };

    set({ currentForm: updatedForm });
  },

  updateTab: (tabId, updates) => {
    const currentForm = get().currentForm;
    if (!currentForm) return;

    const updatedForm = {
      ...currentForm,
      tabs: currentForm.tabs.map(tab =>
        tab.id === tabId ? { ...tab, ...updates } : tab
      )
    };

    set({ currentForm: updatedForm });
  },

  deleteTab: (tabId) => {
    const currentForm = get().currentForm;
    if (!currentForm) return;

    const updatedForm = {
      ...currentForm,
      tabs: currentForm.tabs.filter(tab => tab.id !== tabId)
    };

    set({ currentForm: updatedForm });
  },

  reorderTabs: (tabs) => {
    const currentForm = get().currentForm;
    if (!currentForm) return;

    set({ currentForm: { ...currentForm, tabs } });
  },

  addField: (tabId, field) => {
    const currentForm = get().currentForm;
    if (!currentForm) return;

    const newField: FormField = {
      id: crypto.randomUUID(),
      ...field
    };

    const updatedForm = {
      ...currentForm,
      tabs: currentForm.tabs.map(tab =>
        tab.id === tabId
          ? { ...tab, fields: [...tab.fields, newField] }
          : tab
      )
    };

    set({ currentForm: updatedForm });
  },

  updateField: (tabId, fieldId, updates) => {
    const currentForm = get().currentForm;
    if (!currentForm) return;

    const updatedForm = {
      ...currentForm,
      tabs: currentForm.tabs.map(tab =>
        tab.id === tabId
          ? {
              ...tab,
              fields: tab.fields.map(field =>
                field.id === fieldId ? { ...field, ...updates } : field
              )
            }
          : tab
      )
    };

    set({ currentForm: updatedForm });
  },

  deleteField: (tabId, fieldId) => {
    const currentForm = get().currentForm;
    if (!currentForm) return;

    const updatedForm = {
      ...currentForm,
      tabs: currentForm.tabs.map(tab =>
        tab.id === tabId
          ? { ...tab, fields: tab.fields.filter(f => f.id !== fieldId) }
          : tab
      )
    };

    set({ currentForm: updatedForm });
  },

  reorderFields: (tabId, fields) => {
    const currentForm = get().currentForm;
    if (!currentForm) return;

    const updatedForm = {
      ...currentForm,
      tabs: currentForm.tabs.map(tab =>
        tab.id === tabId ? { ...tab, fields } : tab
      )
    };

    set({ currentForm: updatedForm });
  },

  duplicateField: (tabId, fieldId) => {
    const currentForm = get().currentForm;
    if (!currentForm) return;

    const tab = currentForm.tabs.find(t => t.id === tabId);
    if (!tab) return;

    const field = tab.fields.find(f => f.id === fieldId);
    if (!field) return;

    const duplicatedField: FormField = {
      ...field,
      id: crypto.randomUUID(),
      name: `${field.name}_copy`,
      label: `${field.label} (Copy)`,
      order: field.order + 1
    };

    const updatedForm = {
      ...currentForm,
      tabs: currentForm.tabs.map(t =>
        t.id === tabId
          ? { ...t, fields: [...t.fields, duplicatedField] }
          : t
      )
    };

    set({ currentForm: updatedForm });
  },

  setSelectedTab: (tabId) => set(state => ({
    uiState: { ...state.uiState, selectedTab: tabId }
  })),

  setSelectedField: (fieldId) => set(state => ({
    uiState: { ...state.uiState, selectedField: fieldId }
  })),

  setShowFieldEditor: (show) => set(state => ({
    uiState: { ...state.uiState, showFieldEditor: show }
  })),

  setPreviewMode: (preview) => set(state => ({
    uiState: { ...state.uiState, previewMode: preview }
  })),
}));
