/**
 * handleCompanyInfo Actions
 * Handles company information submission, skip, and logo upload
 */

import { organizationSettingsService } from '@/services/companySettingsService';
import { LogoUploadResult } from '@/services/LogoUploadService';
import { NavigateFunction } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface HandleCompanyInfoSubmitParams {
  userId: string | null;
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
  setStep?: (step: 'trial-activation') => void;
  navigate: NavigateFunction;
}) => {
  const {
    userId,
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
    navigate,
  } = params;

  if (!userId || !companyPhone || !companyAddress || !companyWebsite || !quoteStartingPoint) return;

  console.log('=== Company Info Submit ===');
  console.log('Industry:', industry);
  console.log('Found Via:', foundVia);

  setLoading(true);
  try {
    // Small delay to ensure membership is committed
    await new Promise(resolve => setTimeout(resolve, 500));

    // Refresh session to ensure RLS policies recognize the new membership
    await supabase.auth.refreshSession();

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

    console.log('✅ Company info saved successfully');

    toast({
      title: 'Setup complete!',
      description: 'Welcome to your 14-day free trial. Enjoy full access to all features!',
    });

    // Clear auth state and navigate to dashboard
    // User was already auto-enrolled in free trial during org creation
    clearAuthState();
    navigate('/dashboard');
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
    title: 'Setup complete!',
    description: 'Welcome to your 14-day free trial. You can add company details later in Settings.',
  });

  // Clear auth state and navigate to dashboard
  // User was already auto-enrolled in free trial during org creation
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
