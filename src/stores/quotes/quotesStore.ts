import { create } from 'zustand';
import { subscribeWithSelector, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { supabase } from '@/integrations/supabase/client';
import type { Quote } from '@/hooks/useQuotes';
import type { WallSpecification, WallDetails } from '@/types/quote';
import { filterWallDetailsForSave } from '@/utils/wallDataFilter';

interface QuotesState {
  // State
  quotes: Quote[];
  currentQuote: Quote | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  filters: {
    search: string;
    status: string;
    dateRange: [Date | null, Date | null];
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };

  // Actions
  initialize: () => Promise<void>;
  fetchQuotes: (options?: { refresh?: boolean }) => Promise<void>;
  createQuote: (quoteData: any) => Promise<Quote>;
  updateQuote: (id: string, updates: Partial<Quote>) => Promise<Quote>;
  deleteQuote: (id: string) => Promise<void>;
  setCurrentQuote: (quote: Quote | null) => void;
  
  // Wall system actions
  updateWallSystem: (quoteId: string, wallName: string, wallData: WallSpecification) => Promise<void>;
  removeWallSystem: (quoteId: string, wallName: string) => Promise<void>;
  addWallSystem: (quoteId: string, wallName: string, wallData: WallSpecification) => Promise<void>;
  
  // Filter and pagination
  setFilters: (filters: Partial<QuotesState['filters']>) => void;
  setPagination: (pagination: Partial<QuotesState['pagination']>) => void;
  clearFilters: () => void;
  
  // Utilities
  getQuoteById: (id: string) => Quote | undefined;
  getFilteredQuotes: () => Quote[];
  clearError: () => void;

  // Internal actions
  _setQuotes: (quotes: Quote[]) => void;
  _setLoading: (loading: boolean) => void;
  _setError: (error: string | null) => void;
}

export const useQuotesStore = create<QuotesState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        quotes: [],
        currentQuote: null,
        isLoading: false,
        isInitialized: false,
        error: null,
        filters: {
          search: '',
          status: '',
          dateRange: [null, null],
        },
        pagination: {
          page: 1,
          pageSize: 10,
          total: 0,
        },

        // Initialize quotes store
        initialize: async () => {
          const { fetchQuotes, _setLoading } = get();
          
          try {
            _setLoading(true);
            await fetchQuotes();
            set({ isInitialized: true });
          } catch (error) {
            console.error('Quotes store initialization error:', error);
          } finally {
            _setLoading(false);
          }
        },

        // Fetch quotes with optional refresh
        fetchQuotes: async (options = {}) => {
          const { _setQuotes, _setLoading, _setError, pagination } = get();
          
          try {
            if (!options.refresh) _setLoading(true);
            _setError(null);
            
            const { data, error, count } = await supabase
              .from('quotes')
              .select('*', { count: 'exact' })
              .order('created_at', { ascending: false })
              .range(
                (pagination.page - 1) * pagination.pageSize,
                pagination.page * pagination.pageSize - 1
              );
            
            if (error) throw error;
            
            const processedQuotes = data?.map(convertRowToQuote) || [];
            _setQuotes(processedQuotes);
            
            set((state) => {
              state.pagination.total = count || 0;
            });
          } catch (error) {
            console.error('Fetch quotes error:', error);
            _setError(error instanceof Error ? error.message : 'Failed to fetch quotes');
            throw error;
          } finally {
            _setLoading(false);
          }
        },

        // Create new quote
        createQuote: async (quoteData: any) => {
          const { quotes, _setQuotes, _setLoading, _setError } = get();
          
          try {
            _setLoading(true);
            _setError(null);
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            // Get user's organization
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('organization_id')
              .eq('id', user.id)
              .single();
            
            if (profileError) throw profileError;
            if (!profileData?.organization_id) {
              throw new Error('User not assigned to an organization');
            }
            
            const { data, error } = await supabase
              .from('quotes')
              .insert({
                proposal_number: quoteData.jobDetails.proposalNumber,
                project_name: quoteData.quoteName || quoteData.project_name,
                quote_details: quoteData.contactInfo || {},
                job_details: {
                  job_location: quoteData.jobDetails.jobLocation || '',
                  client_name: quoteData.jobDetails.billedTo.name || '',
                  client_company: quoteData.jobDetails.billedTo.company || '',
                  client_address: quoteData.jobDetails.billedTo.address || '',
                  date: quoteData.jobDetails.date
                },
                wall_details: filterWallDetailsForSave(quoteData.walls || {}),
                pocket_doors: quoteData.pocketDoors || {},
                price_details: {
                  base_price: quoteData.pricing.basePrice,
                  freight: quoteData.pricing.freight,
                  total: quoteData.pricing.total,
                  payment_upon_drawings: quoteData.pricing.paymentUponDrawings,
                  payment_upon_track_installation: quoteData.pricing.paymentUponTrackInstallation
                },
                support_structure: quoteData.supportStructure || {},
                delivery_details: quoteData.deliveryLabor.delivery || {},
                labor_details: quoteData.deliveryLabor.labor || {},
                status: quoteData.status || 'Draft',
                user_id: user.id,
                organization_id: profileData.organization_id
              })
              .select()
              .single();
            
            if (error) throw error;
            
            const newQuote = convertRowToQuote(data);
            _setQuotes([newQuote, ...quotes]);
            
            return newQuote;
          } catch (error) {
            console.error('Create quote error:', error);
            _setError(error instanceof Error ? error.message : 'Failed to create quote');
            throw error;
          } finally {
            _setLoading(false);
          }
        },

        // Update quote
        updateQuote: async (id: string, updates: Partial<Quote>) => {
          const { quotes, currentQuote, _setQuotes, _setLoading, _setError } = get();
          
          try {
            _setLoading(true);
            _setError(null);
            
            // Process wall details if included
            let processedUpdates = { ...updates };
            if (updates.wall_details) {
              processedUpdates.wall_details = filterWallDetailsForSave(updates.wall_details);
            }
            
            const { data, error } = await supabase
              .from('quotes')
              .update(processedUpdates as any)
              .eq('id', id)
              .select()
              .single();
            
            if (error) throw error;
            
            const updatedQuote = convertRowToQuote(data);
            
            set((state) => {
              const index = state.quotes.findIndex(q => q.id === id);
              if (index !== -1) {
                state.quotes[index] = updatedQuote;
              }
              
              if (state.currentQuote?.id === id) {
                state.currentQuote = updatedQuote;
              }
            });
            
            return updatedQuote;
          } catch (error) {
            console.error('Update quote error:', error);
            _setError(error instanceof Error ? error.message : 'Failed to update quote');
            throw error;
          } finally {
            _setLoading(false);
          }
        },

        // Delete quote
        deleteQuote: async (id: string) => {
          const { _setLoading, _setError } = get();
          
          try {
            _setLoading(true);
            _setError(null);
            
            const { error } = await supabase
              .from('quotes')
              .delete()
              .eq('id', id);
            
            if (error) throw error;
            
            set((state) => {
              state.quotes = state.quotes.filter(q => q.id !== id);
              if (state.currentQuote?.id === id) {
                state.currentQuote = null;
              }
            });
          } catch (error) {
            console.error('Delete quote error:', error);
            _setError(error instanceof Error ? error.message : 'Failed to delete quote');
            throw error;
          } finally {
            _setLoading(false);
          }
        },

        // Set current quote
        setCurrentQuote: (quote: Quote | null) => {
          set({ currentQuote: quote });
        },

        // Update wall system in quote
        updateWallSystem: async (quoteId: string, wallName: string, wallData: WallSpecification) => {
          const { updateQuote } = get();
          
          // Get current quote
          const { data: currentQuote, error: fetchError } = await supabase
            .from('quotes')
            .select('wall_details')
            .eq('id', quoteId)
            .single();
          
          if (fetchError) throw fetchError;
          
          const currentWallDetails = migrateWallDetails(currentQuote.wall_details);
          const updatedWallDetails = {
            ...currentWallDetails,
            walls: {
              ...currentWallDetails.walls,
              [wallName]: wallData
            }
          };
          
          await updateQuote(quoteId, { wall_details: updatedWallDetails });
        },

        // Remove wall system from quote
        removeWallSystem: async (quoteId: string, wallNameToRemove: string) => {
          const { updateQuote } = get();
          
          // Get current quote
          const { data: currentQuote, error: fetchError } = await supabase
            .from('quotes')
            .select('wall_details')
            .eq('id', quoteId)
            .single();
          
          if (fetchError) throw fetchError;
          
          const currentWallDetails = migrateWallDetails(currentQuote.wall_details);
          const currentWalls = { ...currentWallDetails.walls };
          
          // Remove the specified wall
          delete currentWalls[wallNameToRemove];
          
          // Rename remaining walls
          const remainingWallNames = Object.keys(currentWalls).sort();
          const renamedWalls: { [key: string]: WallSpecification } = {};
          const wallLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
          
          remainingWallNames.forEach((oldWallName, index) => {
            const newWallName = `Wall ${wallLabels[index]}`;
            renamedWalls[newWallName] = currentWalls[oldWallName];
          });
          
          const updatedWallDetails = {
            ...currentWallDetails,
            walls: renamedWalls
          };
          
          await updateQuote(quoteId, { wall_details: updatedWallDetails });
        },

        // Add wall system to quote
        addWallSystem: async (quoteId: string, wallName: string, wallData: WallSpecification) => {
          const { updateWallSystem } = get();
          await updateWallSystem(quoteId, wallName, wallData);
        },

        // Set filters
        setFilters: (filters: Partial<QuotesState['filters']>) => {
          set((state) => {
            Object.assign(state.filters, filters);
          });
        },

        // Set pagination
        setPagination: (pagination: Partial<QuotesState['pagination']>) => {
          set((state) => {
            Object.assign(state.pagination, pagination);
          });
        },

        // Clear filters
        clearFilters: () => {
          set((state) => {
            state.filters = {
              search: '',
              status: '',
              dateRange: [null, null],
            };
          });
        },

        // Get quote by ID
        getQuoteById: (id: string) => {
          const { quotes } = get();
          return quotes.find(q => q.id === id);
        },

        // Get filtered quotes
        getFilteredQuotes: () => {
          const { quotes, filters } = get();
          
          return quotes.filter(quote => {
            // Search filter
            if (filters.search) {
              const searchLower = filters.search.toLowerCase();
              const matchesSearch = (
                quote.proposal_number.toLowerCase().includes(searchLower) ||
                quote.project_name?.toLowerCase().includes(searchLower) ||
                quote.job_details?.client_name?.toLowerCase().includes(searchLower)
              );
              if (!matchesSearch) return false;
            }
            
            // Status filter
            if (filters.status && quote.status !== filters.status) {
              return false;
            }
            
            // Date range filter
            const [startDate, endDate] = filters.dateRange;
            if (startDate || endDate) {
              const quoteDate = new Date(quote.created_at);
              if (startDate && quoteDate < startDate) return false;
              if (endDate && quoteDate > endDate) return false;
            }
            
            return true;
          });
        },

        // Clear error
        clearError: () => set({ error: null }),

        // Internal setters
        _setQuotes: (quotes: Quote[]) => set({ quotes }),
        _setLoading: (isLoading: boolean) => set({ isLoading }),
        _setError: (error: string | null) => set({ error }),
      }))
    )
  )
);

