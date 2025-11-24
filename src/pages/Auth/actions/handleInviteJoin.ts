/**
 * handleInviteJoin Action
 * Handles joining organization via invitation link
 * Auto-approves user to Active status (no pending approval needed)
 */

import { supabase } from '@/integrations/supabase/client';
import { onboardingStateHelpers } from '@/services/onboardingStateService';
import { markTokenAsUsed } from '@/utils/inviteTokens';
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

  try {
    console.log('🔍 Joining organization:', organizationId);

    // Get organization by ID
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();

    if (orgError || !orgData) {
      console.error('❌ Organization query error:', orgError);
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
        role: 'Member',
        status: 'Active', // Auto-approve invited users
        join_type: 'Invited' // User was invited (not requested)
      } as any);

    if (membershipsError) {
      console.error('Membership creation error:', membershipsError);
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
    toast({
      title: 'Join Error',
      description: error.message,
      variant: 'destructive',
    });
  } finally {
    setLoading(false);
  }
};
