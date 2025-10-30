import { create } from 'zustand';
import { subscribeWithSelector, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { supabase } from '@/integrations/supabase/client';
import type { WallSpecification, WallDetails } from '@/lib/types';
import type { QuoteStatus, QuoteCustomization } from '@/lib/types/quotes/quote';
import type { EnhancedPricingData } from '@/lib/types/pricing/enhancedPricing';
// Note: filterWallDetailsForSave removed - discriminated union types now prevent invalid data
import { ProposalNumberGenerator } from '@/utils/proposalNumberGenerator';
import { quoteActivityService } from '@/services/quoteActivityService';
import { useAuthStore } from '@/stores/auth/authStore';

// Helper to get current user from auth store (avoid redundant API calls)
const getCurrentUser = () => {
  const user = useAuthStore.getState().user;
  if (!user) throw new Error('User not authenticated');
  return user;
};

// Smart cache helpers
const CACHE_KEY = 'quotes_cache';
const CACHE_TIME_KEY = 'quotes_cache_time';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function loadCachedQuotes(): Quote[] {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const cacheTime = localStorage.getItem(CACHE_TIME_KEY);

    if (cached && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);

      // Only use cache if less than 5 minutes old
      if (age < CACHE_TTL) {
        console.log(`📦 Loading quotes from cache (${Math.round(age / 1000)}s old)`);
        return JSON.parse(cached);
      } else {
        console.log('⏰ Cache expired, will fetch from database');
        // Clear expired cache
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIME_KEY);
      }
    }
  } catch (error) {
    console.error('Failed to load cached quotes:', error);
    // Clear corrupted cache
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIME_KEY);
  }

  return [];
}

function saveCacheQuotes(quotes: Quote[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(quotes));
    localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    console.log('💾 Quotes cached');
  } catch (error) {
    console.error('Failed to cache quotes:', error);
  }
}

// Define Quote interface directly in store
export interface Quote {
  id: string;
  created_by: string | null; // Nullable after user deletion
  created_by_name?: string; // Display name from database (handles deleted/deactivated users)
  organization_id: string;
  proposal_number: string;
  project_name?: string;
  quote_details?: Record<string, any>;
  job_details?: {
    job_location?: string;
    client_name?: string;
    client_company?: string;
    client_address?: string;
    date?: string;
  };
  delivery_details?: Record<string, any>;
  labor_details?: Record<string, any>;
  wall_details: WallDetails;
  price_details?: EnhancedPricingData;
  status?: QuoteStatus;
  date_last_downloaded?: string;
  version?: number;
  created_at: string;
  updated_at: string;
  customization?: QuoteCustomization;
  quote_source?: string;
  creator_name?: string; // Legacy field, prefer created_by_name
  archived?: boolean;

  // Analytics fields (denormalized from migrations)
  total_value?: number;
  subtotal?: number;
  submitted_at?: string;
  won_at?: string;
  rejected_at?: string;
  closed_at?: string;
  margin_percentage?: number;

  // Main version tracking
  is_main_version?: boolean;
}

interface QuotesState {
  // State
  quotes: Quote[];
  currentQuote: Quote | null;
  isLoading: boolean;
  error: string | null;
  isRealtimeConnected: boolean;
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
  fetchQuotes: (options?: { refresh?: boolean }) => Promise<void>;
  refetchQuotes: () => Promise<void>; // Force refresh quotes from database
  createQuote: (quoteData: any) => Promise<Quote>;
  createQuoteVersion: (existingQuoteId: string) => Promise<Quote>;
  updateQuote: (id: string, updates: Partial<Quote>) => Promise<Quote>;
  deleteQuote: (id: string) => Promise<void>;
  setCurrentQuote: (quote: Quote | null) => void;

  // Realtime actions
  subscribeToRealtime: () => Promise<void>;
  unsubscribeFromRealtime: () => void;
  
  // Wall system actions
  updateWallSystem: (quoteId: string, wallName: string, wallData: WallSpecification) => Promise<void>;
  removeWallSystem: (quoteId: string, wallName: string) => Promise<void>;
  addWallSystem: (quoteId: string, wallName: string, wallData: WallSpecification) => Promise<void>;
  
  // Filter and pagination
  setFilters: (filters: Partial<QuotesState['filters']>) => void;
  setPagination: (pagination: Partial<QuotesState['pagination']>) => void;
  clearFilters: () => void;
  
