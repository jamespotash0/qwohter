/**
 * Form Document Templates Section
 * Allows linking/unlinking document templates (Plate.js) to a form in the Form Builder settings
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, Plus } from 'lucide-react';
import { FileText, Star } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useDocumentTemplates,
  useFormDocumentTemplates,
  useLinkDocumentTemplate,
  useUnlinkDocumentTemplate,
  useSetDefaultTemplate,
  type DocumentTemplate,
} from '@/hooks/queries/useDocumentTemplates';
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
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Fetch all available document templates
  const { data: allTemplates = [], isLoading: isLoadingAll } = useDocumentTemplates(organizationId);

  // Fetch templates linked to this form
  const { data: linkedTemplates = [], isLoading: isLoadingLinked } = useFormDocumentTemplates(formId);

  // Mutations
  const linkMutation = useLinkDocumentTemplate();
  const unlinkMutation = useUnlinkDocumentTemplate();
  const setDefaultMutation = useSetDefaultTemplate();

  const isLoading = isLoadingAll || isLoadingLinked;

  // Get linked template IDs for quick lookup
  const linkedTemplateIds = new Set(linkedTemplates.map(lt => lt.document_template_id));

  // Find the default template
  const defaultTemplateLink = linkedTemplates.find(lt => lt.is_default);

  const handleToggleTemplate = async (template: DocumentTemplate) => {
    if (!formId) {
      toast.error('Form must be saved before linking templates');
      return;
    }

    const isLinked = linkedTemplateIds.has(template.id);
    setPendingAction(template.id);

    try {
      if (isLinked) {
        await unlinkMutation.mutateAsync({
          formId,
          documentTemplateId: template.id,
        });
        toast.success(`Unlinked "${template.name}"`);
      } else {
        await linkMutation.mutateAsync({
          formId,
          documentTemplateId: template.id,
          isDefault: linkedTemplates.length === 0, // Make first linked template the default
        });
        toast.success(`Linked "${template.name}"`);
      }
    } catch (error) {
      toast.error(isLinked ? 'Failed to unlink template' : 'Failed to link template');
      console.error('Template link/unlink error:', error);
    } finally {
      setPendingAction(null);
    }
  };

  const handleSetDefault = async (template: DocumentTemplate) => {
    if (!formId) return;

    setPendingAction(template.id);
    try {
      await setDefaultMutation.mutateAsync({
        formId,
        documentTemplateId: template.id,
      });
      toast.success(`"${template.name}" is now the default`);
    } catch (error) {
      toast.error('Failed to set default template');
    } finally {
      setPendingAction(null);
    }
  };

  const handleCreateTemplate = () => {
    if (!formId) {
      toast.error('Save the form first before creating a template');
      return;
    }
    navigate(`/document-templates/new?formId=${formId}`);
  };

  const handleEditTemplate = (template: DocumentTemplate) => {
    navigate(`/document-templates/${template.id}?formId=${formId}`);
  };

  if (!formId) {
    return (
      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" weight="duotone" />
            Document Templates
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Save the form first to link document templates
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" weight="duotone" />
            Document Templates
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Link document templates for generating proposals
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateTemplate}
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
      ) : allTemplates.length === 0 ? (
        <div className="text-center py-4">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" weight="duotone" />
          <p className="text-xs text-gray-500 mb-2">No document templates available</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateTemplate}
            className="text-xs"
          >
            Create Template
          </Button>
        </div>
      ) : (
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-1">
            {allTemplates.map((template) => {
              const isLinked = linkedTemplateIds.has(template.id);
              const isDefault = defaultTemplateLink?.document_template_id === template.id;
              const isPending = pendingAction === template.id;

              return (
                <div
                  key={template.id}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                    isLinked
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleTemplate(template)}
                      disabled={isPending}
                      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                        isLinked
                          ? 'bg-blue-500 text-white'
                          : 'border-2 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                      }`}
                    >
                      {isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isLinked ? (
                        <Check className="w-3 h-3" />
                      ) : null}
                    </button>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleEditTemplate(template)}
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

                  <div className="flex items-center gap-1.5 ml-2">
                    {template.organization_id === null && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        System
                      </Badge>
                    )}
                    {isDefault && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200">
                        Default
                      </Badge>
                    )}
                    {isLinked && !isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(template)}
                        disabled={isPending}
                        className="h-6 px-1.5 text-xs text-gray-500 hover:text-amber-600"
                        title="Set as default"
                      >
                        <Star className="w-3.5 h-3.5" weight="regular" />
                      </Button>
                    )}
                  </div>
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
    </div>
  );
}
