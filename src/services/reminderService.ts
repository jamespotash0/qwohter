import { supabase } from "@/integrations/supabase/client";
import * as Sentry from '@sentry/react';

export type ReminderType = 'Proposal_Follow_Up' | 'General' | 'Meeting' | 'Deadline' | 'Task' | 'Other';
export type ReminderStatus = 'Pending' | 'Completed' | 'Dismissed';

export interface Reminder {
  id: string;
  organization_id: string;
  created_by: string;
  title: string;
  description?: string;
  due_date: string;
  proposal_id?: string;
  reminder_type: ReminderType;
  reminder_status: ReminderStatus; //reminder_status formerly status
  is_shared: boolean;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  proposal_number?: string;
  project_name?: string;
  creator_name?: string;
}

export interface CreateReminderParams {
  title: string;
  description?: string;
  due_date: string;
  proposal_id?: string;
  reminder_type: ReminderType;
  organization_id: string;
  is_shared?: boolean; // Default to false (personal) if not specified
}

export interface UpdateReminderParams {
  title?: string;
  description?: string;
  due_date?: string;
  proposal_id?: string;
  reminder_type?: ReminderType;
}

export interface CompleteReminderParams {
  status: 'Completed' | 'Dismissed'; // Maps to reminder_status in DB
  completed_by: string;
}

