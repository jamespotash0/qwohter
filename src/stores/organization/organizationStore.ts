import { create } from 'zustand';
import { subscribeWithSelector, devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { LogoData } from '@/lib/types/settings/companySettings';

export interface Organization {
  id: string;
  name: string;
  organization_code: string;
  phone_number?: string;
  fax_number?: string;
  company_address?: string;
  website?: string;
  quote_start_number?: string;
  logo_data?: LogoData;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  role: 'Admin' | 'Member';
  status: 'Pending' | 'Active' | 'Suspended';
  joined_at: string;
  email: string;
  full_name?: string;
}

export interface InviteToken {
  id: string;
  token: string;
  email: string;
  organization_id: string;
  organization_code: string;
  role: 'Admin' | 'Member';
  created_by: string;
  expires_at: string;
  created_at: string;
  is_used: boolean;
}

interface OrganizationState {
  // State
  currentOrganization: Organization | null;
  members: OrganizationMember[];
  inviteTokens: InviteToken[];
  currentUserRole: 'Owner' | 'Admin' | 'Member' | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchOrganization: () => Promise<void>;
  fetchMembers: (organizationId: string) => Promise<void>;
  fetchInviteTokens: (organizationId: string) => Promise<void>;
  setOrganization: (organization: Organization | null) => void;
  setMembers: (members: OrganizationMember[]) => void;
  setInviteTokens: (tokens: InviteToken[]) => void;
  setCurrentUserRole: (role: 'Owner' | 'Admin' | 'Member' | null) => void;
  updateOrganization: (updates: Partial<Organization>) => Promise<void>;
  reset: () => void;
}

export const useOrganizationStore = create<OrganizationState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      currentOrganization: null,
      members: [],
      inviteTokens: [],
      currentUserRole: null,
      loading: false,
      error: null,

      // Fetch organization
      fetchOrganization: async () => {
        const { currentOrganization } = get();

        // Skip if already fetched
        if (currentOrganization) {
          console.log('📦 Organization already cached, skipping fetch');
          return;
        }

        try {
          set({ loading: true, error: null });
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) {
            set({ loading: false });
            return;
          }

          const { data: membershipData, error: membershipError } = await supabase
            .from('memberships')
            .select(`
              organization_id,
              role,
              organizations (
                id,
                name,
                organization_code,
                created_at,
                updated_at,
                phone_number,
                fax_number,
                company_address,
                website,
                quote_start_number,
                logo_data
              )
            `)
            .eq('user_id', user.user.id)
            .eq('status', 'Active')
            .single() as any;

          if (membershipError) throw membershipError;

          if (membershipData?.organizations) {
            const org = membershipData.organizations as Organization;
            set({
              currentOrganization: org,
              currentUserRole: membershipData.role as 'Owner' | 'Admin' | 'Member',
              loading: false,
            });

            console.log('✅ Organization fetched and cached:', org.name);
          } else {
            set({ loading: false });
          }
        } catch (error: any) {
          console.error('❌ Failed to fetch organization:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Fetch members
      fetchMembers: async (organizationId: string) => {
        const { members } = get();

        // Skip if already fetched
        if (members.length > 0) {
          console.log('📦 Members already cached, skipping fetch');
          return;
        }

        try {
          const { data: membersData, error: membersError } = await supabase
            .from('memberships')
            .select(`
              id,
              user_id,
              organization_id,
              role,
              status,
              joined_at,
              profile:profiles!user_id(id, email, full_name)
            `)
            .eq('organization_id', organizationId);

          if (membersError) throw membersError;

          const transformedData = (membersData || [])
            .filter((membership: any) => membership?.user_id && membership?.profile)
            .map((membership: any) => ({
              id: membership.user_id,
              organization_id: membership.organization_id || '',
              role: (membership.role as 'Admin' | 'Member') || 'Member',
              status: (membership.status as 'Pending' | 'Active' | 'Suspended') || 'Active',
              joined_at: membership.joined_at || new Date().toISOString(),
              email: membership.profile?.email || '',
              full_name: membership.profile?.full_name || undefined,
            }));

          set({ members: transformedData });
          console.log('✅ Members fetched and cached:', transformedData.length);
        } catch (error: any) {
          console.error('❌ Failed to fetch members:', error);
          set({ error: error.message });
        }
      },

      // Fetch invite tokens
      fetchInviteTokens: async (organizationId: string) => {
        const { inviteTokens } = get();

        // Skip if already fetched
        if (inviteTokens.length > 0) {
          console.log('📦 Invite tokens already cached, skipping fetch');
          return;
        }

        try {
          const { data, error } = await supabase
            .from('invite_tokens')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_used', false);

          if (error) throw error;

          set({ inviteTokens: data || [] });
          console.log('✅ Invite tokens fetched and cached:', data?.length || 0);
        } catch (error: any) {
          console.error('❌ Failed to fetch invite tokens:', error);
          set({ error: error.message });
        }
      },

      // Setters
      setOrganization: (organization) => set({ currentOrganization: organization }),
      setMembers: (members) => set({ members }),
      setInviteTokens: (tokens) => set({ inviteTokens: tokens }),
      setCurrentUserRole: (role) => set({ currentUserRole: role }),

      // Update organization
      updateOrganization: async (updates: Partial<Organization>) => {
        const { currentOrganization } = get();
        if (!currentOrganization) return;

        try {
          const { data, error } = await supabase
            .from('organizations')
            .update(updates)
            .eq('id', currentOrganization.id)
            .select()
            .single();

          if (error) throw error;

          set({ currentOrganization: data as Organization });
          console.log('✅ Organization updated');
        } catch (error: any) {
          console.error('❌ Failed to update organization:', error);
          set({ error: error.message });
        }
      },

      // Reset
      reset: () => {
        set({
          currentOrganization: null,
          members: [],
          inviteTokens: [],
          currentUserRole: null,
          loading: false,
          error: null,
        });
        console.log('🔄 Organization store reset');
      },
    }))
  )
);

// Selectors
export const useCurrentOrganization = () => useOrganizationStore((state) => state.currentOrganization);
export const useOrganizationMembers = () => useOrganizationStore((state) => state.members);
export const useInviteTokens = () => useOrganizationStore((state) => state.inviteTokens);
export const useCurrentUserRole = () => useOrganizationStore((state) => state.currentUserRole);
export const useOrganizationLoading = () => useOrganizationStore((state) => state.loading);
