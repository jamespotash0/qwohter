/**
 * Presentation Tab
 *
 * Google Docs integration for creating proposal presentations.
 * Templates are selected and documents are generated from proposal data.
 */

import { useCallback, useMemo } from 'react';
import type { EditorMode } from '../ProposalEditor';
import { useFormBuilder, type DocumentTemplate } from '../../context/FormBuilderContext';
import { GoogleDocsMode, PresentationBuilderConfig } from '../presentation';

interface ProposalData {
  id?: string;
  proposal_number?: string;
  project_name?: string;
  google_doc_id?: string | null;
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
  };
  organization?: {
    name?: string;
    phone_number?: string;
    fax_number?: string;
    company_address?: string;
    website?: string;
    industry?: string;
  } | null;
}

interface PresentationTabProps {
  mode: EditorMode;
  onDirtyChange?: (isDirty: boolean) => void;
  proposalData?: ProposalData;
  /** Proposal ID for Google Docs generation */
  proposalId?: string;
  /** Organization ID for Google OAuth */
  organizationId?: string;
  /** Callback when Google Doc is generated */
  onGoogleDocGenerated?: (docId: string) => void;
  /** Callback when Google Doc is unlinked */
  onGoogleDocUnlinked?: () => void;
  /** Whether user has Google Auth for editing */
  hasGoogleAuth?: boolean;
  /** Google Docs templates from form metadata (for filler mode) */
  formTemplates?: DocumentTemplate[];
}

export function PresentationTab({
  mode,
  onDirtyChange,
  proposalData,
  proposalId,
  organizationId,
  onGoogleDocGenerated,
  onGoogleDocUnlinked,
  hasGoogleAuth = false,
  formTemplates,
}: PresentationTabProps) {
  const isBuilderMode = mode === 'builder';
  const { data } = useFormBuilder();

  // Handle Google Doc generation
  const handleGoogleDocGenerated = useCallback((docId: string) => {
    onGoogleDocGenerated?.(docId);
    onDirtyChange?.(true);
  }, [onGoogleDocGenerated, onDirtyChange]);

  // Handle Google Doc unlink
  const handleGoogleDocUnlinked = useCallback(() => {
    onGoogleDocUnlinked?.();
    onDirtyChange?.(true);
  }, [onGoogleDocUnlinked, onDirtyChange]);

  // Extract info data for display
  const infoData = useMemo(() => proposalData?.form_data?.info, [proposalData?.form_data?.info]);

  // Builder mode: Show configuration UI for presentation settings
  if (isBuilderMode) {
    return <PresentationBuilderConfig />;
  }

  // Google Docs mode only
  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] -mx-6 -mt-6">
      <GoogleDocsMode
        googleDocId={proposalData?.google_doc_id}
        formData={data}
        proposalId={proposalId || proposalData?.id}
        organizationId={organizationId}
        proposalData={proposalData}
        proposalInfo={{
          projectName: infoData?.projectName,
          clientName: infoData?.clientName,
          proposalNumber: proposalData?.proposal_number,
        }}
        templates={formTemplates || data.presentation?.templates}
        onDocGenerated={handleGoogleDocGenerated}
        onUnlinkDocument={handleGoogleDocUnlinked}
        canEdit={hasGoogleAuth}
      />
    </div>
  );
}

export default PresentationTab;
