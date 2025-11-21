/**
 * handleInviteJoin Action
 * Handles joining organization via invitation link
 */

import { authFlowHelpers } from '@/utils/authFlowHelpers';
import { onboardingStateHelpers } from '@/services/onboardingStateService';
import { markTokenAsUsed } from '@/utils/inviteTokens';
import { NavigateFunction } from 'react-router-dom';

interface HandleInviteJoinParams {
  userId: string | null;
  orgCode: string;
  inviteToken: string;
  setLoading: (loading: boolean) => void;
  navigate: NavigateFunction;
  toast: (props: { title: string; description: string; variant?: 'destructive' }) => void;
}

export const handleInviteJoin = async (params: HandleInviteJoinParams) => {
  const {
    userId,
    orgCode,
    inviteToken,
    setLoading,
    navigate,
    toast,
  } = params;

  if (!userId || !orgCode || !inviteToken) return;

  setLoading(true);

  try {
    // Join organization via invite
    const choice = {
      type: 'join' as const,
      orgCode,
      industry: '',
      foundVia: 'Invitation',
    };

    const result = await authFlowHelpers.handleOrganizationSetup({ userId, choice });

    if (result.success && result.data) {
      // Mark invite token as used
      try {
        await markTokenAsUsed(inviteToken);
        console.log('Invite token marked as used');
      } catch (error) {
        console.error('Error marking token as used:', error);
        // Don't fail the join process if token marking fails
      }

      toast({
        title: 'Join request sent!',
        description: 'Your request to join the organization is pending approval.',
      });

      // Clear onboarding progress
      await onboardingStateHelpers.clearOnboardingProgress(userId);

      // Navigate to pending approval page
      navigate('/pending-approval');
    } else {
      toast({
        title: 'Join Error',
        description: result.error as any,
        variant: 'destructive',
      });
    }
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
