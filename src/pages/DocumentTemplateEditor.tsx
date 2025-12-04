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
  useLinkDocumentTemplate,
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
import { ArrowLeft, Settings, Save, Loader2, FileText, Link } from 'lucide-react';
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

  // Forms queries
  const { data: forms = [] } = useForms(organization?.id, !!organization?.id);
  const { data: selectedForm } = useForm(selectedFormId || '', !!selectedFormId);

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

        // Link to selected form if one is chosen
        if (selectedFormId) {
          try {
            await linkMutation.mutateAsync({
              formId: selectedFormId,
              documentTemplateId: newTemplate.id,
              isDefault: true,
            });
          } catch (linkError) {
            // Link may already exist or fail - don't block the save
            console.warn('Could not link template to form:', linkError);
          }
        }

        toast.success('Template created successfully');
        setIsDirty(false);

        // Navigate to edit mode
        navigate(`/document-templates/${newTemplate.id}`, { replace: true });
      } else {
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

        // Link to selected form if one is chosen (handles duplicates gracefully)
        if (selectedFormId) {
          try {
            await linkMutation.mutateAsync({
              formId: selectedFormId,
              documentTemplateId: templateId!,
              isDefault: false,
            });
          } catch (linkError) {
            // Link may already exist - that's fine
            console.warn('Could not link template to form:', linkError);
          }
        }

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
    createMutation,
    updateMutation,
    linkMutation,
    selectedFormId,
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
    const backPath = formId ? `/forms/${formId}` : '/templates';
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="h-6 w-px bg-gray-200" />
          <Input
            value={formData.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            placeholder="Untitled Template"
            className="text-lg font-semibold border-0 shadow-none focus-visible:ring-0 max-w-[300px]"
          />
          <div className="h-6 w-px bg-gray-200" />
          {/* Form Selector for Variables & Linking */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedFormId || ''}
              onValueChange={(value) => {
                setSelectedFormId(value || null);
                setIsDirty(true);
              }}
            >
              <SelectTrigger className="w-[200px] h-9">
                <FileText className="h-4 w-4 mr-2 text-gray-500" />
                <SelectValue placeholder="Link to form..." />
              </SelectTrigger>
              <SelectContent>
                {forms.map((form) => (
                  <SelectItem key={form.id} value={form.id}>
                    {form.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFormId && (
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                <Link className="h-3 w-3" />
                Linked
              </span>
            )}
          </div>
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
