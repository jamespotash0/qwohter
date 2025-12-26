/**
 * Google Docs Mode Component
 *
 * Handles the Google Docs integration for the Presentation tab.
 * Shows either:
 * - Empty state with "Generate Document" button
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
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { GoogleDocsEmbed } from './GoogleDocsEmbed';
import { VariablePanel } from './VariablePanel';
import { getAllFormVariables } from './VariableExtension';
import type { FormBuilderData } from '../../context/FormBuilderContext';
import { cn } from '@/lib/utils';

interface GoogleDocsModeProps {
  /** Google Doc ID if one exists */
  googleDocId?: string | null;
  /** The form data for variable resolution */
  formData: FormBuilderData;
  /** Proposal info for display */
  proposalInfo?: {
    projectName?: string;
    clientName?: string;
    proposalNumber?: string;
  };
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
  proposalInfo,
  onDocGenerated,
  onRegenerate,
  canEdit = false,
}: GoogleDocsModeProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  // Get all available variables
  const variables = useMemo(() => getAllFormVariables(formData), [formData]);

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
    setIsGenerating(true);
    try {
      // TODO: Call Supabase Edge Function to generate the document
      // For now, show a placeholder message
      toast.info('Google Docs Integration', {
        description: 'Document generation will be implemented with the Edge Function',
      });

      // Simulate generation delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // In real implementation:
      // const { data } = await supabase.functions.invoke('generate-google-doc', {
      //   body: { proposalId, templateDocId }
      // });
      // onDocGenerated?.(data.docId);

    } catch (error) {
      console.error('Document generation failed:', error);
      toast.error('Failed to generate document', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Handle regeneration
  const handleRegenerate = useCallback(async () => {
    if (onRegenerate) {
      setIsGenerating(true);
      try {
        await onRegenerate();
      } finally {
        setIsGenerating(false);
      }
    }
  }, [onRegenerate]);

  // No document yet - show generation UI
  if (!googleDocId) {
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
              disabled={isGenerating}
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
