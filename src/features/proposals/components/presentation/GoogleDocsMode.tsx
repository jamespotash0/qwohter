/**
 * Google Docs Mode Component
 *
 * Handles the Google Docs integration for the Presentation tab.
 * Shows either:
 * - Empty state with template selection and "Generate Document" button
 * - Embedded Google Doc with toolbar
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  GoogleLogo,
  FilePlus,
  Spinner,
  Check,
  ArrowClockwise,
  ArrowsClockwise,
  LinkSimple,
  Warning,
  ArrowSquareOut,
  Trash,
  Info,
  PaperPlaneTilt,
  DownloadSimple,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';
import { GoogleDocsEmbed } from './GoogleDocsEmbed';
import { VersionDialog, type VersionMode } from './VersionDialog';
import { DriveFilePicker } from './DriveFilePicker';
import type { DriveFile } from '@/hooks/queries/useDriveFiles';
import type { FormBuilderData, DocumentTemplate } from '../../context/FormBuilderContext';
import type { GeneratedDocVersion } from '@/services/googleDocsService';
import { useGenerateGoogleDoc } from '@/hooks/queries/useGenerateGoogleDoc';
import { useGoogleConnection } from '@/hooks/queries/useGoogleConnection';
import { useCheckGoogleDoc } from '@/hooks/queries/useCheckGoogleDoc';
import { useConnectedIntegrations } from '@/hooks/useIntegrations';
import { cn } from '@/lib/utils';
import { SendForSignatureDialog } from '@/components/features/signing/SendForSignatureDialog';

interface GoogleDocsModeProps {
  /** Google Doc ID if one exists */
  googleDocId?: string | null;
  /** The form data for variable resolution */
  formData: FormBuilderData;
  /** Proposal ID for saving the generated doc */
  proposalId?: string;
  /** Organization ID for OAuth token lookup */
  organizationId?: string;
  /** Full proposal data for variable resolution */
  proposalData?: {
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
  /** Proposal info for display */
  proposalInfo?: {
    projectName?: string;
    clientName?: string;
    proposalNumber?: string;
  };
  /** Available templates from the form */
  templates?: DocumentTemplate[];
  /** Callback when a document is generated */
  onDocGenerated?: (docId: string) => void;
  /** Callback when document should be regenerated */
  onRegenerate?: () => Promise<void>;
  /** Callback to unlink/remove the document */
  onUnlinkDocument?: () => void;
  /** Whether the user can edit (has Google auth) */
  canEdit?: boolean;
  /** Callback to save current form state before generation - ensures latest data is used */
  onBeforeGenerate?: () => Promise<void>;
}