export const reminderService = {
  /**
   * Get all reminders for an organization
   */
  async getReminders(params: {
    organizationId: string;
    includeCompleted?: boolean;
  }): Promise<{ data: Reminder[] | null; error?: string }> {
    try {
      let query = supabase
        .from('reminders')
        .select(`
          *,
          proposal:proposals!proposal_id (
            proposal_number,
            project_name
          ),
          created_by_profile:created_by (
            full_name
          ),
          completed_by_profile:completed_by (
            full_name
          )
        `)
        .eq('organization_id', params.organizationId)
        .order('due_date', { ascending: true });

      if (!params.includeCompleted) {
        query = query.eq('reminder_status', 'Pending'); //reminder_status formerly status
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch reminders:', error);
        return { data: null, error: error.message };
      }

      // Map joined data to flat structure
      const reminders = data.map((reminder: any) => ({
        ...reminder,
        proposal_number: reminder.proposal?.proposal_number,
        project_name: reminder.proposal?.project_name,
        creator_name: reminder.created_by_profile?.full_name || 'Unknown User',
        // Remove nested objects
        proposal: undefined,
        created_by_profile: undefined,
        completed_by_profile: undefined,
      }));

      return { data: reminders as Reminder[] };
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Get reminders for a specific proposal
   */
  async getProposalReminders(proposalId: string): Promise<{ data: Reminder[] | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Failed to fetch proposal reminders:', error);
        return { data: null, error: error.message };
      }

      return { data: data as Reminder[] };
    } catch (error) {
      console.error('Failed to fetch proposal reminders:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Create a new reminder
   *
   * Why instrumented: Critical business flow - reminders drive follow-ups which close deals.
   * If reminder creation fails silently, users miss opportunities.
   *
   * What we track:
   * - Success/failure rate
   * - Reminder type distribution (which types are used most)
   * - Proposal association (are reminders linked to proposals?)
   * - Auth failures
   */
  async createReminder(params: CreateReminderParams): Promise<{ data: Reminder | null; error?: string }> {
    return await Sentry.startSpan(
      {
        name: 'createReminder',
        op: 'db.query',
        attributes: {
          'reminder.type': params.reminder_type,
          'reminder.has_proposal': !!params.proposal_id,
          'reminder.is_shared': params.is_shared ?? false,
        },
      },
      async (span) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            span.setStatus({ code: 2, message: 'Not authenticated' });
            Sentry.captureMessage('Reminder creation failed: User not authenticated', {
              level: 'warning',
              tags: { operation: 'createReminder' },
            });
            return { data: null, error: 'User not authenticated' };
          }

          span.setAttribute('user.id', user.id);
          span.setAttribute('organization.id', params.organization_id);

          const { data, error } = await supabase
            .from('reminders')
            .insert({
              title: params.title,
              description: params.description,
              due_date: params.due_date,
              proposal_id: params.proposal_id,
              reminder_type: params.reminder_type,
              reminder_status: 'Pending', // Default status for new reminders
              organization_id: params.organization_id,
              created_by: user.id,
              is_shared: params.is_shared ?? false, // Default to personal (false)
            } as any)
            .select()
            .single();

          if (error) {
            span.setStatus({ code: 2, message: error.message });
            Sentry.captureException(error, {
              tags: {
                operation: 'createReminder',
                reminder_type: params.reminder_type,
              },
              level: 'error',
            });
            console.error('Failed to create reminder:', error);
            return { data: null, error: error.message };
          }

          span.setStatus({ code: 1 }); // Success
          span.setAttribute('reminder.id', data.id);
          return { data: data as Reminder };
        } catch (error) {
          Sentry.captureException(error, {
            tags: { operation: 'createReminder' },
          });
          console.error('Failed to create reminder:', error);
          return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }
    );
  },

  /**
   * Update a reminder
   *
   * Why instrumented: Users need to modify reminders frequently (reschedule, update details).
   * Track failures to ensure reliability.
   *
   * What we track:
   * - Which fields are updated most often
   * - Update failures (permissions, not found)
   */
  async updateReminder(
    id: string,
    params: UpdateReminderParams
  ): Promise<{ data: Reminder | null; error?: string }> {
    return await Sentry.startSpan(
      {
        name: 'updateReminder',
        op: 'db.query',
        attributes: {
          'reminder.id': id,
          'update.fields': Object.keys(params).join(', '),
        },
      },
      async (span) => {
        try {
          const { data, error } = await supabase
            .from('reminders')
            .update(params)
            .eq('id', id)
            .select()
            .single();

          if (error) {
            span.setStatus({ code: 2, message: error.message });
            Sentry.captureException(error, {
              tags: {
                operation: 'updateReminder',
                reminder_id: id,
              },
            });
            console.error('Failed to update reminder:', error);
            return { data: null, error: error.message };
          }

          span.setStatus({ code: 1 }); // Success
          return { data: data as Reminder };
        } catch (error) {
          Sentry.captureException(error, {
            tags: { operation: 'updateReminder' },
          });
          console.error('Failed to update reminder:', error);
          return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }
    );
  },

  /**
   * Complete or dismiss a reminder
   */
  async completeReminder(
    id: string,
    params: CompleteReminderParams
  ): Promise<{ data: Reminder | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .update({
          reminder_status: params.status, // params.status maps to DB reminder_status column
          completed_at: new Date().toISOString(),
          completed_by: params.completed_by,
        } as any) // Type assertion needed until Supabase types are regenerated post-migration
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Failed to complete reminder:', error);
        return { data: null, error: error.message };
      }

      return { data: data as Reminder };
    } catch (error) {
      console.error('Failed to complete reminder:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Delete a reminder
   *
   * Why instrumented: Destructive operation - if this fails, reminders linger.
   * Users may think they deleted a reminder but it's still active.
   *
   * What we track:
   * - Deletion failures (permissions, not found)
   */
  async deleteReminder(id: string): Promise<{ success: boolean; error?: string }> {
    return await Sentry.startSpan(
      {
        name: 'deleteReminder',
        op: 'db.query',
        attributes: {
          'reminder.id': id,
        },
      },
      async (span) => {
        try {
          const { error } = await supabase
            .from('reminders')
            .delete()
            .eq('id', id);

          if (error) {
            span.setStatus({ code: 2, message: error.message });
            Sentry.captureException(error, {
              tags: {
                operation: 'deleteReminder',
                reminder_id: id,
              },
              level: 'warning',
            });
            console.error('Failed to delete reminder:', error);
            return { success: false, error: error.message };
          }

          span.setStatus({ code: 1 }); // Success
          return { success: true };
        } catch (error) {
          Sentry.captureException(error, {
            tags: { operation: 'deleteReminder' },
          });
          console.error('Failed to delete reminder:', error);
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }
    );
  },

  /**
   * Get upcoming reminders (due within specified days)
   */
  async getUpcomingReminders(params: {
    organizationId: string;
    daysAhead?: number;
  }): Promise<{ data: Reminder[] | null; error?: string }> {
    try {
      const daysAhead = params.daysAhead || 7;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error } = await supabase
        .from('reminders')
        .select(`
          *,
          proposal:proposals!proposal_id (
            proposal_number,
            project_name
          ),
          created_by_profile:created_by (
            full_name
          ),
          completed_by_profile:completed_by (
            full_name
          )
        `)
        .eq('organization_id', params.organizationId)
        .eq('reminder_status', 'Pending') //reminder_status formerly status
        .lte('due_date', futureDate.toISOString())
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Failed to fetch upcoming reminders:', error);
        return { data: null, error: error.message };
      }

      // Map joined data to flat structure
      const reminders = data.map((reminder: any) => ({
        ...reminder,
        proposal_number: reminder.proposal?.proposal_number,
        project_name: reminder.proposal?.project_name,
        creator_name: reminder.created_by_profile?.full_name || 'Unknown User',
        // Remove nested objects
        proposal: undefined,
        created_by_profile: undefined,
        completed_by_profile: undefined,
      }));

      return { data: reminders as Reminder[] };
    } catch (error) {
      console.error('Failed to fetch upcoming reminders:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
};
