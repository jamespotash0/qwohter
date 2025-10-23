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
    status?: string;
    is_main_version?: boolean;
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
  isInitialized: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  fetchWorkflowColumns: () => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  createWorkflowColumn: (column: Omit<WorkflowColumn, 'id' | 'created_at' | 'updated_at' | 'organization_id'>) => Promise<void>;
  updateWorkflowColumn: (id: string, updates: Partial<WorkflowColumn>) => Promise<void>;
  deleteWorkflowColumn: (id: string) => Promise<void>;
  initializeBoard: () => Promise<void>;
  subscribeToChanges: (organizationId: string) => () => void;
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  projects: [],
  workflowColumns: [],
  isLoading: false,
  isInitialized: false,
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
      // Only show projects where the quote is the main version AND has Won status
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          quotes!inner (
            id,
            proposal_number,
            project_name,
            quote_details,
            job_details,
            price_details,
            status,
            is_main_version
          )
        `)
        .eq('organization_id', membership.organization_id)
        .eq('quotes.is_main_version', true)
        .eq('quotes.status', 'Won')
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
      // Convert undefined values to null for Supabase
      const cleanedUpdates = Object.fromEntries(
        Object.entries(updates).map(([key, value]) => [key, value === undefined ? null : value])
      );

      const { error } = await supabase
        .from('projects')
        .update(cleanedUpdates)
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
  },

  // Initialize board - fetch data only once
  initializeBoard: async () => {
    const { isInitialized, isLoading } = get();

    // Don't re-fetch if already initialized or currently loading
    if (isInitialized || isLoading) return;

    set({ isLoading: true, error: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: membership } = await supabase
        .from('memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) throw new Error('No active organization');

      // Fetch both projects and columns in parallel
      const [projectsResult, columnsResult] = await Promise.all([
        supabase
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
          .order('board_order', { ascending: true }),
        supabase
          .from('project_workflow_columns')
          .select('*')
          .eq('organization_id', membership.organization_id)
          .order('column_order', { ascending: true })
      ]);

      if (projectsResult.error) throw projectsResult.error;
      if (columnsResult.error) throw columnsResult.error;

      set({
        projects: projectsResult.data || [],
        workflowColumns: columnsResult.data || [],
        isLoading: false,
        isInitialized: true
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Subscribe to real-time changes
  subscribeToChanges: (organizationId: string) => {
    // Subscribe to projects table changes
    const projectsSubscription = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `organization_id=eq.${organizationId}`
        },
        async (payload) => {
          console.log('Project change detected:', payload);

          if (payload.eventType === 'INSERT') {
            // Fetch the new project with quote data
            // Only add if quote is main version and Won status
            const { data } = await supabase
              .from('projects')
              .select(`
                *,
                quotes!inner (
                  id,
                  proposal_number,
                  project_name,
                  quote_details,
                  job_details,
                  price_details,
                  status,
                  is_main_version
                )
              `)
              .eq('id', payload.new.id)
              .eq('quotes.is_main_version', true)
              .eq('quotes.status', 'Won')
              .maybeSingle();

            if (data) {
              set(state => ({
                projects: [...state.projects, data]
              }));
            }
          } else if (payload.eventType === 'UPDATE') {
            // Fetch updated project with quote data
            // Only show if quote is main version and Won status, otherwise remove
            const { data, error } = await supabase
              .from('projects')
              .select(`
                *,
                quotes!inner (
                  id,
                  proposal_number,
                  project_name,
                  quote_details,
                  job_details,
                  price_details,
                  status,
                  is_main_version
                )
              `)
              .eq('id', payload.new.id)
              .eq('quotes.is_main_version', true)
              .eq('quotes.status', 'Won')
              .maybeSingle();

            if (!error && data) {
              // Quote meets criteria, update or add it
              set(state => ({
                projects: state.projects.some(p => p.id === data.id)
                  ? state.projects.map(p => p.id === data.id ? data : p)
                  : [...state.projects, data]
              }));
            } else if (!error && !data) {
              // Quote doesn't meet criteria anymore, remove it
              set(state => ({
                projects: state.projects.filter(p => p.id !== payload.new.id)
              }));
            } else if (error) {
              console.error('Error fetching updated project:', error);
            }
          } else if (payload.eventType === 'DELETE') {
            set(state => ({
              projects: state.projects.filter(p => p.id !== payload.old.id)
            }));
          }
        }
      )
      .subscribe();

    // Subscribe to workflow columns changes
    const columnsSubscription = supabase
      .channel('columns-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_workflow_columns',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('Column change detected:', payload);

          if (payload.eventType === 'INSERT') {
            set(state => ({
              workflowColumns: [...state.workflowColumns, payload.new as WorkflowColumn]
            }));
          } else if (payload.eventType === 'UPDATE') {
            set(state => ({
              workflowColumns: state.workflowColumns.map(c =>
                c.id === payload.new.id ? payload.new as WorkflowColumn : c
              )
            }));
          } else if (payload.eventType === 'DELETE') {
            set(state => ({
              workflowColumns: state.workflowColumns.filter(c => c.id !== payload.old.id)
            }));
          }
        }
      )
      .subscribe();

    // Return cleanup function
    // Subscribe to quotes table changes
    // When a quote's status or is_main_version changes, update the board
    const quotesSubscription = supabase
      .channel('quotes-board-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quotes',
          filter: `organization_id=eq.${organizationId}`
        },
        async (payload) => {
          console.log('Quote change detected for board:', payload);

          // If is_main_version changed, refetch entire project list to ensure consistency
          if (payload.old?.is_main_version !== payload.new?.is_main_version) {
            console.log('is_main_version changed - refetching all projects');
            const { data } = await supabase
              .from('projects')
              .select(`
                *,
                quotes!inner (
                  id,
                  proposal_number,
                  project_name,
                  quote_details,
                  job_details,
                  price_details,
                  status,
                  is_main_version
                )
              `)
              .eq('organization_id', organizationId)
              .eq('quotes.is_main_version', true)
              .eq('quotes.status', 'Won')
              .order('board_order', { ascending: true });

            if (data) {
              set({ projects: data });
            }
            return;
          }

          // Check if there's a project for this quote
          const { data: projectData } = await supabase
            .from('projects')
            .select('id, quote_id')
            .eq('quote_id', payload.new.id)
            .eq('organization_id', organizationId)
            .maybeSingle();

          // Determine if quote now meets criteria (is_main_version AND Won)
          const meetsCriteria = payload.new.is_main_version === true && payload.new.status === 'Won';

          if (meetsCriteria && projectData) {
            // Quote meets criteria and project exists - refetch to update display data
            const { data } = await supabase
              .from('projects')
              .select(`
                *,
                quotes!inner (
                  id,
                  proposal_number,
                  project_name,
                  quote_details,
                  job_details,
                  price_details,
                  status,
                  is_main_version
                )
              `)
              .eq('id', projectData.id)
              .eq('quotes.is_main_version', true)
              .eq('quotes.status', 'Won')
              .maybeSingle();

            if (data) {
              set(state => ({
                projects: state.projects.some(p => p.id === data.id)
                  ? state.projects.map(p => p.id === data.id ? data : p)
                  : [...state.projects, data]
              }));
            }
          } else if (!meetsCriteria && projectData) {
            // Quote no longer meets criteria - remove from board
            set(state => ({
              projects: state.projects.filter(p => p.id !== projectData.id)
            }));
          } else if (meetsCriteria && !projectData) {
            // Quote meets criteria but no project exists - this shouldn't normally happen
            // but could occur if quote status/main changed before project was created
            // The setMainVersion function in quotesStore handles project creation
            console.log('Quote meets criteria but no project exists - waiting for project creation');
          }
          // else: Quote doesn't meet criteria and no project exists - nothing to do
        }
      )
      .subscribe();

    return () => {
      projectsSubscription.unsubscribe();
      columnsSubscription.unsubscribe();
      quotesSubscription.unsubscribe();
    };
  }
}));
