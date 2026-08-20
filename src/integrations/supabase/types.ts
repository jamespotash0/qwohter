export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_agent_runs: {
        Row: {
          agent_type: string
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          estimated_cost_usd: number | null
          id: string
          input_data: Json | null
          organization_id: string
          output_data: Json | null
          proposal_id: string | null
          started_at: string | null
          status: string | null
          suggestions_generated: number | null
          total_tokens: number | null
          trigger_event: string
          triggered_by: string | null
        }
        Insert: {
          agent_type: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_data?: Json | null
          organization_id: string
          output_data?: Json | null
          proposal_id?: string | null
          started_at?: string | null
          status?: string | null
          suggestions_generated?: number | null
          total_tokens?: number | null
          trigger_event: string
          triggered_by?: string | null
        }
        Update: {
          agent_type?: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_data?: Json | null
          organization_id?: string
          output_data?: Json | null
          proposal_id?: string | null
          started_at?: string | null
          status?: string | null
          suggestions_generated?: number | null
          total_tokens?: number | null
          trigger_event?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_runs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_runs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_needing_ai_attention"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_capability_gaps: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          organization_id: string
          reason: string
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          suggested_workaround: string | null
          user_id: string | null
          user_request: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          organization_id: string
          reason: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          suggested_workaround?: string | null
          user_id?: string | null
          user_request: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string
          reason?: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          suggested_workaround?: string | null
          user_id?: string | null
          user_request?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_capability_gaps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_capability_gaps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_capability_gaps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unverified_profiles_to_cleanup"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_proactive: boolean | null
          model_used: string | null
          organization_id: string
          proposal_id: string
          role: string
          suggestion_id: string | null
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_proactive?: boolean | null
          model_used?: string | null
          organization_id: string
          proposal_id: string
          role: string
          suggestion_id?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_proactive?: boolean | null
          model_used?: string | null
          organization_id?: string
          proposal_id?: string
          role?: string
          suggestion_id?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_needing_ai_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_suggestions: {
        Row: {
          applied_at: string | null
          completion_tokens: number | null
          confidence_score: number | null
          content: string
          created_at: string | null
          dismissed_at: string | null
          dismissed_reason: string | null
          email_recipient: string | null
          email_subject: string | null
          expires_at: string | null
          id: string
          model_used: string | null
          organization_id: string
          prompt_tokens: number | null
          proposal_id: string
          reasoning: string | null
          status: string | null
          suggestion_type: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          completion_tokens?: number | null
          confidence_score?: number | null
          content: string
          created_at?: string | null
          dismissed_at?: string | null
          dismissed_reason?: string | null
          email_recipient?: string | null
          email_subject?: string | null
          expires_at?: string | null
          id?: string
          model_used?: string | null
          organization_id: string
          prompt_tokens?: number | null
          proposal_id: string
          reasoning?: string | null
          status?: string | null
          suggestion_type: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          completion_tokens?: number | null
          confidence_score?: number | null
          content?: string
          created_at?: string | null
          dismissed_at?: string | null
          dismissed_reason?: string | null
          email_recipient?: string | null
          email_subject?: string | null
          expires_at?: string | null
          id?: string
          model_used?: string | null
          organization_id?: string
          prompt_tokens?: number | null
          proposal_id?: string
          reasoning?: string | null
          status?: string | null
          suggestion_type?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_needing_ai_attention"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_user_feedback: {
        Row: {
          comment: string | null
          context_type: string | null
          created_at: string | null
          feedback_type: string | null
          id: string
          message_content: string | null
          message_id: string | null
          organization_id: string | null
          rating: number | null
          suggestion_id: string | null
          user_correction: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          context_type?: string | null
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          message_content?: string | null
          message_id?: string | null
          organization_id?: string | null
          rating?: number | null
          suggestion_id?: string | null
          user_correction?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          context_type?: string | null
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          message_content?: string | null
          message_id?: string | null
          organization_id?: string | null
          rating?: number | null
          suggestion_id?: string | null
          user_correction?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_user_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_user_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_user_feedback_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          organization_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type?: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          organization_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          organization_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_rate_limits: {
        Row: {
          attempt_count: number | null
          attempt_type: string
          blocked_until: string | null
          created_at: string | null
          first_attempt_at: string | null
          id: string
          identifier: string
          identifier_type: string
          last_attempt_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          attempt_type: string
          blocked_until?: string | null
          created_at?: string | null
          first_attempt_at?: string | null
          id?: string
          identifier: string
          identifier_type: string
          last_attempt_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          attempt_type?: string
          blocked_until?: string | null
          created_at?: string | null
          first_attempt_at?: string | null
          id?: string
          identifier?: string
          identifier_type?: string
          last_attempt_at?: string | null
        }
        Relationships: []
      }
      available_integrations: {
        Row: {
          category: string | null
          coming_soon: boolean | null
          created_at: string | null
          description: string | null
          display_order: number | null
          documentation_url: string | null
          estimated_setup_time_minutes: number | null
          id: string
          integration_type: string
          is_beta: boolean | null
          is_enabled: boolean | null
          logo_url: string | null
          name: string
          platform_requirement: string | null
          required_plan: string | null
          setup_difficulty: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          coming_soon?: boolean | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          documentation_url?: string | null
          estimated_setup_time_minutes?: number | null
          id?: string
          integration_type: string
          is_beta?: boolean | null
          is_enabled?: boolean | null
          logo_url?: string | null
          name: string
          platform_requirement?: string | null
          required_plan?: string | null
          setup_difficulty?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          coming_soon?: boolean | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          documentation_url?: string | null
          estimated_setup_time_minutes?: number | null
          id?: string
          integration_type?: string
          is_beta?: boolean | null
          is_enabled?: boolean | null
          logo_url?: string | null
          name?: string
          platform_requirement?: string | null
          required_plan?: string | null
          setup_difficulty?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      billing_phases: {
        Row: {
          amount_type: string
          amount_value: number
          billing_email: string | null
          created_at: string
          due_date: string | null
          id: string
          invoiced_at: string | null
          name: string
          organization_id: string
          paid_at: string | null
          payment_job_id: string
          resolved_amount: number | null
          sequence: number
          status: string
          trigger_milestone_key: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          amount_type?: string
          amount_value?: number
          billing_email?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoiced_at?: string | null
          name: string
          organization_id: string
          paid_at?: string | null
          payment_job_id: string
          resolved_amount?: number | null
          sequence?: number
          status?: string
          trigger_milestone_key?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          amount_type?: string
          amount_value?: number
          billing_email?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoiced_at?: string | null
          name?: string
          organization_id?: string
          paid_at?: string | null
          payment_job_id?: string
          resolved_amount?: number | null
          sequence?: number
          status?: string
          trigger_milestone_key?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_phases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_phases_payment_job_id_fkey"
            columns: ["payment_job_id"]
            isOneToOne: false
            referencedRelation: "payment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          event_type: string
          id: string
          organization_id: string
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          organization_id: string
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          organization_id?: string
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_country: string | null
          billing_postal_code: string | null
          billing_state: string | null
          company_type: string
          created_at: string
          created_by: string | null
          default_tax_rate: number | null
          external_accounting_id: string | null
          id: string
          is_active: boolean
          legal_name: string | null
          name: string
          notes: string | null
          organization_id: string
          payment_terms: string | null
          phone: string | null
          primary_contact_id: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_postal_code: string | null
          shipping_state: string | null
          tax_exempt: boolean
          tax_exempt_certificate: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          billing_state?: string | null
          company_type?: string
          created_at?: string
          created_by?: string | null
          default_tax_rate?: number | null
          external_accounting_id?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          name: string
          notes?: string | null
          organization_id: string
          payment_terms?: string | null
          phone?: string | null
          primary_contact_id?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          tax_exempt?: boolean
          tax_exempt_certificate?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          billing_state?: string | null
          company_type?: string
          created_at?: string
          created_by?: string | null
          default_tax_rate?: number | null
          external_accounting_id?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          payment_terms?: string | null
          phone?: string | null
          primary_contact_id?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          tax_exempt?: boolean
          tax_exempt_certificate?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          addresses: string[] | null
          company_id: string | null
          company_name: string | null
          contact_type: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          emails: string[]
          full_name: string
          id: string
          is_in_organization: boolean
          notes: string | null
          organization_id: string
          phones: Json[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          addresses?: string[] | null
          company_id?: string | null
          company_name?: string | null
          contact_type?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          emails: string[]
          full_name: string
          id?: string
          is_in_organization?: boolean
          notes?: string | null
          organization_id: string
          phones?: Json[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          addresses?: string[] | null
          company_id?: string | null
          company_name?: string | null
          contact_type?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          emails?: string[]
          full_name?: string
          id?: string
          is_in_organization?: boolean
          notes?: string | null
          organization_id?: string
          phones?: Json[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "unverified_profiles_to_cleanup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crews: {
        Row: {
          created_at: string
          created_by: string | null
          crew_type: string
          hourly_cost: number | null
          id: string
          is_active: boolean
          lead_name: string | null
          lead_phone: string | null
          name: string
          notes: string | null
          organization_id: string
          size: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          crew_type?: string
          hourly_cost?: number | null
          id?: string
          is_active?: boolean
          lead_name?: string | null
          lead_phone?: string | null
          name: string
          notes?: string | null
          organization_id: string
          size?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          crew_type?: string
          hourly_cost?: number | null
          id?: string
          is_active?: boolean
          lead_name?: string | null
          lead_phone?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          size?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          content: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          organization_id: string | null
          page_settings: Json | null
          slug: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          organization_id?: string | null
          page_settings?: Json | null
          slug?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          organization_id?: string | null
          page_settings?: Json | null
          slug?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pdf_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          copied_from_form_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          document_type: string | null
          id: string
          is_archived: boolean | null
          is_default: boolean | null
          is_template: boolean
          metadata: Json | null
          name: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          copied_from_form_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_type?: string | null
          id?: string
          is_archived?: boolean | null
          is_default?: boolean | null
          is_template?: boolean
          metadata?: Json | null
          name: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          copied_from_form_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_type?: string | null
          id?: string
          is_archived?: boolean | null
          is_default?: boolean | null
          is_template?: boolean
          metadata?: Json | null
          name?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forms_copied_from_form_id_fkey"
            columns: ["copied_from_form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      google_oauth_tokens: {
        Row: {
          access_token: string
          connected_by_user_id: string | null
          created_at: string
          drive_folder_id: string | null
          google_email: string | null
          google_name: string | null
          id: string
          is_valid: boolean
          last_risc_event: Json | null
          last_used_at: string | null
          organization_id: string
          refresh_token: string | null
          scopes: string[]
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          connected_by_user_id?: string | null
          created_at?: string
          drive_folder_id?: string | null
          google_email?: string | null
          google_name?: string | null
          id?: string
          is_valid?: boolean
          last_risc_event?: Json | null
          last_used_at?: string | null
          organization_id: string
          refresh_token?: string | null
          scopes?: string[]
          token_expires_at: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          connected_by_user_id?: string | null
          created_at?: string
          drive_folder_id?: string | null
          google_email?: string | null
          google_name?: string | null
          id?: string
          is_valid?: boolean
          last_risc_event?: Json | null
          last_used_at?: string | null
          organization_id?: string
          refresh_token?: string | null
          scopes?: string[]
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_oauth_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          connection_error: string | null
          connection_status: string | null
          created_at: string | null
          id: string
          integration_name: string
          integration_type: string
          is_connected: boolean | null
          last_connection_check_at: string | null
          organization_id: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          connection_error?: string | null
          connection_status?: string | null
          created_at?: string | null
          id?: string
          integration_name: string
          integration_type: string
          is_connected?: boolean | null
          last_connection_check_at?: string | null
          organization_id: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          connection_error?: string | null
          connection_status?: string | null
          created_at?: string | null
          id?: string
          integration_name?: string
          integration_type?: string
          is_connected?: boolean | null
          last_connection_check_at?: string | null
          organization_id?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_token_attempts: {
        Row: {
          attempted_at: string
          created_at: string
          error_message: string | null
          id: string
          invite_token: string
          ip_address: unknown
          success: boolean
          user_id: string | null
        }
        Insert: {
          attempted_at?: string
          created_at?: string
          error_message?: string | null
          id?: string
          invite_token: string
          ip_address: unknown
          success?: boolean
          user_id?: string | null
        }
        Update: {
          attempted_at?: string
          created_at?: string
          error_message?: string | null
          id?: string
          invite_token?: string
          ip_address?: unknown
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      invite_tokens: {
        Row: {
          created_at: string | null
          created_by: string
          department: string | null
          email: string
          expires_at: string
          id: string
          is_used: boolean | null
          organization_id: string
          revoked_at: string | null
          role: string
          token: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          department?: string | null
          email: string
          expires_at: string
          id?: string
          is_used?: boolean | null
          organization_id: string
          revoked_at?: string | null
          role: string
          token: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          department?: string | null
          email?: string
          expires_at?: string
          id?: string
          is_used?: boolean | null
          organization_id?: string
          revoked_at?: string | null
          role?: string
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          department: string | null
          id: string
          invited_by: string | null
          join_type: string
          joined_at: string | null
          organization_id: string
          role: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          invited_by?: string | null
          join_type?: string
          joined_at?: string | null
          organization_id: string
          role?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          invited_by?: string | null
          join_type?: string
          joined_at?: string | null
          organization_id?: string
          role?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "unverified_profiles_to_cleanup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unverified_profiles_to_cleanup"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          email_on_member_joined: boolean | null
          email_on_mention: boolean | null
          email_on_payment_failed: boolean | null
          email_on_payment_success: boolean | null
          email_on_proposal_rejected: boolean | null
          email_on_proposal_submitted: boolean | null
          email_on_proposal_won: boolean | null
          email_on_reminder_due: boolean | null
          email_on_seat_count_changed: boolean | null
          email_on_signature_sent: boolean | null
          email_on_signature_signed: boolean | null
          email_on_signature_viewed: boolean | null
          email_on_subscription_activated: boolean | null
          email_on_subscription_canceled: boolean | null
          email_on_subscription_renewed: boolean | null
          email_on_task_assigned: boolean | null
          email_on_task_due: boolean | null
          email_on_task_reminder: boolean | null
          email_on_trial_ending: boolean | null
          id: string
          notification_email: string | null
          organization_id: string
          sms_enabled: boolean | null
          sms_on_task_reminder: boolean | null
          sms_phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          email_on_member_joined?: boolean | null
          email_on_mention?: boolean | null
          email_on_payment_failed?: boolean | null
          email_on_payment_success?: boolean | null
          email_on_proposal_rejected?: boolean | null
          email_on_proposal_submitted?: boolean | null
          email_on_proposal_won?: boolean | null
          email_on_reminder_due?: boolean | null
          email_on_seat_count_changed?: boolean | null
          email_on_signature_sent?: boolean | null
          email_on_signature_signed?: boolean | null
          email_on_signature_viewed?: boolean | null
          email_on_subscription_activated?: boolean | null
          email_on_subscription_canceled?: boolean | null
          email_on_subscription_renewed?: boolean | null
          email_on_task_assigned?: boolean | null
          email_on_task_due?: boolean | null
          email_on_task_reminder?: boolean | null
          email_on_trial_ending?: boolean | null
          id?: string
          notification_email?: string | null
          organization_id: string
          sms_enabled?: boolean | null
          sms_on_task_reminder?: boolean | null
          sms_phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          email_on_member_joined?: boolean | null
          email_on_mention?: boolean | null
          email_on_payment_failed?: boolean | null
          email_on_payment_success?: boolean | null
          email_on_proposal_rejected?: boolean | null
          email_on_proposal_submitted?: boolean | null
          email_on_proposal_won?: boolean | null
          email_on_reminder_due?: boolean | null
          email_on_seat_count_changed?: boolean | null
          email_on_signature_sent?: boolean | null
          email_on_signature_signed?: boolean | null
          email_on_signature_viewed?: boolean | null
          email_on_subscription_activated?: boolean | null
          email_on_subscription_canceled?: boolean | null
          email_on_subscription_renewed?: boolean | null
          email_on_task_assigned?: boolean | null
          email_on_task_due?: boolean | null
          email_on_task_reminder?: boolean | null
          email_on_trial_ending?: boolean | null
          id?: string
          notification_email?: string | null
          organization_id?: string
          sms_enabled?: boolean | null
          sms_on_task_reminder?: boolean | null
          sms_phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_retry_queue: {
        Row: {
          body_html: string
          body_text: string | null
          channel: string | null
          created_at: string | null
          error_message: string | null
          id: string
          last_error: string | null
          metadata: Json | null
          next_retry_at: string | null
          notification_type: string
          organization_id: string
          retry_count: number | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          subject: string
          user_id: string
        }
        Insert: {
          body_html: string
          body_text?: string | null
          channel?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_error?: string | null
          metadata?: Json | null
          next_retry_at?: string | null
          notification_type: string
          organization_id: string
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          user_id: string
        }
        Update: {
          body_html?: string
          body_text?: string | null
          channel?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_error?: string | null
          metadata?: Json | null
          next_retry_at?: string | null
          notification_type?: string
          organization_id?: string
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_notification_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          metadata: Json | null
          organization_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          metadata?: Json | null
          organization_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          metadata?: Json | null
          organization_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unverified_profiles_to_cleanup"
            referencedColumns: ["id"]
          },
        ]
      }
      order_line_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          notes: string | null
          occurred_at: string
          order_line_id: string
          organization_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          notes?: string | null
          occurred_at?: string
          order_line_id: string
          organization_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          order_line_id?: string
          organization_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_line_events_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "order_line_fulfillment"
            referencedColumns: ["order_line_id"]
          },
          {
            foreignKeyName: "order_line_events_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_line_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          area: string | null
          created_at: string
          dealer_discount_percent: number | null
          description: string
          discount_type: string | null
          discount_value: number | null
          fulfillment_type: string | null
          id: string
          is_taxable: boolean
          line_number: number
          list_price: number | null
          manufacturer_name: string | null
          markup_type: string
          markup_value: number
          model_number: string | null
          notes: string | null
          option_string: string | null
          organization_id: string
          pricing_mode: string
          quantity: number
          sales_order_id: string
          sell_price: number
          sell_rule: string | null
          series_name: string | null
          source_line_number: number | null
          source_proposal_line_id: string | null
          spec_phase: string | null
          status: string
          unit_cost: number
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          area?: string | null
          created_at?: string
          dealer_discount_percent?: number | null
          description: string
          discount_type?: string | null
          discount_value?: number | null
          fulfillment_type?: string | null
          id?: string
          is_taxable?: boolean
          line_number: number
          list_price?: number | null
          manufacturer_name?: string | null
          markup_type?: string
          markup_value?: number
          model_number?: string | null
          notes?: string | null
          option_string?: string | null
          organization_id: string
          pricing_mode?: string
          quantity?: number
          sales_order_id: string
          sell_price?: number
          sell_rule?: string | null
          series_name?: string | null
          source_line_number?: number | null
          source_proposal_line_id?: string | null
          spec_phase?: string | null
          status?: string
          unit_cost?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          area?: string | null
          created_at?: string
          dealer_discount_percent?: number | null
          description?: string
          discount_type?: string | null
          discount_value?: number | null
          fulfillment_type?: string | null
          id?: string
          is_taxable?: boolean
          line_number?: number
          list_price?: number | null
          manufacturer_name?: string | null
          markup_type?: string
          markup_value?: number
          model_number?: string | null
          notes?: string | null
          option_string?: string | null
          organization_id?: string
          pricing_mode?: string
          quantity?: number
          sales_order_id?: string
          sell_price?: number
          sell_rule?: string | null
          series_name?: string | null
          source_line_number?: number | null
          source_proposal_line_id?: string | null
          spec_phase?: string | null
          status?: string
          unit_cost?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_creation_log: {
        Row: {
          error_message: string | null
          id: string
          ip_address: string | null
          status: string
          timestamp: string
          user_id: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          ip_address?: string | null
          status: string
          timestamp?: string
          user_id: string
        }
        Update: {
          error_message?: string | null
          id?: string
          ip_address?: string | null
          status?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_creation_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_creation_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unverified_profiles_to_cleanup"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          company_address: string | null
          created_at: string
          fax_number: string | null
          found_via: string | null
          has_used_trial: boolean | null
          id: string
          industry: string | null
          logo_data: Json | null
          name: string
          numbering_config: Json | null
          org_prefix: string
          payment_settings: Json | null
          phone_number: string | null
          primary_storage_provider: string | null
          quote_start_number: string | null
          require_proposal_approval: boolean | null
          signing_reminder_defaults: Json | null
          sync_to_all_storage_providers: boolean | null
          updated_at: string
          website: string | null
        }
        Insert: {
          company_address?: string | null
          created_at?: string
          fax_number?: string | null
          found_via?: string | null
          has_used_trial?: boolean | null
          id?: string
          industry?: string | null
          logo_data?: Json | null
          name: string
          numbering_config?: Json | null
          org_prefix?: string
          payment_settings?: Json | null
          phone_number?: string | null
          primary_storage_provider?: string | null
          quote_start_number?: string | null
          require_proposal_approval?: boolean | null
          signing_reminder_defaults?: Json | null
          sync_to_all_storage_providers?: boolean | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          company_address?: string | null
          created_at?: string
          fax_number?: string | null
          found_via?: string | null
          has_used_trial?: boolean | null
          id?: string
          industry?: string | null
          logo_data?: Json | null
          name?: string
          numbering_config?: Json | null
          org_prefix?: string
          payment_settings?: Json | null
          phone_number?: string | null
          primary_storage_provider?: string | null
          quote_start_number?: string | null
          require_proposal_approval?: boolean | null
          signing_reminder_defaults?: Json | null
          sync_to_all_storage_providers?: boolean | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      password_reset_audit: {
        Row: {
          completed_at: string | null
          email: string
          id: string
          ip_address: string | null
          requested_at: string | null
          success: boolean | null
          user_agent: string | null
        }
        Insert: {
          completed_at?: string | null
          email: string
          id?: string
          ip_address?: string | null
          requested_at?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Update: {
          completed_at?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          requested_at?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      payment_jobs: {
        Row: {
          billing_email: string | null
          contract_total: number
          created_at: string
          id: string
          name: string
          organization_id: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          billing_email?: string | null
          contract_total?: number
          created_at?: string
          id?: string
          name?: string
          organization_id: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          billing_email?: string | null
          contract_total?: number
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      po_lines: {
        Row: {
          acked_quantity: number | null
          acked_ship_date: string | null
          acked_unit_cost: number | null
          acknowledged_at: string | null
          cost_variance: number | null
          created_at: string
          dealer_discount_percent: number | null
          id: string
          line_number: number
          list_price: number | null
          notes: string | null
          order_line_id: string
          organization_id: string
          quantity: number
          unit_cost: number
          updated_at: string
          vendor_po_id: string
        }
        Insert: {
          acked_quantity?: number | null
          acked_ship_date?: string | null
          acked_unit_cost?: number | null
          acknowledged_at?: string | null
          cost_variance?: number | null
          created_at?: string
          dealer_discount_percent?: number | null
          id?: string
          line_number: number
          list_price?: number | null
          notes?: string | null
          order_line_id: string
          organization_id: string
          quantity: number
          unit_cost: number
          updated_at?: string
          vendor_po_id: string
        }
        Update: {
          acked_quantity?: number | null
          acked_ship_date?: string | null
          acked_unit_cost?: number | null
          acknowledged_at?: string | null
          cost_variance?: number | null
          created_at?: string
          dealer_discount_percent?: number | null
          id?: string
          line_number?: number
          list_price?: number | null
          notes?: string | null
          order_line_id?: string
          organization_id?: string
          quantity?: number
          unit_cost?: number
          updated_at?: string
          vendor_po_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_lines_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "order_line_fulfillment"
            referencedColumns: ["order_line_id"]
          },
          {
            foreignKeyName: "po_lines_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_lines_vendor_po_id_fkey"
            columns: ["vendor_po_id"]
            isOneToOne: false
            referencedRelation: "vendor_pos"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          amount: number | null
          amount_unit: string | null
          category: string | null
          created_at: string
          created_by: string | null
          display_id: string | null
          id: string
          manufacturer: string | null
          model: string | null
          name: string
          options: Json | null
          organization_id: string
          product_number: number
          product_type: string | null
          series: string | null
          sort_order: number | null
          specifications: Json | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          amount_unit?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          display_id?: string | null
          id?: string
          manufacturer?: string | null
          model?: string | null
          name: string
          options?: Json | null
          organization_id: string
          product_number?: number
          product_type?: string | null
          series?: string | null
          sort_order?: number | null
          specifications?: Json | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          amount_unit?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          display_id?: string | null
          id?: string
          manufacturer?: string | null
          model?: string | null
          name?: string
          options?: Json | null
          organization_id?: string
          product_number?: number
          product_type?: string | null
          series?: string | null
          sort_order?: number | null
          specifications?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "unverified_profiles_to_cleanup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_super_admin: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_super_admin?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_super_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      project_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          organization_id: string
          position: number
          priority: string
          project_id: string | null
          proposal_id: string | null
          reference: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id: string
          position?: number
          priority?: string
          project_id?: string | null
          proposal_id?: string | null
          reference?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string
          position?: number
          priority?: string
          project_id?: string | null
          proposal_id?: string | null
          reference?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "unverified_profiles_to_cleanup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "unverified_profiles_to_cleanup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_needing_ai_attention"
            referencedColumns: ["id"]
          },
        ]
      }
      project_workflow_columns: {
        Row: {
          color: string | null
          column_order: number
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          column_order?: number
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          column_order?: number
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_workflow_columns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          board_order: number | null
          completion_date: string | null
          created_at: string | null
          id: string
          organization_id: string
          priority: string | null
          proposal_id: string | null
          quote_id: string | null
          timeline_milestones: Json | null
          updated_at: string | null
          workflow_status: string
        }
        Insert: {
          board_order?: number | null
          completion_date?: string | null
          created_at?: string | null
          id?: string
          organization_id: string
          priority?: string | null
          proposal_id?: string | null
          quote_id?: string | null
          timeline_milestones?: Json | null
          updated_at?: string | null
          workflow_status?: string
        }
        Update: {
          board_order?: number | null
          completion_date?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string
          priority?: string | null
          proposal_id?: string | null
          quote_id?: string | null
          timeline_milestones?: Json | null
          updated_at?: string | null
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_needing_ai_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_approval_requests: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          proposal_id: string
          request_comment: string | null
          requested_at: string | null
          requested_by: string
          responded_at: string | null
          responded_by: string | null
          response_comment: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          proposal_id: string
          request_comment?: string | null
          requested_at?: string | null
          requested_by: string
          responded_at?: string | null
          responded_by?: string | null
          response_comment?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          proposal_id?: string
          request_comment?: string | null
          requested_at?: string | null
          requested_by?: string
          responded_at?: string | null
          responded_by?: string | null
          response_comment?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_approval_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_approval_requests_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_approval_requests_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_needing_ai_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_approval_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_approval_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "unverified_profiles_to_cleanup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_approval_requests_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_approval_requests_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "unverified_profiles_to_cleanup"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_documents: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          organization_id: string
          proposal_id: string
          storage_path: string
          tab_key: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id: string
          proposal_id: string
          storage_path: string
          tab_key?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          proposal_id?: string
          storage_path?: string
          tab_key?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_documents_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_documents_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_needing_ai_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "unverified_profiles_to_cleanup"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_signatures: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          organization_id: string
          proposal_id: string
          signature_data: string
          signature_font: string | null
          signature_type: string
          signed_at: string | null
          signed_pdf_path: string | null
          signed_pdf_url: string | null
          signer_company: string | null
          signer_email: string
          signer_name: string
          signing_token_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          organization_id: string
          proposal_id: string
          signature_data: string
          signature_font?: string | null
          signature_type: string
          signed_at?: string | null
          signed_pdf_path?: string | null
          signed_pdf_url?: string | null
          signer_company?: string | null
          signer_email: string
          signer_name: string
          signing_token_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          organization_id?: string
          proposal_id?: string
          signature_data?: string
          signature_font?: string | null
          signature_type?: string
          signed_at?: string | null
          signed_pdf_path?: string | null
          signed_pdf_url?: string | null
          signer_company?: string | null
          signer_email?: string
          signer_name?: string
          signing_token_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_signatures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_signatures_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_signatures_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_needing_ai_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_signatures_signing_token_id_fkey"
            columns: ["signing_token_id"]
            isOneToOne: false
            referencedRelation: "proposal_signing_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_signing_activity: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: string | null
          organization_id: string
          proposal_id: string
          signing_token_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          organization_id: string
          proposal_id: string
          signing_token_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          organization_id?: string
          proposal_id?: string
          signing_token_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_signing_activity_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_signing_activity_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_signing_activity_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_needing_ai_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_signing_activity_signing_token_id_fkey"
            columns: ["signing_token_id"]
            isOneToOne: false
            referencedRelation: "proposal_signing_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_signing_tokens: {
        Row: {
          access_token: string
          client_company: string | null
          client_email: string
          client_name: string | null
          created_at: string | null
          expires_at: string | null
          first_viewed_at: string | null
          id: string
          last_reminder_sent_at: string | null
          last_viewed_at: string | null
          organization_id: string
          proposal_id: string
          reminder_config: Json | null
          reminder_count: number | null
          sent_at: string | null
          sent_by: string | null
          signature_fallback_mode: string | null
          signature_positions: Json | null
          signed_at: string | null
          status: string
          unsigned_pdf_hash: string | null
          unsigned_pdf_path: string | null
          unsigned_pdf_url: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string
          client_company?: string | null
          client_email: string
          client_name?: string | null
          created_at?: string | null
          expires_at?: string | null
          first_viewed_at?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          last_viewed_at?: string | null
          organization_id: string
          proposal_id: string
          reminder_config?: Json | null
          reminder_count?: number | null
          sent_at?: string | null
          sent_by?: string | null
          signature_fallback_mode?: string | null
          signature_positions?: Json | null
          signed_at?: string | null
          status?: string
          unsigned_pdf_hash?: string | null
          unsigned_pdf_path?: string | null
          unsigned_pdf_url?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          client_company?: string | null
          client_email?: string
          client_name?: string | null
          created_at?: string | null
          expires_at?: string | null
          first_viewed_at?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          last_viewed_at?: string | null
          organization_id?: string
          proposal_id?: string
          reminder_config?: Json | null
          reminder_count?: number | null
          sent_at?: string | null
          sent_by?: string | null
          signature_fallback_mode?: string | null
          signature_positions?: Json | null
          signed_at?: string | null
          status?: string
          unsigned_pdf_hash?: string | null
          unsigned_pdf_path?: string | null
          unsigned_pdf_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_signing_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_signing_tokens_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_signing_tokens_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_needing_ai_attention"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_status_transitions: {
        Row: {
          created_at: string
          from_status: string | null
          id: string
          notes: string | null
          organization_id: string
          proposal_id: string
          to_status: string
          transitioned_at: string
          transitioned_by: string | null
        }
        Insert: {
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          proposal_id: string
          to_status: string
          transitioned_at?: string
          transitioned_by?: string | null
        }
        Update: {
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          proposal_id?: string
          to_status?: string
          transitioned_at?: string
          transitioned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_status_transitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          ai_last_analyzed_at: string | null
          ai_pending_suggestions_count: number | null
          archived: boolean | null
          archived_at: string | null
          client_company: string | null
          client_name: string | null
          comments: Json | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          document_type: string | null
          documents_count: number | null
          form_data: Json
          form_id: string | null
          google_doc_id: string | null
          id: string
          is_complete: boolean
          is_main_version: boolean | null
          is_on_board: boolean | null
          job_location: string | null
          organization_id: string | null
          organization_name: string | null
          paid_at: string | null
          project_name: string | null
          proposal_number: string
          proposal_source: string | null
          rejected_at: string | null
          status: string | null
          submitted_at: string | null
          total_value: number | null
          updated_at: string | null
          won_at: string | null
        }
        Insert: {
          ai_last_analyzed_at?: string | null
          ai_pending_suggestions_count?: number | null
          archived?: boolean | null
          archived_at?: string | null
          client_company?: string | null
          client_name?: string | null
          comments?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          document_type?: string | null
          documents_count?: number | null
          form_data?: Json
          form_id?: string | null
          google_doc_id?: string | null
          id?: string
          is_complete?: boolean
          is_main_version?: boolean | null
          is_on_board?: boolean | null
          job_location?: string | null
          organization_id?: string | null
          organization_name?: string | null
          paid_at?: string | null
          project_name?: string | null
          proposal_number: string
          proposal_source?: string | null
          rejected_at?: string | null
          status?: string | null
          submitted_at?: string | null
          total_value?: number | null
          updated_at?: string | null
          won_at?: string | null
        }
        Update: {
          ai_last_analyzed_at?: string | null
          ai_pending_suggestions_count?: number | null
          archived?: boolean | null
          archived_at?: string | null
          client_company?: string | null
          client_name?: string | null
          comments?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          document_type?: string | null
          documents_count?: number | null
          form_data?: Json
          form_id?: string | null
          google_doc_id?: string | null
          id?: string
          is_complete?: boolean
          is_main_version?: boolean | null
          is_on_board?: boolean | null
          job_location?: string | null
          organization_id?: string | null
          organization_name?: string | null
          paid_at?: string | null
          project_name?: string | null
          proposal_number?: string
          proposal_source?: string | null
          rejected_at?: string | null
          status?: string | null
          submitted_at?: string | null
          total_value?: number | null
          updated_at?: string | null
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "unverified_profiles_to_cleanup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_desktop_connections: {
        Row: {
          company_file_name: string | null
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          organization_id: string
          password_hash: string
          qb_edition: string | null
          qb_version: string | null
          sync_frequency_minutes: number
          updated_at: string
          username: string
          web_connector_version: string | null
        }
        Insert: {
          company_file_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          organization_id: string
          password_hash: string
          qb_edition?: string | null
          qb_version?: string | null
          sync_frequency_minutes?: number
          updated_at?: string
          username: string
          web_connector_version?: string | null
        }
        Update: {
          company_file_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          organization_id?: string
          password_hash?: string
          qb_edition?: string | null
          qb_version?: string | null
          sync_frequency_minutes?: number
          updated_at?: string
          username?: string
          web_connector_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_desktop_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_desktop_invoice_sync: {
        Row: {
          billing_phase_id: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          organization_id: string
          proposal_id: string
          qb_edit_sequence: string | null
          qb_invoice_number: string | null
          qb_txn_id: string | null
          sync_error: string | null
          sync_status: string
          updated_at: string
        }
        Insert: {
          billing_phase_id?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          organization_id: string
          proposal_id: string
          qb_edit_sequence?: string | null
          qb_invoice_number?: string | null
          qb_txn_id?: string | null
          sync_error?: string | null
          sync_status?: string
          updated_at?: string
        }
        Update: {
          billing_phase_id?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          organization_id?: string
          proposal_id?: string
          qb_edit_sequence?: string | null
          qb_invoice_number?: string | null
          qb_txn_id?: string | null
          sync_error?: string | null
          sync_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_desktop_invoice_sync_billing_phase_id_fkey"
            columns: ["billing_phase_id"]
            isOneToOne: false
            referencedRelation: "billing_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quickbooks_desktop_invoice_sync_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quickbooks_desktop_invoice_sync_quote_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quickbooks_desktop_invoice_sync_quote_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_needing_ai_attention"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_desktop_session_logs: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          session_ended_at: string | null
          session_ticket: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          session_ended_at?: string | null
          session_ticket: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          session_ended_at?: string | null
          session_ticket?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_desktop_session_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_request_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          max_attempts: number
          organization_id: string
          priority: number
          processed_at: string | null
          qbxml_request: string
          qbxml_response: string | null
          queue_status: string
          request_type: string
          source_record_id: string | null
          source_record_type: string | null
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          max_attempts?: number
          organization_id: string
          priority?: number
          processed_at?: string | null
          qbxml_request: string
          qbxml_response?: string | null
          queue_status?: string
          request_type: string
          source_record_id?: string | null
          source_record_type?: string | null
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          max_attempts?: number
          organization_id?: string
          priority?: number
          processed_at?: string | null
          qbxml_request?: string
          qbxml_response?: string | null
          queue_status?: string
          request_type?: string
          source_record_id?: string | null
          source_record_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_request_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          archived: boolean
          created_at: string
          created_by: string
          created_by_name: string | null
          customization: Json | null
          date_last_downloaded: string | null
          delivery_details: Json
          document_version: number
          id: string
          is_main_version: boolean
          is_on_board: boolean | null
          job_details: Json
          labor_details: Json
          margin_percentage: string | null
          organization_id: string
          organization_name: string | null
          price_details: Json
          project_name: string | null
          proposal_number: string
          quote_details: Json
          quote_source: string | null
          rejected_at: string | null
          status: string
          submitted_at: string | null
          subtotal: string | null
          template_type: string | null
          total_value: number | null
          updated_at: string
          wall_details: Json
          won_at: string | null
        }
        Insert: {
          archived?: boolean
          created_at?: string
          created_by: string
          created_by_name?: string | null
          customization?: Json | null
          date_last_downloaded?: string | null
          delivery_details?: Json
          document_version?: number
          id?: string
          is_main_version?: boolean
          is_on_board?: boolean | null
          job_details?: Json
          labor_details?: Json
          margin_percentage?: string | null
          organization_id: string
          organization_name?: string | null
          price_details?: Json
          project_name?: string | null
          proposal_number: string
          quote_details?: Json
          quote_source?: string | null
          rejected_at?: string | null
          status?: string
          submitted_at?: string | null
          subtotal?: string | null
          template_type?: string | null
          total_value?: number | null
          updated_at?: string
          wall_details?: Json
          won_at?: string | null
        }
        Update: {
          archived?: boolean
          created_at?: string
          created_by?: string
          created_by_name?: string | null
          customization?: Json | null
          date_last_downloaded?: string | null
          delivery_details?: Json
          document_version?: number
          id?: string
          is_main_version?: boolean
          is_on_board?: boolean | null
          job_details?: Json
          labor_details?: Json
          margin_percentage?: string | null
          organization_id?: string
          organization_name?: string | null
          price_details?: Json
          project_name?: string | null
          proposal_number?: string
          quote_details?: Json
          quote_source?: string | null
          rejected_at?: string | null
          status?: string
          submitted_at?: string | null
          subtotal?: string | null
          template_type?: string | null
          total_value?: number | null
          updated_at?: string
          wall_details?: Json
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "unverified_profiles_to_cleanup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          company_id: string | null
          contract_vehicle: string | null
          created_at: string
          created_by: string | null
          customer_po_number: string | null
          id: string
          notes: string | null
          order_number: string | null
          organization_id: string
          project_id: string
          proposal_id: string | null
          requested_delivery_date: string | null
          ship_to_address_line1: string | null
          ship_to_address_line2: string | null
          ship_to_city: string | null
          ship_to_country: string | null
          ship_to_name: string | null
          ship_to_postal_code: string | null
          ship_to_state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          contract_vehicle?: string | null
          created_at?: string
          created_by?: string | null
          customer_po_number?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          organization_id: string
          project_id: string
          proposal_id?: string | null
          requested_delivery_date?: string | null
          ship_to_address_line1?: string | null
          ship_to_address_line2?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_name?: string | null
          ship_to_postal_code?: string | null
          ship_to_state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          contract_vehicle?: string | null
          created_at?: string
          created_by?: string | null
          customer_po_number?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          organization_id?: string
          project_id?: string
          proposal_id?: string | null
          requested_delivery_date?: string | null
          ship_to_address_line1?: string | null
          ship_to_address_line2?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_name?: string | null
          ship_to_postal_code?: string | null
          ship_to_state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals_needing_ai_attention"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_notifications: {
        Row: {
          created_at: string | null
          created_by: string | null
          entity_id: string
          entity_type: string
          failure_reason: string | null
          id: string
          last_sent_at: string | null
          link: string | null
          message: string | null
          metadata: Json | null
          notification_type: string
          organization_id: string
          recurrence: string | null
          recurrence_end_date: string | null
          scheduled_for: string
          sent_at: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          entity_id: string
          entity_type: string
          failure_reason?: string | null
          id?: string
          last_sent_at?: string | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          notification_type?: string
          organization_id: string
          recurrence?: string | null
          recurrence_end_date?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          failure_reason?: string | null
          id?: string
          last_sent_at?: string | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          notification_type?: string
          organization_id?: string
          recurrence?: string | null
          recurrence_end_date?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          organization_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      signup_invites: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          email: string
          email_error: string | null
          email_sent_at: string | null
          expires_at: string
          id: string
          is_used: boolean
          revoked_at: string | null
          revoked_by_user_id: string | null
          token: string
          updated_at: string
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          email: string
          email_error?: string | null
          email_sent_at?: string | null
          expires_at: string
          id?: string
          is_used?: boolean
          revoked_at?: string | null
          revoked_by_user_id?: string | null
          token: string
          updated_at?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          email?: string
          email_error?: string | null
          email_sent_at?: string | null
          expires_at?: string
          id?: string
          is_used?: boolean
          revoked_at?: string | null
          revoked_by_user_id?: string | null
          token?: string
          updated_at?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          event_type: string
          id: string
          processed_at: string | null
          stripe_event_id: string
        }
        Insert: {
          event_type: string
          id?: string
          processed_at?: string | null
          stripe_event_id: string
        }
        Update: {
          event_type?: string
          id?: string
          processed_at?: string | null
          stripe_event_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          features: Json | null
          id: string
          is_active: boolean | null
          max_users: number | null
          min_users: number | null
          name: string
          price_per_month: number
          price_per_yearly: number | null
          sort_order: number | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          stripe_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_users?: number | null
          min_users?: number | null
          name: string
          price_per_month?: number
          price_per_yearly?: number | null
          sort_order?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_users?: number | null
          min_users?: number | null
          name?: string
          price_per_month?: number
          price_per_yearly?: number | null
          sort_order?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_seat_usage_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          new_seat_count: number
          previous_seat_count: number
          subscription_id: string
          triggered_by_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          new_seat_count: number
          previous_seat_count: number
          subscription_id: string
          triggered_by_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          new_seat_count?: number
          previous_seat_count?: number
          subscription_id?: string
          triggered_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_seat_usage_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_seat_usage_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions_pending_sync"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          access_blocked: boolean | null
          access_blocked_reason: string | null
          billing_interval: string | null
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          grace_period_end: string | null
          has_payment_method: boolean | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          number_of_active_users: number | null
          organization_id: string
          pause_at_period_end: boolean | null
          plan_id: string
          stripe_customer_id: string | null
          stripe_quantity_pending_sync: boolean | null
          stripe_subscription_id: string | null
          stripe_subscription_status: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
        }
        Insert: {
          access_blocked?: boolean | null
          access_blocked_reason?: string | null
          billing_interval?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_end?: string | null
          has_payment_method?: boolean | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          number_of_active_users?: number | null
          organization_id: string
          pause_at_period_end?: boolean | null
          plan_id: string
          stripe_customer_id?: string | null
          stripe_quantity_pending_sync?: boolean | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Update: {
          access_blocked?: boolean | null
          access_blocked_reason?: string | null
          billing_interval?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_end?: string | null
          has_payment_method?: boolean | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          number_of_active_users?: number | null
          organization_id?: string
          pause_at_period_end?: boolean | null
          plan_id?: string
          stripe_customer_id?: string | null
          stripe_quantity_pending_sync?: boolean | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          organization_id: string
          task_id: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
          organization_id: string
          task_id: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          attachment_type: string
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          organization_id: string
          task_id: string
          user_id: string
        }
        Insert: {
          attachment_type?: string
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          organization_id: string
          task_id: string
          user_id: string
        }
        Update: {
          attachment_type?: string
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          organization_id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_board_columns: {
        Row: {
          color: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          organization_id: string
          position: number
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
          position?: number
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_board_columns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_edited: boolean | null
          mentions: string[] | null
          organization_id: string
          parent_id: string | null
          task_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          mentions?: string[] | null
          organization_id: string
          parent_id?: string | null
          task_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          mentions?: string[] | null
          organization_id?: string
          parent_id?: string | null
          task_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "task_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_onboarding_progress: {
        Row: {
          completed_steps: string[] | null
          created_at: string | null
          current_step: string
          expires_at: string | null
          id: string
          session_data: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_steps?: string[] | null
          created_at?: string | null
          current_step: string
          expires_at?: string | null
          id?: string
          session_data?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_steps?: string[] | null
          created_at?: string | null
          current_step?: string
          expires_at?: string | null
          id?: string
          session_data?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      vendor_discounts: {
        Row: {
          contract_vehicle: string | null
          created_at: string
          created_by: string | null
          discount_percent: number
          effective_from: string | null
          effective_to: string | null
          id: string
          notes: string | null
          organization_id: string
          series_name: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          contract_vehicle?: string | null
          created_at?: string
          created_by?: string | null
          discount_percent: number
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          series_name?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          contract_vehicle?: string | null
          created_at?: string
          created_by?: string | null
          discount_percent?: number
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          series_name?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_discounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_discounts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_pos: {
        Row: {
          acknowledged_at: string | null
          acknowledged_ship_date: string | null
          created_at: string
          created_by: string | null
          freight_terms: string | null
          id: string
          notes: string | null
          organization_id: string
          payment_terms: string | null
          po_number: string | null
          requested_ship_date: string | null
          sales_order_id: string
          sent_at: string | null
          sent_by: string | null
          sent_to_email: string | null
          ship_to_address_line1: string | null
          ship_to_address_line2: string | null
          ship_to_city: string | null
          ship_to_country: string | null
          ship_to_name: string | null
          ship_to_postal_code: string | null
          ship_to_state: string | null
          status: string
          updated_at: string
          vendor_ack_number: string | null
          vendor_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_ship_date?: string | null
          created_at?: string
          created_by?: string | null
          freight_terms?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          payment_terms?: string | null
          po_number?: string | null
          requested_ship_date?: string | null
          sales_order_id: string
          sent_at?: string | null
          sent_by?: string | null
          sent_to_email?: string | null
          ship_to_address_line1?: string | null
          ship_to_address_line2?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_name?: string | null
          ship_to_postal_code?: string | null
          ship_to_state?: string | null
          status?: string
          updated_at?: string
          vendor_ack_number?: string | null
          vendor_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_ship_date?: string | null
          created_at?: string
          created_by?: string | null
          freight_terms?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          payment_terms?: string | null
          po_number?: string | null
          requested_ship_date?: string | null
          sales_order_id?: string
          sent_at?: string | null
          sent_by?: string | null
          sent_to_email?: string | null
          ship_to_address_line1?: string | null
          ship_to_address_line2?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_name?: string | null
          ship_to_postal_code?: string | null
          ship_to_state?: string | null
          status?: string
          updated_at?: string
          vendor_ack_number?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_pos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_pos_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_pos_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          account_number: string | null
          acknowledgment_email: string | null
          created_at: string
          created_by: string | null
          external_accounting_id: string | null
          freight_terms: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          order_email: string | null
          order_method: string
          organization_id: string
          payment_terms: string | null
          phone: string | null
          portal_url: string | null
          remit_to_address_line1: string | null
          remit_to_address_line2: string | null
          remit_to_city: string | null
          remit_to_country: string | null
          remit_to_name: string | null
          remit_to_postal_code: string | null
          remit_to_state: string | null
          rep_email: string | null
          rep_name: string | null
          rep_phone: string | null
          standard_lead_time_days: number | null
          updated_at: string
          vendor_type: string
        }
        Insert: {
          account_number?: string | null
          acknowledgment_email?: string | null
          created_at?: string
          created_by?: string | null
          external_accounting_id?: string | null
          freight_terms?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          order_email?: string | null
          order_method?: string
          organization_id: string
          payment_terms?: string | null
          phone?: string | null
          portal_url?: string | null
          remit_to_address_line1?: string | null
          remit_to_address_line2?: string | null
          remit_to_city?: string | null
          remit_to_country?: string | null
          remit_to_name?: string | null
          remit_to_postal_code?: string | null
          remit_to_state?: string | null
          rep_email?: string | null
          rep_name?: string | null
          rep_phone?: string | null
          standard_lead_time_days?: number | null
          updated_at?: string
          vendor_type?: string
        }
        Update: {
          account_number?: string | null
          acknowledgment_email?: string | null
          created_at?: string
          created_by?: string | null
          external_accounting_id?: string | null
          freight_terms?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          order_email?: string | null
          order_method?: string
          organization_id?: string
          payment_terms?: string | null
          phone?: string | null
          portal_url?: string | null
          remit_to_address_line1?: string | null
          remit_to_address_line2?: string | null
          remit_to_city?: string | null
          remit_to_country?: string | null
          remit_to_name?: string | null
          remit_to_postal_code?: string | null
          remit_to_state?: string | null
          rep_email?: string | null
          rep_name?: string | null
          rep_phone?: string | null
          standard_lead_time_days?: number | null
          updated_at?: string
          vendor_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_lines: {
        Row: {
          completed_quantity: number | null
          created_at: string
          id: string
          notes: string | null
          order_line_id: string
          organization_id: string
          quantity: number
          updated_at: string
          work_order_id: string
        }
        Insert: {
          completed_quantity?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          order_line_id: string
          organization_id: string
          quantity: number
          updated_at?: string
          work_order_id: string
        }
        Update: {
          completed_quantity?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          order_line_id?: string
          organization_id?: string
          quantity?: number
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_lines_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "order_line_fulfillment"
            referencedColumns: ["order_line_id"]
          },
          {
            foreignKeyName: "work_order_lines_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_lines_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_schedule"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "work_order_lines_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          access_notes: string | null
          actual_end: string | null
          actual_start: string | null
          created_at: string
          created_by: string | null
          crew_id: string | null
          id: string
          notes: string | null
          organization_id: string
          project_id: string
          sales_order_id: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          site_address_line1: string | null
          site_address_line2: string | null
          site_city: string | null
          site_contact_name: string | null
          site_contact_phone: string | null
          site_name: string | null
          site_postal_code: string | null
          site_state: string | null
          status: string
          subcontractor_vendor_id: string | null
          updated_at: string
          work_order_number: string | null
          work_type: string
        }
        Insert: {
          access_notes?: string | null
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          created_by?: string | null
          crew_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          project_id: string
          sales_order_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          site_address_line1?: string | null
          site_address_line2?: string | null
          site_city?: string | null
          site_contact_name?: string | null
          site_contact_phone?: string | null
          site_name?: string | null
          site_postal_code?: string | null
          site_state?: string | null
          status?: string
          subcontractor_vendor_id?: string | null
          updated_at?: string
          work_order_number?: string | null
          work_type?: string
        }
        Update: {
          access_notes?: string | null
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          created_by?: string | null
          crew_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          project_id?: string
          sales_order_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          site_address_line1?: string | null
          site_address_line2?: string | null
          site_city?: string | null
          site_contact_name?: string | null
          site_contact_phone?: string | null
          site_name?: string | null
          site_postal_code?: string | null
          site_state?: string | null
          status?: string
          subcontractor_vendor_id?: string | null
          updated_at?: string
          work_order_number?: string | null
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_subcontractor_vendor_id_fkey"
            columns: ["subcontractor_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ai_feedback_analytics: {
        Row: {
          avg_rating: number | null
          context_type: string | null
          corrections_count: number | null
          count: number | null
          feedback_date: string | null
          feedback_type: string | null
          helpful_count: number | null
          incorrect_count: number | null
          not_helpful_count: number | null
          organization_id: string | null
          rating: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_user_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_line_fulfillment: {
        Row: {
          order_line_id: string | null
          organization_id: string | null
          qty_acknowledged: number | null
          qty_installed: number | null
          qty_invoiced: number | null
          qty_ordered: number | null
          qty_received: number | null
          qty_shipped: number | null
          qty_to_order: number | null
          quantity_ordered_total: number | null
          sales_order_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      po_line_variance: {
        Row: {
          acked_quantity: number | null
          acked_ship_date: string | null
          acked_unit_cost: number | null
          acknowledged_at: string | null
          cost_variance: number | null
          description: string | null
          model_number: string | null
          order_line_id: string | null
          ordered_quantity: number | null
          ordered_unit_cost: number | null
          organization_id: string | null
          po_line_id: string | null
          po_number: string | null
          requested_ship_date: string | null
          sales_order_id: string | null
          ship_date_slip_days: number | null
          variance_status: string | null
          vendor_id: string | null
          vendor_po_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "po_lines_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "order_line_fulfillment"
            referencedColumns: ["order_line_id"]
          },
          {
            foreignKeyName: "po_lines_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_lines_vendor_po_id_fkey"
            columns: ["vendor_po_id"]
            isOneToOne: false
            referencedRelation: "vendor_pos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_pos_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_pos_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals_needing_ai_attention: {
        Row: {
          ai_last_analyzed_at: string | null
          ai_pending_suggestions_count: number | null
          client_name: string | null
          created_at: string | null
          days_since_submission: number | null
          days_since_update: number | null
          id: string | null
          needs_analysis: boolean | null
          organization_id: string | null
          project_name: string | null
          proposal_number: string | null
          status: string | null
          total_value: number | null
          updated_at: string | null
        }
        Insert: {
          ai_last_analyzed_at?: string | null
          ai_pending_suggestions_count?: number | null
          client_name?: string | null
          created_at?: string | null
          days_since_submission?: never
          days_since_update?: never
          id?: string | null
          needs_analysis?: never
          organization_id?: string | null
          project_name?: string | null
          proposal_number?: string | null
          status?: string | null
          total_value?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_last_analyzed_at?: string | null
          ai_pending_suggestions_count?: number | null
          client_name?: string | null
          created_at?: string | null
          days_since_submission?: never
          days_since_update?: never
          id?: string | null
          needs_analysis?: never
          organization_id?: string | null
          project_name?: string | null
          proposal_number?: string | null
          status?: string | null
          total_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_routines: {
        Row: {
          routine_name: unknown
          routine_type: string | null
        }
        Relationships: []
      }
      security_query_stats: {
        Row: {
          calls: number | null
          query: string | null
          risk_level: string | null
          rows: number | null
          total_exec_time: number | null
        }
        Relationships: []
      }
      subscriptions_pending_sync: {
        Row: {
          id: string | null
          local_quantity: number | null
          organization_id: string | null
          stripe_quantity_pending_sync: boolean | null
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string | null
          local_quantity?: number | null
          organization_id?: string | null
          stripe_quantity_pending_sync?: boolean | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          local_quantity?: number | null
          organization_id?: string | null
          stripe_quantity_pending_sync?: boolean | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      unverified_profiles_to_cleanup: {
        Row: {
          created_at: string | null
          email: string | null
          email_confirmed_at: string | null
          full_name: string | null
          hours_old: number | null
          id: string | null
          status: string | null
        }
        Relationships: []
      }
      work_order_schedule: {
        Row: {
          access_notes: string | null
          crew_hours: number | null
          crew_id: string | null
          crew_name: string | null
          crew_size: number | null
          line_count: number | null
          organization_id: string | null
          project_id: string | null
          sales_order_id: string | null
          scheduled_end: string | null
          scheduled_hours: number | null
          scheduled_start: string | null
          site_city: string | null
          site_name: string | null
          site_state: string | null
          status: string | null
          subcontractor_name: string | null
          subcontractor_vendor_id: string | null
          work_order_id: string | null
          work_order_number: string | null
          work_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_subcontractor_vendor_id_fkey"
            columns: ["subcontractor_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_member: { Args: { member_id: string }; Returns: boolean }
      attempt_org_creation: {
        Args: { p_ip: string; p_profile_id: string }
        Returns: string
      }
      auto_join_pending_invite: {
        Args: { p_user_email: string; p_user_id: string }
        Returns: Json
      }
      block_access: {
        Args: { org_id: string; reason: string }
        Returns: undefined
      }
      can_view_cost: {
        Args: { check_org_id: string; check_user_id: string }
        Returns: boolean
      }
      can_view_membership: {
        Args: {
          check_user_id: string
          membership_org_id: string
          membership_user_id: string
        }
        Returns: boolean
      }
      cancel_scheduled_notification: {
        Args: { p_entity_id: string; p_entity_type: string; p_user_id?: string }
        Returns: number
      }
      check_auth_rate_limit: {
        Args: {
          p_attempt_type: string
          p_block_duration_minutes?: number
          p_identifier: string
          p_identifier_type: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: Json
      }
      check_due_notifications: {
        Args: never
        Returns: {
          link: string
          message: string
          metadata: Json
          notification_type: string
          organization_id: string
          scheduled_notification_id: string
          title: string
          user_id: string
        }[]
      }
      check_invite_rate_limit: {
        Args: {
          p_invite_token?: string
          p_ip_address: unknown
          p_max_attempts?: number
          p_user_id?: string
          p_window_minutes?: number
        }
        Returns: {
          allowed: boolean
          attempts_used: number
          reason: string
          window_reset_at: string
        }[]
      }
      check_login_rate_limit: { Args: { p_email: string }; Returns: Json }
      check_org_creation_rate_limit: {
        Args: { p_ip_address?: unknown; p_user_id: string }
        Returns: {
          allowed: boolean
          ip_attempts_used: number
          ip_reset_at: string
          reason: string
          user_attempts_used: number
          user_reset_at: string
        }[]
      }
      check_otp_rate_limit: { Args: { p_email: string }; Returns: Json }
      check_project_linked_to_main_version_and_won: {
        Args: { p_proposal_id: string; p_quote_id: string }
        Returns: boolean
      }
      check_proposal_is_main_version_and_won: {
        Args: { proposal_id_param: string }
        Returns: boolean
      }
      cleanup_all_expired_data: { Args: never; Returns: Json }
      cleanup_all_rate_limiting_logs: { Args: never; Returns: Json }
      cleanup_auth_rate_limits: { Args: never; Returns: number }
      cleanup_expired_onboarding: { Args: never; Returns: undefined }
      cleanup_expired_rate_limits: { Args: never; Returns: number }
      cleanup_invite_token_attempts: { Args: never; Returns: number }
      cleanup_invite_tokens: { Args: never; Returns: number }
      cleanup_old_invite_attempts: {
        Args: { p_days_to_keep?: number }
        Returns: number
      }
      cleanup_old_qb_requests: { Args: never; Returns: undefined }
      cleanup_org_rate_limits: { Args: never; Returns: undefined }
      cleanup_organization_creation_log: { Args: never; Returns: number }
      cleanup_signup_invites: { Args: never; Returns: number }
      cleanup_unverified_profiles: { Args: never; Returns: undefined }
      clear_auth_rate_limit: {
        Args: { p_attempt_type: string; p_email: string }
        Returns: undefined
      }
      complete_work_order: {
        Args: { p_completions?: Json; p_work_order_id: string }
        Returns: undefined
      }
      create_default_task_columns: {
        Args: { org_id: string }
        Returns: undefined
      }
      create_default_workflow_columns: {
        Args: { org_id: string }
        Returns: undefined
      }
      create_org_with_owner: {
        Args: {
          found_via?: string
          industry?: string
          org_name: string
          org_prefix?: string
          owner_id?: string
        }
        Returns: {
          org_id: string
        }[]
      }
      create_sales_order_with_lines: {
        Args: { p_lines: Json; p_order: Json }
        Returns: string
      }
      create_vendor_po_with_lines: {
        Args: { p_lines: Json; p_po: Json }
        Returns: string
      }
      create_work_order_with_lines: {
        Args: { p_lines: Json; p_work_order: Json }
        Returns: string
      }
      email_is_registered: { Args: { p_email: string }; Returns: boolean }
      generate_next_proposal_number: {
        Args: { p_form_id: string; p_starting_number: string }
        Returns: string
      }
      generate_proposal_version: {
        Args: { p_organization_id: string; p_parent_proposal_number: string }
        Returns: string
      }
      generate_task_reference: {
        Args: { org_id: string; task_title: string }
        Returns: string
      }
      get_current_user_organization: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_integrations_for_plan: {
        Args: { plan_name: string }
        Returns: {
          category: string | null
          coming_soon: boolean | null
          created_at: string | null
          description: string | null
          display_order: number | null
          documentation_url: string | null
          estimated_setup_time_minutes: number | null
          id: string
          integration_type: string
          is_beta: boolean | null
          is_enabled: boolean | null
          logo_url: string | null
          name: string
          platform_requirement: string | null
          required_plan: string | null
          setup_difficulty: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "available_integrations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_org_member_ids: {
        Args: { target_user_id: string }
        Returns: {
          user_id: string
        }[]
      }
      get_organization_pending_ai_suggestions: {
        Args: { org_id: string }
        Returns: number
      }
      get_remaining_org_creations: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_org_folders: {
        Args: { check_user_id: string }
        Returns: {
          org_folder: string
        }[]
      }
      get_user_org_ids: {
        Args: { check_user_id: string }
        Returns: {
          organization_id: string
        }[]
      }
      has_org_role: {
        Args: {
          check_org_id: string
          check_user_id: string
          required_roles: string[]
        }
        Returns: boolean
      }
      has_valid_subscription: { Args: { org_id: string }; Returns: boolean }
      invoke_notification_email_edge_function: {
        Args: never
        Returns: undefined
      }
      invoke_signature_reminders_edge_function: {
        Args: never
        Returns: undefined
      }
      is_active_member: {
        Args: { check_org_id: string; check_user_id: string }
        Returns: boolean
      }
      is_org_folder_admin: {
        Args: { check_user_id: string; folder_name: string }
        Returns: boolean
      }
      is_owner_or_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      log_invite_attempt: {
        Args: {
          p_error_message?: string
          p_invite_token: string
          p_ip_address: unknown
          p_success: boolean
          p_user_id: string
        }
        Returns: string
      }
      log_org_creation_attempt: {
        Args: {
          p_error_message?: string
          p_ip_address?: string
          p_status: string
          p_user_id: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          p_details?: Json
          p_event_type: string
          p_organization_id?: string
          p_user_id?: string
        }
        Returns: string
      }
      mark_scheduled_notifications_sent: {
        Args: { notification_ids: string[] }
        Returns: number
      }
      org_has_no_members: { Args: { check_org_id: string }; Returns: boolean }
      process_all_due_notifications: { Args: never; Returns: number }
      process_due_notifications_internal: { Args: never; Returns: number }
      record_auth_attempt: {
        Args: {
          p_attempt_type: string
          p_block_duration_minutes?: number
          p_identifier: string
          p_identifier_type: string
          p_max_attempts?: number
          p_success?: boolean
          p_window_minutes?: number
        }
        Returns: Json
      }
      record_failed_login: { Args: { p_email: string }; Returns: Json }
      record_failed_otp: { Args: { p_email: string }; Returns: Json }
      reject_member: { Args: { member_id: string }; Returns: boolean }
      restore_access: { Args: { org_id: string }; Returns: undefined }
      sanitize_error_message: {
        Args: { p_error_code?: string; p_error_message: string }
        Returns: string
      }
      schedule_notification: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_link?: string
          p_message?: string
          p_metadata?: Json
          p_notification_type?: string
          p_organization_id: string
          p_recurrence?: string
          p_recurrence_end_date?: string
          p_scheduled_for: string
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      secure_rpc: { Args: { p_action: string; p_params?: Json }; Returns: Json }
      transfer_ownership: {
        Args: { p_new_owner_id: string; p_organization_id: string }
        Returns: Json
      }
      update_member_role: {
        Args: { member_id: string; new_role: string }
        Returns: Json
      }
      update_org_creator_profile: {
        Args: {
          org_id?: string
          role_value?: string
          status_value?: string
          user_id: string
        }
        Returns: Json
      }
      update_user_profile: {
        Args: { full_name_value: string; user_id: string }
        Returns: Json
      }
      user_has_admin_role_in_org: { Args: { org_id: string }; Returns: boolean }
      user_has_role_in_org: {
        Args: { org_id: string; required_role: string }
        Returns: boolean
      }
      validate_admin_invite: {
        Args: { token_value: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          is_used: boolean
          organization_name: string
          token: string
        }[]
      }
      validate_invite_token: {
        Args: { token_value: string }
        Returns: {
          created_at: string
          created_by: string
          department: string
          email: string
          expires_at: string
          id: string
          is_used: boolean
          organization_id: string
          revoked_at: string
          role: string
          token: string
          updated_at: string
        }[]
      }
      validate_invite_token_with_error: {
        Args: { token_value: string }
        Returns: {
          created_at: string
          created_by: string
          department: string
          email: string
          error_type: string
          expires_at: string
          id: string
          is_used: boolean
          organization_id: string
          revoked_at: string
          role: string
          token: string
        }[]
      }
      validate_signup_invite: {
        Args: { token_value: string }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          id: string
          is_used: boolean
          token: string
          updated_at: string
        }[]
      }
      validate_storage_upload: {
        Args: {
          p_bucket_id: string
          p_content_type: string
          p_file_name: string
          p_file_size: number
        }
        Returns: Json
      }
    }
    Enums: {
      quote_status:
        | "Incomplete"
        | "Draft"
        | "Pending"
        | "Submitted"
        | "Won"
        | "Rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      quote_status: [
        "Incomplete",
        "Draft",
        "Pending",
        "Submitted",
        "Won",
        "Rejected",
      ],
    },
  },
} as const

