/**
 * Google Docs Mode Component
 *
 * Handles the Google Docs integration for the Presentation tab.
 * Shows either:
 * - Empty state with template selection and "Generate Document" button
 * - Embedded Google Doc with variable panel
 */

import { useState, useCallback, useMemo } from 'react';
import {
  GoogleLogo,
  FilePlus,
  Spinner,
  Copy,
  Check,
  ArrowsClockwise,
  FileDoc,
  LinkSimple,
  Warning,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { GoogleDocsEmbed } from './GoogleDocsEmbed';
import { getAllFormVariables } from './VariableExtension';
import type { FormBuilderData, DocumentTemplate } from '../../context/FormBuilderContext';
import { useGenerateGoogleDoc } from '@/hooks/queries/useGenerateGoogleDoc';
import { useGoogleConnection } from '@/hooks/queries/useGoogleConnection';
import { cn } from '@/lib/utils';

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
  /** Whether the user can edit (has Google auth) */
  canEdit?: boolean;
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
  canEdit = false,
}: GoogleDocsModeProps) {
  const [showVariables, setShowVariables] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates.find(t => t.is_default)?.id || templates[0]?.id || ''
  );

  // Check if user has connected Google
  const { data: googleConnection, isLoading: isCheckingConnection } = useGoogleConnection(organizationId);
  const isGoogleConnected = googleConnection?.isConnected ?? false;

  // Get the generate mutation
  const generateMutation = useGenerateGoogleDoc();
  const isGenerating = generateMutation.isPending;

  // Get all available variables
  const variables = useMemo(() => getAllFormVariables(formData), [formData]);

  // Get selected template
  const selectedTemplate = useMemo(
    () => templates.find(t => t.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  // Handle variable selection - copy to clipboard for Google Docs
  const handleVariableSelect = useCallback((variableKey: string, _variableLabel: string) => {
    const placeholder = `{{${variableKey}}}`;
    navigator.clipboard.writeText(placeholder);
    setCopiedVariable(variableKey);
    toast.success('Variable copied!', {
      description: `Paste "${placeholder}" into your Google Doc`,
    });
    // Reset copied state after 2 seconds
    setTimeout(() => setCopiedVariable(null), 2000);
  }, []);

  // Handle document generation
  const handleGenerate = useCallback(async () => {
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

    // Build output title
    const outputTitle = proposalInfo?.projectName
      ? `${proposalInfo.projectName} - Proposal ${proposalInfo.proposalNumber || ''}`
      : `Proposal ${proposalInfo?.proposalNumber || proposalId}`;

    try {
      const result = await generateMutation.mutateAsync({
        templateDocId: selectedTemplate.google_doc_id,
        proposalId,
        organizationId,
        proposalData: proposalData || {},
        formData,
        outputTitle: outputTitle.trim(),
      });

      toast.success('Document generated!', {
        description: 'Your Google Doc is ready to edit',
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

  // Handle regeneration - regenerate from the same or new template
  const handleRegenerate = useCallback(async () => {
    // Use the provided callback if available, otherwise regenerate using our logic
    if (onRegenerate) {
      try {
        await onRegenerate();
      } catch (error) {
        console.error('Regeneration failed:', error);
        toast.error('Failed to regenerate document');
      }
      return;
    }

    // If no callback, generate a new document (same as handleGenerate)
    await handleGenerate();
  }, [onRegenerate, handleGenerate]);

  // No document yet - show generation UI
  if (!googleDocId) {
    const hasTemplates = templates.length > 0;

    // Show loading state while checking connection
    if (isCheckingConnection) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <Spinner className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-500">Checking Google connection...</p>
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

            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Create with Google Docs
            </h3>

            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Generate a professional proposal document from your data.
              Edit with the full power of Google Docs.
            </p>

            {/* Connected account info */}
            {googleConnection?.email && (
              <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 mb-4">
                <Check className="w-4 h-4" />
                <span>Team connected via {googleConnection.email}</span>
              </div>
            )}

            {/* Template Selection */}
            {hasTemplates ? (
              <div className="text-left mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Template
                </label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a template">
                      {selectedTemplate && (
                        <div className="flex items-center gap-2">
                          <FileDoc className="w-4 h-4 text-blue-500" />
                          <span>{selectedTemplate.name}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <FileDoc className="w-4 h-4 text-blue-500" />
                          <span>{template.name}</span>
                          {template.is_default && (
                            <span className="text-xs text-gray-400">(default)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm p-4 rounded-lg mb-6 text-left">
                <p className="font-medium mb-1">No templates configured</p>
                <p className="text-xs">
                  Add Google Docs templates in the Form Builder to enable document generation.
                </p>
              </div>
            )}

            {/* What will be included */}
            <div className="text-left bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Document will include:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1.5">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Client & project information
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  All products with specifications
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Pricing breakdown & totals
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Lead times & phases
                </li>
              </ul>
            </div>

            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={isGenerating || !hasTemplates || !selectedTemplate}
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

            <p className="text-xs text-gray-400 mt-4">
              You can edit and customize the document after generation
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Document exists - show embedded view with variable panel
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Editing: <span className="font-medium text-gray-700 dark:text-gray-300">
              {proposalInfo?.projectName || proposalInfo?.clientName || 'Proposal Document'}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Variables Panel Toggle */}
          <Button
            variant={showVariables ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowVariables(!showVariables)}
            className="text-xs"
          >
            <Copy className="w-4 h-4 mr-1.5" />
            Variables
          </Button>

          {/* Regenerate */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="text-xs"
          >
            <ArrowsClockwise className={cn('w-4 h-4 mr-1.5', isGenerating && 'animate-spin')} />
            Regenerate
          </Button>
        </div>
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
          />
        </div>

        {/* Variables Panel for Google Docs */}
        {showVariables && (
          <div className="w-72 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Insert Variables
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Click to copy, then paste into your document
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {Object.entries(variables).map(([category, vars]) => (
                <div key={category} className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    {category}
                  </h4>
                  <div className="space-y-1">
                    {vars.map((variable) => (
                      <button
                        key={variable.key}
                        onClick={() => handleVariableSelect(variable.key, variable.label)}
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded text-xs',
                          'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                          'flex items-center justify-between group',
                          copiedVariable === variable.key && 'bg-green-50 dark:bg-green-900/20'
                        )}
                      >
                        <span className="text-gray-700 dark:text-gray-300">
                          {variable.label}
                        </span>
                        {copiedVariable === variable.key ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GoogleDocsMode;
