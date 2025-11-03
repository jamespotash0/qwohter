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
          version: number;
          created_at: string;
          updated_at: string;
          organization_id: string;
          customization?: any;
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
          version?: number;
          created_at?: string;
          updated_at?: string;
          organization_id: string;
          customization?: any;
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
          version?: number;
          created_at?: string;
          updated_at?: string;
          organization_id?: string;
          customization?: any;
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
          organization_code: string;
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
          organization_code?: string;
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
          organization_code?: string;
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
          organization_code: string;
          role: string;
          created_by: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
          is_used: boolean;
        };
        Insert: {
          id?: string;
          token: string;
          organization_id: string;
          organization_code: string;
          role: string;
          created_by: string;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
          is_used?: boolean;
        };
        Update: {
          id?: string;
          token?: string;
          organization_id?: string;
          organization_code?: string;
          role?: string;
          created_by?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
          is_used?: boolean;
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
          status: 'Pending' | 'Active' | 'Suspended';
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
          status?: 'Pending' | 'Active' | 'Suspended';
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
          status?: 'Pending' | 'Active' | 'Suspended';
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
      create_organization_and_link_user: {
        Args: {
          org_name: string;
          org_code: string;
          creator_user_id: string;
        };
        Returns: any;
      };
      get_organization_by_code: {
        Args: {
          input_code: string;
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
    };
    Enums: {
      membership_role: 'Owner' | 'Admin' | 'Member';
      membership_status: 'Pending' | 'Active' | 'Suspended';
      creation_log_status: 'Success' | 'Failed' | 'Rate_Limited';
    };
  };
}