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
  industry?: string;
  found_via?: string;
  quote_start_number?: string;
  logo_data?: LogoData;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  role: 'Admin' | 'Member' | 'Owner';
  status: 'Pending' | 'Active' | 'Suspended' | 'Inactive';
  joined_at: string;
  email: string;
  full_name?: string;
  join_type?: 'Invited' | 'Requested' | 'Direct';
  department?: string | null;
  user_id: string;
  avatar_url?: string;
}

export interface InviteToken {
  id: string;
  token: string;
  email: string;
  organization_id: string;
  organization_code: string;
  role: 'Admin' | 'Member';
  department?: string | null;
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
  currentUserMembership: {
    joined_at: string;
  } | null;
  loading: boolean;
  error: string | null;
  // Cached subscription status
  subscriptionStatus: {
    hasAccess: boolean;
    reason: string;
    lastChecked: number;
  } | null;

  // Actions
  fetchOrganization: (userId?: string, forceRefresh?: boolean) => Promise<void>;
  fetchMembers: (organizationId: string, forceRefresh?: boolean) => Promise<void>;
  fetchInviteTokens: (organizationId: string) => Promise<void>;
  setOrganization: (organization: Organization | null) => void;
  setMembers: (members: OrganizationMember[]) => void;
  setInviteTokens: (tokens: InviteToken[]) => void;
  setCurrentUserRole: (role: 'Owner' | 'Admin' | 'Member' | null) => void;
  updateOrganization: (updates: Partial<Organization>) => Promise<void>;
  setSubscriptionStatus: (status: { hasAccess: boolean; reason: string }) => void;
  subscribeToMembershipChanges: () => void;
  reset: () => void;
}

