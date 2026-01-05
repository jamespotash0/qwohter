/**
 * useGenerateGoogleDoc Hook
 *
 * React hook for generating Google Docs from templates.
 * Wraps the googleDocsService with React Query mutations.
 *
 * IMPORTANT: This hook fetches fresh proposal data from the database
 * before generating documents to avoid stale data issues.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateProposalDoc, type GenerateDocResponse, type GeneratedDocVersion } from '@/services/googleDocsService';
import type { FormBuilderData } from '@/features/proposals/context/FormBuilderContext';
import { proposalQueryKeys } from './useProposals';
import { supabase } from '@/integrations/supabase/client';

interface GenerateGoogleDocParams {
  templateDocId: string;
  proposalId: string;
  organizationId: string;
  proposalData: {
    proposal_number?: string;
    project_name?: string;
    form_data?: {
      info?: {
        projectName?: string;
        proposalDate?: string;
        clientName?: string;
        clientCompany?: string;
        clientEmail?: string;
        clientPhone?: string;
        clientAddress?: string;
        jobLocation?: string;
      };
      generated_docs?: GeneratedDocVersion[];
      current_doc_version?: number;
    };
    organization?: {
      name?: string;
      phone_number?: string;
      fax_number?: string;
      company_address?: string;
      website?: string;
    } | null;
  };
  formData: FormBuilderData;
  outputTitle?: string;
  mode?: 'create' | 'overwrite';
  existingDocId?: string;
  version?: number;
}

/**
 * Hook for generating Google Docs from templates
 *
 * @returns Mutation for generating documents
 */
export function useGenerateGoogleDoc() {
  const queryClient = useQueryClient();

  return useMutation<GenerateDocResponse, Error, GenerateGoogleDocParams>({
    mutationFn: async ({
      templateDocId,
      proposalId,
      organizationId,
      proposalData,
      formData,
      outputTitle,
      mode,
      existingDocId,
      version,
    }) => {
      // CRITICAL: Fetch fresh proposal data from database to avoid stale data issues
      // The proposalData prop may be stale if user just saved but React Query hasn't refetched yet
      let freshProposalData = proposalData;

      if (proposalId) {
        const { data: freshData, error } = await supabase
          .from('proposals')
          .select(`
            id,
            proposal_number,
            project_name,
            form_data,
            organization:organizations(
              name,
              phone_number,
              fax_number,
              company_address,
              website
            )
          `)
          .eq('id', proposalId)
          .single();

        if (!error && freshData) {
          freshProposalData = {
            proposal_number: freshData.proposal_number,
            project_name: freshData.project_name,
            form_data: freshData.form_data as typeof proposalData.form_data,
            organization: freshData.organization as typeof proposalData.organization,
          };
          console.log('[useGenerateGoogleDoc] Using fresh data from database');
          console.log('[useGenerateGoogleDoc] Fresh info:', freshProposalData.form_data?.info);
          console.log('[useGenerateGoogleDoc] Fresh organization:', freshProposalData.organization);
          console.log('[useGenerateGoogleDoc] proposal_number:', freshProposalData.proposal_number);
        } else {
          console.warn('[useGenerateGoogleDoc] Failed to fetch fresh data, using stale props:', error);
        }
      }

      return generateProposalDoc(
        templateDocId,
        proposalId,
        organizationId,
        freshProposalData,
        formData,
        outputTitle,
        { mode, existingDocId, version }
      );
    },
    onSuccess: (data, variables) => {
      // Invalidate the proposal detail query to refetch with new google_doc_id and version
      queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.detail(variables.proposalId),
      });
      // Also invalidate lists in case they show version info
      queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.lists(),
      });
    },
  });
}

export default useGenerateGoogleDoc;
