/**
 * handleOrganizationSubmit Action
 * Handles organization creation or join request
 */

import { authFlowHelpers } from '@/utils/authFlowHelpers';
import { onboardingStateHelpers } from '@/services/onboardingStateService';
import { OrganizationCreationLimiter } from '@/services/rateLimitingService';
import { markTokenAsUsed } from '@/utils/inviteTokens';
import { NavigateFunction } from 'react-router-dom';

interface HandleOrganizationSubmitParams {
  orgChoice: 'join' | 'create' | null;
  userId: string | null;
  orgName: string;
  orgCode: string;
  submissionInProgress: boolean;
  setSubmissionInProgress: (inProgress: boolean) => void;
  setStep: (step: 'auth' | 'verify-otp' | 'organization' | 'company-info') => void;
  setLoading: (loading: boolean) => void;
  navigate: NavigateFunction;
  toast: (props: { title: string; description: string; variant?: 'destructive' }) => void;
  locationSearch: string;
  saveAuthState: (state: any) => void;
}

export const handleOrganizationSubmit = async (params: HandleOrganizationSubmitParams) => {
  const {
    orgChoice,
    userId,
    orgName,
    orgCode,
    submissionInProgress,
    setSubmissionInProgress,
    setStep,
    setLoading,
    navigate,
    toast,
    locationSearch,
    saveAuthState,
  } = params;

  if (!orgChoice || !userId || submissionInProgress) return;

  // Prevent double submission
  setSubmissionInProgress(true);
  setLoading(true);

  try {
    // Check rate limiting before creation
    if (orgChoice === 'create') {
      const rateLimitCheck = await OrganizationCreationLimiter.canCreateOrganization(userId);

      if (!rateLimitCheck.allowed) {
        toast({
          title: 'Creation Limit Reached',
          description: rateLimitCheck.reason as any,
          variant: 'destructive',
        });
        return;
      }
    }

    // Save current form state before submission
    await onboardingStateHelpers.saveOnboardingProgress(userId, 'organization', {
      orgChoice,
      orgName,
      orgCode,
    });

    const choice = {
      type: orgChoice,
      orgName: orgChoice === 'create' ? orgName : undefined,
      orgCode: orgChoice === 'join' ? orgCode : undefined,
    };

    const result = await authFlowHelpers.handleOrganizationSetup({ userId, choice });

    if (result.success) {
      if (orgChoice === 'create' && result.data) {
        toast({
          title: 'Organization created!',
          description: `${result.data.organizationName} has been created successfully. Your code: ${result.data.organizationCode}`,
        });
        setStep('company-info');
        saveAuthState({
          step: 'company-info',
          userId,
          orgName: result.data.organizationName,
          orgCode: result.data.organizationCode
        });
      } else if (orgChoice === 'join' && result.data) {
        // Check if user joined via invite token and mark it as used
        const urlParams = new URLSearchParams(locationSearch);
        const inviteToken = urlParams.get('invite');

        if (inviteToken && inviteToken.trim()) {
          try {
            await markTokenAsUsed(inviteToken.trim());
            console.log('Invite token marked as used');
          } catch (error) {
            console.error('Error marking token as used:', error);
            // Don't fail the join process if token marking fails
          }
        }

        toast({
          title: 'Join request sent!',
          description: 'Your request to join the organization is pending approval.',
        });
        await onboardingStateHelpers.clearOnboardingProgress(userId);
        navigate('/dashboard');
      }
    } else {
      toast({
        title: 'Organization Error',
        description: result.error as any,
        variant: 'destructive',
      });
    }
  } catch (error: any) {
    console.error('Organization submit error:', error);
    toast({
      title: 'Organization Error',
      description: error.message,
      variant: 'destructive',
    });
  } finally {
    setLoading(false);
    setSubmissionInProgress(false);
  }
};
