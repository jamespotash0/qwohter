/**
 * Presentation Builder Configuration
 *
 * Builder mode UI for configuring presentation tab settings:
 * - Enable/disable Rich Text editor
 * - Enable/disable Google Docs integration
 * - Manage Google Docs templates for this form
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Plus,
  Trash2,
  FileText,
  Star,
  ExternalLink,
  Loader2,
  AlertCircle,
  Settings2,
} from 'lucide-react';
import { GoogleLogo, TextAa } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useFormBuilder } from '../../context/FormBuilderContext';

// Template interface
interface DocumentTemplate {
  id: string;
  name: string;
  google_doc_id: string;
  google_doc_url: string;
  is_default: boolean;
  created_at: string;
}

// Extract Google Doc ID from URL
function extractGoogleDocId(url: string): string | null {
  const patterns = [
    /\/document\/d\/([a-zA-Z0-9-_]+)/,
    /id=([a-zA-Z0-9-_]+)/,
    /^([a-zA-Z0-9-_]{25,})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function PresentationBuilderConfig() {
  const { config, updateConfig, data, setPresentationData } = useFormBuilder();
  const presentationConfig = config.tabs.presentation;

  // Mode toggles with defaults
  const enableRichText = presentationConfig.enableRichText ?? true;
  const enableGoogleDocs = presentationConfig.enableGoogleDocs ?? false;
  const defaultMode = presentationConfig.defaultMode ?? 'richtext';

  // Templates state (stored in presentation data)
  const [templates, setTemplates] = useState<DocumentTemplate[]>(() => {
    // Load templates from presentation data if available
    const storedTemplates = (data.presentation as any)?.templates;
    return Array.isArray(storedTemplates) ? storedTemplates : [];
  });

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for add dialog
  const [templateName, setTemplateName] = useState('');
  const [templateUrl, setTemplateUrl] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Sync templates to presentation data
  useEffect(() => {
    setPresentationData({
      ...data.presentation,
      sections: data.presentation?.sections || [],
      templates: templates,
    } as any);
  }, [templates]);

  // Handle mode toggle
  const handleRichTextToggle = useCallback((enabled: boolean) => {
    // At least one mode must be enabled
    if (!enabled && !enableGoogleDocs) {
      toast.error('At least one presentation mode must be enabled');
      return;
    }

    updateConfig({
      ...config,
      tabs: {
        ...config.tabs,
        presentation: {
          ...presentationConfig,
          enableRichText: enabled,
          // If disabling rich text, switch default to google-docs
          defaultMode: !enabled ? 'google-docs' : defaultMode,
        },
      },
    });
  }, [config, presentationConfig, enableGoogleDocs, defaultMode, updateConfig]);

  const handleGoogleDocsToggle = useCallback((enabled: boolean) => {
    // At least one mode must be enabled
    if (!enabled && !enableRichText) {
      toast.error('At least one presentation mode must be enabled');
      return;
    }

    updateConfig({
      ...config,
      tabs: {
        ...config.tabs,
        presentation: {
          ...presentationConfig,
          enableGoogleDocs: enabled,
          // If disabling google docs, switch default to richtext
          defaultMode: !enabled ? 'richtext' : defaultMode,
        },
      },
    });
  }, [config, presentationConfig, enableRichText, defaultMode, updateConfig]);

  const handleDefaultModeChange = useCallback((mode: 'richtext' | 'google-docs') => {
    updateConfig({
      ...config,
      tabs: {
        ...config.tabs,
        presentation: {
          ...presentationConfig,
          defaultMode: mode,
        },
      },
    });
  }, [config, presentationConfig, updateConfig]);

  // Validate URL and extract Doc ID
  const handleUrlChange = useCallback((url: string) => {
    setTemplateUrl(url);
    setUrlError(null);

    if (url.trim()) {
      const docId = extractGoogleDocId(url);
      if (!docId) {
        setUrlError('Invalid Google Docs URL. Please paste a valid document link.');
      }
    }
  }, []);

  // Handle add template
  const handleAddTemplate = useCallback(async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    const docId = extractGoogleDocId(templateUrl);
    if (!docId) {
      setUrlError('Invalid Google Docs URL');
      return;
    }

    setIsSaving(true);
    try {
      // Check if this is the first template
      const shouldBeDefault = isDefault || templates.length === 0;

      const newTemplate: DocumentTemplate = {
        id: crypto.randomUUID(),
        name: templateName.trim(),
        google_doc_id: docId,
        google_doc_url: templateUrl,
        is_default: shouldBeDefault,
        created_at: new Date().toISOString(),
      };

      // If setting as default, update other templates
      if (newTemplate.is_default) {
        setTemplates(prev => [
          ...prev.map(t => ({ ...t, is_default: false })),
          newTemplate,
        ]);
      } else {
        setTemplates(prev => [...prev, newTemplate]);
      }

      setShowAddDialog(false);
      setTemplateName('');
      setTemplateUrl('');
      setIsDefault(false);
      toast.success('Template added successfully');
    } catch (error) {
      console.error('Failed to add template:', error);
      toast.error('Failed to add template');
    } finally {
      setIsSaving(false);
    }
  }, [templateName, templateUrl, isDefault, templates]);

  // Handle delete template
  const handleDeleteTemplate = useCallback(async () => {
    if (!templateToDelete) return;

    setIsSaving(true);
    try {
      setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      setShowDeleteDialog(false);
      setTemplateToDelete(null);
      toast.success('Template deleted');
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    } finally {
      setIsSaving(false);
    }
  }, [templateToDelete]);

  // Handle set as default
  const handleSetDefault = useCallback((template: DocumentTemplate) => {
    setTemplates(prev =>
      prev.map(t => ({ ...t, is_default: t.id === template.id }))
    );
    toast.success(`${template.name} set as default template`);
  }, []);

  // Open template in Google Docs
  const openTemplate = useCallback((template: DocumentTemplate) => {
    window.open(
      `https://docs.google.com/document/d/${template.google_doc_id}/edit`,
      '_blank'
    );
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] -mx-6 -mt-6 overflow-auto">
      <div className="max-w-4xl mx-auto w-full p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
            <Settings2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Presentation Configuration
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure presentation modes and templates for this form
            </p>
          </div>
        </div>

        {/* Mode Configuration Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Presentation Modes
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Choose which presentation options are available when creating proposals with this form.
          </p>

          <div className="space-y-4">
            {/* Rich Text Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30">
                  <TextAa className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Rich Text Editor</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Built-in word processor with formatting, tables, and variables
                  </p>
                </div>
              </div>
              <Switch
                checked={enableRichText}
                onCheckedChange={handleRichTextToggle}
              />
            </div>

            {/* Google Docs Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                  <GoogleLogo className="w-5 h-5 text-blue-600 dark:text-blue-400" weight="bold" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Google Docs</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Generate proposals from Google Docs templates with variable replacement
                  </p>
                </div>
              </div>
              <Switch
                checked={enableGoogleDocs}
                onCheckedChange={handleGoogleDocsToggle}
              />
            </div>

            {/* Default Mode Selector (only show when both are enabled) */}
            {enableRichText && enableGoogleDocs && (
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Default Mode
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDefaultModeChange('richtext')}
                    className={cn(
                      'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
                      defaultMode === 'richtext'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    )}
                  >
                    <TextAa className="w-4 h-4 inline mr-2" />
                    Rich Text
                  </button>
                  <button
                    onClick={() => handleDefaultModeChange('google-docs')}
                    className={cn(
                      'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
                      defaultMode === 'google-docs'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    )}
                  >
                    <GoogleLogo className="w-4 h-4 inline mr-2" weight="bold" />
                    Google Docs
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Templates Section (only show when Google Docs is enabled) */}
        {enableGoogleDocs && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Google Docs Templates
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Templates available for this form type. Use{' '}
                  <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                    {'{{variable}}'}
                  </code>{' '}
                  placeholders for dynamic content.
                </p>
              </div>
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Template
              </Button>
            </div>

            {templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                  <GoogleLogo className="w-6 h-6 text-blue-500" weight="bold" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  No Templates Yet
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
                  Add a Google Docs template to enable document generation for this form.
                </p>
                <Button size="sm" onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Your First Template
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border transition-colors',
                      template.is_default
                        ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white text-sm">
                            {template.name}
                          </span>
                          {template.is_default && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                              <Star className="w-2.5 h-2.5" />
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Added {new Date(template.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {!template.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(template)}
                          className="text-xs h-8 px-2"
                        >
                          <Star className="w-3.5 h-3.5 mr-1" />
                          Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openTemplate(template)}
                        className="text-xs h-8 px-2"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTemplateToDelete(template);
                          setShowDeleteDialog(true);
                        }}
                        className="text-xs h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Variable Reference */}
            <div className="mt-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                Using Variables in Templates
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                Use these placeholders in your Google Doc template. They'll be replaced with actual data when generating proposals:
              </p>
              <div className="flex flex-wrap gap-2">
                {['{{client.name}}', '{{project.name}}', '{{pricing.total}}', '{{org.name}}'].map(v => (
                  <code
                    key={v}
                    className="px-2 py-1 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded text-xs text-amber-800 dark:text-amber-300"
                  >
                    {v}
                  </code>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Template Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Document Template</DialogTitle>
            <DialogDescription>
              Paste a Google Docs URL to use as a proposal template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., Formal Proposal, Quick Quote"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-url">Google Docs URL</Label>
              <Input
                id="template-url"
                placeholder="https://docs.google.com/document/d/..."
                value={templateUrl}
                onChange={e => handleUrlChange(e.target.value)}
                className={urlError ? 'border-red-500' : ''}
              />
              {urlError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {urlError}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-default"
                checked={isDefault}
                onChange={e => setIsDefault(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is-default" className="text-sm font-normal">
                Set as default template for this form
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTemplate}
              disabled={isSaving || !templateName.trim() || !templateUrl.trim() || !!urlError}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Template'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default PresentationBuilderConfig;
