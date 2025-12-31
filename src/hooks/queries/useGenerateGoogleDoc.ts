/**
 * useGenerateGoogleDoc Hook
 *
 * React hook for generating Google Docs from templates.
 * Wraps the googleDocsService with React Query mutations.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateProposalDoc, type GenerateDocResponse, type GeneratedDocVersion } from '@/services/googleDocsService';
import type { FormBuilderData } from '@/features/proposals/context/FormBuilderContext';

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
      return generateProposalDoc(
        templateDocId,
        proposalId,
        organizationId,
        proposalData,
        formData,
        outputTitle,
        { mode, existingDocId, version }
      );
    },
    onSuccess: (data, variables) => {
      // Invalidate the proposal query to refetch with new google_doc_id
      queryClient.invalidateQueries({
        queryKey: ['proposal', variables.proposalId],
      });
    },
  });
}

export default useGenerateGoogleDoc;
