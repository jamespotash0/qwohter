/**
 * handleCompanyInfo Actions
 * Handles company information submission, skip, and logo upload
 */

import { organizationSettingsService } from '@/services/companySettingsService';
import { LogoUploadResult } from '@/services/LogoUploadService';
import { NavigateFunction } from 'react-router-dom';
import { createTrialSubscription } from '@/services/stripeService';

interface HandleCompanyInfoSubmitParams {
  userId: string | null;
  organizationId: string | null;
  companyPhone: string;
  companyFax: string;
  companyAddress: string;
  companyWebsite: string;
  quoteStartingPoint: string;
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
    quoteStartingPoint,
    industry,
    foundVia,
    setLoading,
    toast,
    clearAuthState,
    redirectAfterAuth,
  } = params;

  if (!userId || !companyPhone || !companyAddress || !companyWebsite || !quoteStartingPoint) return;

  console.log('=== Company Info Submit ===');
  console.log('Industry:', industry);
  console.log('Found Via:', foundVia);
  console.log('Organization ID:', organizationId);

  setLoading(true);
  try {
    // Use the organization settings service to update company info
    await organizationSettingsService.updateCompanyInfo({
      phone_number: companyPhone,
      fax_number: companyFax, // Can be empty string, handled by the service
      company_address: companyAddress,
      website: companyWebsite,
      quote_start_number: quoteStartingPoint,
      industry: industry,
      found_via: foundVia,
    });

    console.log('Company info saved, now creating trial subscription...');

    // Automatically enroll in 14-day Stripe trial
    if (organizationId) {
      const trialResult = await createTrialSubscription(organizationId);

      if (trialResult.success) {
        console.log('Trial subscription created successfully:', trialResult.data);
        toast({
          title: 'Welcome to Qwohter!',
          description: 'Your 14-day free trial has started. No credit card required!',
        });
      } else {
        console.error('Trial creation failed:', trialResult.error);
        // Don't block onboarding if trial fails - user can activate later
        toast({
          title: 'Setup Complete',
          description: 'You can activate your trial from the billing page.',
        });
      }
    } else {
      console.warn('No organizationId available for trial enrollment');
      toast({
        title: 'Company information saved!',
        description: 'Please activate your trial from the billing page.',
      });
    }

    // Clear auth state and redirect to dashboard
    clearAuthState();
    redirectAfterAuth();
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
  const { toast, clearAuthState, navigate } = params;

  toast({
    title: 'Setup completed!',
    description: 'You can add company information later in Settings.',
  });
  clearAuthState();
  navigate('/dashboard');
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
