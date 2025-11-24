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
    const { data: tokenData, error: tokenError } = await supabase
      .from('invite_tokens')
      .select('department, role, email')
      .eq('token', inviteToken)
      .single<{ department: string | null; role: 'Admin' | 'Member'; email: string }>();

    if (tokenError) {
      console.error('❌ Token query error:', tokenError);

      // Log failed attempt
      await logInviteAttempt({
        ipAddress: userIp,
        userId: userId,
        inviteToken: inviteToken,
        success: false,
        errorMessage: 'Invalid or expired token',
      });

      toast({
        title: 'Invalid Invite',
        description: 'This invitation is invalid or has expired.',
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

    // Create membership with Active status (auto-approved for invited users)
    const { error: membershipsError } = await supabase
      .from('memberships')
      .insert({
        user_id: userId,
        organization_id: orgData.id,
        role: tokenData?.role || 'Member',
        status: 'Active', // Auto-approve invited users
        join_type: 'Invited', // User was invited (not requested)
        department: tokenData?.department || null // Set department from invite token
      } as any);

    if (membershipsError) {
      console.error('Membership creation error:', membershipsError);

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
