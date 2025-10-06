import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export type ProjectPriority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';

export interface Project {
  id: string;
  quote_id: string;
  workflow_status: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  board_order: number;
  priority?: ProjectPriority;
  completion_date?: string;
  // Quote data (joined from quotes table)
  quotes?: {
    id: string;
    proposal_number: string;
    project_name: string;
    quote_details?: any;
    job_details?: any;
    price_details?: any;
  };
}

export interface WorkflowColumn {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  column_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface BoardStore {
  projects: Project[];
  workflowColumns: WorkflowColumn[];
  isLoading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  fetchWorkflowColumns: () => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  createWorkflowColumn: (column: Omit<WorkflowColumn, 'id' | 'created_at' | 'updated_at' | 'organization_id'>) => Promise<void>;
  updateWorkflowColumn: (id: string, updates: Partial<WorkflowColumn>) => Promise<void>;
  deleteWorkflowColumn: (id: string) => Promise<void>;
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  projects: [],
  workflowColumns: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's organization
      const { data: membership } = await supabase
        .from('memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) throw new Error('No active organization');

      // Fetch projects with joined quote data
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          quotes (
            id,
            proposal_number,
            project_name,
            quote_details,
            job_details,
            price_details
          )
        `)
        .eq('organization_id', membership.organization_id)
        .order('board_order', { ascending: true });

      if (error) throw error;

      set({ projects: data || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchWorkflowColumns: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's organization
      const { data: membership } = await supabase
        .from('memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) throw new Error('No active organization');

      const { data, error } = await supabase
        .from('project_workflow_columns')
        .select('*')
        .eq('organization_id', membership.organization_id)
        .order('column_order', { ascending: true });

      if (error) throw error;

      set({ workflowColumns: data || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateProject: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p)
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        projects: state.projects.filter(p => p.id !== id),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createWorkflowColumn: async (column) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's organization
      const { data: membership } = await supabase
        .from('memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) throw new Error('No active organization');

      const { data, error } = await supabase
        .from('project_workflow_columns')
        .insert({
          ...column,
          organization_id: membership.organization_id
        } as any)
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        workflowColumns: [...state.workflowColumns, data],
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateWorkflowColumn: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('project_workflow_columns')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        workflowColumns: state.workflowColumns.map(c => c.id === id ? { ...c, ...updates } : c)
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteWorkflowColumn: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('project_workflow_columns')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        workflowColumns: state.workflowColumns.filter(c => c.id !== id),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  }
}));