  // Quote utilities
  markAsDownloaded: (id: string) => Promise<Quote>;
  saveQuoteCustomization: (id: string, customization: any) => Promise<Quote>;
  archiveQuote: (id: string) => Promise<Quote>;
  setMainVersion: (quoteId: string, baseProposalNumber: string) => Promise<void>;
  unarchiveQuote: (id: string) => Promise<Quote>;

  // Utilities
  getQuoteById: (id: string) => Quote | undefined;
  getFilteredQuotes: () => Quote[];
  getArchivedQuotes: () => Quote[];
  clearError: () => void;
  reset: () => void;

  // Internal actions
  _setQuotes: (quotes: Quote[]) => void;
  _setLoading: (loading: boolean) => void;
  _setError: (error: string | null) => void;
}

export const useQuotesStore = create<QuotesState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state - load from cache if valid (< 5 min old)
        // Cache provides fast initial display, but always fetch fresh data
        quotes: loadCachedQuotes(),
        currentQuote: null,
        // Always show loading spinner for consistent, trustworthy UX
        // Users know data is being fetched, not just seeing stale cache
        isLoading: true,
        error: null,
        isRealtimeConnected: false,
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

        // Force refetch quotes (for external triggers like member status changes)
        refetchQuotes: async () => {
          const { fetchQuotes } = get();
          console.log('🔄 Refetching quotes due to external trigger');
          await fetchQuotes({ refresh: true });
        },

        // Fetch quotes with optional refresh
        fetchQuotes: async (options = {}) => {
          const { quotes, _setQuotes, _setLoading, _setError } = get();

          try {
            // Only show loading spinner if we don't have cached data
            // This prevents flash of loading screen when cache exists
            if (quotes.length === 0) {
              _setLoading(true);
            }
            _setError(null);

            // Check authentication first
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            if (authError) {
              throw new Error('Authentication failed: ' + authError.message);
            }

            if (!session?.user) {
              throw new Error('Not authenticated');
            }

            // Check if user has any memberships first
            const { data: userMemberships, error: membershipError } = await supabase
              .from('memberships')
              .select('organization_id, role, status')
              .eq('user_id', session.user.id);

            let quotesData: any[] = [];
            let count = 0;
            let queryError: any = null;

            if (!userMemberships || userMemberships.length === 0) {
              // User has no memberships, query personal quotes directly with explicit filter
              const { data, error, count: totalCount } = await supabase
                .from('quotes')
                .select(`
                  id, created_by, created_by_name, organization_id, proposal_number, project_name,
                  quote_details, job_details, delivery_details, labor_details,
                  wall_details, price_details, status, date_last_downloaded,
                  version, created_at, updated_at, customization,
                  quote_source, archived, is_main_version,
                  total_value, subtotal,
                  submitted_at, won_at, rejected_at, closed_at, margin_percentage
                `, { count: 'exact' })
                .eq('created_by', session.user.id)
                .order('created_at', { ascending: false })
                .limit(50);

              if (error) {
                console.error('Personal quotes query error:', error);
                queryError = error;
              } else {
                quotesData = data || [];
                count = totalCount || 0;
              }
            } else {
              // User has memberships, let RLS policies handle the query
              const { data, error, count: totalCount } = await supabase
                .from('quotes')
                .select(`
                  id, created_by, created_by_name, organization_id, proposal_number, project_name,
                  quote_details, job_details, delivery_details, labor_details,
                  wall_details, price_details, status, date_last_downloaded,
                  version, created_at, updated_at, customization,
                  quote_source, archived, is_main_version,
                  total_value, subtotal,
                  submitted_at, won_at, rejected_at, closed_at, margin_percentage
                `, { count: 'exact' })
                .order('created_at', { ascending: false })
                .limit(50);

              if (error) {
                console.error('Organization quotes query error:', error);
                queryError = error;
              } else {
                quotesData = data || [];
                count = totalCount || 0;
              }
            }

            // If there was a query error, throw it to be handled by the catch block
            if (queryError) {
              throw queryError;
            }

            // Process quotes - created_by_name is now fetched directly from database
            if (quotesData.length > 0) {
              const processedQuotes = quotesData.map(quote => convertRowToQuote({
                ...quote,
                // Map created_by_name to creator_name for backwards compatibility
                creator_name: quote.created_by_name || 'Unknown'
              }));

              // Log is_main_version values from database on page load
              console.log('Quotes loaded from database:', processedQuotes.map(q => ({
                proposal_number: q.proposal_number,
                is_main_version: q.is_main_version,
                status: q.status
              })));

              // Update store with fresh data from database
              _setQuotes(processedQuotes);
              set((state) => {
                state.pagination.total = count;
              });

              // Cache the fresh data with timestamp
              saveCacheQuotes(processedQuotes);
            } else {
              _setQuotes([]);
              set((state) => {
                state.pagination.total = 0;
              });

              // Clear cache when no quotes
              localStorage.removeItem(CACHE_KEY);
              localStorage.removeItem(CACHE_TIME_KEY);
            }

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

            const user = getCurrentUser();

            // Get user's organization from memberships table
            const { data: membershipData, error: membershipError } = await supabase
              .from('memberships')
              .select('organization_id')
              .eq('user_id', user.id)
              .single();

            if (membershipError) throw membershipError;
            if (!membershipData?.organization_id) {
              throw new Error('User not assigned to an organization');
            }

            // Get user's name from profiles
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user.id)
              .single();

            const userName = profileData?.full_name || 'Unknown';

            // Generate proposal number
            const proposalInfo = await ProposalNumberGenerator.getNextProposalNumber();

            const projectName = quoteData.quoteName || quoteData.project_name || 'Untitled';

            const { data, error } = await supabase
              .from('quotes')
              .insert({
                proposal_number: proposalInfo.fullNumber,
                project_name: projectName,
                quote_details: quoteData.contactInfo || {},
                quote_source: quoteData.contactInfo?.quoteSource || 'Manual',
                job_details: {
                  job_location: quoteData.jobDetails.jobLocation || '',
                  client_name: quoteData.jobDetails.billedTo.name || '',
                  client_company: quoteData.jobDetails.billedTo.company || '',
                  client_address: quoteData.jobDetails.billedTo.address || '',
                  date: quoteData.jobDetails.date
                },
                wall_details: quoteData.walls || {},
                price_details: quoteData.pricing || {},
                delivery_details: quoteData.deliveryLabor.delivery || {},
                labor_details: quoteData.deliveryLabor.labor || {},
                status: quoteData.status || 'Draft',
                created_by: user.id,
                organization_id: membershipData.organization_id,
                // @ts-ignore - is_main_version column exists but types not regenerated
                is_main_version: true  // Default: new base quotes are always main
              } as any)
              .select()
              .single();

            if (error) throw error;

            const newQuote = convertRowToQuote({
              ...data as object,
              creator_name: userName
            });
            _setQuotes([newQuote, ...quotes]);

            // Log quote creation activity
            await quoteActivityService.logCreation({
              quoteId: newQuote.id,
              quoteNumber: proposalInfo.fullNumber,
              projectName: projectName,
              userId: user.id,
              userName: userName,
              organizationId: membershipData.organization_id,
              status: quoteData.status || 'Draft'
            });

            return newQuote;
          } catch (error) {
            console.error('Create quote error:', error);
            _setError(error instanceof Error ? error.message : 'Failed to create quote');
            throw error;
          } finally {
            _setLoading(false);
          }
        },

        // Create new quote version
        createQuoteVersion: async (existingQuoteId: string) => {
          const { quotes, _setQuotes, _setLoading, _setError } = get();
          
          try {
            _setLoading(true);
            _setError(null);
            
            // Get the existing quote
            const { data: existingQuote, error: fetchError } = await supabase
              .from('quotes')
              .select('*')
              .eq('id', existingQuoteId)
              .single();

            if (fetchError) throw fetchError;

            // Generate new version number
            const proposalInfo = await ProposalNumberGenerator.getNextProposalNumber(existingQuote.proposal_number);

            const user = getCurrentUser();

            // Create new quote with incremented version
            // Use current user as creator for RLS policy compliance
            const { data, error } = await supabase
              .from('quotes')
              .insert({
                ...existingQuote as object,
                id: undefined,
                proposal_number: proposalInfo.fullNumber,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                date_last_downloaded: null,
                version: proposalInfo.version,
                created_by: user.id,
                // @ts-ignore - is_main_version column exists but types not regenerated
                is_main_version: false  // New versions are NOT main by default
              } as any)
              .select()
              .single();

            if (error) throw error;

            const newQuote = convertRowToQuote(data);
            _setQuotes([newQuote, ...quotes]);
            
            return newQuote;
          } catch (error) {
            console.error('Create quote version error:', error);
            _setError(error instanceof Error ? error.message : 'Failed to create quote version');
            throw error;
          } finally {
            _setLoading(false);
          }
        },

        // Update quote
        updateQuote: async (id: string, updates: Partial<Quote>) => {
          const { quotes, _setLoading, _setError } = get();

          try {
            _setLoading(true);
            _setError(null);

            // Get current quote to detect changes
            const currentQuote = quotes.find(q => q.id === id);
            if (!currentQuote) throw new Error('Quote not found');

            const user = getCurrentUser();

            // Get user's name and organization
            const [profileResult, membershipResult] = await Promise.all([
              supabase.from('profiles').select('full_name').eq('id', user.id).single(),
              supabase.from('memberships').select('organization_id').eq('user_id', user.id).single()
            ]);

            const userName = profileResult.data?.full_name || 'Unknown';
            const organizationId = membershipResult.data?.organization_id || currentQuote.organization_id;

            // Detect if status changed
            const statusChanged = updates.status && updates.status !== currentQuote.status;
            const oldStatus = currentQuote.status;
            const newStatus = updates.status;

            // Note: wall_details filtering removed - discriminated unions ensure type safety
            const { data, error } = await supabase
              .from('quotes')
              .update(updates)
              .eq('id', id)
              .select()
              .single();

            if (error) throw error;

            const updatedQuote = convertRowToQuote(data);

            set((state) => {
              const index = state.quotes.findIndex(q => q.id === id);
              if (index !== -1) {
                // Preserve existing creator_name if the update doesn't include it
                const existingQuote = state.quotes[index];
                state.quotes[index] = {
                  ...updatedQuote,
                  creator_name: updatedQuote.creator_name === 'Unknown' && existingQuote.creator_name !== 'Unknown'
                    ? existingQuote.creator_name
                    : updatedQuote.creator_name
                };
              }

              if (state.currentQuote?.id === id) {
                state.currentQuote = {
                  ...updatedQuote,
                  creator_name: updatedQuote.creator_name === 'Unknown' && state.currentQuote.creator_name !== 'Unknown'
                    ? state.currentQuote.creator_name
                    : updatedQuote.creator_name
                };
              }
            });

            // If status changed to Won, create a project
            if (statusChanged && newStatus === 'Won' && oldStatus !== 'Won') {
              try {
                // Check if project already exists for this quote
                const { data: existingProject } = await supabase
                  .from('projects')
                  .select('id')
                  .eq('quote_id', id)
                  .single();

                if (!existingProject) {
                  // Get the default workflow column
                  const { data: defaultColumn } = await supabase
                    .from('project_workflow_columns')
                    .select('id')
                    .eq('organization_id', organizationId)
                    .eq('is_default', true)
                    .single();

                  // Get the highest board_order to add at the end
                  const { data: projects } = await supabase
                    .from('projects')
                    .select('board_order')
                    .eq('organization_id', organizationId)
                    .order('board_order', { ascending: false })
                    .limit(1);

                  const nextBoardOrder = projects && projects.length > 0 ? (projects[0].board_order || 0) + 1 : 0;

                  // Create the project
                  await supabase
                    .from('projects')
                    .insert({
                      quote_id: id,
                      organization_id: organizationId,
                      workflow_status: defaultColumn?.id || null,
                      board_order: nextBoardOrder
                    });
                }
              } catch (error) {
                console.error('Error creating project for won quote:', error);
                // Don't throw - we still want the status update to succeed
              }
            }

            // Log activity only if quote is not archived
            // (archived quotes shouldn't push updates to recent activity)
            // Also skip logging if quote was just created (within last 30 seconds)
            // to avoid duplicate "created" and "updated" entries
            const createdAt = new Date(currentQuote.created_at);
            const now = new Date();
            const secondsSinceCreation = (now.getTime() - createdAt.getTime()) / 1000;
            const isNewlyCreated = secondsSinceCreation < 30;

            if (!currentQuote.archived && !isNewlyCreated) {
              if (statusChanged && oldStatus && newStatus) {
                // Status change
                await quoteActivityService.logStatusChange({
                  quoteId: id,
                  quoteNumber: currentQuote.proposal_number,
                  projectName: currentQuote.project_name || 'Untitled',
                  userId: user.id,
                  userName: userName,
                  organizationId: organizationId,
                  oldStatus: oldStatus,
                  newStatus: newStatus
                });
              } else {
                // General update
                const changedFields = Object.keys(updates).filter(key => key !== 'updated_at');
                if (changedFields.length > 0) {
                  await quoteActivityService.logUpdate({
                    quoteId: id,
                    quoteNumber: currentQuote.proposal_number,
                    projectName: currentQuote.project_name || 'Untitled',
                    userId: user.id,
                    userName: userName,
                    organizationId: organizationId,
                    changedFields: changedFields
                  });
                }
              }
            }

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
          const { quotes, _setLoading, _setError } = get();

          try {
            _setLoading(true);
            _setError(null);

            // Get quote details before deletion for activity logging
            const quoteToDelete = quotes.find(q => q.id === id);
            if (!quoteToDelete) throw new Error('Quote not found');

            const user = getCurrentUser();

            // Get user's name and organization
            const [profileResult, membershipResult] = await Promise.all([
              supabase.from('profiles').select('full_name').eq('id', user.id).single(),
              supabase.from('memberships').select('organization_id').eq('user_id', user.id).single()
            ]);

            const userName = profileResult.data?.full_name || 'Unknown';
            const organizationId = membershipResult.data?.organization_id || quoteToDelete.organization_id;

            // Log deletion activity BEFORE deleting the quote
            await quoteActivityService.logDeletion({
              quoteId: id,
              quoteNumber: quoteToDelete.proposal_number,
              projectName: quoteToDelete.project_name || 'Untitled',
              userId: user.id,
              userName: userName,
              organizationId: organizationId
            });

            // Now delete the quote
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

        // Subscribe to realtime updates
        subscribeToRealtime: async () => {
          try {
            const user = getCurrentUser();

            // Get user's organization from memberships table
            const { data: membershipData, error: membershipError } = await supabase
              .from('memberships')
              .select('organization_id')
              .eq('user_id', user.id)
              .single();

            if (membershipError) throw membershipError;
            if (!membershipData?.organization_id) {
              throw new Error('User not assigned to an organization');
            }


            // Subscribe to quotes table changes for this organization
            const channel = supabase
              .channel('quotes-changes')
              .on(
                'postgres_changes',
                {
                  event: '*',
                  schema: 'public',
                  table: 'quotes',
                  filter: `organization_id=eq.${membershipData.organization_id}`
                },
                async (payload) => {

                  const { eventType, new: newRecord, old: oldRecord } = payload;

                  // Handle INSERT separately to fetch creator name
                  if (eventType === 'INSERT' && newRecord) {
                    // Use created_by_name from database (handles deleted/deactivated users automatically)
                    const newQuote = convertRowToQuote({
                      ...newRecord,
                      creator_name: newRecord.created_by_name || 'Unknown'
                    });

                    set((state) => {
                      // Add to beginning of array if not already exists
                      const exists = state.quotes.some(q => q.id === newQuote.id);
                      if (!exists) {
                        state.quotes.unshift(newQuote);
                      }
                    });
                    return;
                  }

                  set((state) => {
                    switch (eventType) {
                      case 'INSERT': {
                        // Already handled above
                        break;
                      }
                      case 'UPDATE': {
                        if (newRecord) {
                          const updatedQuote = convertRowToQuote(newRecord);
                          const index = state.quotes.findIndex(q => q.id === updatedQuote.id);
                          if (index !== -1) {
                            // Update quote with latest data from database
                            // creator_name is now properly handled by convertRowToQuote
                            state.quotes[index] = updatedQuote;
                          }

                          // Update current quote if it's the one being edited
                          if (state.currentQuote?.id === updatedQuote.id) {
                            state.currentQuote = updatedQuote;
                          }
                        }
                        break;
                      }
                      case 'DELETE': {
                        if (oldRecord) {
                          state.quotes = state.quotes.filter(q => q.id !== oldRecord.id);

                          // Clear current quote if it was deleted
                          if (state.currentQuote?.id === oldRecord.id) {
                            state.currentQuote = null;
                          }
                        }
                        break;
                      }
                    }
                  });
                }
              )
              .subscribe((status) => {
                set({ isRealtimeConnected: status === 'SUBSCRIBED' });
              });

            // Store channel reference for cleanup
            (get() as any).realtimeChannel = channel;
            
          } catch (error) {
            console.error('❌ Failed to subscribe to realtime:', error);
            set({ isRealtimeConnected: false });
          }
        },

        // Unsubscribe from realtime updates
        unsubscribeFromRealtime: () => {
          const channel = (get() as any).realtimeChannel;
          if (channel) {
            supabase.removeChannel(channel);
            set({ isRealtimeConnected: false });
            (get() as any).realtimeChannel = null;
          }
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
            const wallSpec = currentWalls[oldWallName];
            if (wallSpec) {
              renamedWalls[newWallName] = wallSpec;
            }
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

        // Get filtered quotes (excludes archived)
        getFilteredQuotes: () => {
          const { quotes, filters } = get();

          return quotes.filter(quote => {
            // Exclude archived quotes
            if (quote.archived) return false;

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

        // Get archived quotes (with filters applied)
        getArchivedQuotes: () => {
          const { quotes, filters } = get();

          return quotes.filter(quote => {
            // Only include archived quotes
            if (!quote.archived) return false;

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

        // Mark quote as downloaded
        markAsDownloaded: async (id: string) => {
          const { _setLoading, _setError } = get();

          try {
            _setLoading(true);
            _setError(null);

            const { data, error } = await supabase
              .from('quotes')
              .update({ date_last_downloaded: new Date().toISOString() })
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
            console.error('Mark as downloaded error:', error);
            _setError(error instanceof Error ? error.message : 'Failed to mark as downloaded');
            throw error;
          } finally {
            _setLoading(false);
          }
        },

        // Save quote customization
        saveQuoteCustomization: async (id: string, customization: any) => {
          const { quotes, _setLoading, _setError } = get();

          try {
            _setLoading(true);
            _setError(null);

            // Update the version for customization tracking
            const currentQuote = quotes.find(q => q.id === id);
            const newVersion = (currentQuote?.version || 0) + 1;

            const updateData = {
              customization: {
                ...customization,
                lastModified: new Date().toISOString(),
                version: newVersion
              },
              version: newVersion
            };

            const { data, error } = await supabase
              .from('quotes')
              .update(updateData)
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
            console.error('Save customization error:', error);
            _setError(error instanceof Error ? error.message : 'Failed to save customization');
            throw error;
          } finally {
            _setLoading(false);
          }
        },

        // Archive quote
        archiveQuote: async (id: string) => {
          const { quotes, _setLoading, _setError } = get();

          try {
            _setLoading(true);
            _setError(null);

            const quoteToArchive = quotes.find(q => q.id === id);
            if (!quoteToArchive) throw new Error('Quote not found');

            const user = getCurrentUser();

            // Get user's name and organization
            const [profileResult, membershipResult] = await Promise.all([
              supabase.from('profiles').select('full_name').eq('id', user.id).single(),
              supabase.from('memberships').select('organization_id').eq('user_id', user.id).single()
            ]);

            const userName = profileResult.data?.full_name || 'Unknown';
            const organizationId = membershipResult.data?.organization_id || quoteToArchive.organization_id;

            const { data, error } = await supabase
              .from('quotes')
              .update({ archived: true })
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

            // Log archive activity
            await quoteActivityService.logActivity({
              quoteId: id,
              quoteNumber: quoteToArchive.proposal_number,
              projectName: quoteToArchive.project_name || 'Untitled',
              userId: user.id,
              userName: userName,
              activityType: 'Archived',
              organizationId: organizationId
            });

            return updatedQuote;
          } catch (error) {
            console.error('Archive quote error:', error);
            _setError(error instanceof Error ? error.message : 'Failed to archive quote');
            throw error;
          } finally {
            _setLoading(false);
          }
        },

        // Unarchive quote
        unarchiveQuote: async (id: string) => {
          const { quotes, _setLoading, _setError } = get();

          try {
            _setLoading(true);
            _setError(null);

            const quoteToUnarchive = quotes.find(q => q.id === id);
            if (!quoteToUnarchive) throw new Error('Quote not found');

            const user = getCurrentUser();

            // Get user's name and organization
            const [profileResult, membershipResult] = await Promise.all([
              supabase.from('profiles').select('full_name').eq('id', user.id).single(),
              supabase.from('memberships').select('organization_id').eq('user_id', user.id).single()
            ]);

            const userName = profileResult.data?.full_name || 'Unknown';
            const organizationId = membershipResult.data?.organization_id || quoteToUnarchive.organization_id;

            const { data, error } = await supabase
              .from('quotes')
              .update({ archived: false })
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

            // Log unarchive activity
            await quoteActivityService.logActivity({
              quoteId: id,
              quoteNumber: quoteToUnarchive.proposal_number,
              projectName: quoteToUnarchive.project_name || 'Untitled',
              userId: user.id,
              userName: userName,
              activityType: 'Unarchived',
              organizationId: organizationId
            });

            return updatedQuote;
          } catch (error) {
            console.error('Unarchive quote error:', error);
            _setError(error instanceof Error ? error.message : 'Failed to unarchive quote');
            throw error;
          } finally {
            _setLoading(false);
          }
        },

        setMainVersion: async (quoteId: string, baseProposalNumber: string) => {
          const { quotes } = get();

          try {
            const quote = quotes.find(q => q.id === quoteId);
            if (!quote) throw new Error('Quote not found');

            const user = getCurrentUser();

            // Get organization
            const { data: membership } = await supabase
              .from('memberships')
              .select('organization_id')
              .eq('user_id', user.id)
              .single();

            const organizationId = membership?.organization_id || quote.organization_id;

            // Get all quotes that match this base number or are versions of it
            const { data: allQuotes } = await supabase
              .from('quotes')
              .select('id, proposal_number, is_main_version, status')
              .eq('organization_id', organizationId) as { data: Array<{ id: string; proposal_number: string; is_main_version: boolean; status: string }> | null };

            console.log('All quotes in org before update:', allQuotes?.map(q => ({
              id: q.id.slice(0, 8),
              proposal_number: q.proposal_number,
              is_main_version: q.is_main_version,
              status: q.status
            })));

            // Filter to find all quotes in this version group
            const quoteIdsInGroup = allQuotes
              ?.filter(q => {
                const qBase = q.proposal_number.includes('.')
                  ? q.proposal_number.split('.')[0]
                  : q.proposal_number;
                return qBase === baseProposalNumber;
              })
              .map(q => q.id) || [];

            // Update all quotes in the group except the selected one to is_main_version = false
            if (quoteIdsInGroup.length > 1) {
              const otherQuoteIds = quoteIdsInGroup.filter(id => id !== quoteId);
              if (otherQuoteIds.length > 0) {
                console.log('Setting is_main_version = false for:', otherQuoteIds.map(id => id.slice(0, 8)));
                // @ts-ignore
                await supabase
                  .from('quotes')
                  .update({ is_main_version: false })
                  .in('id', otherQuoteIds);
              }
            }

            // Set the selected quote as main
            console.log('Setting is_main_version = true for:', quoteId.slice(0, 8));
            // @ts-ignore
            await supabase
              .from('quotes')
              .update({ is_main_version: true })
              .eq('id', quoteId);

            // Verify the update
            const { data: updatedQuotes } = await supabase
              .from('quotes')
              .select('id, proposal_number, is_main_version, status')
              .in('id', quoteIdsInGroup) as { data: Array<{ id: string; proposal_number: string; is_main_version: boolean; status: string }> | null };

            // console.log('Quotes after update:', updatedQuotes?.map(q => ({
            //   id: q.id.slice(0, 8),
            //   proposal_number: q.proposal_number,
            //   is_main_version: q.is_main_version,
            //   status: q.status
            // })));

            // Update local state for all quotes in this group
            set((state) => {
              console.log('Updating local state. Quotes before:', state.quotes
                .filter(q => {
                  const qBase = q.proposal_number.includes('.')
                    ? q.proposal_number.split('.')[0]
                    : q.proposal_number;
                  return qBase === baseProposalNumber;
                })
                .map(q => ({
                  id: q.id.slice(0, 8),
                  proposal_number: q.proposal_number,
                  is_main_version: q.is_main_version
                })));

              state.quotes = state.quotes.map(q => {
                // Check if quote belongs to same group
                const qBaseNumber = q.proposal_number.includes('.')
                  ? q.proposal_number.split('.')[0]
                  : q.proposal_number;

                if (qBaseNumber === baseProposalNumber && q.organization_id === organizationId) {
                  console.log(`Updating quote ${q.proposal_number}: is_main_version = ${q.id === quoteId}`);
                  return {
                    ...q,
                    is_main_version: q.id === quoteId
                  };
                }
                return q;
              });

              // console.log ('Quotes after local update:', state.quotes
              //   .filter(q => {
              //     const qBase = q.proposal_number.includes('.')
              //       ? q.proposal_number.split('.')[0]
              //       : q.proposal_number;
              //     return qBase === baseProposalNumber;
              //   })
              //   .map(q => ({
              //     id: q.id.slice(0, 8),
              //     proposal_number: q.proposal_number,
              //     is_main_version: q.is_main_version
              //   })));
            });

            // Handle project board updates
            // Check if there's a project for the old main version
            const { data: existingProject } = await supabase
              .from('projects')
              .select('id, quote_id')
              .eq('organization_id', organizationId)
              .in('quote_id', quotes
                .filter(q => {
                  const qBaseNumber = q.proposal_number.includes('.')
                    ? q.proposal_number.split('.')[0]
                    : q.proposal_number;
                  return qBaseNumber === baseProposalNumber;
                })
                .map(q => q.id)
              )
              .maybeSingle();

            // console.log('Project board logic:', {
            //   existingProject,
            //   quoteId,
            //   quoteStatus: quote.status,
            //   proposalNumber: quote.proposal_number,
            //   isMainVersion: quote.is_main_version
            // });

            if (existingProject) {
              // If new main version is Won, update the project
              // Otherwise, delete the project (only Won quotes should be on board)
              if (quote.status === 'Won') {
                console.log('Updating existing project to point to new main version:', quoteId);
                const { error: updateError } = await supabase
                  .from('projects')
                  .update({ quote_id: quoteId })
                  .eq('id', existingProject.id);

                if (updateError) {
                  console.error('Error updating project:', updateError);
                } else {
                  console.log('Successfully updated project');
                }
              } else {
                console.log('Deleting project because new main is not Won');
                await supabase
                  .from('projects')
                  .delete()
                  .eq('id', existingProject.id);
              }
            } else if (quote.status === 'Won') {
              // No existing project but new main is Won - create one
              console.log('Creating new project for Won quote:', quoteId);

              const { data: defaultColumn } = await supabase
                .from('project_workflow_columns')
                .select('id')
                .eq('organization_id', organizationId)
                .eq('is_default', true)
                .single();

              const { data: projects } = await supabase
                .from('projects')
                .select('board_order')
                .eq('organization_id', organizationId)
                .order('board_order', { ascending: false })
                .limit(1);

              const nextBoardOrder = projects && projects.length > 0 ? (projects[0].board_order || 0) + 1 : 0;

              const { error: insertError } = await supabase
                .from('projects')
                .insert({
                  quote_id: quoteId,
                  organization_id: organizationId,
                  workflow_status: defaultColumn?.id || null,
                  board_order: nextBoardOrder
                } as any);

              if (insertError) {
                console.error('Error creating project:', insertError);
              } else {
                console.log('Successfully created project');
              }
            } else {
              console.log('No project action needed - quote is not Won');
            }

          } catch (error) {
            console.error('Set main version error:', error);
            throw error;
          }
        },

        // Clear error
        clearError: () => set({ error: null }),

        // Reset store to initial state (for sign out)
        reset: () => {
          // Unsubscribe from realtime before resetting
          const { unsubscribeFromRealtime } = get();
          unsubscribeFromRealtime();

          set({
            quotes: [],
            currentQuote: null,
            isLoading: false,
            isInitialized: false,
            error: null,
            isRealtimeConnected: false,
            filters: {
              search: '',
              status: '',
              quoteSource: '',
              createdBy: '',
              dateRange: [null, null]
            },
            pagination: {
              page: 1,
              pageSize: 50,
              total: 0
            }
          });
        },

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
    status: row.status || undefined,
    // Map created_by_name from database to creator_name for display
    creator_name: row.creator_name || row.created_by_name || 'Unknown'
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
export const useArchivedQuotes = () => useQuotesStore((state) => state.getArchivedQuotes());
export const useRealtimeConnection = () => useQuotesStore((state) => state.isRealtimeConnected);
export const useQuotesActions = () => useQuotesStore((state) => ({
  initialize: state.initialize,
  fetchQuotes: state.fetchQuotes,
  createQuote: state.createQuote,
  createQuoteVersion: state.createQuoteVersion,
  updateQuote: state.updateQuote,
  archiveQuote: state.archiveQuote,
  unarchiveQuote: state.unarchiveQuote,
  deleteQuote: state.deleteQuote,
  setCurrentQuote: state.setCurrentQuote,
  subscribeToRealtime: state.subscribeToRealtime,
  unsubscribeFromRealtime: state.unsubscribeFromRealtime,
  updateWallSystem: state.updateWallSystem,
  removeWallSystem: state.removeWallSystem,
  addWallSystem: state.addWallSystem,
  markAsDownloaded: state.markAsDownloaded,
  saveQuoteCustomization: state.saveQuoteCustomization,
  setFilters: state.setFilters,
  setPagination: state.setPagination,
  clearFilters: state.clearFilters,
  clearError: state.clearError,
}));