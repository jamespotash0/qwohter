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

// Define Quote interface directly in store
export interface Quote {
  id: string;
  created_by: string;
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
  status_last_updated?: string;
  quote_source?: string;
  follow_up_date?: string | null;
  form_data?: Record<string, any>;
  form_profile_id?: string;
  creator_name?: string;
  archived?: boolean;
  won_date?: string;
}

interface QuotesState {
  // State
  quotes: Quote[];
  currentQuote: Quote | null;
  isLoading: boolean;
  isInitialized: boolean;
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
  initialize: () => Promise<void>;
  fetchQuotes: (options?: { refresh?: boolean }) => Promise<void>;
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
  unarchiveQuote: (id: string) => Promise<Quote>;

  // Utilities
  getQuoteById: (id: string) => Quote | undefined;
  getFilteredQuotes: () => Quote[];
  getArchivedQuotes: () => Quote[];
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

        // Initialize quotes store
        initialize: async () => {
          const { fetchQuotes, subscribeToRealtime, _setLoading } = get();

          try {
            _setLoading(true);
            await fetchQuotes();
            await subscribeToRealtime();
            set({ isInitialized: true });
          } catch (error) {
            console.error('Quotes store initialization error:', error);
          } finally {
            _setLoading(false);
          }
        },

        // Fetch quotes with optional refresh
        fetchQuotes: async (options = {}) => {
          const { _setQuotes, _setLoading, _setError } = get();

          try {
            if (!options.refresh) _setLoading(true);
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
                  id, created_by, organization_id, proposal_number, project_name,
                  quote_details, job_details, delivery_details, labor_details,
                  wall_details, price_details, status, date_last_downloaded,
                  version, created_at, updated_at, customization, status_last_updated,
                  quote_source, follow_up_date, won_date, archived, form_data, form_profile_id
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
                  id, created_by, organization_id, proposal_number, project_name,
                  quote_details, job_details, delivery_details, labor_details,
                  wall_details, price_details, status, date_last_downloaded,
                  version, created_at, updated_at, customization, status_last_updated,
                  quote_source, follow_up_date, won_date, archived, form_data, form_profile_id
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

            // If we have quotes, fetch creator names
            if (quotesData.length > 0) {

              // Get unique creator IDs (use created_by since that's what the database has)
              const creatorIds = [...new Set(
                quotesData
                  .map(quote => {
                    const creatorId = quote.created_by;
                    return creatorId;
                  })
                  .filter(Boolean)
              )];


              // Fetch creator names
              const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', creatorIds);

              if (profilesError) {
                console.warn('Failed to fetch creator profiles:', profilesError);
              }


              // Create a map of creator IDs to names
              const creatorMap = new Map();
              if (profilesData) {
                profilesData.forEach((profile: any) => {
                  creatorMap.set(profile.id, profile.full_name);
                });
              }

              // Combine quotes with creator names
              const quotesWithCreatorNames = quotesData.map(quote => {
                const creatorId = quote.created_by;
                const creatorName = creatorMap.get(creatorId) || 'Unknown';
                return {
                  ...quote,
                  creator_name: creatorName,
                };
              });

              const processedQuotes = quotesWithCreatorNames.map(convertRowToQuote);
              _setQuotes(processedQuotes);
              set((state) => {
                state.pagination.total = count;
              });
            } else {
              _setQuotes([]);
              set((state) => {
                state.pagination.total = 0;
              });
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

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

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
                organization_id: membershipData.organization_id
              } as any)
              .select()
              .single();

            if (error) throw error;

            const newQuote = convertRowToQuote({
              ...data,
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

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // Create new quote with incremented version
            const { data, error } = await supabase
              .from('quotes')
              .insert({
                ...existingQuote as object,
                id: undefined,
                proposal_number: proposalInfo.fullNumber,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                date_last_downloaded: null,
                version: proposalInfo.version
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

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

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
            let processedUpdates = { ...updates };

            // Set won_date when quote is first marked as "Won" or "Completed"
            // (Completed means job is done and should count as revenue)
            if ((newStatus === 'Won' || newStatus === 'Completed') &&
                (oldStatus !== 'Won' && oldStatus !== 'Completed') &&
                !currentQuote.won_date) {
              processedUpdates.won_date = new Date().toISOString();
            }

            const { data, error } = await supabase
              .from('quotes')
              .update(processedUpdates)
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
              } else if (updates.follow_up_date && updates.follow_up_date !== currentQuote.follow_up_date) {
                // Reminder set
                await quoteActivityService.logReminderSet({
                  quoteId: id,
                  quoteNumber: currentQuote.proposal_number,
                  projectName: currentQuote.project_name || 'Untitled',
                  userId: user.id,
                  userName: userName,
                  organizationId: organizationId,
                  followUpDate: updates.follow_up_date
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

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

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
                (payload) => {
                  
                  const { eventType, new: newRecord, old: oldRecord } = payload;

                  set((state) => {
                    switch (eventType) {
                      case 'INSERT': {
                        if (newRecord) {
                          const newQuote = convertRowToQuote(newRecord);
                          // Add to beginning of array if not already exists
                          const exists = state.quotes.some(q => q.id === newQuote.id);
                          if (!exists) {
                            state.quotes.unshift(newQuote);
                          }
                        }
                        break;
                      }
                      case 'UPDATE': {
                        if (newRecord) {
                          const updatedQuote = convertRowToQuote(newRecord);
                          const index = state.quotes.findIndex(q => q.id === updatedQuote.id);
                          if (index !== -1) {
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

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

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

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

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
    status: row.status || undefined,
    creator_name: row.creator_name || 'Unknown'
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