import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { supabase } from '@/integrations/supabase/client';
import {
  reminderService,
  Reminder,
  CreateReminderParams,
  UpdateReminderParams,
  CompleteReminderParams,
} from '@/services/reminderService';

interface RemindersState {
  // State
  reminders: Reminder[];
  isLoading: boolean;
  error: string | null;
  isRealtimeConnected: boolean;

  // Actions
  fetchReminders: (organizationId: string, includeCompleted?: boolean) => Promise<void>;
  fetchUpcomingReminders: (organizationId: string, daysAhead?: number) => Promise<void>;
  createReminder: (params: CreateReminderParams) => Promise<Reminder | null>;
  updateReminder: (id: string, params: UpdateReminderParams) => Promise<Reminder | null>;
  completeReminder: (id: string, params: CompleteReminderParams) => Promise<Reminder | null>;
  deleteReminder: (id: string) => Promise<boolean>;
  clearError: () => void;

  // Realtime actions
  subscribeToRealtime: (organizationId: string) => Promise<void>;
  unsubscribeFromRealtime: () => void;

  // Internal setters
  _setReminders: (reminders: Reminder[]) => void;
  _setLoading: (loading: boolean) => void;
  _setError: (error: string | null) => void;
}

export const useRemindersStore = create<RemindersState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      reminders: [],
      isLoading: false,
      error: null,
      isRealtimeConnected: false,

      // Fetch all reminders
      fetchReminders: async (organizationId: string, includeCompleted = false) => {
        const { _setReminders, _setLoading, _setError } = get();

        try {
          _setLoading(true);
          _setError(null);

          const { data, error } = await reminderService.getReminders({
            organizationId,
            includeCompleted,
          });

          if (error) {
            _setError(error);
            return;
          }

          _setReminders(data || []);
        } catch (error) {
          console.error('Fetch reminders error:', error);
          _setError(error instanceof Error ? error.message : 'Failed to fetch reminders');
        } finally {
          _setLoading(false);
        }
      },

      // Fetch upcoming reminders
      fetchUpcomingReminders: async (organizationId: string, daysAhead = 7) => {
        const { _setReminders, _setLoading, _setError } = get();

        try {
          _setLoading(true);
          _setError(null);

          const { data, error } = await reminderService.getUpcomingReminders({
            organizationId,
            daysAhead,
          });

          if (error) {
            _setError(error);
            return;
          }

          _setReminders(data || []);
        } catch (error) {
          console.error('Fetch upcoming reminders error:', error);
          _setError(error instanceof Error ? error.message : 'Failed to fetch upcoming reminders');
        } finally {
          _setLoading(false);
        }
      },

      // Create reminder
      createReminder: async (params: CreateReminderParams) => {
        const { reminders, _setLoading, _setError } = get();

        try {
          _setLoading(true);
          _setError(null);

          const { data, error } = await reminderService.createReminder(params);

          if (error) {
            _setError(error);
            return null;
          }

          if (data) {
            set((state) => {
              state.reminders = [data, ...reminders];
            });
          }

          return data;
        } catch (error) {
          console.error('Create reminder error:', error);
          _setError(error instanceof Error ? error.message : 'Failed to create reminder');
          return null;
        } finally {
          _setLoading(false);
        }
      },

      // Update reminder
      updateReminder: async (id: string, params: UpdateReminderParams) => {
        const { _setLoading, _setError } = get();

        try {
          _setLoading(true);
          _setError(null);

          const { data, error } = await reminderService.updateReminder(id, params);

          if (error) {
            _setError(error);
            return null;
          }

          if (data) {
            set((state) => {
              const index = state.reminders.findIndex((r) => r.id === id);
              if (index !== -1) {
                state.reminders[index] = data;
              }
            });
          }

          return data;
        } catch (error) {
          console.error('Update reminder error:', error);
          _setError(error instanceof Error ? error.message : 'Failed to update reminder');
          return null;
        } finally {
          _setLoading(false);
        }
      },

      // Complete or dismiss reminder
      completeReminder: async (id: string, params: CompleteReminderParams) => {
        const { _setLoading, _setError } = get();

        try {
          _setLoading(true);
          _setError(null);

          const { data, error } = await reminderService.completeReminder(id, params);

          if (error) {
            _setError(error);
            return null;
          }

          if (data) {
            set((state) => {
              const index = state.reminders.findIndex((r) => r.id === id);
              if (index !== -1) {
                state.reminders[index] = data;
              }
            });
          }

          return data;
        } catch (error) {
          console.error('Complete reminder error:', error);
          _setError(error instanceof Error ? error.message : 'Failed to complete reminder');
          return null;
        } finally {
          _setLoading(false);
        }
      },

      // Delete reminder
      deleteReminder: async (id: string) => {
        const { _setLoading, _setError } = get();

        try {
          _setLoading(true);
          _setError(null);

          const { success, error } = await reminderService.deleteReminder(id);

          if (error) {
            _setError(error);
            return false;
          }

          if (success) {
            set((state) => {
              state.reminders = state.reminders.filter((r) => r.id !== id);
            });
          }

          return success;
        } catch (error) {
          console.error('Delete reminder error:', error);
          _setError(error instanceof Error ? error.message : 'Failed to delete reminder');
          return false;
        } finally {
          _setLoading(false);
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Subscribe to realtime updates
      subscribeToRealtime: async (organizationId: string) => {
        try {
          console.log('🔄 Subscribing to realtime reminder updates for organization:', organizationId);

          // Subscribe to reminders table changes for this organization
          const channel = supabase
            .channel('reminders-changes')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'reminders',
                filter: `organization_id=eq.${organizationId}`
              },
              (payload) => {
                console.log('📡 Realtime reminder update received:', payload);

                const { eventType, new: newRecord, old: oldRecord } = payload;

                set((state) => {
                  switch (eventType) {
                    case 'INSERT': {
                      if (newRecord) {
                        // Add new reminder if not already exists
                        const exists = state.reminders.some(r => r.id === newRecord.id);
                        if (!exists) {
                          state.reminders.unshift(newRecord as Reminder);
                        }
                      }
                      break;
                    }
                    case 'UPDATE': {
                      if (newRecord) {
                        const index = state.reminders.findIndex(r => r.id === newRecord.id);
                        if (index !== -1) {
                          state.reminders[index] = newRecord as Reminder;
                        }
                      }
                      break;
                    }
                    case 'DELETE': {
                      if (oldRecord) {
                        state.reminders = state.reminders.filter(r => r.id !== oldRecord.id);
                      }
                      break;
                    }
                  }
                });
              }
            )
            .subscribe((status) => {
              console.log('📡 Realtime reminder subscription status:', status);
              set({ isRealtimeConnected: status === 'SUBSCRIBED' });
            });

          // Store channel reference for cleanup
          (get() as any).realtimeChannel = channel;

        } catch (error) {
          console.error('❌ Failed to subscribe to realtime reminders:', error);
          set({ isRealtimeConnected: false });
        }
      },

      // Unsubscribe from realtime updates
      unsubscribeFromRealtime: () => {
        const channel = (get() as any).realtimeChannel;
        if (channel) {
          console.log('🔌 Unsubscribing from realtime reminder updates');
          supabase.removeChannel(channel);
          set({ isRealtimeConnected: false });
          (get() as any).realtimeChannel = null;
        }
      },

      // Internal setters
      _setReminders: (reminders: Reminder[]) => set({ reminders }),
      _setLoading: (isLoading: boolean) => set({ isLoading }),
      _setError: (error: string | null) => set({ error }),
    }))
  )
);

// Selectors
export const useReminders = () => useRemindersStore((state) => state.reminders);
export const useRemindersLoading = () => useRemindersStore((state) => state.isLoading);
export const useRemindersError = () => useRemindersStore((state) => state.error);
export const useRemindersRealtimeConnection = () => useRemindersStore((state) => state.isRealtimeConnected);
export const useRemindersActions = () =>
  useRemindersStore((state) => ({
    fetchReminders: state.fetchReminders,
    fetchUpcomingReminders: state.fetchUpcomingReminders,
    createReminder: state.createReminder,
    updateReminder: state.updateReminder,
    completeReminder: state.completeReminder,
    deleteReminder: state.deleteReminder,
    clearError: state.clearError,
    subscribeToRealtime: state.subscribeToRealtime,
    unsubscribeFromRealtime: state.unsubscribeFromRealtime,
  }));
