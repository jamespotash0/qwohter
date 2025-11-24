/**
 * Team Invitation Service
 *
 * Handles team member invitations with email notifications via Resend
 */

import { supabase } from '@/integrations/supabase/client';
import { createInviteToken, generateSecureToken } from '@/utils/inviteTokens';

interface InviteMemberParams {
  organizationId: string;
  organizationName: string;
  email: string;
  role: 'Admin' | 'Member';
  invitedBy: string;
  inviterName: string;
  department?: string;
}

interface InviteMemberResult {
  success: boolean;
  error?: string;
  inviteToken?: string;
}

/**
 * Invite a new team member via email
 */
export const inviteMember = async (params: InviteMemberParams): Promise<InviteMemberResult> => {
  const {
    organizationId,
    organizationName,
    email,
    role,
    invitedBy,
    inviterName,
    department,
  } = params;

  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'Invalid email address',
      };
    }

    // Check if user is already a member
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      // Check if already a member of this organization
      const { data: existingMembership } = await supabase
        .from('memberships')
        .select('id, status')
        .eq('user_id', existingProfile.id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (existingMembership) {
        return {
          success: false,
          error: existingMembership.status === 'Active'
            ? 'This user is already a member of your organization'
            : 'This user already has a pending invitation',
        };
      }
    }

    // Check if there's an existing unused, non-revoked invite for this email
    const { data: activeInvite } = await supabase
      .from('invite_tokens')
      .select('id, expires_at, revoked_at')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .eq('is_used', false)
      .is('revoked_at', null)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (activeInvite) {
      return {
        success: false,
        error: 'An invitation has already been sent to this email address',
      };
    }

    // Check for revoked invite for this email (to update instead of creating new)
    const { data: revokedInvite } = await supabase
      .from('invite_tokens')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .eq('is_used', false)
      .not('revoked_at', 'is', null)
      .order('revoked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let token: string;
    let expires_at: string;

    if (revokedInvite) {
      // Reuse existing entry: generate new token and update it
      const newToken = generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry
      const newExpiresAt = expiresAt.toISOString();

      // Update the existing entry with new token and clear revoked_at
      const { error: updateError } = await (supabase
        .from('invite_tokens') as any)
        .update({
          token: newToken,
          expires_at: newExpiresAt,
          revoked_at: null, // Clear revocation
          role, // Update role in case it changed
          department: department || null, // Update department in case it changed
        })
        .eq('id', revokedInvite.id);

      if (updateError) {
        throw new Error('Failed to update invite token');
      }

      token = newToken;
      expires_at = newExpiresAt;
    } else {
      // No revoked invite exists, create new token entry
      const result = await createInviteToken(
        organizationId,
        role,
        invitedBy,
        24, // 24 hours expiry
        department,
        email
      );
      token = result.token;
      expires_at = result.expires_at;
    }

    // Get current user's session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }

    // Send invitation email via Resend edge function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const functionsUrl = supabaseUrl?.replace('.supabase.co', '.supabase.co/functions/v1') || '';

    const response = await fetch(`${functionsUrl}/send-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        email,
        organizationName,
        organizationId,
        inviteToken: token,
        inviterName,
        role,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send invitation email:', errorText);

      // Even if email fails, the invite token is created
      // User can still be added manually with the token
      return {
        success: false,
        error: 'Failed to send invitation email. Please try again.',
      };
    }

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to send invitation email',
      };
    }

    return {
      success: true,
      inviteToken: token,
    };
  } catch (error) {
    console.error('Error inviting member:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to invite member',
    };
  }
};

/**
 * Resend an invitation email
 */
export const resendInvitation = async (
  inviteToken: string,
  organizationName: string,
  inviterName: string
): Promise<InviteMemberResult> => {
  try {
    // Get invite token details
    const { data: invite, error: inviteError } = await supabase
      .from('invite_tokens')
      .select('*')
      .eq('token', inviteToken)
      .eq('is_used', false)
      .single();

    if (inviteError || !invite) {
      return {
        success: false,
        error: 'Invitation not found or already used',
      };
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return {
        success: false,
        error: 'This invitation has expired',
      };
    }

    // Get current user's session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }

    // Resend invitation email
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const functionsUrl = supabaseUrl?.replace('.supabase.co', '.supabase.co/functions/v1') || '';

    const response = await fetch(`${functionsUrl}/send-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        email: invite.email,
        organizationName,
        organizationId: invite.organization_id,
        inviteToken: invite.token,
        inviterName,
        role: invite.role,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to resend invitation email:', errorText);
      return {
        success: false,
        error: 'Failed to resend invitation email',
      };
    }

    return {
      success: true,
      inviteToken: invite.token,
    };
  } catch (error) {
    console.error('Error resending invitation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resend invitation',
    };
  }
};

/**
 * Cancel/revoke an invitation
 * Marks the invitation as revoked instead of deleting it,
 * allowing the invite history to be preserved and re-inviting later
 */
export const cancelInvitation = async (inviteToken: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('invite_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token', inviteToken);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error canceling invitation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel invitation',
    };
  }
};

export const teamInvitationService = {
  inviteMember,
  resendInvitation,
  cancelInvitation,
};
