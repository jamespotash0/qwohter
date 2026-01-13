/**
 * Form Document Templates Section
 * Read-only view of document templates linked to this form
 * Linking is done from the Document Template Editor side
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, ExternalLink } from 'lucide-react';
import { FileText } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useFormDocumentTemplates,
  useCreateDocumentTemplate,
  useLinkDocumentTemplate,
} from '@/hooks/queries/useDocumentTemplates';
import { CreateTemplateDialog } from '@/features/document-builder/components/CreateTemplateDialog';
import { useUser } from '@/auth';
import { toast } from 'sonner';

interface FormDocumentTemplatesSectionProps {
  formId: string | undefined;
  organizationId: string | undefined;
}

export function FormDocumentTemplatesSection({
  formId,
  organizationId,
}: FormDocumentTemplatesSectionProps) {
  const navigate = useNavigate();
  const user = useUser();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch templates linked to this form
  const { data: linkedTemplates = [], isLoading } = useFormDocumentTemplates(formId);

  const createTemplateMutation = useCreateDocumentTemplate();
  const linkMutation = useLinkDocumentTemplate();

  const handleOpenCreateDialog = () => {
    if (!organizationId || !user?.id) {
      toast.error('Please select an organization first');
      return;
    }
    setIsCreateDialogOpen(true);
  };

  const handleCreateTemplate = async (data: {
    name: string;
    description: string;
    linkedFormId: string | null;
  }) => {
    if (!organizationId || !user?.id) {
      toast.error('Please select an organization first');
      return;
    }

    setIsCreating(true);

    try {
      const newTemplate = await createTemplateMutation.mutateAsync({
        organization_id: organizationId,
        name: data.name,
        description: data.description || undefined,
        created_by: user.id,
      });

      // Link the current form (or selected form) to the new template
      const formToLink = data.linkedFormId || formId;
      if (formToLink) {
        await linkMutation.mutateAsync({
          formId: formToLink,
          documentTemplateId: newTemplate.id,
        });
      }

      setIsCreateDialogOpen(false);
      navigate(`/document-templates/${newTemplate.id}`);
    } catch (error) {
      toast.error(`Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditTemplate = (templateId: string) => {
    navigate(`/document-templates/${templateId}`);
  };

  if (!formId) {
    return (
      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-sm">
            Document Templates
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Save the form first to see linked templates
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-sm">
            Document Templates
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Templates linked to this form
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenCreateDialog}
          className="h-7 text-xs gap-1"
        >
          <Plus className="w-3 h-3" />
          New
        </Button>
      </div>

      <Separator />

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        </div>
      ) : linkedTemplates.length === 0 ? (
        <div className="text-center py-4">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" weight="duotone" />
          <p className="text-xs text-gray-500 mb-2">No templates linked yet</p>
          <p className="text-xs text-gray-400 mb-3">
            Create a template and link it to this form
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenCreateDialog}
            className="text-xs"
          >
            Create Template
          </Button>
        </div>
      ) : (
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-1">
            {linkedTemplates.map((link) => {
              const template = link.document_template;
              if (!template) return null;

              return (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-2 rounded-lg border bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleEditTemplate(template.id)}
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate hover:text-blue-600">
                        {template.name}
                      </p>
                      {template.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditTemplate(template.id)}
                    className="h-6 px-1.5 text-xs text-gray-500 hover:text-blue-600"
                    title="Edit template"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {linkedTemplates.length > 0 && (
        <p className="text-xs text-gray-500 pt-1">
          {linkedTemplates.length} template{linkedTemplates.length !== 1 ? 's' : ''} linked
        </p>
      )}

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateTemplate}
        isLoading={isCreating}
        organizationId={organizationId}
      />
    </div>
  );
}
