/**
 * handleInviteJoin Action
 * Handles joining organization via invitation link
 * Auto-approves user to Active status (no pending approval needed)
 * Includes rate limiting to prevent brute force attacks
 */

import { supabase } from '@/integrations/supabase/client';
import { onboardingStateHelpers } from '@/services/onboardingStateService';
import { markTokenAsUsed } from '@/utils/inviteTokens';
import {
  checkInviteRateLimit,
  logInviteAttempt,
  getUserIpAddress,
  formatRateLimitReset,
} from '@/utils/rateLimiting';
import { NavigateFunction } from 'react-router-dom';

interface HandleInviteJoinParams {
  userId: string | null;
  organizationId: string;
  inviteToken: string;
  setLoading: (loading: boolean) => void;
  navigate: NavigateFunction;
  toast: (props: { title: string; description: string; variant?: 'destructive' }) => void;
}

export const handleInviteJoin = async (params: HandleInviteJoinParams) => {
  const {
    userId,
    organizationId,
    inviteToken,
    setLoading,
    navigate,
    toast,
  } = params;

  if (!userId || !organizationId || !inviteToken) return;

  setLoading(true);

  // Get user's IP address for rate limiting
  const userIp = await getUserIpAddress();

  try {
    console.log('🔍 Joining organization:', organizationId);

    // SECURITY: Check rate limit before processing
    const rateLimitCheck = await checkInviteRateLimit({
      ipAddress: userIp,
      userId: userId,
      inviteToken: inviteToken,
    });

    if (!rateLimitCheck.allowed) {
      console.warn('⚠️ Rate limit exceeded:', rateLimitCheck);
      const resetTime = formatRateLimitReset(rateLimitCheck.window_reset_at);

      toast({
        title: 'Too Many Attempts',
        description: `${rateLimitCheck.reason} Please try again in ${resetTime}.`,
        variant: 'destructive',
      });

      setLoading(false);
      return;
    }

    console.log('✅ Rate limit check passed:', rateLimitCheck.attempts_used, 'attempts used');

    // Get invite token data to extract department, role, and email
    // MUST check: not used, not revoked, not expired
    console.log('🔍 Fetching token data for:', {
      token: inviteToken,
      tokenLength: inviteToken.length,
      tokenType: typeof inviteToken,
    });

    // First, check if ANY token exists with this value (debugging)
    const { data: anyTokens, error: debugError } = await supabase
      .from('invite_tokens')
      .select('id, email, is_used, revoked_at, expires_at')
      .eq('token', inviteToken);

    console.log('🔍 Debug: Found tokens:', anyTokens, 'Error:', debugError);

    const { data: tokenData, error: tokenError } = await supabase
      .from('invite_tokens')
      .select('department, role, email, is_used, revoked_at, expires_at, created_by')
      .eq('token', inviteToken)
      .maybeSingle<{
        department: string | null;
        role: 'Admin' | 'Member';
        email: string;
        is_used: boolean;
        revoked_at: string | null;
        expires_at: string;
        created_by: string;
      }>();

    if (tokenError || !tokenData) {
      console.error('❌ Token not found. Error:', tokenError, 'Data:', tokenData);

      // Log failed attempt
      await logInviteAttempt({
        ipAddress: userIp,
        userId: userId,
        inviteToken: inviteToken,
        success: false,
        errorMessage: tokenError ? `Token query error: ${tokenError.message}` : 'Token not found in database',
      });

      toast({
        title: 'Invalid Invite',
        description: 'This invitation token does not exist or has been removed.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    console.log('📋 Token data retrieved:', {
      email: tokenData.email,
      role: tokenData.role,
      is_used: tokenData.is_used,
      revoked_at: tokenData.revoked_at,
      expires_at: tokenData.expires_at,
    });

    // Validate token status
    if (tokenData.is_used) {
      console.error('❌ Token already used - Database shows is_used=true');

      await logInviteAttempt({
        ipAddress: userIp,
        userId: userId,
        inviteToken: inviteToken,
        success: false,
        errorMessage: 'Token already used',
      });

      toast({
        title: 'Invite Already Used',
        description: 'This invitation has already been accepted.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (tokenData.revoked_at) {
      console.error('❌ Token revoked at:', tokenData.revoked_at);

      await logInviteAttempt({
        ipAddress: userIp,
        userId: userId,
        inviteToken: inviteToken,
        success: false,
        errorMessage: 'Token revoked',
      });

      toast({
        title: 'Invite Revoked',
        description: 'This invitation has been revoked. Please request a new invitation.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (now > expiresAt) {
      console.error('❌ Token expired:', tokenData.expires_at);

      await logInviteAttempt({
        ipAddress: userIp,
        userId: userId,
        inviteToken: inviteToken,
        success: false,
        errorMessage: 'Token expired',
      });

      toast({
        title: 'Invite Expired',
        description: 'This invitation has expired. Please request a new invitation.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Get current user's email for verification
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      console.error('❌ User query error:', userError);
      toast({
        title: 'Authentication Error',
        description: 'Could not verify your email address.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // SECURITY: Verify email matches invite
    if (tokenData.email.toLowerCase() !== user.email.toLowerCase()) {
      console.error('❌ Email mismatch:', {
        invited: tokenData.email,
        actual: user.email,
      });

      // Log failed attempt
      await logInviteAttempt({
        ipAddress: userIp,
        userId: userId,
        inviteToken: inviteToken,
        success: false,
        errorMessage: `Email mismatch: invited=${tokenData.email}, actual=${user.email}`,
      });

      toast({
        title: 'Email Mismatch',
        description: `This invitation was sent to ${tokenData.email}. Please sign up with that email address.`,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    console.log('✅ Email verified:', user.email);

    // Get organization by ID
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single<{ id: string; name: string }>();

    if (orgError || !orgData) {
      console.error('❌ Organization query error:', orgError);

      // Log failed attempt
      await logInviteAttempt({
        ipAddress: userIp,
        userId: userId,
        inviteToken: inviteToken,
        success: false,
        errorMessage: orgError ? 'Organization query error' : 'Organization not found',
      });

      toast({
        title: 'Join Error',
        description: orgError ? 'Database error while searching for organization.' : 'Organization not found.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    console.log('✅ Found organization:', orgData.name);

    // Check if user already has membership in this organization
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id, status')
      .eq('user_id', userId)
      .eq('organization_id', orgData.id)
      .maybeSingle<{ id: string; status: string }>();

    if (existingMembership) {
      console.log('⚠️ User already has membership:', existingMembership);

      await logInviteAttempt({
        ipAddress: userIp,
        userId: userId,
        inviteToken: inviteToken,
        success: false,
        errorMessage: `User already has membership (status: ${existingMembership.status})`,
      });

      toast({
        title: 'Already a Member',
        description: `You are already a member of ${orgData.name}.`,
      });

      // User is already a member, navigate to dashboard
      navigate('/dashboard');
      return;
    }

    // Create membership with Active status (auto-approved for invited users)
    console.log('Creating membership for user:', userId);
    const { error: membershipsError } = await supabase
      .from('memberships')
      .insert({
        user_id: userId,
        organization_id: orgData.id,
        role: tokenData?.role || 'Member',
        status: 'Active', // Auto-approve invited users
        join_type: 'Invited', // User was invited (not requested)
        department: tokenData?.department || null, // Set department from invite token
        invited_by: tokenData?.created_by || null // Track who invited this member
      } as any);

    if (membershipsError) {
      console.error('❌ Membership creation error:', membershipsError);

      // Log failed attempt
      await logInviteAttempt({
        ipAddress: userIp,
        userId: userId,
        inviteToken: inviteToken,
        success: false,
        errorMessage: `Membership creation failed: ${membershipsError.message}`,
      });

      toast({
        title: 'Join Error',
        description: membershipsError.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Mark invite token as used
    try {
      await markTokenAsUsed(inviteToken);
      console.log('Invite token marked as used');
    } catch (error) {
      console.error('Error marking token as used:', error);
      // Don't fail the join process if token marking fails
    }

    // Log successful attempt
    await logInviteAttempt({
      ipAddress: userIp,
      userId: userId,
      inviteToken: inviteToken,
      success: true,
    });

    toast({
      title: 'Welcome to the team!',
      description: `You've successfully joined ${orgData.name}.`,
    });

    // Clear onboarding progress
    await onboardingStateHelpers.clearOnboardingProgress(userId);

    // Navigate to dashboard (user is immediately active)
    navigate('/dashboard');
  } catch (error: any) {
    console.error('Invite join error:', error);

    // Log failed attempt for unexpected errors
    await logInviteAttempt({
      ipAddress: userIp,
      userId: userId,
      inviteToken: inviteToken,
      success: false,
      errorMessage: `Unexpected error: ${error.message}`,
    });

    toast({
      title: 'Join Error',
      description: error.message,
      variant: 'destructive',
    });
  } finally {
    setLoading(false);
  }
};