export const useOrganizationStore = create<OrganizationState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      currentOrganization: (() => {
        // Restore organization from localStorage on init
        try {
          const cached = localStorage.getItem('org_cached_organization');
          return cached ? JSON.parse(cached) : null;
        } catch {
          return null;
        }
      })(),
      members: [],
      inviteTokens: [],
      currentUserRole: (() => {
        // Restore role from localStorage on init
        try {
          const cached = localStorage.getItem('org_cached_user_role');
          return cached ? (cached as 'Owner' | 'Admin' | 'Member') : null;
        } catch {
          return null;
        }
      })(),
      currentUserMembership: (() => {
        // Restore membership from localStorage on init
        try {
          const cached = localStorage.getItem('org_cached_membership');
          return cached ? JSON.parse(cached) : null;
        } catch {
          return null;
        }
      })(),
      loading: false,
      error: null,
      subscriptionStatus: null,

      // Fetch organization
      fetchOrganization: async (userId?: string, forceRefresh = false) => {
        const { currentOrganization, currentUserRole } = get();

        // Skip if already fetched (unless force refresh or no role cached)
        if (currentOrganization && currentUserRole && !forceRefresh) {
          console.log('✅ Organization and role already cached, skipping fetch');
          return;
        }

        try {
          set({ loading: true, error: null });

          // Use provided userId or fetch from auth
          let currentUserId = userId;
          if (!currentUserId) {
            const { data: user } = await supabase.auth.getUser();
            currentUserId = user.user?.id;
          }

          if (!currentUserId) {
            console.log('⏭️ No user ID, skipping organization fetch');
            set({ loading: false });
            return;
          }

          const { data: membershipData, error: membershipError } = await supabase
            .from('memberships')
            .select(`
              organization_id,
              role,
              joined_at,
              join_type,
              department,
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
                industry,
                found_via,
                quote_start_number,
                logo_data
              )
            `)
            .eq('user_id', currentUserId)
            .eq('status', 'Active')
            .single() as any;

          if (membershipError) throw membershipError;

          if (membershipData?.organizations) {
            const org = membershipData.organizations as Organization;
            const role = membershipData.role as 'Owner' | 'Admin' | 'Member';
            const membership = {
              joined_at: membershipData.joined_at,
            };

            // Cache all organization data in localStorage
            localStorage.setItem('org_cached_organization', JSON.stringify(org));
            localStorage.setItem('org_cached_user_role', role);
            localStorage.setItem('org_cached_membership', JSON.stringify(membership));

            set({
              currentOrganization: org,
              currentUserRole: role,
              currentUserMembership: membership,
              loading: false,
            });

          } else {
            set({ loading: false });
          }
        } catch (error: any) {
          console.error('❌ Failed to fetch organization:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Fetch members
      fetchMembers: async (organizationId: string, forceRefresh = false) => {
        const { members } = get();

        // Skip if already fetched (unless force refresh)
        if (members.length > 0 && !forceRefresh) {
          return;
        }

        try {
          // Fetch memberships first (separate query to avoid join issues)
          // Include all members regardless of status (including Inactive)
          const { data: membersData, error: membersError } = await supabase
            .from('memberships')
            .select('id, user_id, organization_id, role, status, joined_at, join_type, department')
            .eq('organization_id', organizationId);

          if (membersError) throw membersError;

          if (!membersData || membersData.length === 0) {
            set({ members: [] });
            return;
          }

          // Fetch profiles separately for all user_ids
          const userIds = membersData.map((m: any) => m.user_id);
          console.log('🔍 Fetching profiles for user IDs:', userIds);

          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);

          if (profilesError) {
            console.error('❌ Profiles fetch error:', profilesError);
          }

          console.log('📊 Raw profiles data from DB:', profilesData);

          // Create a map of profiles for easy lookup
          const profilesMap = new Map(
            (profilesData || []).map((p: any) => [p.id, p])
          );

          console.log('📋 Profiles Map:', profilesMap);
          console.log('📋 Memberships fetched:', membersData);

          // Combine memberships with profiles
          const transformedData = membersData
            .filter((membership: any) => membership?.user_id)
            .map((membership: any) => {
              const profile = profilesMap.get(membership.user_id);
              console.log(`👤 Member ${membership.user_id}:`, { profile, membership });

              return {
                id: membership.id,  // This is the membership ID (needed for approve/reject)
                user_id: membership.user_id,  // Also include user_id
                organization_id: membership.organization_id || '',
                role: (membership.role as 'Admin' | 'Member' | 'Owner') || 'Member',
                status: (membership.status as 'Pending' | 'Active' | 'Suspended' | 'Inactive') || 'Active',
                joined_at: membership.joined_at || new Date().toISOString(),
                email: profile?.email || undefined,
                full_name: profile?.full_name || undefined,
                join_type: membership.join_type as 'Invited' | 'Requested' | 'Direct' | undefined,
                department: membership.department || null,
              };
            });

          console.log('✅ Transformed members:', transformedData);
          set({ members: transformedData });
        } catch (error: any) {
          const errorMessage = error?.message || JSON.stringify(error) || 'Unknown error';
          console.error('❌ Failed to fetch members:', errorMessage, error);
          set({ error: errorMessage });
        }
      },

      // Fetch invite tokens
      fetchInviteTokens: async (organizationId: string) => {
        const { inviteTokens } = get();

        // Skip if already fetched
        if (inviteTokens.length > 0) {
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
        } catch (error: any) {
          console.error('❌ Failed to fetch invite tokens:', error);
          set({ error: error.message });
        }
      },

      // Setters
      setOrganization: (organization) => {
        if (organization) {
          localStorage.setItem('org_cached_organization', JSON.stringify(organization));
        }
        set({ currentOrganization: organization });
      },
      setMembers: (members) => set({ members }),
      setInviteTokens: (tokens) => set({ inviteTokens: tokens }),
      setCurrentUserRole: (role) => {
        if (role) {
          localStorage.setItem('org_cached_user_role', role);
        }
        set({ currentUserRole: role });
      },

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

          // Update cache with new organization data
          localStorage.setItem('org_cached_organization', JSON.stringify(data));

          set({ currentOrganization: data as Organization });
        } catch (error: any) {
          console.error('❌ Failed to update organization:', error);
          set({ error: error.message });
        }
      },

      // Set subscription status
      setSubscriptionStatus: (status: { hasAccess: boolean; reason: string }) => {
        set({
          subscriptionStatus: {
            ...status,
            lastChecked: Date.now(),
          },
        });
      },

      // Subscribe to real-time membership changes
      subscribeToMembershipChanges: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();

          if (!user?.id) {
            console.log('⏭️ No user yet, skipping membership subscription');
            return () => {}; // Return empty cleanup function
          }

          console.log('🔔 Setting up real-time membership subscription for user:', user.id);

          const channel = supabase
            .channel('membership-changes')
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'memberships',
                filter: `user_id=eq.${user.id}`,
              },
              (payload) => {
                console.log('🔄 Membership role changed:', payload);
                const newRole = payload.new.role as 'Owner' | 'Admin' | 'Member';

                // Update localStorage cache
                localStorage.setItem('org_cached_user_role', newRole);

                set({ currentUserRole: newRole });
              }
            )
            .subscribe();

          // Return cleanup function
          return () => {
            console.log('🧹 Cleaning up membership subscription');
            supabase.removeChannel(channel);
          };
        } catch (error) {
          console.error('❌ Error setting up membership subscription:', error);
          return () => {}; // Return empty cleanup function on error
        }
      },

      // Reset
      reset: () => {
        // Clear all cached organization data
        localStorage.removeItem('org_cached_organization');
        localStorage.removeItem('org_cached_user_role');
        localStorage.removeItem('org_cached_membership');

        set({
          currentOrganization: null,
          members: [],
          inviteTokens: [],
          currentUserRole: null,
          currentUserMembership: null,
          loading: false,
          error: null,
          subscriptionStatus: null,
        });
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
