/**
 * Form Builder UI Store (UI State Only)
 *
 * This store manages ONLY local UI state and form editing operations.
 * Server operations (fetch, create, update, delete) use React Query hooks
 * from @/hooks/queries/useForms.ts
 *
 * Purpose:
 * - Local form editing state (tabs, fields) before saving
 * - UI state (selected tab, field editor visibility, etc.)
 *
 * NOT for:
 * - Fetching forms from server (use useForms hook)
 * - Creating forms (use useCreateForm hook)
 * - Updating forms (use useUpdateForm hook)
 * - Deleting forms (use useDeleteForm hook)
 */

import { create } from 'zustand';
import { Form, FormTab, FormField, FormBuilderState } from '../types';

interface FormBuilderUIStore {
  // Local form editing state (before save)
  currentForm: Form | null;

  // UI state
  uiState: FormBuilderState;

  // Local form editing actions (don't save to server)
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

export const useFormBuilderStore = create<FormBuilderUIStore>((set, get) => ({
  currentForm: null,

  uiState: {
    selectedTab: null,
    selectedField: null,
    isDragging: false,
    showFieldEditor: false,
    previewMode: false,
  },

  // ===========================================================================
  // LOCAL FORM EDITING ACTIONS (modify local state, don't save to server)
  // ===========================================================================

  setCurrentForm: (form) => set({ currentForm: form }),

  addTab: (tab) => {
    const currentForm = get().currentForm;
    if (!currentForm) return;

    const newTab: FormTab = {
      id: crypto.randomUUID(),
      ...tab,
      fields: [],
    };

    const updatedForm = {
      ...currentForm,
      tabs: [...currentForm.tabs, newTab],
    };

    set({ currentForm: updatedForm });
  },

  updateTab: (tabId, updates) => {
    const currentForm = get().currentForm;
    if (!currentForm) return;

    const updatedForm = {
      ...currentForm,
      tabs: currentForm.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, ...updates } : tab
      ),
    };

    set({ currentForm: updatedForm });
  },

  deleteTab: (tabId) => {
    const currentForm = get().currentForm;
    if (!currentForm) return;

    const updatedForm = {
      ...currentForm,
      tabs: currentForm.tabs.filter((tab) => tab.id !== tabId),
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
      ...field,
    };

    const updatedForm = {
      ...currentForm,
      tabs: currentForm.tabs.map((tab) =>
        tab.id === tabId
          ? { ...tab, fields: [...tab.fields, newField] }
          : tab
      ),
    };

    set({ currentForm: updatedForm });
  },

  updateField: (tabId, fieldId, updates) => {
    const currentForm = get().currentForm;
    if (!currentForm) return;

    const updatedForm = {
      ...currentForm,
      tabs: currentForm.tabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              fields: tab.fields.map((field) =>
                field.id === fieldId ? { ...field, ...updates } : field
              ),
            }
          : tab
      ),
    };

    set({ currentForm: updatedForm });
  },

  deleteField: (tabId, fieldId) => {
    const currentForm = get().currentForm;
    if (!currentForm) return;

    const updatedForm = {
      ...currentForm,
      tabs: currentForm.tabs.map((tab) =>
        tab.id === tabId
          ? { ...tab, fields: tab.fields.filter((f) => f.id !== fieldId) }
          : tab
      ),
    };

    set({ currentForm: updatedForm });
  },

  reorderFields: (tabId, fields) => {
    const currentForm = get().currentForm;
    if (!currentForm) return;

    const updatedForm = {
      ...currentForm,
      tabs: currentForm.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, fields } : tab
      ),
    };

    set({ currentForm: updatedForm });
  },

  duplicateField: (tabId, fieldId) => {
    const currentForm = get().currentForm;
    if (!currentForm) return;

    const tab = currentForm.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    const field = tab.fields.find((f) => f.id === fieldId);
    if (!field) return;

    const duplicatedField: FormField = {
      ...field,
      id: crypto.randomUUID(),
      name: `${field.name}_copy`,
      label: `${field.label} (Copy)`,
      order: field.order + 1,
    };

    const updatedForm = {
      ...currentForm,
      tabs: currentForm.tabs.map((t) =>
        t.id === tabId ? { ...t, fields: [...t.fields, duplicatedField] } : t
      ),
    };

    set({ currentForm: updatedForm });
  },

  // ===========================================================================
  // UI STATE ACTIONS
  // ===========================================================================

  setSelectedTab: (tabId) =>
    set((state) => ({
      uiState: { ...state.uiState, selectedTab: tabId },
    })),

  setSelectedField: (fieldId) =>
    set((state) => ({
      uiState: { ...state.uiState, selectedField: fieldId },
    })),

  setShowFieldEditor: (show) =>
    set((state) => ({
      uiState: { ...state.uiState, showFieldEditor: show },
    })),

  setPreviewMode: (preview) =>
    set((state) => ({
      uiState: { ...state.uiState, previewMode: preview },
    })),
}));
