import { supabase } from "@/integrations/supabase/client";

export interface ProposalActivity {
  id: string;
  proposal_id: string | null;
  proposal_number: string;
  project_name: string | null;
  user_id: string | null;
  user_name: string;
  activity_type: 'Created' | 'Status Changed' | 'Updated' | 'Deleted' | 'Reminder Set' | 'Archived' | 'Unarchived' | 'Submitted' | 'Accepted' | 'Rejected';
  activity_details: Record<string, any> | null;
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
    projectName: string | null;
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
          proposal_id: params.proposalId,
          proposal_number: params.proposalNumber,
          project_name: params.projectName,
          user_id: params.userId,
          user_name: params.userName,
          activity_type: params.activityType,
          activity_details: params.activityDetails || null,
          organization_id: params.organizationId
        } as any);

      if (error) {
        console.error('Failed to log proposal activity:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to log proposal activity:', error);
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
    projectName: string;
    userId: string;
    userName: string;
    organizationId: string;
    oldStatus: string;
    newStatus: string;
  }) {
    return this.logActivity({
      proposalId: params.proposalId,
      proposalNumber: params.proposalNumber,
      projectName: params.projectName,
      userId: params.userId,
      userName: params.userName,
      organizationId: params.organizationId,
      activityType: 'Status Changed',
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
    projectName: string;
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
    projectName: string;
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
   * Log proposal submission
   */
  async logSubmission(params: {
    proposalId: string;
    proposalNumber: string;
    projectName: string;
    userId: string;
    userName: string;
    organizationId: string;
  }) {
    return this.logActivity({
      ...params,
      activityType: 'Submitted'
    });
  },

  /**
   * Log proposal acceptance
   */
  async logAcceptance(params: {
    proposalId: string;
    proposalNumber: string;
    projectName: string;
    userId: string;
    userName: string;
    organizationId: string;
  }) {
    return this.logActivity({
      ...params,
      activityType: 'Accepted'
    });
  },

  /**
   * Log proposal rejection
   */
  async logRejection(params: {
    proposalId: string;
    proposalNumber: string;
    projectName: string;
    userId: string;
    userName: string;
    organizationId: string;
    reason?: string;
  }) {
    return this.logActivity({
      proposalId: params.proposalId,
      proposalNumber: params.proposalNumber,
      projectName: params.projectName,
      userId: params.userId,
      userName: params.userName,
      organizationId: params.organizationId,
      activityType: 'Rejected',
      activityDetails: params.reason ? { reason: params.reason } : undefined
    });
  },

  /**
   * Log reminder set
   */
  async logReminderSet(params: {
    proposalId: string;
    proposalNumber: string;
    projectName: string;
    userId: string;
    userName: string;
    organizationId: string;
    followUpDate: string;
  }) {
    return this.logActivity({
      proposalId: params.proposalId,
      proposalNumber: params.proposalNumber,
      projectName: params.projectName,
      userId: params.userId,
      userName: params.userName,
      organizationId: params.organizationId,
      activityType: 'Reminder Set',
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
      const { data, error } = await supabase
        .from('proposal_activities')
        .select('*')
        .eq('organization_id', params.organizationId)
        .order('created_at', { ascending: false })
        .limit(params.limit || 10);

      if (error) {
        console.error('Failed to fetch proposal activities:', error);
        return { data: null, error: error.message };
      }

      return { data: data as ProposalActivity[] };
    } catch (error) {
      console.error('Failed to fetch proposal activities:', error);
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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch proposal activities:', error);
        return { data: null, error: error.message };
      }

      return { data: data as ProposalActivity[] };
    } catch (error) {
      console.error('Failed to fetch proposal activities:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};
