/**
 * handleOrganizationSubmit Action
 * Simplified - only handles organization creation (default flow)
 */

import { authFlowHelpers } from '@/utils/authFlowHelpers';
import { onboardingStateHelpers } from '@/services/onboardingStateService';
import { OrganizationCreationLimiter } from '@/services/rateLimitingService';
import { markSignupInviteAsUsed } from '@/utils/inviteTokens';
import { NavigateFunction } from 'react-router-dom';

interface HandleOrganizationSubmitParams {
  userId: string | null;
  orgName: string;
  industry: string;
  foundVia: string;
  submissionInProgress: boolean;
  setSubmissionInProgress: (inProgress: boolean) => void;
  setOrganizationId: (id: string | null) => void;
  setStep: (step: 'auth' | 'verify-otp' | 'organization' | 'company-info') => void;
  setLoading: (loading: boolean) => void;
  navigate: NavigateFunction;
  toast: (props: { title: string; description: string; variant?: 'destructive' }) => void;
  saveAuthState: (state: any) => void;
}

export const handleOrganizationSubmit = async (params: HandleOrganizationSubmitParams) => {
  const {
    userId,
    orgName,
    industry,
    foundVia,
    submissionInProgress,
    setSubmissionInProgress,
    setOrganizationId,
    setStep,
    setLoading,
    toast,
    saveAuthState,
  } = params;

  if (!userId || submissionInProgress || !orgName.trim()) return;

  // Prevent double submission
  setSubmissionInProgress(true);
  setLoading(true);

  try {
    // Check rate limiting before creation
    const rateLimitCheck = await OrganizationCreationLimiter.canCreateOrganization(userId);

    if (!rateLimitCheck.allowed) {
      toast({
        title: 'Creation Limit Reached',
        description: rateLimitCheck.reason as any,
        variant: 'destructive',
      });
      return;
    }

    // Save current form state before submission
    await onboardingStateHelpers.saveOnboardingProgress(userId, 'organization', {
      orgName,
      industry,
      foundVia,
    });

    // Create organization
    const choice = {
      type: 'create' as const,
      orgName,
      industry,
      foundVia,
    };

    const result = await authFlowHelpers.handleOrganizationSetup({ userId, choice });

    if (result.success && result.data) {
      // Mark signup invite as used if this was a signup invite flow
      const pendingSignupInviteToken = sessionStorage.getItem('pendingSignupInviteToken');
      if (pendingSignupInviteToken) {
        try {
          await markSignupInviteAsUsed(pendingSignupInviteToken, userId);
          sessionStorage.removeItem('pendingSignupInviteToken');
          sessionStorage.removeItem('pendingSignupInviteEmail');
        } catch (error) {
          console.error('Failed to mark signup invite as used:', error);
          // Don't fail the signup flow for this
        }
      }

      toast({
        title: 'Organization created!',
        description: `${result.data.organizationName} has been created successfully.`,
      });
      setStep('company-info');
      saveAuthState({
        step: 'company-info',
        userId,
        orgName: result.data.organizationName
      });
    } else {
      toast({
        title: 'Organization Error',
        description: result.error as any,
        variant: 'destructive',
      });
    }
  } catch (error: any) {
    console.error('Organization creation error:', error);
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
