/**
 * Templates Page
 *
 * Manages document templates for proposals.
 * Allows users to browse existing templates and create new ones.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MagnifyingGlass,
  Plus,
  Stack,
  Article,
  DotsThree,
  PencilSimple,
  CopySimple,
  Trash,
  FileText,
  Link as LinkIcon,
  Star,
  SquaresFour,
} from '@phosphor-icons/react';
import { Clock } from 'lucide-react';
import {
  useDocumentTemplates,
  useCreateDocumentTemplate,
  useDeleteDocumentTemplate,
  useUpdateDocumentTemplate,
  useTemplateLinkedForms,
  useSetDefaultDocumentTemplate,
  useLinkDocumentTemplate,
  type DocumentTemplate,
  type TemplateLinkedFormInfo,
} from '@/hooks/queries/useDocumentTemplates';
import { CreateTemplateDialog } from '@/features/document-builder/components/CreateTemplateDialog';
import { useUser } from '@/auth';
import { useCurrentOrganization, useOrganizationMembers } from '@/hooks/queries/useOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContent } from '@/components/common/layout/PageContent';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

export default function TemplatesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUser();
  const { organization: currentOrganization } = useCurrentOrganization(user?.id || '', !!user?.id);

  // Determine active view from URL
  const isLibraryView = location.pathname === '/templates/library';

  const [searchQuery, setSearchQuery] = useState('');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null);

  // Fetch user's custom document templates (organization-specific)
  const { data: templates = [], isLoading: isLoadingTemplates } = useDocumentTemplates(
    currentOrganization?.id
  );

  // Fetch library templates (system templates - null organization_id)
  const { data: libraryTemplates = [], isLoading: isLoadingLibrary } = useDocumentTemplates();

  // Fetch organization members for creator display
  const { data: members = [] } = useOrganizationMembers(
    currentOrganization?.id || '',
    !!currentOrganization?.id
  );

  const createTemplateMutation = useCreateDocumentTemplate();
  const deleteTemplateMutation = useDeleteDocumentTemplate();
  const updateTemplateMutation = useUpdateDocumentTemplate();
  const setDefaultMutation = useSetDefaultDocumentTemplate();
  const linkMutation = useLinkDocumentTemplate();

  // Fetch linked form info (id + name) for all templates (batch fetch for efficiency)
  const templateIds = useMemo(() => templates.map(t => t.id), [templates]);
  const { data: linkedFormsMap = {} } = useTemplateLinkedForms(templateIds);

  // Filter templates by search query
  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter library templates by search query
  const filteredLibraryTemplates = libraryTemplates.filter((template) =>
    template.name.toLowerCase().includes(librarySearchQuery.toLowerCase())
  );

  const handleEdit = (template: DocumentTemplate) => {
    navigate(`/document-templates/${template.id}`);
  };

  const handleDeleteClick = (template: DocumentTemplate) => {
    setTemplateToDelete(template);
  };

  const handleConfirmDelete = () => {
    if (!templateToDelete) return;

    deleteTemplateMutation.mutate(templateToDelete.id, {
      onSuccess: () => {
        toast.success(`"${templateToDelete.name}" has been deleted`);
        setTemplateToDelete(null);
      },
      onError: (error) => {
        toast.error(`Failed to delete template: ${error.message}`);
        setTemplateToDelete(null);
      },
    });
  };

  const handleDuplicate = (template: DocumentTemplate) => {
    if (!currentOrganization?.id || !user?.id) {
      toast.error('Please select an organization first');
      return;
    }

    createTemplateMutation.mutate(
      {
        organization_id: currentOrganization.id,
        name: `${template.name} (Copy)`,
        description: template.description || undefined,
        content: template.content,
        variables: template.variables,
        page_settings: template.page_settings,
        created_by: user.id,
      },
      {
        onSuccess: (newTemplate) => {
          toast.success(`"${newTemplate.name}" has been created`);
          navigate(`/document-templates/${newTemplate.id}`);
        },
        onError: (error) => {
          toast.error(`Failed to duplicate template: ${error.message}`);
        },
      }
    );
  };

  const handleUpdateTemplate = (templateId: string, updates: { name?: string; description?: string }) => {
    updateTemplateMutation.mutate(
      { templateId, updates },
      {
        onError: (error) => {
          toast.error(`Failed to update template: ${error.message}`);
        },
      }
    );
  };

  const handleSetDefault = (template: DocumentTemplate) => {
    if (!currentOrganization?.id) {
      toast.error('Organization not found');
      return;
    }

    setDefaultMutation.mutate(
      { templateId: template.id, organizationId: currentOrganization.id },
      {
        onSuccess: () => {
          toast.success(`"${template.name}" is now the default template`);
        },
        onError: (error) => {
          toast.error(`Failed to set default: ${error.message}`);
        },
      }
    );
  };

  const handleAddTemplate = () => {
    if (!currentOrganization?.id || !user?.id) {
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
    if (!currentOrganization?.id || !user?.id) {
      toast.error('Please select an organization first');
      return;
    }

    setIsCreating(true);

    try {
      const newTemplate = await createTemplateMutation.mutateAsync({
        organization_id: currentOrganization.id,
        name: data.name,
        description: data.description || undefined,
        created_by: user.id,
      });

      // Link form if one was selected
      if (data.linkedFormId) {
        await linkMutation.mutateAsync({
          formId: data.linkedFormId,
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

  return (
    <PageContent
      title={!isLibraryView ? "Document Templates" : "Template Library"}
      subtitle={
        !isLibraryView
          ? "Create and manage custom document templates for your proposals. Build reusable templates or browse the library for pre-built options."
          : "Browse Qwohter's prefabbed document templates. Copy and customize professional documents for your business needs."
      }
      showPageHeader={true}
      headerActions={
        <div className="flex items-center gap-3">
          {!isLibraryView ? (
            <>
              <Button
                variant="outline"
                onClick={() => navigate('/templates/library')}
                className="flex items-center gap-1.5 h-9 text-sm"
              >
                <Stack className="w-4 h-4" />
                Library
              </Button>
              <Button
                onClick={handleAddTemplate}
                className="flex items-center gap-1.5 h-9 text-sm bg-[var(--sidebar-icon-active)] hover:bg-[var(--brand-orange-700)] text-white shadow-sm"
              >
                <Plus className="w-4 h-4" weight="bold" />
                New Template
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={() => navigate('/templates')}
              className="flex items-center gap-2"
            >
              <Article className="w-4 h-4" />
              My Templates
            </Button>
          )}
        </div>
      }
    >
      {!isLibraryView ? (
        <>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search templates by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Templates Grid */}
          {isLoadingTemplates ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTemplates.map((template) => (
                <DocumentTemplateCard
                  key={template.id}
                  template={template}
                  members={members}
                  linkedFormInfo={linkedFormsMap[template.id]}
                  onEdit={() => handleEdit(template)}
                  onDuplicate={() => handleDuplicate(template)}
                  onDelete={() => handleDeleteClick(template)}
                  onSetDefault={() => handleSetDefault(template)}
                  onUpdateName={(name) => handleUpdateTemplate(template.id, { name })}
                  onUpdateDescription={(description) => handleUpdateTemplate(template.id, { description })}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" weight="regular" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? `No templates match "${searchQuery}"` : 'No Templates Yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create your first document template or browse the library for pre-built options'}
              </p>
              {!searchQuery && (
                <div className="flex items-center gap-3 justify-center">
                  <Button
                    onClick={handleAddTemplate}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4" weight="bold" />
                    Create New Template
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/templates/library')}
                    className="flex items-center gap-2"
                  >
                    <Stack className="w-4 h-4" />
                    Browse Library
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Library Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search document templates by name..."
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Library Templates Grid */}
          {isLoadingLibrary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredLibraryTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredLibraryTemplates.map((template) => (
                <DocumentTemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => handleDuplicate(template)}
                  onDuplicate={() => handleDuplicate(template)}
                  isLibrary
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" weight="regular" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {librarySearchQuery
                  ? `No templates match "${librarySearchQuery}"`
                  : 'No Library Templates Available'}
              </h3>
              <p className="text-gray-600">
                {librarySearchQuery
                  ? 'Try a different search term'
                  : 'Check back later for pre-built document templates'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateTemplate}
        isLoading={isCreating}
        organizationId={currentOrganization?.id}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The template will be permanently deleted.
              This will unlink the connected form.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContent>
  );
}

// ============================================================================
// Document Template Card Component
// ============================================================================

interface DocumentTemplateCardProps {
  template: DocumentTemplate;
  members?: Array<{ user_id: string; full_name?: string }>;
  linkedFormInfo?: TemplateLinkedFormInfo;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
  onUpdateName?: (name: string) => void;
  onUpdateDescription?: (description: string) => void;
  isLibrary?: boolean;
}

function DocumentTemplateCard({
  template,
  members = [],
  linkedFormInfo,
  onEdit,
  onDuplicate,
  onDelete,
  onSetDefault,
  onUpdateName,
  onUpdateDescription,
  isLibrary = false,
}: DocumentTemplateCardProps) {
  const isDefault = template.is_default;
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(template.name);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(template.description || '');

  // Get creator name from members
  const creator = members.find(m => m.user_id === template.created_by);
  const creatorName = creator?.full_name || 'Unknown';

  // Get initials from creator name (e.g., "John Doe" -> "JD")
  const creatorInitials = creatorName
    .split(' ')
    .map((word: string) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  // Format last updated date
  const updatedDate = new Date(template.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleNameSave = () => {
    if (editedName.trim() && editedName !== template.name && onUpdateName) {
      onUpdateName(editedName.trim());
    } else {
      setEditedName(template.name);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditedName(template.name);
      setIsEditingName(false);
    }
  };

  const handleDescriptionSave = () => {
    if (editedDescription !== template.description && onUpdateDescription) {
      onUpdateDescription(editedDescription.trim());
    } else {
      setEditedDescription(template.description || '');
    }
    setIsEditingDescription(false);
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleDescriptionSave();
    } else if (e.key === 'Escape') {
      setEditedDescription(template.description || '');
      setIsEditingDescription(false);
    }
  };

  return (
    <div className="relative w-full">
      {/* Default Star Badge - positioned outside card to avoid overflow clipping */}
      {isDefault && (
        <div className="absolute -top-1.5 -left-1.5 z-20">
          <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
            <Star className="w-3 h-3 text-white" weight="fill" />
          </div>
        </div>
      )}
      <div
        className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 group relative overflow-hidden border border-gray-200 cursor-pointer"
        onClick={onEdit}
      >

        {/* Dropdown Menu */}
        {!isLibrary && (
          <div className="absolute top-2 right-2 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 hover:bg-gray-200/80 rounded-md transition-all opacity-0 group-hover:opacity-100 bg-white/80 backdrop-blur-sm shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DotsThree className="w-5 h-5 text-gray-700" weight="bold" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex items-center gap-2">
                  <PencilSimple className="w-4 h-4" weight="regular" />
                  Edit Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="flex items-center gap-2">
                  <CopySimple className="w-4 h-4" weight="regular" />
                  Duplicate
                </DropdownMenuItem>
                {onSetDefault && !isDefault && (
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onSetDefault(); }}
                    className="flex items-center gap-2"
                  >
                    <Star className="w-4 h-4" weight="regular" />
                    Set as Default
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onDelete(); }}
                      className="flex items-center gap-2 text-red-600 focus:text-red-600"
                    >
                      <Trash className="w-4 h-4" weight="regular" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Library Copy Button */}
        {isLibrary && (
          <div className="absolute top-2 right-2 z-10">
            <Button
              size="sm"
              variant="secondary"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            >
              <CopySimple className="w-3.5 h-3.5 mr-1" />
              Copy
            </Button>
          </div>
        )}

        {/* Document Header - pr-10 leaves space for dropdown menu */}
        <div className="px-4 pr-10 pt-4 pb-2">
          <div className="flex-1 min-w-0 pt-0.5">
            {/* Editable Name */}
            <div className="mb-0.5">
              {isEditingName ? (
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={handleNameKeyDown}
                  className="text-base font-bold h-8 px-2 bg-yellow-50 border-yellow-300"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="flex items-start gap-1 min-w-0">
                  <h3
                    className="text-base font-bold text-gray-900 leading-tight truncate"
                    title={template.name}
                    onDoubleClick={(e) => {
                      if (!isLibrary) {
                        e.stopPropagation();
                        setIsEditingName(true);
                      }
                    }}
                  >
                    {template.name}
                  </h3>
                  {!isLibrary && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingName(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-opacity flex-shrink-0"
                    >
                      <PencilSimple className="w-3.5 h-3.5 text-gray-600" weight="regular" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Editable Description */}
            <div className="flex items-start gap-0.5 min-w-0">
              {isEditingDescription ? (
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  onBlur={handleDescriptionSave}
                  onKeyDown={handleDescriptionKeyDown}
                  className="w-full text-xs text-gray-600 px-2 py-1 border border-gray-300 rounded resize-none bg-yellow-50"
                  rows={2}
                  placeholder="Add description..."
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <p
                    className="text-xs text-gray-600 leading-relaxed truncate"
                    title={template.description || 'No description'}
                    onDoubleClick={(e) => {
                      if (!isLibrary) {
                        e.stopPropagation();
                        setIsEditingDescription(true);
                      }
                    }}
                  >
                    {template.description || 'No description'}
                  </p>
                  {!isLibrary && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingDescription(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-opacity flex-shrink-0"
                    >
                      <PencilSimple className="w-3 h-3 text-gray-600" weight="regular" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="px-4 py-3 bg-gray-50/50 space-y-2">
          {/* Row 1: Variables count and linked forms */}
          <div className="flex items-center gap-3 text-[11px]">
            {template.variables && template.variables.length > 0 && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="flex items-center gap-1 text-gray-700 cursor-pointer hover:text-green-600 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SquaresFour className="w-3.5 h-3.5 text-green-600" weight="duotone" />
                      <span className="font-semibold text-gray-900">{template.variables.length}</span>
                      <span className="text-gray-500">variable{template.variables.length !== 1 ? 's' : ''}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <ul className="text-xs space-y-0.5">
                      {template.variables.slice(0, 6).map((v, idx) => (
                        <li key={idx} className="truncate text-gray-700">
                          {`{{${v}}}`}
                        </li>
                      ))}
                      {template.variables.length > 6 && (
                        <li className="text-green-500">
                          +{template.variables.length - 6} more
                        </li>
                      )}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {linkedFormInfo && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="flex items-center gap-1 text-gray-700 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" weight="duotone" />
                      <span className="text-gray-500 truncate max-w-[100px]">
                        {linkedFormInfo.form_name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs text-gray-700">{linkedFormInfo.form_name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {/* Row 2: Creator Avatar and Date */}
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-[8px] font-semibold text-white cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all">
                    {creatorInitials}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs text-gray-700">{creatorName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span>{updatedDate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
