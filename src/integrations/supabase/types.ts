// Updated database types for new schema with memberships table
export interface Database {
  public: {
    Tables: {
      quotes: {
        Row: {
          id: string;
          proposal_number: string;
          project_name?: string;
          quote_details: any;
          job_details: any;
          wall_details: any;
          price_details: any;
          delivery_details: any;
          labor_details: any;
          status: string;
          quote_source?: string;
          created_by: string;
          date_last_downloaded?: string;
          document_version: number;
          created_at: string;
          updated_at: string;
          organization_id: string;
          customization?: any;
          archived?: boolean;
          is_main_version?: boolean;
          total_value?: number | null;
          subtotal?: number | null;
          margin_percentage?: number | null;
          won_at?: string;
          submitted_at?: string;
          rejected_at?: string;
        };
        Insert: {
          id?: string;
          proposal_number: string;
          project_name?: string;
          quote_details: any;
          job_details: any;
          wall_details: any;
          price_details: any;
          delivery_details: any;
          labor_details: any;
          status?: string;
          quote_source?: string;
          created_by?: string;
          date_last_downloaded?: string;
          document_version?: number;
          created_at?: string;
          updated_at?: string;
          organization_id: string;
          customization?: any;
          archived?: boolean;
          is_main_version?: boolean;
          won_at?: string;
          submitted_at?: string;
          rejected_at?: string;
        };
        Update: {
          id?: string;
          proposal_number?: string;
          project_name?: string;
          quote_details?: any;
          job_details?: any;
          wall_details?: any;
          price_details?: any;
          delivery_details?: any;
          labor_details?: any;
          status?: string;
          quote_source?: string;
          created_by?: string;
          date_last_downloaded?: string;
          document_version?: number;
          created_at?: string;
          updated_at?: string;
          organization_id?: string;
          customization?: any;
          archived?: boolean;
          is_main_version?: boolean;
          won_at?: string;
          submitted_at?: string;
          rejected_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          found_via: string;
          phone_number: string;
          fax_number?: string | null;
          company_address: string;
          website: string;
          logo_data: any;
          industry: string;
          quote_starting_point: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          found_via: string;
          phone_number: string;
          fax_number?: string | null;
          company_address: string;
          website: string;
          logo_data?: any;
          industry: string;
          quote_starting_point: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          found_via?: string;
          phone_number?: string;
          fax_number?: string | null;
          company_address?: string;
          website?: string;
          logo_data?: any;
          industry?: string;
          quote_starting_point?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      invite_tokens: {
        Row: {
          id: string;
          token: string;
          organization_id: string;
          email: string;
          role: string;
          created_by: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
          is_used: boolean;
          department: string | null;
        };
        Insert: {
          id?: string;
          token: string;
          organization_id: string;
          email?: string;
          role: string;
          created_by: string;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
          is_used?: boolean;
          department?: string | null;
        };
        Update: {
          id?: string;
          token?: string;
          organization_id?: string;
          email?: string;
          role?: string;
          created_by?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
          is_used?: boolean;
          department?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invite_tokens_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invite_tokens_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          role: 'Owner' | 'Admin' | 'Member';
          status: 'Active' | 'Suspended'; //membership_status
          join_type: 'Direct' | 'Invited';
          invited_by: string | null;
          joined_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          role?: 'Owner' | 'Admin' | 'Member';
          status?: 'Active' | 'Suspended'; //membership_status
          join_type?: 'Direct' | 'Invited';
          invited_by?: string | null;
          joined_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          role?: 'Owner' | 'Admin' | 'Member';
          status?: 'Active' | 'Suspended'; //membership_status
          join_type?: 'Direct' | 'Invited';
          invited_by?: string | null;
          joined_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_creation_log: {
        Row: {
          id: string;
          user_id: string;
          timestamp: string;
          ip_address: string | null;
          status: 'Success' | 'Failed' | 'Rate_Limited';
          error_message?: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          timestamp?: string;
          ip_address?: string | null;
          status: 'Success' | 'Failed' | 'Rate_Limited';
          error_message?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          timestamp?: string;
          ip_address?: string | null;
          status?: 'Success' | 'Failed' | 'Rate_Limited';
          error_message?: string | null;
        };
      };
      user_onboarding_progress: {
        Row: {
          id: string;
          user_id: string;
          current_step: string;
          completed_steps: string[];
          session_data: any;
          created_at: string;
          updated_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          current_step: string;
          completed_steps?: string[];
          session_data?: any;
          created_at?: string;
          updated_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          current_step?: string;
          completed_steps?: string[];
          session_data?: any;
          created_at?: string;
          updated_at?: string;
          expires_at?: string;
        };
      };
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          stripe_product_id: string | null;
          stripe_price_id_monthly: string | null;
          stripe_price_id_yearly: string | null;
          features: any;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          description?: string | null;
          stripe_product_id?: string | null;
          stripe_price_id_monthly?: string | null;
          stripe_price_id_yearly?: string | null;
          features?: any;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          display_name?: string;
          description?: string | null;
          stripe_product_id?: string | null;
          stripe_price_id_monthly?: string | null;
          stripe_price_id_yearly?: string | null;
          features?: any;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          organization_id: string;
          plan_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_subscription_status: string | null;
          current_period_end: string | null;
          trial_start: string | null;
          trial_end: string | null;
          has_payment_method: boolean;
          last_payment_reminder_sent_at: string | null;
          is_active: boolean;
          access_blocked: boolean;
          access_blocked_reason: string | null;
          metadata: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          plan_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_subscription_status?: string | null;
          current_period_end?: string | null;
          trial_start?: string | null;
          trial_end?: string | null;
          has_payment_method?: boolean;
          last_payment_reminder_sent_at?: string | null;
          is_active?: boolean;
          access_blocked?: boolean;
          access_blocked_reason?: string | null;
          metadata?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          plan_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_subscription_status?: string | null;
          current_period_end?: string | null;
          trial_start?: string | null;
          trial_end?: string | null;
          has_payment_method?: boolean;
          last_payment_reminder_sent_at?: string | null;
          is_active?: boolean;
          access_blocked?: boolean;
          access_blocked_reason?: string | null;
          metadata?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          quote_id: string;
          workflow_status: string;
          board_order: number | null;
          priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest' | null;
          completion_date: string | null;
          organization_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quote_id: string;
          workflow_status: string;
          board_order?: number | null;
          priority?: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest' | null;
          completion_date?: string | null;
          organization_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quote_id?: string;
          workflow_status?: string;
          board_order?: number | null;
          priority?: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest' | null;
          completion_date?: string | null;
          organization_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_workflow_columns: {
        Row: {
          id: string;
          name: string;
          color: string;
          column_order: number;
          is_default: boolean;
          organization_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color: string;
          column_order: number;
          is_default?: boolean;
          organization_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string;
          column_order?: number;
          is_default?: boolean;
          organization_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      reminders: {
        Row: {
          id: string;
          quote_id: string;
          organization_id: string;
          title: string;
          description: string | null;
          due_date: string;
          priority: 'High' | 'Medium' | 'Low';
          reminder_status: 'Pending' | 'Completed' | 'Cancelled'; //reminder_status formerly status
          assigned_to: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          quote_id: string;
          organization_id: string;
          title: string;
          description?: string | null;
          due_date: string;
          priority?: 'High' | 'Medium' | 'Low';
          reminder_status?: 'Pending' | 'Completed' | 'Cancelled'; //reminder_status formerly status
          assigned_to?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          quote_id?: string;
          organization_id?: string;
          title?: string;
          description?: string | null;
          due_date?: string;
          priority?: 'High' | 'Medium' | 'Low';
          reminder_status?: 'Pending' | 'Completed' | 'Cancelled'; //reminder_status formerly status
          assigned_to?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
      invite_token_attempts: {
        Row: {
          id: string;
          ip_address: string;
          user_id: string | null;
          invite_token: string;
          attempted_at: string;
          success: boolean;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ip_address: string;
          user_id?: string | null;
          invite_token: string;
          attempted_at?: string;
          success?: boolean;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ip_address?: string;
          user_id?: string | null;
          invite_token?: string;
          attempted_at?: string;
          success?: boolean;
          error_message?: string | null;
          created_at?: string;
        };
      };
      /**
       * Forms table - Form template definitions
       * Stores form structure (tabs, fields) and presentation template
       */
      forms: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          tabs: Record<string, any>[]; // Array of FormTab objects
          created_by: string;
          created_at: string;
          updated_at: string;
          is_archived: boolean;
          is_default: boolean | null;
          document_type: string | null; // 'Proposal' | 'Quote' | 'Bid' | 'Estimate' | 'Service_Request'
          presentation_template: Record<string, any> | null; // PresentationTemplate JSONB
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          tabs: Record<string, any>[];
          created_by: string;
          created_at?: string;
          updated_at?: string;
          is_archived?: boolean;
          is_default?: boolean | null;
          document_type?: string | null;
          presentation_template?: Record<string, any> | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          tabs?: Record<string, any>[];
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          is_archived?: boolean;
          is_default?: boolean | null;
          document_type?: string | null;
          presentation_template?: Record<string, any> | null;
        };
      };
      /**
       * Proposals table - New form-builder system
       * Replaces the quotes table for the form-builder based workflow
       */
      proposals: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string;
          form_id: string;
          proposal_number: string | null;
          form_data: Record<string, any> | null;
          status: string | null;
          // Direct columns for querying (extracted from form_data)
          project_name: string | null;
          client_name: string | null;
          client_company: string | null;
          organization_name: string | null;
          job_location: string | null;
          total_value: number | null;
          // Document and template references
          document_type: string | null;
          template_type: string | null;
          // Board and workflow
          is_on_board: boolean | null;
          quote_source: string | null;
          // Versioning
          parent_proposal_id: string | null;
          is_main_version: boolean | null;
          // Archive
          archived: boolean | null;
          archived_at: string | null;
          // Completion tracking
          is_complete: boolean | null;
          // Status timestamps
          submitted_at: string | null;
          won_at: string | null;
          rejected_at: string | null;
          // Metadata
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          created_by: string;
          form_id: string;
          proposal_number?: string | null;
          form_data?: Record<string, any> | null;
          status?: string | null;
          project_name?: string | null;
          client_name?: string | null;
          client_company?: string | null;
          organization_name?: string | null;
          job_location?: string | null;
          total_value?: number | null;
          document_type?: string | null;
          template_type?: string | null;
          is_on_board?: boolean | null;
          quote_source?: string | null;
          parent_proposal_id?: string | null;
          is_main_version?: boolean | null;
          archived?: boolean | null;
          archived_at?: string | null;
          is_complete?: boolean | null;
          submitted_at?: string | null;
          won_at?: string | null;
          rejected_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          created_by?: string;
          form_id?: string;
          proposal_number?: string | null;
          form_data?: Record<string, any> | null;
          status?: string | null;
          project_name?: string | null;
          client_name?: string | null;
          client_company?: string | null;
          organization_name?: string | null;
          job_location?: string | null;
          total_value?: number | null;
          document_type?: string | null;
          template_type?: string | null;
          is_on_board?: boolean | null;
          quote_source?: string | null;
          parent_proposal_id?: string | null;
          is_main_version?: boolean | null;
          archived?: boolean | null;
          archived_at?: string | null;
          is_complete?: boolean | null;
          submitted_at?: string | null;
          won_at?: string | null;
          rejected_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      /**
       * Proposal Activities table - Activity log for proposals
       * Replaces quote_activities for the form-builder based workflow
       */
      proposal_activities: {
        Row: {
          id: string;
          proposal_id: string | null;
          proposal_number: string;
          project_name: string | null;
          user_id: string | null;
          user_name: string;
          activity_type: string;
          activity_details: Record<string, any> | null;
          organization_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          proposal_id?: string | null;
          proposal_number: string;
          project_name?: string | null;
          user_id?: string | null;
          user_name: string;
          activity_type: string;
          activity_details?: Record<string, any> | null;
          organization_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          proposal_id?: string | null;
          proposal_number?: string;
          project_name?: string | null;
          user_id?: string | null;
          user_name?: string;
          activity_type?: string;
          activity_details?: Record<string, any> | null;
          organization_id?: string;
          created_at?: string;
        };
      };
      /**
       * Proposal Status Transitions table - Audit log for proposal status changes
       * Automatically populated by database trigger on proposals table
       */
      proposal_status_transitions: {
        Row: {
          id: string;
          proposal_id: string;
          organization_id: string;
          from_status: string | null;
          to_status: string;
          transitioned_by: string | null;
          transitioned_at: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          proposal_id: string;
          organization_id: string;
          from_status?: string | null;
          to_status: string;
          transitioned_by?: string | null;
          transitioned_at?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          proposal_id?: string;
          organization_id?: string;
          from_status?: string | null;
          to_status?: string;
          transitioned_by?: string | null;
          transitioned_at?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
      /**
       * Proposal Documents table - File attachments for proposals
       * Actual files stored in Supabase Storage, this table stores metadata
       */
      proposal_documents: {
        Row: {
          id: string;
          proposal_id: string;
          organization_id: string;
          file_name: string;
          storage_path: string;
          file_size: number | null;
          mime_type: string | null;
          tab_key: string | null;
          description: string | null;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          proposal_id: string;
          organization_id: string;
          file_name: string;
          storage_path: string;
          file_size?: number | null;
          mime_type?: string | null;
          tab_key?: string | null;
          description?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          proposal_id?: string;
          organization_id?: string;
          file_name?: string;
          storage_path?: string;
          file_size?: number | null;
          mime_type?: string | null;
          tab_key?: string | null;
          description?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      update_user_profile: {
        Args: {
          user_id: string;
          full_name_value: string;
        };
        Returns: any;
      };
      update_org_creator_profile: {
        Args: {
          user_id: string;
          org_id: string;
          role_value: string;
          status_value: string;
        };
        Returns: any;
      };
      get_current_user_organization: {
        Args: {};
        Returns: string;
      };
      cleanup_expired_onboarding: {
        Args: {};
        Returns: void;
      };
      check_invite_rate_limit: {
        Args: {
          p_ip_address: string;
          p_user_id?: string | null;
          p_invite_token?: string | null;
          p_window_minutes?: number;
          p_max_attempts?: number;
        };
        Returns: Array<{
          allowed: boolean;
          attempts_used: number;
          window_reset_at: string;
          reason: string;
        }>;
      };
      log_invite_attempt: {
        Args: {
          p_ip_address: string;
          p_user_id: string | null;
          p_invite_token: string;
          p_success: boolean;
          p_error_message?: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      membership_role: 'Owner' | 'Admin' | 'Member';
      membership_status: 'Active' | 'Suspended';
      creation_log_status: 'Success' | 'Failed' | 'Rate_Limited';
    };
  };
}