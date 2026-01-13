/**
 * @deprecated This component is DEPRECATED. Use FormDocumentTemplatesSection instead.
 *
 * The pdf_templates and form_pdf_templates tables do not exist.
 * Use document_templates and form_document_templates instead.
 *
 * See: src/features/form-builder/components/FormDocumentTemplatesSection.tsx
 * ============================================================================
 * DEPRECATED - DO NOT USE
 * ============================================================================
 *
 * Form PDF Templates Section
 * Allows linking/unlinking PDF templates to a form in the Form Builder settings
 */

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Layout, Star } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  usePdfTemplates,
  useFormPdfTemplates,
  useLinkPdfTemplate,
  useUnlinkPdfTemplate,
  type PdfTemplate,
} from '@/_deprecated/hooks/queries/usePdfTemplates';
import { toast } from 'sonner';

interface FormPdfTemplatesSectionProps {
  formId: string | undefined;
  organizationId: string | undefined;
}

export function FormPdfTemplatesSection({
  formId,
  organizationId,
}: FormPdfTemplatesSectionProps) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Fetch all available templates
  const { data: allTemplates = [], isLoading: isLoadingAll } = usePdfTemplates(organizationId);

  // Fetch templates linked to this form
  const { data: linkedTemplates = [], isLoading: isLoadingLinked } = useFormPdfTemplates(formId);

  // Mutations
  const linkMutation = useLinkPdfTemplate();
  const unlinkMutation = useUnlinkPdfTemplate();

  const isLoading = isLoadingAll || isLoadingLinked;

  // Get linked template IDs for quick lookup
  const linkedTemplateIds = new Set(linkedTemplates.map(lt => lt.pdf_template_id));

  // Find the default template
  const defaultTemplateLink = linkedTemplates.find(lt => lt.is_default);

  const handleToggleTemplate = async (template: PdfTemplate) => {
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
          pdfTemplateId: template.id,
        });
        toast.success(`Unlinked "${template.name}"`);
      } else {
        await linkMutation.mutateAsync({
          formId,
          pdfTemplateId: template.id,
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

  const handleSetDefault = async (template: PdfTemplate) => {
    if (!formId) return;

    // If not linked, link it first as default
    if (!linkedTemplateIds.has(template.id)) {
      setPendingAction(template.id);
      try {
        await linkMutation.mutateAsync({
          formId,
          pdfTemplateId: template.id,
          isDefault: true,
        });
        toast.success(`"${template.name}" is now the default`);
      } catch (error) {
        toast.error('Failed to set default template');
      } finally {
        setPendingAction(null);
      }
      return;
    }

    // If already linked but not default, we need to unlink and relink as default
    // The hook handles unsetting previous default
    setPendingAction(template.id);
    try {
      await unlinkMutation.mutateAsync({ formId, pdfTemplateId: template.id });
      await linkMutation.mutateAsync({
        formId,
        pdfTemplateId: template.id,
        isDefault: true,
      });
      toast.success(`"${template.name}" is now the default`);
    } catch (error) {
      toast.error('Failed to set default template');
    } finally {
      setPendingAction(null);
    }
  };

  if (!formId) {
    return (
      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Layout className="w-4 h-4 text-purple-600" weight="duotone" />
            PDF Templates
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Save the form first to link PDF templates
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Layout className="w-4 h-4 text-purple-600" weight="duotone" />
          PDF Templates
        </h4>
        <p className="text-xs text-gray-500 mt-1">
          Select which PDF templates are available for proposals using this form
        </p>
      </div>

      <Separator />

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
        </div>
      ) : allTemplates.length === 0 ? (
        <div className="text-center py-4">
          <Layout className="w-8 h-8 text-gray-300 mx-auto mb-2" weight="duotone" />
          <p className="text-xs text-gray-500">No PDF templates available</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-1">
            {allTemplates.map((template) => {
              const isLinked = linkedTemplateIds.has(template.id);
              const isDefault = defaultTemplateLink?.pdf_template_id === template.id;
              const isPending = pendingAction === template.id;

              return (
                <div
                  key={template.id}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                    isLinked
                      ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800'
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleTemplate(template)}
                      disabled={isPending}
                      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                        isLinked
                          ? 'bg-purple-500 text-white'
                          : 'border-2 border-gray-300 dark:border-gray-600 hover:border-purple-400'
                      }`}
                    >
                      {isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isLinked ? (
                        <Check className="w-3 h-3" />
                      ) : null}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
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
