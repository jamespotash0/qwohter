// Updated database types to fix TypeScript errors
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
          follow_up_days?: number;
          created_by?: string;
          status_last_updated?: string;
          date_last_downloaded?: string;
          version: number;
          created_at: string;
          updated_at: string;
          user_id: string;
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
          follow_up_days?: number;
          created_by?: string;
          status_last_updated?: string;
          date_last_downloaded?: string;
          version?: number;
          created_at?: string;
          updated_at?: string;
          user_id: string;
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
          follow_up_days?: number;
          created_by?: string;
          status_last_updated?: string;
          date_last_downloaded?: string;
          version?: number;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          organization_id?: string;
          customization?: any;
        };
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string | null;
          email: string;
          full_name: string | null;
          role: 'admin' | 'member' | null;
          status: 'pending' | 'active' | 'suspended' | null;
          invited_by: string | null;
          joined_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id?: string | null;
          email?: string;
          full_name?: string | null;
          role?: 'admin' | 'member' | null;
          status?: 'pending' | 'active' | 'suspended' | null;
          invited_by?: string | null;
          joined_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          email?: string;
          full_name?: string | null;
          role?: 'admin' | 'member' | null;
          status?: 'pending' | 'active' | 'suspended' | null;
          invited_by?: string | null;
          joined_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          organization_code: string;
          organization_info: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          organization_code?: string;
          organization_info?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          organization_code?: string;
          organization_info?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      approve_member: {
        Args: {
          member_id: string;
        };
        Returns: any;
      };
      reject_member: {
        Args: {
          member_id: string;
        };
        Returns: any;
      };
      update_member_role: {
        Args: {
          member_id: string;
          new_role: string;
        };
        Returns: any;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}