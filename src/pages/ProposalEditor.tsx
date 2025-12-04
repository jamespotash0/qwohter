/**
 * Proposal Editor Page
 * Side-by-side editor with form data on the left and live document preview on the right
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@/auth';
import { useProposal, useUpdateProposal } from '@/hooks/queries/useProposals';
import { useForm } from '@/hooks/queries/useForms';
import {
  useFormDocumentTemplates,
  useDocumentTemplate,
} from '@/hooks/queries/useDocumentTemplates';
import { DocumentPreview, type PlateElement } from '@/features/document-builder';
import type { PageSettings } from '@/features/document-builder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
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
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  SplitSquareHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

type ViewMode = 'split' | 'form' | 'preview';

// ============================================================================
// Component
// ============================================================================

export default function ProposalEditor() {
  const { proposalId } = useParams<{ proposalId: string }>();
  const navigate = useNavigate();
  const user = useUser();

  // Data fetching
  const { data: proposal, isLoading: isLoadingProposal } = useProposal(proposalId);
  const { data: form, isLoading: isLoadingForm } = useForm(
    proposal?.form_id || '',
    !!proposal?.form_id
  );
  const { data: linkedTemplates = [] } = useFormDocumentTemplates(proposal?.form_id);

  // Find the default document template
  const defaultTemplateLink = linkedTemplates.find((lt) => lt.is_default);
  const templateId = defaultTemplateLink?.document_template_id || linkedTemplates[0]?.document_template_id;
  const { data: documentTemplate } = useDocumentTemplate(templateId);

  // Mutations
  const updateMutation = useUpdateProposal();

  // Local state
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [projectName, setProjectName] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [zoom, setZoom] = useState(75);

  const isLoading = isLoadingProposal || isLoadingForm;
  const isSaving = updateMutation.isPending;

  // Initialize form data from proposal
  useEffect(() => {
    if (proposal) {
      setFormData(proposal.form_data || {});
      setProjectName(proposal.project_name || '');
    }
  }, [proposal]);

  // Initialize active tab when form loads
  useEffect(() => {
    if (form && form.tabs.length > 0 && !activeTabId) {
      setActiveTabId(form.tabs[0].id);
    }
  }, [form, activeTabId]);

  // Handle field changes
  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    setIsDirty(true);
  }, []);

  const handleProjectNameChange = useCallback((value: string) => {
    setProjectName(value);
    setIsDirty(true);
  }, []);

  // Build variable values from form data for preview
  const variableValues = useMemo(() => {
    const values: Record<string, string | number | undefined> = {};

    // Add form field values
    if (form?.tabs) {
      form.tabs.forEach((tab) => {
        tab.fields?.forEach((field) => {
          const value = formData[field.id] || formData[field.name] || field.default_value;
          if (value !== undefined && value !== '') {
            // Use field name as the variable key
            const key = field.name || field.id;
            values[key] = value;
          }
        });
      });
    }

    // Add proposal metadata
    values['project_name'] = projectName;
    values['proposal_number'] = proposal?.proposal_number || '';
    values['client_name'] = formData._clientInfo?.clientName || proposal?.client_name || '';
    values['client_company'] = formData._clientInfo?.clientCompany || proposal?.client_company || '';

    return values;
  }, [formData, form, projectName, proposal]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!proposalId) return;

    try {
      await updateMutation.mutateAsync({
        proposalId,
        updates: {
          form_data: formData,
        },
      });

      setIsDirty(false);
      toast.success('Proposal saved successfully');
    } catch (error) {
      console.error('Failed to save proposal:', error);
      toast.error('Failed to save proposal');
    }
  }, [proposalId, formData, updateMutation]);

  // Navigation with unsaved changes check
  const handleNavigate = useCallback(
    (path: string) => {
      if (isDirty) {
        setPendingNavigation(path);
        setShowExitDialog(true);
      } else {
        navigate(path);
      }
    },
    [isDirty, navigate]
  );

  const handleConfirmExit = useCallback(() => {
    setShowExitDialog(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
  }, [pendingNavigation, navigate]);

  const handleBack = useCallback(() => {
    handleNavigate('/quotes');
  }, [handleNavigate]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 10, 150));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 10, 50));
  }, []);

  // Render field input
  const renderFieldInput = (field: any) => {
    const value = formData[field.id] || formData[field.name] || field.default_value || '';

    switch (field.field_type) {
      case 'input':
        return (
          <Input
            type={field.input_type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="h-10"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
            className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        );

      case 'dropdown':
        return (
          <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: any) => (
                <SelectItem key={option.toString()} value={option.toString()}>
                  {option.toString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-3 h-10">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">{field.placeholder}</span>
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
            className="h-10"
          />
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="h-10"
          />
        );
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading proposal...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!proposal) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Proposal not found</h2>
          <p className="text-gray-600 mb-4">The proposal you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/quotes')}>Back to Quotes</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {proposal.proposal_number}
              </Badge>
              <span className="text-lg font-semibold text-gray-900">
                {projectName || 'Untitled Proposal'}
              </span>
            </div>
            {form && (
              <Badge variant="secondary" className="text-xs">
                {form.name}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
              Unsaved changes
            </span>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-lg p-1 bg-gray-50">
            <Button
              variant={viewMode === 'form' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('form')}
              className="h-7 px-2"
              title="Form only"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'split' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('split')}
              className="h-7 px-2"
              title="Split view"
            >
              <SplitSquareHorizontal className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('preview')}
              className="h-7 px-2"
              title="Preview only"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom Controls (visible in split/preview modes) */}
          {viewMode !== 'form' && (
            <div className="flex items-center gap-1 border rounded-lg p-1 bg-gray-50">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                className="h-7 w-7 p-0"
                disabled={zoom <= 50}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-gray-600 w-10 text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                className="h-7 w-7 p-0"
                disabled={zoom >= 150}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Save Button */}
          <Button onClick={handleSave} disabled={isSaving || !isDirty}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Form Panel */}
          {viewMode !== 'preview' && (
            <>
              <ResizablePanel
                defaultSize={viewMode === 'form' ? 100 : 45}
                minSize={30}
                className="bg-white"
              >
                <ScrollArea className="h-full">
                  <div className="p-6 space-y-6">
                    {/* Project Info */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Proposal Info
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-gray-700">
                            Project Name
                          </Label>
                          <Input
                            value={projectName}
                            onChange={(e) => handleProjectNameChange(e.target.value)}
                            placeholder="Enter project name"
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-gray-700">
                            Proposal Number
                          </Label>
                          <Input
                            value={proposal.proposal_number || ''}
                            disabled
                            className="h-10 bg-gray-50 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Form Fields by Tab */}
                    {form && form.tabs.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                          Form Details
                        </h3>
                        <Tabs value={activeTabId} onValueChange={setActiveTabId}>
                          <TabsList className="bg-gray-100 p-1">
                            {form.tabs.map((tab) => (
                              <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-sm"
                              >
                                {tab.name}
                              </TabsTrigger>
                            ))}
                          </TabsList>

                          {form.tabs.map((tab) => (
                            <TabsContent key={tab.id} value={tab.id} className="mt-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {tab.fields?.map((field) => (
                                  <div
                                    key={field.id}
                                    className={`space-y-1.5 ${
                                      field.field_type === 'textarea' ? 'md:col-span-2' : ''
                                    }`}
                                  >
                                    <Label className="text-sm font-medium text-gray-700">
                                      {field.label}
                                      {field.required && (
                                        <span className="text-red-500 ml-1">*</span>
                                      )}
                                    </Label>
                                    {renderFieldInput(field)}
                                    {field.helpText && (
                                      <p className="text-xs text-gray-500">{field.helpText}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {(!tab.fields || tab.fields.length === 0) && (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                  No fields in this section
                                </div>
                              )}
                            </TabsContent>
                          ))}
                        </Tabs>
                      </div>
                    )}

                    {!form && (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">No form template linked to this proposal</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </ResizablePanel>

              {viewMode === 'split' && <ResizableHandle withHandle />}
            </>
          )}

          {/* Preview Panel */}
          {viewMode !== 'form' && (
            <ResizablePanel
              defaultSize={viewMode === 'preview' ? 100 : 55}
              minSize={30}
              className="bg-gray-100"
            >
              {documentTemplate ? (
                <DocumentPreview
                  content={documentTemplate.content as PlateElement[]}
                  values={variableValues}
                  pageSettings={documentTemplate.page_settings as PageSettings}
                  zoom={zoom}
                  className="h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Eye className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Document Template</h3>
                    <p className="text-sm text-gray-500 max-w-sm">
                      Link a document template to this form to see a live preview of your proposal.
                    </p>
                  </div>
                </div>
              )}
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </main>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit}>Leave Without Saving</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
