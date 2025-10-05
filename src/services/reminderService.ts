import { supabase } from "@/integrations/supabase/client";

export type ReminderType = 'Quote_Follow_Up' | 'General' | 'Meeting' | 'Deadline' | 'Task' | 'Other';
export type ReminderStatus = 'Pending' | 'Completed' | 'Dismissed';

export interface Reminder {
  id: string;
  organization_id: string;
  created_by: string;
  title: string;
  description?: string;
  due_date: string;
  quote_id?: string;
  reminder_type: ReminderType;
  status: ReminderStatus;
  is_shared: boolean;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  quote_number?: string;
  project_name?: string;
  creator_name?: string;
}

export interface CreateReminderParams {
  title: string;
  description?: string;
  due_date: string;
  quote_id?: string;
  reminder_type: ReminderType;
  organization_id: string;
  is_shared?: boolean; // Default to false (personal) if not specified
}

export interface UpdateReminderParams {
  title?: string;
  description?: string;
  due_date?: string;
  quote_id?: string;
  reminder_type?: ReminderType;
}

export interface CompleteReminderParams {
  status: 'Completed' | 'Dismissed';
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
          quotes:quote_id (
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
        query = query.eq('status', 'Pending');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch reminders:', error);
        return { data: null, error: error.message };
      }

      // Map joined data to flat structure
      const reminders = data.map((reminder: any) => ({
        ...reminder,
        quote_number: reminder.quotes?.proposal_number,
        project_name: reminder.quotes?.project_name,
        creator_name: reminder.created_by_profile?.full_name || 'Unknown User',
        // Remove nested objects
        quotes: undefined,
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
   * Get reminders for a specific quote
   */
  async getQuoteReminders(quoteId: string): Promise<{ data: Reminder[] | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('quote_id', quoteId)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Failed to fetch quote reminders:', error);
        return { data: null, error: error.message };
      }

      return { data: data as Reminder[] };
    } catch (error) {
      console.error('Failed to fetch quote reminders:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Create a new reminder
   */
  async createReminder(params: CreateReminderParams): Promise<{ data: Reminder | null; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('reminders')
        .insert({
          title: params.title,
          description: params.description,
          due_date: params.due_date,
          quote_id: params.quote_id,
          reminder_type: params.reminder_type,
          organization_id: params.organization_id,
          created_by: user.id,
          is_shared: params.is_shared ?? false, // Default to personal (false)
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Failed to create reminder:', error);
        return { data: null, error: error.message };
      }

      return { data: data as Reminder };
    } catch (error) {
      console.error('Failed to create reminder:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Update a reminder
   */
  async updateReminder(
    id: string,
    params: UpdateReminderParams
  ): Promise<{ data: Reminder | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .update(params)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update reminder:', error);
        return { data: null, error: error.message };
      }

      return { data: data as Reminder };
    } catch (error) {
      console.error('Failed to update reminder:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
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
          status: params.status,
          completed_at: new Date().toISOString(),
          completed_by: params.completed_by,
        })
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
   */
  async deleteReminder(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete reminder:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
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
          quotes:quote_id (
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
        .eq('status', 'Pending')
        .lte('due_date', futureDate.toISOString())
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Failed to fetch upcoming reminders:', error);
        return { data: null, error: error.message };
      }

      // Map joined data to flat structure
      const reminders = data.map((reminder: any) => ({
        ...reminder,
        quote_number: reminder.quotes?.proposal_number,
        project_name: reminder.quotes?.project_name,
        creator_name: reminder.created_by_profile?.full_name || 'Unknown User',
        // Remove nested objects
        quotes: undefined,
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
