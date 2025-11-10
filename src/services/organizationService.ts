/**
 * Organization Service
 *
 * Centralized service for all organization-related API calls.
 * Used by React Query hooks for data fetching.
 */

import { supabase } from '@/integrations/supabase/client';
import type { LogoData } from '@/lib/types/settings/companySettings';

// ============================================================================
// Types
// ============================================================================

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
  user_id: string;
  organization_id: string;
  role: 'Owner' | 'Admin' | 'Member';
  status: 'Pending' | 'Active' | 'Suspended' | 'Inactive'; //membership_status
  joined_at: string;
  email?: string;
  full_name?: string;
  join_type?: 'Invited' | 'Requested' | 'Direct';
  department?: string | null;
}

export interface UserMembership {
  organization_id: string;
  role: 'Owner' | 'Admin' | 'Member';
  status: 'Pending' | 'Active' | 'Suspended' | 'Inactive'; //membership_status
  joined_at: string;
  organization: Organization;
}

export interface InviteToken {
  id: string;
  organization_id: string;
  email: string;
  role: 'Admin' | 'Member';
  expires_at: string;
  created_at: string;
  is_used: boolean;
}

export interface UpdateOrganizationData {
  name?: string;
  phone_number?: string;
  fax_number?: string;
  company_address?: string;
  website?: string;
  industry?: string;
  logo_data?: LogoData;
  quote_start_number?: string;
}

// ============================================================================
// Organization Operations
// ============================================================================

/**
 * Fetch organization by user ID
 */
export async function fetchOrganizationByUserId(userId: string): Promise<UserMembership | null> {
  const { data: membership, error } = await supabase
    .from('memberships')
    .select('organization_id, role, status, joined_at, organization:organizations(*)') //membership_status
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!membership) return null;

  return membership as unknown as UserMembership;
}

/**
 * Fetch organization by ID
 */
export async function fetchOrganizationById(organizationId: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();

  if (error) throw error;
  return data as Organization;
}

/**
 * Update organization
 */
export async function updateOrganization(
  organizationId: string,
  updates: UpdateOrganizationData
): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', organizationId)
    .select()
    .single();

  if (error) throw error;
  return data as Organization;
}

// ============================================================================
// Member Operations
// ============================================================================

/**
 * Fetch organization members with profile data
 */
export async function fetchOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
  // Fetch memberships
  const { data: membersData, error: membersError } = await supabase
    .from('memberships')
    .select('id, user_id, organization_id, role, status, joined_at, join_type, department') //membership_status
    .eq('organization_id', organizationId)
    .returns<{
      id: string;
      user_id: string;
      organization_id: string;
      role: string;
      status: string; //membership_status
      joined_at: string;
      join_type?: string;
      department?: string;
    }[]>();

  if (membersError) throw membersError;
  if (!membersData || membersData.length === 0) return [];

  // Fetch profiles
  const userIds = membersData.map((m) => m.user_id);
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds)
    .returns<{ id: string; email: string; full_name: string; }[]>();

  // Create profile map
  const profilesMap = new Map(
    (profilesData || []).map((p) => [p.id, p])
  );

  // Combine
  return membersData
    .filter((membership) => membership?.user_id)
    .map((membership) => {
      const profile = profilesMap.get(membership.user_id);

      return {
        id: membership.id,
        user_id: membership.user_id,
        organization_id: membership.organization_id || '',
        role: (membership.role as 'Admin' | 'Member' | 'Owner') || 'Member',
        status: (membership.status as 'Pending' | 'Active' | 'Suspended' | 'Inactive') || 'Active', //membership_status
        joined_at: membership.joined_at || new Date().toISOString(),
        email: profile?.email || undefined,
        full_name: profile?.full_name || undefined,
        join_type: membership.join_type as 'Invited' | 'Requested' | 'Direct' | undefined,
        department: membership.department || null,
      } as OrganizationMember;
    });
}

// ============================================================================
// Invite Token Operations
// ============================================================================

/**
 * Fetch invite tokens for organization
 */
export async function fetchInviteTokens(organizationId: string): Promise<InviteToken[]> {
  const { data, error } = await supabase
    .from('invite_tokens')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as InviteToken[];
}

// ============================================================================
// Subscription Status Operations
// ============================================================================

export interface SubscriptionStatus {
  hasAccess: boolean;
  status: string | null;
  reason: string;
}

/**
 * Check subscription status for organization
 */
export async function checkSubscriptionStatus(organizationId: string): Promise<SubscriptionStatus> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_status, current_period_end')
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    return {
      hasAccess: false,
      status: null,
      reason: 'No active subscription',
    };
  }

  // Case-insensitive comparison to match database trigger
  const hasAccess = data.stripe_subscription_status?.toLowerCase() === 'active' ||
                    data.stripe_subscription_status?.toLowerCase() === 'trialing';

  return {
    hasAccess,
    status: data.stripe_subscription_status,
    reason: hasAccess ? '' : 'Subscription is not active',
  };
}
