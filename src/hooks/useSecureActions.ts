import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeInput, validateSecurity, authRateLimiter } from '@/utils/security';
import { useUser } from '@/auth';
import { useCurrentOrganization } from '@/hooks/queries';
import { toast } from '@/components/ui/sonner';

/**
 * Custom hook for secure actions with built-in validation and rate limiting
 */
export const useSecureActions = () => {
  const user = useUser();
  const { organization: currentOrganization, role: currentUserRole } = useCurrentOrganization(user?.id);

  /**
   * Secure proposal creation with validation
   * Uses the proposals table (new form-builder system)
   */
  const createProposalSecurely = useCallback(async (proposalData: any) => {
    // Rate limiting check
    if (!authRateLimiter.isAllowed(`create_proposal_${user?.id}`)) {
      throw new Error('Too many requests. Please wait before creating another proposal.');
    }

    // Input validation and sanitization
    const sanitizedData = {
      ...proposalData,
      project_name: sanitizeInput.string(proposalData.project_name),
      client_name: sanitizeInput.string(proposalData.client_name || ''),
      client_company: sanitizeInput.string(proposalData.client_company || ''),
    };

    // Validate content safety
    if (sanitizedData.project_name && !validateSecurity.contentSafety(sanitizedData.project_name)) {
      throw new Error('Invalid content detected in proposal data');
    }

    // Validate organization access
    if (!currentOrganization?.id) {
      throw new Error('User not assigned to organization');
    }

    try {
      // Client-side validation (server-side validation is handled by RLS policies)
      if (sanitizedData.project_name && sanitizedData.project_name.length > 255) {
        throw new Error('Invalid project name');
      }

      // Create proposal with sanitized data
      const { data, error } = await supabase
        .from('proposals')
        .insert({
          ...sanitizedData,
          organization_id: currentOrganization.id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Secure proposal creation failed:', error);
      throw error;
    }
  }, [user, currentOrganization]);

  /**
   * Secure proposal update with validation
   * Uses the proposals table (new form-builder system)
   */
  const updateProposalSecurely = useCallback(async (proposalId: string, updates: any) => {
    // Rate limiting
    if (!authRateLimiter.isAllowed(`update_proposal_${user?.id}`)) {
      throw new Error('Too many requests. Please wait before updating.');
    }

    // Validate proposal ID
    const sanitizedProposalId = sanitizeInput.uuid(proposalId);
    if (!sanitizedProposalId) {
      throw new Error('Invalid proposal ID');
    }

    // Validate user can access this proposal by checking organization
    const { data: proposalData, error: proposalError } = await supabase
      .from('proposals')
      .select('organization_id')
      .eq('id', sanitizedProposalId)
      .single();

    if (proposalError || !proposalData) {
      throw new Error('Proposal not found');
    }

    if (proposalData.organization_id !== currentOrganization?.id) {
      throw new Error('Access denied: Cannot modify this proposal');
    }

    // Sanitize update data
    const sanitizedUpdates = {
      ...updates,
      project_name: updates.project_name ? sanitizeInput.string(updates.project_name) : undefined,
      client_name: updates.client_name ? sanitizeInput.string(updates.client_name) : undefined,
      client_company: updates.client_company ? sanitizeInput.string(updates.client_company) : undefined,
    };

    // Remove undefined values
    Object.keys(sanitizedUpdates).forEach(key => {
      if (sanitizedUpdates[key] === undefined) {
        delete sanitizedUpdates[key];
      }
    });

    try {
      const { data, error } = await supabase
        .from('proposals')
        .update(sanitizedUpdates)
        .eq('id', sanitizedProposalId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Secure proposal update failed:', error);
      throw error;
    }
  }, [user, currentOrganization]);

  /**
   * Secure admin action with privilege validation
   */
  const performAdminAction = useCallback(async (
    action: string, 
    targetId: string, 
    actionData?: any
  ) => {
    // Validate admin privileges
    if (!validateSecurity.adminRole(currentUserRole ?? null)) {
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
      if (!currentOrganization?.id) {
        throw new Error('User not assigned to organization');
      }
      const { data: hasAccess, error: accessError } = await supabase
        .rpc('user_has_admin_role_in_org', {
          org_id: currentOrganization.id
        });

      if (accessError || !hasAccess) {
        throw new Error('Access denied: Insufficient privileges');
      }
      return true;
    } catch (error) {
      console.error('Admin action failed:', error);
      throw error;
    }
  }, [user, currentOrganization, currentUserRole]);


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
    createProposalSecurely,
    updateProposalSecurely,
    performAdminAction,
    validateFileUpload,
  };
};
