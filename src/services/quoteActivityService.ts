import { supabase } from "@/integrations/supabase/client";

export interface QuoteActivity {
  id: string;
  quote_id: string | null;
  quote_number: string;
  project_name: string | null;
  user_id: string | null;
  user_name: string;
  activity_type: 'created' | 'status_changed' | 'updated' | 'deleted' | 'reminder_set' | 'archived' | 'unarchived';
  activity_details: Record<string, any> | null;
  organization_id: string;
  created_at: string;
}

export const quoteActivityService = {
  /**
   * Log a quote activity
   */
  async logActivity(params: {
    quoteId: string | null;
    quoteNumber: string;
    projectName: string | null;
    userId: string | null;
    userName: string;
    activityType: QuoteActivity['activity_type'];
    activityDetails?: Record<string, any>;
    organizationId: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('quote_activities')
        .insert({
          quote_id: params.quoteId,
          quote_number: params.quoteNumber,
          project_name: params.projectName,
          user_id: params.userId,
          user_name: params.userName,
          activity_type: params.activityType,
          activity_details: params.activityDetails || null,
          organization_id: params.organizationId
        } as any);

      if (error) {
        console.error('Failed to log activity:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to log activity:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Log quote creation
   */
  async logCreation(params: {
    quoteId: string;
    quoteNumber: string;
    projectName: string;
    userId: string;
    userName: string;
    organizationId: string;
    status?: string;
  }) {
    return this.logActivity({
      ...params,
      activityType: 'created',
      activityDetails: params.status ? { status: params.status } : undefined
    });
  },

  /**
   * Log status change
   */
  async logStatusChange(params: {
    quoteId: string;
    quoteNumber: string;
    projectName: string;
    userId: string;
    userName: string;
    organizationId: string;
    oldStatus: string;
    newStatus: string;
  }) {
    return this.logActivity({
      quoteId: params.quoteId,
      quoteNumber: params.quoteNumber,
      projectName: params.projectName,
      userId: params.userId,
      userName: params.userName,
      organizationId: params.organizationId,
      activityType: 'status_changed',
      activityDetails: {
        old_status: params.oldStatus,
        new_status: params.newStatus
      }
    });
  },

  /**
   * Log quote update (non-status changes)
   */
  async logUpdate(params: {
    quoteId: string;
    quoteNumber: string;
    projectName: string;
    userId: string;
    userName: string;
    organizationId: string;
    changedFields?: string[];
  }) {
    return this.logActivity({
      ...params,
      activityType: 'updated',
      activityDetails: params.changedFields ? { changed_fields: params.changedFields } : undefined
    });
  },

  /**
   * Log quote deletion
   */
  async logDeletion(params: {
    quoteId: string;
    quoteNumber: string;
    projectName: string;
    userId: string;
    userName: string;
    organizationId: string;
  }) {
    return this.logActivity({
      ...params,
      activityType: 'deleted'
    });
  },

  /**
   * Log reminder set
   */
  async logReminderSet(params: {
    quoteId: string;
    quoteNumber: string;
    projectName: string;
    userId: string;
    userName: string;
    organizationId: string;
    followUpDate: string;
  }) {
    return this.logActivity({
      quoteId: params.quoteId,
      quoteNumber: params.quoteNumber,
      projectName: params.projectName,
      userId: params.userId,
      userName: params.userName,
      organizationId: params.organizationId,
      activityType: 'reminder_set',
      activityDetails: {
        follow_up_date: params.followUpDate
      }
    });
  },

  /**
   * Get recent activities for an organization
   */
  async getRecentActivities(params: {
    organizationId: string;
    limit?: number;
  }): Promise<{ data: QuoteActivity[] | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('quote_activities')
        .select('*')
        .eq('organization_id', params.organizationId)
        .order('created_at', { ascending: false })
        .limit(params.limit || 10);

      if (error) {
        console.error('Failed to fetch activities:', error);
        return { data: null, error: error.message };
      }

      return { data: data as QuoteActivity[] };
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Get activities for a specific quote
   */
  async getQuoteActivities(params: {
    quoteId: string;
  }): Promise<{ data: QuoteActivity[] | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('quote_activities')
        .select('*')
        .eq('quote_id', params.quoteId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch quote activities:', error);
        return { data: null, error: error.message };
      }

      return { data: data as QuoteActivity[] };
    } catch (error) {
      console.error('Failed to fetch quote activities:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};
