/**
 * Quotes Store
 * State management for quotes (form submissions)
 */

import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

// Quote definition based on quotes_formbuilder_test table
export interface Quote {
  id: string;
  organization_id: string;
  created_by: string;
  proposal_number: string;
  project_name?: string;
  status: 'Draft' | 'Incomplete' | 'Complete' | 'Sent' | 'Accepted' | 'Rejected';
  form_definition_id?: string;
  form_response_data: Record<string, any>;
  product_items: any[];
  computed_totals: {
    subtotal?: number;
    tax?: number;
    total?: number;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

interface QuotesStoreState {
  // State
  quotes: Quote[];
  currentQuote: Quote | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchQuotes: (organizationId: string) => Promise<void>;
  fetchQuoteById: (quoteId: string) => Promise<Quote | null>;
  createQuote: (quote: Omit<Quote, 'id' | 'created_at' | 'updated_at'>) => Promise<Quote | null>;
  updateQuote: (quoteId: string, updates: Partial<Quote>) => Promise<boolean>;
  deleteQuote: (quoteId: string) => Promise<boolean>;
  copyQuote: (quoteId: string, newProjectName?: string) => Promise<Quote | null>;
  archiveQuote: (quoteId: string) => Promise<boolean>;
  unarchiveQuote: (quoteId: string) => Promise<boolean>;
  generateProposalNumber: (organizationId: string) => Promise<string>;
  setCurrentQuote: (quote: Quote | null) => void;
  clearError: () => void;
}

// Helper to generate proposal number
const generateProposalNumber = async (organizationId: string): Promise<string> => {
  // Get the count of existing quotes for this organization
  const { count, error } = await supabase
    .from('quotes_formbuilder_test')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error counting quotes:', error);
    return `PROP-${Date.now()}`;
  }

  const nextNumber = (count || 0) + 1;
  const year = new Date().getFullYear();
  const paddedNumber = String(nextNumber).padStart(4, '0');

  return `${year}-${paddedNumber}`;
};

export const useQuotesStore = create<QuotesStoreState>((set, get) => ({
  // Initial state
  quotes: [],
  currentQuote: null,
  isLoading: false,
  error: null,

  // Fetch all quotes for an organization
  fetchQuotes: async (organizationId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('quotes_formbuilder_test')
        .select('*')
        .eq('organization_id', organizationId)
        .is('archived_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      set({ quotes: data || [], isLoading: false });
    } catch (error: any) {
      console.error('Error fetching quotes:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Fetch single quote by ID
  fetchQuoteById: async (quoteId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('quotes_formbuilder_test')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (error) throw error;

      set({ currentQuote: data, isLoading: false });
      return data;
    } catch (error: any) {
      console.error('Error fetching quote:', error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  // Create new quote
  createQuote: async (quote) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('quotes_formbuilder_test')
        .insert([quote])
        .select()
        .single();

      if (error) throw error;

      // Add to quotes list
      set((state) => ({
        quotes: [data, ...state.quotes],
        currentQuote: data,
        isLoading: false,
      }));

      return data;
    } catch (error: any) {
      console.error('Error creating quote:', error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  // Update quote
  updateQuote: async (quoteId, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('quotes_formbuilder_test')
        .update(updates)
        .eq('id', quoteId)
        .select()
        .single();

      if (error) throw error;

      // Update in quotes list
      set((state) => ({
        quotes: state.quotes.map((q) => (q.id === quoteId ? data : q)),
        currentQuote: state.currentQuote?.id === quoteId ? data : state.currentQuote,
        isLoading: false,
      }));

      return true;
    } catch (error: any) {
      console.error('Error updating quote:', error);
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  // Delete quote (hard delete)
  deleteQuote: async (quoteId) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('quotes_formbuilder_test')
        .delete()
        .eq('id', quoteId);

      if (error) throw error;

      // Remove from quotes list
      set((state) => ({
        quotes: state.quotes.filter((q) => q.id !== quoteId),
        currentQuote: state.currentQuote?.id === quoteId ? null : state.currentQuote,
        isLoading: false,
      }));

      return true;
    } catch (error: any) {
      console.error('Error deleting quote:', error);
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  // Copy quote
  copyQuote: async (quoteId, newProjectName) => {
    set({ isLoading: true, error: null });
    try {
      // Fetch original quote
      const { data: original, error: fetchError } = await supabase
        .from('quotes_formbuilder_test')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (fetchError) throw fetchError;

      // Generate new proposal number
      const newProposalNumber = await generateProposalNumber(original.organization_id);

      // Create copy
      const copy = {
        ...original,
        id: undefined, // Will be auto-generated
        proposal_number: newProposalNumber,
        project_name: newProjectName || `${original.project_name} (Copy)`,
        status: 'Draft' as const,
        created_at: undefined,
        updated_at: undefined,
      };

      const { data: newQuote, error: createError } = await supabase
        .from('quotes_formbuilder_test')
        .insert([copy])
        .select()
        .single();

      if (createError) throw createError;

      // Add to quotes list
      set((state) => ({
        quotes: [newQuote, ...state.quotes],
        isLoading: false,
      }));

      return newQuote;
    } catch (error: any) {
      console.error('Error copying quote:', error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  // Archive quote (soft delete)
  archiveQuote: async (quoteId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('quotes_formbuilder_test')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', quoteId)
        .select()
        .single();

      if (error) throw error;

      // Remove from quotes list (will be filtered by archived_at)
      set((state) => ({
        quotes: state.quotes.filter((q) => q.id !== quoteId),
        currentQuote: state.currentQuote?.id === quoteId ? null : state.currentQuote,
        isLoading: false,
      }));

      return true;
    } catch (error: any) {
      console.error('Error archiving quote:', error);
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  // Unarchive quote
  unarchiveQuote: async (quoteId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('quotes_formbuilder_test')
        .update({ archived_at: null })
        .eq('id', quoteId)
        .select()
        .single();

      if (error) throw error;

      // Add back to quotes list
      set((state) => ({
        quotes: [data, ...state.quotes],
        isLoading: false,
      }));

      return true;
    } catch (error: any) {
      console.error('Error unarchiving quote:', error);
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  // Generate proposal number
  generateProposalNumber: async (organizationId: string) => {
    return generateProposalNumber(organizationId);
  },

  // Set current quote
  setCurrentQuote: (quote) => {
    set({ currentQuote: quote });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
