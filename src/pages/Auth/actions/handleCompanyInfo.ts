/**
 * handleCompanyInfo Actions
 * Handles company information submission, skip, and logo upload
 */

import { organizationSettingsService } from '@/services/companySettingsService';
import { LogoUploadResult } from '@/services/LogoUploadService';
import { NavigateFunction } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import * as authService from '@/auth/services/authService';

interface HandleCompanyInfoSubmitParams {
  userId: string | null;
  organizationId: string | null;
  companyPhone: string;
  companyFax: string;
  companyAddress: string;
  companyWebsite: string;
  industry: string;
  foundVia: string;
  setLoading: (loading: boolean) => void;
  toast: (props: { title: string; description: string; variant?: 'destructive' }) => void;
  clearAuthState: () => void;
  redirectAfterAuth: () => void;
}

export const handleCompanyInfoSubmit = async (params: HandleCompanyInfoSubmitParams & {
  navigate: NavigateFunction;
}) => {
  const {
    userId,
    organizationId,
    companyPhone,
    companyFax,
    companyAddress,
    companyWebsite,
    industry,
    foundVia,
    setLoading,
    toast,
    clearAuthState,
    navigate,
  } = params;

  // All fields are optional - only userId is required
  if (!userId) return;

  console.log('=== Company Info Submit ===');
  console.log('Industry:', industry);
  console.log('Found Via:', foundVia);
  console.log('Organization ID:', organizationId);

  setLoading(true);
  try {
    // Small delay to ensure membership is committed
    await new Promise(resolve => setTimeout(resolve, 500));

    // Refresh session to ensure RLS policies recognize the new membership
    await supabase.auth.refreshSession();

    // Use the organization settings service to update company info
    await organizationSettingsService.updateCompanyInfo({
      phone_number: companyPhone,
      fax_number: companyFax,
      company_address: companyAddress,
      website: companyWebsite,
      industry: industry,
      found_via: foundVia,
    });

    console.log('✅ Company info saved successfully');

    // ✨ Auto-enroll organization in 14-day free trial via Stripe
    if (organizationId) {
      console.log('🎁 Auto-enrolling organization in Stripe trial:', organizationId);

      const authUser = await authService.getCurrentUser();
      const userEmail = authUser?.email;

      const { data: trialData, error: trialError } = await supabase.functions.invoke(
        'create-trial-subscription',
        {
          body: {
            organizationId,
            userEmail,
            userName: userEmail,
          },
        }
      );

      if (trialError) {
        console.error('❌ Stripe trial enrollment failed:', trialError);
        // Don't block - continue to dashboard
      } else if (trialData?.success) {
        console.log('✅ Stripe trial enrollment successful:', {
          subscriptionId: trialData.subscriptionId,
          customerId: trialData.customerId,
          trialEnd: trialData.trialEnd,
        });
      } else if (trialData?.error) {
        console.error('❌ Trial enrollment error:', trialData.error);
        // Don't block - continue to dashboard
      }
    }

    // Clear auth state and navigate to dashboard with welcome flag
    clearAuthState();
    navigate('/dashboard?welcome=true');
  } catch (error: any) {
    toast({
      title: 'Company Info Error',
      description: error.message || 'Failed to save company information',
      variant: 'destructive',
    });
  } finally {
    setLoading(false);
  }
};

interface HandleCompanyInfoSkipParams {
  toast: (props: { title: string; description: string }) => void;
  clearAuthState: () => void;
  navigate: NavigateFunction;
}

export const handleCompanyInfoSkip = (params: HandleCompanyInfoSkipParams) => {
  const { clearAuthState, navigate } = params;

  // Clear auth state and navigate to dashboard with welcome flag
  // User was already auto-enrolled in free trial during org creation
  clearAuthState();
  navigate('/dashboard?welcome=true');
};

interface HandleLogoUploadParams {
  setCurrentLogoUrl: (url: string | undefined) => void;
  toast: (props: { title: string; description: string }) => void;
}

export const handleLogoUpload = (result: LogoUploadResult, params: HandleLogoUploadParams) => {
  const { setCurrentLogoUrl, toast } = params;

  setCurrentLogoUrl(result.url);
  toast({
    title: 'Logo uploaded successfully!',
    description: 'Your company logo has been saved.',
  });
};

export const handleLogoError = (error: string, toast: (props: { title: string; description: string; variant: 'destructive' }) => void) => {
  toast({
    title: 'Logo Upload Error',
    description: error,
    variant: 'destructive',
  });
};
