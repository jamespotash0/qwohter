/**
 * Presentation Tab
 *
 * Google Docs integration for creating proposal presentations.
 * Templates are selected and documents are generated from proposal data.
 */

import { useState, useCallback, useMemo } from 'react';
import { BracketsCurly } from '@phosphor-icons/react';
import type { EditorMode } from '../ProposalEditor';
import { useFormBuilder, type DocumentTemplate } from '../../context/FormBuilderContext';
import { GoogleDocsMode, PresentationBuilderConfig } from '../presentation';
import { VariablesReferencePanel } from '../presentation/VariablesReferencePanel';
import { cn } from '@/lib/utils';

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
  /** Callback to save current form state before generation */
  onBeforeGenerate?: () => Promise<void>;
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
  onBeforeGenerate,
}: PresentationTabProps) {
  const isBuilderMode = mode === 'builder';
  const { data } = useFormBuilder();
  const [showVariables, setShowVariables] = useState(false);

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

  // Google Docs mode only - extend to fill available space
  return (
    <div className="flex h-[calc(100vh-56px)] min-h-[500px] -mx-6 -mt-6 -mb-6">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
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
          onBeforeGenerate={onBeforeGenerate}
        />
      </div>

      {/* Variables toggle button (when panel is closed) */}
      {!showVariables && (
        <button
          onClick={() => setShowVariables(true)}
          className={cn(
            'absolute right-0 top-1/2 -translate-y-1/2 z-10',
            'flex items-center gap-1 px-1.5 py-3',
            'bg-blue-600 hover:bg-blue-700 text-white',
            'rounded-l-md shadow-md transition-colors',
            'writing-mode-vertical'
          )}
          style={{ writingMode: 'vertical-rl' }}
          title="Show template variables"
        >
          <BracketsCurly className="w-4 h-4 rotate-90" />
          <span className="text-[10px] font-medium tracking-wider uppercase">Variables</span>
        </button>
      )}

      {/* Variables Reference Panel */}
      {showVariables && (
        <VariablesReferencePanel
          formData={data}
          onClose={() => setShowVariables(false)}
        />
      )}
    </div>
  );
}

export default PresentationTab;