export function GoogleDocsMode({
  googleDocId,
  formData,
  proposalId,
  organizationId,
  proposalData,
  proposalInfo,
  templates = [],
  onDocGenerated,
  onRegenerate,
  onUnlinkDocument,
  canEdit = false,
  onBeforeGenerate,
}: GoogleDocsModeProps) {
  const [selectedTemplateFile, setSelectedTemplateFile] = useState<DriveFile | null>(null);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [activeAction, setActiveAction] = useState<'update' | 'regenerate' | null>(null);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [showLinkExisting, setShowLinkExisting] = useState(false);
  const [selectedExistingDoc, setSelectedExistingDoc] = useState<DriveFile | null>(null);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);

  // Check if user has connected Google - check BOTH sources
  // 1. google_oauth_tokens table (has actual tokens for API calls)
  const { data: googleConnection, isLoading: isCheckingTokens } = useGoogleConnection(organizationId);

  // 2. integrations table (tracks connection status - same as IntegrationsTab)
  const { data: connectedIntegrations = [], isLoading: isCheckingIntegrations } = useConnectedIntegrations(organizationId || '');
  const googleIntegration = connectedIntegrations.find(i => i.integration_type === 'google_docs');

  // Consider connected if EITHER source says connected
  // Token source is preferred (has actual credentials), but integration status is fallback
  const isGoogleConnected = googleConnection?.isConnected || googleIntegration?.is_connected || false;

  // Show loading while organizationId is not yet available (still loading from parent)
  const isWaitingForOrg = !organizationId;
  const isCheckingConnection = isCheckingTokens || isCheckingIntegrations;

  // Get the generate mutation
  const generateMutation = useGenerateGoogleDoc();
  const isGenerating = generateMutation.isPending;

  // Clear active action when generation completes
  useEffect(() => {
    if (!isGenerating) {
      setActiveAction(null);
    }
  }, [isGenerating]);

  // Check if linked document still exists (auto-unlink if deleted)
  const { data: docCheck } = useCheckGoogleDoc(googleDocId, organizationId);

  // Auto-unlink when document is deleted/inaccessible
  useEffect(() => {
    if (googleDocId && docCheck && !docCheck.exists && !docCheck.accessible) {
      // Document no longer exists - auto unlink
      onUnlinkDocument?.();
      toast.info('Document automatically unlinked', {
        description: docCheck.error || 'The linked document is no longer accessible',
      });
    }
  }, [googleDocId, docCheck, onUnlinkDocument]);

  // Get version information from proposal data
  const generatedDocs = proposalData?.form_data?.generated_docs || [];
  const currentVersion = proposalData?.form_data?.current_doc_version || 1;
  // A document exists if we have a googleDocId - don't require generated_docs history
  const hasExistingDoc = !!googleDocId;

  // Convert selected DriveFile to template-like object for generation
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateFile) return null;
    return {
      id: selectedTemplateFile.id,
      name: selectedTemplateFile.name,
      google_doc_id: selectedTemplateFile.id, // DriveFile.id IS the google doc ID
    };
  }, [selectedTemplateFile]);

  // Handle document generation with optional version parameters
  const handleGenerate = useCallback(async (options?: {
    mode?: VersionMode;
    existingDocId?: string;
    version?: number;
  }) => {
    // Validate Google connection
    if (!isGoogleConnected) {
      toast.error('Google not connected', {
        description: 'An admin needs to connect Google in Settings → Integrations',
      });
      return;
    }

    // Validate we have required data
    if (!selectedTemplate) {
      toast.error('No template selected', {
        description: 'Please select a Google Docs template to generate from',
      });
      return;
    }

    if (!proposalId) {
      toast.error('Proposal not saved', {
        description: 'Please save the proposal before generating a document',
      });
      return;
    }

    if (!organizationId) {
      toast.error('Organization not found', {
        description: 'Unable to determine organization',
      });
      return;
    }

    // Build output title - use proposal number if available
    const outputTitle = proposalInfo?.proposalNumber
      ? proposalInfo.proposalNumber
      : proposalInfo?.projectName
        ? `${proposalInfo.projectName}`
        : `Proposal-${proposalId}`;

    // Determine version number
    const version = options?.version ?? 1;

    // Log which template is being used
    console.log('[GoogleDocsMode] Generating with template:', {
      templateName: selectedTemplate.name,
      templateId: selectedTemplate.id,
      googleDocId: selectedTemplate.google_doc_id,
      availableTemplates: templates.map(t => ({ name: t.name, id: t.id, google_doc_id: t.google_doc_id })),
    });

    try {
      const result = await generateMutation.mutateAsync({
        templateDocId: selectedTemplate.google_doc_id,
        proposalId,
        organizationId,
        proposalData: proposalData || {},
        formData,
        outputTitle: outputTitle.trim(),
        mode: options?.mode,
        existingDocId: options?.existingDocId,
        version,
      });

      const actionLabel = options?.mode === 'overwrite' ? 'Document updated!' : 'Document generated!';
      const versionLabel = `Version ${result.version || version}`;

      toast.success(actionLabel, {
        description: `${versionLabel} is ready to edit`,
        action: {
          label: 'Open',
          onClick: () => window.open(result.docUrl, '_blank'),
        },
      });

      onDocGenerated?.(result.docId);
    } catch (error) {
      console.error('Document generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if needs reconnection
      if (errorMessage.includes('connect') || errorMessage.includes('reconnect')) {
        toast.error('Google connection expired', {
          description: 'An admin needs to reconnect Google in Settings → Integrations',
        });
      } else {
        toast.error('Failed to generate document', {
          description: errorMessage,
        });
      }
    }
  }, [selectedTemplate, proposalId, organizationId, proposalInfo, proposalData, formData, generateMutation, onDocGenerated, isGoogleConnected]);

  // Handle regeneration - show version dialog if document exists
  const handleRegenerate = useCallback(() => {
    // If there's an existing document, show the version dialog
    if (hasExistingDoc) {
      setActiveAction('regenerate');
      setShowVersionDialog(true);
      return;
    }

    // No existing doc, just generate (shouldn't happen but handle it)
    setActiveAction('regenerate');
    handleGenerate();
  }, [hasExistingDoc, handleGenerate]);

  // Handle direct update values (preserves comments)
  const handleUpdateValues = useCallback(async () => {
    if (!googleDocId) return;

    setActiveAction('update');
    await handleGenerate({
      mode: 'update',
      existingDocId: googleDocId,
      version: currentVersion,
    });
  }, [handleGenerate, googleDocId, currentVersion]);

  // Handle version mode selection from dialog
  const handleVersionSelect = useCallback(async (mode: VersionMode) => {
    if (mode === 'update') {
      // Update: update values in existing doc (preserves comments)
      await handleGenerate({
        mode: 'update',
        existingDocId: googleDocId || undefined,
        version: currentVersion,
      });
    } else if (mode === 'overwrite') {
      // Overwrite: delete old doc and create new with same version
      await handleGenerate({
        mode: 'overwrite',
        existingDocId: googleDocId || undefined,
        version: currentVersion,
      });
    } else {
      // Create new version
      await handleGenerate({
        mode: 'create',
        version: currentVersion + 1,
      });
    }
    setShowVersionDialog(false);
  }, [handleGenerate, googleDocId, currentVersion]);

  // Build the Google Doc URL (define before early return to keep hooks consistent)
  const googleDocUrl = googleDocId
    ? `https://docs.google.com/document/d/${googleDocId}/edit`
    : '';

  // Handle copy link to clipboard (must be defined before early return)
  const handleCopyLink = useCallback(() => {
    if (googleDocUrl) {
      navigator.clipboard.writeText(googleDocUrl);
      toast.success('URL copied');
    }
  }, [googleDocUrl]);

  // Handle open in new tab (must be defined before early return)
  const handleOpenInNewTab = useCallback(() => {
    if (googleDocUrl) {
      window.open(googleDocUrl, '_blank');
    }
  }, [googleDocUrl]);

  // Handle download (must be defined before early return)
  const handleDownload = useCallback((format: 'pdf' | 'docx') => {
    if (googleDocId) {
      // Google Docs export URL format
      const exportUrl = `https://docs.google.com/document/d/${googleDocId}/export?format=${format}`;

      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = exportUrl;
      link.target = '_blank';
      // Set download attribute with filename
      const baseName = proposalInfo?.proposalNumber
        ? proposalInfo.proposalNumber
        : proposalInfo?.projectName
          ? proposalInfo.projectName
          : 'proposal';
      link.download = `${baseName}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`${format.toUpperCase()} download started`, {
        description: 'Check your downloads folder',
      });
    }
  }, [googleDocId, proposalInfo]);

  // Handle unlink confirmation
  const handleUnlinkConfirm = useCallback(() => {
    setShowUnlinkDialog(false);
    onUnlinkDocument?.();
    toast.success('Document unlinked', {
      description: 'You can generate a new document anytime',
    });
  }, [onUnlinkDocument]);

  // Handle linking an existing document from Drive picker
  const handleLinkExisting = useCallback(() => {
    if (!selectedExistingDoc) {
      toast.error('No document selected', {
        description: 'Please select a document from your Google Drive',
      });
      return;
    }

    // Call the onDocGenerated callback with the selected doc ID
    onDocGenerated?.(selectedExistingDoc.id);
    setSelectedExistingDoc(null);
    setShowLinkExisting(false);
    toast.success('Document linked!', {
      description: `"${selectedExistingDoc.name}" is now connected to this proposal`,
    });
  }, [selectedExistingDoc, onDocGenerated]);

  // No document yet - show generation UI
  if (!googleDocId) {
    const hasTemplates = templates.length > 0;

    // Show loading state while checking connection or waiting for org data
    if (isCheckingConnection || isWaitingForOrg) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <Spinner className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-500">
                {isWaitingForOrg ? 'Loading organization...' : 'Checking Google connection...'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Show connect prompt if not connected
    if (!isGoogleConnected) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center max-w-md p-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <Warning className="w-10 h-10 text-amber-500" weight="bold" />
              </div>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Google Docs Not Connected
              </h3>

              <p className="text-gray-500 dark:text-gray-400 mb-6">
                To generate Google Docs proposals, an admin needs to connect the organization's Google account.
                Documents will be created in your team's shared folder.
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm p-4 rounded-lg mb-6 text-left">
                <p className="font-medium mb-1">For Admins:</p>
                <ol className="text-xs space-y-1 list-decimal list-inside">
                  <li>Go to <strong>Settings → Integrations</strong></li>
                  <li>Find "Google Docs" and click Connect</li>
                  <li>Enter your shared folder ID and sign in</li>
                  <li>All team members can then generate documents</li>
                </ol>
              </div>

              <Button
                size="lg"
                variant="outline"
                onClick={() => window.open('/settings?tab=integrations', '_blank')}
                className="w-full"
              >
                <LinkSimple className="w-5 h-5 mr-2" />
                Go to Integrations
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        {/* Empty state */}
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center max-w-md p-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <GoogleLogo className="w-10 h-10 text-blue-500" weight="bold" />
            </div>

            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                {showLinkExisting ? 'Link Existing Document' : 'Create with Google Docs'}
              </h3>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-center transition-transform hover:scale-125"
                    >
                      <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs p-3">
                    <p className="font-medium mb-1">How it works</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Generate a professional proposal document using your template.
                      The document is created in your team's Google Drive with all proposal data filled in.
                    </p>
                    <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside">
                      <li>Select a template to use</li>
                      <li>Click "Generate" to create the doc</li>
                      <li>Edit directly in Google Docs</li>
                      <li>Regenerate anytime with updated data</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {showLinkExisting
                ? 'Connect an existing Google Doc to this proposal.'
                : 'Generate a professional proposal document from your data.'}
            </p>

            {/* Connected account info */}
            {(googleConnection?.email || googleIntegration?.settings?.connected_email) && (
              <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 mb-4">
                <Check className="w-4 h-4" />
                <span>Team connected via {googleConnection?.email || googleIntegration?.settings?.connected_email}</span>
              </div>
            )}

            {showLinkExisting ? (
              /* Link Existing Document UI */
              <>
                <div className="text-left mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Document from Drive
                  </label>
                  <DriveFilePicker
                    organizationId={organizationId}
                    value={selectedExistingDoc?.id}
                    onSelect={setSelectedExistingDoc}
                    placeholder="Search for proposal documents..."
                    excludeTemplates
                  />
                  {selectedExistingDoc && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1.5">
                      Selected: {selectedExistingDoc.name}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      setShowLinkExisting(false);
                      setSelectedExistingDoc(null);
                    }}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleLinkExisting}
                    disabled={!selectedExistingDoc}
                    className="flex-1"
                  >
                    <LinkSimple className="w-5 h-5 mr-2" />
                    Link Document
                  </Button>
                </div>
              </>
            ) : (
              /* Generate from Template UI */
              <>
                {/* Template Selection - searches Drive for [TEMPLATE] files */}
                <div className="text-left mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Template
                  </label>
                  <DriveFilePicker
                    organizationId={organizationId}
                    value={selectedTemplateFile?.id}
                    onSelect={setSelectedTemplateFile}
                    placeholder="Search for templates..."
                    templateOnly
                  />
                  {selectedTemplateFile && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1.5">
                      Selected: {selectedTemplateFile.name}
                    </p>
                  )}
                </div>

                <Button
                  size="lg"
                  onClick={() => handleGenerate()}
                  disabled={isGenerating || !selectedTemplate}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Spinner className="w-5 h-5 mr-2 animate-spin" />
                      Generating Document...
                    </>
                  ) : (
                    <>
                      <FilePlus className="w-5 h-5 mr-2" />
                      Generate Google Doc
                    </>
                  )}
                </Button>

                {/* Divider and Link Existing option */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  <span className="text-xs text-gray-400">or</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                </div>

                <Button
                  variant="ghost"
                  onClick={() => setShowLinkExisting(true)}
                  className="w-full text-gray-600 dark:text-gray-400"
                >
                  <LinkSimple className="w-4 h-4 mr-2" />
                  Link Existing Document
                </Button>
              </>
            )}
          </div>
        </div>

      </div>
    );
  }

  // Document exists - show embedded view with variable panel
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* Left side - Google logo, title, version, and help */}
        <div className="flex items-center gap-2">
          <GoogleLogo className="w-5 h-5 text-blue-500" weight="bold" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {proposalInfo?.proposalNumber || proposalInfo?.projectName || 'Google Docs'}
          </span>
          {currentVersion > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
              v{currentVersion}
            </span>
          )}
          {/* Help info tooltip */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="ml-1 flex items-center justify-center transition-transform hover:scale-125"
                >
                  <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs p-3">
                <p className="font-medium mb-1">Presentation Document</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This Google Doc was generated from your proposal data. Edit directly in the document,
                  or use the regenerate button to update with the latest proposal information.
                  Changes made in Google Docs are saved automatically.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Right side - Icon buttons */}
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-3">
            {/* Update Values (preserves comments) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleUpdateValues}
                  disabled={isGenerating}
                  className="transition-transform hover:scale-125 disabled:opacity-50"
                >
                  <ArrowsClockwise className={cn('w-4 h-4 text-gray-500 dark:text-gray-400', isGenerating && activeAction === 'update' && 'animate-spin')} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Update Values</TooltipContent>
            </Tooltip>

            {/* Regenerate */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="transition-transform hover:scale-125 disabled:opacity-50"
                >
                  <ArrowClockwise className={cn('w-4 h-4 text-gray-500 dark:text-gray-400', isGenerating && activeAction === 'regenerate' && 'animate-spin')} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Regenerate</TooltipContent>
            </Tooltip>

            {/* Copy Link */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="transition-transform hover:scale-125"
                >
                  <LinkSimple className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Copy Link</TooltipContent>
            </Tooltip>

            {/* Open in New Tab */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="transition-transform hover:scale-125"
                >
                  <ArrowSquareOut className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Open in New Tab</TooltipContent>
            </Tooltip>

            {/* Download Menu */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="transition-transform hover:scale-125"
                    >
                      <DownloadSimple className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                  Download as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload('docx')}>
                  Download as DOCX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Send for Signature */}
            {proposalId && organizationId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setShowSignatureDialog(true)}
                    className="transition-transform hover:scale-125"
                  >
                    <PaperPlaneTilt className="w-4 h-4 text-green-500 hover:text-green-600" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Send for Signature</TooltipContent>
              </Tooltip>
            )}

            {/* Unlink Document */}
            {onUnlinkDocument && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setShowUnlinkDialog(true)}
                    className="transition-transform hover:scale-125"
                  >
                    <Trash className="w-4 h-4 text-red-400 hover:text-red-500" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Unlink Document</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Embedded Google Doc */}
        <div className="flex-1">
          <GoogleDocsEmbed
            docId={googleDocId}
            canEdit={canEdit}
            title={proposalInfo?.projectName || 'Proposal'}
            isGenerating={isGenerating}
            onUnlink={() => {
              // Auto-unlink when document is not accessible
              onUnlinkDocument?.();
              toast.info('Document unlinked', {
                description: 'The document was not accessible and has been unlinked',
              });
            }}
          />
        </div>
      </div>

      {/* Version Dialog for regeneration */}
      <VersionDialog
        isOpen={showVersionDialog}
        onClose={() => {
          setShowVersionDialog(false);
          setActiveAction(null);
        }}
        onSelect={handleVersionSelect}
        currentVersion={currentVersion}
        isLoading={isGenerating}
      />

      {/* Unlink Confirmation Dialog */}
      <AlertDialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Document?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will remove the link between this proposal and the Google Doc.
              </p>
              <p className="text-sm">
                <strong>What happens:</strong>
              </p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>The Google Doc will remain in your Google Drive</li>
                <li>You can generate a new document with updated data</li>
                <li>Any edits made in Google Docs will be preserved there</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlinkConfirm}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Unlink Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send for Signature Dialog */}
      {proposalId && organizationId && (
        <SendForSignatureDialog
          isOpen={showSignatureDialog}
          onClose={() => setShowSignatureDialog(false)}
          proposalId={proposalId}
          organizationId={organizationId}
          organizationName={proposalData?.organization?.name}
          proposalNumber={proposalInfo?.proposalNumber}
          projectName={proposalInfo?.projectName}
          defaultClientEmail={proposalData?.form_data?.info?.clientEmail}
          defaultClientName={proposalData?.form_data?.info?.clientName}
          defaultClientCompany={proposalData?.form_data?.info?.clientCompany}
        />
      )}
    </div>
  );
}

export default GoogleDocsMode;
