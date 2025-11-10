import { supabase } from "@/integrations/supabase/client";

/**
 * Proposal Activity Service (Now uses proposal_activities table)
 *
 * Maintains backward compatibility with "proposal" naming in the API
 * but all data is stored in 'proposal_activities' table.
 */

export interface ProposalActivity {
  id: string;
  proposal_id: string | null; // Maps to proposal_id in database
  proposal_number: string; // Maps to proposal_number in database
  proposal_name: string | null;
  user_id: string | null; // Maps to performed_by in database
  user_name: string;
  activity_type: 'Created' | 'Status_Changed' | 'Updated' | 'Deleted' | 'Reminder_Set' | 'Archived' | 'Unarchived';
  activity_details: Record<string, any> | null; // Maps to metadata in database
  organization_id: string;
  created_at: string;
}

export const proposalActivityService = {
  /**
   * Log a proposal activity
   */
  async logActivity(params: {
    proposalId: string | null;
    proposalNumber: string;
    proposalName: string | null;
    userId: string | null;
    userName: string;
    activityType: ProposalActivity['activity_type'];
    activityDetails?: Record<string, any>;
    organizationId: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('proposal_activities')
        .insert({
          proposal_id: params.proposalId, // Map proposalId
          proposal_number: params.proposalNumber,
          proposal_name: params.proposalName,
          user_id: params.userId,
          user_name: params.userName,
          activity_type: params.activityType,
          activity_details: params.activityDetails || {},
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
   * Log proposal creation
   */
  async logCreation(params: {
    proposalId: string;
    proposalNumber: string;
    projectName: string;
    userId: string;
    userName: string;
    organizationId: string;
    status?: string;
  }) {
    return this.logActivity({
      ...params,
      activityType: 'Created',
      activityDetails: params.status ? { status: params.status } : undefined
    });
  },

  /**
   * Log status change
   */
  async logStatusChange(params: {
    proposalId: string;
    proposalNumber: string;
    proposalName: string;
    userId: string;
    userName: string;
    organizationId: string;
    oldStatus: string;
    newStatus: string;
  }) {
    return this.logActivity({
      proposalId: params.proposalId,
      proposalNumber: params.proposalNumber,
      proposalName: params.proposalName,
      userId: params.userId,
      userName: params.userName,
      organizationId: params.organizationId,
      activityType: 'Status_Changed',
      activityDetails: {
        old_status: params.oldStatus,
        new_status: params.newStatus
      }
    });
  },

  /**
   * Log proposal update (non-status changes)
   */
  async logUpdate(params: {
    proposalId: string;
    proposalNumber: string;
    proposalName: string;
    userId: string;
    userName: string;
    organizationId: string;
    changedFields?: string[];
  }) {
    return this.logActivity({
      ...params,
      activityType: 'Updated',
      activityDetails: params.changedFields ? { changed_fields: params.changedFields } : undefined
    });
  },

  /**
   * Log proposal deletion
   */
  async logDeletion(params: {
    proposalId: string;
    proposalNumber: string;
    proposalName: string;
    userId: string;
    userName: string;
    organizationId: string;
  }) {
    return this.logActivity({
      ...params,
      activityType: 'Deleted'
    });
  },

  /**
   * Log reminder set
   */
  async logReminderSet(params: {
    proposalId: string;
    proposalNumber: string;
    proposalName: string;
    userId: string;
    userName: string;
    organizationId: string;
    followUpDate: string;
  }) {
    return this.logActivity({
      proposalId: params.proposalId,
      proposalNumber: params.proposalNumber,
      proposalName: params.proposalName,
      userId: params.userId,
      userName: params.userName,
      organizationId: params.organizationId,
      activityType: 'Reminder_Set',
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
  }): Promise<{ data: ProposalActivity[] | null; error?: string }> {
    try {
      // Get proposal_ids for this organization first
      const { data: proposalData } = await supabase
        .from('proposals')
        .select('id')
        .eq('organization_id', params.organizationId);

      if (!proposalData || proposalData.length === 0) {
        return { data: [] };
      }

      const proposalIds = proposalData.map(p => p.id);

      const { data, error } = await supabase
        .from('proposal_activities')
        .select('*')
        .in('proposal_id', proposalIds)
        .order('created_at', { ascending: false })
        .limit(params.limit || 10);

      if (error) {
        console.error('Failed to fetch activities:', error);
        return { data: null, error: error.message };
      }

      // Map proposal_activities to ProposalActivity format for backward compatibility
      const mappedData = (data || []).map((activity: any) => ({
        id: activity.id,
        proposal_id: activity.proposal_id,
        proposal_number: activity.proposal_number,
        proposal_name: activity.proposal_name,
        user_id: activity.user_id,
        user_name: activity.user_name,
        activity_type: activity.activity_type,
        activity_details: activity.activity_details,
        organization_id: activity.organization_id,
        created_at: activity.created_at
      }));

      return { data: mappedData as ProposalActivity[] };
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Get activities for a specific proposal
   */
  async getProposalActivities(params: {
    proposalId: string;
  }): Promise<{ data: ProposalActivity[] | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('proposal_activities')
        .select('*')
        .eq('proposal_id', params.proposalId)
        .order('created_at', { ascending: false});

      if (error) {
        console.error('Failed to fetch proposal activities:', error);
        return { data: null, error: error.message };
      }

      // Map proposal_activities to ProposalActivity format for backward compatibility
      const mappedData = (data || []).map((activity: any) => ({
        id: activity.id,
        proposal_id: activity.proposal_id,
        proposal_number: activity.proposal_number,
        proposal_name: activity.proposal_name,
        user_id: activity.user_id,
        user_name: activity.user_name,
        activity_type: activity.activity_type,
        activity_details: activity.activity_details,
        organization_id: activity.organization_id,
        created_at: activity.created_at
      }));

      return { data: mappedData as ProposalActivity[] };
    } catch (error) {
      console.error('Failed to fetch proposal activities:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};
