/**
 * useGenerateGoogleDoc Hook
 *
 * React hook for generating Google Docs from templates.
 * Wraps the googleDocsService with React Query mutations.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateProposalDoc, type GenerateDocResponse, type GeneratedDocVersion } from '@/services/googleDocsService';
import type { FormBuilderData } from '@/features/proposals/context/FormBuilderContext';
import { proposalQueryKeys } from './useProposals';

interface OrganizationData {
  name?: string;
  phone_number?: string;
  fax_number?: string;
  company_address?: string;
  website?: string;
}

interface ProposalFormData {
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
}

interface ProposalData {
  proposal_number?: string;
  project_name?: string;
  form_data?: ProposalFormData;
  organization?: OrganizationData | null;
}

interface GenerateGoogleDocParams {
  templateDocId: string;
  proposalId: string;
  organizationId: string;
  proposalData: ProposalData;
  formData: FormBuilderData;
  outputTitle?: string;
  mode?: 'create' | 'overwrite' | 'update';
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
    onSuccess: (_, variables) => {
      // Invalidate the proposal detail query to refetch with new google_doc_id and version
      queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.detail(variables.proposalId),
      });
      // Also invalidate lists in case they show version info
      queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.lists(),
      });
    },
    onError: (_, variables) => {
      // Invalidate google connection status so UI reflects any token issues
      queryClient.invalidateQueries({
        queryKey: ['google-connection', variables.organizationId],
      });
    },
  });
}

export default useGenerateGoogleDoc;
