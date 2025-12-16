/**
 * Document Template Editor Page
 * Full-page editor for creating and editing document templates
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { useUser } from '@/auth';
import {
  useDocumentTemplate,
  useCreateDocumentTemplate,
  useUpdateDocumentTemplate,
  useTemplateForms,
  useLinkDocumentTemplate,
  useUnlinkDocumentTemplate,
} from '@/hooks/queries/useDocumentTemplates';
import type { PageSettings } from '@/hooks/queries/useDocumentTemplates';
import { useForms, useForm } from '@/hooks/queries/useForms';
import type { FormFieldVariable } from '@/features/document-builder/types';
import {
  DocumentEditor,
  extractVariablesFromContent,
  type PlateElement,
} from '@/features/document-builder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import { ArrowLeft, Settings, Save, Loader2, Link, Pencil } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface TemplateFormData {
  name: string;
  description: string;
  pageSettings: PageSettings;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_PAGE_SETTINGS: PageSettings = {
  size: 'letter',
  orientation: 'portrait',
  margins: { top: 40, right: 40, bottom: 40, left: 40 },
};

const DEFAULT_CONTENT: PlateElement[] = [
  {
    type: 'p',
    children: [{ text: '' }],
  },
];

// ============================================================================
// Component
// ============================================================================

export default function DocumentTemplateEditor() {
  const { templateId } = useParams<{ templateId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id || '', !!user?.id);

  const isNew = templateId === 'new';
  const formId = searchParams.get('formId');

  // Queries & Mutations
  const { data: existingTemplate, isLoading: isLoadingTemplate } =
    useDocumentTemplate(isNew ? undefined : templateId);
  const createMutation = useCreateDocumentTemplate();
  const updateMutation = useUpdateDocumentTemplate();
  const linkMutation = useLinkDocumentTemplate();
  const unlinkMutation = useUnlinkDocumentTemplate();

  // Local State
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    pageSettings: DEFAULT_PAGE_SETTINGS,
  });
  const [content, setContent] = useState<PlateElement[]>(DEFAULT_CONTENT);
  const [isDirty, setIsDirty] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(formId);
  const [isLinking, setIsLinking] = useState(false);
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);

  // Inline name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Forms queries
  const { data: forms = [] } = useForms(organization?.id, !!organization?.id);
  const { data: selectedForm } = useForm(selectedFormId || '', !!selectedFormId);

  // Fetch linked forms for this template (reverse lookup)
  const { data: linkedForms = [] } = useTemplateForms(
    !isNew && templateId ? templateId : undefined
  );

  // Extract form fields as variables
  const formFields = useMemo((): FormFieldVariable[] => {
    if (!selectedForm?.tabs) return [];

    const fields: FormFieldVariable[] = [];
    selectedForm.tabs.forEach((tab) => {
      tab.fields?.forEach((field) => {
        fields.push({
          key: field.name || field.id,
          label: field.label,
          fieldType: field.field_type,
          tabName: tab.name,
        });
      });
    });
    return fields;
  }, [selectedForm]);

  // Track if initial content has been loaded (to prevent false isDirty on load)
  const isInitialLoadRef = useRef(true);

  // Load existing template data
  useEffect(() => {
    if (existingTemplate) {
      setFormData({
        name: existingTemplate.name,
        description: existingTemplate.description || '',
        pageSettings: existingTemplate.page_settings || DEFAULT_PAGE_SETTINGS,
      });
      setContent(existingTemplate.content || DEFAULT_CONTENT);
      // Allow a brief delay for the editor to sync before tracking changes
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
    }
  }, [existingTemplate]);

  // For new templates, mark initial load complete immediately
  useEffect(() => {
    if (isNew) {
      isInitialLoadRef.current = false;
    }
  }, [isNew]);

  // Initialize selectedFormId from linked forms (for existing templates)
  useEffect(() => {
    const firstLinkedForm = linkedForms[0];
    if (firstLinkedForm && !formId) {
      // If there's a linked form, use it (typically only one per template)
      setSelectedFormId(firstLinkedForm.form_id);
    }
  }, [linkedForms, formId]);

  // Track unsaved changes
  const handleContentChange = useCallback((newContent: PlateElement[]) => {
    setContent(newContent);
    // Only mark dirty after initial load is complete
    if (!isInitialLoadRef.current) {
      setIsDirty(true);
    }
  }, []);

  const handleFormChange = useCallback(
    (field: keyof TemplateFormData, value: string | PageSettings) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
    },
    []
  );

  // Inline name editing handlers
  const handleStartEditingName = useCallback(() => {
    setEditedName(formData.name);
    setIsEditingName(true);
  }, [formData.name]);

  const handleNameSave = useCallback(() => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== formData.name) {
      setFormData((prev) => ({ ...prev, name: trimmedName }));
      setIsDirty(true);
    }
    setIsEditingName(false);
  }, [editedName, formData.name]);

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  }, [handleNameSave]);

  // Handle form linking - immediately updates the database
  const handleFormLinkChange = useCallback(
    async (newFormId: string | null) => {
      // For new templates, just update state (will be linked on first save)
      if (isNew) {
        setSelectedFormId(newFormId);
        return;
      }

      // For existing templates, immediately update the database
      const currentFormId = selectedFormId;
      if (currentFormId === newFormId) return;

      setIsLinking(true);
      try {
        // Unlink old form if there was one
        if (currentFormId) {
          await unlinkMutation.mutateAsync({
            formId: currentFormId,
            documentTemplateId: templateId!,
          });
        }

        // Link new form if one is selected
        if (newFormId) {
          await linkMutation.mutateAsync({
            formId: newFormId,
            documentTemplateId: templateId!,
          });
        }

        setSelectedFormId(newFormId);
        toast.success(newFormId ? 'Form linked successfully' : 'Form unlinked');
      } catch (error) {
        console.error('Failed to update form link:', error);
        toast.error('Failed to update form link');
      } finally {
        setIsLinking(false);
      }
    },
    [isNew, selectedFormId, templateId, linkMutation, unlinkMutation]
  );

  // Save template
  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (!organization?.id || !user?.id) {
      toast.error('Organization or user not found');
      return;
    }

    // Extract variables from text placeholders like {{variable_name}}
    const variables = extractVariablesFromContent(content as unknown[]);

    try {
      if (isNew) {
        const newTemplate = await createMutation.mutateAsync({
          organization_id: organization.id,
          name: formData.name,
          description: formData.description || undefined,
          content,
          variables,
          page_settings: formData.pageSettings,
          created_by: user.id,
        });

        // Link the selected form to this template (only for new templates)
        if (selectedFormId) {
          await linkMutation.mutateAsync({
            formId: selectedFormId,
            documentTemplateId: newTemplate.id,
          });
        }

        toast.success('Template created successfully');
        setIsDirty(false);

        // Navigate to edit mode
        navigate(`/document-templates/${newTemplate.id}`, { replace: true });
      } else {
        // For existing templates, form linking is handled immediately via handleFormLinkChange
        await updateMutation.mutateAsync({
          templateId: templateId!,
          updates: {
            name: formData.name,
            description: formData.description || undefined,
            content,
            variables,
            page_settings: formData.pageSettings,
          },
        });

        toast.success('Template saved successfully');
        setIsDirty(false);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    }
  }, [
    formData,
    content,
    isNew,
    templateId,
    organization?.id,
    user?.id,
    selectedFormId,
    createMutation,
    updateMutation,
    linkMutation,
    navigate,
  ]);

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
    const backPath = formId ? `/forms/${formId}` : '/forms';
    handleNavigate(backPath);
  }, [formId, handleNavigate]);

  // Loading state
  if (!isNew && isLoadingTemplate) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-3 group/header">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="h-6 w-px bg-gray-200" />

          {/* Inline Editable Name */}
          {isEditingName ? (
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              placeholder="Untitled Template"
              className="text-lg font-semibold h-9 px-2 max-w-[300px] bg-amber-50 border-amber-300 focus-visible:ring-amber-400"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <h1
                className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-gray-700 max-w-[300px] truncate"
                onDoubleClick={handleStartEditingName}
                title={formData.name || 'Untitled Template'}
              >
                {formData.name || 'Untitled Template'}
              </h1>
              <button
                onClick={handleStartEditingName}
                className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover/header:opacity-100 transition-opacity"
                title="Edit name"
              >
                <Pencil className="h-3.5 w-3.5 text-gray-400" />
              </button>
            </div>
          )}

          {/* Form Link Icon with Popover */}
          <TooltipProvider delayDuration={300}>
            <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      className={`p-1.5 rounded-md transition-colors ${
                        selectedFormId
                          ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-500'
                      }`}
                      disabled={isLinking}
                    >
                      {isLinking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link className="h-4 w-4" />
                      )}
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {selectedFormId
                    ? forms.find(f => f.id === selectedFormId)?.name || 'Loading...'
                    : 'No form linked'
                  }
                </TooltipContent>
              </Tooltip>
              <PopoverContent align="start" className="w-52 p-1.5">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-2 py-1">Linked Form</p>
                  <button
                    onClick={() => {
                      handleFormLinkChange(null);
                      setIsLinkPopoverOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded transition-colors ${
                      !selectedFormId
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${!selectedFormId ? 'bg-purple-500' : 'bg-gray-300'}`} />
                    None
                  </button>
                  {forms.map((form) => (
                    <button
                      key={form.id}
                      onClick={() => {
                        handleFormLinkChange(form.id);
                        setIsLinkPopoverOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded transition-colors ${
                        form.id === selectedFormId
                          ? 'bg-purple-50 text-purple-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        form.id === selectedFormId ? 'bg-purple-500' : 'bg-gray-300'
                      }`} />
                      <span className="truncate">{form.name}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
              Unsaved changes
            </span>
          )}

          {/* Settings Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Template Settings</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 py-6">
                {/* Description */}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      handleFormChange('description', e.target.value)
                    }
                    placeholder="Describe this template..."
                    rows={3}
                  />
                </div>

                {/* Page Size */}
                <div className="space-y-2">
                  <Label>Page Size</Label>
                  <Select
                    value={formData.pageSettings.size}
                    onValueChange={(value) =>
                      handleFormChange('pageSettings', {
                        ...formData.pageSettings,
                        size: value as PageSettings['size'],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="letter">
                        Letter (8.5" x 11")
                      </SelectItem>
                      <SelectItem value="a4">A4 (210mm x 297mm)</SelectItem>
                      <SelectItem value="legal">Legal (8.5" x 14")</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Orientation */}
                <div className="space-y-2">
                  <Label>Orientation</Label>
                  <Select
                    value={formData.pageSettings.orientation}
                    onValueChange={(value) =>
                      handleFormChange('pageSettings', {
                        ...formData.pageSettings,
                        orientation: value as PageSettings['orientation'],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Margins */}
                <div className="space-y-2">
                  <Label>Margins (px)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-500">Top</Label>
                      <Input
                        type="number"
                        value={formData.pageSettings.margins.top}
                        onChange={(e) =>
                          handleFormChange('pageSettings', {
                            ...formData.pageSettings,
                            margins: {
                              ...formData.pageSettings.margins,
                              top: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Right</Label>
                      <Input
                        type="number"
                        value={formData.pageSettings.margins.right}
                        onChange={(e) =>
                          handleFormChange('pageSettings', {
                            ...formData.pageSettings,
                            margins: {
                              ...formData.pageSettings.margins,
                              right: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Bottom</Label>
                      <Input
                        type="number"
                        value={formData.pageSettings.margins.bottom}
                        onChange={(e) =>
                          handleFormChange('pageSettings', {
                            ...formData.pageSettings,
                            margins: {
                              ...formData.pageSettings.margins,
                              bottom: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Left</Label>
                      <Input
                        type="number"
                        value={formData.pageSettings.margins.left}
                        onChange={(e) =>
                          handleFormChange('pageSettings', {
                            ...formData.pageSettings,
                            margins: {
                              ...formData.pageSettings.margins,
                              left: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

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

      {/* Editor */}
      <main className="flex-1 overflow-hidden">
        <DocumentEditor
          initialContent={content}
          onChange={handleContentChange}
          pageSettings={formData.pageSettings}
          formFields={formFields}
          formName={selectedForm?.name}
        />
      </main>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your
              changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit}>
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