// Helper functions (copied from useQuotes hook)
const migrateWallDetails = (wallDetails: any): WallDetails => {
  if (wallDetails && wallDetails.id && wallDetails.walls) {
    return wallDetails;
  }
  
  if (wallDetails && typeof wallDetails === 'object' && !Array.isArray(wallDetails) && !wallDetails.id) {
    return {
      id: crypto.randomUUID(),
      walls: wallDetails
    };
  }
  
  if (Array.isArray(wallDetails)) {
    const wallsObject: { [key: string]: WallSpecification } = {};
    wallDetails.forEach((wall: any, index: number) => {
      const wallName = wall.name || `Wall ${index + 1}`;
      const { id, name, ...wallSpec } = wall;
      wallsObject[wallName] = wallSpec;
    });
    return {
      id: crypto.randomUUID(),
      walls: wallsObject
    };
  }
  
  return {
    id: crypto.randomUUID(),
    walls: {}
  };
};

const convertRowToQuote = (row: any): Quote => {
  return {
    ...row,
    wall_details: migrateWallDetails(row.wall_details),
    project_name: row.project_name || undefined,
    date_last_downloaded: row.date_last_downloaded || undefined,
    status: row.status || undefined
  };
};

// Selectors for common patterns
export const useQuotes = () => useQuotesStore((state) => state.quotes);
export const useCurrentQuote = () => useQuotesStore((state) => state.currentQuote);
export const useQuotesLoading = () => useQuotesStore((state) => state.isLoading);
export const useQuotesError = () => useQuotesStore((state) => state.error);
export const useQuotesFilters = () => useQuotesStore((state) => state.filters);
export const useQuotesPagination = () => useQuotesStore((state) => state.pagination);
export const useFilteredQuotes = () => useQuotesStore((state) => state.getFilteredQuotes());
export const useQuotesActions = () => useQuotesStore((state) => ({
  fetchQuotes: state.fetchQuotes,
  createQuote: state.createQuote,
  updateQuote: state.updateQuote,
  deleteQuote: state.deleteQuote,
  setCurrentQuote: state.setCurrentQuote,
  updateWallSystem: state.updateWallSystem,
  removeWallSystem: state.removeWallSystem,
  addWallSystem: state.addWallSystem,
  setFilters: state.setFilters,
  setPagination: state.setPagination,
  clearFilters: state.clearFilters,
  clearError: state.clearError,
}));