import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeInput, validateSecurity, authRateLimiter } from '@/utils/security';
import { useUser, useProfile } from '@/stores/auth/authStore';
import { toast } from 'sonner';

/**
 * Custom hook for secure actions with built-in validation and rate limiting
 */
export const useSecureActions = () => {
  const user = useUser();
  const profile = useProfile();

  /**
   * Secure quote creation with validation
   */
  const createQuoteSecurely = useCallback(async (quoteData: any) => {
    // Rate limiting check
    if (!authRateLimiter.isAllowed(`create_quote_${user?.id}`)) {
      throw new Error('Too many requests. Please wait before creating another quote.');
    }

    // Input validation and sanitization
    const sanitizedData = {
      ...quoteData,
      quote_name: sanitizeInput.string(quoteData.quote_name),
      customer_name: sanitizeInput.string(quoteData.customer_name || ''),
      customer_email: sanitizeInput.email(quoteData.customer_email || ''),
    };

    // Validate content safety
    if (!validateSecurity.contentSafety(sanitizedData.quote_name)) {
      throw new Error('Invalid content detected in quote data');
    }

    // Validate organization access
    if (!profile?.organization_id) {
      throw new Error('User not assigned to organization');
    }

    try {
      // Client-side validation (server-side validation is handled by RLS policies)
      if (!sanitizedData.quote_name || sanitizedData.quote_name.length > 255) {
        throw new Error('Invalid quote name');
      }

      // Create quote with sanitized data
      const { data, error } = await supabase
        .from('quotes')
        .insert({
          ...sanitizedData,
          organization_id: profile.organization_id,
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Secure quote creation failed:', error);
      throw error;
    }
  }, [user, profile]);

  /**
   * Secure quote update with validation
   */
  const updateQuoteSecurely = useCallback(async (quoteId: string, updates: any) => {
    // Rate limiting
    if (!authRateLimiter.isAllowed(`update_quote_${user?.id}`)) {
      throw new Error('Too many requests. Please wait before updating.');
    }

    // Validate quote ID
    const sanitizedQuoteId = sanitizeInput.uuid(quoteId);
    if (!sanitizedQuoteId) {
      throw new Error('Invalid quote ID');
    }

    // Validate user can access this quote by checking organization
    const { data: quoteData, error: quoteError } = await supabase
      .from('quotes')
      .select('organization_id')
      .eq('id', sanitizedQuoteId)
      .single();

    if (quoteError || !quoteData) {
      throw new Error('Quote not found');
    }

    if (quoteData.organization_id !== profile?.organization_id) {
      throw new Error('Access denied: Cannot modify this quote');
    }

    // Sanitize update data
    const sanitizedUpdates = {
      ...updates,
      quote_name: updates.quote_name ? sanitizeInput.string(updates.quote_name) : undefined,
      customer_name: updates.customer_name ? sanitizeInput.string(updates.customer_name) : undefined,
      customer_email: updates.customer_email ? sanitizeInput.email(updates.customer_email) : undefined,
    };

    // Remove undefined values
    Object.keys(sanitizedUpdates).forEach(key => {
      if (sanitizedUpdates[key] === undefined) {
        delete sanitizedUpdates[key];
      }
    });

    try {
      const { data, error } = await supabase
        .from('quotes')
        .update(sanitizedUpdates)
        .eq('id', sanitizedQuoteId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Secure quote update failed:', error);
      throw error;
    }
  }, [user]);

  /**
   * Secure admin action with privilege validation
   */
  const performAdminAction = useCallback(async (
    action: string, 
    targetId: string, 
    actionData?: any
  ) => {
    // Validate admin privileges
    if (!validateSecurity.adminRole(profile?.role ?? null)) {
      throw new Error('Access denied: Admin privileges required');
    }

    // Rate limiting for admin actions
    if (!authRateLimiter.isAllowed(`admin_action_${user?.id}`)) {
      throw new Error('Too many admin requests. Please wait.');
    }

    const sanitizedTargetId = sanitizeInput.uuid(targetId);
    if (!sanitizedTargetId) {
      throw new Error('Invalid target ID');
    }

    try {
      // Validate admin has access to target organization
      if (!profile?.organization_id) {
        throw new Error('User not assigned to organization');
      }
      const { data: hasAccess, error: accessError } = await supabase
        .rpc('user_has_admin_role_in_org', {
          org_id: profile.organization_id as string
        });

      if (accessError || !hasAccess) {
        throw new Error('Access denied: Insufficient privileges');
      }

      // Log admin action (for now just console log, implement audit table later)
      console.log(`Admin action: ${action} performed by ${user?.id} on ${sanitizedTargetId}`, actionData);

      return true;
    } catch (error) {
      console.error('Admin action failed:', error);
      throw error;
    }
  }, [user, profile]);

  /**
   * Secure organization code retrieval
   */
  const getOrganizationCodeSecurely = useCallback(async () => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    // Validate admin role
    if (!validateSecurity.adminRole(profile?.role ?? null)) {
      throw new Error('Access denied: Admin privileges required');
    }

    try {
      // Get user's organization with code
      if (!profile?.organization_id) {
        throw new Error('User not assigned to organization');
      }
      const { data: orgData, error } = await supabase
        .from('organizations')
        .select('organization_code')
        .eq('id', profile.organization_id)
        .single();

      if (error || !orgData) {
        throw new Error('Failed to fetch organization code');
      }

      return orgData.organization_code;
    } catch (error) {
      console.error('Failed to get organization code:', error);
      throw error;
    }
  }, [user, profile]);

  /**
   * Secure file upload validation
   */
  const validateFileUpload = useCallback((file: File): boolean => {
    // File size limit (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size too large (max 10MB)');
      return false;
    }

    // Allowed file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('File type not allowed');
      return false;
    }

    // Validate file name for malicious content
    if (!validateSecurity.contentSafety(file.name)) {
      toast.error('Invalid file name');
      return false;
    }

    return true;
  }, []);

  return {
    createQuoteSecurely,
    updateQuoteSecurely,
    performAdminAction,
    getOrganizationCodeSecurely,
    validateFileUpload,
  };
};