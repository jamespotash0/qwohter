// Updated database types for new schema with memberships table
export interface Database {
  public: {
    Tables: {
      // ============================================================================
      // Security Tables
      // ============================================================================
      auth_rate_limits: {
        Row: {
          id: string;
          identifier: string;
          identifier_type: 'email' | 'ip';
          attempt_type: 'login' | 'otp' | 'password_reset' | 'signup';
          attempt_count: number;
          first_attempt_at: string;
          last_attempt_at: string;
          blocked_until: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          identifier: string;
          identifier_type: 'email' | 'ip';
          attempt_type: 'login' | 'otp' | 'password_reset' | 'signup';
          attempt_count?: number;
          first_attempt_at?: string;
          last_attempt_at?: string;
          blocked_until?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          identifier?: string;
          identifier_type?: 'email' | 'ip';
          attempt_type?: 'login' | 'otp' | 'password_reset' | 'signup';
          attempt_count?: number;
          first_attempt_at?: string;
          last_attempt_at?: string;
          blocked_until?: string | null;
          created_at?: string;
        };
      };
      security_audit_log: {
        Row: {
          id: string;
          event_type: string;
          user_id: string | null;
          organization_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          details: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          user_id?: string | null;
          organization_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          details?: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: string;
          user_id?: string | null;
          organization_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          details?: Record<string, any>;
          created_at?: string;
        };
      };
      password_reset_audit: {
        Row: {
          id: string;
          email: string;
          ip_address: string | null;
          user_agent: string | null;
          requested_at: string;
          completed_at: string | null;
          success: boolean | null;
        };
        Insert: {
          id?: string;
          email: string;
          ip_address?: string | null;
          user_agent?: string | null;
          requested_at?: string;
          completed_at?: string | null;
          success?: boolean | null;
        };
        Update: {
          id?: string;
          email?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          requested_at?: string;
          completed_at?: string | null;
          success?: boolean | null;
        };
      };
      // ============================================================================
      // User & Auth Tables
      // ============================================================================
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          is_super_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          is_super_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          is_super_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          org_prefix: string;
          found_via: string;
          phone_number: string;
          fax_number?: string | null;
          company_address: string;
          website: string;
          logo_data: any;
          industry: string;
          payment_settings?: Record<string, any> | null;
          primary_storage_provider?: string | null;
          sync_to_all_storage_providers?: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          org_prefix?: string;
          found_via: string;
          phone_number: string;
          fax_number?: string | null;
          company_address: string;
          website: string;
          logo_data?: any;
          industry: string;
          payment_settings?: Record<string, any> | null;
          primary_storage_provider?: string | null;
          sync_to_all_storage_providers?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          org_prefix?: string;
          found_via?: string;
          phone_number?: string;
          fax_number?: string | null;
          company_address?: string;
          website?: string;
          logo_data?: any;
          industry?: string;
          payment_settings?: Record<string, any> | null;
          primary_storage_provider?: string | null;
          sync_to_all_storage_providers?: boolean | null;
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
      signup_invites: {
        Row: {
          id: string;
          token: string;
          email: string;
          expires_at: string;
          is_used: boolean;
          used_at: string | null;
          used_by_user_id: string | null;
          created_at: string;
          updated_at: string;
          created_by_user_id: string | null;
          revoked_at: string | null;
          revoked_by_user_id: string | null;
          email_sent_at: string | null;
          email_error: string | null;
        };
        Insert: {
          id?: string;
          token: string;
          email: string;
          expires_at: string;
          is_used?: boolean;
          used_at?: string | null;
          used_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by_user_id?: string | null;
          revoked_at?: string | null;
          revoked_by_user_id?: string | null;
          email_sent_at?: string | null;
          email_error?: string | null;
        };
        Update: {
          id?: string;
          token?: string;
          email?: string;
          expires_at?: string;
          is_used?: boolean;
          used_at?: string | null;
          used_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by_user_id?: string | null;
          revoked_at?: string | null;
          revoked_by_user_id?: string | null;
          email_sent_at?: string | null;
          email_error?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "signup_invites_used_by_user_id_fkey";
            columns: ["used_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "signup_invites_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "signup_invites_revoked_by_user_id_fkey";
            columns: ["revoked_by_user_id"];
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
          proposal_id: string | null; // Links to proposal if created from a proposal
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
          proposal_id?: string | null; // Links to proposal if created from a proposal
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
          proposal_id?: string | null;
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
       * Stores form structure in metadata JSONB field
       */
      forms: {
        Row: {
          id: string;
          organization_id: string | null; // Null for system templates
          name: string;
          description: string | null;
          metadata: Record<string, any> | null; // Form builder data (terms, pricing, etc.)
          created_by: string | null;
          created_at: string;
          updated_at: string;
          is_archived: boolean;
          is_default: boolean | null;
          is_template: boolean; // True for system templates
          copied_from_form_id: string | null; // Template lineage tracking
          document_type: string | null; // 'Proposal' | 'Invoice' | 'Service_Request'
          presentation_template: Record<string, any> | null; // PresentationTemplate JSONB
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          name: string;
          description?: string | null;
          metadata?: Record<string, any> | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          is_archived?: boolean;
          is_default?: boolean | null;
          is_template?: boolean;
          copied_from_form_id?: string | null;
          document_type?: string | null;
          presentation_template?: Record<string, any> | null;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          name?: string;
          description?: string | null;
          metadata?: Record<string, any> | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          is_archived?: boolean;
          is_default?: boolean | null;
          is_template?: boolean;
          copied_from_form_id?: string | null;
          document_type?: string | null;
          presentation_template?: Record<string, any> | null;
        };
      };
      /**
       * Proposals table - New form-builder system
       */
      proposals: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string;
          created_by_name: string | null;
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
          proposal_source: string | null;
          // Versioning
          parent_proposal_id: string | null;
          is_main_version: boolean | null;
          // Archive
          archived: boolean | null;
          archived_at: string | null;
          // Completion tracking
          is_complete: boolean | null;
          // Document count
          documents_count: number | null;
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
          proposal_source?: string | null;
          parent_proposal_id?: string | null;
          is_main_version?: boolean | null;
          archived?: boolean | null;
          archived_at?: string | null;
          is_complete?: boolean | null;
          documents_count?: number | null;
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
          proposal_source?: string | null;
          parent_proposal_id?: string | null;
          is_main_version?: boolean | null;
          archived?: boolean | null;
          archived_at?: string | null;
          is_complete?: boolean | null;
          documents_count?: number | null;
          submitted_at?: string | null;
          won_at?: string | null;
          rejected_at?: string | null;
          created_at?: string;
          updated_at?: string;
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
      // ============================================================================
      // Product Hierarchy Tables
      // ============================================================================
      /**
       * Product Domain - Top level product categorization (e.g., "Operable Walls")
       * Renamed from product_types
       */
      product_domain: {
        Row: {
          id: string;
          name: string;
          code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      /**
       * Product Category - Domain subcategories (e.g., "Accordion Fold", "Panel")
       * Renamed from product_categories
       */
      product_category: {
        Row: {
          id: string;
          domain_id: string | null;
          name: string;
          code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          domain_id?: string | null;
          name: string;
          code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          domain_id?: string | null;
          name?: string;
          code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      /**
       * Product Manufacturers - Manufacturer companies
       */
      product_manufacturers: {
        Row: {
          id: string;
          name: string;
          code: string | null;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code?: string | null;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string | null;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      /**
       * Manufacturer Product Domains - Junction table for many-to-many relationship
       */
      manufacturer_product_domains: {
        Row: {
          id: string;
          manufacturer_id: string;
          domain_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          manufacturer_id: string;
          domain_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          manufacturer_id?: string;
          domain_id?: string;
          created_at?: string;
        };
      };
      /**
       * Product Line - Product lines under manufacturers
       */
      product_line: {
        Row: {
          id: string;
          manufacturer_id: string;
          name: string;
          code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          manufacturer_id: string;
          name: string;
          code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          manufacturer_id?: string;
          name?: string;
          code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      /**
       * Product Series - Series under product lines or directly under manufacturers
       */
      product_series: {
        Row: {
          id: string;
          manufacturer_id: string | null;
          product_line_id: string | null;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          manufacturer_id?: string | null;
          product_line_id?: string | null;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          manufacturer_id?: string | null;
          product_line_id?: string | null;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      /**
       * Product Models - Individual product models
       * Can belong to a series OR directly to a manufacturer
       */
      product_models: {
        Row: {
          id: string;
          series_id: string | null;
          manufacturer_id: string | null;
          category_id: string | null;
          product_series_id: string | null;
          product_line_id: string | null;
          product_manufacturer_id: string | null;
          name: string;
          default_configurations: Record<string, unknown> | null;
          /** Product configuration schema (v2.0) - replaces default_configurations */
          config_schema: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          series_id?: string | null;
          manufacturer_id?: string | null;
          category_id?: string | null;
          product_series_id?: string | null;
          product_line_id?: string | null;
          product_manufacturer_id?: string | null;
          name: string;
          default_configurations?: Record<string, unknown> | null;
          config_schema?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          series_id?: string | null;
          manufacturer_id?: string | null;
          category_id?: string | null;
          product_series_id?: string | null;
          product_line_id?: string | null;
          product_manufacturer_id?: string | null;
          name?: string;
          default_configurations?: Record<string, unknown> | null;
          config_schema?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
  
      // ============================================================================
      // Config Value Sets - Shared value libraries for product configuration
      // ============================================================================
      /**
       * Config Value Sets - Shared value libraries (colors, materials, etc.)
       * Referenced by config_schema via values_ref property
       */
      config_value_sets: {
        Row: {
          id: string;
          slug: string;
          name: string;
          category: string | null;
          manufacturer_id: string | null;
          values: Record<string, unknown>[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          category?: string | null;
          manufacturer_id?: string | null;
          values?: Record<string, unknown>[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          category?: string | null;
          manufacturer_id?: string | null;
          values?: Record<string, unknown>[];
          created_at?: string;
          updated_at?: string;
        };
      };

      
      // ============================================================================
      // Notifications Table
      // ============================================================================
      notifications: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          type: string;
          title: string;
          message: string;
          link: string | null;
          is_read: boolean;
          metadata: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          type: string;
          title: string;
          message: string;
          link?: string | null;
          is_read?: boolean;
          metadata?: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          type?: string;
          title?: string;
          message?: string;
          link?: string | null;
          is_read?: boolean;
          metadata?: Record<string, any>;
          created_at?: string;
        };
      };
      // ============================================================================
      // Scheduled Notifications Table
      // ============================================================================
      scheduled_notifications: {
        Row: {
          id: string;
          entity_type: 'Task' | 'Proposal' | 'Invoice' | 'Project';
          entity_id: string;
          user_id: string;
          organization_id: string;
          scheduled_for: string;
          recurrence: 'Once' | 'Daily' | 'Weekly';
          recurrence_end_date: string | null;
          notification_type: string;
          title: string;
          message: string | null;
          link: string | null;
          metadata: Record<string, any>;
          status: 'Pending' | 'Sent' | 'Cancelled' | 'Failed';
          sent_at: string | null;
          last_sent_at: string | null;
          failure_reason: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          entity_type: 'Task' | 'Proposal' | 'Invoice' | 'Project';
          entity_id: string;
          user_id: string;
          organization_id: string;
          scheduled_for: string;
          recurrence?: 'Once' | 'Daily' | 'Weekly';
          recurrence_end_date?: string | null;
          notification_type?: string;
          title: string;
          message?: string | null;
          link?: string | null;
          metadata?: Record<string, any>;
          status?: 'Pending' | 'Sent' | 'Cancelled' | 'Failed';
          sent_at?: string | null;
          last_sent_at?: string | null;
          failure_reason?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          entity_type?: 'Task' | 'Proposal' | 'Invoice' | 'Project';
          entity_id?: string;
          user_id?: string;
          organization_id?: string;
          scheduled_for?: string;
          recurrence?: 'Once' | 'Daily' | 'Weekly';
          recurrence_end_date?: string | null;
          notification_type?: string;
          title?: string;
          message?: string | null;
          link?: string | null;
          metadata?: Record<string, any>;
          status?: 'Pending' | 'Sent' | 'Cancelled' | 'Failed';
          sent_at?: string | null;
          last_sent_at?: string | null;
          failure_reason?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };

      /**
       * Companies - customer accounts you sell to (bill-to / ship-to).
       * Distinct from contacts, which model people. A purchase order or invoice
       * is addressed to a company, not a person.
       */
      companies: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          legal_name: string | null;
          company_type: 'Customer' | 'Prospect' | 'Partner' | 'Other';
          billing_address_line1: string | null;
          billing_address_line2: string | null;
          billing_city: string | null;
          billing_state: string | null;
          billing_postal_code: string | null;
          billing_country: string | null;
          shipping_address_line1: string | null;
          shipping_address_line2: string | null;
          shipping_city: string | null;
          shipping_state: string | null;
          shipping_postal_code: string | null;
          shipping_country: string | null;
          phone: string | null;
          website: string | null;
          payment_terms: string | null;
          tax_exempt: boolean;
          tax_exempt_certificate: string | null;
          default_tax_rate: number | null;
          primary_contact_id: string | null;
          external_accounting_id: string | null;
          notes: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          legal_name?: string | null;
          company_type?: 'Customer' | 'Prospect' | 'Partner' | 'Other';
          billing_address_line1?: string | null;
          billing_address_line2?: string | null;
          billing_city?: string | null;
          billing_state?: string | null;
          billing_postal_code?: string | null;
          billing_country?: string | null;
          shipping_address_line1?: string | null;
          shipping_address_line2?: string | null;
          shipping_city?: string | null;
          shipping_state?: string | null;
          shipping_postal_code?: string | null;
          shipping_country?: string | null;
          phone?: string | null;
          website?: string | null;
          payment_terms?: string | null;
          tax_exempt?: boolean;
          tax_exempt_certificate?: string | null;
          default_tax_rate?: number | null;
          primary_contact_id?: string | null;
          external_accounting_id?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          legal_name?: string | null;
          company_type?: 'Customer' | 'Prospect' | 'Partner' | 'Other';
          billing_address_line1?: string | null;
          billing_address_line2?: string | null;
          billing_city?: string | null;
          billing_state?: string | null;
          billing_postal_code?: string | null;
          billing_country?: string | null;
          shipping_address_line1?: string | null;
          shipping_address_line2?: string | null;
          shipping_city?: string | null;
          shipping_state?: string | null;
          shipping_postal_code?: string | null;
          shipping_country?: string | null;
          phone?: string | null;
          website?: string | null;
          payment_terms?: string | null;
          tax_exempt?: boolean;
          tax_exempt_certificate?: string | null;
          default_tax_rate?: number | null;
          primary_contact_id?: string | null;
          external_accounting_id?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      /**
       * Vendors - manufacturers and suppliers you buy from. Purchase orders are
       * addressed to a vendor. A vendor row is the manufacturer identity; there
       * is no product catalog to link to.
       */
      vendors: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          vendor_type: 'Manufacturer' | 'Supplier' | 'Subcontractor' | 'Freight' | 'Other';
          account_number: string | null;
          order_method: 'Email' | 'Portal' | 'EDI' | 'Fax' | 'Phone';
          order_email: string | null;
          acknowledgment_email: string | null;
          portal_url: string | null;
          remit_to_name: string | null;
          remit_to_address_line1: string | null;
          remit_to_address_line2: string | null;
          remit_to_city: string | null;
          remit_to_state: string | null;
          remit_to_postal_code: string | null;
          remit_to_country: string | null;
          phone: string | null;
          payment_terms: string | null;
          freight_terms:
            | 'FOB Origin'
            | 'FOB Destination'
            | 'Prepaid'
            | 'Prepaid and Add'
            | 'Collect'
            | null;
          standard_lead_time_days: number | null;
          rep_name: string | null;
          rep_email: string | null;
          rep_phone: string | null;
          external_accounting_id: string | null;
          notes: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          vendor_type?: 'Manufacturer' | 'Supplier' | 'Subcontractor' | 'Freight' | 'Other';
          account_number?: string | null;
          order_method?: 'Email' | 'Portal' | 'EDI' | 'Fax' | 'Phone';
          order_email?: string | null;
          acknowledgment_email?: string | null;
          portal_url?: string | null;
          remit_to_name?: string | null;
          remit_to_address_line1?: string | null;
          remit_to_address_line2?: string | null;
          remit_to_city?: string | null;
          remit_to_state?: string | null;
          remit_to_postal_code?: string | null;
          remit_to_country?: string | null;
          phone?: string | null;
          payment_terms?: string | null;
          freight_terms?:
            | 'FOB Origin'
            | 'FOB Destination'
            | 'Prepaid'
            | 'Prepaid and Add'
            | 'Collect'
            | null;
          standard_lead_time_days?: number | null;
          rep_name?: string | null;
          rep_email?: string | null;
          rep_phone?: string | null;
          external_accounting_id?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          vendor_type?: 'Manufacturer' | 'Supplier' | 'Subcontractor' | 'Freight' | 'Other';
          account_number?: string | null;
          order_method?: 'Email' | 'Portal' | 'EDI' | 'Fax' | 'Phone';
          order_email?: string | null;
          acknowledgment_email?: string | null;
          portal_url?: string | null;
          remit_to_name?: string | null;
          remit_to_address_line1?: string | null;
          remit_to_address_line2?: string | null;
          remit_to_city?: string | null;
          remit_to_state?: string | null;
          remit_to_postal_code?: string | null;
          remit_to_country?: string | null;
          phone?: string | null;
          payment_terms?: string | null;
          freight_terms?:
            | 'FOB Origin'
            | 'FOB Destination'
            | 'Prepaid'
            | 'Prepaid and Add'
            | 'Collect'
            | null;
          standard_lead_time_days?: number | null;
          rep_name?: string | null;
          rep_email?: string | null;
          rep_phone?: string | null;
          external_accounting_id?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      /**
       * Vendor discounts - discount off manufacturer list, by series and
       * contract vehicle, both free text. NULL means "applies to anything";
       * rows resolve most-specific-first. Margin data: RLS gates this table on
       * can_view_cost(), not plain membership.
       */
      vendor_discounts: {
        Row: {
          id: string;
          organization_id: string;
          vendor_id: string;
          series_name: string | null;
          contract_vehicle: string | null;
          discount_percent: number;
          effective_from: string | null;
          effective_to: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          vendor_id: string;
          series_name?: string | null;
          contract_vehicle?: string | null;
          discount_percent: number;
          effective_from?: string | null;
          effective_to?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          vendor_id?: string;
          series_name?: string | null;
          contract_vehicle?: string | null;
          discount_percent?: number;
          effective_from?: string | null;
          effective_to?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      /**
       * Whether a user may see cost and margin figures for an organization.
       * Single source of truth for buy-side visibility.
       */
      can_view_cost: {
        Args: {
          check_user_id: string;
          check_org_id: string;
        };
        Returns: boolean;
      };
      // ============================================================================
      // Auth Rate Limiting Functions (Security)
      // ============================================================================
      check_login_rate_limit: {
        Args: {
          p_email: string;
        };
        Returns: {
          allowed: boolean;
          blocked: boolean;
          remaining_attempts: number | null;
          remaining_seconds: number | null;
          blocked_until: string | null;
          message: string | null;
        };
      };
      check_otp_rate_limit: {
        Args: {
          p_email: string;
        };
        Returns: {
          allowed: boolean;
          blocked: boolean;
          remaining_attempts: number | null;
          remaining_seconds: number | null;
          blocked_until: string | null;
          message: string | null;
        };
      };
      record_failed_login: {
        Args: {
          p_email: string;
        };
        Returns: {
          recorded: boolean;
          blocked: boolean;
          attempt_count: number;
        };
      };
      record_failed_otp: {
        Args: {
          p_email: string;
        };
        Returns: {
          recorded: boolean;
          blocked: boolean;
          attempt_count: number;
        };
      };
      clear_auth_rate_limit: {
        Args: {
          p_email: string;
          p_attempt_type: string;
        };
        Returns: void;
      };
      check_auth_rate_limit: {
        Args: {
          p_identifier: string;
          p_identifier_type: string;
          p_attempt_type: string;
          p_max_attempts: number;
          p_window_minutes: number;
          p_block_duration_minutes: number;
        };
        Returns: {
          allowed: boolean;
          blocked: boolean;
          remaining_attempts: number | null;
          blocked_until: string | null;
          message: string | null;
        };
      };
      record_auth_attempt: {
        Args: {
          p_identifier: string;
          p_identifier_type: string;
          p_attempt_type: string;
          p_success: boolean;
          p_max_attempts: number;
          p_window_minutes: number;
          p_block_duration_minutes: number;
        };
        Returns: {
          success: boolean;
          attempt_count: number | null;
          blocked: boolean | null;
          blocked_until: string | null;
          cleared: boolean | null;
        };
      };
      // ============================================================================
      // User & Organization Functions
      // ============================================================================
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
        Args: Record<string, never>;
        Returns: string;
      };
      cleanup_expired_onboarding: {
        Args: Record<string, never>;
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
      /**
       * Get complete model configuration as JSON
       * Returns the full option configuration in a frontend-friendly format
       */
      get_model_configuration: {
        Args: {
          p_model_id: string;
        };
        Returns: {
          model_id: string;
          model_name: string;
          series_id: string | null;
          series_name: string | null;
          product_line_id: string | null;
          product_line_name: string | null;
          option_groups: Array<{
            id: string;
            name: string;
            slug: string;
            field_type: string;
            input_type: string | null;
            allowed_values: Array<{
              id: string;
              value: string;
            }>;
            default_value: string | null;
            ui_metadata: {
              display_order: number;
              display_group: string;
              grid_span: number;
              placeholder: string | null;
              help_text: string | null;
              is_required: boolean;
              is_multi_select: boolean;
              is_manual_select: boolean;
              is_visible: boolean;
              min_value: number | null;
              max_value: number | null;
              step_value: number | null;
            };
          }>;
          rules: Array<{
            id: string;
            name: string;
            description: string | null;
            priority: number;
            condition: Record<string, any>;
            effect: Record<string, any>;
          }>;
        } | null;
      };
    };
    Enums: {
      membership_role: 'Owner' | 'Admin' | 'Member';
      membership_status: 'Active' | 'Suspended';
      creation_log_status: 'Success' | 'Failed' | 'Rate_Limited';
    };
  };
}